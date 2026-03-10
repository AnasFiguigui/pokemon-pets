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
    { id: 'candy', name: 'Rare Candy', price: 30, category: 'candy', spriteOffset: { x: 0, y: 0 }, cursorOffset: { x: 0, y: 32 } },
    { id: 'oran_berry', name: 'Oran Berry', price: 15, category: 'food', stat: '+10 HP  +15 STA', spriteOffset: { x: 32, y: 0 }, cursorOffset: { x: 32, y: 32 } },
    { id: 'potion', name: 'Potion', price: 25, category: 'potion', stat: '+20 HP', spriteOffset: { x: 64, y: 0 }, cursorOffset: { x: 64, y: 32 } },
    { id: 'fire_stone', name: 'Fire Stone', price: 100, category: 'stone', spriteOffset: { x: 160, y: 0 }, cursorOffset: { x: 160, y: 32 } },
    { id: 'water_stone', name: 'Water Stone', price: 100, category: 'stone', spriteOffset: { x: 192, y: 0 }, cursorOffset: { x: 192, y: 32 } },
    { id: 'thunder_stone', name: 'Thunder Stone', price: 100, category: 'stone', spriteOffset: { x: 224, y: 0 }, cursorOffset: { x: 224, y: 32 } },
    { id: 'leaf_stone', name: 'Leaf Stone', price: 100, category: 'stone', spriteOffset: { x: 256, y: 0 }, cursorOffset: { x: 256, y: 32 } },
    { id: 'moon_stone', name: 'Moon Stone', price: 120, category: 'stone', spriteOffset: { x: 288, y: 0 }, cursorOffset: { x: 288, y: 32 } },
    { id: 'sun_stone', name: 'Sun Stone', price: 120, category: 'stone', spriteOffset: { x: 320, y: 0 }, cursorOffset: { x: 320, y: 32 } },
    { id: 'dusk_stone', name: 'Dusk Stone', price: 120, category: 'stone', spriteOffset: { x: 352, y: 0 }, cursorOffset: { x: 352, y: 32 } },
    { id: 'shiny_stone', name: 'Shiny Stone', price: 120, category: 'stone', spriteOffset: { x: 384, y: 0 }, cursorOffset: { x: 384, y: 32 } },
    { id: 'ice_stone', name: 'Ice Stone', price: 100, category: 'stone', spriteOffset: { x: 416, y: 0 }, cursorOffset: { x: 416, y: 32 } },
];

//Plant catalog (must match extension's PlantTypes array)
const PlantCatalog = [
    { id: 'oran_berry_plant', name: 'Oran Berry Seed', price: 50, produces: 'Oran Berry', growthHours: [0.02, 0.02, 0.02], size: [16, 32], spriteOffset: [0, 0], phaseStep: [0, 16] },
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

    //Update cursor to show the selected consumable sprite
    const info = ConsumableCatalog.find(c => c.id === id);
    if (info) {
        const el = document.getElementById('cursor');
        el.style.setProperty('--consumable-x', `${-info.cursorOffset.x}px`);
        el.style.setProperty('--consumable-y', `${-info.cursorOffset.y}px`);
    }
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

            //Consumables sprites
            if (info) {
                const imgBox = document.createElement('div');
                const img = document.createElement('div');
                img.style.setProperty('--image', `url('./sprites/consumables.png')`);
                img.style.setProperty('--width', '32px');
                img.style.setProperty('--height', '32px');
                img.style.setProperty('--scale', `${50 / 32}`);
                img.style.setProperty('--spriteOffset', `${-info.spriteOffset.x}px ${-info.spriteOffset.y}px`);
                imgBox.prepend(img);
                element.appendChild(imgBox);
            }

            const text = document.createElement('span');
            text.innerText = `${name} x${count}`;
            if (info && info.stat) {
                text.appendChild(document.createElement('br'));
                const statSpan = document.createElement('span');
                statSpan.classList.add('storeButtonStat');
                statSpan.innerText = info.stat;
                text.appendChild(statSpan);
            }
            element.appendChild(text);

            element.onclick = () => selectConsumable(id);
            content.appendChild(element);
        }
    }

    //Show backpack
    content.scrollTop = 0;
    Menus.toggle('backpack', true);
}

