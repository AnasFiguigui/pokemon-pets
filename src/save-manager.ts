import * as fs from 'node:fs';
import * as path from 'node:path';
import { Decoration, Pet, PlantInstance, Save, SAVE_VERSION, VALID_MULCH_IDS, getMaxHp, getMaxStamina } from './models';
import { PlantTypes } from './game-data';
import { log } from './log';

/** Known plant-type ids — plants with retired/unknown ids are dropped on load
 *  so extension and webview plant indices always line up 1:1. */
const KNOWN_PLANT_IDS: ReadonlySet<string> = new Set(PlantTypes.map(p => p.id));

export const DEFAULT_MAX_POKEMONS = 6;
export const HARD_CAP_POKEMONS = 12;

/** Upper bound for the money balance (prevents overflow). */
export const MAX_MONEY = 999_999_999;

/** Default inventory data for new or missing saves. */
function defaultInventory() {
    return {} as Record<string, number>;
}

/** Default streak data for new or missing saves. */
function defaultStreak() {
    return { currentStreak: 0, lastClaimDate: '', longestStreak: 0, totalRewardsClaimed: 0 };
}

/** Default telemetry data for new or missing saves. */
function defaultTelemetry() {
    return {
        pokemonAdded: {}, pokemonEvolved: {}, candyFed: 0,
        wildPokemonCaught: 0, decorationsPlaced: 0,
        goldEarned: 0, goldSpent: 0, sessionsCount: 0, lastSessionDate: '',
    };
}

/** True when the value is a plain (non-array, non-null) object. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Coerces a value to a non-negative integer, falling back to the given default. */
function toNonNegativeInt(value: unknown, fallback = 0): number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

/**
 * Old preset keys with typos that were persisted into saves.
 * Kept as a migration map so renamed presets still resolve.
 */
const DECOR_PLANTS_NAME_FIXES: Readonly<Record<string, string>> = {
    OBJECT__11: 'OBJECT_11',
    OBJECCT_12: 'OBJECT_12', OBJECCT_13: 'OBJECT_13', OBJECCT_14: 'OBJECT_14',
    OBJECCT_15: 'OBJECT_15', OBJECCT_16: 'OBJECT_16', OBJECCT_17: 'OBJECT_17',
    OBJECCT_18: 'OBJECT_18', OBJECCT_19: 'OBJECT_19', OBJECCT_20: 'OBJECT_20',
    OBJECCT_21: 'OBJECT_21', OBJECCT_22: 'OBJECT_22', OBJECCT_23: 'OBJECT_23',
    OBJECCT_24: 'OBJECT_24', OBJECCT_25: 'OBJECT_25',
};

export class SaveManager {
    private readonly storageFolder: string;
    private readonly savePath: string;
    public save: Save;
    public maxPokemon: number = DEFAULT_MAX_POKEMONS;

    /** Debounce timer for batching rapid saves into a single disk write. */
    private saveTimer: ReturnType<typeof setTimeout> | undefined;
    private static readonly SAVE_DELAY_MS = 500;

    constructor(storageFolder: string) {
        this.storageFolder = storageFolder;
        this.savePath = path.join(storageFolder, 'save.json');
        this.save = new Save();
    }

    /** Returns the full path to the save.json file. */
    public getSavePath(): string {
        return this.savePath;
    }

    /** Returns whether a save file already exists on disk. */
    public hasSaveFile(): boolean {
        return fs.existsSync(this.savePath);
    }

    /**
     * Restores a Settings-Sync backup onto disk — only when no local save
     * exists (a fresh machine); an existing save is never clobbered.
     * Call loadGame() afterwards to validate the restored data as usual.
     */
    public restoreBackup(json: string): boolean {
        if (this.hasSaveFile()) { return false; }
        try {
            const parsed: unknown = JSON.parse(json);
            if (!isPlainObject(parsed)) { return false; }
            if (!fs.existsSync(this.storageFolder)) {
                fs.mkdirSync(this.storageFolder, { recursive: true });
            }
            this.save = parsed as unknown as Save;
            return this.writeToDisk();
        } catch (e) {
            log('Failed to restore synced save backup:', e);
            return false;
        }
    }

