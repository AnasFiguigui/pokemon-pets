import type { Save } from './models';

/**
 * Achievements & badges.
 *
 * Every achievement is tied to one badge sprite in media/sprites/badges.png
 * (locked variant: badges_locked.png). The sheet is 128×112 px — 8 columns ×
 * 7 rows of 16×16 sprites; grid (4,4) and (5,4) are empty, leaving 54 badges.
 *
 * Progress is tracked in save.progress (ALWAYS on — unlike the opt-in
 * telemetry): plain counters bumped by the extension on game events, plus a
 * few derived metrics computed on demand. Each achievement is just a
 * `metric >= target` check, which keeps definitions data-driven and lets the
 * UI show a progress bar for every locked badge.
 */

export type BadgeReward = {
    gold?: number;
    /** consumable id → quantity. */
    items?: Record<string, number>;
};

export type AchievementDef = {
    /** Stable id (also the key in save.progress.unlocked). */
    id: string;
    /** Badge display name (e.g. "Boulder Badge"). */
    name: string;
    /** Achievement title (e.g. "First Partner"). */
    title: string;
    /** What the player has to do. */
    description: string;
    /** Sprite cell in the badge sheet. */
    col: number;
    row: number;
    /** Metric that must reach `target` to unlock. */
    metric: string;
    target: number;
    reward: BadgeReward;
};

/** The 8 Eevee evolutions (lowercased form names). */
export const EEVEELUTIONS: readonly string[] = [
    'vaporeon', 'jolteon', 'flareon', 'espeon', 'umbreon', 'leafeon', 'glaceon', 'sylveon',
];

export { defaultProgress, defaultCalendar } from './models';

// ── Achievement definitions (54 — one per badge, easy → long-term) ──────

