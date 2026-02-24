import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';


//Extension
let config = vscode.workspace.getConfiguration('pokemon-pets');
let webview: WebViewProvider;
let extensionStorageFolder: string = '';


//Enums
const MonsterSpecies: { [key: string]: string[] } = {
    Slime:      ['Iron', 'Tiger'],
}


// Pokemons object: generations 1–8, each with Pokémon, number of evolutions, and evolution chains
const Pokemons: {
    [generation: string]: Array<{
        name: string;
        numEvolutions: number;
        evolutions: string[];
    }>;
} = {
    '1': [
        { name: 'Bulbasaur', numEvolutions: 4, evolutions: ['Bulbasaur', 'Ivysaur', 'Venusaur'] },
        { name: 'Charmander', numEvolutions: 2, evolutions: ['Charmander', 'Charmeleon', 'Charizard'] },
        // { name: 'Squirtle', numEvolutions: 2, evolutions: ['Squirtle', 'Wartortle', 'Blastoise'] },
        // { name: 'Pikachu', numEvolutions: 1, evolutions: ['Pichu', 'Pikachu', 'Raichu'] },
        // { name: 'Eevee', numEvolutions: 3, evolutions: ['Eevee', 'Vaporeon', 'Jolteon', 'Flareon'] },
        // ...add more Gen 1 Pokémon as needed
    ],
    // '2': [
    //     { name: 'Chikorita', numEvolutions: 2, evolutions: ['Chikorita', 'Bayleef', 'Meganium'] },
    //     { name: 'Cyndaquil', numEvolutions: 2, evolutions: ['Cyndaquil', 'Quilava', 'Typhlosion'] },
    //     { name: 'Totodile', numEvolutions: 2, evolutions: ['Totodile', 'Croconaw', 'Feraligatr'] },
    //     // ...add more Gen 2 Pokémon as needed
    // ],
    // '3': [
    //     { name: 'Treecko', numEvolutions: 2, evolutions: ['Treecko', 'Grovyle', 'Sceptile'] },
    //     { name: 'Torchic', numEvolutions: 2, evolutions: ['Torchic', 'Combusken', 'Blaziken'] },
    //     { name: 'Mudkip', numEvolutions: 2, evolutions: ['Mudkip', 'Marshtomp', 'Swampert'] },
    //     // ...add more Gen 3 Pokémon as needed
    // ],
    // '4': [
    //     { name: 'Turtwig', numEvolutions: 2, evolutions: ['Turtwig', 'Grotle', 'Torterra'] },
    //     { name: 'Chimchar', numEvolutions: 2, evolutions: ['Chimchar', 'Monferno', 'Infernape'] },
    //     { name: 'Piplup', numEvolutions: 2, evolutions: ['Piplup', 'Prinplup', 'Empoleon'] },
    //     // ...add more Gen 4 Pokémon as needed
    // ],
    // '5': [
    //     { name: 'Snivy', numEvolutions: 2, evolutions: ['Snivy', 'Servine', 'Serperior'] },
    //     { name: 'Tepig', numEvolutions: 2, evolutions: ['Tepig', 'Pignite', 'Emboar'] },
    //     { name: 'Oshawott', numEvolutions: 2, evolutions: ['Oshawott', 'Dewott', 'Samurott'] },
    //     // ...add more Gen 5 Pokémon as needed
    // ],
    // '6': [
    //     { name: 'Chespin', numEvolutions: 2, evolutions: ['Chespin', 'Quilladin', 'Chesnaught'] },
    //     { name: 'Fennekin', numEvolutions: 2, evolutions: ['Fennekin', 'Braixen', 'Delphox'] },
    //     { name: 'Froakie', numEvolutions: 2, evolutions: ['Froakie', 'Frogadier', 'Greninja'] },
    //     // ...add more Gen 6 Pokémon as needed
    // ],
    // '7': [
    //     { name: 'Rowlet', numEvolutions: 2, evolutions: ['Rowlet', 'Dartrix', 'Decidueye'] },
    //     { name: 'Litten', numEvolutions: 2, evolutions: ['Litten', 'Torracat', 'Incineroar'] },
    //     { name: 'Popplio', numEvolutions: 2, evolutions: ['Popplio', 'Brionne', 'Primarina'] },
    //     // ...add more Gen 7 Pokémon as needed
    // ],
    // '8': [
    //     { name: 'Grookey', numEvolutions: 2, evolutions: ['Grookey', 'Thwackey', 'Rillaboom'] },
    //     { name: 'Scorbunny', numEvolutions: 2, evolutions: ['Scorbunny', 'Raboot', 'Cinderace'] },
    //     { name: 'Sobble', numEvolutions: 2, evolutions: ['Sobble', 'Drizzile', 'Inteleon'] },
        // ...add more Gen 8 Pokémon as needed
    // ],
};