    /** Loads the game from disk, creating defaults when necessary. */
    public loadGame(): void {
        // Create storage folder if it does not exist
        if (!fs.existsSync(this.storageFolder)) {
            fs.mkdirSync(this.storageFolder, { recursive: true });
        }

        let saveUpdated = this.readSaveFromDisk();

        // Stamp schema version (silently — no rewrite needed just for this)
        if (typeof this.save.version !== 'number') {
            this.save.version = SAVE_VERSION;
        }

        if (this.validateMoney()) { saveUpdated = true; }
        if (this.validatePets()) { saveUpdated = true; }
        if (this.validateDecoration()) { saveUpdated = true; }
        if (this.validatePlants()) { saveUpdated = true; }
        if (this.validateInventory()) { saveUpdated = true; }
        if (this.validateMeta()) { saveUpdated = true; }

        if (saveUpdated) {
            this.saveGame();
        }
    }

    /** Reads and parses save.json. Returns true when the save needs rewriting. */
    private readSaveFromDisk(): boolean {
        if (fs.existsSync(this.savePath)) {
            try {
                const parsed: unknown = JSON.parse(fs.readFileSync(this.savePath, 'utf8'));
                if (!isPlainObject(parsed)) {
                    throw new TypeError('Save file does not contain an object');
                }
                this.save = parsed as unknown as Save;
                return false;
            } catch (e) {
                log('Failed to load save file:', e);
                this.save = new Save();
                this.loadPetsFile();
                return true;
            }
        }
        this.loadPetsFile();
        return true;
    }

    private validateMoney(): boolean {
        if (typeof this.save.money !== 'number' || !Number.isFinite(this.save.money) || this.save.money < 0) {
            this.save.money = 0;
            return true;
        }
        if (this.save.money > MAX_MONEY) {
            this.save.money = MAX_MONEY;
            return true;
        }
        return false;
    }

    private validatePets(): boolean {
        let updated = false;

        if (!Array.isArray(this.save.pets)) {
            this.save.pets = [];
            return true;
        }
        const validPets = this.save.pets.filter(
            (p): p is Pet => isPlainObject(p) && typeof p.name === 'string' && typeof p.specie === 'string',
        );
        if (validPets.length !== this.save.pets.length) {
            this.save.pets = validPets;
            updated = true;
        }
        if (this.save.pets.length > this.maxPokemon) {
            this.save.pets = this.save.pets.slice(0, this.maxPokemon);
            updated = true;
        }

        for (const pet of this.save.pets) {
            if (this.validatePet(pet)) { updated = true; }
        }
        return updated;
    }

    /** Repairs a single pet's fields in place. Returns true when anything changed. */
    private validatePet(pet: Pet): boolean {
        let updated = false;

        // Migrate the misspelled Hisuian Zorua species name from old saves
        if (pet.specie === 'Zorua hisiuan') {
            pet.specie = 'Zorua Hisuian';
            updated = true;
        }

        // Initialize HP/Stamina for pets that don't have them yet,
        // and clamp to the current max (in case level changed)
        const maxHp = getMaxHp(pet);
        const maxStamina = getMaxStamina(pet);
        if (typeof pet.hp !== 'number' || pet.hp <= 0) { pet.hp = maxHp; updated = true; }
        if (typeof pet.stamina !== 'number' || pet.stamina <= 0) { pet.stamina = maxStamina; updated = true; }
        if (pet.hp > maxHp) { pet.hp = maxHp; updated = true; }
        if (pet.stamina > maxStamina) { pet.stamina = maxStamina; updated = true; }

        // Initialize friendship for pets that don't have it yet (neutral range 50–99)
        if (typeof pet.friendship !== 'number' || !Number.isFinite(pet.friendship)) {
            pet.friendship = 50 + Math.floor(Math.random() * 50);
            updated = true;
        }
        // Clamp friendship to [0, 255]
        if (pet.friendship < 0) { pet.friendship = 0; updated = true; }
        if (pet.friendship > 255) { pet.friendship = 255; updated = true; }

        // Validate heldItem (must be string or undefined)
        if (pet.heldItem !== undefined && typeof pet.heldItem !== 'string') {
            pet.heldItem = undefined;
            updated = true;
        }
        return updated;
    }

    /** Drops malformed decoration entries so indices stay aligned with the webview. */
    private validateDecoration(): boolean {
        let updated = false;

        if (!Array.isArray(this.save.decoration)) {
            this.save.decoration = [];
            return true;
        }
        const validDecor = this.save.decoration.filter(
            (d): d is Decoration => isPlainObject(d)
                && typeof d.category === 'string' && typeof d.name === 'string'
                && typeof d.x === 'number' && Number.isFinite(d.x)
                && typeof d.y === 'number' && Number.isFinite(d.y),
        );
        if (validDecor.length !== this.save.decoration.length) {
            this.save.decoration = validDecor;
            updated = true;
        }
        // Migrate typo'd preset names persisted by older versions
        for (const decor of this.save.decoration) {
            if (decor.category === 'DECOR_PLANTS' && DECOR_PLANTS_NAME_FIXES[decor.name]) {
                decor.name = DECOR_PLANTS_NAME_FIXES[decor.name];
                updated = true;
            }
        }
        return updated;
    }

