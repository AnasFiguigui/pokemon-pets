import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import { Decoration, Pet, PlantInstance, Save, getMaxHp, getMaxStamina } from './models';

export const MAX_SUMMONED_POKEMONS = 6;

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

export class SaveManager {
    private readonly storageFolder: string;
    private readonly savePath: string;
    public save: Save;

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

    /** Loads the game from disk, creating defaults when necessary. */
    public loadGame(): void {
        // Create storage folder if it does not exist
        if (!fs.existsSync(this.storageFolder)) {
            fs.mkdirSync(this.storageFolder, { recursive: true });
        }

        let saveUpdated = false;

        // Check if save file exists
        if (fs.existsSync(this.savePath)) {
            try {
                this.save = JSON.parse(fs.readFileSync(this.savePath, 'utf8'));
            } catch (e) {
                console.error('Failed to load save file:', e);
                this.save = new Save();
                this.loadPetsFile();
                saveUpdated = true;
            }
        } else {
            this.loadPetsFile();
            saveUpdated = true;
        }

        // Validate money
        if (typeof this.save.money !== 'number') {
            this.save.money = 0;
            saveUpdated = true;
        }

        // Validate pets
        if (!Array.isArray(this.save.pets)) {
            this.save.pets = [];
            saveUpdated = true;
        } else if (this.save.pets.length > MAX_SUMMONED_POKEMONS) {
            this.save.pets = this.save.pets.slice(0, MAX_SUMMONED_POKEMONS);
            saveUpdated = true;
        }

        // Initialize HP/Stamina for pets that don't have them yet
        for (const pet of this.save.pets) {
            const maxHp = getMaxHp(pet);
            const maxStamina = getMaxStamina(pet);
            if (typeof pet.hp !== 'number' || pet.hp <= 0) {
                pet.hp = maxHp;
                saveUpdated = true;
            }
            if (typeof pet.stamina !== 'number' || pet.stamina <= 0) {
                pet.stamina = maxStamina;
                saveUpdated = true;
            }
            // Clamp to current max (in case level changed)
            if (pet.hp > maxHp) { pet.hp = maxHp; saveUpdated = true; }
            if (pet.stamina > maxStamina) { pet.stamina = maxStamina; saveUpdated = true; }

            // Initialize friendship for pets that don't have it yet (neutral range 50–99)
            if (typeof pet.friendship !== 'number') {
                pet.friendship = 50 + Math.floor(Math.random() * 50);
                saveUpdated = true;
            }
            // Validate heldItem (must be string or undefined)
            if (pet.heldItem !== undefined && typeof pet.heldItem !== 'string') {
                pet.heldItem = undefined;
                saveUpdated = true;
            }
            // Clamp friendship to [0, 255]
            if (pet.friendship < 0) { pet.friendship = 0; saveUpdated = true; }
            if (pet.friendship > 255) { pet.friendship = 255; saveUpdated = true; }
        }

        // Validate decoration
        if (!Array.isArray(this.save.decoration)) {
            this.save.decoration = [];
            saveUpdated = true;
        }

        // Validate plants
        if (!Array.isArray(this.save.plants)) {
            this.save.plants = [];
            saveUpdated = true;
        }

        // Validate inventory
        if (typeof this.save.inventory !== 'object' || this.save.inventory === null || Array.isArray(this.save.inventory)) {
            this.save.inventory = defaultInventory();
            saveUpdated = true;
        } else {
            // Ensure all values are non-negative numbers
            for (const key of Object.keys(this.save.inventory)) {
                if (typeof this.save.inventory[key] !== 'number' || this.save.inventory[key] < 0) {
                    this.save.inventory[key] = 0;
                    saveUpdated = true;
                }
            }
        }

        // Validate autoFeed
        if (typeof this.save.autoFeed !== 'boolean') {
            this.save.autoFeed = false;
            saveUpdated = true;
        }

        // Validate streak
        if (typeof this.save.streak !== 'object' || this.save.streak === null) {
            this.save.streak = defaultStreak();
            saveUpdated = true;
        }

        // Validate telemetry
        if (typeof this.save.telemetry !== 'object' || this.save.telemetry === null) {
            this.save.telemetry = defaultTelemetry();
            saveUpdated = true;
        } else {
            // Merge with defaults so new fields are always present
            this.save.telemetry = { ...defaultTelemetry(), ...this.save.telemetry };
        }

        if (saveUpdated) {
            this.saveGame();
        }
    }

    /** Writes the current save state to disk immediately. Use for critical saves (shutdown, import). */
    public saveGame(): void {
        clearTimeout(this.saveTimer);
        this.saveTimer = undefined;
        fs.writeFileSync(this.savePath, JSON.stringify(this.save, null, 4));
    }

    /** Schedules a debounced save. Multiple rapid calls coalesce into a single disk write. */
    public scheduleSave(): void {
        if (this.saveTimer !== undefined) { return; }
        this.saveTimer = setTimeout(() => {
            this.saveTimer = undefined;
            fsp.writeFile(this.savePath, JSON.stringify(this.save, null, 4)).catch(err => {
                console.error('Failed to write save file:', err);
            });
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
                console.error('Failed to load old pets file:', e);
                this.save.pets = [];
            }
        } else {
            this.save.pets = [];
        }
    }

    /** Adds a pet if under the limit. Returns true on success. */
    public addPet(pet: Pet): boolean {
        if (this.save.pets.length >= MAX_SUMMONED_POKEMONS) {
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

    /** Updates the money balance and saves. */
    public updateMoney(amount: number): void {
        this.save.money = amount;
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

    /** Advances a plant's phase and resets its phase start time. */
    public updatePlantPhase(index: number, phase: number): void {
        const plant = this.save.plants[index];
        if (plant) {
            plant.phase = phase;
            plant.phaseStartTime = new Date().toISOString();
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
