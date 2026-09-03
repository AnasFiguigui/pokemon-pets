import * as vscode from 'vscode';
import { Pokemons, Consumables, PlantTypes, type Consumable, type PlantType } from './game-data';
import { Decoration, Pet, PetItem, PlantInstance, Save, MAX_CANDY_FED, SAVE_VERSION, VALID_MULCH_IDS, normalizePet, getMaxHp, getMaxStamina } from './models';
import { SaveManager, DEFAULT_MAX_POKEMONS, HARD_CAP_POKEMONS, MAX_MONEY } from './save-manager';
import { WebViewProvider } from './webview-provider';
import { TelemetryService } from './telemetry';
import { EvolutionService } from './evolution';
import { DayNightCycle } from './day-night';
import { StreakService } from './streak';
import { CodingRewardsTracker, type CodingRewardsConfig, type RewardEvent } from './coding-rewards';
import { isReadyForAutoHarvest } from './auto-harvest';
import { computePlantPhase } from './plant-growth';
import { log, setLogSink } from './log';

let config = vscode.workspace.getConfiguration('pokemon-pets');
let webview: WebViewProvider;
let saveManager: SaveManager;
let telemetry: TelemetryService;
let evolution: EvolutionService;
let streakService: StreakService;
let rewardsTracker: CodingRewardsTracker;
let unifiedTickInterval: ReturnType<typeof setInterval> | undefined;
let unifiedTickCounter = 0;
let streakToastTimer: ReturnType<typeof setTimeout> | undefined;
let dayNightEnabled = false;
let autoFeedEnabled = false;

function syncAutoFeedState(): void {
    autoFeedEnabled = saveManager?.save?.autoFeed ?? false;
    void vscode.commands.executeCommand('setContext', 'pokemon-pets.autoFeedOn', autoFeedEnabled);
}

/** Interval between stamina drain ticks (6 minutes → 10 stamina/hour). */
const STAMINA_DRAIN_INTERVAL_MS = 6 * 60_000;
/** How much stamina drains per tick. */
const STAMINA_DRAIN_AMOUNT = 1;
/** How much HP drains per tick when stamina is 0. */
const HP_DRAIN_AMOUNT = 1;
/** Pets are auto-fed when HP or stamina falls to this fraction of max or below. */
const AUTO_FEED_THRESHOLD = 0.25;
/** Largest money change accepted from a single webview message. */
const MAX_MONEY_DELTA = 100_000;
/** Sell-back ratio for consumables. */
const CONSUMABLE_SELL_RATIO = 0.7;
/** Milliseconds growth mulch stays active. */
const GROWTH_MULCH_DURATION_MS = 3_600_000;
/** Wild-catch reward: 60–100 gold in steps of 5. */
const WILD_CATCH_BASE_GOLD = 60;
/** Friendship gained by the pet that catches the thrown ball. */
const BALL_CATCH_FRIENDSHIP = 0.5;
/** Newly summoned/loaded pets start with 50–99 friendship. */
function randomStartingFriendship(): number {
    return 50 + Math.floor(Math.random() * 50);
}
/** Upper bounds on placeable entities (protects the save and the renderer). */
const MAX_PLANTS = 100;
const MAX_DECORATIONS = 500;
/** Highest decoration price accepted from the webview catalog. */
const MAX_DECOR_PRICE = 100_000;

/** Pre-built map for O(1) consumable lookups by ID. */
const ConsumablesMap: ReadonlyMap<string, Consumable> = new Map(Consumables.map(c => [c.id, c]));

/** Pre-built map for O(1) plant-type lookups by ID. */
const PlantTypesMap: ReadonlyMap<string, PlantType> = new Map(PlantTypes.map(p => [p.id, p]));

/** Max friendship value. */
const MAX_FRIENDSHIP = 255;

// ── Message validation helpers ──────────────────────────────────────────

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function isValidIndex(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/** Reads and sanitizes the maxPokemon setting (guards against malformed values). */
function readMaxPokemon(): number {
    const raw = config.get<number>('maxPokemon', DEFAULT_MAX_POKEMONS);
    if (!isFiniteNumber(raw)) { return DEFAULT_MAX_POKEMONS; }
    return Math.min(HARD_CAP_POKEMONS, Math.max(1, Math.floor(raw)));
}

/** Reads coding-reward settings from VS Code configuration. */
function getRewardsConfig(): CodingRewardsConfig {
    const cfg = vscode.workspace.getConfiguration('pokemon-pets.rewards');
    return {
        enabled: cfg.get<boolean>('enabled', true),
        saveGold: cfg.get<number>('saveGold', 2),
        savesPerFriendship: cfg.get<number>('savesPerFriendship', 10),
        saveCooldownSeconds: cfg.get<number>('saveCooldownSeconds', 120),
        pushGold: cfg.get<number>('pushGold', 200),
        pushCandy: cfg.get<number>('pushCandy', 1),
        pushFriendship: cfg.get<number>('pushFriendship', 5),
    };
}

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

/** Adds gold through the save-manager clamp and tells the webview + telemetry. */
function grantGold(amount: number): void {
    if (amount <= 0) { return; }
    saveManager.updateMoney(saveManager.save.money + amount);
    telemetry.trackGoldEarned(amount);
    webview.postMessage({ type: 'money', value: saveManager.save.money });
}

// ── Shared candy / evolution handling ───────────────────────────────────

/**
 * Broadcasts an evolution to the webview, updates telemetry and the pokédex,
 * and optionally shows a toast.
 */
function announceEvolution(petIndex: number, newFormName: string, showToast: boolean): void {
    const pet = saveManager.save.pets[petIndex];
    if (!pet) { return; }
    const { form, sprite, spriteSize } = normalizePet(pet);
    webview.postMessage({
        type: 'evolution',
        index: petIndex,
        name: pet.name, specie: pet.specie, color: pet.color,
        form, sprite, spriteSize,
        newForm: newFormName,
    });
    telemetry.trackPokemonEvolved(pet.specie);
    refreshPokedex();
    if (showToast) {
        vscode.window.showInformationMessage(`🎉 ${pet.name} evolved into ${newFormName}!`);
    }
}

/**
 * Feeds one candy to a pet: levels it up, grows current HP/stamina by the
 * level-up delta, and handles a resulting evolution.
 */
function applyCandyToPet(petIndex: number, showEvolutionToast: boolean): void {
    const pet = saveManager.save.pets[petIndex];
    if (!pet) { return; }

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
    }
    if (result.evolved && result.newForm) {
        announceEvolution(petIndex, result.newForm.name, showEvolutionToast);
    }
    webview.postMessage({ type: 'pet_stats', value: buildPetStats() });
}

