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

//Actions menu
function toggleActionBall() {
    //Close actions menu & decor mode UI
    Menus.close();

    //Ball is visible -> Remove it
    if (Game.ball.active) { Game.ball.onReached(); }
    
    //Toggle ball action
    Game.setAction(Game.isAction(Action.BALL) ? Action.NONE : Action.BALL);
}

function toggleActionCandy() {
    //Close actions menu
    Menus.close();

    //Check if player has candy
    if (Game.candy <= 0) {
        Game.showMessage('No candy!');
        return;
    }

    //Toggle candy action
    const newAction = Game.isAction(Action.CANDY) ? Action.NONE : Action.CANDY;
    Game.setAction(newAction);

    //Update candy button active state
    const candyBtn = document.getElementById('candyBtn');
    if (newAction === Action.CANDY) {
        candyBtn.setAttribute('active', '');
    } else {
        candyBtn.removeAttribute('active');
    }
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

    //Create candy item
    const candyPrice = 30;
    const candyElement = createStoreItem('Candy', candyPrice);
    candyElement.onclick = () => {
        if (Game.money < candyPrice) { return; }
        vscode.postMessage({ type: 'buy_candy', quantity: 1 });
    };
    content.appendChild(candyElement);

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
                Game.setCandy(message.value.candy ?? 0);
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

//Tell VSCode the game was loaded
vscode.postMessage({ type: 'init' });