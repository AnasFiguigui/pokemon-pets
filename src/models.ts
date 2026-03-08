import type { QuickPickItem } from 'vscode';

export type Pet = {
    name: string;
    specie: string;
    color: string;
    form?: string;
    sprite?: string;
    spriteSize?: 32 | 48;
    candyFed?: number;
};

export type Decoration = {
    x: number;
    y: number;
    category: string;
    name: string;
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
    candy: number;
};

export class Save {
    public money: number = 0;
    public pets: Pet[] = [];
    public decoration: Decoration[] = [];
    public inventory: Inventory = {
        candy: 0,
    };
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
