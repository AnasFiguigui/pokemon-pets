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
exports.WebViewProvider = void 0;
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const game_data_1 = require("./game-data");
const models_1 = require("./models");
const MAX_SUMMONED_POKEMONS = 7;
//Extension
let config = vscode.workspace.getConfiguration('pokemon-pets');
let webview;
let extensionStorageFolder = '';
let savePath;
let save = new models_1.Save();
function loadGame() {
    //Storage folder does not exist -> Create it
    if (!fs.existsSync(extensionStorageFolder)) {
        fs.mkdirSync(extensionStorageFolder, { recursive: true });
    }
    //Bool to check if the save was updated to save its file after load
    let saveUpdated = false;
    //Check if save file exists
    if (fs.existsSync(savePath)) {
        //Exists -> Load save
        try {
            //Read save
            save = JSON.parse(fs.readFileSync(savePath, 'utf8'));
        }
        catch (e) {
            //Failed -> Reset save
            save = new models_1.Save();
            //Load old pets file if it exists
            loadPetsFile();
            //Save updated
            saveUpdated = true;
        }
    }
    else {
        //Does not exist -> Load old pets file if it exists
        loadPetsFile();
        //Save updated
        saveUpdated = true;
    }
    //Invalid money value
    if (typeof save.money !== 'number') {
        //Reset money value
        save.money = 0;
        //Save updated
        saveUpdated = true;
    }
    //Invalid pets list
    if (!Array.isArray(save.pets)) {
        //Reset pets list
        save.pets = new Array();
        //Save updated
        saveUpdated = true;
    }
    else if (save.pets.length > MAX_SUMMONED_POKEMONS) {
        //Trim pets list if there are too many
        save.pets = save.pets.slice(0, MAX_SUMMONED_POKEMONS);
        //Save updated
        saveUpdated = true;
    }
    //Invalid decoration list
    if (!Array.isArray(save.decoration)) {
        //Reset decoration list
        save.decoration = new Array();
        //Save updated
        saveUpdated = true;
    }
    //Save game file
    if (saveUpdated) {
        saveGame();
    }
}
function saveGame() {
    fs.writeFileSync(savePath, JSON.stringify(save, null, 4));
}
function initGame() {
    //Send background
    webview.postMessage({
        type: 'background',
        value: config.get('background')
    });
    //Send scale
    webview.postMessage({
        type: 'scale',
        value: config.get('scale')
    });
    //Send wild pokemons toggle
    webview.postMessage({
        type: 'wild_pokemons',
        value: config.get('wild')
    });
    //Send money
    webview.postMessage({
        type: 'money',
        value: save.money
    });
    //Load pets
    for (const pet of save.pets.slice(0, MAX_SUMMONED_POKEMONS)) {
        loadPet(pet);
    }
    //Load decor
    for (const decor of save.decoration) {
        loadDecor(decor);
    }
    //Finish
    webview.postMessage({ type: 'init' });
}
function loadPetsFile() {
    //Get old pets save file path
    const petsPath = path.join(extensionStorageFolder, 'pets.json');
    //Check if old pets file exists
    if (fs.existsSync(petsPath)) {
        //Exists -> Load it
        try {
            //Read file
            save.pets = JSON.parse(fs.readFileSync(petsPath, 'utf8'));
            //Check if pets list is valid
            if (Array.isArray(save.pets)) {
                //Valid -> Delete file
                fs.unlinkSync(petsPath);
            }
            else {
                //Invalid -> Throw error
                throw new Error('Failed to read old pets file');
            }
        }
        catch (e) {
            //Failed -> Reset pets list
            save.pets = new Array();
        }
    }
    else {
        //Does not exist -> Reset pets list
        save.pets = new Array();
    }
}
function loadPet(pet) {
    const form = typeof pet.form === 'string' ? pet.form : pet.specie;
    const sprite = typeof pet.sprite === 'string'
        ? pet.sprite
        : form.toLowerCase().replaceAll(' ', '_');
    const spriteSize = pet.spriteSize === 48 ? 48 : 32;
    //Sends a pet to the webview
    webview.postMessage({
        type: 'spawn_pet',
        name: pet.name,
        specie: pet.specie,
        color: pet.color,
        form: form,
        sprite: sprite,
        spriteSize: spriteSize,
    });
}
function addPet(pet) {
    //Max pets reached
    if (save.pets.length >= MAX_SUMMONED_POKEMONS) {
        return false;
    }
    //Add to list & save json
    save.pets.push(pet);
    saveGame();
    //load pet in webview
    loadPet(pet);
    return true;
}
function removePet(index, saveFile) {
    //Remove from pets
    save.pets.splice(index, 1);
    //Remove from webview
    webview.postMessage({
        type: 'remove_pet',
        index: index,
    });
    //Save pets
    if (saveFile) {
        saveGame();
    }
}
//Decoration
function loadDecor(decor) {
    //Sends a decoration to the webview
    webview.postMessage({
        type: 'spawn_decor',
        x: decor.x,
        y: decor.y,
        category: decor.category,
        name: decor.name,
    });
}
function activate(context) {
    //Extension is active
    console.log('Pokemon Pets is now active 😽');
    //Get extension folder & save file path
    extensionStorageFolder = context.globalStorageUri.path.substring(1);
    savePath = path.join(extensionStorageFolder, 'save.json');
    //Load save file
    loadGame();
    webview = new WebViewProvider(context);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(WebViewProvider.viewType, webview));
    vscode.workspace.onDidChangeConfiguration(event => {
        //Update config
        config = vscode.workspace.getConfiguration('pokemon-pets');
        //Background changed
        if (event.affectsConfiguration("pokemon-pets.background")) {
            webview.postMessage({
                type: 'background',
                value: config.get('background')
            });
        }
        //Scale changed
        if (event.affectsConfiguration("pokemon-pets.scale")) {
            webview.postMessage({
                type: 'scale',
                value: config.get('scale')
            });
        }
        //Wild pokemons toggle changed
        if (event.affectsConfiguration("pokemon-pets.wild")) {
            webview.postMessage({
                type: 'wild_pokemons',
                value: config.get('wild')
            });
        }
    });
    //Commands have to be defined in package.json in order to be added here
    //Add pet
    const commandAddPet = vscode.commands.registerCommand('pokemon-pets.addPet', async () => {
        //Check max pets before opening selectors
        if (save.pets.length >= MAX_SUMMONED_POKEMONS) {
            vscode.window.showWarningMessage(`You can only summon up to ${MAX_SUMMONED_POKEMONS} Pokémon at once. Remove one first.`);
            return;
        }
        // Ask for a generation
        const generation = await vscode.window.showQuickPick(Object.keys(game_data_1.Pokemons), {
            title: 'Select a Pokémon generation',
            placeHolder: 'Generation',
        });
        if (generation === undefined) {
            return;
        }
        // Ask for a Pokémon
        const pokemonItems = game_data_1.Pokemons[generation].map((poke, idx) => {
            return new models_1.PetItem(idx, poke.name, `${poke.forms.length} forms`);
        });
        const selectedPokemon = await vscode.window.showQuickPick(pokemonItems, {
            title: 'Select a Pokémon',
            placeHolder: 'Pokémon',
        });
        if (selectedPokemon === undefined) {
            return;
        }
        const pokemonData = game_data_1.Pokemons[generation][selectedPokemon.index];
        // Ask for a form/evolution
        const formItems = pokemonData.forms.map((form, idx) => {
            return new models_1.PetItem(idx, form.name, '');
        });
        const selectedForm = await vscode.window.showQuickPick(formItems, {
            title: `Select a form for ${pokemonData.name}`,
            placeHolder: 'Form',
        });
        if (selectedForm === undefined) {
            return;
        }
        const formData = pokemonData.forms[selectedForm.index];
        // Ask for a name (default to selected form)
        const tmpname = formData.name;
        const name = await vscode.window.showInputBox({
            title: 'Choose a name for your Pokémon',
            placeHolder: 'Name',
            value: tmpname,
            valueSelection: [0, tmpname.length],
            validateInput: text => {
                return text === '' ? 'Please input a name for your Pokémon' : null;
            }
        });
        if (name === undefined) {
            return;
        }
        // Add Pokémon as pet
        const added = addPet({
            specie: pokemonData.name,
            name: name,
            color: generation,
            form: formData.name,
            sprite: formData.sprite,
            spriteSize: formData.spriteSize,
        });
        if (!added) {
            vscode.window.showWarningMessage(`You can only summon up to ${MAX_SUMMONED_POKEMONS} Pokémon at once. Remove one first.`);
            return;
        }
        // New Pokémon!
        vscode.window.showInformationMessage(`Say hi to ${name} the ${formData.name}!`);
    });
    //Remove pet
    const commandRemovePet = vscode.commands.registerCommand('pokemon-pets.removePet', async () => {
        //Get pet names
        let items = Array();
        for (let i = 0; i < save.pets.length; i++) {
            const pet = save.pets[i];
            items.push(new models_1.PetItem(i, pet.name, `${pet.color} ${pet.form ?? pet.specie}`));
        }
        //Ask for pet
        const pet = await vscode.window.showQuickPick(items, {
            title: 'Select a pet to remove',
            placeHolder: 'Pet',
            matchOnDescription: true,
        });
        if (pet === undefined) {
            return;
        }
        //Remove pet
        removePet(pet.index, true);
        //Bye pet!
        vscode.window.showInformationMessage('Bye ' + pet.label + '!');
    });
    //Actions
    const commandAction = vscode.commands.registerCommand('pokemon-pets.actions', async () => {
        webview.postMessage({ type: 'actions' });
    });
    //Open settings
    const commandSettings = vscode.commands.registerCommand('pokemon-pets.settings', async () => {
        vscode.commands.executeCommand('workbench.action.openSettings', '@ext:Anasfiguigui.pokemon-pets');
    });
    //Open save file
    const commandOpenSaveFile = vscode.commands.registerCommand('pokemon-pets.openSaveFile', async () => {
        const uri = vscode.Uri.file(savePath);
        await vscode.commands.executeCommand('vscode.openFolder', uri);
    });
    //Reload save file
    const commandReloadSaveFile = vscode.commands.registerCommand('pokemon-pets.reloadSaveFile', async () => {
        //Reset extension
        webview.postMessage({ type: 'reset' });
        //Reload save file
        loadGame();
        //Init game again
        initGame();
    });
    //Add commands
    context.subscriptions.push(commandAddPet, commandRemovePet, commandAction, commandSettings, commandOpenSaveFile, commandReloadSaveFile);
}
function deactivate() {
    console.log('Pokemon Pets is now deactivated 😿');
}
class WebViewProvider {
    context;
    static viewType = 'pokemon-pets';
    view;
    constructor(context) {
        this.context = context;
    }
    postMessage(message) {
        this.view?.webview.postMessage(message);
    }
    async resolveWebviewView(webviewView, _context, _token) {
        //Needed so we can use it in postMessageToWebview
        this.view = webviewView;
        //Get webview
        const webview = webviewView.webview;
        //Allow scripts in the webview
        webview.options = {
            enableScripts: true
        };
        //Set the HTML content for the webview
        webview.html = await this.getHtmlContent(webviewView.webview);
        //Handle messages
        webview.onDidReceiveMessage(message => {
            switch (message.type.toLowerCase()) {
                //Error message
                case 'error':
                    vscode.window.showErrorMessage(message.text);
                    break;
                //Info message
                case 'info':
                    vscode.window.showInformationMessage(message.text);
                    break;
                //Init pets
                case 'init':
                    initGame();
                    break;
                //Update money
                case 'money':
                    save.money = message.value;
                    saveGame();
                    break;
                //Spawn wild pokemon
                case 'spawn_wild_pokemon':
                    {
                        //Get specie
                        const specie = game_data_1.WildPokemonSpecies[Math.floor(Math.random() * game_data_1.WildPokemonSpecies.length)];
                        //Spawn wild pokemon
                        this.postMessage({
                            type: 'spawn_wild_pokemon',
                            specie: specie,
                        });
                        break;
                    }
                //Decoration
                case 'move_decor': {
                    //Get decoration
                    const index = message.index;
                    const decoration = save.decoration[index];
                    //Update position
                    decoration.x = message.x;
                    decoration.y = message.y;
                    //Save game
                    saveGame();
                    break;
                }
                case 'add_decor': {
                    //Create decoration
                    const decoration = {
                        x: message.x,
                        y: message.y,
                        category: message.category,
                        name: message.name
                    };
                    //Add decoration to list
                    save.decoration.push(decoration);
                    //Save game
                    saveGame();
                    break;
                }
                case 'remove_decor': {
                    //Get decoration
                    const index = message.index;
                    save.decoration.splice(index, 1);
                    //Save game
                    saveGame();
                    break;
                }
            }
        });
    }
    async getHtmlContent(webview) {
        //Read HTML file
        const htmlPath = vscode.Uri.joinPath(this.context.extensionUri, 'media', 'main.html');
        const fileData = await vscode.workspace.fs.readFile(htmlPath);
        const htmlContent = new TextDecoder().decode(fileData);
        //Replace media folder URI placeholder with path
        return htmlContent.replaceAll('{media}', `${webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media'))}/`);
    }
}
exports.WebViewProvider = WebViewProvider;
//# sourceMappingURL=extension.js.map