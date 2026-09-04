//VSCode API
const vscode = acquireVsCodeApi();

//Timing constants
const WILD_SPAWN_INITIAL_MS = 10 * 1000;   //Delay before the first wild spawn
const WILD_SPAWN_RESPAWN_MS = 30 * 1000;   //Delay between catches / retries
const TOP_BAR_AUTO_HIDE_MS = 3000;

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
    }, TOP_BAR_AUTO_HIDE_MS);
}

//Consumable catalog. Sprite data lives here; prices, names, and categories
//are overwritten by the extension's authoritative 'catalog' message on init
//so the two sides can never disagree about what an item costs.
const ConsumableCatalog = [
    { id: 'candy', name: 'Rare Candy', price: 100, category: 'candy', spriteOffset: { x: 0, y: 0 }, cursorOffset: { x: 0, y: 32 } },
    { id: 'oran_berry', name: 'Oran Berry', price: 30, category: 'food', stat: '+10 HP  +15 STA', spriteOffset: { x: 0, y: 64 }, cursorOffset: { x: 0, y: 96 } },
    { id: 'razz_berry', name: 'Razz Berry', price: 50, category: 'food', stat: '+10 HP  +20 STA', spriteOffset: { x: 32, y: 64 }, cursorOffset: { x: 32, y: 96 } },
    { id: 'maranga_berry', name: 'Maranga Berry', price: 100, category: 'food', stat: '+50 STA', spriteOffset: { x: 64, y: 64 }, cursorOffset: { x: 64, y: 96 } },
    { id: 'potion', name: 'Potion', price: 100, category: 'potion', stat: '+20 HP', spriteOffset: { x: 0, y: 128 }, cursorOffset: { x: 0, y: 160 } },
    { id: 'super_potion', name: 'Super Potion', price: 280, category: 'potion', stat: '+60 HP', spriteOffset: { x: 32, y: 128 }, cursorOffset: { x: 32, y: 160 } },
    { id: 'hyper_potion', name: 'Hyper Potion', price: 500, category: 'potion', stat: '+120 HP', spriteOffset: { x: 64, y: 128 }, cursorOffset: { x: 64, y: 160 } },
    { id: 'growth_mulch', name: 'Growth Mulch', price: 200, category: 'mulch', stat: '-25% growth (1h)', spriteOffset: { x: 0, y: 192 }, cursorOffset: { x: 0, y: 224 } },
    { id: 'damp_mulch', name: 'Damp Mulch', price: 200, category: 'mulch', stat: '+1 yield (1 harvest)', spriteOffset: { x: 32, y: 192 }, cursorOffset: { x: 32, y: 224 } },
    { id: 'gooey_mulch', name: 'Gooey Mulch', price: 300, category: 'mulch', stat: '+1 regrow (1 harvest)', spriteOffset: { x: 96, y: 192 }, cursorOffset: { x: 96, y: 224 } },
    { id: 'fire_stone', name: 'Fire Stone', price: 1000, category: 'stone', spriteOffset: { x: 160, y: 0 }, cursorOffset: { x: 160, y: 32 } },
    { id: 'water_stone', name: 'Water Stone', price: 1000, category: 'stone', spriteOffset: { x: 192, y: 0 }, cursorOffset: { x: 192, y: 32 } },
    { id: 'thunder_stone', name: 'Thunder Stone', price: 1000, category: 'stone', spriteOffset: { x: 224, y: 0 }, cursorOffset: { x: 224, y: 32 } },
    { id: 'leaf_stone', name: 'Leaf Stone', price: 1000, category: 'stone', spriteOffset: { x: 256, y: 0 }, cursorOffset: { x: 256, y: 32 } },
    { id: 'moon_stone', name: 'Moon Stone', price: 1200, category: 'stone', spriteOffset: { x: 288, y: 0 }, cursorOffset: { x: 288, y: 32 } },
    { id: 'sun_stone', name: 'Sun Stone', price: 1200, category: 'stone', spriteOffset: { x: 320, y: 0 }, cursorOffset: { x: 320, y: 32 } },
    { id: 'dusk_stone', name: 'Dusk Stone', price: 1200, category: 'stone', spriteOffset: { x: 352, y: 0 }, cursorOffset: { x: 352, y: 32 } },
    { id: 'shiny_stone', name: 'Shiny Stone', price: 1200, category: 'stone', spriteOffset: { x: 384, y: 0 }, cursorOffset: { x: 384, y: 32 } },
    { id: 'ice_stone', name: 'Ice Stone', price: 1000, category: 'stone', spriteOffset: { x: 416, y: 0 }, cursorOffset: { x: 416, y: 32 } },
    { id: 'everstone', name: 'Everstone', price: 500, category: 'stone', stat: 'Prevents evolution', spriteOffset: { x: 64, y: 288 }, cursorOffset: { x: 64, y: 320 } },
];

//Plant catalog. Sprite data lives here; prices, names, growth data, and
//harvest types are overwritten by the extension's 'catalog' message on init.
// harvestType: 'single' = destroyed after harvest, 'repeatable' = regrows from blossom
const PlantCatalog = [
    { id: 'oran_berry_plant', name: 'Oran Berry Seed', price: 350, produces: 'Oran Berry', harvestType: 'repeatable', growthHours: [0.1, 0.2, 0.2, 0.3, 0.2], size: [16, 32], spriteOffset: [0, 0], phaseStep: [16, 0] },
    { id: 'razz_berry_plant', name: 'Razz Berry Seed', price: 400, produces: 'Razz Berry', harvestType: 'repeatable', growthHours: [0.1, 0.2, 0.2, 0.3, 0.2], size: [16, 32], spriteOffset: [0, 32], phaseStep: [16, 0] },
    { id: 'maranga_berry_plant', name: 'Maranga Berry Seed', price: 500, produces: 'Maranga Berry', harvestType: 'single', growthHours: [0.2, 0.4, 0.4, 0.6, 0.4], size: [16, 32], spriteOffset: [0, 64], phaseStep: [16, 0] },
];

/** Pre-built map from consumable id → catalog entry for O(1) lookup. */
const ConsumableCatalogMap = new Map(ConsumableCatalog.map(c => [c.id, c]));

