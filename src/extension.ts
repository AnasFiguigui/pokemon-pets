import * as vscode from 'vscode';
import { Pokemons, Consumables } from './game-data';
import { Decoration, Pet, PetItem, normalizePet } from './models';
import { SaveManager, MAX_SUMMONED_POKEMONS } from './save-manager';
import { WebViewProvider } from './webview-provider';
import { TelemetryService } from './telemetry';
import { EvolutionService } from './evolution';
import { DayNightCycle } from './day-night';
import { StreakService } from './streak';

let config = vscode.workspace.getConfiguration('pokemon-pets');
let webview: WebViewProvider;
let saveManager: SaveManager;
let telemetry: TelemetryService;
let evolution: EvolutionService;
let streakService: StreakService;
let dayNightInterval: ReturnType<typeof setInterval> | undefined;

// ── Game Initialization ─────────────────────────────────────────────────

function initGame(): void {
    webview.postMessage({ type: 'background', value: config.get('background') });
    webview.postMessage({ type: 'scale', value: config.get('scale') });
    webview.postMessage({ type: 'wild_pokemons', value: config.get('wild') });
    webview.postMessage({ type: 'money', value: saveManager.save.money });
    webview.postMessage({ type: 'inventory', value: saveManager.save.inventory });

    // Send day/night tint
    if (config.get<boolean>('dayNightCycle', true)) {
        sendDayNightTint();
    }

    for (const pet of saveManager.save.pets.slice(0, MAX_SUMMONED_POKEMONS)) {
        loadPet(pet);
    }

    for (const decor of saveManager.save.decoration) {
        loadDecor(decor);
    }

    webview.postMessage({ type: 'init' });
}

function loadPet(pet: Pet): void {
    const { form, sprite, spriteSize } = normalizePet(pet);

    webview.postMessage({
        type: 'spawn_pet',
        name: pet.name,
        specie: pet.specie,
        color: pet.color,
        form,
        sprite,
        spriteSize,
    });
}

function loadDecor(decor: Decoration): void {
    webview.postMessage({
        type: 'spawn_decor',
        x: decor.x,
        y: decor.y,
        category: decor.category,
        name: decor.name,
    });
}

// ── Day/Night Cycle ─────────────────────────────────────────────────────

function sendDayNightTint(): void {
    const timeOfDay = DayNightCycle.getTimeOfDay();
    const tint = DayNightCycle.getTint(timeOfDay);
    webview.postMessage({ type: 'day_night', value: tint, timeOfDay });
}

function startDayNightTimer(): void {
    stopDayNightTimer();
    dayNightInterval = setInterval(() => sendDayNightTint(), 60_000);
}

function stopDayNightTimer(): void {
    if (dayNightInterval !== undefined) {
        clearInterval(dayNightInterval);
        dayNightInterval = undefined;
    }
}

// ── Webview Message Handler ─────────────────────────────────────────────