// ── Coding Activity Rewards ─────────────────────────────────────────────

/** Applies a coding-reward event: distributes gold, friendship, and optional candy. */
function applyReward(reward: RewardEvent): void {
    grantGold(reward.gold);

    for (const [idx, amount] of reward.friendship) {
        addFriendship(idx, amount);
        checkAndHandleHeldItemEvolution(idx);
    }

    if (reward.candyPetIndex >= 0 && reward.candyPetIndex < saveManager.save.pets.length) {
        applyCandyToPet(reward.candyPetIndex, false);
    }

    saveManager.scheduleSave();
}

/**
 * Watches the built-in Git extension for pushes. A push is detected when a
 * repository's ahead-count drops while staying on the same branch (commits,
 * checkouts, and pulls don't match that signature).
 */
async function watchGitPushes(context: vscode.ExtensionContext): Promise<void> {
    const gitExtension = vscode.extensions.getExtension('vscode.git');
    if (!gitExtension) { return; }
    const exports = gitExtension.isActive ? gitExtension.exports : await gitExtension.activate();
    const git = exports?.getAPI?.(1);
    if (!git) { return; }

    const watchRepository = (repo: any): void => {
        let lastAhead: number = repo.state?.HEAD?.ahead ?? 0;
        let lastBranch: string | undefined = repo.state?.HEAD?.name;

        const disposable = repo.state?.onDidChange?.(() => {
            const head = repo.state?.HEAD;
            const ahead: number = head?.ahead ?? 0;
            const branch: string | undefined = head?.name;
            const pushed = branch !== undefined && branch === lastBranch && ahead < lastAhead;
            lastAhead = ahead;
            lastBranch = branch;
            if (!pushed) { return; }

            const cfg = getRewardsConfig();
            const reward = rewardsTracker.onGitPush(saveManager.save.pets.length, cfg);
            if (reward) {
                applyReward(reward);
                vscode.window.showInformationMessage(
                    `🎉 Git push! Your Pokémon earned ${cfg.pushGold}g${cfg.pushCandy > 0 ? ' + candy' : ''}.`,
                );
            }
        });
        if (disposable) { context.subscriptions.push(disposable); }
    };

    for (const repo of git.repositories) { watchRepository(repo); }
    const openDisposable = git.onDidOpenRepository?.(watchRepository);
    if (openDisposable) { context.subscriptions.push(openDisposable); }
}

// ── Game Initialization ─────────────────────────────────────────────────

function initGame(): void {
    webview.postMessage({ type: 'background', value: config.get('background') });
    webview.postMessage({ type: 'scale', value: config.get('scale') });
    webview.postMessage({ type: 'menu_scale', value: config.get('menuScale') });
    webview.postMessage({ type: 'filter', value: config.get('filter') });
    webview.postMessage({ type: 'wild_pokemons', value: config.get('wild') });
    // The extension owns the item catalog — the webview merges prices/names so
    // both sides can never disagree about what an item costs.
    webview.postMessage({
        type: 'catalog',
        consumables: Consumables.map(c => ({ id: c.id, name: c.name, price: c.price, category: c.category })),
        plants: PlantTypes.map(p => ({ id: p.id, name: p.name, price: p.price, harvestType: p.harvestType, growthHours: p.growthHours })),
    });
    webview.postMessage({ type: 'money', value: saveManager.save.money });
    webview.postMessage({ type: 'inventory', value: saveManager.save.inventory });

    // Send day/night tint
    if (config.get<boolean>('dayNightCycle', true)) {
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
    // Unknown plant ids are dropped during loadGame validation, so indices
    // here always line up 1:1 with the webview's plant list.
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
        mulch: plant.mulch ?? null,
    });
}

/** Calculates a plant's current visual phase (0–maxPhase) based on elapsed time. */
function getPlantPhase(plant: PlantInstance, plantType: PlantType): number {
    return computePlantPhase(plant, plantType).phase;
}

/** Advances all plants to their correct phase and notifies the webview. */
function tickPlants(): void {
    const plants = saveManager.save.plants;
    if (plants.length === 0) { return; }
    // Process in reverse so removals don't shift indices
    for (let i = plants.length - 1; i >= 0; i--) {
        const plant = plants[i];
        const plantType = PlantTypesMap.get(plant.plantId);
        if (!plantType) { continue; }
        const { phase, phaseStartTime } = computePlantPhase(plant, plantType);
        if (phase !== plant.phase) {
            saveManager.updatePlantPhase(i, phase, phaseStartTime);
            webview.postMessage({ type: 'update_plant', index: i, phase });
        }
        // Expire growth_mulch after 1 hour
        if (plant.mulch === 'growth_mulch' && plant.mulchAppliedAt) {
            const mulchElapsed = Date.now() - new Date(plant.mulchAppliedAt).getTime();
            if (mulchElapsed >= GROWTH_MULCH_DURATION_MS) {
                plant.mulch = undefined;
                plant.mulchAppliedAt = undefined;
                saveManager.scheduleSave();
                webview.postMessage({ type: 'clear_mulch', index: i });
            }
        }
        // Auto Feed also auto-harvests plants after a five-minute manual-harvest window.
        if (autoFeedEnabled && isReadyForAutoHarvest(plant, plantType.growthHours.length - 1)) {
            harvestPlant(i);
        }
    }
}