export const Achievements: readonly AchievementDef[] = [
    // Row 0 — Kanto: first steps
    { id: 'boulder', name: 'Boulder Badge', title: 'First Partner', description: 'Welcome your first Pokémon.', col: 0, row: 0, metric: 'petsSummoned', target: 1, reward: { gold: 100 } },
    { id: 'cascade', name: 'Cascade Badge', title: 'Sweet Tooth', description: 'Feed a Rare Candy.', col: 1, row: 0, metric: 'candyFed', target: 1, reward: { gold: 100 } },
    { id: 'thunder', name: 'Thunder Badge', title: 'Gotcha!', description: 'Catch a wild Pokémon.', col: 2, row: 0, metric: 'wildCaught', target: 1, reward: { gold: 100 } },
    { id: 'rainbow', name: 'Rainbow Badge', title: 'Green Thumb', description: 'Harvest your first berries.', col: 3, row: 0, metric: 'berriesHarvested', target: 1, reward: { gold: 100 } },
    { id: 'soul', name: 'Soul Badge', title: 'Fetch!', description: 'Have a Pokémon catch the ball.', col: 4, row: 0, metric: 'ballCatches', target: 1, reward: { gold: 100 } },
    { id: 'marsh', name: 'Marsh Badge', title: 'Window Shopper', description: 'Buy an item from the shop.', col: 5, row: 0, metric: 'itemsBought', target: 1, reward: { gold: 100 } },
    { id: 'volcano', name: 'Volcano Badge', title: 'Home Maker', description: 'Place your first decoration.', col: 6, row: 0, metric: 'decorPlaced', target: 1, reward: { gold: 100 } },
    { id: 'earth', name: 'Earth Badge', title: 'Metamorphosis', description: 'Evolve a Pokémon.', col: 7, row: 0, metric: 'evolutions', target: 1, reward: { gold: 150 } },

    // Row 1 — Johto: getting into it
    { id: 'zephyr', name: 'Zephyr Badge', title: 'Warming Up', description: 'Reach a 3-day coding streak.', col: 0, row: 1, metric: 'longestStreak', target: 3, reward: { gold: 200 } },
    { id: 'hive', name: 'Hive Badge', title: 'Sower', description: 'Plant 5 seeds.', col: 1, row: 1, metric: 'plantsPlanted', target: 5, reward: { gold: 200 } },
    { id: 'plain', name: 'Plain Badge', title: 'Candy Shop', description: 'Feed 25 Rare Candies.', col: 2, row: 1, metric: 'candyFed', target: 25, reward: { gold: 200 } },
    { id: 'fog', name: 'Fog Badge', title: 'Field Researcher', description: 'Catch 10 wild Pokémon.', col: 3, row: 1, metric: 'wildCaught', target: 10, reward: { gold: 200 } },
    { id: 'storm', name: 'Storm Badge', title: 'Shipped It', description: 'Earn your first git push reward.', col: 4, row: 1, metric: 'pushes', target: 1, reward: { gold: 200 } },
    { id: 'mineral', name: 'Mineral Badge', title: 'Piggy Bank', description: 'Earn 5,000 gold in total.', col: 5, row: 1, metric: 'goldEarnedTotal', target: 5000, reward: { gold: 250 } },
    { id: 'glacier', name: 'Glacier Badge', title: 'Berry Picker', description: 'Harvest 25 berries.', col: 6, row: 1, metric: 'berriesHarvested', target: 25, reward: { gold: 200 } },
    { id: 'rising', name: 'Rising Badge', title: 'Full House', description: 'Have 6 Pokémon at the same time.', col: 7, row: 1, metric: 'teamSizeHighWater', target: 6, reward: { gold: 300 } },

    // Row 2 — Hoenn: regulars
    { id: 'stone', name: 'Stone Badge', title: 'Gardener', description: 'Apply mulch 5 times.', col: 0, row: 2, metric: 'mulchApplied', target: 5, reward: { gold: 300 } },
    { id: 'knuckle', name: 'Knuckle Badge', title: 'Best Friends', description: 'Watch 10 Pokémon playdates.', col: 1, row: 2, metric: 'playdates', target: 10, reward: { gold: 300 } },
    { id: 'dynamo', name: 'Dynamo Badge', title: 'Keyboard Warrior', description: 'Earn 100 file-save rewards.', col: 2, row: 2, metric: 'savesRewarded', target: 100, reward: { gold: 300 } },
    { id: 'heat', name: 'Heat Badge', title: 'Evolver', description: 'Evolve Pokémon 5 times.', col: 3, row: 2, metric: 'evolutions', target: 5, reward: { gold: 300 } },
    { id: 'balance', name: 'Balance Badge', title: 'Trainer', description: 'Raise a Pokémon to level 25.', col: 4, row: 2, metric: 'maxLevelReached', target: 25, reward: { gold: 300 } },
    { id: 'feather', name: 'Feather Badge', title: 'Star Retriever', description: 'Have Pokémon catch the ball 25 times.', col: 5, row: 2, metric: 'ballCatches', target: 25, reward: { gold: 300 } },
    { id: 'mind', name: 'Mind Badge', title: 'Collector', description: 'Own 10 different Pokémon forms.', col: 6, row: 2, metric: 'distinctFormsOwned', target: 10, reward: { gold: 400 } },
    { id: 'rain', name: 'Rain Badge', title: 'Regular Visitor', description: 'Claim 7 daily calendar rewards.', col: 7, row: 2, metric: 'calendarDaysClaimed', target: 7, reward: { gold: 300 } },

    // Row 3 — Sinnoh: committed
    { id: 'coal', name: 'Coal Badge', title: 'Decorator', description: 'Place 25 decorations.', col: 0, row: 3, metric: 'decorPlaced', target: 25, reward: { gold: 500 } },
    { id: 'forest', name: 'Forest Badge', title: 'Orchardist', description: 'Harvest 100 berries.', col: 1, row: 3, metric: 'berriesHarvested', target: 100, reward: { gold: 500 } },
    { id: 'cobble', name: 'Cobble Badge', title: 'One Week Wonder', description: 'Reach a 7-day coding streak.', col: 2, row: 3, metric: 'longestStreak', target: 7, reward: { gold: 500 } },
    { id: 'fen', name: 'Fen Badge', title: 'Big Spender', description: 'Spend 10,000 gold in total.', col: 3, row: 3, metric: 'goldSpentTotal', target: 10000, reward: { gold: 500 } },
    { id: 'relic', name: 'Relic Badge', title: 'Stone Cutter', description: 'Evolve a Pokémon with an evolution stone.', col: 4, row: 3, metric: 'stoneEvolutions', target: 1, reward: { gold: 500 } },
    { id: 'mine', name: 'Mine Badge', title: 'Gold Rush', description: 'Earn 25,000 gold in total.', col: 5, row: 3, metric: 'goldEarnedTotal', target: 25000, reward: { gold: 600 } },
    { id: 'icicle', name: 'Icicle Badge', title: 'Sugar Rush', description: 'Feed 100 Rare Candies.', col: 6, row: 3, metric: 'candyFed', target: 100, reward: { gold: 500 } },
    { id: 'beacon', name: 'Beacon Badge', title: 'Trusted Trainer', description: 'Reach 200 friendship with a Pokémon.', col: 7, row: 3, metric: 'maxFriendshipReached', target: 200, reward: { gold: 500 } },

    // Row 4 — Orange League + B2W2: specialists
    { id: 'coral-eye', name: 'Coral-Eye Badge', title: 'Committed', description: 'Earn 25 git commit rewards.', col: 0, row: 4, metric: 'commits', target: 25, reward: { gold: 750 } },
    { id: 'sea-ruby', name: 'Sea Ruby Badge', title: 'Release Manager', description: 'Earn 10 git push rewards.', col: 1, row: 4, metric: 'pushes', target: 10, reward: { gold: 750 } },
    { id: 'spike-shell', name: 'Spike Shell Badge', title: 'Safari Master', description: 'Catch 50 wild Pokémon.', col: 2, row: 4, metric: 'wildCaught', target: 50, reward: { gold: 750 } },
    { id: 'jade-star', name: 'Jade Star Badge', title: 'Curator', description: 'Own 20 different Pokémon forms.', col: 3, row: 4, metric: 'distinctFormsOwned', target: 20, reward: { gold: 1000 } },
    { id: 'toxic', name: 'Toxic Badge', title: 'Social Butterfly', description: 'Watch 50 Pokémon playdates.', col: 6, row: 4, metric: 'playdates', target: 50, reward: { gold: 750 } },
    { id: 'wave', name: 'Wave Badge', title: 'Perfect Month', description: 'Claim every calendar day in a month.', col: 7, row: 4, metric: 'calendarFullMonths', target: 1, reward: { gold: 1500 } },

    // Row 5 — Unova: veterans
    { id: 'trio', name: 'Trio Badge', title: 'Evolution Expert', description: 'Evolve Pokémon 15 times.', col: 0, row: 5, metric: 'evolutions', target: 15, reward: { gold: 1000 } },
    { id: 'basic', name: 'Basic Badge', title: 'Halfway There', description: 'Raise a Pokémon to level 50.', col: 1, row: 5, metric: 'maxLevelReached', target: 50, reward: { gold: 1000 } },
    { id: 'insect', name: 'Insect Badge', title: 'Farm Tycoon', description: 'Plant 50 seeds.', col: 2, row: 5, metric: 'plantsPlanted', target: 50, reward: { gold: 1000 } },
    { id: 'bolt', name: 'Bolt Badge', title: 'Unstoppable', description: 'Reach a 30-day coding streak.', col: 3, row: 5, metric: 'longestStreak', target: 30, reward: { gold: 2000 } },
    { id: 'quake', name: 'Quake Badge', title: 'Harvest Festival', description: 'Harvest 300 berries.', col: 4, row: 5, metric: 'berriesHarvested', target: 300, reward: { gold: 1000 } },
    { id: 'jet', name: 'Jet Badge', title: 'Tycoon', description: 'Earn 100,000 gold in total.', col: 5, row: 5, metric: 'goldEarnedTotal', target: 100000, reward: { gold: 2000 } },
    { id: 'freeze', name: 'Freeze Badge', title: 'Code Machine', description: 'Earn 500 file-save rewards.', col: 6, row: 5, metric: 'savesRewarded', target: 500, reward: { gold: 1000 } },
    { id: 'legend', name: 'Legend Badge', title: 'Perfect Bond', description: 'Reach 255 friendship with a Pokémon.', col: 7, row: 5, metric: 'maxFriendshipReached', target: 255, reward: { gold: 1500 } },

    // Row 6 — Kalos: long-term goals
    { id: 'bug', name: 'Bug Badge', title: 'Master Tracker', description: 'Catch 100 wild Pokémon.', col: 0, row: 6, metric: 'wildCaught', target: 100, reward: { gold: 2000 } },
    { id: 'cliff', name: 'Cliff Badge', title: 'Archivist', description: 'Own 30 different Pokémon forms.', col: 1, row: 6, metric: 'distinctFormsOwned', target: 30, reward: { gold: 2000 } },
    { id: 'rumble', name: 'Rumble Badge', title: 'Eevee Fanatic', description: 'Own all 8 Eevee evolutions.', col: 2, row: 6, metric: 'eeveeFormsOwned', target: 8, reward: { gold: 3000 } },
    { id: 'plant', name: 'Plant Badge', title: 'Candy Factory', description: 'Feed 500 Rare Candies.', col: 3, row: 6, metric: 'candyFed', target: 500, reward: { gold: 2000 } },
    { id: 'voltage', name: 'Voltage Badge', title: 'Deploy Legend', description: 'Earn 100 git push rewards.', col: 4, row: 6, metric: 'pushes', target: 100, reward: { gold: 3000 } },
    { id: 'fairy', name: 'Fairy Badge', title: 'Level Cap', description: 'Raise a Pokémon to level 100.', col: 5, row: 6, metric: 'maxLevelReached', target: 100, reward: { gold: 3000 } },
    { id: 'psychic', name: 'Psychic Badge', title: 'Daily Devotion', description: 'Claim 100 daily calendar rewards.', col: 6, row: 6, metric: 'calendarDaysClaimed', target: 100, reward: { gold: 3000 } },
    { id: 'iceberg', name: 'Iceberg Badge', title: 'Champion', description: 'Earn all other 53 badges.', col: 7, row: 6, metric: 'badgesUnlocked', target: 53, reward: { gold: 10000 } },
];