/** Merges the extension's authoritative catalog data into the local catalogs. */
function applyCatalog(message) {
    if (Array.isArray(message.consumables)) {
        for (const item of message.consumables) {
            const local = ConsumableCatalogMap.get(item.id);
            if (!local) { continue; }
            if (typeof item.price === 'number') { local.price = item.price; }
            if (typeof item.name === 'string') { local.name = item.name; }
            if (typeof item.category === 'string') { local.category = item.category; }
        }
    }
    if (Array.isArray(message.plants)) {
        for (const item of message.plants) {
            const local = PlantCatalog.find(entry => entry.id === item.id);
            if (!local) { continue; }
            if (typeof item.price === 'number') { local.price = item.price; }
            if (typeof item.name === 'string') { local.name = item.name; }
            if (typeof item.harvestType === 'string') { local.harvestType = item.harvestType; }
            if (Array.isArray(item.growthHours)) { local.growthHours = item.growthHours; }
        }
    }
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
    const info = ConsumableCatalogMap.get(id);
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
            const info = ConsumableCatalogMap.get(id);
            const name = info ? info.name : Util.titleCase(id.replaceAll('_', ' '));
            const count = inv[id];
            const sellPrice = info ? Math.floor(info.price * 0.7) : 0;

            //Row container
            const row = document.createElement('div');
            row.classList.add('backpackRow');

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
            if (info?.stat) {
                text.appendChild(document.createElement('br'));
                const statSpan = document.createElement('span');
                statSpan.classList.add('storeButtonStat');
                statSpan.innerText = info.stat;
                text.appendChild(statSpan);
            }
            element.appendChild(text);

            element.onclick = () => selectConsumable(id);
            row.appendChild(element);

            //Sell buttons
            if (sellPrice > 0) {
                const sellRow = document.createElement('div');
                sellRow.classList.add('backpackSellRow');

                const sellOne = document.createElement('button');
                sellOne.type = 'button';
                sellOne.classList.add('menuButton', 'sellButton');
                sellOne.innerText = `Sell 1 · ${sellPrice}$`;
                sellOne.onclick = (e) => {
                    e.stopPropagation();
                    vscode.postMessage({ type: 'sell_consumable', consumableId: id, quantity: 1 });
                };
                sellRow.appendChild(sellOne);

                if (count > 1) {
                    const sellAll = document.createElement('button');
                    sellAll.type = 'button';
                    sellAll.classList.add('menuButton', 'sellButton');
                    sellAll.innerText = `Sell All · ${sellPrice * count}$`;
                    sellAll.onclick = (e) => {
                        e.stopPropagation();
                        vscode.postMessage({ type: 'sell_consumable', consumableId: id, quantity: count });
                    };
                    sellRow.appendChild(sellAll);
                }

                row.appendChild(sellRow);
            }

            content.appendChild(row);
        }
    }

    //Show backpack
    content.scrollTop = 0;
    Menus.toggle('backpack', true);
}

//Pokédex
let pokedexData = [];

function openPokedex() {
    //Request fresh pet data from extension
    vscode.postMessage({ type: 'request_pokedex' });
}

/** Dynamic HP bar color: green >50%, orange ≤50%, red ≤25%. */
function applyHpBarColor(fill, hpPercent) {
    if (hpPercent <= 25) {
        fill.style.background = '#e44';
    } else if (hpPercent <= 50) {
        fill.style.background = '#e98a2a';
    } else {
        fill.style.background = '';
    }
}

/**
 * Updates the open pokédex's HP/stamina bars in place from pokedexData —
 * avoids a full rebuild (and the sprite reload flicker) on every stat tick.
 */
function updatePokedexStats() {
    const entries = document.querySelectorAll('#pokedexContent .pokedexEntry');
    if (entries.length !== pokedexData.length) {
        renderPokedex(true);
        return;
    }
    entries.forEach((entry, i) => {
        const pet = pokedexData[i];
        const bars = entry.querySelectorAll('.pokedexBar');
        if (bars.length < 2) { return; }

        const hp = pet.hp ?? 0;
        const maxHp = pet.maxHp ?? 50;
        const hpPercent = maxHp > 0 ? (hp / maxHp) * 100 : 0;
        const hpFill = bars[0].querySelector('.pokedexBarFill');
        const hpLabel = bars[0].querySelector('.pokedexBarLabel');
        if (hpFill) {
            hpFill.style.width = `${hpPercent}%`;
            applyHpBarColor(hpFill, hpPercent);
        }
        if (hpLabel) { hpLabel.innerText = `HP ${hp}/${maxHp}`; }

        const stamina = pet.stamina ?? 0;
        const maxStamina = pet.maxStamina ?? 50;
        const staFill = bars[1].querySelector('.pokedexBarFill');
        const staLabel = bars[1].querySelector('.pokedexBarLabel');
        if (staFill) { staFill.style.width = `${maxStamina > 0 ? (stamina / maxStamina) * 100 : 0}%`; }
        if (staLabel) { staLabel.innerText = `STA ${stamina}/${maxStamina}`; }
    });
}