function handleWebviewMessage(message: any): void {
    switch (message.type.toLowerCase()) {
        case 'error':
            vscode.window.showErrorMessage(message.text);
            break;
        case 'info':
            vscode.window.showInformationMessage(message.text);
            break;
        case 'init':
            initGame();
            break;
        case 'money': {
            const oldMoney = saveManager.save.money;
            const newMoney = message.value as number;
            saveManager.updateMoney(newMoney);
            const diff = newMoney - oldMoney;
            if (diff > 0) { telemetry.trackGoldEarned(diff); }
            else if (diff < 0) { telemetry.trackGoldSpent(Math.abs(diff)); }
            break;
        }
        case 'spawn_wild_pokemon': {
            const specie = DayNightCycle.pickWildPokemon();
            if (specie) {
                webview.postMessage({ type: 'spawn_wild_pokemon', specie });
            }
            break;
        }
        case 'wild_pokemon_caught':
            telemetry.trackWildPokemonCaught();
            break;
        case 'use_consumable': {
            const consumableId = message.consumableId as string;
            if (!consumableId) { break; }
            const currentCount = saveManager.getConsumableCount(consumableId);
            if (currentCount <= 0) { break; }

            const petIndex = message.index as number;

            if (consumableId === 'candy') {
                // Candy is always consumed
                saveManager.updateInventory(consumableId, currentCount - 1);
                webview.postMessage({ type: 'inventory', value: saveManager.save.inventory });
                telemetry.trackCandyFed();

                if (typeof petIndex === 'number' && petIndex >= 0) {
                    const result = evolution.feedCandy(petIndex);
                    if (result.evolved && result.newForm) {
                        const pet = saveManager.save.pets[petIndex];
                        webview.postMessage({ type: 'remove_pet', index: petIndex });
                        loadPet(pet);
                        webview.postMessage({
                            type: 'evolution',
                            index: petIndex,
                            name: pet.name,
                            newForm: result.newForm.name,
                        });
                        telemetry.trackPokemonEvolved(pet.specie);
                        vscode.window.showInformationMessage(
                            `🎉 ${pet.name} evolved into ${result.newForm.name}!`,
                        );
                    }
                }
            } else {
                // Evolution stones: only consumed if evolution succeeds
                if (typeof petIndex !== 'number' || petIndex < 0) { break; }
                const result = evolution.useItem(petIndex, consumableId);
                if (result.evolved && result.newForm) {
                    saveManager.updateInventory(consumableId, currentCount - 1);
                    webview.postMessage({ type: 'inventory', value: saveManager.save.inventory });

                    const pet = saveManager.save.pets[petIndex];
                    webview.postMessage({ type: 'remove_pet', index: petIndex });
                    loadPet(pet);
                    webview.postMessage({
                        type: 'evolution',
                        index: petIndex,
                        name: pet.name,
                        newForm: result.newForm.name,
                    });
                    telemetry.trackPokemonEvolved(pet.specie);
                    vscode.window.showInformationMessage(
                        `🎉 ${pet.name} evolved into ${result.newForm.name}!`,
                    );
                } else {
                    // Stone had no effect — not consumed
                    webview.postMessage({ type: 'consumable_failed' });
                }
            }
            break;
        }
        case 'buy_consumable': {
            const itemId = message.consumableId as string;
            const consumable = Consumables.find(c => c.id === itemId);
            if (!consumable) { break; }
            const qty = (message.quantity as number) || 1;
            const totalCost = consumable.price * qty;
            if (saveManager.save.money < totalCost) { break; }
            saveManager.updateMoney(saveManager.save.money - totalCost);
            const prev = saveManager.getConsumableCount(itemId);
            saveManager.updateInventory(itemId, prev + qty);
            webview.postMessage({ type: 'money', value: saveManager.save.money });
            webview.postMessage({ type: 'inventory', value: saveManager.save.inventory });
            telemetry.trackGoldSpent(totalCost);
            break;
        }
        case 'move_decor':
            saveManager.moveDecor(message.index, message.x, message.y);
            break;
        case 'add_decor':
            saveManager.addDecor({
                x: message.x,
                y: message.y,
                category: message.category,
                name: message.name,
            });
            telemetry.trackDecorationPlaced();
            break;
        case 'remove_decor':
            saveManager.removeDecor(message.index);
            break;
        case 'request_pokedex': {
            const pets = saveManager.save.pets.slice(0, MAX_SUMMONED_POKEMONS).map(p => ({
                name: p.name,
                specie: p.specie,
                sprite: p.sprite,
                spriteSize: p.spriteSize,
                candyFed: p.candyFed ?? 0,
            }));
            webview.postMessage({ type: 'pokedex', value: pets });
            break;
        }
    }
}

// ── Commands ────────────────────────────────────────────────────────────

