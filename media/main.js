//VSCode API
const vscode = acquireVsCodeApi();

//Top bar toggle
let topBarVisible = false;
let topBarTimer = null;

function setTopBarVisible(visible) {
    topBarVisible = visible;
    const topBar = document.getElementById('topBar');
    if (visible) {
        topBar.setAttribute('visible', '');
    } else {
        topBar.removeAttribute('visible');
    }
}

function showTopBarTemporary() {
    //Show top bar
    const topBar = document.getElementById('topBar');
    topBar.setAttribute('visible', '');

    //Clear any existing timer
    if (topBarTimer) { clearTimeout(topBarTimer); }

    //Hide after 3 seconds (only if not toggled on permanently)
    topBarTimer = setTimeout(() => {
        if (!topBarVisible) {
            topBar.removeAttribute('visible');
        }
        topBarTimer = null;
    }, 3000);
}

//Consumable catalog (must match extension's Consumables array)
const ConsumableCatalog = [
    { id: 'candy', name: 'Candy', price: 30, spriteOffset: { x: 0, y: 32 } },
    { id: 'fire_stone', name: 'Fire Stone', price: 100, spriteOffset: { x: 16, y: 32 } },
    { id: 'water_stone', name: 'Water Stone', price: 100, spriteOffset: { x: 32, y: 32 } },
    { id: 'thunder_stone', name: 'Thunder Stone', price: 100, spriteOffset: { x: 48, y: 32 } },
    { id: 'leaf_stone', name: 'Leaf Stone', price: 100, spriteOffset: { x: 64, y: 32 } },
    { id: 'moon_stone', name: 'Moon Stone', price: 120, spriteOffset: { x: 80, y: 32 } },
    { id: 'sun_stone', name: 'Sun Stone', price: 120, spriteOffset: { x: 96, y: 32 } },
    { id: 'dusk_stone', name: 'Dusk Stone', price: 120, spriteOffset: { x: 112, y: 32 } },
    { id: 'shiny_stone', name: 'Shiny Stone', price: 120, spriteOffset: { x: 128, y: 32 } },
    { id: 'ice_stone', name: 'Ice Stone', price: 100, spriteOffset: { x: 144, y: 32 } },
];

//Actions menu
function toggleActionBall() {
    //Close actions menu & decor mode UI
    Menus.close();

    //Ball is visible -> Remove it
    if (Game.ball.active) { Game.ball.onReached(); }
    
    //Toggle ball action
    Game.setAction(Game.isAction(Action.BALL) ? Action.NONE : Action.BALL);
}

function selectConsumable(id) {
    //Check if player has this item
    if (Game.getItemCount(id) <= 0) {
        Game.showMessage('None left!');
        return;
    }

    //Close menus
    Menus.close();

    //Set selected consumable and toggle candy action
    Game.setSelectedConsumable(id);
    Game.setAction(Action.CANDY);
}

function openBackpack() {
    //Get content container
    const content = document.getElementById('backpackContent');
    content.innerHTML = '';

    //Get owned items
    const inv = Game.inventory;
    const ownedIds = Object.keys(inv).filter(id => inv[id] > 0);

    if (ownedIds.length === 0) {
        //Empty backpack
        const empty = document.createElement('span');
        empty.classList.add('menuButton');
        empty.innerText = 'Empty';
        empty.style.textAlign = 'center';
        empty.style.cursor = 'default';
        content.appendChild(empty);
    } else {
        //List owned consumables
        for (const id of ownedIds) {
            const info = ConsumableCatalog.find(c => c.id === id);
            const name = info ? info.name : Util.titleCase(id.replaceAll('_', ' '));
            const count = inv[id];

            const element = document.createElement('button');
            element.type = 'button';
            element.classList.add('menuButton', 'storeButton');

            //Add consumable icon
            if (info) {
                const imgBox = document.createElement('div');
                const img = document.createElement('div');
                img.style.setProperty('--image', `url('./sprites/decoration.png')`);
                img.style.setProperty('--width', '16px');
                img.style.setProperty('--height', '16px');
                img.style.setProperty('--scale', `${50 / 16}`);
                img.style.setProperty('--spriteOffset', `${-info.spriteOffset.x}px ${-info.spriteOffset.y}px`);
                imgBox.prepend(img);
                element.appendChild(imgBox);
            }

            const text = document.createElement('span');
            text.innerText = `${name} x${count}`;
            element.appendChild(text);

            element.onclick = () => selectConsumable(id);
            content.appendChild(element);
        }
    }

    //Show backpack
    content.scrollTop = 0;
    Menus.toggle('backpack', true);
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
    if (typeof price === 'number') { text.innerHTML += `<br><span class="storeButtonMoney" ${price > Game.money ? 'expensive' : ''}>${price}G</span>`; }

    //Return element
    return element;
}