function renderPokedex(preserveScroll) {
    const content = document.getElementById('pokedexContent');
    const prevScroll = preserveScroll ? content.scrollTop : 0;
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

            //Sprite column (pokemon + held item slot)
            const spriteCol = document.createElement('div');
            spriteCol.classList.add('pokedexSpriteCol');

            //Sprite (sized per pokemon, vec 0,0)
            const spriteSize = pet.spriteSize === 48 ? 48 : 32;
            const sprite = document.createElement('img');
            const spriteName = (pet.sprite ?? pet.specie).toString().toLowerCase().replaceAll(' ', '_');
            sprite.src = `${Game.mediaURI}sprites/pokemons/${spriteName}.png`;
            sprite.alt = pet.name;
            sprite.classList.add('pokedexSprite');
            sprite.style.width = `${spriteSize}px`;
            sprite.style.height = `${spriteSize}px`;
            spriteCol.appendChild(sprite);

            //Held item slot
            const heldSlot = document.createElement('div');
            heldSlot.classList.add('pokedexHeldSlot');
            if (pet.heldItem) {
                const itemInfo = ConsumableCatalogMap.get(pet.heldItem);
                if (itemInfo) {
                    const itemIcon = document.createElement('div');
                    itemIcon.classList.add('pokedexHeldIcon');
                    itemIcon.style.backgroundPosition = `${-itemInfo.cursorOffset.x}px ${-itemInfo.cursorOffset.y}px`;
                    itemIcon.title = `${itemInfo.name} (click to remove)`;
                    itemIcon.onclick = (e) => {
                        e.stopPropagation();
                        const petIndex = pokedexData.indexOf(pet);
                        if (petIndex < 0) { return; }
                        vscode.postMessage({ type: 'unequip_item', index: petIndex });
                    };
                    heldSlot.appendChild(itemIcon);
                }
            }
            spriteCol.appendChild(heldSlot);
            entry.appendChild(spriteCol);

            //Info column
            const info = document.createElement('div');
            info.classList.add('pokedexInfo');

            const nameEl = document.createElement('span');
            nameEl.classList.add('pokedexName');
            nameEl.innerText = pet.name;
            nameEl.title = 'Click to rename';
            nameEl.onclick = (e) => {
                e.stopPropagation();
                const petIndex = pokedexData.indexOf(pet);
                if (petIndex < 0) {return;}
                vscode.postMessage({ type: 'request_rename_specific_pet', index: petIndex });
            };
            info.appendChild(nameEl);

            // Level + friendship row
            const levelRow = document.createElement('div');
            levelRow.classList.add('pokedexLevelRow');

            const level = Math.min(pet.candyFed ?? 0, 100);
            const levelEl = document.createElement('span');
            levelEl.classList.add('pokedexLevel');
            levelEl.innerText = `Lv. ${level}`;
            levelRow.appendChild(levelEl);

            // Friendship message
            const friendship = pet.friendship ?? 0;
            let friendshipMsg;
            if (friendship >= 255) {friendshipMsg = 'Perfect Bond';}
            else if (friendship >= 200) {friendshipMsg = 'Strong Bond';}
            else if (friendship >= 150) {friendshipMsg = 'Very Friendly';}
            else if (friendship >= 100) {friendshipMsg = 'Becoming Friendly';}
            else if (friendship >= 50) {friendshipMsg = 'Neutral';}
            else {friendshipMsg = 'Dislikes Trainer';}
            const friendshipEl = document.createElement('span');
            friendshipEl.classList.add('pokedexFriendship');
            friendshipEl.innerText = friendshipMsg;
            levelRow.appendChild(friendshipEl);

            info.appendChild(levelRow);

            // HP bar
            const hp = pet.hp ?? 0;
            const maxHp = pet.maxHp ?? 50;
            const hpPercent = maxHp > 0 ? (hp / maxHp) * 100 : 0;
            const hpBar = document.createElement('div');
            hpBar.classList.add('pokedexBar');
            const hpFill = document.createElement('div');
            hpFill.classList.add('pokedexBarFill', 'hp');
            hpFill.style.width = `${hpPercent}%`;
            applyHpBarColor(hpFill, hpPercent);
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

            // Action buttons row
            const actions = document.createElement('div');
            actions.classList.add('pokedexActions');

            // Feed Candy button
            const candyCount = Game.inventory?.['candy'] || 0;
            const candyBtn = document.createElement('button');
            candyBtn.type = 'button';
            candyBtn.classList.add('pokedexFeedBtn');
            candyBtn.innerText = `Feed Candy x1`;
            candyBtn.disabled = candyCount <= 0;
            candyBtn.onclick = (e) => {
                e.stopPropagation();
                const petIndex = pokedexData.indexOf(pet);
                if (petIndex < 0) {return;}
                vscode.postMessage({ type: 'use_consumable', consumableId: 'candy', index: petIndex });
            };
            actions.appendChild(candyBtn);

            // Feed Food button — find first food/potion that restores stamina in inventory
            const bestFood = ConsumableCatalog.find(c =>
                (c.category === 'food' || c.category === 'potion')
                && Game.inventory?.[c.id] > 0
            );
            const foodBtn = document.createElement('button');
            foodBtn.type = 'button';
            foodBtn.classList.add('pokedexFeedBtn');
            foodBtn.innerText = bestFood ? `Feed ${bestFood.name}` : 'No food';
            foodBtn.disabled = !bestFood;
            foodBtn.onclick = (e) => {
                e.stopPropagation();
                if (!bestFood) {return;}
                const petIndex = pokedexData.indexOf(pet);
                if (petIndex < 0) {return;}
                vscode.postMessage({ type: 'use_consumable', consumableId: bestFood.id, index: petIndex });
            };
            actions.appendChild(foodBtn);

            info.appendChild(actions);

            entry.appendChild(info);
            content.appendChild(entry);
        }
    }

    content.scrollTop = prevScroll;
    Menus.toggle('pokedex', true);
}

function toggleActionDecor() {
    //Close actions menu
    Menus.close(); 
    
    //Toggle decor mode
    DecorMode.toggle();
}

//Store menu
let lastStoreView = { type: 'root' };
const BUILD_SHORTCUT_LIMIT = 3;
const recentBuildItems = [];

function getBuildShortcutKey(item) {
    return item.kind === 'decoration'
        ? `decoration:${item.category}:${item.name}`
        : `seed:${item.plantId}`;
}

function resolveBuildShortcut(item) {
    if (item?.kind === 'decoration') {
        const preset = DecorationPreset[item.category]?.[item.name];
        if (!preset) { return null; }
        return {
            label: preset.name,
            image: 'decoration.png',
            width: preset.size.x,
            height: preset.size.y,
            offsetX: preset.spriteOffset.x,
            offsetY: preset.spriteOffset.y,
        };
    }

    if (item?.kind === 'seed') {
        const seed = PlantCatalog.find(entry => entry.id === item.plantId);
        if (!seed) { return null; }
        const ripePhase = seed.growthHours.length;
        return {
            label: seed.name,
            image: 'plants.png',
            width: seed.size[0],
            height: seed.size[1],
            offsetX: seed.spriteOffset[0] + seed.phaseStep[0] * ripePhase,
            offsetY: seed.spriteOffset[1] + seed.phaseStep[1] * ripePhase,
        };
    }

    return null;
}

function renderBuildShortcuts() {
    const slots = document.querySelectorAll('.buildShortcutSlot');
    slots.forEach((slot, index) => {
        const item = recentBuildItems[index];
        const details = item ? resolveBuildShortcut(item) : null;
        slot.replaceChildren();

        if (!details) {
            slot.disabled = true;
            slot.title = '';
            slot.setAttribute('aria-label', 'Empty recent build slot');
            return;
        }

        const preview = document.createElement('span');
        preview.classList.add('buildShortcutSprite');
        preview.style.setProperty('--shortcut-image', `url('./sprites/${details.image}')`);
        preview.style.setProperty('--shortcut-width', `${details.width}px`);
        preview.style.setProperty('--shortcut-height', `${details.height}px`);
        preview.style.setProperty('--shortcut-offset', `${-details.offsetX}px ${-details.offsetY}px`);
        preview.style.setProperty('--shortcut-scale', `${28 / Math.max(details.width, details.height)}`);
        slot.appendChild(preview);
        slot.disabled = false;
        slot.title = details.label;
        slot.setAttribute('aria-label', `Place ${details.label} again`);
    });
}

function rememberBuildShortcut(item) {
    if (!resolveBuildShortcut(item)) { return; }
    const key = getBuildShortcutKey(item);
    const previousIndex = recentBuildItems.findIndex(entry => getBuildShortcutKey(entry) === key);
    if (previousIndex >= 0) { recentBuildItems.splice(previousIndex, 1); }
    recentBuildItems.unshift(item);
    recentBuildItems.splice(BUILD_SHORTCUT_LIMIT);
    renderBuildShortcuts();
}

function clearBuildShortcuts() {
    recentBuildItems.length = 0;
    renderBuildShortcuts();
}

