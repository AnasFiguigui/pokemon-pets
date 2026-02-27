//VSCode API
const vscode = acquireVsCodeApi()


 /*$$$$$$$                              /$$     /$$
| $$_____/                             | $$    |__/
| $$    /$$   /$$ /$$$$$$$   /$$$$$$$ /$$$$$$   /$$  /$$$$$$  /$$$$$$$   /$$$$$$$
| $$$$$| $$  | $$| $$__  $$ /$$_____/|_  $$_/  | $$ /$$__  $$| $$__  $$ /$$_____/
| $$__/| $$  | $$| $$  \ $$| $$        | $$    | $$| $$  \ $$| $$  \ $$|  $$$$$$
| $$   | $$  | $$| $$  | $$| $$        | $$ /$$| $$| $$  | $$| $$  | $$ \____  $$
| $$   |  $$$$$$/| $$  | $$|  $$$$$$$  |  $$$$/| $$|  $$$$$$/| $$  | $$ /$$$$$$$/
|__/    \______/ |__/  |__/ \_______/   \___/  |__/ \______/ |__/  |__/|______*/

//Actions menu
function toggleActionBall() {
    //Close actions menu & decor mode UI
    Menus.close();

    //Ball is visible -> Remove it
    if (Game.ball.active) Game.ball.onReached();
    
    //Toggle ball action
    Game.setAction(Game.isAction(Action.BALL) ? Action.NONE : Action.BALL);
}

function toggleActionCandy() {
    //Close actions menu
    Menus.close();

    //Toggle candy action
    Game.setAction(Game.isAction(Action.CANDY) ? Action.NONE : Action.CANDY);
}

function toggleActionDecor() {
    //Close actions menu
    Menus.close(); 
    
    //Toggle decor mode
    DecorMode.toggle();
}

//Store menu
function createStoreItem(name, price) {
    //Item element
    const element = document.createElement('div');
    element.classList.add('menuButton', 'storeButton');

    //Name text element
    const text = document.createElement('span');
    text.innerText = Util.titleCase(name.toLowerCase().replaceAll('_', ' '));
    element.append(text);

    //Add price to text
    if (typeof price === 'number') text.innerHTML += `<br><span class="storeButtonMoney" ${price > Game.money ? 'expensive' : ''}>${price}G</span>`;

    //Return element
    return element;
}

function openStoreMenu() {
    //Empty list
    const content = document.getElementById('storeContent');
    content.innerHTML = '';

    //Add back button
    const back = createStoreItem('> Back');
    back.onclick = () => Menus.toggle('actions', true);
    content.appendChild(back);

    //Create decoration categories
    for (const category of Object.keys(DecorationPreset)) {
        //Create item element
        const element = createStoreItem(category);
        element.onclick = () => openStoreCategoryMenu(category);
        content.appendChild(element);
    }

    //Scroll to top
    content.scrollTop = 0;
    setTimeout(() => { content.scrollTop = 0; }, 0); //Scroll on a timer to wait until elements are rendered
    
    //Show store menu
    Menus.toggle('store', true);
}

