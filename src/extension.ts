import * as vscode from 'vscode';
import { Pokemons, Consumables, PlantTypes, type Consumable, type PlantType } from './game-data';
import { Decoration, Pet, PetItem, PlantInstance, Save, normalizePet, getMaxHp, getMaxStamina } from './models';
import { SaveManager, MAX_SUMMONED_POKEMONS } from './save-manager';
import { WebViewProvider } from './webview-provider';
import { TelemetryService } from './telemetry';
import { EvolutionService } from './evolution';
import { DayNightCycle } from './day-night';
import { StreakService } from './streak';

let config = vscode.workspace.getConfiguration('pokemon-pets');
let webview: WebViewProvider;
let saveManager: SaveManager;
let telemetry: TelemetryService;
let evolution: EvolutionService;
let streakService: StreakService;
let dayNightInterval: ReturnType<typeof setInterval> | undefined;
let staminaDrainInterval: ReturnType<typeof setInterval> | undefined;
let autoFeedEnabled = false;

function syncAutoFeedState(): void {
    autoFeedEnabled = saveManager?.save?.autoFeed ?? false;
    vscode.commands.executeCommand('setContext', 'pokemon-pets.autoFeedOn', autoFeedEnabled);
}

/** Interval between stamina drain ticks (6 minutes → 10 stamina/hour). */
const STAMINA_DRAIN_INTERVAL_MS = 6 * 60_000;
/** How much stamina drains per tick. */
const STAMINA_DRAIN_AMOUNT = 1;
/** How much HP drains per tick when stamina is 0. */
const HP_DRAIN_AMOUNT = 1;

/** Pre-built map for O(1) consumable lookups by ID. */
const ConsumablesMap: ReadonlyMap<string, Consumable> = new Map(Consumables.map(c => [c.id, c]));

/** Pre-built map for O(1) plant-type lookups by ID. */
const PlantTypesMap: ReadonlyMap<string, PlantType> = new Map(PlantTypes.map(p => [p.id, p]));

/** Max friendship value. */
const MAX_FRIENDSHIP = 255;

/**
 * Increase a pet's friendship by the given amount, clamped to [0, 255].
 * Saves automatically.
 */
function addFriendship(petIndex: number, amount: number): void {
    const pet = saveManager.save.pets[petIndex];
    if (!pet) { return; }
    pet.friendship = Math.min(MAX_FRIENDSHIP, (pet.friendship ?? 0) + amount);
    saveManager.scheduleSave();
}

// ── Game Initialization ─────────────────────────────────────────────────