const Names: string[] = [
    'Alex',     'Laura',
    'Raúl',     'Ángela',
    'Aitor',    'Chao',
    'Álvaro',   'Victor',
    'Rodri',    'Adri',
    'Oliva',    'Pablo',
    'Sara',     'Mar',
    'David',    'Unai',
    'Nadia',    'Miriam',
    'Irene',    'Diana',
    'Aitana',   'Lucia',
]


//Save
type Pet = {
    name: string;
    specie: string;
    color: string;
}

type Decoration = {
    x: 0,
    y: 0,
    category: string;
    name: string;
}

class Save {

    public money: number = 0;
    public pets: Array<Pet> = new Array<Pet>();
    public decoration: Array<Decoration> = new Array<Decoration>();

}

let savePath: string;
let save = new Save();

function loadGame() {
    //Storage folder does not exist -> Create it
    if (!fs.existsSync(extensionStorageFolder)) fs.mkdirSync(extensionStorageFolder, { recursive: true });

    //Bool to check if the save was updated to save its file after load
    let saveUpdated: boolean = false;

    //Check if save file exists
    if (fs.existsSync(savePath)) {
        //Exists -> Load save
        try {
            //Read save
            save = JSON.parse(fs.readFileSync(savePath, 'utf8'));
        } catch (e) {
            //Failed -> Reset save
            save = new Save();

            //Load old pets file if it exists
            loadPetsFile();

            //Save updated
            saveUpdated = true;
        }
    } else {
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
        save.pets = new Array<Pet>();

        //Save updated
        saveUpdated = true;
    }

    //Invalid decoration list
    if (!Array.isArray(save.decoration)) {
        //Reset decoration list
        save.decoration = new Array<Decoration>();

        //Save updated
        saveUpdated = true;
    }

    //Save game file
    if (saveUpdated) saveGame();
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

    //Send monsters toggle
    webview.postMessage({
        type: 'monsters',
        value: config.get('monsters')
    });

    //Send money
    webview.postMessage({
        type: 'money',
        value: save.money
    });

    //Load pets
    for (const pet of save.pets) loadPet(pet);

    //Load decor
    for (const decor of save.decoration) loadDecor(decor);

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
            } else {
                //Invalid -> Throw error
                throw new Error('Failed to read old pets file');
            }
        } catch (e) {
            //Failed -> Reset pets list
            save.pets = new Array<Pet>();
        }
    } else {
        //Does not exist -> Reset pets list
        save.pets = new Array<Pet>();
    }
}

//Pets
class PetItem implements vscode.QuickPickItem {

    public index: number;
    public label: string;
    public description: string;

    constructor(index: number, name: string, description: string) {
        this.index = index;
        this.label = name;
        this.description = description;
    }

}

function loadPet(pet: Pet) {
    //Sends a pet to the webview
    webview.postMessage({
        type: 'spawn_pet',
        name: pet.name,
        specie: pet.specie,
        color: pet.color,
    });
}

function addPet(pet: Pet) {
    //Add to list & save json
    save.pets.push(pet);
    saveGame();

    //load pet in webview
    loadPet(pet);
}

function removePet(index: number, saveFile: boolean) {
    //Remove from pets
    save.pets.splice(index, 1);

    //Remove from webview
    webview.postMessage({
        type: 'remove_pet',
        index: index,
    });

    //Save pets
    if (saveFile) saveGame();
}

//Decoration
function loadDecor(decor: Decoration) {
    //Sends a decoration to the webview
    webview.postMessage({
        type: 'spawn_decor',
        x: decor.x,
        y: decor.y,
        category: decor.category,
        name: decor.name,
    });
}


  /*$$$$$              /$$     /$$                       /$$
 /$$__  $$            | $$    |__/                      | $$
| $$  \ $$  /$$$$$$$ /$$$$$$   /$$ /$$    /$$ /$$$$$$  /$$$$$$    /$$$$$$
| $$$$$$$$ /$$_____/|_  $$_/  | $$|  $$  /$$/|____  $$|_  $$_/   /$$__  $$
| $$__  $$| $$        | $$    | $$ \  $$/$$/  /$$$$$$$  | $$    | $$$$$$$$
| $$  | $$| $$        | $$ /$$| $$  \  $$$/  /$$__  $$  | $$ /$$| $$_____/
| $$  | $$|  $$$$$$$  |  $$$$/| $$   \  $/  |  $$$$$$$  |  $$$$/|  $$$$$$$
|__/  |__/ \_______/   \___/  |__/    \_/    \_______/   \___/   \______*/