// ── Daily reward calendar ───────────────────────────────────────────────

/**
 * Reward template shared by every month, indexed by day-of-month (1-based →
 * entry 0 is day 1). Months shorter than 31 days simply don't use the tail.
 * Tweak the values freely — the UI and claiming logic read from here.
 */
export const CALENDAR_REWARDS: readonly BadgeReward[] = [
    /* 1  */ { gold: 50 },
    /* 2  */ { gold: 50 },
    /* 3  */ { gold: 75 },
    /* 4  */ { gold: 50 },
    /* 5  */ { gold: 75 },
    /* 6  */ { gold: 100 },
    /* 7  */ { gold: 100, items: { potion: 1 } },
    /* 8  */ { gold: 50 },
    /* 9  */ { gold: 75 },
    /* 10 */ { gold: 100 },
    /* 11 */ { gold: 75 },
    /* 12 */ { gold: 100 },
    /* 13 */ { gold: 100 },
    /* 14 */ { gold: 150, items: { candy: 1 } },
    /* 15 */ { gold: 100 },
    /* 16 */ { gold: 100 },
    /* 17 */ { gold: 125 },
    /* 18 */ { gold: 100 },
    /* 19 */ { gold: 125 },
    /* 20 */ { gold: 150 },
    /* 21 */ { gold: 150, items: { super_potion: 1 } },
    /* 22 */ { gold: 125 },
    /* 23 */ { gold: 150 },
    /* 24 */ { gold: 150 },
    /* 25 */ { gold: 175 },
    /* 26 */ { gold: 150 },
    /* 27 */ { gold: 175 },
    /* 28 */ { gold: 200, items: { candy: 2 } },
    /* 29 */ { gold: 200 },
    /* 30 */ { gold: 250 },
    /* 31 */ { gold: 300, items: { moon_stone: 1 } },
];