//Pokédex
let pokedexData = []; // { name, specie, sprite, spriteSize, candyFed }

function openPokedex() {
    //Request fresh pet data from extension
    vscode.postMessage({ type: 'request_pokedex' });
}

function renderPokedex() {
    const content = document.getElementById('pokedexContent');
    content.innerHTML = '';

    if (pokedexData.length === 0) {
        const empty = document.createElement('span');
        empty.classList.add('pokedexEntry');
        empty.innerText = 'No Pokémon yet';
        empty.style.textAlign = 'center';
        content.appendChild(empty);
    } else {
        for (const pet of pokedexData) {
            const entry = document.createElement('div');
            entry.classList.add('pokedexEntry');

            //Sprite (sized per pokemon, vec 0,0)
            const spriteSize = pet.spriteSize === 48 ? 48 : 32;
            const sprite = document.createElement('img');
            const spriteName = (pet.sprite ?? pet.specie).toString().toLowerCase().replaceAll(' ', '_');
            sprite.src = `${Game.mediaURI}sprites/pokemons/${spriteName}.png`;
            sprite.alt = pet.name;
            sprite.classList.add('pokedexSprite');
            sprite.style.width = `${spriteSize}px`;
            sprite.style.height = `${spriteSize}px`;
            entry.appendChild(sprite);

            //Info column
            const info = document.createElement('div');
            info.classList.add('pokedexInfo');

            const nameEl = document.createElement('span');
            nameEl.classList.add('pokedexName');
            nameEl.innerText = pet.name;
            info.appendChild(nameEl);

            const level = Math.min(pet.candyFed ?? 0, 100);
            const levelEl = document.createElement('span');
            levelEl.classList.add('pokedexLevel');
            levelEl.innerText = `Lv. ${level}`;
            info.appendChild(levelEl);

            // HP bar
            const hp = pet.hp ?? 0;
            const maxHp = pet.maxHp ?? 50;
            const hpPercent = maxHp > 0 ? (hp / maxHp) * 100 : 0;
            const hpBar = document.createElement('div');
            hpBar.classList.add('pokedexBar');
            const hpFill = document.createElement('div');
            hpFill.classList.add('pokedexBarFill', 'hp');
            hpFill.style.width = `${hpPercent}%`;
            // Dynamic color: green >50%, orange ≤50%, red ≤25%
            if (hpPercent <= 25) {
                hpFill.style.background = '#e44';
            } else if (hpPercent <= 50) {
                hpFill.style.background = '#e98a2a';
            }
            hpBar.appendChild(hpFill);
            const hpLabel = document.createElement('span');
            hpLabel.classList.add('pokedexBarLabel');
            hpLabel.innerText = `HP ${hp}/${maxHp}`;
            hpBar.appendChild(hpLabel);
            info.appendChild(hpBar);

            // Stamina bar
            const stamina = pet.stamina ?? 0;
            const maxStamina = pet.maxStamina ?? 50;
            const staminaBar = document.createElement('div');
            staminaBar.classList.add('pokedexBar');
            const staminaFill = document.createElement('div');
            staminaFill.classList.add('pokedexBarFill', 'stamina');
            staminaFill.style.width = `${maxStamina > 0 ? (stamina / maxStamina) * 100 : 0}%`;
            staminaBar.appendChild(staminaFill);
            const staminaLabel = document.createElement('span');
            staminaLabel.classList.add('pokedexBarLabel');
            staminaLabel.innerText = `STA ${stamina}/${maxStamina}`;
            staminaBar.appendChild(staminaLabel);
            info.appendChild(staminaBar);

            entry.appendChild(info);
            content.appendChild(entry);
        }
    }

    content.scrollTop = 0;
    Menus.toggle('pokedex', true);
}

