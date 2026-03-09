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

    // ── getOverlayOpacity ─────────────────────────────────────────────────

    describe('getOverlayOpacity', () => {
        it('returns 0 for day', () => {
            expect(DayNightCycle.getOverlayOpacity('day')).toBe(0);
        });

        it('returns 0.65 for night', () => {
            expect(DayNightCycle.getOverlayOpacity('night')).toBe(0.65);
        });
    });

    // ── pickWildPokemon ─────────────────────────────────────────────────

    describe('pickWildPokemon', () => {
        it('returns a pokemon during the day', () => {
            const result = DayNightCycle.pickWildPokemon(new Date('2025-06-01T12:00:00'));
            expect(typeof result).toBe('string');
            expect(result?.length).toBeGreaterThan(0);
        });

        it('returns a string during the night', () => {
            const result = DayNightCycle.pickWildPokemon(new Date('2025-06-01T23:00:00'));
            expect(typeof result).toBe('string');
            expect(result?.length).toBeGreaterThan(0);
        });

        it('returns meowth during the day (not nightOnly)', () => {
            const results = new Set<string>();
            for (let i = 0; i < 200; i++) {
                const result = DayNightCycle.pickWildPokemon(new Date('2025-06-01T12:00:00'));
                if (result) { results.add(result); }
            }
            expect(results.has('meowth')).toBe(true);
        });

        it('can return meowth during the night', () => {
            const results = new Set<string>();
            for (let i = 0; i < 200; i++) {
                const result = DayNightCycle.pickWildPokemon(new Date('2025-06-01T23:00:00'));
                if (result) { results.add(result); }
            }
            expect(results.has('meowth')).toBe(true);
        });
    });
});