function openStoreMenu() {
    //Empty list
    const content = document.getElementById('storeContent');
    content.innerHTML = '';

    //Top left back button goes to actions menu on root store
    const backButton = document.getElementById('storeBackBtn');
    if (backButton) {
        backButton.innerText = 'Back';
        backButton.onclick = () => Menus.toggle('actions', true);
    }

    //Create consumables category
    const consumablesElement = createStoreItem('Consumables');
    const consumablesIcon = document.createElement('img');
    consumablesIcon.src = `${Game.mediaURI}sprites/ui/candy.png`;
    consumablesIcon.alt = 'Consumables';
    consumablesElement.prepend(consumablesIcon);
    consumablesElement.onclick = () => openStoreConsumablesMenu();
    content.appendChild(consumablesElement);

    //Create decoration categories
    for (const category of Object.keys(DecorationPreset)) {
        //Create item element
        const element = createStoreItem(category);
        const icon = document.createElement('img');
        icon.src = `${Game.mediaURI}sprites/ui/candy.png`;
        icon.alt = category;
        element.prepend(icon);
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

    //Top left back button goes to categories list
    const backButton = document.getElementById('storeBackBtn');
    if (backButton) {
        backButton.innerText = 'Back';
        backButton.onclick = openStoreMenu;
    }

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
        img.style.setProperty('--image', `url('./sprites/decoration.png')`);
        img.style.setProperty('--width', `${preset.size.x}px`);
        img.style.setProperty('--height', `${preset.size.y}px`);
        img.style.setProperty('--scale', `${50 / Math.max(preset.size.x, preset.size.y)}`);
        img.style.setProperty('--spriteOffset', `${-preset.spriteOffset.x}px ${-preset.spriteOffset.y}px`);
        imgBox.prepend(img);
        element.prepend(imgBox);

        //Add buy function
        element.onclick = () => {
            //Check if decoration price is valid
            if (typeof preset.price !== 'number') { return; }

            //Check if player has enough money
            if (Game.money < preset.price) { return; }

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
        };
    }

    //Scroll to top
    content.scrollTop = 0;
    setTimeout(() => { content.scrollTop = 0; }, 0); //Scroll on a timer to wait until elements are rendered
}

function openStoreConsumablesMenu() {
    //Empty list
    const content = document.getElementById('storeContent');
    content.innerHTML = '';

    //Top left back button goes to categories list
    const backButton = document.getElementById('storeBackBtn');
    if (backButton) {
        backButton.innerText = 'Back';
        backButton.onclick = openStoreMenu;
    }

    //Create consumable items from catalog (styled like decoration presets)
    for (const item of ConsumableCatalog) {
        const element = createStoreItem(item.name, item.price);

        //Add sprite image (using decoration sprite sheet temporarily)
        const imgBox = document.createElement('div');
        const img = document.createElement('div');
        img.style.setProperty('--image', `url('./sprites/decoration.png')`);
        img.style.setProperty('--width', '16px');
        img.style.setProperty('--height', '16px');
        img.style.setProperty('--scale', `${50 / 16}`);
        img.style.setProperty('--spriteOffset', `${-item.spriteOffset.x}px ${-item.spriteOffset.y}px`);
        imgBox.prepend(img);
        element.prepend(imgBox);

        //Add buy function
        element.onclick = () => {
            if (Game.money < item.price) { return; }
            vscode.postMessage({ type: 'buy_consumable', consumableId: item.id, quantity: 1 });
        };
        content.appendChild(element);
    }

    //Scroll to top
    content.scrollTop = 0;
    setTimeout(() => { content.scrollTop = 0; }, 0);
}

