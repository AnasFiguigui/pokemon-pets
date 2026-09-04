import { describe, it, expect } from 'vitest';
import {
    Achievements, CALENDAR_REWARDS, EEVEELUTIONS,
    calendarRewardForDay, computeMetrics, daysInMonth, defaultCalendar, defaultProgress,
    evaluateUnlocks, monthKey, updateHighWaterMarks,
} from '../achievements';
import { Consumables } from '../game-data';
import { Save } from '../models';

const ConsumableIds = new Set(Consumables.map(c => c.id));

/** Sprite cells that are empty in the badge sheet. */
const EMPTY_CELLS = new Set(['4,4', '5,4']);

function freshSave(): Save {
    const save = new Save();
    save.progress = defaultProgress();
    save.calendar = defaultCalendar();
    return save;
}

describe('achievement definitions', () => {
    it('defines exactly 54 achievements (one per badge)', () => {
        expect(Achievements).toHaveLength(54);
    });

    it('uses unique ids', () => {
        const ids = new Set(Achievements.map(a => a.id));
        expect(ids.size).toBe(Achievements.length);
    });

    it('uses unique sprite cells inside the 8×7 sheet, skipping the empty tiles', () => {
        const cells = new Set<string>();
        for (const def of Achievements) {
            expect(def.col).toBeGreaterThanOrEqual(0);
            expect(def.col).toBeLessThan(8);
            expect(def.row).toBeGreaterThanOrEqual(0);
            expect(def.row).toBeLessThan(7);
            const key = `${def.col},${def.row}`;
            expect(EMPTY_CELLS.has(key), `badge ${def.id} sits on empty tile ${key}`).toBe(false);
            cells.add(key);
        }
        expect(cells.size).toBe(54);
    });

    it('has positive targets and non-empty names/titles/descriptions', () => {
        for (const def of Achievements) {
            expect(def.target).toBeGreaterThan(0);
            expect(def.name.length).toBeGreaterThan(0);
            expect(def.title.length).toBeGreaterThan(0);
            expect(def.description.length).toBeGreaterThan(0);
        }
    });

    it('only rewards known consumable ids and non-negative gold', () => {
        for (const def of Achievements) {
            if (def.reward.gold !== undefined) {
                expect(def.reward.gold).toBeGreaterThanOrEqual(0);
            }
            for (const [itemId, count] of Object.entries(def.reward.items ?? {})) {
                expect(ConsumableIds.has(itemId), `unknown reward item ${itemId} on ${def.id}`).toBe(true);
                expect(count).toBeGreaterThan(0);
            }
        }
    });

    it('every metric is producible by computeMetrics', () => {
        const save = freshSave();
        // Seed one counter per metric so the metric namespace is visible
        for (const def of Achievements) {
            save.progress.counters[def.metric] = save.progress.counters[def.metric] ?? 0;
        }
        const metrics = computeMetrics(save);
        for (const def of Achievements) {
            expect(typeof metrics[def.metric], `metric ${def.metric} of ${def.id}`).toBe('number');
        }
    });
});

describe('calendar rewards', () => {
    it('covers all 31 possible days', () => {
        expect(CALENDAR_REWARDS).toHaveLength(31);
    });

    it('only rewards known consumable ids', () => {
        for (const reward of CALENDAR_REWARDS) {
            for (const itemId of Object.keys(reward.items ?? {})) {
                expect(ConsumableIds.has(itemId), `unknown calendar item ${itemId}`).toBe(true);
            }
        }
    });

    it('clamps out-of-range days', () => {
        expect(calendarRewardForDay(0)).toBe(CALENDAR_REWARDS[0]);
        expect(calendarRewardForDay(1)).toBe(CALENDAR_REWARDS[0]);
        expect(calendarRewardForDay(31)).toBe(CALENDAR_REWARDS[30]);
        expect(calendarRewardForDay(99)).toBe(CALENDAR_REWARDS[30]);
    });

    it('monthKey and daysInMonth agree with the calendar', () => {
        expect(monthKey(new Date(2026, 8, 4))).toBe('2026-09');
        expect(daysInMonth(new Date(2026, 8, 4))).toBe(30);
        expect(daysInMonth(new Date(2026, 1, 1))).toBe(28);
        expect(daysInMonth(new Date(2028, 1, 1))).toBe(29); // leap year
        expect(daysInMonth(new Date(2026, 0, 1))).toBe(31);
    });
});

describe('metrics & unlocking', () => {
    it('derives collection metrics from formsOwned', () => {
        const save = freshSave();
        save.progress.formsOwned = { pikachu: 1, vaporeon: 1, jolteon: 1 };
        const metrics = computeMetrics(save);
        expect(metrics.distinctFormsOwned).toBe(3);
        expect(metrics.eeveeFormsOwned).toBe(2);
    });

    it('counts all 8 eeveelutions', () => {
        const save = freshSave();
        for (const form of EEVEELUTIONS) { save.progress.formsOwned[form] = 1; }
        expect(computeMetrics(save).eeveeFormsOwned).toBe(8);
    });

    it('updateHighWaterMarks never lowers milestones', () => {
        const save = freshSave();
        save.pets = [{ name: 'A', specie: 'Pikachu', color: 'c', candyFed: 40, friendship: 180 }];
        updateHighWaterMarks(save);
        expect(save.progress.counters.maxLevelReached).toBe(40);
        expect(save.progress.counters.maxFriendshipReached).toBe(180);
        expect(save.progress.counters.teamSizeHighWater).toBe(1);

        save.pets = []; // pet leaves — milestones stay
        updateHighWaterMarks(save);
        expect(save.progress.counters.maxLevelReached).toBe(40);
        expect(save.progress.counters.maxFriendshipReached).toBe(180);
    });

    it('unlocks achievements when targets are met and records the date', () => {
        const save = freshSave();
        save.progress.counters.candyFed = 1;
        const newly = evaluateUnlocks(save, '2026-09-04T00:00:00.000Z');
        expect(newly.map(d => d.id)).toContain('cascade');
        expect(save.progress.unlocked.cascade).toBe('2026-09-04T00:00:00.000Z');
    });

    it('does not unlock twice', () => {
        const save = freshSave();
        save.progress.counters.candyFed = 1;
        evaluateUnlocks(save);
        expect(evaluateUnlocks(save)).toHaveLength(0);
    });

    it('unlocks the completionist badge in the same pass as the 53rd badge', () => {
        const save = freshSave();
        // Pre-unlock 52 badges, then satisfy one more regular achievement
        const others = Achievements.filter(d => d.id !== 'iceberg' && d.id !== 'cascade');
        for (const def of others) { save.progress.unlocked[def.id] = 'x'; }
        save.progress.counters.candyFed = 1; // unlocks 'cascade' → 53 total

        const newly = evaluateUnlocks(save);
        const ids = newly.map(d => d.id);
        expect(ids).toContain('cascade');
        expect(ids).toContain('iceberg');
        expect(Object.keys(save.progress.unlocked)).toHaveLength(54);
    });
});
