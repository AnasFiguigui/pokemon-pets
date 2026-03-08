import { describe, it, expect, beforeEach } from 'vitest';
import { EvolutionService } from '../evolution';
import type { SaveManager } from '../save-manager';
import { Save, type Pet } from '../models';

/** Creates a minimal SaveManager stub for testing. */
function makeSaveManager(): SaveManager {
    const save = new Save();
    return {
        save,
        saveGame: () => {},
    } as unknown as SaveManager;
}

function bulbasaurPet(): Pet {
    return { name: 'Bulby', specie: 'Bulbasaur', color: 'Generation 1', form: 'Bulbasaur', sprite: 'bulbasaur', spriteSize: 32, candyFed: 0 };
}

describe('EvolutionService', () => {
    let sm: SaveManager;
    let evo: EvolutionService;

    beforeEach(() => {
        sm = makeSaveManager();
        evo = new EvolutionService(sm);
    });

    // ── findSpecies ─────────────────────────────────────────────────────

    describe('findSpecies', () => {
        it('finds Bulbasaur species', () => {
            const pet = bulbasaurPet();
            const species = evo.findSpecies(pet);

            expect(species).toBeDefined();
            expect(species?.name).toBe('Bulbasaur');
        });

        it('finds species case-insensitively', () => {
            const pet: Pet = { name: 'Char', specie: 'charmander', color: 'Generation 1' };
            const species = evo.findSpecies(pet);

            expect(species).toBeDefined();
            expect(species?.name).toBe('Charmander');
        });

        it('returns undefined for unknown species', () => {
            const pet: Pet = { name: 'Fake', specie: 'Fakemon', color: 'None' };

            expect(evo.findSpecies(pet)).toBeUndefined();
        });
    });

    // ── getCurrentFormIndex ──────────────────────────────────────────────

    describe('getCurrentFormIndex', () => {
        it('returns 0 for base form', () => {
            const pet = bulbasaurPet();
            const species = evo.findSpecies(pet);
            expect(species).toBeDefined();
            if (!species) { return; }

            expect(evo.getCurrentFormIndex(pet, species)).toBe(0);
        });

        it('returns correct index for middle form', () => {
            const pet: Pet = { name: 'Ivy', specie: 'Bulbasaur', color: 'Generation 1', form: 'Ivysaur' };
            const species = evo.findSpecies(pet);
            expect(species).toBeDefined();
            if (!species) { return; }

            expect(evo.getCurrentFormIndex(pet, species)).toBe(1);
        });

        it('returns 0 when form not found', () => {
            const pet: Pet = { name: 'Bug', specie: 'Bulbasaur', color: 'Generation 1', form: 'UnknownForm' };
            const species = evo.findSpecies(pet);
            expect(species).toBeDefined();
            if (!species) { return; }

            expect(evo.getCurrentFormIndex(pet, species)).toBe(0);
        });
    });

    // ── getNextEvolution ────────────────────────────────────────────────

    describe('getNextEvolution', () => {
        it('returns next form for base Bulbasaur', () => {
            const pet = bulbasaurPet();
            const next = evo.getNextEvolution(pet);

            expect(next).toBeDefined();
            expect(next?.nextForm.name).toBe('Ivysaur');
            expect(next?.candyNeeded).toBe(10);
        });

        it('returns next form for Ivysaur', () => {
            const pet: Pet = { name: 'Ivy', specie: 'Bulbasaur', color: 'Generation 1', form: 'Ivysaur', candyFed: 10 };
            const next = evo.getNextEvolution(pet);

            expect(next).toBeDefined();
            expect(next?.nextForm.name).toBe('Venusaur');
            expect(next?.candyNeeded).toBe(15); // 25 - 10
        });

        it('returns undefined for final form Venusaur', () => {
            const pet: Pet = { name: 'Venu', specie: 'Bulbasaur', color: 'Generation 1', form: 'Venusaur', candyFed: 25 };

            expect(evo.getNextEvolution(pet)).toBeUndefined();
        });

        it('returns undefined for unknown species', () => {
            const pet: Pet = { name: 'Fake', specie: 'Fakemon', color: 'None' };

            expect(evo.getNextEvolution(pet)).toBeUndefined();
        });
    });

    // ── feedCandy ───────────────────────────────────────────────────────

    describe('feedCandy', () => {
        it('increments candy count', () => {
            const pet = bulbasaurPet();
            sm.save.pets.push(pet);

            const result = evo.feedCandy(0);

            expect(result.totalCandy).toBe(1);
            expect(result.evolved).toBe(false);
            expect(pet.candyFed).toBe(1);
        });

        it('evolves Bulbasaur to Ivysaur at 10 candy', () => {
            const pet = bulbasaurPet();
            pet.candyFed = 9; // One more will trigger evolution
            sm.save.pets.push(pet);

            const result = evo.feedCandy(0);

            expect(result.evolved).toBe(true);
            expect(result.newForm?.name).toBe('Ivysaur');
            expect(result.totalCandy).toBe(10);
            expect(result.nextEvolutionAt).toBe(25); // Venusaur
            expect(pet.form).toBe('Ivysaur');
            expect(pet.sprite).toBe('ivysaur');
        });

        it('evolves Ivysaur to Venusaur at 25 candy', () => {
            const pet: Pet = {
                name: 'Ivy', specie: 'Bulbasaur', color: 'Generation 1',
                form: 'Ivysaur', sprite: 'ivysaur', spriteSize: 32, candyFed: 24,
            };
            sm.save.pets.push(pet);

            const result = evo.feedCandy(0);

            expect(result.evolved).toBe(true);
            expect(result.newForm?.name).toBe('Venusaur');
            expect(result.totalCandy).toBe(25);
            expect(result.nextEvolutionAt).toBeUndefined(); // Final form
        });

        it('does not evolve past the final form', () => {
            const pet: Pet = {
                name: 'Venu', specie: 'Bulbasaur', color: 'Generation 1',
                form: 'Venusaur', sprite: 'venusaur', spriteSize: 32, candyFed: 30,
            };
            sm.save.pets.push(pet);

            const result = evo.feedCandy(0);

            expect(result.evolved).toBe(false);
            expect(result.totalCandy).toBe(31);
        });

        it('returns safe result for invalid index', () => {
            const result = evo.feedCandy(99);

            expect(result.evolved).toBe(false);
            expect(result.totalCandy).toBe(0);
        });

        it('returns safe result for unknown species', () => {
            const pet: Pet = { name: 'Fake', specie: 'Fakemon', color: 'None', candyFed: 0 };
            sm.save.pets.push(pet);

            const result = evo.feedCandy(0);

            expect(result.evolved).toBe(false);
            expect(result.totalCandy).toBe(1);
        });

        it('Charizard gets spriteSize 48 on evolution', () => {
            const pet: Pet = {
                name: 'Char', specie: 'Charmander', color: 'Generation 1',
                form: 'Charmeleon', sprite: 'charmeleon', spriteSize: 32, candyFed: 24,
            };
            sm.save.pets.push(pet);

            const result = evo.feedCandy(0);

            expect(result.evolved).toBe(true);
            expect(result.newForm?.name).toBe('Charizard');
            expect(pet.spriteSize).toBe(48);
        });
    });
});