//Messages from VSCode
function handleGameMessage(message) {
    switch (message.type.toLowerCase()) {
        case 'init':
            document.body.removeAttribute('hide');
            document.body.style.display = '';
            break;
        case 'reset':
            for (const pet of Game.pets) { Game.objects.removeItem(pet); }
            Game.pets = [];
            for (const decor of Game.decoration) { Game.objects.removeItem(decor); }
            Game.decoration = [];
            Menus.close();
            DecorMode.toggle(false);
            break;
        case 'money':
            Game.setMoney(message.value);
            break;
        case 'inventory':
            if (typeof message.value === 'object') {
                Game.setInventory(message.value);
            }
            break;
        case 'day_night':
            Game.background.style.filter = message.value;
            break;
        case 'evolution':
            //Visual sparkle effect on the evolved pet
            if (typeof message.index === 'number' && Game.pets[message.index]) {
                const pet = Game.pets[message.index];
                pet.element.classList.add('evolving');
                setTimeout(() => { pet.element.classList.remove('evolving'); }, 2000);
            }
            break;
        default:
            break;
    }
}

function handleSettingsMessage(message) {
    switch (message.type.toLowerCase()) {
        case 'background':
            Game.background.setAttribute('background', message.value.toLowerCase());
            break;
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
        case 'wild_pokemons':
            for (const wildPokemon of Game.wildPokemons) { wildPokemon.remove(); }
            if (message.value) {
                Game.wildPokemonSpawner.wait(10 * 1000);
            } else {
                Game.wildPokemonSpawner.stop();
            }
            break;
        default:
            break;
    }
}

function handleSpawnMessage(message) {
    switch (message.type.toLowerCase()) {
        case 'spawn_pokemon':
        case 'spawn_pet': {
            const name = message.name;
            const specie = message.specie.toLowerCase();
            const generation = (message.color ?? 'generation 1').toString();
            const form = (message.form ?? message.specie).toString();
            const sprite = (message.sprite ?? form).toString().toLowerCase().replaceAll(' ', '_');
            const spriteSize = message.spriteSize === 48 ? 48 : 32;
            new Pokemon(name, specie, generation, form, sprite, spriteSize); // NOSONAR - constructor registers in Game.pets
            break;
        }
        case 'spawn_decor': {
            const pos = new Vec2(message.x, message.y);
            const category = message.category.toUpperCase().replaceAll(' ', '_');
            const name = message.name.toUpperCase().replaceAll(' ', '_');
            new Decoration(DecorationPreset[category][name], { pos: pos }); // NOSONAR - constructor registers in Game.decoration
            break;
        }
        case 'spawn_wild_pokemon': {
            const specie = message.specie.toLowerCase();
            new WildPokemon(specie); // NOSONAR - constructor registers in Game.wildPokemons
            break;
        }
        case 'remove_pokemon':
        case 'remove_pet':
            Game.pets[message.index].remove();
            break;
        default:
            break;
    }
}

function handleMenuMessage(message) {
    switch (message.type.toLowerCase()) {
        case 'actions':
            if (Game.isAction(Action.BALL) || Game.isAction(Action.CANDY)) { Game.setAction(Action.NONE); }
            Menus.toggle('actions');
            document.getElementById('actionsContent').scrollTop = 0;
            break;
        case 'toggle_topbar':
            setTopBarVisible(!topBarVisible);
            break;
        case 'show_topbar':
            if (!topBarVisible) { showTopBarTemporary(); }
            break;
    }
}