    /** Drops malformed/unknown plant entries so indices stay aligned with the webview. */
    private validatePlants(): boolean {
        let updated = false;

        if (!Array.isArray(this.save.plants)) {
            this.save.plants = [];
            return true;
        }
        const validPlants = this.save.plants.filter(
            (p): p is PlantInstance => isPlainObject(p)
                && typeof p.plantId === 'string' && KNOWN_PLANT_IDS.has(p.plantId)
                && typeof p.x === 'number' && Number.isFinite(p.x)
                && typeof p.y === 'number' && Number.isFinite(p.y),
        );
        if (validPlants.length !== this.save.plants.length) {
            this.save.plants = validPlants;
            updated = true;
        }
        for (const plant of this.save.plants) {
            if (typeof plant.phase !== 'number' || !Number.isFinite(plant.phase) || plant.phase < 0) {
                plant.phase = 0;
                updated = true;
            }
            if (typeof plant.phaseStartTime !== 'string' || Number.isNaN(new Date(plant.phaseStartTime).getTime())) {
                plant.phaseStartTime = new Date().toISOString();
                updated = true;
            }
            if (plant.mulch !== undefined && !VALID_MULCH_IDS.has(plant.mulch)) {
                plant.mulch = undefined;
                plant.mulchAppliedAt = undefined;
                updated = true;
            }
        }
        return updated;
    }

    private validateInventory(): boolean {
        let updated = false;

        if (!isPlainObject(this.save.inventory)) {
            this.save.inventory = defaultInventory();
            return true;
        }
        // Ensure all values are non-negative numbers
        for (const key of Object.keys(this.save.inventory)) {
            if (typeof this.save.inventory[key] !== 'number' || this.save.inventory[key] < 0) {
                this.save.inventory[key] = 0;
                updated = true;
            }
        }
        return updated;
    }

    /** Validates autoFeed, streak, and telemetry. */
    private validateMeta(): boolean {
        let updated = false;

        if (typeof this.save.autoFeed !== 'boolean') {
            this.save.autoFeed = false;
            updated = true;
        }

        // Validate streak (merge with defaults and sanitize each field — an
        // incomplete streak object would otherwise produce NaN on increment)
        if (!isPlainObject(this.save.streak)) {
            this.save.streak = defaultStreak();
            updated = true;
        } else {
            const raw = this.save.streak as Record<string, unknown>;
            const sanitized = {
                currentStreak: toNonNegativeInt(raw.currentStreak),
                lastClaimDate: typeof raw.lastClaimDate === 'string' ? raw.lastClaimDate : '',
                longestStreak: toNonNegativeInt(raw.longestStreak),
                totalRewardsClaimed: toNonNegativeInt(raw.totalRewardsClaimed),
            };
            if (sanitized.currentStreak !== raw.currentStreak
                || sanitized.lastClaimDate !== raw.lastClaimDate
                || sanitized.longestStreak !== raw.longestStreak
                || sanitized.totalRewardsClaimed !== raw.totalRewardsClaimed) {
                updated = true;
            }
            this.save.streak = sanitized;
        }

        // Validate telemetry
        if (!isPlainObject(this.save.telemetry)) {
            this.save.telemetry = defaultTelemetry();
            updated = true;
        } else {
            // Merge with defaults so new fields are always present
            this.save.telemetry = { ...defaultTelemetry(), ...this.save.telemetry };
        }
        return updated;
    }

    /**
     * Writes the current save state to disk atomically (temp file + rename)
     * so a crash mid-write can never truncate the save.
     * Returns false when the write failed.
     */
    private writeToDisk(): boolean {
        try {
            const tmpPath = `${this.savePath}.tmp`;
            fs.writeFileSync(tmpPath, JSON.stringify(this.save, null, 4));
            fs.renameSync(tmpPath, this.savePath);
            return true;
        } catch (e) {
            log('Failed to write save file:', e);
            return false;
        }
    }

    /**
     * Writes the current save state to disk immediately. Use for critical saves
     * (shutdown, import). Returns false when the write failed.
     */
    public saveGame(): boolean {
        clearTimeout(this.saveTimer);
        this.saveTimer = undefined;
        return this.writeToDisk();
    }

