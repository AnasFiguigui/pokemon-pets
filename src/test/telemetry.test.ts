import { describe, it, expect, beforeEach } from 'vitest';
import { TelemetryService } from '../telemetry';
import type { SaveManager } from '../save-manager';
import { Save } from '../models';

/** Creates a minimal SaveManager stub for testing. */
function makeSaveManager(): SaveManager {
    const save = new Save();
    return {
        save,
        saveGame: () => {},
    } as unknown as SaveManager;
}

describe('TelemetryService', () => {
    let sm: SaveManager;

    beforeEach(() => {
        sm = makeSaveManager();
    });

    // ── enable/disable ──────────────────────────────────────────────────

    describe('enabled flag', () => {
        it('tracks nothing when disabled', () => {
            const t = new TelemetryService(sm, false);

            t.trackPokemonAdded('pikachu');
            t.trackCandyFed();
            t.trackWildPokemonCaught();
            t.trackDecorationPlaced();
            t.trackGoldEarned(100);
            t.trackGoldSpent(50);
            t.trackSession();

            const data = t.getData();
            expect(data.candyFed).toBe(0);
            expect(data.wildPokemonCaught).toBe(0);
            expect(data.goldEarned).toBe(0);
            expect(data.sessionsCount).toBe(0);
            expect(Object.keys(data.pokemonAdded)).toHaveLength(0);
        });

        it('tracks when enabled', () => {
            const t = new TelemetryService(sm, true);

            t.trackPokemonAdded('pikachu');
            t.trackCandyFed();

            const data = t.getData();
            expect(data.pokemonAdded['pikachu']).toBe(1);
            expect(data.candyFed).toBe(1);
        });

        it('can be toggled at runtime', () => {
            const t = new TelemetryService(sm, false);
            expect(t.isEnabled()).toBe(false);

            t.setEnabled(true);
            expect(t.isEnabled()).toBe(true);

            t.trackCandyFed();
            expect(t.getData().candyFed).toBe(1);

            t.setEnabled(false);
            t.trackCandyFed();
            // Should not increment further
            expect(t.getData().candyFed).toBe(1);
        });
    });

    // ── tracking methods ────────────────────────────────────────────────

    describe('tracking methods', () => {
        let t: TelemetryService;

        beforeEach(() => {
            t = new TelemetryService(sm, true);
        });

        it('trackPokemonAdded increments per-species counter', () => {
            t.trackPokemonAdded('pikachu');
            t.trackPokemonAdded('pikachu');
            t.trackPokemonAdded('charmander');

            const data = t.getData();
            expect(data.pokemonAdded['pikachu']).toBe(2);
            expect(data.pokemonAdded['charmander']).toBe(1);
        });

        it('trackPokemonEvolved increments per-species counter', () => {
            t.trackPokemonEvolved('bulbasaur');

            expect(t.getData().pokemonEvolved['bulbasaur']).toBe(1);
        });

        it('trackCandyFed increments the counter', () => {
            t.trackCandyFed();
            t.trackCandyFed();
            t.trackCandyFed();

            expect(t.getData().candyFed).toBe(3);
        });

        it('trackWildPokemonCaught increments the counter', () => {
            t.trackWildPokemonCaught();

            expect(t.getData().wildPokemonCaught).toBe(1);
        });

        it('trackDecorationPlaced increments the counter', () => {
            t.trackDecorationPlaced();
            t.trackDecorationPlaced();

            expect(t.getData().decorationsPlaced).toBe(2);
        });

        it('trackGoldEarned accumulates the amount', () => {
            t.trackGoldEarned(100);
            t.trackGoldEarned(250);

            expect(t.getData().goldEarned).toBe(350);
        });

        it('trackGoldSpent accumulates the amount', () => {
            t.trackGoldSpent(50);
            t.trackGoldSpent(30);

            expect(t.getData().goldSpent).toBe(80);
        });

        it('trackSession increments count and sets date', () => {
            t.trackSession();

            const data = t.getData();
            expect(data.sessionsCount).toBe(1);
            expect(data.lastSessionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });

    // ── getSummary ──────────────────────────────────────────────────────

    describe('getSummary', () => {
        it('returns a multi-line string with stats', () => {
            const t = new TelemetryService(sm, true);
            t.trackPokemonAdded('pikachu');
            t.trackSession();

            const summary = t.getSummary();

            expect(summary).toContain('Sessions: 1');
            expect(summary).toContain('pikachu');
            expect(summary).toContain('Stats');
        });

        it('shows "None yet" when no pokemon have been added', () => {
            const t = new TelemetryService(sm, true);
            const summary = t.getSummary();

            expect(summary).toContain('None yet');
        });
    });
});