function initGame(): void {
    webview.postMessage({ type: 'background', value: config.get('background') });
    webview.postMessage({ type: 'scale', value: config.get('scale') });
    webview.postMessage({ type: 'wild_pokemons', value: config.get('wild') });
    webview.postMessage({ type: 'money', value: saveManager.save.money });
    webview.postMessage({ type: 'inventory', value: saveManager.save.inventory });

    // Send day/night tint
    if (config.get<boolean>('dayNightCycle', true)) {
        sendDayNightTint();
    }

    for (const pet of saveManager.save.pets.slice(0, MAX_SUMMONED_POKEMONS)) {
        loadPet(pet);
    }

    for (const decor of saveManager.save.decoration) {
        loadDecor(decor);
    }

    for (let i = 0; i < saveManager.save.plants.length; i++) {
        loadPlant(saveManager.save.plants[i], i);
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

function loadPlant(plant: PlantInstance, index: number): void {
    const plantType = PlantTypesMap.get(plant.plantId);
    if (!plantType) { return; }
    // Calculate current visual phase based on elapsed time
    const phase = getPlantPhase(plant, plantType);
    webview.postMessage({
        type: 'spawn_plant',
        index,
        x: plant.x,
        y: plant.y,
        plantId: plant.plantId,
        name: plantType.name,
        phase,
        size: plantType.size,
        spriteOffset: plantType.spriteOffset,
        phaseStep: plantType.phaseStep,
    });
}

/** Calculates a plant's current visual phase (0–4) based on elapsed time. */
function getPlantPhase(plant: PlantInstance, plantType: PlantType): number {
    const elapsedMs = Date.now() - new Date(plant.phaseStartTime).getTime();
    const elapsedHours = elapsedMs / 3_600_000;
    const maxPhase = plantType.growthHours.length - 1;
    let phase = plant.phase;
    let hoursConsumed = 0;
    while (phase < maxPhase) {
        const needed = plantType.growthHours[phase];
        if (hoursConsumed + needed > elapsedHours) { break; }
        hoursConsumed += needed;
        phase++;
    }
    return phase;
}

/** Advances all plants to their correct phase and notifies the webview. */
function tickPlants(): void {
    const plants = saveManager.save.plants;
    if (plants.length === 0) { return; }
    for (let i = 0; i < plants.length; i++) {
        const plant = plants[i];
        const plantType = PlantTypesMap.get(plant.plantId);
        if (!plantType) { continue; }
        const currentPhase = getPlantPhase(plant, plantType);
        if (currentPhase !== plant.phase) {
            saveManager.updatePlantPhase(i, currentPhase);
            webview.postMessage({ type: 'update_plant', index: i, phase: currentPhase });
        }
    }
}

// ── Day/Night Cycle ─────────────────────────────────────────────────────

function sendDayNightTint(): void {
    const timeOfDay = DayNightCycle.getTimeOfDay();
    const opacity = DayNightCycle.getOverlayOpacity(timeOfDay);
    webview.postMessage({ type: 'day_night', timeOfDay, opacity });
}

function startDayNightTimer(): void {
    stopDayNightTimer();
    dayNightInterval = setInterval(() => sendDayNightTint(), 60_000);
}

function stopDayNightTimer(): void {
    if (dayNightInterval !== undefined) {
        clearInterval(dayNightInterval);
        dayNightInterval = undefined;
    }
}

// ── Stamina / HP Drain ──────────────────────────────────────────────────

function drainStamina(): void {
    const pets = saveManager.save.pets;
    if (pets.length === 0) { return; }

    const removedIndices: number[] = [];

    for (let i = pets.length - 1; i >= 0; i--) {
        const pet = pets[i];
        const maxHp = getMaxHp(pet);
        const maxStamina = getMaxStamina(pet);
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

    // Auto-feed pets that are low
    if (autoFeedEnabled) { autoFeedPets(); }
}

/** Auto-feeds pets at ≤25% HP or stamina using cheapest available food, then potions. */
function autoFeedPets(): void {
    const pets = saveManager.save.pets;
    if (pets.length === 0) { return; }

    // Build sorted list of food/potion consumables the player owns, cheapest first
    const healItems = Consumables
        .filter(c => (c.category === 'food' || c.category === 'potion') && saveManager.getConsumableCount(c.id) > 0)
        .sort((a, b) => ((a.restoreHp ?? 0) + (a.restoreStamina ?? 0)) - ((b.restoreHp ?? 0) + (b.restoreStamina ?? 0)));

    if (healItems.length === 0) { return; }

    let inventoryChanged = false;

    for (let i = 0; i < pets.length; i++) {
        const pet = pets[i];
        const maxHp = getMaxHp(pet);
        const maxStamina = getMaxStamina(pet);
        const hp = pet.hp ?? maxHp;
        const stamina = pet.stamina ?? maxStamina;
        const hpPct = maxHp > 0 ? hp / maxHp : 1;
        const staPct = maxStamina > 0 ? stamina / maxStamina : 1;

        // Only auto-feed when ≤25%
        if (hpPct > 0.25 && staPct > 0.25) { continue; }

        // Try each available consumable (cheapest first)
        for (const consumable of healItems) {
            const count = saveManager.getConsumableCount(consumable.id);
            if (count <= 0) { continue; }

            const canHealHp = (consumable.restoreHp ?? 0) > 0 && hp < maxHp;
            const canHealSta = (consumable.restoreStamina ?? 0) > 0 && stamina < maxStamina;
            if (!canHealHp && !canHealSta) { continue; }

            // Use it
            saveManager.updateInventory(consumable.id, count - 1);
            const newHp = Math.min(maxHp, hp + (consumable.restoreHp ?? 0));
            const newStamina = Math.min(maxStamina, stamina + (consumable.restoreStamina ?? 0));
            saveManager.updatePetStats(i, newHp, newStamina);
            inventoryChanged = true;

            // Auto-feed also grants friendship
            if (consumable.friendshipGain) {
                addFriendship(i, consumable.friendshipGain);
            }

            break; // one item per pet per tick
        }
    }

    if (inventoryChanged) {
        webview.postMessage({ type: 'inventory', value: saveManager.save.inventory });
        webview.postMessage({ type: 'pet_stats', value: buildPetStats() });
    }
}

/** Builds an array of { hp, stamina, maxHp, maxStamina } for each pet. */
function buildPetStats(): { hp: number; stamina: number; maxHp: number; maxStamina: number }[] {
    return saveManager.save.pets.slice(0, MAX_SUMMONED_POKEMONS).map(p => ({
        hp: p.hp ?? getMaxHp(p),
        stamina: p.stamina ?? getMaxStamina(p),
        maxHp: getMaxHp(p),
        maxStamina: getMaxStamina(p),
    }));
}

function startStaminaDrainTimer(): void {
    stopStaminaDrainTimer();
    staminaDrainInterval = setInterval(() => {
        drainStamina();
    }, STAMINA_DRAIN_INTERVAL_MS);
}

function stopStaminaDrainTimer(): void {
    if (staminaDrainInterval !== undefined) {
        clearInterval(staminaDrainInterval);
        staminaDrainInterval = undefined;
    }
}

let plantTickInterval: ReturnType<typeof setInterval> | undefined;
const PLANT_TICK_INTERVAL_MS = 60_000; // check plant growth every 60 seconds

function startPlantTickTimer(): void {
    stopPlantTickTimer();
    plantTickInterval = setInterval(() => tickPlants(), PLANT_TICK_INTERVAL_MS);
}

function stopPlantTickTimer(): void {
    if (plantTickInterval !== undefined) {
        clearInterval(plantTickInterval);
        plantTickInterval = undefined;
    }
}

// ── Webview Message Handler ─────────────────────────────────────────────

function handleWebviewMessage(message: any): void {
    if (typeof message?.type !== 'string') { return; }
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
            const newMoney = message.value as number;
            if (typeof newMoney !== 'number' || !isFinite(newMoney) || newMoney < 0) { break; }
            // Cap single transaction delta to prevent exploits (max reasonable: 1000G)
            const maxDelta = 1000;
            const delta = newMoney - oldMoney;
            const clampedMoney = delta > maxDelta ? oldMoney + maxDelta : newMoney;
            saveManager.updateMoney(clampedMoney);
            const diff = clampedMoney - oldMoney;
            if (diff > 0) { telemetry.trackGoldEarned(diff); }
            else if (diff < 0) { telemetry.trackGoldSpent(Math.abs(diff)); }
            break;
        }
        case 'spawn_wild_pokemon': {
            const specie = DayNightCycle.pickWildPokemon();
            if (specie) {
                webview.postMessage({ type: 'spawn_wild_pokemon', specie });
            } else {
                // No eligible species right now — tell webview to retry later
                webview.postMessage({ type: 'retry_wild_spawn' });
            }
            break;
        }
        case 'wild_pokemon_caught': {
            // Compute catch reward server-side (60–100 gold)
            const catchReward = 60 + Math.floor(Math.random() * 9) * 5;
            saveManager.updateMoney(saveManager.save.money + catchReward);
            webview.postMessage({ type: 'money', value: saveManager.save.money, reward: catchReward });
            telemetry.trackGoldEarned(catchReward);
            telemetry.trackWildPokemonCaught();
            break;
        }
        case 'ball_caught': {
            // Pet caught the ball — increase friendship by 0.5
            const ballPetIndex = message.index as number;
            if (typeof ballPetIndex === 'number' && ballPetIndex >= 0) {
                addFriendship(ballPetIndex, 0.5);
            }
            break;
        }
        case 'use_consumable': {
            const consumableId = message.consumableId as string;
            if (!consumableId) { break; }
            const currentCount = saveManager.getConsumableCount(consumableId);
            if (currentCount <= 0) { break; }

            const petIndex = message.index as number;

            if (consumableId === 'candy') {
                // Candy is always consumed
                saveManager.updateInventory(consumableId, currentCount - 1);
                webview.postMessage({ type: 'inventory', value: saveManager.save.inventory });
                telemetry.trackCandyFed();

                if (typeof petIndex === 'number' && petIndex >= 0) {
                    const pet = saveManager.save.pets[petIndex];

                    // Increase friendship from candy
                    if (pet) {
                        const candyConsumable = ConsumablesMap.get('candy');
                        if (candyConsumable?.friendshipGain) {
                            addFriendship(petIndex, candyConsumable.friendshipGain);
                        }
                    }

                    // Boost HP/Stamina by the level-up delta (max increases by 2 per candy)
                    if (pet) {
                        const oldMaxHp = getMaxHp(pet);
                        const oldMaxStamina = getMaxStamina(pet);
                        const result = evolution.feedCandy(petIndex);
                        const newMaxHp = getMaxHp(pet);
                        const newMaxStamina = getMaxStamina(pet);
                        const hpGain = newMaxHp - oldMaxHp;
                        const staminaGain = newMaxStamina - oldMaxStamina;
                        if (hpGain > 0 || staminaGain > 0) {
                            saveManager.updatePetStats(
                                petIndex,
                                Math.min(newMaxHp, (pet.hp ?? oldMaxHp) + hpGain),
                                Math.min(newMaxStamina, (pet.stamina ?? oldMaxStamina) + staminaGain),
                            );
                            webview.postMessage({ type: 'pet_stats', value: buildPetStats() });
                        }

                        if (result.evolved && result.newForm) {
                            webview.postMessage({
                                type: 'evolution',
                                index: petIndex,
                                name: pet.name,
                                specie: pet.specie,
                                color: pet.color,
                                form: normalizePet(pet).form,
                                sprite: normalizePet(pet).sprite,
                                spriteSize: normalizePet(pet).spriteSize,
                                newForm: result.newForm.name,
                            });
                            telemetry.trackPokemonEvolved(pet.specie);
                            vscode.window.showInformationMessage(
                                `🎉 ${pet.name} evolved into ${result.newForm.name}!`,
                            );
                        }
                    } else {
                        evolution.feedCandy(petIndex);
                    }
                }
            } else {
                // Look up consumable to determine category
                const consumable = ConsumablesMap.get(consumableId);
                if (!consumable) { break; }

                if (consumable.category === 'food' || consumable.category === 'potion') {
                    // Food/potion: restores HP and/or stamina
                    if (typeof petIndex !== 'number' || petIndex < 0) { break; }
                    const pet = saveManager.save.pets[petIndex];
                    if (!pet) { break; }
                    const maxHp = getMaxHp(pet);
                    const maxStamina = getMaxStamina(pet);
                    const currentHp = pet.hp ?? maxHp;
                    const currentStamina = pet.stamina ?? maxStamina;
                    const canHealHp = (consumable.restoreHp ?? 0) > 0 && currentHp < maxHp;
                    const canHealSta = (consumable.restoreStamina ?? 0) > 0 && currentStamina < maxStamina;
                    if (!canHealHp && !canHealSta) {
                        webview.postMessage({ type: 'consumable_failed' });
                        break;
                    }
                    saveManager.updateInventory(consumableId, currentCount - 1);
                    const newHp = Math.min(maxHp, currentHp + (consumable.restoreHp ?? 0));
                    const newStamina = Math.min(maxStamina, currentStamina + (consumable.restoreStamina ?? 0));
                    saveManager.updatePetStats(petIndex, newHp, newStamina);
                    webview.postMessage({ type: 'inventory', value: saveManager.save.inventory });
                    webview.postMessage({ type: 'pet_stats', value: buildPetStats() });

                    // Increase friendship from food/potion
                    if (consumable.friendshipGain) {
                        addFriendship(petIndex, consumable.friendshipGain);
                    }
                } else {
                    // Evolution stones: only consumed if evolution succeeds
                    if (typeof petIndex !== 'number' || petIndex < 0) { break; }
                    const result = evolution.useItem(petIndex, consumableId);
                    if (result.evolved && result.newForm) {
                        saveManager.updateInventory(consumableId, currentCount - 1);
                        webview.postMessage({ type: 'inventory', value: saveManager.save.inventory });

                        const pet = saveManager.save.pets[petIndex];
                        webview.postMessage({
                            type: 'evolution',
                            index: petIndex,
                            name: pet.name,
                            specie: pet.specie,
                            color: pet.color,
                            form: normalizePet(pet).form,
                            sprite: normalizePet(pet).sprite,
                            spriteSize: normalizePet(pet).spriteSize,
                            newForm: result.newForm.name,
                        });
                        telemetry.trackPokemonEvolved(pet.specie);
                        vscode.window.showInformationMessage(
                            `🎉 ${pet.name} evolved into ${result.newForm.name}!`,
                        );
                    } else {
                        // Stone had no effect — not consumed
                        webview.postMessage({ type: 'consumable_failed' });
                    }
                }
            }
            break;
        }
        case 'buy_consumable': {
            const itemId = message.consumableId as string;
            const consumable = ConsumablesMap.get(itemId);
            if (!consumable) { break; }
            const qty = Math.max(1, Math.floor(message.quantity ?? 1));
            const totalCost = consumable.price * qty;
            if (saveManager.save.money < totalCost) { break; }
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
        case 'add_plant': {
            const plantId = message.plantId as string;
            const plantType = PlantTypesMap.get(plantId);
            if (!plantType) { break; }
            const plantInstance: PlantInstance = {
                x: message.x as number ?? 0,
                y: message.y as number ?? 0,
                plantId,
                phase: 0,
                phaseStartTime: new Date().toISOString(),
            };
            saveManager.addPlant(plantInstance);
            telemetry.trackGoldSpent(plantType.price);
            break;
        }
        case 'move_plant':
            saveManager.movePlant(message.index, message.x, message.y);
            break;
        case 'remove_plant':
            saveManager.removePlant(message.index);
            break;
        case 'harvest_plant': {
            const harvestIndex = message.index as number;
            const plant = saveManager.save.plants[harvestIndex];
            if (!plant) { break; }
            const pType = PlantTypesMap.get(plant.plantId);
            if (!pType) { break; }
            const phase = getPlantPhase(plant, pType);
            const maxPhase = pType.growthHours.length - 1;
            if (phase < maxPhase) { break; } // Not ripe yet
            // Random fruit count
            const fruits = pType.minFruits + Math.floor(Math.random() * (pType.maxFruits - pType.minFruits + 1));
            const prevCount = saveManager.getConsumableCount(pType.producesId);
            saveManager.updateInventory(pType.producesId, prevCount + fruits);
            const produceName = ConsumablesMap.get(pType.producesId)?.name ?? pType.producesId;
            if (pType.harvestType === 'single') {
                // Single-harvest: remove the plant after harvesting
                saveManager.removePlant(harvestIndex);
                webview.postMessage({ type: 'destroy_plant', index: harvestIndex });
            } else {
                // Repeatable-harvest: reset to blossom phase (2) so it regrows fruit
                saveManager.updatePlantPhase(harvestIndex, 2);
                webview.postMessage({ type: 'update_plant', index: harvestIndex, phase: 2 });
            }
            webview.postMessage({ type: 'inventory', value: saveManager.save.inventory });
            webview.postMessage({ type: 'harvest_result', name: produceName, count: fruits });
            break;
        }
        case 'request_pokedex': {
            const pets = saveManager.save.pets.slice(0, MAX_SUMMONED_POKEMONS).map(p => ({
                name: p.name,
                specie: p.specie,
                sprite: p.sprite,
                spriteSize: p.spriteSize,
                candyFed: p.candyFed ?? 0,
                hp: p.hp ?? getMaxHp(p),
                stamina: p.stamina ?? getMaxStamina(p),
                maxHp: getMaxHp(p),
                maxStamina: getMaxStamina(p),
            }));
            webview.postMessage({ type: 'pokedex', value: pets });
            break;
        }
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

    // Only allow adding base forms (candyCost === 0); evolutions are earned in-game
    const baseForms = pokemonData.forms
        .map((form, idx) => ({ form, idx }))
        .filter(({ form }) => form.candyCost === 0);

    let formData: typeof pokemonData.forms[number];
    if (baseForms.length === 1) {
        formData = baseForms[0].form;
    } else {
        const formItems = baseForms.map(({ form, idx }) =>
            new PetItem(idx, form.name, 'Base form'),
        );
        const selectedForm = await vscode.window.showQuickPick(formItems, {
            title: `Select a form for ${pokemonData.name}`,
            placeHolder: 'Form',
        });
        if (selectedForm === undefined) { return; }
        formData = pokemonData.forms[selectedForm.index];
    }

    const tmpname = formData.name;
    const name = await vscode.window.showInputBox({
        title: 'Choose a name for your Pokémon',
        placeHolder: 'Name',
        value: tmpname,
        valueSelection: [0, tmpname.length],
        validateInput: text => {
            if (text === '') { return 'Please input a name for your Pokémon'; }
            if (text.length > 20) { return 'Max 20 characters'; }
            return null;
        },
    });
    if (name === undefined) { return; }

    const pet: Pet = {
        specie: pokemonData.name,
        name,
        color: generation,
        form: formData.name,
        sprite: formData.sprite,
        spriteSize: formData.spriteSize,
        candyFed: formData.candyCost,
    };

    // Initialize HP/Stamina at max for the pet's level
    pet.hp = getMaxHp(pet);
    pet.stamina = getMaxStamina(pet);

    // Initialize friendship to random neutral value (50–99)
    pet.friendship = 50 + Math.floor(Math.random() * 50);

    const added = saveManager.addPet(pet);
    if (!added) {
        vscode.window.showWarningMessage(
            `You can only summon up to ${MAX_SUMMONED_POKEMONS} Pokémon at once. Remove one first.`,
        );
        return;
    }

    loadPet(pet);
    telemetry.trackPokemonAdded(pokemonData.name);
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

async function exportSaveCommand(): Promise<void> {
    const saveJson = JSON.stringify(saveManager.save, null, 2);
    await vscode.env.clipboard.writeText(saveJson);
    vscode.window.showInformationMessage('Save data copied to clipboard!');
}

async function importSaveCommand(): Promise<void> {
    const confirm = await vscode.window.showWarningMessage(
        'This will replace your current save with data from the clipboard. Continue?',
        { modal: true },
        'Import',
    );
    if (confirm !== 'Import') { return; }

    const clipText = await vscode.env.clipboard.readText();
    try {
        const imported = JSON.parse(clipText);
        if (typeof imported !== 'object' || imported === null) {
            throw new Error('Invalid save format');
        }

        // Only accept known Save fields to prevent excess property injection
        const sanitized = new Save();
        if (typeof imported.money === 'number' && isFinite(imported.money)) {
            sanitized.money = Math.max(0, Math.floor(imported.money));
        }
        if (Array.isArray(imported.pets)) {
            sanitized.pets = imported.pets
                .filter((p: any) => typeof p === 'object' && p !== null && typeof p.name === 'string' && typeof p.specie === 'string')
                .slice(0, MAX_SUMMONED_POKEMONS)
                .map((p: any) => ({
                    name: String(p.name).slice(0, 20),
                    specie: String(p.specie),
                    color: typeof p.color === 'string' ? p.color : 'generation 1',
                    form: typeof p.form === 'string' ? p.form : undefined,
                    sprite: typeof p.sprite === 'string' ? p.sprite : undefined,
                    spriteSize: p.spriteSize === 48 ? 48 : 32,
                    candyFed: typeof p.candyFed === 'number' ? Math.min(Math.max(0, Math.floor(p.candyFed)), 100) : 0,
                    hp: typeof p.hp === 'number' ? Math.max(0, Math.floor(p.hp)) : undefined,
                    stamina: typeof p.stamina === 'number' ? Math.max(0, Math.floor(p.stamina)) : undefined,
                }));
        }
        if (Array.isArray(imported.decoration)) {
            sanitized.decoration = imported.decoration
                .filter((d: any) => typeof d === 'object' && d !== null && typeof d.category === 'string' && typeof d.name === 'string');
        }
        if (Array.isArray(imported.plants)) {
            sanitized.plants = imported.plants
                .filter((p: any) => typeof p === 'object' && p !== null && typeof p.plantId === 'string' && PlantTypesMap.has(p.plantId))
                .map((p: any) => ({
                    x: typeof p.x === 'number' ? p.x : 0,
                    y: typeof p.y === 'number' ? p.y : 0,
                    plantId: p.plantId,
                    phase: typeof p.phase === 'number' ? Math.min(Math.max(0, Math.floor(p.phase)), 4) : 0,
                    phaseStartTime: typeof p.phaseStartTime === 'string' ? p.phaseStartTime : new Date().toISOString(),
                }));
        }
        if (typeof imported.inventory === 'object' && imported.inventory !== null && !Array.isArray(imported.inventory)) {
            for (const [key, val] of Object.entries(imported.inventory)) {
                if (typeof val === 'number' && val > 0 && isFinite(val)) {
                    sanitized.inventory[key] = Math.floor(val);
                }
            }
        }
        if (typeof imported.streak === 'object' && imported.streak !== null && !Array.isArray(imported.streak)) {
            sanitized.streak = {
                currentStreak: typeof imported.streak.currentStreak === 'number' ? Math.max(0, Math.floor(imported.streak.currentStreak)) : 0,
                lastClaimDate: typeof imported.streak.lastClaimDate === 'string' ? imported.streak.lastClaimDate : '',
                longestStreak: typeof imported.streak.longestStreak === 'number' ? Math.max(0, Math.floor(imported.streak.longestStreak)) : 0,
                totalRewardsClaimed: typeof imported.streak.totalRewardsClaimed === 'number' ? Math.max(0, Math.floor(imported.streak.totalRewardsClaimed)) : 0,
            };
        }
        if (typeof imported.telemetry === 'object' && imported.telemetry !== null && !Array.isArray(imported.telemetry)) {
            sanitized.telemetry = imported.telemetry;
        }
        if (typeof imported.autoFeed === 'boolean') {
            sanitized.autoFeed = imported.autoFeed;
        }

        saveManager.save = sanitized;
        saveManager.saveGame();
        saveManager.loadGame();
        syncAutoFeedState();

        webview.postMessage({ type: 'reset' });
        initGame();
        vscode.window.showInformationMessage('Save imported successfully! 🎉');
    } catch {
        vscode.window.showErrorMessage('Failed to import save — invalid JSON or format.');
    }
}

function showStatsCommand(): void {
    if (!telemetry.isEnabled()) {
        vscode.window.showInformationMessage(
            'Telemetry is disabled. Enable it in settings: pokemon-pets.telemetry',
        );
        return;
    }
    const summary = telemetry.getSummary();
    const streak = streakService.getData();
    const fullSummary = summary + `\nCoding streak: ${streak.currentStreak} days (best: ${streak.longestStreak})`;
    vscode.window.showInformationMessage(fullSummary, { modal: true });
}

// ── Activation / Deactivation ───────────────────────────────────────────

export function activate(context: vscode.ExtensionContext): void {
    console.log('Pokemon Pets is now active 😽');

    // Initialize save manager
    saveManager = new SaveManager(context.globalStorageUri.fsPath);
    saveManager.loadGame();
    syncAutoFeedState();

    // Initialize services
    const telemetryEnabled = config.get<boolean>('telemetry', false);
    telemetry = new TelemetryService(saveManager, telemetryEnabled);
    evolution = new EvolutionService(saveManager);
    streakService = new StreakService(saveManager);

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
    webview = new WebViewProvider(context);
    webview.setMessageHandler(handleWebviewMessage);
    webview.setVisibilityHandler(() => {
        if (config.get<boolean>('dayNightCycle', true)) {
            sendDayNightTint();
        }
    });
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(WebViewProvider.viewType, webview),
    );

    // Start day/night cycle timer
    if (config.get<boolean>('dayNightCycle', true)) {
        startDayNightTimer();
    }

    // Start stamina drain timer
    startStaminaDrainTimer();

    // Start plant growth tick timer (every 60s)
    startPlantTickTimer();

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
            telemetry.setEnabled(config.get<boolean>('telemetry', false));
        }
        if (event.affectsConfiguration('pokemon-pets.dayNightCycle')) {
            if (config.get<boolean>('dayNightCycle', true)) {
                sendDayNightTint();
                startDayNightTimer();
            } else {
                stopDayNightTimer();
                webview.postMessage({ type: 'day_night', timeOfDay: 'day', opacity: 0 });
            }
        }
    }));

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('pokemon-pets.addPet', addPetCommand),
        vscode.commands.registerCommand('pokemon-pets.removePet', removePetCommand),
        vscode.commands.registerCommand('pokemon-pets.toggleAutoFeed', () => {
            autoFeedEnabled = !autoFeedEnabled;
            saveManager.save.autoFeed = autoFeedEnabled;
            saveManager.scheduleSave();
            vscode.commands.executeCommand('setContext', 'pokemon-pets.autoFeedOn', autoFeedEnabled);
            vscode.window.showInformationMessage(`Auto Feed: ${autoFeedEnabled ? 'ON' : 'OFF'}`);
        }),
        vscode.commands.registerCommand('pokemon-pets.toggleAutoFeedOff', () => {
            autoFeedEnabled = !autoFeedEnabled;
            saveManager.save.autoFeed = autoFeedEnabled;
            saveManager.scheduleSave();
            vscode.commands.executeCommand('setContext', 'pokemon-pets.autoFeedOn', autoFeedEnabled);
            vscode.window.showInformationMessage(`Auto Feed: ${autoFeedEnabled ? 'ON' : 'OFF'}`);
        }),
        vscode.commands.registerCommand('pokemon-pets.actions', () => {
            webview.postMessage({ type: 'actions' });
        }),
        vscode.commands.registerCommand('pokemon-pets.toggleTopBar', () => {
            webview.postMessage({ type: 'toggle_topbar' });
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
        vscode.commands.registerCommand('pokemon-pets.exportSave', exportSaveCommand),
        vscode.commands.registerCommand('pokemon-pets.importSave', importSaveCommand),
        vscode.commands.registerCommand('pokemon-pets.showStats', showStatsCommand),
    );
}

export function deactivate(): void {
    saveManager.flushSave();
    stopDayNightTimer();
    stopStaminaDrainTimer();
    stopPlantTickTimer();
    console.log('Pokemon Pets is now deactivated 😿');
}
