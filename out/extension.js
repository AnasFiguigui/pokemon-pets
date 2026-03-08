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
// ── Game Initialization ─────────────────────────────────────────────────
function initGame() {
    webview.postMessage({ type: 'background', value: config.get('background') });
    webview.postMessage({ type: 'scale', value: config.get('scale') });
    webview.postMessage({ type: 'wild_pokemons', value: config.get('wild') });
    webview.postMessage({ type: 'money', value: saveManager.save.money });
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
    const tint = day_night_1.DayNightCycle.getTint(timeOfDay);
    webview.postMessage({ type: 'day_night', value: tint, timeOfDay });
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
// ── Webview Message Handler ─────────────────────────────────────────────
function handleWebviewMessage(message) {
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
            break;
        }
        case 'wild_pokemon_caught':
            telemetry.trackWildPokemonCaught();
            break;
        case 'candy_fed': {
            telemetry.trackCandyFed();
            const petIndex = message.index;
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
                    vscode.window.showInformationMessage(`🎉 ${pet.name} evolved into ${result.newForm.name}!`);
                }
            }
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
    const formItems = pokemonData.forms.map((form, idx) => new models_1.PetItem(idx, form.name, form.candyCost > 0 ? `${form.candyCost} candy` : 'Base form'));
    const selectedForm = await vscode.window.showQuickPick(formItems, {
        title: `Select a form for ${pokemonData.name}`,
        placeHolder: 'Form',
    });
    if (selectedForm === undefined) {
        return;
    }
    const formData = pokemonData.forms[selectedForm.index];
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
        saveManager.save = imported;
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
        saveManager.saveGame();
        telemetry.trackGoldEarned(reward.gold);
        setTimeout(() => {
            vscode.window.showInformationMessage(reward.message);
            webview.postMessage({ type: 'money', value: saveManager.save.money });
        }, 2000);
    }
    // Initialize webview provider
    webview = new webview_provider_1.WebViewProvider(context);
    webview.setMessageHandler(handleWebviewMessage);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(webview_provider_1.WebViewProvider.viewType, webview));
    // Start day/night cycle timer
    if (config.get('dayNightCycle', true)) {
        startDayNightTimer();
    }
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
                webview.postMessage({ type: 'day_night', value: 'none', timeOfDay: 'day' });
            }
        }
    });
    // Register commands
    context.subscriptions.push(vscode.commands.registerCommand('pokemon-pets.addPet', addPetCommand), vscode.commands.registerCommand('pokemon-pets.removePet', removePetCommand), vscode.commands.registerCommand('pokemon-pets.actions', () => {
        webview.postMessage({ type: 'actions' });
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
    stopDayNightTimer();
    console.log('Pokemon Pets is now deactivated 😿');
}
//# sourceMappingURL=extension.js.map