window.addEventListener('message', event => { // NOSONAR - VS Code webview; extension host origin differs from webview origin
    const message = event.data;
    handleGameMessage(message);
    handleSettingsMessage(message);
    handleSpawnMessage(message);
    handleMenuMessage(message);
});

//Cursor events
function handleDecorMouseDown(pos) {
    //Sort objects
    Game.sortObjects();

    //Check to drag decoration from nearest to farthest object
    for (let i = Game.objects.length - 1; i >= 0; i--) {
        const obj = Game.objects[i];
        if (!obj.isDecoration) { continue; }
        if (obj.checkMouseDown(pos)) { break; }
    }
}

document.body.onmousedown = event => {
    //Menu open -> Ignore click
    if (Menus.current) { return; }

    //Get scaled mouse position
    const pos = Cursor.posScaled;

    //Perform action
    if (Game.action === Action.DECOR) {
        handleDecorMouseDown(pos);
    }
};

function handleDecorMouseUp(pos) {
    switch (DecorMode.action) {
        case DecorMode.ACTION_MOVE:
            for (const decoration of Game.decoration) { decoration.stopDragging(); }
            break;
        case DecorMode.ACTION_SELL:
            Game.sortObjects();
            for (let i = Game.objects.length - 1; i >= 0; i--) {
                const obj = Game.objects[i];
                if (!obj.isDecoration) { continue; }
                if (obj.checkMouseUp(pos)) { break; }
            }
            break;
    }
}

function handleBallMouseUp(pos) {
    Game.ball.moveTo(pos.sub(Game.ball.size.mult(0.5, 1).toInt()));
    Game.ball.setActive(true);
    for (const pokemon of Game.pets) {
        if (typeof pokemon.moveTowardsBall === 'function') {
            pokemon.moveTowardsBall(pos);
        } else if (pokemon.ai && typeof pokemon.ai.moveTowards === 'function') {
            pokemon.ai.moveTowards(pos, true);
        }
    }
    Game.setAction(Action.NONE);
}

function handleDefaultMouseUp(pos) {
    Game.sortObjects();
    for (let i = Game.objects.length - 1; i >= 0; i--) {
        const obj = Game.objects[i];
        if (obj.checkMouseUp(pos)) { break; }
    }
    Game.setAction(Action.NONE);
}

document.body.onmouseup = event => {
    //Menu open -> Ignore click
    if (Menus.current) { return; }

    //Get scaled mouse position
    const pos = Cursor.posScaled;

    //Perform action
    switch (Game.action) {
        case Action.DECOR:
            handleDecorMouseUp(pos);
            break;
        case Action.BALL:
            handleBallMouseUp(pos);
            break;
        default:
            handleDefaultMouseUp(pos);
            break;
    }
};

document.onmousemove = event => {
    //Mouse moved -> Update cursor position
    Cursor.moveTo(new Vec2(event.clientX, event.clientY));
};

document.onmouseenter = event => {
    //Mouse entered screen -> Show cursor
    Cursor.setIcon(Game.action);
};

document.onmouseleave = event => {
    //Mouse left screen -> Hide cursor
    Cursor.setIcon(Action.NONE);
};

//Start game loop
Game.start();

//Show top bar while any menu is open (if not permanently visible)
Menus.onOpen = () => {
    if (!topBarVisible) {
        document.getElementById('topBar').setAttribute('visible', '');
    }
};

//Hide top bar when all menus close (deferred so menu-to-menu navigation keeps it visible)
Menus.onClose = () => {
    if (!topBarVisible) {
        setTimeout(() => {
            if (!Menus.current) {
                document.getElementById('topBar').removeAttribute('visible');
            }
        }, 0);
    }
};

//Tell VSCode the game was loaded
vscode.postMessage({ type: 'init' });