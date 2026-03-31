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
        scheduleSave: () => {},
        flushSave: () => {},
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

        it('does not evolve Charmeleon to Charizard via candy (requires friendship)', () => {
            const pet: Pet = {
                name: 'Char', specie: 'Charmander', color: 'Generation 1',
                form: 'Charmeleon', sprite: 'charmeleon', spriteSize: 32, candyFed: 24,
            };
            sm.save.pets.push(pet);

            const result = evo.feedCandy(0);

            expect(result.evolved).toBe(false);
            expect(result.totalCandy).toBe(25);
            expect(pet.form).toBe('Charmeleon'); // Still Charmeleon — not enough friendship!
        });
    });

    // ── useItem ─────────────────────────────────────────────────────────

    describe('useItem', () => {
        it('evolves Charmeleon to Charizard with candy when friendship is met', () => {
            const pet: Pet = {
                name: 'Char', specie: 'Charmander', color: 'Generation 1',
                form: 'Charmeleon', sprite: 'charmeleon', spriteSize: 32, candyFed: 24,
                friendship: 220,
            };
            sm.save.pets.push(pet);

            const result = evo.feedCandy(0);

            expect(result.evolved).toBe(true);
            expect(result.newForm?.name).toBe('Charizard');
            expect(pet.spriteSize).toBe(48);
        });

        it('does not evolve with wrong item', () => {
            const pet: Pet = {
                name: 'Pika', specie: 'Pikachu', color: 'Generation 1',
                form: 'Pikachu', sprite: 'pikachu', spriteSize: 32, candyFed: 25,
            };
            sm.save.pets.push(pet);

            const result = evo.useItem(0, 'water_stone');

            expect(result.evolved).toBe(false);
        });

        it('does not evolve with right item but not enough candy', () => {
            const pet: Pet = {
                name: 'Pika', specie: 'Pikachu', color: 'Generation 1',
                form: 'Pikachu', sprite: 'pikachu', spriteSize: 32, candyFed: 20,
            };
            sm.save.pets.push(pet);

            const result = evo.useItem(0, 'thunder_stone');

            expect(result.evolved).toBe(false);
        });

        it('returns safe result for invalid index', () => {
            const result = evo.useItem(99, 'fire_stone');

            expect(result.evolved).toBe(false);
            expect(result.totalCandy).toBe(0);
        });

        it('returns safe result for unknown species', () => {
            const pet: Pet = { name: 'Fake', specie: 'Fakemon', color: 'None', candyFed: 5 };
            sm.save.pets.push(pet);

            const result = evo.useItem(0, 'fire_stone');

            expect(result.evolved).toBe(false);
        });

        it('does not evolve a form that has no requiredItem', () => {
            const pet = bulbasaurPet();
            pet.candyFed = 10; // Enough for Ivysaur
            sm.save.pets.push(pet);

            // Ivysaur has no requiredItem, so fire_stone should not trigger evolution
            const result = evo.useItem(0, 'fire_stone');

            expect(result.evolved).toBe(false);
        });

        it('evolves Eevee to Vaporeon with Water Stone', () => {
            const pet: Pet = {
                name: 'Eve', specie: 'Eevee', color: 'Generation 1',
                form: 'Eevee', sprite: 'eevee', spriteSize: 32, candyFed: 25,
            };
            sm.save.pets.push(pet);

            const result = evo.useItem(0, 'water_stone');

            expect(result.evolved).toBe(true);
            expect(result.newForm?.name).toBe('Vaporeon');
            expect(pet.form).toBe('Vaporeon');
        });

        it('evolves Eevee to Flareon with Fire Stone', () => {
            const pet: Pet = {
                name: 'Eve', specie: 'Eevee', color: 'Generation 1',
                form: 'Eevee', sprite: 'eevee', spriteSize: 32, candyFed: 25,
            };
            sm.save.pets.push(pet);

            const result = evo.useItem(0, 'fire_stone');

            expect(result.evolved).toBe(true);
            expect(result.newForm?.name).toBe('Flareon');
            expect(pet.form).toBe('Flareon');
        });

        it('evolves Eevee to Glaceon with Ice Stone', () => {
            const pet: Pet = {
                name: 'Eve', specie: 'Eevee', color: 'Generation 1',
                form: 'Eevee', sprite: 'eevee', spriteSize: 32, candyFed: 25,
            };
            sm.save.pets.push(pet);

            const result = evo.useItem(0, 'ice_stone');

            expect(result.evolved).toBe(true);
            expect(result.newForm?.name).toBe('Glaceon');
        });

        it('equips stone as held item when Eevee lacks enough candy', () => {
            const pet: Pet = {
                name: 'Eve', specie: 'Eevee', color: 'Generation 1',
                form: 'Eevee', sprite: 'eevee', spriteSize: 32, candyFed: 2,
            };
            sm.save.pets.push(pet);

            const result = evo.useItem(0, 'water_stone');

            expect(result.evolved).toBe(false);
            expect(result.equipped).toBe(true);
            expect(pet.heldItem).toBe('water_stone');
        });

        it('does not evolve Eevee with candy alone (no stone)', () => {
            const pet: Pet = {
                name: 'Eve', specie: 'Eevee', color: 'Generation 1',
                form: 'Eevee', sprite: 'eevee', spriteSize: 32, candyFed: 24,
            };
            sm.save.pets.push(pet);

            const result = evo.feedCandy(0);

            expect(result.evolved).toBe(false);
            expect(pet.form).toBe('Eevee');
        });
    });

    // ── Held Item Evolution ─────────────────────────────────────────────

    describe('heldItem', () => {
        it('feedCandy evolves via held item when requirements met', () => {
            const pet: Pet = {
                name: 'Eve', specie: 'Eevee', color: 'Generation 1',
                form: 'Eevee', sprite: 'eevee', spriteSize: 32, candyFed: 4,
                heldItem: 'water_stone',
            };
            sm.save.pets.push(pet);

            // Feed candy → candyFed becomes 5 (meets Vaporeon candyCost: 5)
            const result = evo.feedCandy(0);

            expect(result.evolved).toBe(true);
            expect(result.newForm?.name).toBe('Vaporeon');
            expect(pet.heldItem).toBeUndefined(); // consumed
        });

        it('feedCandy does not evolve via held item when candy insufficient', () => {
            const pet: Pet = {
                name: 'Eve', specie: 'Eevee', color: 'Generation 1',
                form: 'Eevee', sprite: 'eevee', spriteSize: 32, candyFed: 2,
                heldItem: 'water_stone',
            };
            sm.save.pets.push(pet);

            // Feed candy → candyFed becomes 3 (still < Vaporeon candyCost: 5)
            const result = evo.feedCandy(0);

            expect(result.evolved).toBe(false);
            expect(pet.heldItem).toBe('water_stone'); // still held
        });

        it('held shiny_stone + friendship prioritizes Sylveon over Espeon/Umbreon', () => {
            const pet: Pet = {
                name: 'Eve', specie: 'Eevee', color: 'Generation 1',
                form: 'Eevee', sprite: 'eevee', spriteSize: 32, candyFed: 4,
                friendship: 200,
                heldItem: 'shiny_stone',
            };
            sm.save.pets.push(pet);

            // Feed candy → candyFed becomes 5
            // Held item (shiny_stone) check runs first, matches Sylveon
            const result = evo.feedCandy(0);

            expect(result.evolved).toBe(true);
            expect(result.newForm?.name).toBe('Sylveon');
            expect(pet.heldItem).toBeUndefined();
        });

        it('checkHeldItemEvolution evolves when friendship reaches threshold', () => {
            const pet: Pet = {
                name: 'Eve', specie: 'Eevee', color: 'Generation 1',
                form: 'Eevee', sprite: 'eevee', spriteSize: 32, candyFed: 5,
                friendship: 200,
                heldItem: 'shiny_stone',
            };
            sm.save.pets.push(pet);

            const result = evo.checkHeldItemEvolution(0);

            expect(result.evolved).toBe(true);
            expect(result.newForm?.name).toBe('Sylveon');
            expect(pet.heldItem).toBeUndefined();
        });

        it('checkHeldItemEvolution does nothing without held item', () => {
            const pet: Pet = {
                name: 'Eve', specie: 'Eevee', color: 'Generation 1',
                form: 'Eevee', sprite: 'eevee', spriteSize: 32, candyFed: 5,
                friendship: 200,
            };
            sm.save.pets.push(pet);

            const result = evo.checkHeldItemEvolution(0);

            expect(result.evolved).toBe(false);
        });

        it('useItem equips when pet already meets some but not all requirements', () => {
            const pet: Pet = {
                name: 'Eve', specie: 'Eevee', color: 'Generation 1',
                form: 'Eevee', sprite: 'eevee', spriteSize: 32, candyFed: 5,
                friendship: 100, // needs 200 for Sylveon
            };
            sm.save.pets.push(pet);

            const result = evo.useItem(0, 'shiny_stone');

            expect(result.evolved).toBe(false);
            expect(result.equipped).toBe(true);
            expect(pet.heldItem).toBe('shiny_stone');
        });

        it('already-evolved eeveelution does not laterally evolve via candy', () => {
            // Eevee already evolved to Jolteon via thunder_stone
            const pet: Pet = {
                name: 'Jolty', specie: 'Eevee', color: 'Generation 1',
                form: 'Jolteon', sprite: 'jolteon', spriteSize: 32,
                candyFed: 20, friendship: 250,
            };
            sm.save.pets.push(pet);

            // Feed candy — should NOT evolve to Espeon/Umbreon/etc.
            const result = evo.feedCandy(0);
            expect(result.evolved).toBe(false);
            expect(pet.form).toBe('Jolteon');
        });

        it('already-evolved eeveelution shows no next evolution', () => {
            const pet: Pet = {
                name: 'Vapor', specie: 'Eevee', color: 'Generation 1',
                form: 'Vaporeon', sprite: 'vaporeon', spriteSize: 32,
                candyFed: 30, friendship: 300,
            };
            sm.save.pets.push(pet);

            const next = evo.getNextEvolution(pet);
            expect(next).toBeUndefined();
        });

        it('already-evolved eeveelution cannot use stone for sibling form', () => {
            // Jolteon should not be able to use water_stone to become Vaporeon
            const pet: Pet = {
                name: 'Jolty', specie: 'Eevee', color: 'Generation 1',
                form: 'Jolteon', sprite: 'jolteon', spriteSize: 32,
                candyFed: 20, friendship: 250,
            };
            sm.save.pets.push(pet);

            const result = evo.useItem(0, 'water_stone');
            expect(result.evolved).toBe(false);
            expect(result.equipped).toBeUndefined(); // should not equip either
            expect(pet.form).toBe('Jolteon');
        });
    });
});