function hasPendingBuildPurchase() {
    return Game.decoration.some(item => item.isPendingPurchase);
}

function beginDecorationPlacement(category, name) {
    const preset = DecorationPreset[category]?.[name];
    if (!preset || typeof preset.price !== 'number') { return; }
    if (hasPendingBuildPurchase()) {
        Game.showMessage('Place the current item first!', true);
        return;
    }
    if (Game.money < preset.price) {
        Game.showMessage('Not enough gold!');
        return;
    }

    Menus.close();
    const decor = new Decoration(preset);
    decor.setPendingPurchase(category, name);
    DecorMode.toggle(true);

    const decorCenterRelativePos = decor.size.mult(0.5);
    decor.moveTo(decor.snapPos(Cursor.posScaled.sub(decorCenterRelativePos)));
    decor.startDragging(decorCenterRelativePos);
}

function beginSeedPlacement(seedOrId) {
    const seed = typeof seedOrId === 'string'
        ? PlantCatalog.find(entry => entry.id === seedOrId)
        : seedOrId;
    if (!seed) { return; }
    if (hasPendingBuildPurchase()) {
        Game.showMessage('Place the current item first!', true);
        return;
    }
    if (Game.money < seed.price) {
        Game.showMessage('Not enough gold!');
        return;
    }

    Menus.close();
    const plant = new Plant({
        plantId: seed.id,
        index: Game.plants.length,
        phase: 0,
        size: seed.size,
        spriteOffset: seed.spriteOffset,
        phaseStep: seed.phaseStep,
        price: seed.price,
        totalPhases: seed.growthHours.length + 1,
    });
    plant.setPendingPurchase();
    DecorMode.toggle(true);

    const plantCenterRelativePos = plant.size.mult(0.5);
    plant.moveTo(plant.snapPos(Cursor.posScaled.sub(plantCenterRelativePos)));
    plant.startDragging(plantCenterRelativePos);
}

function activateBuildShortcut(index) {
    const item = recentBuildItems[index];
    if (!item) { return; }
    if (item.kind === 'decoration') {
        beginDecorationPlacement(item.category, item.name);
    } else if (item.kind === 'seed') {
        beginSeedPlacement(item.plantId);
    }
}

renderBuildShortcuts();

/** Finalizes Build Mode and reopens the last visited shop page. */
function toggleActionStore() {
    // The + button explicitly FINALIZES any pending purchase (unlike Close,
    // which cancels it) before leaving Build Mode.
    for (const decoration of Game.decoration) {
        if (decoration.isPendingPurchase) { decoration.stopDragging(); }
    }
    DecorMode.toggle(false);

    // Game.setAction() closes menus, so reopen after that transition completes.
    setTimeout(() => {
        switch (lastStoreView.type) {
            case 'seeds':
                openStoreSeedsMenu();
                break;
            case 'consumables':
                openStoreConsumablesMenu();
                break;
            case 'category':
                openStoreCategoryMenu(lastStoreView.category);
                break;
            case 'root':
            default:
                openStoreMenu();
                break;
        }
    }, 0);
}

/** Resets a menu's scroll now and after layout (elements render on a timer). */
function resetMenuScroll(content) {
    content.scrollTop = 0;
    setTimeout(() => { content.scrollTop = 0; }, 0);
}

function createStoreItem(name, price, stat) {
    //Item element (a real button so store items are keyboard-accessible)
    const element = document.createElement('button');
    element.type = 'button';
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
        if (price > 0 && price > Game.money) { priceSpan.setAttribute('expensive', ''); }
        priceSpan.innerText = price === 0 ? 'Free' : `${price}$`;
        text.appendChild(priceSpan);
    }

    //Return element
    return element;
}

function openStoreMenu() {
    lastStoreView = { type: 'root' };
    //Empty list
    const content = document.getElementById('storeContent');
    content.innerHTML = '';
    content.classList.add('storeGrid');
    content.classList.remove('groundTilesGrid');

    //Top left back button goes to actions menu on root store
    const backButton = document.getElementById('storeBackBtn');
    if (backButton) {
        backButton.innerText = 'Back';
        backButton.onclick = () => Menus.toggle('actions', true);
    }

    //Build all categories into a fragment (single DOM insertion)
    const fragment = document.createDocumentFragment();

    //Create consumables category
    const consumablesElement = createStoreItem('Consumables');
    consumablesElement.classList.add('storeCategoryButton');
    const consumablesIcon = document.createElement('img');
    consumablesIcon.src = `${Game.mediaURI}sprites/ui/consumables.png`;
    consumablesIcon.alt = 'Consumables';
    consumablesElement.prepend(consumablesIcon);
    consumablesElement.onclick = () => openStoreConsumablesMenu();
    fragment.appendChild(consumablesElement);

    //Create seeds category
    const seedsElement = createStoreItem('Seeds');
    seedsElement.classList.add('storeCategoryButton');
    const seedsIcon = document.createElement('img');
    seedsIcon.src = `${Game.mediaURI}sprites/ui/seeds.png`;
    seedsIcon.alt = 'Seeds';
    seedsElement.prepend(seedsIcon);
    seedsElement.onclick = () => openStoreSeedsMenu();
    fragment.appendChild(seedsElement);

    //Create decoration categories
    for (const category of Object.keys(DecorationPreset)) {
        //Create item element
        const element = createStoreItem(category);
        element.classList.add('storeCategoryButton');
        const icon = document.createElement('img');
        const iconName = category === 'GROUND_TILES' ? 'tiles' : category.toLowerCase();
        icon.src = `${Game.mediaURI}sprites/ui/${iconName}.png`;
        icon.alt = category;
        element.prepend(icon);
        element.onclick = () => openStoreCategoryMenu(category);
        fragment.appendChild(element);
    }
    content.appendChild(fragment);

    resetMenuScroll(content);

    //Show store menu
    Menus.toggle('store', true);
}

function openStoreCategoryMenu(category) {
    if (!DecorationPreset[category]) {
        openStoreMenu();
        return;
    }
    lastStoreView = { type: 'category', category };
    //Empty list
    const content = document.getElementById('storeContent');
    content.innerHTML = '';
    content.classList.add('storeGrid');
    content.classList.toggle('groundTilesGrid', category === 'GROUND_TILES');

    //Top left back button goes to categories list
    const backButton = document.getElementById('storeBackBtn');
    if (backButton) {
        backButton.innerText = 'Back';
        backButton.onclick = openStoreMenu;
    }

    //Create category items (built into a fragment — some categories have 50+ items)
    const fragment = document.createDocumentFragment();
    for (const name of Object.keys(DecorationPreset[category])) {
        //Get decoration preset
        const preset = DecorationPreset[category][name];
        const isGroundTile = category === 'GROUND_TILES';

        //Create item element
        const element = createStoreItem(preset.name, preset.price);
        if (isGroundTile) {
            const text = element.querySelector(':scope > span');
            if (text) { text.remove(); }
            element.title = preset.name;
            element.setAttribute('aria-label', preset.name);
        }
        fragment.appendChild(element);

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
        element.onclick = () => beginDecorationPlacement(category, name);
    }
    content.appendChild(fragment);

    resetMenuScroll(content);
    Menus.toggle('store', true);
}

