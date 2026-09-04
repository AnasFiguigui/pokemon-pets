import type { QuickPickItem } from 'vscode';

/** Current save-file schema version (bump when the format changes incompatibly). */
export const SAVE_VERSION = 1;

/** Hard cap on candy fed to a single pet (level display caps at 100). */
export const MAX_CANDY_FED = 1000;

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
    heldItem?: string;
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
    /** Applied mulch modifier (undefined = none). 'stable_mulch' is legacy — removed from the shop but kept so old saves stay valid. */
    mulch?: 'growth_mulch' | 'damp_mulch' | 'stable_mulch' | 'gooey_mulch';
    /** ISO timestamp when mulch was applied (used for growth_mulch 1h expiry). */
    mulchAppliedAt?: string;
};

/** All mulch ids accepted in save data (includes the legacy stable_mulch). */
export const VALID_MULCH_IDS: ReadonlySet<string> = new Set(['growth_mulch', 'damp_mulch', 'stable_mulch', 'gooey_mulch']);

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

/** Always-on progress tracking that powers achievements/badges. */
export type ProgressData = {
    /** Named lifetime counters (candy fed, berries harvested, …). */
    counters: Record<string, number>;
    /** Lowercased form names ever owned (value is always 1). */
    formsOwned: Record<string, number>;
    /** Achievement id → ISO date it was unlocked. */
    unlocked: Record<string, string>;
};

/** Monthly daily-reward calendar state. */
export type CalendarData = {
    /** 'YYYY-MM' of the month being tracked; resets on rollover. */
    month: string;
    /** Days of the month (1-based) already claimed. */
    claimedDays: number[];
};

/** Fresh progress data (single source of truth for the shape). */
export function defaultProgress(): ProgressData {
    return { counters: {}, formsOwned: {}, unlocked: {} };
}

/** Fresh calendar data. */
export function defaultCalendar(): CalendarData {
    return { month: '', claimedDays: [] };
}

export class Save {
    public version: number = SAVE_VERSION;
    public money: number = 0;
    public pets: Pet[] = [];
    public decoration: Decoration[] = [];
    public plants: PlantInstance[] = [];
    public inventory: Inventory = {};
    public autoFeed: boolean = false;
    public progress: ProgressData = defaultProgress();
    public calendar: CalendarData = defaultCalendar();
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