/** Harvests a ripe plant. Returns false when the index is invalid or the plant is not ready. */
function harvestPlant(harvestIndex: number): boolean {
    const plant = saveManager.save.plants[harvestIndex];
    if (!plant) { return false; }
    const plantType = PlantTypesMap.get(plant.plantId);
    if (!plantType) { return false; }
    const phase = getPlantPhase(plant, plantType);
    const maxPhase = plantType.growthHours.length - 1;
    if (phase < maxPhase) { return false; }

    let fruits = plantType.minFruits + Math.floor(Math.random() * (plantType.maxFruits - plantType.minFruits + 1));
    if (plant.mulch === 'damp_mulch') { fruits += 1; }
    const prevCount = saveManager.getConsumableCount(plantType.producesId);
    saveManager.updateInventory(plantType.producesId, prevCount + fruits);
    const produceName = ConsumablesMap.get(plantType.producesId)?.name ?? plantType.producesId;

    // Consume damp mulch BEFORE any removal — clearing it afterwards would
    // target whatever plant shifted into this index.
    if (plant.mulch === 'damp_mulch') {
        plant.mulch = undefined;
        plant.mulchAppliedAt = undefined;
        saveManager.scheduleSave();
        webview.postMessage({ type: 'clear_mulch', index: harvestIndex });
    }

    if (plantType.harvestType === 'single') {
        if (plant.mulch === 'gooey_mulch') {
            plant.mulch = undefined;
            plant.mulchAppliedAt = undefined;
            saveManager.updatePlantPhase(harvestIndex, 2);
            webview.postMessage({ type: 'update_plant', index: harvestIndex, phase: 2 });
            webview.postMessage({ type: 'clear_mulch', index: harvestIndex });
        } else {
            saveManager.removePlant(harvestIndex);
            webview.postMessage({ type: 'destroy_plant', index: harvestIndex });
        }
    } else {
        saveManager.updatePlantPhase(harvestIndex, 2);
        webview.postMessage({ type: 'update_plant', index: harvestIndex, phase: 2 });
    }

    webview.postMessage({ type: 'inventory', value: saveManager.save.inventory });
    webview.postMessage({ type: 'harvest_result', name: produceName, count: fruits });
    return true;
}

// ── Day/Night Cycle ─────────────────────────────────────────────────────

function sendDayNightTint(): void {
    const timeOfDay = DayNightCycle.getTimeOfDay();
    const opacity = DayNightCycle.getOverlayOpacity(timeOfDay);
    webview.postMessage({ type: 'day_night', timeOfDay, opacity });
}

function startDayNightTimer(): void {
    dayNightEnabled = true;
    ensureUnifiedTick();
}

function stopDayNightTimer(): void {
    dayNightEnabled = false;
}

// ── Stamina / HP Drain ──────────────────────────────────────────────────

function drainStamina(): void {
    const pets = saveManager.save.pets;
    if (pets.length === 0) { return; }

    // Drain stamina; when stamina is empty, drain HP
    for (let i = 0; i < pets.length; i++) {
        const pet = pets[i];
        const maxHp = getMaxHp(pet);
        const maxStamina = getMaxStamina(pet);
        let hp = Math.min(pet.hp ?? maxHp, maxHp);
        let stamina = Math.min(pet.stamina ?? maxStamina, maxStamina);

        stamina = Math.max(0, stamina - STAMINA_DRAIN_AMOUNT);
        if (stamina <= 0) {
            hp = Math.max(0, hp - HP_DRAIN_AMOUNT);
        }

        saveManager.updatePetStats(i, hp, stamina);
    }

    // Auto-feed BEFORE the death check so a stocked backpack can save a pet
    // that just hit 0 HP.
    if (autoFeedEnabled) { autoFeedPets(); }

    // Remove pets still at 0 HP (reverse so splices don't shift indices)
    for (let i = pets.length - 1; i >= 0; i--) {
        if ((pets[i].hp ?? 1) > 0) { continue; }
        const petName = pets[i].name ?? 'A Pokémon';
        saveManager.removePet(i);
        webview.postMessage({ type: 'remove_pet', index: i });
        vscode.window.showWarningMessage(`💔 ${petName} fainted from exhaustion and left...`);
    }

    // Broadcast updated stats once (after auto-feed, so we include any heals)
    webview.postMessage({ type: 'pet_stats', value: buildPetStats() });
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

        if (hpPct > AUTO_FEED_THRESHOLD && staPct > AUTO_FEED_THRESHOLD) { continue; }

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
        // pet_stats is sent by drainStamina after autoFeedPets returns
    }
}

/** Builds an array of { hp, stamina, maxHp, maxStamina } for each pet. */
function buildPetStats(): { hp: number; stamina: number; maxHp: number; maxStamina: number }[] {
    return saveManager.save.pets.slice(0, saveManager.maxPokemon).map(p => ({
        hp: p.hp ?? getMaxHp(p),
        stamina: p.stamina ?? getMaxStamina(p),
        maxHp: getMaxHp(p),
        maxStamina: getMaxStamina(p),
    }));
}

/** Sends fresh pokédex data to the webview. */
function refreshPokedex(): void {
    webview.postMessage({ type: 'pokedex', value: saveManager.save.pets.slice(0, saveManager.maxPokemon).map(p => ({
        name: p.name, specie: p.specie, sprite: p.sprite, spriteSize: p.spriteSize,
        candyFed: p.candyFed ?? 0, friendship: p.friendship ?? 0,
        hp: p.hp ?? getMaxHp(p), stamina: p.stamina ?? getMaxStamina(p),
        maxHp: getMaxHp(p), maxStamina: getMaxStamina(p),
        heldItem: p.heldItem,
    })) });
}

/**
 * Checks held-item evolution for a pet and handles the result
 * (evolution animation, messages, etc.). Called after friendship changes.
 */
function checkAndHandleHeldItemEvolution(petIndex: number): void {
    const result = evolution.checkHeldItemEvolution(petIndex);
    if (result.evolved && result.newForm) {
        announceEvolution(petIndex, result.newForm.name, true);
    }
}

// ── Unified Tick (single 60s interval for all periodic tasks) ───────────

/** How many unified ticks between stamina drains (6 × 60s = 360s). */
const STAMINA_DRAIN_TICKS = STAMINA_DRAIN_INTERVAL_MS / 60_000;