function openStoreConsumablesMenu() {
    lastStoreView = { type: 'consumables' };
    //Empty list
    const content = document.getElementById('storeContent');
    content.innerHTML = '';
    content.classList.add('storeGrid');
    content.classList.remove('groundTilesGrid');

    //Top left back button goes to categories list
    const backButton = document.getElementById('storeBackBtn');
    if (backButton) {
        backButton.innerText = 'Back';
        backButton.onclick = openStoreMenu;
    }

    //Create consumable items from catalog (styled like decoration presets)
    const fragment = document.createDocumentFragment();
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
        fragment.appendChild(element);
    }
    content.appendChild(fragment);

    resetMenuScroll(content);
    Menus.toggle('store', true);
}

function openStoreSeedsMenu() {
    lastStoreView = { type: 'seeds' };
    //Empty list
    const content = document.getElementById('storeContent');
    content.innerHTML = '';
    content.classList.add('storeGrid');
    content.classList.remove('groundTilesGrid');

    //Top left back button goes to categories list
    const backButton = document.getElementById('storeBackBtn');
    if (backButton) {
        backButton.innerText = 'Back';
        backButton.onclick = openStoreMenu;
    }

    //Create seed items from catalog
    for (const seed of PlantCatalog) {
        const typeLabel = seed.harvestType === 'single' ? 'One-time' : 'Regrows';
        const stat = `${typeLabel} · Ripe: ${seed.growthHours.reduce((a, b) => a + b, 0)}h`;
        const element = createStoreItem(seed.name, seed.price, stat);

        //Add sprite preview (last phase = ripe)
        // Seed sprites in the shop
        const maxPhase = seed.growthHours.length;
        const ripeX = seed.spriteOffset[0] + seed.phaseStep[0] * maxPhase;
        const ripeY = seed.spriteOffset[1] + seed.phaseStep[1] * maxPhase;
        const imgBox = document.createElement('div');
        const img = document.createElement('div');
        img.style.setProperty('--image', `url('./sprites/plants.png')`);
        img.style.setProperty('--width', `16px`);
        img.style.setProperty('--height', `16px`);
        img.style.setProperty('--scale', `${50 / Math.max(seed.size[0], seed.size[1])}`);
        img.style.setProperty('--spriteOffset', `${-ripeX}px ${-ripeY}px`);
        imgBox.prepend(img);
        element.prepend(imgBox);

        //Add buy function
        element.onclick = () => beginSeedPlacement(seed);
        content.appendChild(element);
    }

    resetMenuScroll(content);
    Menus.toggle('store', true);
}

function refreshStorePrices() {
    const priceElements = document.querySelectorAll('#storeContent .storeButtonMoney');
    for (const el of priceElements) {
        const price = Number.parseInt(el.innerText);
        if (!Number.isNaN(price)) {
            if (price > Game.money) {
                el.setAttribute('expensive', '');
            } else {
                el.removeAttribute('expensive');
            }
        }
    }
}

// Evolution messages can arrive faster than the canvas animation completes (for
// example, when two candies are fed in quick succession). Keep a queue per pet
// index so each swap starts from the form produced by the previous animation.
const evolutionMessageQueues = new Map();
// Pet index → active blink/continue timeout, so in-flight animations can be
// cancelled when pets are removed or the game resets.
const evolutionTimers = new Map();
// Pet index → pet currently frozen (update shadowed / possibly hidden) by an
// in-flight blink animation, so cancellation can restore it.
const evolutionFrozenPets = new Map();

/** Cancels every queued and in-flight evolution animation. */
function cancelAllEvolutions() {
    for (const timer of evolutionTimers.values()) { clearTimeout(timer); }
    evolutionTimers.clear();
    // Restore pets caught mid-blink — otherwise they stay frozen (no-op
    // update) and possibly invisible (setActive(false) from a blink step)
    for (const pet of evolutionFrozenPets.values()) {
        delete pet.update;
        pet.setActive(true);
    }
    evolutionFrozenPets.clear();
    evolutionMessageQueues.clear();
}

function enqueueEvolution(message) {
    const idx = message.index;
    if (!Number.isInteger(idx) || idx < 0) { return; }

    let queue = evolutionMessageQueues.get(idx);
    if (!queue) {
        queue = [];
        evolutionMessageQueues.set(idx, queue);
    }

    queue.push(message);
    if (queue.length === 1) { playNextEvolution(idx, queue); }
}

function playNextEvolution(idx, queue) {
    if (evolutionMessageQueues.get(idx) !== queue || queue.length === 0) { return; }

    const message = queue[0];
    const oldPet = Game.pets[idx];
    if (!oldPet) {
        evolutionMessageQueues.delete(idx);
        return;
    }

    let completed = false;
    function completeEvolution() {
        if (completed) { return; }
        completed = true;
        evolutionTimers.delete(idx);

        // Reset/removal may have cancelled this queue while the animation ran.
        if (evolutionMessageQueues.get(idx) !== queue) { return; }
        queue.shift();
        if (queue.length === 0) {
            evolutionMessageQueues.delete(idx);
        } else {
            // Give the newly-created form a moment to appear before evolving it.
            evolutionTimers.set(idx, setTimeout(() => playNextEvolution(idx, queue), 300));
        }
    }

    // Freeze the pet at idle during evolution and prevent AI movement by
    // shadowing update() on the instance; deleting the own property restores
    // the prototype's update, so the pet can never stay frozen.
    oldPet.animate('idle', true);
    oldPet.update = function () {
        // Skip AI updates (no movement), only run base rendering.
    };
    evolutionFrozenPets.set(idx, oldPet);
    function unfreeze() {
        delete oldPet.update;
        if (evolutionFrozenPets.get(idx) === oldPet) { evolutionFrozenPets.delete(idx); }
    }

    const blinkPhases = [
        { count: 3, interval: 300 },
        { count: 4, interval: 200 },
        { count: 5, interval: 140 },
        { count: 6, interval: 100 },
        { count: 8, interval: 70 },
        { count: 12, interval: 40 },
        { count: 16, interval: 25 },
    ];
    let phaseIdx = 0;
    let phaseStep = 0;

    function doBlink() {
        // Abort if the pet was removed or replaced during animation.
        if (Game.pets[idx] !== oldPet) {
            unfreeze();
            oldPet.setActive(true);
            completeEvolution();
            return;
        }
        if (phaseIdx >= blinkPhases.length) {
            unfreeze();
            oldPet.setActive(true);
            performEvolutionSwap();
            return;
        }

        const phase = blinkPhases[phaseIdx];
        phaseStep++;
        oldPet.setActive(phaseStep % 2 === 0);
        if (phaseStep >= phase.count) {
            phaseIdx++;
            phaseStep = 0;
        }

        const nextInterval = blinkPhases[Math.min(phaseIdx, blinkPhases.length - 1)].interval;
        evolutionTimers.set(idx, setTimeout(doBlink, nextInterval));
    }

    function performEvolutionSwap() {
        const preservedPos = oldPet.pos;
        oldPet.ai?.dispose();
        Game.objects.removeItem(oldPet);
        Game.pets.splice(idx, 1);

        const specie = message.specie.toLowerCase();
        const generation = (message.color ?? 'generation 1').toString();
        const form = (message.form ?? message.specie).toString();
        const sprite = (message.sprite ?? form).toString().toLowerCase().replaceAll(' ', '_');
        const spriteSize = message.spriteSize === 48 ? 48 : 32;
        const newPet = new Pokemon(message.name, specie, generation, form, sprite, spriteSize);

        if (preservedPos) { newPet.moveTo(preservedPos); }
        newPet.animate('special', true);

        // Pokemon's constructor appends it; put it back at the original index.
        Game.pets.removeItem(newPet);
        Game.pets.splice(idx, 0, newPet);
        completeEvolution();
    }

    evolutionTimers.set(idx, setTimeout(doBlink, 200));
}

