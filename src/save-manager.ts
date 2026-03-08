import * as fs from 'node:fs';
import * as path from 'node:path';
import { Decoration, Pet, Save } from './models';

export const MAX_SUMMONED_POKEMONS = 7;

/** Default inventory data for new or missing saves. */
function defaultInventory() {
    return { candy: 0 };
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

        // Validate decoration
        if (!Array.isArray(this.save.decoration)) {
            this.save.decoration = [];
            saveUpdated = true;
        }

        // Validate inventory
        if (typeof this.save.inventory !== 'object' || this.save.inventory === null) {
            this.save.inventory = defaultInventory();
            saveUpdated = true;
        } else if (typeof this.save.inventory.candy !== 'number') {
            this.save.inventory.candy = 0;
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
        }

        if (saveUpdated) {
            this.saveGame();
        }
    }

    /** Writes the current save state to disk. */
    public saveGame(): void {
        fs.writeFileSync(this.savePath, JSON.stringify(this.save, null, 4));
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
        this.saveGame();
        return true;
    }

    /** Removes the pet at the given index. Returns the removed pet or undefined. */
    public removePet(index: number): Pet | undefined {
        if (index < 0 || index >= this.save.pets.length) {
            return undefined;
        }

        const [removed] = this.save.pets.splice(index, 1);
        this.saveGame();
        return removed;
    }

    /** Updates the money balance and saves. */
    public updateMoney(amount: number): void {
        this.save.money = amount;
        this.saveGame();
    }

    /** Updates the inventory and saves. */
    public updateInventory(candy: number): void {
        this.save.inventory.candy = Math.max(0, candy);
        this.saveGame();
    }

    /** Adds a decoration and saves. */
    public addDecor(decor: Decoration): void {
        this.save.decoration.push(decor);
        this.saveGame();
    }

    /** Moves a decoration to a new position and saves. */
    public moveDecor(index: number, x: number, y: number): void {
        const decoration = this.save.decoration[index];
        if (decoration) {
            decoration.x = x;
            decoration.y = y;
            this.saveGame();
        }
    }

    /** Removes the decoration at the given index and saves. */
    public removeDecor(index: number): void {
        this.save.decoration.splice(index, 1);
        this.saveGame();
    }
}