function toggleActionDecor() {
    //Close actions menu
    Menus.close(); 
    
    //Toggle decor mode
    DecorMode.toggle();
}

//Store menu
function createStoreItem(name, price, stat) {
    //Item element
    const element = document.createElement('div');
    element.classList.add('menuButton', 'storeButton');

    //Name text element
    const text = document.createElement('span');
    text.innerText = Util.titleCase(name.toLowerCase().replaceAll('_', ' '));
    element.append(text);

    //Add stat label
    if (stat) {
        text.appendChild(document.createElement('br'));
        const statSpan = document.createElement('span');
        statSpan.classList.add('storeButtonStat');
        statSpan.innerText = stat;
        text.appendChild(statSpan);
    }

    //Add price to text
    if (typeof price === 'number') {
        text.appendChild(document.createElement('br'));
        const priceSpan = document.createElement('span');
        priceSpan.classList.add('storeButtonMoney');
        if (price > Game.money) { priceSpan.setAttribute('expensive', ''); }
        priceSpan.innerText = `${price}G`;
        text.appendChild(priceSpan);
    }

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

    //Create seeds category
    const seedsElement = createStoreItem('Seeds');
    const seedsIcon = document.createElement('img');
    seedsIcon.src = `${Game.mediaURI}sprites/ui/candy.png`;
    seedsIcon.alt = 'Seeds';
    seedsElement.prepend(seedsIcon);
    seedsElement.onclick = () => openStoreSeedsMenu();
    content.appendChild(seedsElement);

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
        const element = createStoreItem(item.name, item.price, item.stat);

        //Add sprite image (using decoration sprite sheet temporarily)
        const imgBox = document.createElement('div');
        const img = document.createElement('div');
        img.style.setProperty('--image', `url('./sprites/consumables.png')`);
        img.style.setProperty('--width', '32px');
        img.style.setProperty('--height', '32px');
        img.style.setProperty('--scale', `${50 / 32}`);
        img.style.setProperty('--spriteOffset', `${-item.spriteOffset.x}px ${-item.spriteOffset.y}px`);
        imgBox.prepend(img);
        element.prepend(imgBox);

        //Add buy function
        element.onclick = () => {
            if (Game.money < item.price) {
                Game.showMessage('Not enough gold!');
                return;
            }
            vscode.postMessage({ type: 'buy_consumable', consumableId: item.id, quantity: 1 });
            Game.showMessage(`Bought ${item.name}!`);
        };
        content.appendChild(element);
    }

    //Scroll to top
    content.scrollTop = 0;
    setTimeout(() => { content.scrollTop = 0; }, 0);
}