function openStoreCategoryMenu(category) {
    //Empty list
    const content = document.getElementById('storeContent');
    content.innerHTML = '';

    //Add back button
    const back = createStoreItem('> Back');
    back.onclick = openStoreMenu;
    content.appendChild(back);

    //Create category items
    for (const name of Object.keys(DecorationPreset[category])) {
        //Get decoration preset
        const preset = DecorationPreset[category][name];

        //Create item element
        const element = createStoreItem(preset.name, preset.price);
        content.appendChild(element);
        
        //Add image to element
        const imgBox = document.createElement('div');
        const img = document.createElement('div');
        img.style.setProperty('--image', `url('./sprites/decoration.png')`)
        img.style.setProperty('--width', `${preset.size.x}px`)
        img.style.setProperty('--height', `${preset.size.y}px`)
        img.style.setProperty('--scale', `${50 / Math.max(preset.size.x, preset.size.y)}`)
        img.style.setProperty('--spriteOffset', `${-preset.spriteOffset.x}px ${-preset.spriteOffset.y}px`)
        imgBox.prepend(img);
        element.prepend(imgBox);

        //Add buy function
        element.onclick = () => {
            //Check if decoration price is valid
            if (typeof preset.price !== 'number') return;

            //Check if player has enough money
            if (Game.money < preset.price) return;

            //Consume money
            Game.addMoney(-preset.price);

            //Close actions menu
            Menus.close();

            //Create decoration
            const decor = new Decoration(preset);

            //Enter decor mode (after creating decoration, else it will ask the user to buy one)
            DecorMode.toggle(true);

            //Center decoration with mouse & start dragging it
            const decorCenterRelativePos = decor.size.mult(0.5);
            decor.moveTo(decor.snapPos(Cursor.posScaled.sub(decorCenterRelativePos)));
            decor.startDragging(decorCenterRelativePos);

            //Notify decor added
            vscode.postMessage({
                type: 'add_decor',
                x: decor.pos.x,
                y: decor.pos.y,
                category: category,
                name: name
            });
        }
    }

    //Scroll to top
    content.scrollTop = 0;
    setTimeout(() => { content.scrollTop = 0; }, 0); //Scroll on a timer to wait until elements are rendered
}


 /*$       /$$             /$$
| $$      |__/            | $$
| $$       /$$  /$$$$$$$ /$$$$$$    /$$$$$$  /$$$$$$$   /$$$$$$   /$$$$$$   /$$$$$$$
| $$      | $$ /$$_____/|_  $$_/   /$$__  $$| $$__  $$ /$$__  $$ /$$__  $$ /$$_____/
| $$      | $$|  $$$$$$   | $$    | $$$$$$$$| $$  \ $$| $$$$$$$$| $$  \__/|  $$$$$$
| $$      | $$ \____  $$  | $$ /$$| $$_____/| $$  | $$| $$_____/| $$       \____  $$
| $$$$$$$$| $$ /$$$$$$$/  |  $$$$/|  $$$$$$$| $$  | $$|  $$$$$$$| $$       /$$$$$$$/
|________/|__/|_______/    \___/   \_______/|__/  |__/ \_______/|__/      |______*/

//Messages from VSCode
window.addEventListener('message', event => {
    //The JSON data sent by the extension
    const message = event.data;

    //Check message type
    switch (message.type.toLowerCase()) {
        //
        // Game
        //

        //Init game
        case 'init':
            document.body.removeAttribute('hide');
            break;
    
        //Reset game
        case 'reset':
            //Remove pets
            for (const pet of Game.pets) Game.objects.removeItem(pet);
            Game.pets = [];

            //Remove decor
            for (const decor of Game.decoration) Game.objects.removeItem(decor);
            Game.decoration = [];

            //Close menus & exit decor mode
            Menus.close();
            DecorMode.toggle(false);
            break;

        //Init money
        case 'money': 
            Game.setMoney(message.value);
            break;

        //
        // Settings
        //

        //Update background
        case 'background':
            Game.background.setAttribute('background', message.value.toLowerCase());
            break;

        //Update scale
        case 'scale':
            switch (message.value.toLowerCase()) {
                case 'small':
                    Game.setScale(1);
                    break;
                case 'big':
                    Game.setScale(3);
                    break;
                case 'medium':
                default:
                    Game.setScale(2);
                    break;
            }
            document.body.style.setProperty('--scale', Game.scale);
            break;
    
        //Update monsters toggle
        case 'monsters':
            //Clear monsters
            for (const monster of Game.monsters) monster.remove();
            
            //Toggle spawner
            if (message.value) {
                //Toggle on
                Game.monsterSpawner.wait(10 * 1000); // Increased spawn rate (was 30s)
            } else {
                //Toggle off
                Game.monsterSpawner.stop();
            }
            break;

        //
        // Game objects
        //

        //Spawn a pet/decor/monster
        case 'spawn_pet': {
            const name = message.name;
            const specie = message.specie.toLowerCase();
            // Evolution and level from message or default
            let evolution = 0;
            let level = 0;
            if (typeof message.evolution === 'number') evolution = message.evolution;
            if (typeof message.level === 'number') level = message.level;

            // Spawn Pokémon based on evolution
            let poke;
            switch (evolution) {
                case 0:
                    poke = new Pokemon(name, specie, 0, level);
                    break;
                case 1:
                    poke = new Pokemon(name, specie, 1, level);
                    break;
                case 2:
                    poke = new Pokemon(name, specie, 2, level);
                    break;
                case 3:
                    poke = new Pokemon(name, specie, 3, level);
                    break;
                default:
                    poke = new Pokemon(name, specie, 0, level);
                    break;
            }
            break;
        }
        
        case 'spawn_decor': {
            const pos = new Vec2(message.x, message.y)
            const category = message.category.toUpperCase().replaceAll(' ', '_');
            const name = message.name.toUpperCase().replaceAll(' ', '_');
            new Decoration(DecorationPreset[category][name], { pos: pos });
            break;
        }
        
        case 'spawn_monster': {
            const specie = message.specie.toLowerCase();
            const color = message.color.toLowerCase();
            switch (specie) {
                case 'slime':
                    new Slime(color);
                    break;
            }
            break;
        }

        //Remove a pet
        case 'remove_pet':
            Game.pets[message.index].remove();
            break;

        //
        // Menus
        //

        //Toggle actions menu
        case 'actions':
            //Stop ball/candy action
            if (Game.isAction(Action.BALL) || Game.isAction(Action.CANDY)) Game.setAction(Action.NONE);

            //Show actions menu
            Menus.toggle('actions');

            //Scroll to the top
            document.getElementById('actionsContent').scrollTop = 0;
            break;
    }
})