export function activate(context: vscode.ExtensionContext) {

      /*$$$$$   /$$                           /$$
     /$$__  $$ | $$                          | $$
    | $$  \__//$$$$$$    /$$$$$$   /$$$$$$  /$$$$$$
    |  $$$$$$|_  $$_/   |____  $$ /$$__  $$|_  $$_/
     \____  $$ | $$      /$$$$$$$| $$  \__/  | $$
     /$$  \ $$ | $$ /$$ /$$__  $$| $$        | $$ /$$
    |  $$$$$$/ |  $$$$/|  $$$$$$$| $$        |  $$$$/
     \______/   \___/   \_______/|__/         \__*/

    //Extension is active
    console.log('Pokemon Pets is now active 😽');

    //Get extension folder & save file path
    extensionStorageFolder = context.globalStorageUri.path.substring(1);
    savePath = path.join(extensionStorageFolder, 'save.json');

    //Load save file
    loadGame();


     /*$      /$$           /$$       /$$    /$$ /$$
    | $$  /$ | $$          | $$      | $$   | $$|__/
    | $$ /$$$| $$  /$$$$$$ | $$$$$$$ | $$   | $$ /$$  /$$$$$$  /$$  /$$  /$$
    | $$/$$ $$ $$ /$$__  $$| $$__  $$|  $$ / $$/| $$ /$$__  $$| $$ | $$ | $$
    | $$$$_  $$$$| $$$$$$$$| $$  \ $$ \  $$ $$/ | $$| $$$$$$$$| $$ | $$ | $$
    | $$$/ \  $$$| $$_____/| $$  | $$  \  $$$/  | $$| $$_____/| $$ | $$ | $$
    | $$/   \  $$|  $$$$$$$| $$$$$$$/   \  $/   | $$|  $$$$$$$|  $$$$$/$$$$/
    |__/     \__/ \_______/|_______/     \_/    |__/ \_______/ \_____/\__*/

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
            })
        }

        //Scale changed
        if (event.affectsConfiguration("pokemon-pets.scale")) {
            webview.postMessage({
                type: 'scale',
                value: config.get('scale')
            })
        }

        //Monsters toggle changed
        if (event.affectsConfiguration("pokemon-pets.monsters")) {
            webview.postMessage({
                type: 'monsters',
                value: config.get('monsters')
            })
        }
    })


      /*$$$$$                                                                  /$$
     /$$__  $$                                                                | $$
    | $$  \__/  /$$$$$$  /$$$$$$/$$$$  /$$$$$$/$$$$   /$$$$$$  /$$$$$$$   /$$$$$$$  /$$$$$$$
    | $$       /$$__  $$| $$_  $$_  $$| $$_  $$_  $$ |____  $$| $$__  $$ /$$__  $$ /$$_____/
    | $$      | $$  \ $$| $$ \ $$ \ $$| $$ \ $$ \ $$  /$$$$$$$| $$  \ $$| $$  | $$|  $$$$$$
    | $$    $$| $$  | $$| $$ | $$ | $$| $$ | $$ | $$ /$$__  $$| $$  | $$| $$  | $$ \____  $$
    |  $$$$$$/|  $$$$$$/| $$ | $$ | $$| $$ | $$ | $$|  $$$$$$$| $$  | $$|  $$$$$$$ /$$$$$$$/
     \______/  \______/ |__/ |__/ |__/|__/ |__/ |__/ \_______/|__/  |__/ \_______/|______*/

    //Commands have to be defined in package.json in order to be added here

    //Add pet
    const commandAddPet = vscode.commands.registerCommand('pokemon-pets.addPet', async () => {

        // Ask for a generation
        const generation = await vscode.window.showQuickPick(Object.keys(Pokemons), {
            title: 'Select a Pokémon generation',
            placeHolder: 'Generation',
        });
        if (generation == null) return;

        // Ask for a Pokémon
        let pokemonItems = Pokemons[generation].map((poke, idx) => {
            return new PetItem(idx, poke.name, `${poke.numEvolutions} evolutions`);
        });
        const selectedPokemon = await vscode.window.showQuickPick(pokemonItems, {
            title: 'Select a Pokémon',
            placeHolder: 'Pokémon',
        });
        if (selectedPokemon == null) return;
        const pokemonData = Pokemons[generation][selectedPokemon.index];

        // Ask for a name (default to species name)
        const tmpname = pokemonData.name;
        const name = await vscode.window.showInputBox({
            title: 'Choose a name for your Pokémon',
            placeHolder: 'Name',
            value: tmpname,
            valueSelection: [0, tmpname.length],
            validateInput: text => {
                return text === '' ? 'Please input a name for your Pokémon' : null;
            }
        });
        if (name == null) return;

        // Add Pokémon as pet
        addPet({
            specie: pokemonData.name,
            name: name,
            color: generation,
        });

        // New Pokémon!
        vscode.window.showInformationMessage(`Say hi to ${name} the ${pokemonData.name}!`);
    });

    //Remove pet
    const commandRemovePet = vscode.commands.registerCommand('pokemon-pets.removePet', async () => {
        //Get pet names
        let items = Array<PetItem>();
        for (let i = 0; i < save.pets.length; i++) {
            const pet = save.pets[i];
            items.push(new PetItem(i, pet.name, pet.color + ' ' + pet.specie));
        }

        //Ask for pet
        const pet = await vscode.window.showQuickPick(items, {
            title: 'Select a pet to remove',
            placeHolder: 'Pet',
            matchOnDescription: true,
        });
        if (pet == null) return;

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
        const success = await vscode.commands.executeCommand('vscode.openFolder', uri);
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


 /*$$$$$$                                  /$$     /$$                       /$$              
| $$__  $$                                | $$    |__/                      | $$              
| $$  \ $$  /$$$$$$   /$$$$$$   /$$$$$$$ /$$$$$$   /$$ /$$    /$$ /$$$$$$  /$$$$$$    /$$$$$$ 
| $$  | $$ /$$__  $$ |____  $$ /$$_____/|_  $$_/  | $$|  $$  /$$/|____  $$|_  $$_/   /$$__  $$
| $$  | $$| $$$$$$$$  /$$$$$$$| $$        | $$    | $$ \  $$/$$/  /$$$$$$$  | $$    | $$$$$$$$
| $$  | $$| $$_____/ /$$__  $$| $$        | $$ /$$| $$  \  $$$/  /$$__  $$  | $$ /$$| $$_____/
| $$$$$$$/|  $$$$$$$|  $$$$$$$|  $$$$$$$  |  $$$$/| $$   \  $/  |  $$$$$$$  |  $$$$/|  $$$$$$$
|_______/  \_______/ \_______/ \_______/   \___/  |__/    \_/    \_______/   \___/   \______*/

export function deactivate() {
    console.log('Pokemon Pets is now deactivated 😿')
}


 /*$      /$$           /$$       /$$    /$$ /$$                        
| $$  /$ | $$          | $$      | $$   | $$|__/                        
| $$ /$$$| $$  /$$$$$$ | $$$$$$$ | $$   | $$ /$$  /$$$$$$  /$$  /$$  /$$
| $$/$$ $$ $$ /$$__  $$| $$__  $$|  $$ / $$/| $$ /$$__  $$| $$ | $$ | $$
| $$$$_  $$$$| $$$$$$$$| $$  \ $$ \  $$ $$/ | $$| $$$$$$$$| $$ | $$ | $$
| $$$/ \  $$$| $$_____/| $$  | $$  \  $$$/  | $$| $$_____/| $$ | $$ | $$
| $$/   \  $$|  $$$$$$$| $$$$$$$/   \  $/   | $$|  $$$$$$$|  $$$$$/$$$$/
|__/     \__/ \_______/|_______/     \_/    |__/ \_______/ \_____/\__*/

export class WebViewProvider implements vscode.WebviewViewProvider {

    public static readonly viewType = 'pokemon-pets';

    private view?: vscode.WebviewView;

    constructor(private readonly context: vscode.ExtensionContext) { }

    public postMessage(message: any) {
        this.view?.webview.postMessage(message);
    }

    public async resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken) {
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

                //Spawn monster
                case 'spawn_monster': {
                    //Get specie
                    const species = Object.keys(MonsterSpecies);
                    const specie = species[Math.floor(Math.random() * species.length)];

                    //Get color
                    const colors = MonsterSpecies[specie]
                    const color =  colors[Math.floor(Math.random() * colors.length)];

                    //Spawn monster
                    this.postMessage({
                        type: 'spawn_monster',
                        specie: specie,
                        color: color,
                    })
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
                    const decoration: Decoration = {
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

    private async getHtmlContent(webview: vscode.Webview): Promise<string> {
        //Read HTML file
        const htmlPath = vscode.Uri.joinPath(this.context.extensionUri, 'media', 'main.html');
        const fileData = await vscode.workspace.fs.readFile(htmlPath);
        const htmlContent = new TextDecoder().decode(fileData);

        //Replace media folder URI placeholder with path
        return htmlContent.replaceAll('{media}', `${webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media'))}/`)
    }

}