/** Ensures the single unified interval is running. */
function ensureUnifiedTick(): void {
    if (unifiedTickInterval !== undefined) { return; }
    unifiedTickCounter = 0;
    unifiedTickInterval = setInterval(() => {
        unifiedTickCounter++;

        // Day/night update (every tick = 60s)
        if (dayNightEnabled) { sendDayNightTint(); }

        // Plant growth check (every tick = 60s)
        tickPlants();

        // Stamina drain (every STAMINA_DRAIN_TICKS ticks)
        if (unifiedTickCounter % STAMINA_DRAIN_TICKS === 0) {
            drainStamina();
        }
    }, 60_000);
}

function stopUnifiedTick(): void {
    if (unifiedTickInterval !== undefined) {
        clearInterval(unifiedTickInterval);
        unifiedTickInterval = undefined;
    }
}

// ── Webview Message Handlers ────────────────────────────────────────────

/**
 * Applies a relative money change requested by the webview (selling
 * decorations, etc.). The extension owns the balance: deltas are clamped and
 * the authoritative total is echoed back, so overlapping rewards can never
 * be clobbered by a stale absolute value.
 */
function handleMoneyDelta(message: any): void {
    const delta = message.value;
    if (!isFiniteNumber(delta) || delta === 0) { return; }
    const clamped = Math.max(-MAX_MONEY_DELTA, Math.min(MAX_MONEY_DELTA, delta));
    saveManager.updateMoney(saveManager.save.money + clamped);
    if (clamped > 0) { telemetry.trackGoldEarned(clamped); }
    else { telemetry.trackGoldSpent(-clamped); }
    webview.postMessage({ type: 'money', value: saveManager.save.money });
}

function handleSpawnWildPokemon(): void {
    const specie = DayNightCycle.pickWildPokemon();
    if (specie) {
        webview.postMessage({ type: 'spawn_wild_pokemon', specie });
    } else {
        // No eligible species right now — tell webview to retry later
        webview.postMessage({ type: 'retry_wild_spawn' });
    }
}

function handleWildPokemonCaught(): void {
    // Compute catch reward server-side (60–100 gold)
    const catchReward = WILD_CATCH_BASE_GOLD + Math.floor(Math.random() * 9) * 5;
    saveManager.updateMoney(saveManager.save.money + catchReward);
    webview.postMessage({ type: 'money', value: saveManager.save.money, reward: catchReward });
    telemetry.trackGoldEarned(catchReward);
    telemetry.trackWildPokemonCaught();
}

function handleBallCaught(message: any): void {
    const ballPetIndex = message.index;
    if (isValidIndex(ballPetIndex) && ballPetIndex < saveManager.save.pets.length) {
        addFriendship(ballPetIndex, BALL_CATCH_FRIENDSHIP);
        // Check if held item evolution triggers from friendship gain
        checkAndHandleHeldItemEvolution(ballPetIndex);
    }
}

function handleUseCandy(petIndex: unknown, currentCount: number): void {
    // Candy is always consumed
    saveManager.updateInventory('candy', currentCount - 1);
    webview.postMessage({ type: 'inventory', value: saveManager.save.inventory });
    telemetry.trackCandyFed();

    if (!isValidIndex(petIndex) || petIndex >= saveManager.save.pets.length) { return; }

    // Increase friendship from candy
    const candyConsumable = ConsumablesMap.get('candy');
    if (candyConsumable?.friendshipGain) {
        addFriendship(petIndex, candyConsumable.friendshipGain);
    }

    applyCandyToPet(petIndex, true);
}