async function addPetCommand(): Promise<void> {
    if (saveManager.save.pets.length >= MAX_SUMMONED_POKEMONS) {
        vscode.window.showWarningMessage(
            `You can only summon up to ${MAX_SUMMONED_POKEMONS} Pokémon at once. Remove one first.`,
        );
        return;
    }

    const generation = await vscode.window.showQuickPick(Object.keys(Pokemons), {
        title: 'Select a Pokémon generation',
        placeHolder: 'Generation',
    });
    if (generation === undefined) { return; }

    const pokemonItems = Pokemons[generation].map((poke, idx) =>
        new PetItem(idx, poke.name, `${poke.forms.length} forms`),
    );
    const selectedPokemon = await vscode.window.showQuickPick(pokemonItems, {
        title: 'Select a Pokémon',
        placeHolder: 'Pokémon',
    });
    if (selectedPokemon === undefined) { return; }
    const pokemonData = Pokemons[generation][selectedPokemon.index];

    // Only allow adding base forms (candyCost === 0); evolutions are earned in-game
    const baseForms = pokemonData.forms
        .map((form, idx) => ({ form, idx }))
        .filter(({ form }) => form.candyCost === 0);

    let formData: typeof pokemonData.forms[number];
    if (baseForms.length === 1) {
        formData = baseForms[0].form;
    } else {
        const formItems = baseForms.map(({ form, idx }) =>
            new PetItem(idx, form.name, 'Base form'),
        );
        const selectedForm = await vscode.window.showQuickPick(formItems, {
            title: `Select a form for ${pokemonData.name}`,
            placeHolder: 'Form',
        });
        if (selectedForm === undefined) { return; }
        formData = pokemonData.forms[selectedForm.index];
    }

    const tmpname = formData.name;
    const name = await vscode.window.showInputBox({
        title: 'Choose a name for your Pokémon',
        placeHolder: 'Name',
        value: tmpname,
        valueSelection: [0, tmpname.length],
        validateInput: text => (text === '' ? 'Please input a name for your Pokémon' : null),
    });
    if (name === undefined) { return; }

    const pet: Pet = {
        specie: pokemonData.name,
        name,
        color: generation,
        form: formData.name,
        sprite: formData.sprite,
        spriteSize: formData.spriteSize,
        candyFed: formData.candyCost,
    };

    const added = saveManager.addPet(pet);
    if (!added) {
        vscode.window.showWarningMessage(
            `You can only summon up to ${MAX_SUMMONED_POKEMONS} Pokémon at once. Remove one first.`,
        );
        return;
    }

    loadPet(pet);
    telemetry.trackPokemonAdded(pokemonData.name);
    vscode.window.showInformationMessage(`Say hi to ${name} the ${formData.name}!`);
}

async function removePetCommand(): Promise<void> {
    const items: PetItem[] = saveManager.save.pets.map((pet, i) =>
        new PetItem(i, pet.name, `${pet.color} ${pet.form ?? pet.specie}`),
    );

    const selected = await vscode.window.showQuickPick(items, {
        title: 'Select a pet to remove',
        placeHolder: 'Pet',
        matchOnDescription: true,
    });
    if (selected === undefined) { return; }

    saveManager.removePet(selected.index);
    webview.postMessage({ type: 'remove_pet', index: selected.index });
    vscode.window.showInformationMessage('Bye ' + selected.label + '!');
}

async function exportSaveCommand(): Promise<void> {
    const saveJson = JSON.stringify(saveManager.save, null, 2);
    await vscode.env.clipboard.writeText(saveJson);
    vscode.window.showInformationMessage('Save data copied to clipboard!');
}

async function importSaveCommand(): Promise<void> {
    const confirm = await vscode.window.showWarningMessage(
        'This will replace your current save with data from the clipboard. Continue?',
        { modal: true },
        'Import',
    );
    if (confirm !== 'Import') { return; }

    const clipText = await vscode.env.clipboard.readText();
    try {
        const imported = JSON.parse(clipText);
        if (typeof imported !== 'object' || imported === null) {
            throw new Error('Invalid save format');
        }
        saveManager.save = imported;
        saveManager.saveGame();
        saveManager.loadGame();

        webview.postMessage({ type: 'reset' });
        initGame();
        vscode.window.showInformationMessage('Save imported successfully! 🎉');
    } catch {
        vscode.window.showErrorMessage('Failed to import save — invalid JSON or format.');
    }
}