function openStoreSeedsMenu() {
    //Empty list
    const content = document.getElementById('storeContent');
    content.innerHTML = '';

    //Top left back button goes to categories list
    const backButton = document.getElementById('storeBackBtn');
    if (backButton) {
        backButton.innerText = 'Back';
        backButton.onclick = openStoreMenu;
    }

    //Create seed items from catalog
    for (const seed of PlantCatalog) {
        const stat = `Blossom: ${seed.growthHours[0]}h | Fruit: ${seed.growthHours[1]}h | Ripe: ${seed.growthHours[2]}h`;
        const element = createStoreItem(seed.name, seed.price, stat);

        //Add sprite preview (phase 2 = ripe)
        const ripeX = seed.spriteOffset[0] + seed.phaseStep[0] * 2;
        const ripeY = seed.spriteOffset[1] + seed.phaseStep[1] * 2;
        const imgBox = document.createElement('div');
        const img = document.createElement('div');
        img.style.setProperty('--image', `url('./sprites/plants.png')`);
        img.style.setProperty('--width', `${seed.size[0]}px`);
        img.style.setProperty('--height', `${seed.size[1]}px`);
        img.style.setProperty('--scale', `${50 / Math.max(seed.size[0], seed.size[1])}`);
        img.style.setProperty('--spriteOffset', `${-ripeX}px ${-ripeY}px`);
        imgBox.prepend(img);
        element.prepend(imgBox);

        //Add buy function
        element.onclick = () => {
            if (Game.money < seed.price) {
                Game.showMessage('Not enough gold!');
                return;
            }

            //Consume money
            Game.addMoney(-seed.price);

            //Close menu
            Menus.close();

            //Create plant
            const plant = new Plant({
                plantId: seed.id,
                index: Game.plants.length - 1,
                phase: 0,
                size: seed.size,
                spriteOffset: seed.spriteOffset,
                phaseStep: seed.phaseStep,
                price: seed.price,
            });

            //Enter decor mode (after creating plant, else it will ask the user to buy one)
            DecorMode.toggle(true);

            //Center plant with mouse & start dragging it
            const plantCenterRelativePos = plant.size.mult(0.5);
            plant.moveTo(plant.snapPos(Cursor.posScaled.sub(plantCenterRelativePos)));
            plant.startDragging(plantCenterRelativePos);

            //Notify extension to save the plant
            vscode.postMessage({
                type: 'add_plant',
                plantId: seed.id,
                x: plant.pos.x,
                y: plant.pos.y,
            });
        };
        content.appendChild(element);
    }

    //Scroll to top
    content.scrollTop = 0;
    setTimeout(() => { content.scrollTop = 0; }, 0);
}

function refreshStorePrices() {
    const priceElements = document.querySelectorAll('#storeContent .storeButtonMoney');
    for (const el of priceElements) {
        const price = parseInt(el.innerText);
        if (!isNaN(price)) {
            if (price > Game.money) {
                el.setAttribute('expensive', '');
            } else {
                el.removeAttribute('expensive');
            }
        }
    }
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
            Game.plants.length = 0;
            Menus.close();
            DecorMode.toggle(false);
            break;
        case 'money':
            Game.setMoney(message.value);
            // Refresh store price indicators if store is open
            if (Menus.current === 'store') { refreshStorePrices(); }
            break;
        case 'inventory':
            if (typeof message.value === 'object') {
                Game.setInventory(message.value);
            }
            break;
        case 'day_night':
            updateNightOverlay(message.timeOfDay, message.opacity);
            break;
        case 'evolution':
            //Visual sparkle effect on the evolved pet
            if (typeof message.index === 'number' && Game.pets[message.index]) {
                const pet = Game.pets[message.index];
                pet.element.classList.add('evolving');
                setTimeout(() => { pet.element.classList.remove('evolving'); }, 2000);
            }
            break;
        case 'pokedex':
            pokedexData = Array.isArray(message.value) ? message.value : [];
            renderPokedex();
            break;
        case 'pet_stats':
            // Update cached pokedex data with fresh stats
            if (Array.isArray(message.value) && pokedexData.length > 0) {
                for (let i = 0; i < Math.min(message.value.length, pokedexData.length); i++) {
                    pokedexData[i].hp = message.value[i].hp;
                    pokedexData[i].stamina = message.value[i].stamina;
                    pokedexData[i].maxHp = message.value[i].maxHp;
                    pokedexData[i].maxStamina = message.value[i].maxStamina;
                }
                // Re-render if pokedex is open
                if (Menus.current === 'pokedex') { renderPokedex(); }
            }
            break;
        case 'consumable_failed':
            Game.showMessage('It had no effect!');
            break;
        case 'harvest_result':
            Game.showMessage(`Harvested ${message.count}x ${message.name}!`, true);
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
        case 'spawn_plant': {
            const plantInfo = PlantCatalog.find(p => p.id === message.plantId);
            new Plant({ // NOSONAR - constructor registers in Game.plants & Game.decoration
                plantId: message.plantId,
                index: message.index,
                phase: message.phase ?? 0,
                size: message.size ?? (plantInfo ? plantInfo.size : [16, 32]),
                spriteOffset: message.spriteOffset ?? (plantInfo ? plantInfo.spriteOffset : [0, 0]),
                phaseStep: message.phaseStep ?? (plantInfo ? plantInfo.phaseStep : [0, 16]),
                price: plantInfo ? plantInfo.price : 0,
                pos: new Vec2(message.x, message.y),
            });
            break;
        }
        case 'update_plant': {
            const plant = Game.plants[message.index];
            if (plant) { plant.setPhase(message.phase); }
            break;
        }
        case 'retry_wild_spawn':
            Game.wildPokemonSpawner.wait(30 * 1000);
            break;
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
    if (typeof message?.type !== 'string') { return; }
    handleGameMessage(message);
    handleSettingsMessage(message);
    handleSpawnMessage(message);
    handleMenuMessage(message);
});

