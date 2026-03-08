import { describe, it, expect } from 'vitest';
import { Pokemons, WildPokemonSpecies } from '../game-data';

describe('Pokemons', () => {
    const generations = Object.keys(Pokemons);

    it('has at least one generation', () => {
        expect(generations.length).toBeGreaterThan(0);
    });

    for (const gen of generations) {
        describe(gen, () => {
            const species = Pokemons[gen];

            it('has at least one species', () => {
                expect(species.length).toBeGreaterThan(0);
            });

            it('has no duplicate species names', () => {
                const names = species.map(s => s.name);
                expect(new Set(names).size).toBe(names.length);
            });

            for (const sp of species) {
                describe(sp.name, () => {
                    it('has a non-empty name', () => {
                        expect(sp.name.length).toBeGreaterThan(0);
                    });

                    it('has at least one form', () => {
                        expect(sp.forms.length).toBeGreaterThan(0);
                    });

                    for (const form of sp.forms) {
                        describe(`form: ${form.name}`, () => {
                            it('has a non-empty name', () => {
                                expect(form.name.length).toBeGreaterThan(0);
                            });

                            it('has a non-empty sprite', () => {
                                expect(form.sprite.length).toBeGreaterThan(0);
                            });

                            it('has a valid spriteSize (32 or 48)', () => {
                                expect([32, 48]).toContain(form.spriteSize);
                            });

                            it('sprite contains only lowercase letters, numbers, and underscores', () => {
                                expect(form.sprite).toMatch(/^[a-z0-9_]+$/);
                            });
                        });
                    }
                });
            }
        });
    }
});

describe('WildPokemonSpecies', () => {
    it('is a non-empty array', () => {
        expect(WildPokemonSpecies.length).toBeGreaterThan(0);
    });

    it('contains only non-empty lowercase strings', () => {
        for (const species of WildPokemonSpecies) {
            expect(typeof species).toBe('string');
            expect(species.length).toBeGreaterThan(0);
            expect(species).toBe(species.toLowerCase());
        }
    });

    it('has no duplicates', () => {
        expect(new Set(WildPokemonSpecies).size).toBe(WildPokemonSpecies.length);
    });
});