//Cursor events
document.body.onmousedown = event => {
    //Menu open -> Ignore click
    if (Menus.current) return;

    //Get scaled mouse position
    const pos = Cursor.posScaled;

    //Perform action
    switch (Game.action) {
        //Decor mode
        case Action.DECOR: {
            //Sort objects
            Game.sortObjects();

            //Check to drag decoration from nearest to farthest object
            for (let i = Game.objects.length - 1; i >= 0; i--) {
                //Get object
                const obj = Game.objects[i];

                //Check if its decoration
                if (!obj.isDecoration) continue;

                //Check event
                if (obj.checkMouseDown(pos)) break;
            }
            break;
        }
    }
}

document.body.onmouseup = event => {
    //Menu open -> Ignore click
    if (Menus.current) return;

    //Get scaled mouse position
    const pos = Cursor.posScaled;

    //Perform action
    switch (Game.action) {
        //Decor mode
        case Action.DECOR: {
            //Check decor action
            switch (DecorMode.action) {
                //Move
                case DecorMode.ACTION_MOVE:
                    //Stop moving all
                    for (const decoration of Game.decoration) decoration.stopDragging();
                    break;

                //Sell
                case DecorMode.ACTION_SELL:
                    //Sort objects
                    Game.sortObjects();

                    //Check to click decoration from nearest to farthest object
                    for (let i = Game.objects.length - 1; i >= 0; i--) {
                        //Get object
                        const obj = Game.objects[i];

                        //Check if its decoration
                        if (!obj.isDecoration) continue;

                        //Check event
                        if (obj.checkMouseUp(pos)) break;
                    }
                    break;
            }
            break;
        }

        //Place ball
        case Action.BALL: {
            //Move ball
            Game.ball.moveTo(pos.sub(Game.ball.size.mult(0.5, 1).toInt()));
            Game.ball.setActive(true);

            //Move all pokemons towards ball
            for (const pokemon of Game.pets) {
                if (pokemon.ai && typeof pokemon.ai.moveTowards === 'function') {
                    pokemon.ai.moveTowards(pos, true);
                }
            }

            //Clear current action
            Game.setAction(Action.NONE);
            break;
        }

        //Other
        default:
            //Sort objects
            Game.sortObjects();

            //Check for clicks from nearest to farthest object
            for (let i = Game.objects.length - 1; i >= 0; i--) {
                //Get object
                const obj = Game.objects[i];

                //Check event
                if (obj.checkMouseUp(pos)) break;
            }
            
            //Clear current action
            Game.setAction(Action.NONE);
            break;
    }
}

document.onmousemove = event => {
    //Mouse moved -> Update cursor position
    Cursor.moveTo(new Vec2(event.clientX, event.clientY))
}

document.onmouseenter = event => {
    //Mouse entered screen -> Show cursor
    Cursor.setIcon(Game.action)
}

document.onmouseleave = event => {
    //Mouse left screen -> Hide cursor
    Cursor.setIcon(Action.NONE)
}


 /*$
| $$
| $$        /$$$$$$   /$$$$$$   /$$$$$$
| $$       /$$__  $$ /$$__  $$ /$$__  $$
| $$      | $$  \ $$| $$  \ $$| $$  \ $$
| $$      | $$  | $$| $$  | $$| $$  | $$
| $$$$$$$$|  $$$$$$/|  $$$$$$/| $$$$$$$/
|________/ \______/  \______/ | $$____/
                              | $$
                              | $$
                              |_*/

//Start game loop
Game.start();

//Tell VSCode the game was loaded
vscode.postMessage({ type: 'init' })