    /** Schedules a debounced save. Multiple rapid calls coalesce into a single disk write. */
    public scheduleSave(): void {
        if (this.saveTimer !== undefined) { return; }
        this.saveTimer = setTimeout(() => {
            this.saveTimer = undefined;
            this.writeToDisk();
        }, SaveManager.SAVE_DELAY_MS);
    }

    /** Flushes any pending debounced save to disk immediately. */
    public flushSave(): void {
        if (this.saveTimer !== undefined) {
            this.saveGame();
        }
    }

    /** Migrates the old pets.json file into the current save. */
    private loadPetsFile(): void {
        const petsPath = path.join(this.storageFolder, 'pets.json');

        if (fs.existsSync(petsPath)) {
            try {
                this.save.pets = JSON.parse(fs.readFileSync(petsPath, 'utf8'));

                if (Array.isArray(this.save.pets)) {
                    fs.unlinkSync(petsPath);
                } else {
                    throw new TypeError('Failed to read old pets file');
                }
            } catch (e) {
                log('Failed to load old pets file:', e);
                this.save.pets = [];
            }
        } else {
            this.save.pets = [];
        }
    }

    /** Adds a pet if under the limit. Returns true on success. */
    public addPet(pet: Pet): boolean {
        if (this.save.pets.length >= this.maxPokemon) {
            return false;
        }

        this.save.pets.push(pet);
        this.scheduleSave();
        return true;
    }

    /** Removes the pet at the given index. Returns the removed pet or undefined. */
    public removePet(index: number): Pet | undefined {
        if (index < 0 || index >= this.save.pets.length) {
            return undefined;
        }

        const [removed] = this.save.pets.splice(index, 1);
        this.scheduleSave();
        return removed;
    }

    /** Updates the money balance (clamped to [0, MAX_MONEY]) and saves. */
    public updateMoney(amount: number): void {
        this.save.money = Math.min(MAX_MONEY, Math.max(0, amount));
        this.scheduleSave();
    }

    /** Updates a consumable count in the inventory and saves. */
    public updateInventory(consumableId: string, amount: number): void {
        this.save.inventory[consumableId] = Math.max(0, amount);
        // Clean up zero entries
        if (this.save.inventory[consumableId] === 0) {
            delete this.save.inventory[consumableId];
        }
        this.scheduleSave();
    }

    /** Gets the count of a specific consumable. */
    public getConsumableCount(consumableId: string): number {
        return this.save.inventory[consumableId] ?? 0;
    }

    /** Adds a decoration and saves. */
    public addDecor(decor: Decoration): void {
        this.save.decoration.push(decor);
        this.scheduleSave();
    }

    /** Moves a decoration to a new position and saves. */
    public moveDecor(index: number, x: number, y: number): void {
        const decoration = this.save.decoration[index];
        if (decoration) {
            decoration.x = x;
            decoration.y = y;
            this.scheduleSave();
        }
    }

    /** Removes the decoration at the given index and saves. */
    public removeDecor(index: number): void {
        if (index < 0 || index >= this.save.decoration.length) { return; }
        this.save.decoration.splice(index, 1);
        this.scheduleSave();
    }

    /** Adds a plant and saves. */
    public addPlant(plant: PlantInstance): void {
        this.save.plants.push(plant);
        this.scheduleSave();
    }

    /** Moves a plant to a new position and saves. */
    public movePlant(index: number, x: number, y: number): void {
        const plant = this.save.plants[index];
        if (plant) {
            plant.x = x;
            plant.y = y;
            this.scheduleSave();
        }
    }

    /** Removes the plant at the given index and saves. */
    public removePlant(index: number): void {
        if (index < 0 || index >= this.save.plants.length) { return; }
        this.save.plants.splice(index, 1);
        this.scheduleSave();
    }

    /**
     * Advances a plant's phase and resets its phase start time.
     * Pass `phaseStartTime` to preserve leftover growth time when a phase
     * boundary was crossed between ticks; defaults to now.
     */
    public updatePlantPhase(index: number, phase: number, phaseStartTime?: string): void {
        const plant = this.save.plants[index];
        if (plant) {
            plant.phase = phase;
            plant.phaseStartTime = phaseStartTime ?? new Date().toISOString();
            this.scheduleSave();
        }
    }

    /** Updates a pet's HP and/or stamina values. */
    public updatePetStats(index: number, hp: number, stamina: number): void {
        const pet = this.save.pets[index];
        if (!pet) { return; }
        pet.hp = Math.max(0, hp);
        pet.stamina = Math.max(0, stamina);
        this.scheduleSave();
    }
}