//Messages from VSCode
function handleGameMessage(message) {
    switch (message.type.toLowerCase()) {
        case 'init':
            document.body.removeAttribute('hide');
            document.body.style.display = '';
            break;
        case 'reset':
            cancelAllEvolutions();
            stopPetPlay();
            clearBuildShortcuts();
            //Remove via remove() paths so AI timers are disposed — but pets
            //and decorations are already gone host-side, so strip the lists
            //first and only detach the objects locally
            for (const pet of [...Game.pets]) {
                pet.ai?.dispose();
                Game.objects.removeItem(pet);
            }
            Game.pets = [];
            for (const decor of Game.decoration) { Game.objects.removeItem(decor); }
            Game.decoration = [];
            Game.plants.length = 0;
            Menus.close();
            DecorMode.toggle(false);
            break;
        case 'catalog':
            applyCatalog(message);
            break;
        case 'money':
            Game.setMoney(message.value);
            // Show reward message if amount is included (e.g. wild catch)
            if (typeof message.reward === 'number' && message.reward !== 0) {
                const formatted = Util.formatNumber(Math.abs(message.reward));
                Game.showMessage(`${message.reward >= 0 ? '+' : '-'}${formatted}$`);
            }
            // Refresh store price indicators if store is open
            if (Menus.current === 'store') { refreshStorePrices(); }
            break;
        case 'inventory':
            if (typeof message.value === 'object') {
                Game.setInventory(message.value);
            }
            // Re-render backpack if open so owned counts stay fresh
            if (Menus.current === 'backpack') { openBackpack(); }
            // Refresh pokédex if open (candy counts, food availability may have changed)
            if (Menus.current === 'pokedex') { vscode.postMessage({ type: 'request_pokedex' }); }
            break;
        case 'day_night':
            updateNightOverlay(message.timeOfDay, message.opacity);
            break;
        case 'evolution':
            enqueueEvolution(message);
            break;
        case 'pokedex':
            pokedexData = Array.isArray(message.value) ? message.value : [];
            renderPokedex(Menus.current === 'pokedex');
            break;
        case 'pet_stats':
            // Update cached pokedex data with fresh stats
            if (Array.isArray(message.value) && pokedexData.length > 0) {
                // A length mismatch means a pet was added/removed since the
                // last pokédex fetch — zipping by index would attribute stats
                // to the wrong Pokémon, so fetch a fresh snapshot instead
                if (message.value.length !== pokedexData.length) {
                    if (Menus.current === 'pokedex') { vscode.postMessage({ type: 'request_pokedex' }); }
                    break;
                }
                for (let i = 0; i < message.value.length; i++) {
                    pokedexData[i].hp = message.value[i].hp;
                    pokedexData[i].stamina = message.value[i].stamina;
                    pokedexData[i].maxHp = message.value[i].maxHp;
                    pokedexData[i].maxStamina = message.value[i].maxStamina;
                }
                // Update the open pokédex's bars in place (no full rebuild)
                if (Menus.current === 'pokedex') { updatePokedexStats(); }
            }
            break;
        case 'consumable_failed':
            Game.showMessage('It had no effect!');
            break;
        case 'rename_pet':
            if (typeof message.index === 'number' && Game.pets[message.index]) {
                Game.pets[message.index].name = message.name;
            }
            break;
        case 'harvest_result':
            Game.showMessage(`Harvested ${message.count}x ${message.name}!`, true);
            break;
        case 'show_message':
            Game.showMessage(message.text, true);
            break;
        default:
            break;
    }
}