/** Returns the reward for a 1-based day of month. */
export function calendarRewardForDay(day: number): BadgeReward {
    const idx = Math.min(Math.max(1, Math.floor(day)), CALENDAR_REWARDS.length) - 1;
    return CALENDAR_REWARDS[idx];
}

/** 'YYYY-MM' key for the given date's month (local time). */
export function monthKey(date: Date = new Date()): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Number of days in the given date's month. */
export function daysInMonth(date: Date = new Date()): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

// ── Metrics & unlock evaluation ─────────────────────────────────────────

/**
 * Updates the "high-water" counters that mirror transient state (pets can
 * faint or leave, but a reached milestone is never taken away).
 */
export function updateHighWaterMarks(save: Save): void {
    const counters = save.progress.counters;
    let maxLevel = counters.maxLevelReached ?? 0;
    let maxFriendship = counters.maxFriendshipReached ?? 0;
    for (const pet of save.pets) {
        maxLevel = Math.max(maxLevel, Math.min(pet.candyFed ?? 0, 100));
        maxFriendship = Math.max(maxFriendship, pet.friendship ?? 0);
        // Back-fill collection data: pets owned before achievements existed
        // (or before their next evolution) still count toward badges
        const form = typeof pet.form === 'string' && pet.form.length > 0 ? pet.form : pet.specie;
        save.progress.formsOwned[form.toLowerCase()] = 1;
    }
    counters.maxLevelReached = maxLevel;
    counters.maxFriendshipReached = maxFriendship;
    counters.teamSizeHighWater = Math.max(counters.teamSizeHighWater ?? 0, save.pets.length);
}

