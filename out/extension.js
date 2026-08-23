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
const coding_rewards_1 = require("./coding-rewards");
const auto_harvest_1 = require("./auto-harvest");
let config = vscode.workspace.getConfiguration('pokemon-pets');
let webview;
let saveManager;
let telemetry;
let evolution;
let streakService;
let rewardsTracker;
let unifiedTickInterval;
let unifiedTickCounter = 0;
let dayNightEnabled = false;
let autoFeedEnabled = false;
function syncAutoFeedState() {
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
const ConsumablesMap = new Map(game_data_1.Consumables.map(c => [c.id, c]));
/** Pre-built map for O(1) plant-type lookups by ID. */
const PlantTypesMap = new Map(game_data_1.PlantTypes.map(p => [p.id, p]));
/** Max friendship value. */
const MAX_FRIENDSHIP = 255;
/** Reads coding-reward settings from VS Code configuration. */
function getRewardsConfig() {
    const cfg = vscode.workspace.getConfiguration('pokemon-pets.rewards');
    return {
        enabled: cfg.get('enabled', true),
        saveGold: cfg.get('saveGold', 2),
        savesPerFriendship: cfg.get('savesPerFriendship', 10),
        saveCooldownSeconds: cfg.get('saveCooldownSeconds', 120),
        pushGold: cfg.get('pushGold', 200),
        pushCandy: cfg.get('pushCandy', 1),
        pushFriendship: cfg.get('pushFriendship', 5),
    };
}
/**
 * Increase a pet's friendship by the given amount, clamped to [0, 255].
 * Saves automatically.
 */
function addFriendship(petIndex, amount) {
    const pet = saveManager.save.pets[petIndex];
    if (!pet) {
        return;
    }
    pet.friendship = Math.min(MAX_FRIENDSHIP, (pet.friendship ?? 0) + amount);
    saveManager.scheduleSave();
}
// ── Coding Activity Rewards ─────────────────────────────────────────────
/** Applies a coding-reward event: distributes gold, friendship, and optional candy. */
function applyReward(reward) {
    if (reward.gold > 0) {
        saveManager.save.money += reward.gold;
        telemetry.trackGoldEarned(reward.gold);
        webview.postMessage({ type: 'money', value: saveManager.save.money });
    }
    for (const [idx, amount] of reward.friendship) {
        addFriendship(idx, amount);
        checkAndHandleHeldItemEvolution(idx);
    }
    if (reward.candyPetIndex >= 0 && reward.candyPetIndex < saveManager.save.pets.length) {
        const pet = saveManager.save.pets[reward.candyPetIndex];
        if (pet) {
            const oldMaxHp = (0, models_1.getMaxHp)(pet);
            const oldMaxStamina = (0, models_1.getMaxStamina)(pet);
            const result = evolution.feedCandy(reward.candyPetIndex);
            const newMaxHp = (0, models_1.getMaxHp)(pet);
            const newMaxStamina = (0, models_1.getMaxStamina)(pet);
            const hpGain = newMaxHp - oldMaxHp;
            const staminaGain = newMaxStamina - oldMaxStamina;
            if (hpGain > 0 || staminaGain > 0) {
                saveManager.updatePetStats(reward.candyPetIndex, Math.min(newMaxHp, (pet.hp ?? oldMaxHp) + hpGain), Math.min(newMaxStamina, (pet.stamina ?? oldMaxStamina) + staminaGain));
            }
            if (result.evolved && result.newForm) {
                const { form, sprite, spriteSize } = (0, models_1.normalizePet)(pet);
                webview.postMessage({
                    type: 'evolution',
                    index: reward.candyPetIndex,
                    name: pet.name, specie: pet.specie, color: pet.color,
                    form, sprite, spriteSize,
                    newForm: result.newForm.name,
                });
                telemetry.trackPokemonEvolved(pet.specie);
                refreshPokedex();
            }
            webview.postMessage({ type: 'pet_stats', value: buildPetStats() });
        }
    }
    saveManager.scheduleSave();
}
/** Watches the built-in Git extension for push events. */
function watchGitPushes(context) {
    const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
    if (!gitExtension) {
        return;
    }
    const git = gitExtension.getAPI(1);
    if (!git) {
        return;
    }
    // Track HEAD commit per repo to detect pushes
    const lastHeadMap = new Map();
    for (const repo of git.repositories) {
        lastHeadMap.set(repo.rootUri.toString(), repo.state?.HEAD?.commit);
        const disposable = repo.state?.onDidChange(() => {
            const newHead = repo.state?.HEAD?.commit;
            const key = repo.rootUri.toString();
            const oldHead = lastHeadMap.get(key);
            if (oldHead && newHead && oldHead !== newHead) {
                // HEAD changed — treat as push
                const cfg = getRewardsConfig();
                const reward = rewardsTracker.onGitPush(saveManager.save.pets.length, cfg);
                if (reward) {
                    applyReward(reward);
                    vscode.window.showInformationMessage(`🎉 Git commit! Your Pokémon earned ${cfg.pushGold}g${cfg.pushCandy > 0 ? ' + candy' : ''}.`);
                }
            }
            lastHeadMap.set(key, newHead);
        });
        if (disposable) {
            context.subscriptions.push(disposable);
        }
    }
}
// ── Game Initialization ─────────────────────────────────────────────────
function initGame() {
    webview.postMessage({ type: 'background', value: config.get('background') });
    webview.postMessage({ type: 'scale', value: config.get('scale') });
    webview.postMessage({ type: 'menu_scale', value: config.get('menuScale') });
    webview.postMessage({ type: 'filter', value: config.get('filter') });
    webview.postMessage({ type: 'wild_pokemons', value: config.get('wild') });
    webview.postMessage({ type: 'money', value: saveManager.save.money });
    webview.postMessage({ type: 'inventory', value: saveManager.save.inventory });
    // Send day/night tint
    if (config.get('dayNightCycle', true)) {
        sendDayNightTint();
    }
    for (const pet of saveManager.save.pets.slice(0, saveManager.maxPokemon)) {
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
function loadPlant(plant, index) {
    const plantType = PlantTypesMap.get(plant.plantId);
    if (!plantType) {
        return;
    }
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
        mulch: plant.mulch ?? null,
    });
}
/** Calculates a plant's current visual phase (0–4) based on elapsed time. */
function getPlantPhase(plant, plantType) {
    const elapsedMs = Date.now() - new Date(plant.phaseStartTime).getTime();
    const elapsedHours = elapsedMs / 3_600_000;
    const maxPhase = plantType.growthHours.length - 1;
    const growthMultiplier = plant.mulch === 'growth_mulch' ? 0.75 : 1;
    let phase = Math.min(plant.phase, maxPhase);
    let hoursConsumed = 0;
    while (phase < maxPhase) {
        const needed = plantType.growthHours[phase] * growthMultiplier;
        if (hoursConsumed + needed > elapsedHours) {
            break;
        }
        hoursConsumed += needed;
        phase++;
    }
    return phase;
}
// Plants no longer wilt — harvest window disabled
// const HARVEST_WINDOW_HOURS = 12;
/** Advances all plants to their correct phase and notifies the webview. */
function tickPlants() {
    const plants = saveManager.save.plants;
    if (plants.length === 0) {
        return;
    }
    // Process in reverse so removals don't shift indices
    for (let i = plants.length - 1; i >= 0; i--) {
        const plant = plants[i];
        const plantType = PlantTypesMap.get(plant.plantId);
        if (!plantType) {
            continue;
        }
        const currentPhase = getPlantPhase(plant, plantType);
        if (currentPhase !== plant.phase) {
            saveManager.updatePlantPhase(i, currentPhase);
            webview.postMessage({ type: 'update_plant', index: i, phase: currentPhase });
        }
        // Expire growth_mulch after 1 hour
        if (plant.mulch === 'growth_mulch' && plant.mulchAppliedAt) {
            const mulchElapsed = Date.now() - new Date(plant.mulchAppliedAt).getTime();
            if (mulchElapsed >= 3_600_000) {
                plant.mulch = undefined;
                plant.mulchAppliedAt = undefined;
                saveManager.scheduleSave();
                webview.postMessage({ type: 'clear_mulch', index: i });
            }
        }
        // Auto Feed also auto-harvests plants after a five-minute manual-harvest window.
        if (autoFeedEnabled && (0, auto_harvest_1.isReadyForAutoHarvest)(plant, plantType.growthHours.length - 1)) {
            harvestPlant(i);
        }
        // Plants no longer wilt — ripe plants stay forever
        // const maxPhase = plantType.growthHours.length - 1;
        // if (currentPhase >= maxPhase) {
        //     const windowMultiplier = plant.mulch === 'stable_mulch' ? 2 : 1;
        //     const harvestWindowMs = HARVEST_WINDOW_HOURS * windowMultiplier * 3_600_000;
        //     const elapsedSincePhaseStart = Date.now() - new Date(plant.phaseStartTime).getTime();
        //     if (elapsedSincePhaseStart > harvestWindowMs) {
        //         saveManager.removePlant(i);
        //         webview.postMessage({ type: 'destroy_plant', index: i });
        //     }
        // }
    }
}
/** Harvests a ripe plant. Returns false when the index is invalid or the plant is not ready. */
function harvestPlant(harvestIndex) {
    const plant = saveManager.save.plants[harvestIndex];
    if (!plant) {
        return false;
    }
    const plantType = PlantTypesMap.get(plant.plantId);
    if (!plantType) {
        return false;
    }
    const phase = getPlantPhase(plant, plantType);
    const maxPhase = plantType.growthHours.length - 1;
    if (phase < maxPhase) {
        return false;
    }
    let fruits = plantType.minFruits + Math.floor(Math.random() * (plantType.maxFruits - plantType.minFruits + 1));
    if (plant.mulch === 'damp_mulch') {
        fruits += 1;
    }
    const prevCount = saveManager.getConsumableCount(plantType.producesId);
    saveManager.updateInventory(plantType.producesId, prevCount + fruits);
    const produceName = ConsumablesMap.get(plantType.producesId)?.name ?? plantType.producesId;
    if (plantType.harvestType === 'single') {
        if (plant.mulch === 'gooey_mulch') {
            plant.mulch = undefined;
            plant.mulchAppliedAt = undefined;
            saveManager.updatePlantPhase(harvestIndex, 2);
            webview.postMessage({ type: 'update_plant', index: harvestIndex, phase: 2 });
            webview.postMessage({ type: 'clear_mulch', index: harvestIndex });
        }
        else {
            saveManager.removePlant(harvestIndex);
            webview.postMessage({ type: 'destroy_plant', index: harvestIndex });
        }
    }
    else {
        saveManager.updatePlantPhase(harvestIndex, 2);
        webview.postMessage({ type: 'update_plant', index: harvestIndex, phase: 2 });
    }
    if (plant.mulch === 'damp_mulch') {
        plant.mulch = undefined;
        plant.mulchAppliedAt = undefined;
        saveManager.scheduleSave();
        webview.postMessage({ type: 'clear_mulch', index: harvestIndex });
    }
    webview.postMessage({ type: 'inventory', value: saveManager.save.inventory });
    webview.postMessage({ type: 'harvest_result', name: produceName, count: fruits });
    return true;
}
// ── Day/Night Cycle ─────────────────────────────────────────────────────
function sendDayNightTint() {
    const timeOfDay = day_night_1.DayNightCycle.getTimeOfDay();
    const opacity = day_night_1.DayNightCycle.getOverlayOpacity(timeOfDay);
    webview.postMessage({ type: 'day_night', timeOfDay, opacity });
}
function startDayNightTimer() {
    dayNightEnabled = true;
    ensureUnifiedTick();
}
function stopDayNightTimer() {
    dayNightEnabled = false;
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
    // Auto-feed pets that are low
    if (autoFeedEnabled) {
        autoFeedPets();
    }
    // Broadcast updated stats once (after auto-feed, so we include any heals)
    webview.postMessage({ type: 'pet_stats', value: buildPetStats() });
}
/** Auto-feeds pets at ≤25% HP or stamina using cheapest available food, then potions. */
function autoFeedPets() {
    const pets = saveManager.save.pets;
    if (pets.length === 0) {
        return;
    }
    // Build sorted list of food/potion consumables the player owns, cheapest first
    const healItems = game_data_1.Consumables
        .filter(c => (c.category === 'food' || c.category === 'potion') && saveManager.getConsumableCount(c.id) > 0)
        .sort((a, b) => ((a.restoreHp ?? 0) + (a.restoreStamina ?? 0)) - ((b.restoreHp ?? 0) + (b.restoreStamina ?? 0)));
    if (healItems.length === 0) {
        return;
    }
    let inventoryChanged = false;
    for (let i = 0; i < pets.length; i++) {
        const pet = pets[i];
        const maxHp = (0, models_1.getMaxHp)(pet);
        const maxStamina = (0, models_1.getMaxStamina)(pet);
        const hp = pet.hp ?? maxHp;
        const stamina = pet.stamina ?? maxStamina;
        const hpPct = maxHp > 0 ? hp / maxHp : 1;
        const staPct = maxStamina > 0 ? stamina / maxStamina : 1;
        // Only auto-feed when ≤25%
        if (hpPct > 0.25 && staPct > 0.25) {
            continue;
        }
        // Try each available consumable (cheapest first)
        for (const consumable of healItems) {
            const count = saveManager.getConsumableCount(consumable.id);
            if (count <= 0) {
                continue;
            }
            const canHealHp = (consumable.restoreHp ?? 0) > 0 && hp < maxHp;
            const canHealSta = (consumable.restoreStamina ?? 0) > 0 && stamina < maxStamina;
            if (!canHealHp && !canHealSta) {
                continue;
            }
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
        // pet_stats is sent by drainStamina after autoFeedPets returns
    }
}
/** Builds an array of { hp, stamina, maxHp, maxStamina } for each pet. */
function buildPetStats() {
    return saveManager.save.pets.slice(0, saveManager.maxPokemon).map(p => ({
        hp: p.hp ?? (0, models_1.getMaxHp)(p),
        stamina: p.stamina ?? (0, models_1.getMaxStamina)(p),
        maxHp: (0, models_1.getMaxHp)(p),
        maxStamina: (0, models_1.getMaxStamina)(p),
    }));
}
/** Sends fresh pokédex data to the webview. */
function refreshPokedex() {
    webview.postMessage({ type: 'pokedex', value: saveManager.save.pets.slice(0, saveManager.maxPokemon).map(p => ({
            name: p.name, specie: p.specie, sprite: p.sprite, spriteSize: p.spriteSize,
            candyFed: p.candyFed ?? 0, friendship: p.friendship ?? 0,
            hp: p.hp ?? (0, models_1.getMaxHp)(p), stamina: p.stamina ?? (0, models_1.getMaxStamina)(p),
            maxHp: (0, models_1.getMaxHp)(p), maxStamina: (0, models_1.getMaxStamina)(p),
            heldItem: p.heldItem,
        })) });
}
/**
 * Checks held-item evolution for a pet and handles the result
 * (evolution animation, messages, etc.). Called after friendship changes.
 */
function checkAndHandleHeldItemEvolution(petIndex) {
    const result = evolution.checkHeldItemEvolution(petIndex);
    if (result.evolved && result.newForm) {
        const pet = saveManager.save.pets[petIndex];
        const { form, sprite, spriteSize } = (0, models_1.normalizePet)(pet);
        webview.postMessage({
            type: 'evolution',
            index: petIndex,
            name: pet.name,
            specie: pet.specie,
            color: pet.color,
            form, sprite, spriteSize,
            newForm: result.newForm.name,
        });
        telemetry.trackPokemonEvolved(pet.specie);
        refreshPokedex();
        vscode.window.showInformationMessage(`🎉 ${pet.name} evolved into ${result.newForm.name}!`);
    }
}
// ── Unified Tick (single 60s interval for all periodic tasks) ───────────
/** How many unified ticks between stamina drains (6 × 60s = 360s). */
const STAMINA_DRAIN_TICKS = STAMINA_DRAIN_INTERVAL_MS / 60_000;
/** Ensures the single unified interval is running. */
function ensureUnifiedTick() {
    if (unifiedTickInterval !== undefined) {
        return;
    }
    unifiedTickCounter = 0;
    unifiedTickInterval = setInterval(() => {
        unifiedTickCounter++;
        // Day/night update (every tick = 60s)
        if (dayNightEnabled) {
            sendDayNightTint();
        }
        // Plant growth check (every tick = 60s)
        tickPlants();
        // Stamina drain (every STAMINA_DRAIN_TICKS ticks)
        if (unifiedTickCounter % STAMINA_DRAIN_TICKS === 0) {
            drainStamina();
        }
    }, 60_000);
}
function stopUnifiedTick() {
    if (unifiedTickInterval !== undefined) {
        clearInterval(unifiedTickInterval);
        unifiedTickInterval = undefined;
    }
}
// ── Webview Message Handler ─────────────────────────────────────────────
async function handleWebviewMessage(message) {
    if (typeof message?.type !== 'string') {
        return;
    }
    try {
        switch (message.type.toLowerCase()) {
            case 'error':
                if (typeof message.text === 'string') {
                    vscode.window.showErrorMessage(message.text.slice(0, 200));
                }
                break;
            case 'info':
                if (typeof message.text === 'string') {
                    vscode.window.showInformationMessage(message.text.slice(0, 200));
                }
                break;
            case 'init':
                initGame();
                break;
            case 'money': {
                const oldMoney = saveManager.save.money;
                const newMoney = message.value;
                if (typeof newMoney !== 'number' || !Number.isFinite(newMoney) || newMoney < 0) {
                    break;
                }
                // Cap single transaction delta to prevent exploits
                const maxDelta = 100_000;
                const delta = newMoney - oldMoney;
                const clampedMoney = delta > maxDelta ? oldMoney + maxDelta : newMoney;
                saveManager.updateMoney(clampedMoney);
                const diff = clampedMoney - oldMoney;
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
                const ballPetIndex = message.index;
                if (typeof ballPetIndex === 'number' && ballPetIndex >= 0 && ballPetIndex < saveManager.save.pets.length) {
                    addFriendship(ballPetIndex, 0.5);
                    // Check if held item evolution triggers from friendship gain
                    checkAndHandleHeldItemEvolution(ballPetIndex);
                }
                break;
            }
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
                    if (typeof petIndex === 'number' && petIndex >= 0 && petIndex < saveManager.save.pets.length) {
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
                                const { form, sprite, spriteSize } = (0, models_1.normalizePet)(pet);
                                webview.postMessage({
                                    type: 'evolution',
                                    index: petIndex,
                                    name: pet.name,
                                    specie: pet.specie,
                                    color: pet.color,
                                    form,
                                    sprite,
                                    spriteSize,
                                    newForm: result.newForm.name,
                                });
                                telemetry.trackPokemonEvolved(pet.specie);
                                vscode.window.showInformationMessage(`🎉 ${pet.name} evolved into ${result.newForm.name}!`);
                            }
                        }
                    }
                }
                else {
                    // Look up consumable to determine category
                    const consumable = ConsumablesMap.get(consumableId);
                    if (!consumable) {
                        break;
                    }
                    if (consumable.category === 'food' || consumable.category === 'potion') {
                        // Food/potion: restores HP and/or stamina
                        if (typeof petIndex !== 'number' || petIndex < 0 || petIndex >= saveManager.save.pets.length) {
                            break;
                        }
                        const pet = saveManager.save.pets[petIndex];
                        if (!pet) {
                            break;
                        }
                        const maxHp = (0, models_1.getMaxHp)(pet);
                        const maxStamina = (0, models_1.getMaxStamina)(pet);
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
                            // Check if held item evolution triggers from friendship gain
                            checkAndHandleHeldItemEvolution(petIndex);
                        }
                    }
                    else {
                        // Evolution stones: consumed if evolution succeeds, or equipped as held item
                        if (typeof petIndex !== 'number' || petIndex < 0 || petIndex >= saveManager.save.pets.length) {
                            break;
                        }
                        const pet = saveManager.save.pets[petIndex];
                        // If the pet already holds an item, don't overwrite it
                        if (pet.heldItem) {
                            webview.postMessage({ type: 'consumable_failed' });
                            break;
                        }
                        const result = evolution.useItem(petIndex, consumableId);
                        if (result.evolved && result.newForm) {
                            saveManager.updateInventory(consumableId, currentCount - 1);
                            webview.postMessage({ type: 'inventory', value: saveManager.save.inventory });
                            const { form, sprite, spriteSize } = (0, models_1.normalizePet)(pet);
                            webview.postMessage({
                                type: 'evolution',
                                index: petIndex,
                                name: pet.name,
                                specie: pet.specie,
                                color: pet.color,
                                form,
                                sprite,
                                spriteSize,
                                newForm: result.newForm.name,
                            });
                            telemetry.trackPokemonEvolved(pet.specie);
                            vscode.window.showInformationMessage(`🎉 ${pet.name} evolved into ${result.newForm.name}!`);
                        }
                        else if (result.equipped) {
                            // Item equipped as held item — consume from inventory
                            saveManager.updateInventory(consumableId, currentCount - 1);
                            webview.postMessage({ type: 'inventory', value: saveManager.save.inventory });
                            refreshPokedex();
                            vscode.window.showInformationMessage(`${pet.name} is now holding ${consumable.name}.`);
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
                if (typeof itemId !== 'string') {
                    break;
                }
                const consumable = ConsumablesMap.get(itemId);
                if (!consumable) {
                    break;
                }
                const rawQty = message.quantity ?? 1;
                if (typeof rawQty !== 'number' || !Number.isFinite(rawQty)) {
                    break;
                }
                const qty = Math.max(1, Math.min(100, Math.floor(rawQty)));
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
            case 'sell_consumable': {
                const sellId = message.consumableId;
                if (typeof sellId !== 'string') {
                    break;
                }
                const sellItem = ConsumablesMap.get(sellId);
                if (!sellItem) {
                    break;
                }
                const rawSellQty = message.quantity ?? 1;
                if (typeof rawSellQty !== 'number' || !Number.isFinite(rawSellQty)) {
                    break;
                }
                const sellQty = Math.max(1, Math.floor(rawSellQty));
                const owned = saveManager.getConsumableCount(sellId);
                const actualQty = Math.min(sellQty, owned);
                if (actualQty <= 0) {
                    break;
                }
                const sellPrice = Math.floor(sellItem.price * 0.7) * actualQty;
                saveManager.updateInventory(sellId, owned - actualQty);
                saveManager.updateMoney(saveManager.save.money + sellPrice);
                webview.postMessage({ type: 'money', value: saveManager.save.money });
                webview.postMessage({ type: 'inventory', value: saveManager.save.inventory });
                telemetry.trackGoldEarned(sellPrice);
                break;
            }
            case 'move_decor':
                if (typeof message.index === 'number' && Number.isInteger(message.index) && message.index >= 0
                    && typeof message.x === 'number' && Number.isFinite(message.x)
                    && typeof message.y === 'number' && Number.isFinite(message.y)) {
                    saveManager.moveDecor(message.index, message.x, message.y);
                }
                break;
            case 'add_decor':
                if (typeof message.x === 'number' && Number.isFinite(message.x)
                    && typeof message.y === 'number' && Number.isFinite(message.y)
                    && typeof message.category === 'string' && typeof message.name === 'string') {
                    saveManager.addDecor({
                        x: message.x,
                        y: message.y,
                        category: message.category,
                        name: message.name,
                    });
                    telemetry.trackDecorationPlaced();
                }
                break;
            case 'remove_decor':
                if (typeof message.index === 'number' && Number.isInteger(message.index) && message.index >= 0) {
                    saveManager.removeDecor(message.index);
                }
                break;
            case 'add_plant': {
                const plantId = message.plantId;
                const plantType = PlantTypesMap.get(plantId);
                if (!plantType) {
                    break;
                }
                const plantInstance = {
                    x: message.x ?? 0,
                    y: message.y ?? 0,
                    plantId,
                    phase: 0,
                    phaseStartTime: new Date().toISOString(),
                };
                saveManager.addPlant(plantInstance);
                telemetry.trackGoldSpent(plantType.price);
                break;
            }
            case 'move_plant':
                if (typeof message.index === 'number' && Number.isInteger(message.index) && message.index >= 0
                    && typeof message.x === 'number' && Number.isFinite(message.x)
                    && typeof message.y === 'number' && Number.isFinite(message.y)) {
                    saveManager.movePlant(message.index, message.x, message.y);
                }
                break;
            case 'remove_plant':
                if (typeof message.index === 'number' && Number.isInteger(message.index) && message.index >= 0) {
                    saveManager.removePlant(message.index);
                }
                break;
            case 'harvest_plant': {
                const harvestIndex = message.index;
                if (typeof harvestIndex === 'number' && Number.isInteger(harvestIndex) && harvestIndex >= 0) {
                    harvestPlant(harvestIndex);
                }
                break;
            }
            case 'apply_mulch': {
                const mulchId = message.mulchId;
                const mulchItem = ConsumablesMap.get(mulchId);
                if (mulchItem?.category !== 'mulch') {
                    break;
                }
                const mulchCount = saveManager.getConsumableCount(mulchId);
                if (mulchCount <= 0) {
                    break;
                }
                const plantIdx = message.index;
                const targetPlant = saveManager.save.plants[plantIdx];
                if (!targetPlant) {
                    break;
                }
                if (targetPlant.mulch) {
                    // Plant already has mulch applied
                    webview.postMessage({ type: 'consumable_failed' });
                    break;
                }
                // Restrict gooey_mulch to single-harvest plants (regrow makes no sense for repeatable)
                const targetPlantType = PlantTypesMap.get(targetPlant.plantId);
                if (mulchId === 'gooey_mulch' &&
                    targetPlantType && targetPlantType.harvestType !== 'single') {
                    webview.postMessage({ type: 'show_message', text: 'Gooey Mulch only works on single-harvest plants.' });
                    break;
                }
                // Consume mulch and apply to plant
                saveManager.updateInventory(mulchId, mulchCount - 1);
                targetPlant.mulch = mulchId;
                targetPlant.mulchAppliedAt = new Date().toISOString();
                saveManager.scheduleSave();
                webview.postMessage({ type: 'inventory', value: saveManager.save.inventory });
                webview.postMessage({ type: 'set_mulch', index: plantIdx, mulch: mulchId });
                webview.postMessage({ type: 'show_message', text: `Applied ${mulchItem.name}!` });
                break;
            }
            case 'request_rename_pet':
                renamePetCommand();
                break;
            case 'request_rename_specific_pet': {
                const petIdx = message.index;
                const pet = saveManager.save.pets[petIdx];
                if (!pet) {
                    break;
                }
                const newName = await vscode.window.showInputBox({
                    title: 'Rename Pokémon',
                    prompt: `Rename ${pet.name}`,
                    value: pet.name,
                    validateInput: (v) => v.trim().length === 0 ? 'Name cannot be empty' : undefined,
                });
                if (!newName) {
                    break;
                }
                const trimmed = newName.trim();
                pet.name = trimmed;
                saveManager.scheduleSave();
                webview.postMessage({ type: 'rename_pet', index: petIdx, name: trimmed });
                // Refresh pokédex to show updated name
                refreshPokedex();
                break;
            }
            case 'request_pokedex': {
                refreshPokedex();
                break;
            }
            case 'unequip_item': {
                const uIdx = message.index;
                if (typeof uIdx !== 'number' || uIdx < 0 || uIdx >= saveManager.save.pets.length) {
                    break;
                }
                const uPet = saveManager.save.pets[uIdx];
                if (!uPet?.heldItem) {
                    break;
                }
                const returnedItem = uPet.heldItem;
                const prevCount = saveManager.getConsumableCount(returnedItem);
                saveManager.updateInventory(returnedItem, prevCount + 1);
                uPet.heldItem = undefined;
                saveManager.scheduleSave();
                webview.postMessage({ type: 'inventory', value: saveManager.save.inventory });
                refreshPokedex();
                const itemInfo = ConsumablesMap.get(returnedItem);
                vscode.window.showInformationMessage(`${uPet.name} dropped ${itemInfo?.name ?? returnedItem}. Returned to backpack.`);
                break;
            }
        }
    }
    catch (err) {
        console.error('[Pokemon Pets] Error handling webview message:', err);
    }
}
// ── Commands ────────────────────────────────────────────────────────────
async function addPetCommand() {
    if (saveManager.save.pets.length >= saveManager.maxPokemon) {
        vscode.window.showWarningMessage(`You can only summon up to ${saveManager.maxPokemon} Pokémon at once. Remove one first.`);
        return;
    }
    const generation = await vscode.window.showQuickPick(Object.keys(game_data_1.Pokemons), {
        title: 'Select a Pokémon generation',
        placeHolder: 'Generation',
    });
    if (generation === undefined) {
        return;
    }
    // Menu of selection Pokémon species, showing number of evolutions
    const pokemonItems = game_data_1.Pokemons[generation].map((poke, idx) => new models_1.PetItem(idx, poke.name, `${poke.forms.length} Possible Evolutions`));
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
        validateInput: text => {
            if (text === '') {
                return 'Please input a name for your Pokémon';
            }
            if (text.length > 20) {
                return 'Max 20 characters';
            }
            return null;
        },
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
    // Initialize friendship to random neutral value (50–99)
    pet.friendship = 50 + Math.floor(Math.random() * 50);
    const added = saveManager.addPet(pet);
    if (!added) {
        vscode.window.showWarningMessage(`You can only summon up to ${saveManager.maxPokemon} Pokémon at once. Remove one first.`);
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
async function renamePetCommand() {
    const pets = saveManager.save.pets;
    if (pets.length === 0) {
        vscode.window.showInformationMessage('No Pokémon to rename.');
        return;
    }
    const items = pets.map((pet, i) => new models_1.PetItem(i, pet.name, `${pet.color} ${pet.form ?? pet.specie}`));
    const selected = await vscode.window.showQuickPick(items, {
        title: 'Select a Pokémon to rename',
        placeHolder: 'Pokémon',
        matchOnDescription: true,
    });
    if (selected === undefined) {
        return;
    }
    const newName = await vscode.window.showInputBox({
        title: 'New name',
        prompt: `Rename ${selected.label}`,
        value: selected.label,
        validateInput: (v) => v.trim().length === 0 ? 'Name cannot be empty' : undefined,
    });
    if (!newName) {
        return;
    }
    const trimmed = newName.trim();
    pets[selected.index].name = trimmed;
    saveManager.scheduleSave();
    webview.postMessage({ type: 'rename_pet', index: selected.index, name: trimmed });
    vscode.window.showInformationMessage(`Renamed to ${trimmed}!`);
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
    let clipText;
    try {
        clipText = await vscode.env.clipboard.readText();
    }
    catch {
        vscode.window.showErrorMessage('Failed to read clipboard.');
        return;
    }
    try {
        const imported = JSON.parse(clipText);
        if (typeof imported !== 'object' || imported === null) {
            throw new Error('Invalid save format');
        }
        // Only accept known Save fields to prevent excess property injection
        const sanitized = new models_1.Save();
        if (typeof imported.money === 'number' && Number.isFinite(imported.money)) {
            sanitized.money = Math.max(0, Math.floor(imported.money));
        }
        if (Array.isArray(imported.pets)) {
            sanitized.pets = imported.pets
                .filter((p) => typeof p === 'object' && p !== null && typeof p.name === 'string' && typeof p.specie === 'string')
                .slice(0, saveManager.maxPokemon)
                .map((p) => ({
                name: String(p.name).slice(0, 20),
                specie: String(p.specie),
                color: typeof p.color === 'string' ? p.color : 'generation 1',
                form: typeof p.form === 'string' ? p.form : undefined,
                sprite: typeof p.sprite === 'string' ? p.sprite : undefined,
                spriteSize: p.spriteSize === 48 ? 48 : 32,
                candyFed: typeof p.candyFed === 'number' ? Math.min(Math.max(0, Math.floor(p.candyFed)), 100) : 0,
                friendship: typeof p.friendship === 'number' ? Math.min(255, Math.max(0, Math.floor(p.friendship))) : undefined,
                hp: typeof p.hp === 'number' ? Math.min(250, Math.max(0, Math.floor(p.hp))) : undefined,
                stamina: typeof p.stamina === 'number' ? Math.min(250, Math.max(0, Math.floor(p.stamina))) : undefined,
                heldItem: typeof p.heldItem === 'string' && ConsumablesMap.get(p.heldItem)?.category === 'stone'
                    ? p.heldItem
                    : undefined,
            }));
        }
        if (Array.isArray(imported.decoration)) {
            sanitized.decoration = imported.decoration
                .filter((d) => typeof d === 'object' && d !== null && typeof d.category === 'string' && typeof d.name === 'string'
                && typeof d.x === 'number' && Number.isFinite(d.x) && typeof d.y === 'number' && Number.isFinite(d.y));
        }
        if (Array.isArray(imported.plants)) {
            sanitized.plants = imported.plants
                .filter((p) => typeof p === 'object' && p !== null && typeof p.plantId === 'string' && PlantTypesMap.has(p.plantId))
                .map((p) => ({
                x: typeof p.x === 'number' ? p.x : 0,
                y: typeof p.y === 'number' ? p.y : 0,
                plantId: p.plantId,
                phase: typeof p.phase === 'number' ? Math.min(Math.max(0, Math.floor(p.phase)), 4) : 0,
                phaseStartTime: typeof p.phaseStartTime === 'string' ? p.phaseStartTime : new Date().toISOString(),
            }));
        }
        if (typeof imported.inventory === 'object' && imported.inventory !== null && !Array.isArray(imported.inventory)) {
            for (const [key, val] of Object.entries(imported.inventory)) {
                if (typeof val === 'number' && val > 0 && Number.isFinite(val)) {
                    sanitized.inventory[key] = Math.min(999999, Math.floor(val));
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
            const t = imported.telemetry;
            const safeRecord = (v) => {
                if (typeof v !== 'object' || v === null || Array.isArray(v)) {
                    return {};
                }
                const out = {};
                for (const [k, n] of Object.entries(v)) {
                    if (typeof k === 'string' && typeof n === 'number' && Number.isFinite(n)) {
                        out[k] = Math.max(0, Math.floor(n));
                    }
                }
                return out;
            };
            const safeNum = (v) => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
            sanitized.telemetry = {
                pokemonAdded: safeRecord(t.pokemonAdded),
                pokemonEvolved: safeRecord(t.pokemonEvolved),
                candyFed: safeNum(t.candyFed),
                wildPokemonCaught: safeNum(t.wildPokemonCaught),
                decorationsPlaced: safeNum(t.decorationsPlaced),
                goldEarned: safeNum(t.goldEarned),
                goldSpent: safeNum(t.goldSpent),
                sessionsCount: safeNum(t.sessionsCount),
                lastSessionDate: typeof t.lastSessionDate === 'string' ? t.lastSessionDate.slice(0, 10) : '',
            };
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
    saveManager.maxPokemon = Math.min(save_manager_1.HARD_CAP_POKEMONS, Math.max(1, Math.floor(config.get('maxPokemon', save_manager_1.DEFAULT_MAX_POKEMONS))));
    saveManager.loadGame();
    syncAutoFeedState();
    // Initialize services
    const telemetryEnabled = config.get('telemetry', false);
    telemetry = new telemetry_1.TelemetryService(saveManager, telemetryEnabled);
    evolution = new evolution_1.EvolutionService(saveManager);
    streakService = new streak_1.StreakService(saveManager);
    rewardsTracker = new coding_rewards_1.CodingRewardsTracker();
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
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(webview_provider_1.WebViewProvider.viewType, webview), 
    // Listen for configuration changes
    vscode.workspace.onDidChangeConfiguration(event => {
        config = vscode.workspace.getConfiguration('pokemon-pets');
        if (event.affectsConfiguration('pokemon-pets.background')) {
            webview.postMessage({ type: 'background', value: config.get('background') });
        }
        if (event.affectsConfiguration('pokemon-pets.scale')) {
            webview.postMessage({ type: 'scale', value: config.get('scale') });
        }
        if (event.affectsConfiguration('pokemon-pets.menuScale')) {
            webview.postMessage({ type: 'menu_scale', value: config.get('menuScale') });
        }
        if (event.affectsConfiguration('pokemon-pets.filter')) {
            webview.postMessage({ type: 'filter', value: config.get('filter') });
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
        if (event.affectsConfiguration('pokemon-pets.maxPokemon')) {
            saveManager.maxPokemon = Math.min(save_manager_1.HARD_CAP_POKEMONS, Math.max(1, Math.floor(config.get('maxPokemon', save_manager_1.DEFAULT_MAX_POKEMONS))));
        }
    }), 
    // Register commands
    vscode.commands.registerCommand('pokemon-pets.addPet', addPetCommand), vscode.commands.registerCommand('pokemon-pets.removePet', removePetCommand), vscode.commands.registerCommand('pokemon-pets.toggleAutoFeed', () => {
        autoFeedEnabled = !autoFeedEnabled;
        saveManager.save.autoFeed = autoFeedEnabled;
        saveManager.scheduleSave();
        vscode.commands.executeCommand('setContext', 'pokemon-pets.autoFeedOn', autoFeedEnabled);
        vscode.window.showInformationMessage(`Auto Feed: ${autoFeedEnabled ? 'ON' : 'OFF'}`);
    }), vscode.commands.registerCommand('pokemon-pets.toggleAutoFeedOff', () => {
        autoFeedEnabled = !autoFeedEnabled;
        saveManager.save.autoFeed = autoFeedEnabled;
        saveManager.scheduleSave();
        vscode.commands.executeCommand('setContext', 'pokemon-pets.autoFeedOn', autoFeedEnabled);
        vscode.window.showInformationMessage(`Auto Feed: ${autoFeedEnabled ? 'ON' : 'OFF'}`);
    }), vscode.commands.registerCommand('pokemon-pets.actions', () => {
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
    }), vscode.commands.registerCommand('pokemon-pets.exportSave', exportSaveCommand), vscode.commands.registerCommand('pokemon-pets.importSave', importSaveCommand), vscode.commands.registerCommand('pokemon-pets.showStats', showStatsCommand), vscode.commands.registerCommand('pokemon-pets.renamePet', renamePetCommand), 
    // ── Coding activity rewards ─────────────────────────────────────
    vscode.workspace.onDidSaveTextDocument(doc => {
        const cfg = getRewardsConfig();
        const codingReward = rewardsTracker.onFileSave(doc.uri.toString(), saveManager.save.pets.length, cfg);
        if (codingReward) {
            applyReward(codingReward);
        }
    }));
    // Watch for git pushes (non-critical — fails silently if git extension unavailable)
    try {
        watchGitPushes(context);
    }
    catch { /* git extension not available */ }
    // Start day/night cycle if enabled
    if (config.get('dayNightCycle', true)) {
        startDayNightTimer();
    }
    // Start unified tick (handles stamina drain + plant growth + day/night)
    ensureUnifiedTick();
}
function deactivate() {
    saveManager.flushSave();
    stopUnifiedTick();
    console.log('Pokemon Pets is now deactivated 😿');
}