//Night overlay & lamp lighting
// eslint-disable-next-line no-unused-vars -- read by decoration/object.js
let nightOverlayActive = false;

function updateNightOverlay(timeOfDay, opacity) {
    const overlay = document.getElementById('night-overlay');
    const glow = document.getElementById('lamp-glow');
    nightOverlayActive = timeOfDay === 'night';
    overlay.style.opacity = opacity;
    glow.style.opacity = nightOverlayActive ? 1 : 0;

    //Switch lamp sprites (day = off, night = on)
    for (const decor of Game.decoration) {
        if (!decor.isLamp) { continue; }
        decor.spriteOffset.y = nightOverlayActive ? decor.nightSpriteY : decor.daySpriteY;
    }

    if (nightOverlayActive) {
        lampMaskDirty = true;
        updateLampMasks();
    } else {
        overlay.style.maskImage = '';
        overlay.style.webkitMaskImage = '';
        glow.style.background = '';
    }
}

function buildLampMask(lamps, scale) {
    if (lamps.length === 0) { return ''; }
    return lamps.map(l => {
        const cx = (l.x + l.halfW) * scale;
        const cy = (l.y + l.halfH + 8) * scale;
        const r = l.radius * scale;
        return `radial-gradient(circle ${r}px at ${cx}px ${cy}px, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,1) 100%)`;
    }).join(', ');
}

function buildLampGlow(lamps, scale) {
    if (lamps.length === 0) { return 'transparent'; }
    const gradients = lamps.map(l => {
        const cx = (l.x + l.halfW) * scale;
        const cy = (l.y + l.halfH + 8) * scale;
        const r = l.radius * scale;
        return `radial-gradient(circle ${r}px at ${cx}px ${cy}px, rgba(255,200,80,0.18) 0%, rgba(255,180,60,0.08) 40%, transparent 100%)`;
    }).join(', ');
    return gradients;
}

function updateLampMasks() {
    const overlay = document.getElementById('night-overlay');
    const glow = document.getElementById('lamp-glow');
    if (!nightOverlayActive) { return; }

    //Collect all lamp decorations
    const lamps = [];
    for (const decor of Game.decoration) {
        if (!decor.isLamp) { continue; }
        lamps.push({
            x: decor.pos.x,
            y: decor.pos.y,
            halfW: decor.size.x / 2,
            halfH: decor.size.y / 2,
            radius: decor.lightRadius || 60,
        });
    }

    //Dark overlay mask (punch transparent holes where lamps are)
    const mask = buildLampMask(lamps, Game.scale);
    overlay.style.maskImage = mask;
    overlay.style.webkitMaskImage = mask;
    if (mask) {
        overlay.style.maskComposite = 'intersect';
        overlay.style.webkitMaskComposite = 'source-in';
    } else {
        overlay.style.maskComposite = '';
        overlay.style.webkitMaskComposite = '';
    }

    //Warm glow layer (additive warm light where lamps are)
    glow.style.background = buildLampGlow(lamps, Game.scale);
}

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

//Update lamp masks every frame (so dragged lamps update their light in real-time)
let lampMaskDirty = true;
Game.onAfterDraw = () => {
    if (!nightOverlayActive || !lampMaskDirty) { return; }
    lampMaskDirty = false;
    updateLampMasks();
};

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