/** Computes every metric value (raw counters + derived) for a save. */
export function computeMetrics(save: Save): Record<string, number> {
    const progress = save.progress;
    const metrics: Record<string, number> = { ...progress.counters };
    metrics.distinctFormsOwned = Object.keys(progress.formsOwned).length;
    metrics.eeveeFormsOwned = EEVEELUTIONS.filter(form => progress.formsOwned[form]).length;
    metrics.longestStreak = save.streak?.longestStreak ?? 0;
    metrics.badgesUnlocked = Object.keys(progress.unlocked).length;
    return metrics;
}

/**
 * Unlocks every achievement whose metric now meets its target, recording the
 * unlock date in save.progress.unlocked. Loops so chained unlocks (like the
 * completionist badge) resolve in one call. Returns the newly unlocked defs
 * in definition order.
 */
export function evaluateUnlocks(save: Save, nowIso: string = new Date().toISOString()): AchievementDef[] {
    const newlyUnlocked: AchievementDef[] = [];
    for (let pass = 0; pass < 3; pass++) {
        const metrics = computeMetrics(save);
        let changed = false;
        for (const def of Achievements) {
            if (save.progress.unlocked[def.id]) { continue; }
            if ((metrics[def.metric] ?? 0) >= def.target) {
                save.progress.unlocked[def.id] = nowIso;
                newlyUnlocked.push(def);
                changed = true;
            }
        }
        if (!changed) { break; }
    }
    return newlyUnlocked;
}
