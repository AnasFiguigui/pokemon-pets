import { describe, it, expect, vi, afterEach } from 'vitest';
import { DayNightCycle } from '../day-night';

describe('DayNightCycle', () => {
    afterEach(() => { vi.restoreAllMocks(); });

    // ── getTimeOfDay ────────────────────────────────────────────────────

    describe('getTimeOfDay', () => {
        it('returns "day" at 06:00', () => {
            expect(DayNightCycle.getTimeOfDay(new Date('2025-06-01T06:00:00'))).toBe('day');
        });

        it('returns "day" at 12:00', () => {
            expect(DayNightCycle.getTimeOfDay(new Date('2025-06-01T12:00:00'))).toBe('day');
        });

        it('returns "day" at 19:59', () => {
            expect(DayNightCycle.getTimeOfDay(new Date('2025-06-01T19:59:00'))).toBe('day');
        });

        it('returns "night" at 20:00', () => {
            expect(DayNightCycle.getTimeOfDay(new Date('2025-06-01T20:00:00'))).toBe('night');
        });

        it('returns "night" at 23:59', () => {
            expect(DayNightCycle.getTimeOfDay(new Date('2025-06-01T23:59:00'))).toBe('night');
        });

        it('returns "night" at 00:00', () => {
            expect(DayNightCycle.getTimeOfDay(new Date('2025-06-01T00:00:00'))).toBe('night');
        });

        it('returns "night" at 05:59', () => {
            expect(DayNightCycle.getTimeOfDay(new Date('2025-06-01T05:59:00'))).toBe('night');
        });
    });

    // ── getTint ─────────────────────────────────────────────────────────

    describe('getTint', () => {
        it('returns "none" for day', () => {
            expect(DayNightCycle.getTint('day')).toBe('none');
        });

        it('returns a CSS filter string for night', () => {
            const tint = DayNightCycle.getTint('night');
            expect(tint).toContain('brightness');
            expect(tint).toContain('saturate');
            expect(tint).not.toBe('none');
        });
    });

    // ── pickWildPokemon ─────────────────────────────────────────────────

    describe('pickWildPokemon', () => {
        it('returns undefined during the day when no daytime pokemon exist', () => {
            // Currently only meowth exists and it's nightOnly
            const result = DayNightCycle.pickWildPokemon(new Date('2025-06-01T12:00:00'));
            expect(result).toBeUndefined();
        });

        it('returns a string during the night', () => {
            const result = DayNightCycle.pickWildPokemon(new Date('2025-06-01T23:00:00'));
            expect(typeof result).toBe('string');
            expect(result?.length).toBeGreaterThan(0);
        });

        it('does not return nightOnly pokemon during the day', () => {
            // Run enough trials to have confidence
            for (let i = 0; i < 100; i++) {
                const result = DayNightCycle.pickWildPokemon(new Date('2025-06-01T12:00:00'));
                expect(result).not.toBe('meowth');
            }
        });

        it('can return nightOnly pokemon during the night', () => {
            // Seed: try many times — meowth should appear at least once at night
            const results = new Set<string>();
            for (let i = 0; i < 200; i++) {
                const result = DayNightCycle.pickWildPokemon(new Date('2025-06-01T23:00:00'));
                if (result) { results.add(result); }
            }
            expect(results.has('meowth')).toBe(true);
        });
    });
});
