import { describe, it, expect } from 'vitest';
import { Pokemons, WildPokemonSpecies, Consumables } from '../game-data';

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

                            it('requiredItem is a string or undefined', () => {
                                if (form.requiredItem !== undefined) {
                                    expect(typeof form.requiredItem).toBe('string');
                                    expect(form.requiredItem.length).toBeGreaterThan(0);
                                    // Must reference a valid consumable
                                    const ids = Consumables.map(c => c.id);
                                    expect(ids).toContain(form.requiredItem);
                                }
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

    it('contains only valid species entries', () => {
        for (const entry of WildPokemonSpecies) {
            expect(typeof entry).toBe('object');
            expect(typeof entry.specie).toBe('string');
            expect(entry.specie.length).toBeGreaterThan(0);
            expect(entry.specie).toBe(entry.specie.toLowerCase());
            expect(typeof entry.nightOnly).toBe('boolean');
        }
    });

    it('has no duplicates', () => {
        const names = WildPokemonSpecies.map(e => e.specie);
        expect(new Set(names).size).toBe(WildPokemonSpecies.length);
    });
});

describe('Consumables', () => {
    it('is a non-empty array', () => {
        expect(Consumables.length).toBeGreaterThan(0);
    });

    it('has no duplicate IDs', () => {
        const ids = Consumables.map(c => c.id);
        expect(new Set(ids).size).toBe(Consumables.length);
    });

    it('includes candy', () => {
        expect(Consumables.find(c => c.id === 'candy')).toBeDefined();
    });

    it('all consumables have valid fields', () => {
        for (const item of Consumables) {
            expect(typeof item.id).toBe('string');
            expect(item.id.length).toBeGreaterThan(0);
            expect(typeof item.name).toBe('string');
            expect(item.name.length).toBeGreaterThan(0);
            expect(typeof item.price).toBe('number');
            expect(item.price).toBeGreaterThan(0);
            expect(typeof item.description).toBe('string');
        }
    });
});