function showStatsCommand(): void {
    if (!telemetry.isEnabled()) {
        vscode.window.showInformationMessage(
            'Telemetry is disabled. Enable it in settings: pokemon-pets.telemetry',
        );
        return;
    }
    const summary = telemetry.getSummary();
    const streak = streakService.getData();
    const fullSummary = summary + `\nCoding streak: ${streak.currentStreak} days (best: ${streak.longestStreak})`;
    vscode.window.showInformationMessage(fullSummary, { modal: true });
}

// ── Activation / Deactivation ───────────────────────────────────────────

export function activate(context: vscode.ExtensionContext): void {
    console.log('Pokemon Pets is now active 😽');

    // Initialize save manager
    saveManager = new SaveManager(context.globalStorageUri.fsPath);
    saveManager.loadGame();

    // Initialize services
    const telemetryEnabled = config.get<boolean>('telemetry', false);
    telemetry = new TelemetryService(saveManager, telemetryEnabled);
    evolution = new EvolutionService(saveManager);
    streakService = new StreakService(saveManager);

    // Track session
    telemetry.trackSession();

    // Claim daily streak reward
    const reward = streakService.claimDaily();
    if (reward) {
        saveManager.save.money += reward.gold;
        saveManager.scheduleSave();
        telemetry.trackGoldEarned(reward.gold);
        setTimeout(() => {
            vscode.window.showInformationMessage(reward.message);
            webview.postMessage({ type: 'money', value: saveManager.save.money });
        }, 2000);
    }

    // Initialize webview provider
    webview = new WebViewProvider(context);
    webview.setMessageHandler(handleWebviewMessage);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(WebViewProvider.viewType, webview),
    );

    // Start day/night cycle timer
    if (config.get<boolean>('dayNightCycle', true)) {
        startDayNightTimer();
    }

    // Listen for configuration changes
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(event => {
        config = vscode.workspace.getConfiguration('pokemon-pets');

        if (event.affectsConfiguration('pokemon-pets.background')) {
            webview.postMessage({ type: 'background', value: config.get('background') });
        }
        if (event.affectsConfiguration('pokemon-pets.scale')) {
            webview.postMessage({ type: 'scale', value: config.get('scale') });
        }
        if (event.affectsConfiguration('pokemon-pets.wild')) {
            webview.postMessage({ type: 'wild_pokemons', value: config.get('wild') });
        }
        if (event.affectsConfiguration('pokemon-pets.telemetry')) {
            telemetry.setEnabled(config.get<boolean>('telemetry', false));
        }
        if (event.affectsConfiguration('pokemon-pets.dayNightCycle')) {
            if (config.get<boolean>('dayNightCycle', true)) {
                sendDayNightTint();
                startDayNightTimer();
            } else {
                stopDayNightTimer();
                webview.postMessage({ type: 'day_night', value: 'none', timeOfDay: 'day' });
            }
        }
    }));

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('pokemon-pets.addPet', addPetCommand),
        vscode.commands.registerCommand('pokemon-pets.removePet', removePetCommand),
        vscode.commands.registerCommand('pokemon-pets.actions', () => {
            webview.postMessage({ type: 'actions' });
        }),
        vscode.commands.registerCommand('pokemon-pets.toggleTopBar', () => {
            webview.postMessage({ type: 'toggle_topbar' });
        }),
        vscode.commands.registerCommand('pokemon-pets.settings', () => {
            vscode.commands.executeCommand('workbench.action.openSettings', '@ext:Anasfiguigui.pokemon-pets');
        }),
        vscode.commands.registerCommand('pokemon-pets.openSaveFile', () => {
            vscode.commands.executeCommand('vscode.open', vscode.Uri.file(saveManager.getSavePath()));
        }),
        vscode.commands.registerCommand('pokemon-pets.reloadSaveFile', () => {
            webview.postMessage({ type: 'reset' });
            saveManager.loadGame();
            initGame();
        }),
        vscode.commands.registerCommand('pokemon-pets.exportSave', exportSaveCommand),
        vscode.commands.registerCommand('pokemon-pets.importSave', importSaveCommand),
        vscode.commands.registerCommand('pokemon-pets.showStats', showStatsCommand),
    );
}

export function deactivate(): void {
    saveManager.flushSave();
    stopDayNightTimer();
    console.log('Pokemon Pets is now deactivated 😿');
}