function handleSettingsMessage(message) {
    switch (message.type.toLowerCase()) {
        case 'background':
            if (typeof message.value !== 'string') { break; }
            Game.background.setAttribute('background', message.value.toLowerCase());
            break;
        case 'scale':
            if (typeof message.value !== 'string') { break; }
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
        case 'menu_scale': {
            const menuScale = typeof message.value === 'string' ? message.value.toLowerCase() : 'default';
            const scaleValue = menuScale === 'small' ? 0.75 : menuScale === 'large' ? 1.25 : 1;
            document.body.style.setProperty('--menu-scale', scaleValue);
            break;
        }
        case 'filter':
            Game.background.removeAttribute('filter');
            if (typeof message.value === 'string' && message.value.toLowerCase() !== 'none') {
                Game.background.setAttribute('filter', message.value.toLowerCase().replaceAll(' ', '-'));
            }
            break;
        case 'wild_pokemons':
            //Iterate a copy — remove() splices Game.wildPokemons, and
            //iterating the live array would skip every second Pokémon
            for (const wildPokemon of [...Game.wildPokemons]) { wildPokemon.remove(); }
            if (message.value) {
                Game.wildPokemonSpawner.wait(WILD_SPAWN_INITIAL_MS);
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
            if (DecorationPreset[category]?.[name]) {
                new Decoration(DecorationPreset[category][name], { pos: pos }); // NOSONAR - constructor registers in Game.decoration
            }
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
                mulch: message.mulch ?? null,
            });
            break;
        }
        case 'update_plant': {
            const plant = Game.plants[message.index];
            if (plant) { plant.setPhase(message.phase); }
            break;
        }
        case 'set_mulch': {
            const mulchPlant = Game.plants[message.index];
            if (mulchPlant) { mulchPlant.setMulch(message.mulch); }
            break;
        }
        case 'clear_mulch': {
            const clearPlant = Game.plants[message.index];
            if (clearPlant) { clearPlant.clearMulch(); }
            break;
        }
        case 'destroy_plant': {
            // Server-initiated removal (e.g. single-harvest plant after
            // harvesting, or a rejected placement)
            const plantToRemove = Game.plants[message.index];
            if (plantToRemove) {
                plantToRemove.removeLocal();
                if (Game.decoration.isEmpty() && Game.isAction(Action.DECOR)) {DecorMode.toggle(false);}
            }
            break;
        }
        case 'destroy_decor': {
            // Server-initiated removal of a rejected decoration placement.
            // The index counts decorations only (plants excluded).
            let decorOnlyIdx = -1;
            for (const item of Game.decoration) {
                if (item.isPlant) { continue; }
                decorOnlyIdx++;
                if (decorOnlyIdx === message.index) {
                    item.removeLocal();
                    break;
                }
            }
            if (Game.decoration.isEmpty() && Game.isAction(Action.DECOR)) {DecorMode.toggle(false);}
            break;
        }

        case 'retry_wild_spawn':
            Game.wildPokemonSpawner.wait(WILD_SPAWN_RESPAWN_MS);
            break;
        case 'remove_pokemon':
        case 'remove_pet':
            // Pet indices may shift after removal; cancel pending visual swaps
            // (including any in-flight blink timers) and any play session.
            cancelAllEvolutions();
            stopPetPlay();
            if (Game.pets[message.index]) { Game.pets[message.index].remove(); }
            break;
        default:
            break;
    }
}

