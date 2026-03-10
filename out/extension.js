"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const game_data_1 = require("./game-data");
const models_1 = require("./models");
const save_manager_1 = require("./save-manager");
const webview_provider_1 = require("./webview-provider");
const telemetry_1 = require("./telemetry");
const evolution_1 = require("./evolution");
const day_night_1 = require("./day-night");
const streak_1 = require("./streak");
let config = vscode.workspace.getConfiguration('pokemon-pets');
let webview;
let saveManager;
let telemetry;
let evolution;
let streakService;
let dayNightInterval;
let staminaDrainInterval;
/** Interval between stamina drain ticks (6 minutes → 10 stamina/hour). */
const STAMINA_DRAIN_INTERVAL_MS = 6 * 60_000;
/** How much stamina drains per tick. */
const STAMINA_DRAIN_AMOUNT = 1;
/** How much HP drains per tick when stamina is 0. */
const HP_DRAIN_AMOUNT = 1;
/** Pre-built map for O(1) consumable lookups by ID. */
const ConsumablesMap = new Map(game_data_1.Consumables.map(c => [c.id, c]));
// ── Game Initialization ─────────────────────────────────────────────────
function initGame() {
    webview.postMessage({ type: 'background', value: config.get('background') });
    webview.postMessage({ type: 'scale', value: config.get('scale') });
    webview.postMessage({ type: 'wild_pokemons', value: config.get('wild') });
    webview.postMessage({ type: 'money', value: saveManager.save.money });
    webview.postMessage({ type: 'inventory', value: saveManager.save.inventory });
    // Send day/night tint
    if (config.get('dayNightCycle', true)) {
        sendDayNightTint();
    }
    for (const pet of saveManager.save.pets.slice(0, save_manager_1.MAX_SUMMONED_POKEMONS)) {
        loadPet(pet);
    }
    for (const decor of saveManager.save.decoration) {
        loadDecor(decor);
    }
    webview.postMessage({ type: 'init' });
}
function loadPet(pet) {
    const { form, sprite, spriteSize } = (0, models_1.normalizePet)(pet);
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
function loadDecor(decor) {
    webview.postMessage({
        type: 'spawn_decor',
        x: decor.x,
        y: decor.y,
        category: decor.category,
        name: decor.name,
    });
}
// ── Day/Night Cycle ─────────────────────────────────────────────────────
function sendDayNightTint() {
    const timeOfDay = day_night_1.DayNightCycle.getTimeOfDay();
    const opacity = day_night_1.DayNightCycle.getOverlayOpacity(timeOfDay);
    webview.postMessage({ type: 'day_night', timeOfDay, opacity });
}
function startDayNightTimer() {
    stopDayNightTimer();
    dayNightInterval = setInterval(() => sendDayNightTint(), 60_000);
}
function stopDayNightTimer() {
    if (dayNightInterval !== undefined) {
        clearInterval(dayNightInterval);
        dayNightInterval = undefined;
    }
}
// ── Stamina / HP Drain ──────────────────────────────────────────────────
function drainStamina() {
    const pets = saveManager.save.pets;
    if (pets.length === 0) {
        return;
    }
    const removedIndices = [];
    for (let i = pets.length - 1; i >= 0; i--) {
        const pet = pets[i];
        const maxHp = (0, models_1.getMaxHp)(pet);
        const maxStamina = (0, models_1.getMaxStamina)(pet);
        let hp = Math.min(pet.hp ?? maxHp, maxHp);
        let stamina = Math.min(pet.stamina ?? maxStamina, maxStamina);
        // Drain stamina
        stamina = Math.max(0, stamina - STAMINA_DRAIN_AMOUNT);
        // If stamina is 0, drain HP
        if (stamina <= 0) {
            hp = Math.max(0, hp - HP_DRAIN_AMOUNT);
        }
        saveManager.updatePetStats(i, hp, stamina);
        // If HP reaches 0, remove the pet
        if (hp <= 0) {
            removedIndices.push(i);
        }
    }
    // Remove fainted pets (already in reverse order)
    for (const idx of removedIndices) {
        const pet = saveManager.save.pets[idx];
        const petName = pet?.name ?? 'A Pokémon';
        saveManager.removePet(idx);
        webview.postMessage({ type: 'remove_pet', index: idx });
        vscode.window.showWarningMessage(`💔 ${petName} fainted from exhaustion and left...`);
    }
    // Broadcast updated stats so Pokédex stays fresh
    webview.postMessage({ type: 'pet_stats', value: buildPetStats() });
}
/** Builds an array of { hp, stamina, maxHp, maxStamina } for each pet. */
function buildPetStats() {
    return saveManager.save.pets.slice(0, save_manager_1.MAX_SUMMONED_POKEMONS).map(p => ({
        hp: p.hp ?? (0, models_1.getMaxHp)(p),
        stamina: p.stamina ?? (0, models_1.getMaxStamina)(p),
        maxHp: (0, models_1.getMaxHp)(p),
        maxStamina: (0, models_1.getMaxStamina)(p),
    }));
}
function startStaminaDrainTimer() {
    stopStaminaDrainTimer();
    staminaDrainInterval = setInterval(() => drainStamina(), STAMINA_DRAIN_INTERVAL_MS);
}
function stopStaminaDrainTimer() {
    if (staminaDrainInterval !== undefined) {
        clearInterval(staminaDrainInterval);
        staminaDrainInterval = undefined;
    }
}
// ── Webview Message Handler ─────────────────────────────────────────────
function handleWebviewMessage(message) {
    if (typeof message?.type !== 'string') {
        return;
    }
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
            const newMoney = message.value;
            saveManager.updateMoney(newMoney);
            const diff = newMoney - oldMoney;
            if (diff > 0) {
                telemetry.trackGoldEarned(diff);
            }
            else if (diff < 0) {
                telemetry.trackGoldSpent(Math.abs(diff));
            }
            break;
        }
        case 'spawn_wild_pokemon': {
            const specie = day_night_1.DayNightCycle.pickWildPokemon();
            if (specie) {
                webview.postMessage({ type: 'spawn_wild_pokemon', specie });
            }
            else {
                // No eligible species right now — tell webview to retry later
                webview.postMessage({ type: 'retry_wild_spawn' });
            }
            break;
        }
        case 'wild_pokemon_caught':
            telemetry.trackWildPokemonCaught();
            break;
        case 'use_consumable': {
            const consumableId = message.consumableId;
            if (!consumableId) {
                break;
            }
            const currentCount = saveManager.getConsumableCount(consumableId);
            if (currentCount <= 0) {
                break;
            }
            const petIndex = message.index;
            if (consumableId === 'candy') {
                // Candy is always consumed
                saveManager.updateInventory(consumableId, currentCount - 1);
                webview.postMessage({ type: 'inventory', value: saveManager.save.inventory });
                telemetry.trackCandyFed();
                if (typeof petIndex === 'number' && petIndex >= 0) {
                    const pet = saveManager.save.pets[petIndex];
                    // Boost HP/Stamina by the level-up delta (max increases by 2 per candy)
                    if (pet) {
                        const oldMaxHp = (0, models_1.getMaxHp)(pet);
                        const oldMaxStamina = (0, models_1.getMaxStamina)(pet);
                        const result = evolution.feedCandy(petIndex);
                        const newMaxHp = (0, models_1.getMaxHp)(pet);
                        const newMaxStamina = (0, models_1.getMaxStamina)(pet);
                        const hpGain = newMaxHp - oldMaxHp;
                        const staminaGain = newMaxStamina - oldMaxStamina;
                        if (hpGain > 0 || staminaGain > 0) {
                            saveManager.updatePetStats(petIndex, Math.min(newMaxHp, (pet.hp ?? oldMaxHp) + hpGain), Math.min(newMaxStamina, (pet.stamina ?? oldMaxStamina) + staminaGain));
                            webview.postMessage({ type: 'pet_stats', value: buildPetStats() });
                        }
                        if (result.evolved && result.newForm) {
                            webview.postMessage({ type: 'remove_pet', index: petIndex });
                            loadPet(pet);
                            webview.postMessage({
                                type: 'evolution',
                                index: petIndex,
                                name: pet.name,
                                newForm: result.newForm.name,
                            });
                            telemetry.trackPokemonEvolved(pet.specie);
                            vscode.window.showInformationMessage(`🎉 ${pet.name} evolved into ${result.newForm.name}!`);
                        }
                    }
                    else {
                        evolution.feedCandy(petIndex);
                    }
                }
            }
            else {
                // Look up consumable to determine category
                const consumable = ConsumablesMap.get(consumableId);
                if (!consumable) {
                    break;
                }
                if (consumable.category === 'food') {
                    // Food (berry): restores stamina
                    if (typeof petIndex !== 'number' || petIndex < 0) {
                        break;
                    }
                    const pet = saveManager.save.pets[petIndex];
                    if (!pet) {
                        break;
                    }
                    const maxStamina = (0, models_1.getMaxStamina)(pet);
                    const currentStamina = pet.stamina ?? maxStamina;
                    if (currentStamina >= maxStamina) {
                        webview.postMessage({ type: 'consumable_failed' });
                        break;
                    }
                    saveManager.updateInventory(consumableId, currentCount - 1);
                    const newStamina = Math.min(maxStamina, currentStamina + (consumable.restoreAmount ?? 10));
                    saveManager.updatePetStats(petIndex, pet.hp ?? (0, models_1.getMaxHp)(pet), newStamina);
                    webview.postMessage({ type: 'inventory', value: saveManager.save.inventory });
                    webview.postMessage({ type: 'pet_stats', value: buildPetStats() });
                }
                else if (consumable.category === 'potion') {
                    // Potion: restores HP
                    if (typeof petIndex !== 'number' || petIndex < 0) {
                        break;
                    }
                    const pet = saveManager.save.pets[petIndex];
                    if (!pet) {
                        break;
                    }
                    const maxHp = (0, models_1.getMaxHp)(pet);
                    const currentHp = pet.hp ?? maxHp;
                    if (currentHp >= maxHp) {
                        webview.postMessage({ type: 'consumable_failed' });
                        break;
                    }
                    saveManager.updateInventory(consumableId, currentCount - 1);
                    const newHp = Math.min(maxHp, currentHp + (consumable.restoreAmount ?? 20));
                    saveManager.updatePetStats(petIndex, newHp, pet.stamina ?? (0, models_1.getMaxStamina)(pet));
                    webview.postMessage({ type: 'inventory', value: saveManager.save.inventory });
                    webview.postMessage({ type: 'pet_stats', value: buildPetStats() });
                }
                else {
                    // Evolution stones: only consumed if evolution succeeds
                    if (typeof petIndex !== 'number' || petIndex < 0) {
                        break;
                    }
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
                        vscode.window.showInformationMessage(`🎉 ${pet.name} evolved into ${result.newForm.name}!`);
                    }
                    else {
                        // Stone had no effect — not consumed
                        webview.postMessage({ type: 'consumable_failed' });
                    }
                }
            }
            break;
        }
        case 'buy_consumable': {
            const itemId = message.consumableId;
            const consumable = ConsumablesMap.get(itemId);
            if (!consumable) {
                break;
            }
            const qty = message.quantity || 1;
            const totalCost = consumable.price * qty;
            if (saveManager.save.money < totalCost) {
                break;
            }
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
            const pets = saveManager.save.pets.slice(0, save_manager_1.MAX_SUMMONED_POKEMONS).map(p => ({
                name: p.name,
                specie: p.specie,
                sprite: p.sprite,
                spriteSize: p.spriteSize,
                candyFed: p.candyFed ?? 0,
                hp: p.hp ?? (0, models_1.getMaxHp)(p),
                stamina: p.stamina ?? (0, models_1.getMaxStamina)(p),
                maxHp: (0, models_1.getMaxHp)(p),
                maxStamina: (0, models_1.getMaxStamina)(p),
            }));
            webview.postMessage({ type: 'pokedex', value: pets });
            break;
        }
    }
}
// ── Commands ────────────────────────────────────────────────────────────
async function addPetCommand() {
    if (saveManager.save.pets.length >= save_manager_1.MAX_SUMMONED_POKEMONS) {
        vscode.window.showWarningMessage(`You can only summon up to ${save_manager_1.MAX_SUMMONED_POKEMONS} Pokémon at once. Remove one first.`);
        return;
    }
    const generation = await vscode.window.showQuickPick(Object.keys(game_data_1.Pokemons), {
        title: 'Select a Pokémon generation',
        placeHolder: 'Generation',
    });
    if (generation === undefined) {
        return;
    }
    const pokemonItems = game_data_1.Pokemons[generation].map((poke, idx) => new models_1.PetItem(idx, poke.name, `${poke.forms.length} forms`));
    const selectedPokemon = await vscode.window.showQuickPick(pokemonItems, {
        title: 'Select a Pokémon',
        placeHolder: 'Pokémon',
    });
    if (selectedPokemon === undefined) {
        return;
    }
    const pokemonData = game_data_1.Pokemons[generation][selectedPokemon.index];
    // Only allow adding base forms (candyCost === 0); evolutions are earned in-game
    const baseForms = pokemonData.forms
        .map((form, idx) => ({ form, idx }))
        .filter(({ form }) => form.candyCost === 0);
    let formData;
    if (baseForms.length === 1) {
        formData = baseForms[0].form;
    }
    else {
        const formItems = baseForms.map(({ form, idx }) => new models_1.PetItem(idx, form.name, 'Base form'));
        const selectedForm = await vscode.window.showQuickPick(formItems, {
            title: `Select a form for ${pokemonData.name}`,
            placeHolder: 'Form',
        });
        if (selectedForm === undefined) {
            return;
        }
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
    if (name === undefined) {
        return;
    }
    const pet = {
        specie: pokemonData.name,
        name,
        color: generation,
        form: formData.name,
        sprite: formData.sprite,
        spriteSize: formData.spriteSize,
        candyFed: formData.candyCost,
    };
    // Initialize HP/Stamina at max for the pet's level
    pet.hp = (0, models_1.getMaxHp)(pet);
    pet.stamina = (0, models_1.getMaxStamina)(pet);
    const added = saveManager.addPet(pet);
    if (!added) {
        vscode.window.showWarningMessage(`You can only summon up to ${save_manager_1.MAX_SUMMONED_POKEMONS} Pokémon at once. Remove one first.`);
        return;
    }
    loadPet(pet);
    telemetry.trackPokemonAdded(pokemonData.name);
    vscode.window.showInformationMessage(`Say hi to ${name} the ${formData.name}!`);
}
async function removePetCommand() {
    const items = saveManager.save.pets.map((pet, i) => new models_1.PetItem(i, pet.name, `${pet.color} ${pet.form ?? pet.specie}`));
    const selected = await vscode.window.showQuickPick(items, {
        title: 'Select a pet to remove',
        placeHolder: 'Pet',
        matchOnDescription: true,
    });
    if (selected === undefined) {
        return;
    }
    saveManager.removePet(selected.index);
    webview.postMessage({ type: 'remove_pet', index: selected.index });
    vscode.window.showInformationMessage('Bye ' + selected.label + '!');
}
async function exportSaveCommand() {
    const saveJson = JSON.stringify(saveManager.save, null, 2);
    await vscode.env.clipboard.writeText(saveJson);
    vscode.window.showInformationMessage('Save data copied to clipboard!');
}
async function importSaveCommand() {
    const confirm = await vscode.window.showWarningMessage('This will replace your current save with data from the clipboard. Continue?', { modal: true }, 'Import');
    if (confirm !== 'Import') {
        return;
    }
    const clipText = await vscode.env.clipboard.readText();
    try {
        const imported = JSON.parse(clipText);
        if (typeof imported !== 'object' || imported === null) {
            throw new Error('Invalid save format');
        }
        // Only accept known Save fields to prevent excess property injection
        const sanitized = new models_1.Save();
        if (typeof imported.money === 'number') {
            sanitized.money = imported.money;
        }
        if (Array.isArray(imported.pets)) {
            sanitized.pets = imported.pets;
        }
        if (Array.isArray(imported.decoration)) {
            sanitized.decoration = imported.decoration;
        }
        if (typeof imported.inventory === 'object' && imported.inventory !== null && !Array.isArray(imported.inventory)) {
            sanitized.inventory = imported.inventory;
        }
        if (typeof imported.streak === 'object' && imported.streak !== null && !Array.isArray(imported.streak)) {
            sanitized.streak = imported.streak;
        }
        if (typeof imported.telemetry === 'object' && imported.telemetry !== null && !Array.isArray(imported.telemetry)) {
            sanitized.telemetry = imported.telemetry;
        }
        saveManager.save = sanitized;
        saveManager.saveGame();
        saveManager.loadGame();
        webview.postMessage({ type: 'reset' });
        initGame();
        vscode.window.showInformationMessage('Save imported successfully! 🎉');
    }
    catch {
        vscode.window.showErrorMessage('Failed to import save — invalid JSON or format.');
    }
}
function showStatsCommand() {
    if (!telemetry.isEnabled()) {
        vscode.window.showInformationMessage('Telemetry is disabled. Enable it in settings: pokemon-pets.telemetry');
        return;
    }
    const summary = telemetry.getSummary();
    const streak = streakService.getData();
    const fullSummary = summary + `\nCoding streak: ${streak.currentStreak} days (best: ${streak.longestStreak})`;
    vscode.window.showInformationMessage(fullSummary, { modal: true });
}
// ── Activation / Deactivation ───────────────────────────────────────────
function activate(context) {
    console.log('Pokemon Pets is now active 😽');
    // Initialize save manager
    saveManager = new save_manager_1.SaveManager(context.globalStorageUri.fsPath);
    saveManager.loadGame();
    // Initialize services
    const telemetryEnabled = config.get('telemetry', false);
    telemetry = new telemetry_1.TelemetryService(saveManager, telemetryEnabled);
    evolution = new evolution_1.EvolutionService(saveManager);
    streakService = new streak_1.StreakService(saveManager);
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
    webview = new webview_provider_1.WebViewProvider(context);
    webview.setMessageHandler(handleWebviewMessage);
    webview.setVisibilityHandler(() => {
        if (config.get('dayNightCycle', true)) {
            sendDayNightTint();
        }
    });
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(webview_provider_1.WebViewProvider.viewType, webview));
    // Start day/night cycle timer
    if (config.get('dayNightCycle', true)) {
        startDayNightTimer();
    }
    // Start stamina drain timer
    startStaminaDrainTimer();
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
            telemetry.setEnabled(config.get('telemetry', false));
        }
        if (event.affectsConfiguration('pokemon-pets.dayNightCycle')) {
            if (config.get('dayNightCycle', true)) {
                sendDayNightTint();
                startDayNightTimer();
            }
            else {
                stopDayNightTimer();
                webview.postMessage({ type: 'day_night', timeOfDay: 'day', opacity: 0 });
            }
        }
    }));
    // Register commands
    context.subscriptions.push(vscode.commands.registerCommand('pokemon-pets.addPet', addPetCommand), vscode.commands.registerCommand('pokemon-pets.removePet', removePetCommand), vscode.commands.registerCommand('pokemon-pets.actions', () => {
        webview.postMessage({ type: 'actions' });
    }), vscode.commands.registerCommand('pokemon-pets.toggleTopBar', () => {
        webview.postMessage({ type: 'toggle_topbar' });
    }), vscode.commands.registerCommand('pokemon-pets.settings', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', '@ext:Anasfiguigui.pokemon-pets');
    }), vscode.commands.registerCommand('pokemon-pets.openSaveFile', () => {
        vscode.commands.executeCommand('vscode.open', vscode.Uri.file(saveManager.getSavePath()));
    }), vscode.commands.registerCommand('pokemon-pets.reloadSaveFile', () => {
        webview.postMessage({ type: 'reset' });
        saveManager.loadGame();
        initGame();
    }), vscode.commands.registerCommand('pokemon-pets.exportSave', exportSaveCommand), vscode.commands.registerCommand('pokemon-pets.importSave', importSaveCommand), vscode.commands.registerCommand('pokemon-pets.showStats', showStatsCommand));
}
function deactivate() {
    saveManager.flushSave();
    stopDayNightTimer();
    stopStaminaDrainTimer();
    console.log('Pokemon Pets is now deactivated 😿');
}
//# sourceMappingURL=extension.js.map