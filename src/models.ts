import type { QuickPickItem } from 'vscode';

export type Pet = {
    name: string;
    specie: string;
    color: string;
    form?: string;
    sprite?: string;
    spriteSize?: 32 | 48;
    candyFed?: number;
    hp?: number;
    stamina?: number;
    friendship?: number;
};

/** Returns the maximum HP for a pet based on its level (candyFed). */
export function getMaxHp(pet: Pet): number {
    const level = Math.min(pet.candyFed ?? 0, 100);
    return 50 + level * 2;
}

/** Returns the maximum stamina for a pet based on its level (candyFed). */
export function getMaxStamina(pet: Pet): number {
    const level = Math.min(pet.candyFed ?? 0, 100);
    return 50 + level * 2;
}

export type Decoration = {
    x: number;
    y: number;
    category: string;
    name: string;
};

export type PlantInstance = {
    x: number;
    y: number;
    plantId: string;
    /** Current growth phase (0 = seed, 1 = sprout, 2 = blossom, 3 = fruit, 4 = ripe/harvestable). */
    phase: number;
    /** ISO timestamp when the current phase started. */
    phaseStartTime: string;
    /** Applied mulch modifier (undefined = none). */
    mulch?: 'growth_mulch' | 'damp_mulch' | 'stable_mulch' | 'gooey_mulch';
    /** Number of regrow cycles completed (for gooey_mulch tracking). */
    regrowCount?: number;
};

export type StreakData = {
    currentStreak: number;
    lastClaimDate: string;      // ISO date string (YYYY-MM-DD)
    longestStreak: number;
    totalRewardsClaimed: number;
};

export type TelemetryData = {
    pokemonAdded: { [specie: string]: number };
    pokemonEvolved: { [specie: string]: number };
    candyFed: number;
    wildPokemonCaught: number;
    decorationsPlaced: number;
    goldEarned: number;
    goldSpent: number;
    sessionsCount: number;
    lastSessionDate: string;    // ISO date string (YYYY-MM-DD)
};

export type Inventory = {
    [consumableId: string]: number;
};

export class Save {
    public money: number = 0;
    public pets: Pet[] = [];
    public decoration: Decoration[] = [];
    public plants: PlantInstance[] = [];
    public inventory: Inventory = {};
    public autoFeed: boolean = false;
    public streak: StreakData = {
        currentStreak: 0,
        lastClaimDate: '',
        longestStreak: 0,
        totalRewardsClaimed: 0,
    };
    public telemetry: TelemetryData = {
        pokemonAdded: {},
        pokemonEvolved: {},
        candyFed: 0,
        wildPokemonCaught: 0,
        decorationsPlaced: 0,
        goldEarned: 0,
        goldSpent: 0,
        sessionsCount: 0,
        lastSessionDate: '',
    };
}

export class PetItem implements QuickPickItem {
    public index: number;
    public label: string;
    public description: string;

    constructor(index: number, name: string, description: string) {
        this.index = index;
        this.label = name;
        this.description = description;
    }
}

/** Normalizes optional pet fields for webview rendering. */
export function normalizePet(pet: Pet): { form: string; sprite: string; spriteSize: 32 | 48 } {
    const form = typeof pet.form === 'string' ? pet.form : pet.specie;
    const sprite = typeof pet.sprite === 'string'
        ? pet.sprite
        : form.toLowerCase().replaceAll(' ', '_');
    const spriteSize: 32 | 48 = pet.spriteSize === 48 ? 48 : 32;
    return { form, sprite, spriteSize };
}