function handleMenuMessage(message) {
    switch (message.type.toLowerCase()) {
        case 'actions':
            if (Game.isAction(Action.BALL) || Game.isAction(Action.CANDY)) { Game.setAction(Action.NONE); }
            // Sync decor mode button text with actual state
            document.getElementById('actionsDecor').innerText = Game.isAction(Action.DECOR) ? 'Exit Build Mode' : 'Enter Build Mode';
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

const gameMessageHandlers = [handleGameMessage, handleSettingsMessage, handleSpawnMessage, handleMenuMessage];

window.addEventListener('message', event => { // NOSONAR - VS Code webview; extension host origin differs from webview origin
    const message = event.data;
    if (typeof message?.type !== 'string') { return; }
    //Isolate handlers from each other — one handler throwing must not stop
    //the rest of this message (or leave init half-applied)
    for (const handler of gameMessageHandlers) {
        try {
            handler(message);
        } catch (err) {
            console.error(`[Pokemon Pets] Error handling '${message.type}':`, err);
        }
    }
});

//Night overlay & lamp lighting (cached DOM elements)
//Vertical fine-tune applied to lamp light centers (matches the sprite art)
const LAMP_LIGHT_Y_OFFSET = 8;
const nightOverlayEl = document.getElementById('night-overlay');
const lampGlowEl = document.getElementById('lamp-glow');

function updateNightOverlay(timeOfDay, opacity) {
    Game.nightOverlayActive = timeOfDay === 'night';
    nightOverlayEl.style.opacity = opacity;
    lampGlowEl.style.opacity = Game.nightOverlayActive ? 1 : 0;

    //Switch lamp sprites (day = off, night = on)
    for (const decor of Game.decoration) {
        if (!decor.isLamp) { continue; }
        decor.spriteOffset.y = Game.nightOverlayActive ? decor.nightSpriteY : decor.daySpriteY;
    }

    if (Game.nightOverlayActive) {
        Game.lampMaskDirty = true;
        updateLampMasks();
    } else {
        nightOverlayEl.style.maskImage = '';
        nightOverlayEl.style.webkitMaskImage = '';
        lampGlowEl.style.background = '';
    }
}

function buildLampMask(lamps, scale) {
    if (lamps.length === 0) { return ''; }
    return lamps.map(l => {
        const cx = (l.x + l.halfW) * scale;
        const cy = (l.y + l.halfH + LAMP_LIGHT_Y_OFFSET) * scale;
        const r = l.radius * scale;
        return `radial-gradient(circle ${r}px at ${cx}px ${cy}px, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,1) 100%)`;
    }).join(', ');
}

function buildLampGlow(lamps, scale) {
    if (lamps.length === 0) { return 'transparent'; }
    const gradients = lamps.map(l => {
        const cx = (l.x + l.halfW) * scale;
        const cy = (l.y + l.halfH + LAMP_LIGHT_Y_OFFSET) * scale;
        const r = l.radius * scale;
        return `radial-gradient(circle ${r}px at ${cx}px ${cy}px, rgba(255,200,80,0.18) 0%, rgba(255,180,60,0.08) 40%, transparent 100%)`;
    }).join(', ');
    return gradients;
}

function updateLampMasks() {
    if (!Game.nightOverlayActive) { return; }

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
    nightOverlayEl.style.maskImage = mask;
    nightOverlayEl.style.webkitMaskImage = mask;
    if (mask) {
        nightOverlayEl.style.maskComposite = 'intersect';
        nightOverlayEl.style.webkitMaskComposite = 'source-in';
    } else {
        nightOverlayEl.style.maskComposite = '';
        nightOverlayEl.style.webkitMaskComposite = '';
    }

    //Warm glow layer (additive warm light where lamps are)
    lampGlowEl.style.background = buildLampGlow(lamps, Game.scale);
}

//Pet-to-pet play sessions: occasionally two pets walk toward each other,
//meet in the middle, and celebrate — the extension grants both a little
//friendship via the 'pets_played' message.
const PET_PLAY_CHECK_MS = 45 * 1000;   //How often we roll for a playdate
const PET_PLAY_CHANCE = 0.35;          //Chance per roll
const PET_PLAY_TIMEOUT_MS = 25 * 1000; //Give up if they can't meet in time
const PET_PLAY_MEET_DIST = 24;         //Center distance (px) that counts as met
const PET_PLAY_STEER_MS = 800;         //How often both pets are re-aimed

let petPlaySession = null;

function stopPetPlay() {
    if (!petPlaySession) { return; }
    clearInterval(petPlaySession.steerInterval);
    clearTimeout(petPlaySession.giveUpTimer);
    petPlaySession = null;
}

/** True when the pet can join/continue a play session. */
function isPetPlayable(pet) {
    return Game.pets.includes(pet)
        && pet.active
        && !Object.hasOwn(pet, 'update')            //not frozen mid-evolution
        && pet.ai.state !== PetAI.MOVE_BALL;        //not chasing the ball
}

function sendPetTowards(pet, pointX, pointY) {
    pet.ai.moveTowards(new Vec2(
        Util.clamp(Math.round(pointX - pet.size.x / 2), 0, pet.maxPosX),
        Util.clamp(Math.round(pointY - pet.size.y / 2), 0, pet.maxPosY)
    ));
}

function steerPetPlay() {
    const session = petPlaySession;
    if (!session) { return; }
    const { petA, petB } = session;
    if (!isPetPlayable(petA) || !isPetPlayable(petB)) {
        stopPetPlay();
        return;
    }

    const ax = petA.pos.x + petA.size.x / 2;
    const ay = petA.pos.y + petA.size.y / 2;
    const bx = petB.pos.x + petB.size.x / 2;
    const by = petB.pos.y + petB.size.y / 2;

    if (Math.hypot(ax - bx, ay - by) <= PET_PLAY_MEET_DIST) {
        //They met — celebrate and tell the extension (friendship for both).
        //Both pets show the SAME random emote, like they're reacting to
        //each other.
        const sharedMood = PetMoods.RANDOM;
        const indexA = Game.pets.indexOf(petA);
        const indexB = Game.pets.indexOf(petB);
        petA.ai.playWithFriend(sharedMood);
        petB.ai.playWithFriend(sharedMood);
        if (indexA >= 0 && indexB >= 0 && indexA !== indexB) {
            vscode.postMessage({ type: 'pets_played', indexA, indexB });
        }
        stopPetPlay();
        return;
    }

    //Keep both walking toward the midpoint between them
    const midX = (ax + bx) / 2;
    const midY = (ay + by) / 2;
    sendPetTowards(petA, midX, midY);
    sendPetTowards(petB, midX, midY);
}

function tryStartPetPlay() {
    if (petPlaySession) { return; }
    if (!Game.isAction(Action.NONE) || Menus.current) { return; }
    if (Math.random() >= PET_PLAY_CHANCE) { return; }

    const candidates = Game.pets.filter(isPetPlayable);
    if (candidates.length < 2) { return; }

    //Pick two distinct random pets
    const first = Util.randomExclusive(candidates.length);
    let second = Util.randomExclusive(candidates.length - 1);
    if (second >= first) { second++; }

    petPlaySession = { petA: candidates[first], petB: candidates[second] };
    petPlaySession.steerInterval = setInterval(steerPetPlay, PET_PLAY_STEER_MS);
    petPlaySession.giveUpTimer = setTimeout(stopPetPlay, PET_PLAY_TIMEOUT_MS);
    steerPetPlay();
}

setInterval(tryStartPetPlay, PET_PLAY_CHECK_MS);

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
    //No pets to fetch — the ball would just sit on the field forever
    if (Game.pets.length === 0) {
        Game.showMessage('No Pokémon to play fetch!');
        Game.setAction(Action.NONE);
        return;
    }
    //Center the ball horizontally on the click point (x only)
    Game.ball.moveTo(pos.sub(new Vec2(Math.floor(Game.ball.size.x / 2), 0)));
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
    let consumed = false;
    for (let i = Game.objects.length - 1; i >= 0; i--) {
        const obj = Game.objects[i];
        //Outside Build Mode, plain decorations never react to clicks — skip
        //them before the expensive pixel-perfect test (a getImageData GPU
        //readback per object; dozens of ground tiles would make clicks crawl)
        if (obj.isDecoration && !obj.isPlant && !obj.quickAction) { continue; }
        if (obj.checkMouseUp(pos)) { consumed = true; break; }
    }
    if (!consumed) { Game.setAction(Action.NONE); }
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
    //Mouse moved -> Update cursor position (reuse pos object to avoid GC)
    Cursor.moveToXY(event.clientX, event.clientY);
};

document.onmouseenter = event => {
    //Mouse entered screen -> Show cursor
    Cursor.setIcon(Game.action);
};

document.onmouseleave = event => {
    //Mouse left screen -> Hide cursor
    Cursor.setIcon(Action.NONE);
};

//Static UI events — wired here instead of inline on* attributes so the
//Content-Security-Policy can disallow inline script entirely
function wireStaticUiEvents() {
    const on = (id, fn) => {
        const el = document.getElementById(id);
        if (el) { el.addEventListener('click', fn); }
    };
    const stopMouse = (el) => {
        if (!el) { return; }
        el.addEventListener('mousedown', e => e.stopPropagation());
        el.addEventListener('mouseup', e => e.stopPropagation());
    };

    //Build mode controls
    stopMouse(document.getElementById('buildShortcuts'));
    document.querySelectorAll('.buildShortcutSlot').forEach((slot, index) => {
        slot.addEventListener('click', () => activateBuildShortcut(index));
    });
    stopMouse(document.getElementById('decorButtons'));
    on('decorActionBtn', () => DecorMode.toggleAction());
    on('decorShopBtn', () => toggleActionStore());
    on('decorCloseBtn', () => DecorMode.toggle(false));

    //Menus backdrop (click outside closes; Escape closes)
    const menus = document.getElementById('menus');
    stopMouse(menus);
    menus.addEventListener('click', () => Menus.close());
    menus.addEventListener('keydown', e => { if (e.key === 'Escape') { Menus.close(); } });
    for (const id of ['actions', 'store', 'backpack', 'pokedex']) {
        const menu = document.getElementById(id);
        if (!menu) { continue; }
        menu.addEventListener('click', e => e.stopPropagation());
        menu.addEventListener('keydown', e => e.stopPropagation());
    }

    //Actions menu
    on('actionsCloseBtn', () => Menus.close());
    on('actionsBallBtn', () => toggleActionBall());
    on('actionsPokedexBtn', () => openPokedex());
    on('actionsBackpackBtn', () => openBackpack());
    on('actionsStoreBtn', () => openStoreMenu());
    on('actionsDecorBtn', () => toggleActionDecor());

    //Store / backpack / pokédex top bars. (The store back button's handler is
    //reassigned per page whenever a store page opens.)
    on('storeCloseBtn', () => Menus.close());
    on('backpackBackBtn', () => Menus.toggle('actions', true));
    on('backpackCloseBtn', () => Menus.close());
    on('pokedexBackBtn', () => Menus.toggle('actions', true));
    on('pokedexCloseBtn', () => Menus.close());

    //Top bar
    on('pokedexBtn', () => openPokedex());
    on('backpackBtn', () => openBackpack());
    on('candyBtn', () => selectConsumable('candy'));
}
wireStaticUiEvents();

//Start game loop
Game.start();

//Update lamp masks every frame (so dragged lamps update their light in real-time)
Game.lampMaskDirty = true;
Game.onAfterDraw = () => {
    if (!Game.nightOverlayActive || !Game.lampMaskDirty) { return; }
    Game.lampMaskDirty = false;
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
