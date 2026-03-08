import * as vscode from 'vscode';
import { WildPokemonSpecies, Pokemons } from './game-data';
import { Decoration, Pet, PetItem, normalizePet } from './models';
import { SaveManager, MAX_SUMMONED_POKEMONS } from './save-manager';
import { WebViewProvider } from './webview-provider';

let config = vscode.workspace.getConfiguration('pokemon-pets');
let webview: WebViewProvider;
let saveManager: SaveManager;

// ── Game Initialization ─────────────────────────────────────────────────

function initGame(): void {
    webview.postMessage({ type: 'background', value: config.get('background') });
    webview.postMessage({ type: 'scale', value: config.get('scale') });
    webview.postMessage({ type: 'wild_pokemons', value: config.get('wild') });
    webview.postMessage({ type: 'money', value: saveManager.save.money });

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
        case 'money':
            saveManager.updateMoney(message.value);
            break;
        case 'spawn_wild_pokemon': {
            const specie = WildPokemonSpecies[Math.floor(Math.random() * WildPokemonSpecies.length)];
            webview.postMessage({ type: 'spawn_wild_pokemon', specie });
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
            break;
        case 'remove_decor':
            saveManager.removeDecor(message.index);
            break;
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

    const formItems = pokemonData.forms.map((form, idx) =>
        new PetItem(idx, form.name, ''),
    );
    const selectedForm = await vscode.window.showQuickPick(formItems, {
        title: `Select a form for ${pokemonData.name}`,
        placeHolder: 'Form',
    });
    if (selectedForm === undefined) { return; }
    const formData = pokemonData.forms[selectedForm.index];

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
    };

    const added = saveManager.addPet(pet);
    if (!added) {
        vscode.window.showWarningMessage(
            `You can only summon up to ${MAX_SUMMONED_POKEMONS} Pokémon at once. Remove one first.`,
        );
        return;
    }

    loadPet(pet);
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

// ── Activation / Deactivation ───────────────────────────────────────────

export function activate(context: vscode.ExtensionContext): void {
    console.log('Pokemon Pets is now active 😽');

    // Initialize save manager
    saveManager = new SaveManager(context.globalStorageUri.fsPath);
    saveManager.loadGame();

    // Initialize webview provider
    webview = new WebViewProvider(context);
    webview.setMessageHandler(handleWebviewMessage);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(WebViewProvider.viewType, webview),
    );

    // Listen for configuration changes
    vscode.workspace.onDidChangeConfiguration(event => {
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
    });

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('pokemon-pets.addPet', addPetCommand),
        vscode.commands.registerCommand('pokemon-pets.removePet', removePetCommand),
        vscode.commands.registerCommand('pokemon-pets.actions', () => {
            webview.postMessage({ type: 'actions' });
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
    );
}

export function deactivate(): void {
    console.log('Pokemon Pets is now deactivated 😿');
}