function handleUseFood(consumable: Consumable, petIndex: unknown, currentCount: number): void {
    if (!isValidIndex(petIndex) || petIndex >= saveManager.save.pets.length) { return; }
    const pet = saveManager.save.pets[petIndex];
    if (!pet) { return; }
    const maxHp = getMaxHp(pet);
    const maxStamina = getMaxStamina(pet);
    const currentHp = pet.hp ?? maxHp;
    const currentStamina = pet.stamina ?? maxStamina;
    const canHealHp = (consumable.restoreHp ?? 0) > 0 && currentHp < maxHp;
    const canHealSta = (consumable.restoreStamina ?? 0) > 0 && currentStamina < maxStamina;
    if (!canHealHp && !canHealSta) {
        webview.postMessage({ type: 'consumable_failed' });
        return;
    }
    saveManager.updateInventory(consumable.id, currentCount - 1);
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

function handleUseStone(consumable: Consumable, petIndex: unknown, currentCount: number): void {
    if (!isValidIndex(petIndex) || petIndex >= saveManager.save.pets.length) { return; }
    const pet = saveManager.save.pets[petIndex];
    // If the pet already holds an item, don't overwrite it
    if (pet.heldItem) {
        webview.postMessage({ type: 'consumable_failed' });
        return;
    }
    const result = evolution.useItem(petIndex, consumable.id);
    if (result.evolved && result.newForm) {
        saveManager.updateInventory(consumable.id, currentCount - 1);
        webview.postMessage({ type: 'inventory', value: saveManager.save.inventory });
        announceEvolution(petIndex, result.newForm.name, true);
    } else if (result.equipped) {
        // Item equipped as held item — consume from inventory
        saveManager.updateInventory(consumable.id, currentCount - 1);
        webview.postMessage({ type: 'inventory', value: saveManager.save.inventory });
        refreshPokedex();
        vscode.window.showInformationMessage(
            `${pet.name} is now holding ${consumable.name}.`,
        );
    } else {
        // Stone had no effect — not consumed
        webview.postMessage({ type: 'consumable_failed' });
    }
}

function handleUseConsumable(message: any): void {
    const consumableId = message.consumableId;
    if (typeof consumableId !== 'string') { return; }
    const currentCount = saveManager.getConsumableCount(consumableId);
    if (currentCount <= 0) { return; }

    if (consumableId === 'candy') {
        handleUseCandy(message.index, currentCount);
        return;
    }

    const consumable = ConsumablesMap.get(consumableId);
    if (!consumable) { return; }
    if (consumable.category === 'food' || consumable.category === 'potion') {
        handleUseFood(consumable, message.index, currentCount);
    } else {
        handleUseStone(consumable, message.index, currentCount);
    }
}

function handleBuyConsumable(message: any): void {
    const itemId = message.consumableId;
    if (typeof itemId !== 'string') { return; }
    const consumable = ConsumablesMap.get(itemId);
    if (!consumable) { return; }
    const rawQty = message.quantity ?? 1;
    if (!isFiniteNumber(rawQty)) { return; }
    const qty = Math.max(1, Math.min(100, Math.floor(rawQty)));
    const totalCost = consumable.price * qty;
    if (saveManager.save.money < totalCost) { return; }
    saveManager.updateMoney(saveManager.save.money - totalCost);
    const prev = saveManager.getConsumableCount(itemId);
    saveManager.updateInventory(itemId, prev + qty);
    webview.postMessage({ type: 'money', value: saveManager.save.money });
    webview.postMessage({ type: 'inventory', value: saveManager.save.inventory });
    telemetry.trackGoldSpent(totalCost);
}

function handleSellConsumable(message: any): void {
    const sellId = message.consumableId;
    if (typeof sellId !== 'string') { return; }
    const sellItem = ConsumablesMap.get(sellId);
    if (!sellItem) { return; }
    const rawSellQty = message.quantity ?? 1;
    if (!isFiniteNumber(rawSellQty)) { return; }
    const sellQty = Math.max(1, Math.floor(rawSellQty));
    const owned = saveManager.getConsumableCount(sellId);
    const actualQty = Math.min(sellQty, owned);
    if (actualQty <= 0) { return; }
    const sellPrice = Math.floor(sellItem.price * CONSUMABLE_SELL_RATIO) * actualQty;
    saveManager.updateInventory(sellId, owned - actualQty);
    saveManager.updateMoney(saveManager.save.money + sellPrice);
    webview.postMessage({ type: 'money', value: saveManager.save.money });
    webview.postMessage({ type: 'inventory', value: saveManager.save.inventory });
    telemetry.trackGoldEarned(sellPrice);
}

function handleMoveDecor(message: any): void {
    if (isValidIndex(message.index) && isFiniteNumber(message.x) && isFiniteNumber(message.y)) {
        saveManager.moveDecor(message.index, message.x, message.y);
    }
}

function handleAddDecor(message: any): void {
    if (!isFiniteNumber(message.x) || !isFiniteNumber(message.y)
        || typeof message.category !== 'string' || typeof message.name !== 'string') {
        return;
    }
    if (saveManager.save.decoration.length >= MAX_DECORATIONS) {
        // Reject: tell the webview to drop the just-placed decoration again
        // and re-sync its optimistically deducted balance
        webview.postMessage({ type: 'destroy_decor', index: saveManager.save.decoration.length });
        webview.postMessage({ type: 'money', value: saveManager.save.money });
        webview.postMessage({ type: 'show_message', text: 'Too many decorations!' });
        return;
    }
    // Deduct the purchase price here so buying is a single atomic operation.
    // (Decoration prices live in the webview's preset catalog; the value is
    // sanity-clamped since this is a local single-player economy.)
    const price = isFiniteNumber(message.price) ? Math.max(0, Math.min(MAX_DECOR_PRICE, Math.floor(message.price))) : 0;
    if (price > 0) {
        saveManager.updateMoney(saveManager.save.money - price);
        telemetry.trackGoldSpent(price);
        webview.postMessage({ type: 'money', value: saveManager.save.money });
    }
    saveManager.addDecor({
        x: message.x,
        y: message.y,
        category: message.category,
        name: message.name,
    });
    telemetry.trackDecorationPlaced();
}

function handleRemoveDecor(message: any): void {
    if (isValidIndex(message.index)) {
        saveManager.removeDecor(message.index);
    }
}

function handleAddPlant(message: any): void {
    const plantId = message.plantId;
    if (typeof plantId !== 'string') { return; }
    const plantType = PlantTypesMap.get(plantId);
    if (!plantType) { return; }
    if (!isFiniteNumber(message.x) || !isFiniteNumber(message.y)) { return; }
    if (saveManager.save.plants.length >= MAX_PLANTS) {
        // Reject: the webview appended the pending plant last, so its index
        // equals our current plant count. Re-sync the optimistically
        // deducted balance too.
        webview.postMessage({ type: 'destroy_plant', index: saveManager.save.plants.length });
        webview.postMessage({ type: 'money', value: saveManager.save.money });
        webview.postMessage({ type: 'show_message', text: 'Too many plants!' });
        return;
    }
    // Seeds are paid on placement — deduct here (single atomic operation)
    saveManager.updateMoney(saveManager.save.money - plantType.price);
    telemetry.trackGoldSpent(plantType.price);
    webview.postMessage({ type: 'money', value: saveManager.save.money });
    saveManager.addPlant({
        x: message.x,
        y: message.y,
        plantId,
        phase: 0,
        phaseStartTime: new Date().toISOString(),
    });
}

function handleMovePlant(message: any): void {
    if (isValidIndex(message.index) && isFiniteNumber(message.x) && isFiniteNumber(message.y)) {
        saveManager.movePlant(message.index, message.x, message.y);
    }
}

function handleRemovePlant(message: any): void {
    if (isValidIndex(message.index)) {
        saveManager.removePlant(message.index);
    }
}

function handleHarvestPlant(message: any): void {
    if (isValidIndex(message.index)) {
        harvestPlant(message.index);
    }
}

function handleApplyMulch(message: any): void {
    const mulchId = message.mulchId;
    if (typeof mulchId !== 'string') { return; }
    const mulchItem = ConsumablesMap.get(mulchId);
    if (mulchItem?.category !== 'mulch') { return; }
    const mulchCount = saveManager.getConsumableCount(mulchId);
    if (mulchCount <= 0) { return; }
    if (!isValidIndex(message.index)) { return; }
    const targetPlant = saveManager.save.plants[message.index];
    if (!targetPlant) { return; }
    if (targetPlant.mulch) {
        // Plant already has mulch applied
        webview.postMessage({ type: 'consumable_failed' });
        return;
    }
    // Restrict gooey_mulch to single-harvest plants (regrow makes no sense for repeatable)
    const targetPlantType = PlantTypesMap.get(targetPlant.plantId);
    if (mulchId === 'gooey_mulch' && targetPlantType && targetPlantType.harvestType !== 'single') {
        webview.postMessage({ type: 'show_message', text: 'Gooey Mulch only works on single-harvest plants.' });
        return;
    }
    // Consume mulch and apply to plant
    saveManager.updateInventory(mulchId, mulchCount - 1);
    targetPlant.mulch = mulchId as PlantInstance['mulch'];
    targetPlant.mulchAppliedAt = new Date().toISOString();
    saveManager.scheduleSave();
    webview.postMessage({ type: 'inventory', value: saveManager.save.inventory });
    webview.postMessage({ type: 'set_mulch', index: message.index, mulch: mulchId });
    webview.postMessage({ type: 'show_message', text: `Applied ${mulchItem.name}!` });
}

async function handleRenameSpecificPet(message: any): Promise<void> {
    if (!isValidIndex(message.index)) { return; }
    const petIdx = message.index;
    const pet = saveManager.save.pets[petIdx];
    if (!pet) { return; }
    const newName = await vscode.window.showInputBox({
        title: 'Rename Pokémon',
        prompt: `Rename ${pet.name}`,
        value: pet.name,
        validateInput: (v) => v.trim().length === 0 ? 'Name cannot be empty' : undefined,
    });
    if (!newName) { return; }
    const trimmed = newName.trim().slice(0, 20);
    pet.name = trimmed;
    saveManager.scheduleSave();
    webview.postMessage({ type: 'rename_pet', index: petIdx, name: trimmed });
    // Refresh pokédex to show updated name
    refreshPokedex();
}

function handleUnequipItem(message: any): void {
    if (!isValidIndex(message.index) || message.index >= saveManager.save.pets.length) { return; }
    const uPet = saveManager.save.pets[message.index];
    if (!uPet?.heldItem) { return; }
    const returnedItem = uPet.heldItem;
    const prevCount = saveManager.getConsumableCount(returnedItem);
    saveManager.updateInventory(returnedItem, prevCount + 1);
    uPet.heldItem = undefined;
    saveManager.scheduleSave();
    webview.postMessage({ type: 'inventory', value: saveManager.save.inventory });
    refreshPokedex();
    const itemInfo = ConsumablesMap.get(returnedItem);
    vscode.window.showInformationMessage(
        `${uPet.name} dropped ${itemInfo?.name ?? returnedItem}. Returned to backpack.`,
    );
}

/** Dispatch table: webview message type → handler. */
const messageHandlers: Record<string, (message: any) => void | Promise<void>> = {
    init: () => initGame(),
    money_delta: handleMoneyDelta,
    spawn_wild_pokemon: handleSpawnWildPokemon,
    wild_pokemon_caught: handleWildPokemonCaught,
    ball_caught: handleBallCaught,
    use_consumable: handleUseConsumable,
    buy_consumable: handleBuyConsumable,
    sell_consumable: handleSellConsumable,
    move_decor: handleMoveDecor,
    add_decor: handleAddDecor,
    remove_decor: handleRemoveDecor,
    add_plant: handleAddPlant,
    move_plant: handleMovePlant,
    remove_plant: handleRemovePlant,
    harvest_plant: handleHarvestPlant,
    apply_mulch: handleApplyMulch,
    request_rename_pet: () => renamePetCommand(),
    request_rename_specific_pet: handleRenameSpecificPet,
    request_pokedex: () => refreshPokedex(),
    unequip_item: handleUnequipItem,
};

async function handleWebviewMessage(message: any): Promise<void> {
    if (typeof message?.type !== 'string') { return; }
    const handler = messageHandlers[message.type.toLowerCase()];
    if (!handler) { return; }
    try {
        await handler(message);
    } catch (err) {
        log(`Error handling webview message '${message.type}':`, err);
    }
}

// ── Commands ────────────────────────────────────────────────────────────

async function addPetCommand(): Promise<void> {
    if (saveManager.save.pets.length >= saveManager.maxPokemon) {
        vscode.window.showWarningMessage(
            `You can only summon up to ${saveManager.maxPokemon} Pokémon at once. Remove one first.`,
        );
        return;
    }

    const generation = await vscode.window.showQuickPick(Object.keys(Pokemons), {
        title: 'Select a Pokémon generation',
        placeHolder: 'Generation',
    });
    if (generation === undefined) { return; }
    // Menu of selection Pokémon species, showing number of evolutions
    const pokemonItems = Pokemons[generation].map((poke, idx) =>
        new PetItem(idx, poke.name, `${poke.forms.length} Possible Evolutions`),
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
    pet.friendship = randomStartingFriendship();

    const added = saveManager.addPet(pet);
    if (!added) {
        vscode.window.showWarningMessage(
            `You can only summon up to ${saveManager.maxPokemon} Pokémon at once. Remove one first.`,
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

async function renamePetCommand(): Promise<void> {
    const pets = saveManager.save.pets;
    if (pets.length === 0) {
        vscode.window.showInformationMessage('No Pokémon to rename.');
        return;
    }

    const items: PetItem[] = pets.map((pet, i) =>
        new PetItem(i, pet.name, `${pet.color} ${pet.form ?? pet.specie}`),
    );

    const selected = await vscode.window.showQuickPick(items, {
        title: 'Select a Pokémon to rename',
        placeHolder: 'Pokémon',
        matchOnDescription: true,
    });
    if (selected === undefined) { return; }

    const newName = await vscode.window.showInputBox({
        title: 'New name',
        prompt: `Rename ${selected.label}`,
        value: selected.label,
        validateInput: (v) => v.trim().length === 0 ? 'Name cannot be empty' : undefined,
    });
    if (!newName) { return; }

    const trimmed = newName.trim().slice(0, 20);
    pets[selected.index].name = trimmed;
    saveManager.scheduleSave();
    webview.postMessage({ type: 'rename_pet', index: selected.index, name: trimmed });
    vscode.window.showInformationMessage(`Renamed to ${trimmed}!`);
}

async function exportSaveCommand(): Promise<void> {
    try {
        const saveJson = JSON.stringify(saveManager.save, null, 2);
        await vscode.env.clipboard.writeText(saveJson);
        vscode.window.showInformationMessage('Save data copied to clipboard!');
    } catch (err) {
        log('Failed to export save:', err);
        vscode.window.showErrorMessage('Failed to copy save data to clipboard.');
    }
}

/** Sanitizes clipboard-imported save data into a fresh Save. Throws on invalid input. */
function sanitizeImportedSave(clipText: string): Save {
    const imported = JSON.parse(clipText);
    if (typeof imported !== 'object' || imported === null || Array.isArray(imported)) {
        throw new Error('Invalid save format');
    }
    if (typeof imported.version === 'number' && imported.version > SAVE_VERSION) {
        throw new Error(`Save is from a newer version (${imported.version})`);
    }

    // Only accept known Save fields to prevent excess property injection
    const sanitized = new Save();
    if (typeof imported.money === 'number' && Number.isFinite(imported.money)) {
        sanitized.money = Math.min(MAX_MONEY, Math.max(0, Math.floor(imported.money)));
    }
    if (Array.isArray(imported.pets)) {
        sanitized.pets = imported.pets
            .filter((p: any) => typeof p === 'object' && p !== null && typeof p.name === 'string' && typeof p.specie === 'string')
            .slice(0, saveManager.maxPokemon)
            .map((p: any) => ({
                name: String(p.name).slice(0, 20),
                specie: String(p.specie),
                color: typeof p.color === 'string' ? p.color : 'generation 1',
                form: typeof p.form === 'string' ? p.form : undefined,
                sprite: typeof p.sprite === 'string' ? p.sprite : undefined,
                spriteSize: p.spriteSize === 48 ? 48 : 32,
                candyFed: typeof p.candyFed === 'number' && Number.isFinite(p.candyFed)
                    ? Math.min(Math.max(0, Math.floor(p.candyFed)), MAX_CANDY_FED)
                    : 0,
                // Friendship may hold half-points from ball catches — clamp without flooring
                friendship: typeof p.friendship === 'number' && Number.isFinite(p.friendship)
                    ? Math.min(MAX_FRIENDSHIP, Math.max(0, p.friendship))
                    : undefined,
                hp: typeof p.hp === 'number' && Number.isFinite(p.hp) ? Math.min(250, Math.max(0, Math.floor(p.hp))) : undefined,
                stamina: typeof p.stamina === 'number' && Number.isFinite(p.stamina) ? Math.min(250, Math.max(0, Math.floor(p.stamina))) : undefined,
                heldItem: typeof p.heldItem === 'string' && ConsumablesMap.get(p.heldItem)?.category === 'stone'
                    ? p.heldItem
                    : undefined,
            }));
    }
    if (Array.isArray(imported.decoration)) {
        sanitized.decoration = imported.decoration
            .filter((d: any) => typeof d === 'object' && d !== null && typeof d.category === 'string' && typeof d.name === 'string'
                && typeof d.x === 'number' && Number.isFinite(d.x) && typeof d.y === 'number' && Number.isFinite(d.y))
            .slice(0, MAX_DECORATIONS)
            .map((d: any) => ({ x: d.x, y: d.y, category: d.category, name: d.name }));
    }
    if (Array.isArray(imported.plants)) {
        sanitized.plants = imported.plants
            .filter((p: any) => typeof p === 'object' && p !== null && typeof p.plantId === 'string' && PlantTypesMap.has(p.plantId))
            .slice(0, MAX_PLANTS)
            .map((p: any) => {
                const maxPhase = PlantTypesMap.get(p.plantId)!.growthHours.length - 1;
                const plant: PlantInstance = {
                    x: typeof p.x === 'number' && Number.isFinite(p.x) ? p.x : 0,
                    y: typeof p.y === 'number' && Number.isFinite(p.y) ? p.y : 0,
                    plantId: p.plantId,
                    phase: typeof p.phase === 'number' && Number.isFinite(p.phase)
                        ? Math.min(Math.max(0, Math.floor(p.phase)), maxPhase)
                        : 0,
                    phaseStartTime: typeof p.phaseStartTime === 'string' ? p.phaseStartTime : new Date().toISOString(),
                };
                // Preserve mulch the player paid for
                if (typeof p.mulch === 'string' && VALID_MULCH_IDS.has(p.mulch)) {
                    plant.mulch = p.mulch as PlantInstance['mulch'];
                    if (typeof p.mulchAppliedAt === 'string') { plant.mulchAppliedAt = p.mulchAppliedAt; }
                }
                return plant;
            });
    }
    if (typeof imported.inventory === 'object' && imported.inventory !== null && !Array.isArray(imported.inventory)) {
        for (const [key, val] of Object.entries(imported.inventory)) {
            // Only accept known consumable ids
            if (!ConsumablesMap.has(key)) { continue; }
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
        const safeRecord = (v: unknown): { [k: string]: number } => {
            if (typeof v !== 'object' || v === null || Array.isArray(v)) { return {}; }
            const out: { [k: string]: number } = {};
            for (const [k, n] of Object.entries(v)) {
                if (typeof k === 'string' && typeof n === 'number' && Number.isFinite(n)) { out[k] = Math.max(0, Math.floor(n)); }
            }
            return out;
        };
        const safeNum = (v: unknown): number => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
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
    return sanitized;
}

async function importSaveCommand(): Promise<void> {
    const confirm = await vscode.window.showWarningMessage(
        'This will replace your current save with data from the clipboard. Continue?',
        { modal: true },
        'Import',
    );
    if (confirm !== 'Import') { return; }

    let clipText: string;
    try {
        clipText = await vscode.env.clipboard.readText();
    } catch {
        vscode.window.showErrorMessage('Failed to read clipboard.');
        return;
    }

    // Parse and sanitize first — the current save is only replaced when the
    // clipboard data is actually valid.
    let sanitized: Save;
    try {
        sanitized = sanitizeImportedSave(clipText);
    } catch (err) {
        log('Failed to import save:', err);
        vscode.window.showErrorMessage('Failed to import save — invalid JSON or format.');
        return;
    }

    saveManager.save = sanitized;
    if (!saveManager.saveGame()) {
        vscode.window.showErrorMessage('Save imported but could not be written to disk — check free space and permissions.');
    }
    saveManager.loadGame();
    syncAutoFeedState();

    webview.postMessage({ type: 'reset' });
    initGame();
    vscode.window.showInformationMessage('Save imported successfully! 🎉');
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

function toggleAutoFeedCommand(): void {
    autoFeedEnabled = !autoFeedEnabled;
    saveManager.save.autoFeed = autoFeedEnabled;
    saveManager.scheduleSave();
    void vscode.commands.executeCommand('setContext', 'pokemon-pets.autoFeedOn', autoFeedEnabled);
    vscode.window.showInformationMessage(`Auto Feed: ${autoFeedEnabled ? 'ON' : 'OFF'}`);
}

// ── Configuration changes ───────────────────────────────────────────────

function handleConfigurationChange(event: vscode.ConfigurationChangeEvent): void {
    if (!event.affectsConfiguration('pokemon-pets')) { return; }
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
    if (event.affectsConfiguration('pokemon-pets.maxPokemon')) {
        saveManager.maxPokemon = readMaxPokemon();
        // Reconcile: if the cap dropped below the current pet count, trim the
        // save and rebuild the webview so indices stay aligned on both sides.
        if (saveManager.save.pets.length > saveManager.maxPokemon) {
            saveManager.save.pets = saveManager.save.pets.slice(0, saveManager.maxPokemon);
            saveManager.scheduleSave();
            webview.postMessage({ type: 'reset' });
            initGame();
        }
    }
}

// ── Activation / Deactivation ───────────────────────────────────────────

export function activate(context: vscode.ExtensionContext): void {
    const output = vscode.window.createOutputChannel('Pokemon Pets');
    setLogSink(output);
    context.subscriptions.push(output, { dispose: () => setLogSink(undefined) });
    log('Pokemon Pets is now active 😽');

    // Initialize save manager
    saveManager = new SaveManager(context.globalStorageUri.fsPath);
    saveManager.maxPokemon = readMaxPokemon();
    try {
        saveManager.loadGame();
    } catch (err) {
        // Never let a broken save file kill activation — start from defaults
        log('Failed to load game, starting with a fresh save:', err);
        saveManager.save = new Save();
    }
    syncAutoFeedState();

    // Initialize services
    const telemetryEnabled = config.get<boolean>('telemetry', false);
    telemetry = new TelemetryService(saveManager, telemetryEnabled);
    evolution = new EvolutionService(saveManager);
    streakService = new StreakService(saveManager);
    rewardsTracker = new CodingRewardsTracker();

    // Track session
    telemetry.trackSession();

    // Initialize webview provider (before the streak toast so the deferred
    // money refresh has a provider to talk to)
    webview = new WebViewProvider(context);
    webview.setMessageHandler(handleWebviewMessage);
    webview.setVisibilityHandler(() => {
        if (config.get<boolean>('dayNightCycle', true)) {
            sendDayNightTint();
        }
    });

    // Claim daily streak reward
    try {
        const reward = streakService.claimDaily();
        if (reward) {
            saveManager.updateMoney(saveManager.save.money + reward.gold);
            telemetry.trackGoldEarned(reward.gold);
            streakToastTimer = setTimeout(() => {
                streakToastTimer = undefined;
                vscode.window.showInformationMessage(reward.message);
                webview.postMessage({ type: 'money', value: saveManager.save.money });
            }, 2000);
        }
    } catch (err) {
        log('Failed to claim daily streak:', err);
    }

    context.subscriptions.push(
        webview,
        vscode.window.registerWebviewViewProvider(WebViewProvider.viewType, webview),

        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(handleConfigurationChange),

        // Register commands
        vscode.commands.registerCommand('pokemon-pets.addPet', addPetCommand),
        vscode.commands.registerCommand('pokemon-pets.removePet', removePetCommand),
        vscode.commands.registerCommand('pokemon-pets.toggleAutoFeed', toggleAutoFeedCommand),
        vscode.commands.registerCommand('pokemon-pets.toggleAutoFeedOff', toggleAutoFeedCommand),
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
            syncAutoFeedState();
            initGame();
        }),
        vscode.commands.registerCommand('pokemon-pets.exportSave', exportSaveCommand),
        vscode.commands.registerCommand('pokemon-pets.importSave', importSaveCommand),
        vscode.commands.registerCommand('pokemon-pets.showStats', showStatsCommand),
        vscode.commands.registerCommand('pokemon-pets.renamePet', renamePetCommand),

        // ── Coding activity rewards ─────────────────────────────────────
        vscode.workspace.onDidSaveTextDocument(doc => {
            // Only reward real file saves (not settings, untitled buffers, etc.)
            if (doc.uri.scheme !== 'file') { return; }
            const cfg = getRewardsConfig();
            const codingReward = rewardsTracker.onFileSave(
                doc.uri.toString(), saveManager.save.pets.length, cfg,
            );
            if (codingReward) { applyReward(codingReward); }
        }),
    );

    // Watch for git pushes (non-critical — logs and continues if unavailable)
    watchGitPushes(context).catch(err => log('Git push watcher unavailable:', err));

    // Start day/night cycle if enabled
    if (config.get<boolean>('dayNightCycle', true)) {
        startDayNightTimer();
    }

    // Start unified tick (handles stamina drain + plant growth + day/night)
    ensureUnifiedTick();
}

export function deactivate(): void {
    if (streakToastTimer !== undefined) {
        clearTimeout(streakToastTimer);
        streakToastTimer = undefined;
    }
    stopUnifiedTick();
    try {
        saveManager?.flushSave();
    } catch (err) {
        log('Failed to flush save on deactivate:', err);
    }
}
