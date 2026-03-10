import { describe, it, expect } from 'vitest';
import { Save, PetItem, normalizePet, getMaxHp, getMaxStamina } from '../models';
import type { Pet } from '../models';

describe('Save', () => {
    it('initializes with default values', () => {
        const save = new Save();
        expect(save.money).toBe(0);
        expect(save.pets).toEqual([]);
        expect(save.decoration).toEqual([]);
    });

    it('can be serialized and deserialized via JSON', () => {
        const save = new Save();
        save.money = 500;
        save.pets.push({ name: 'Buddy', specie: 'Bulbasaur', color: 'generation 1' });
        save.decoration.push({ x: 10, y: 20, category: 'plant', name: 'tree' });

        const json = JSON.stringify(save);
        const restored: Save = JSON.parse(json);

        expect(restored.money).toBe(500);
        expect(restored.pets).toHaveLength(1);
        expect(restored.pets[0].name).toBe('Buddy');
        expect(restored.decoration).toHaveLength(1);
        expect(restored.decoration[0].category).toBe('plant');
    });
});

describe('PetItem', () => {
    it('stores index, label, and description', () => {
        const item = new PetItem(2, 'Charmander', 'Fire type');
        expect(item.index).toBe(2);
        expect(item.label).toBe('Charmander');
        expect(item.description).toBe('Fire type');
    });
});

describe('normalizePet', () => {
    it('uses form and sprite when provided', () => {
        const pet: Pet = {
            name: 'Buddy',
            specie: 'Bulbasaur',
            color: 'generation 1',
            form: 'Ivysaur',
            sprite: 'ivysaur',
            spriteSize: 32,
        };
        const result = normalizePet(pet);
        expect(result.form).toBe('Ivysaur');
        expect(result.sprite).toBe('ivysaur');
        expect(result.spriteSize).toBe(32);
    });

    it('falls back to specie when form is missing', () => {
        const pet: Pet = { name: 'Buddy', specie: 'Bulbasaur', color: 'generation 1' };
        const result = normalizePet(pet);
        expect(result.form).toBe('Bulbasaur');
    });

    it('derives sprite from form when sprite is missing', () => {
        const pet: Pet = {
            name: 'Buddy',
            specie: 'Bulbasaur',
            color: 'generation 1',
            form: 'Mega Venusaur',
        };
        const result = normalizePet(pet);
        expect(result.sprite).toBe('mega_venusaur');
    });

    it('derives sprite from specie when both form and sprite are missing', () => {
        const pet: Pet = { name: 'Buddy', specie: 'Bulbasaur', color: 'generation 1' };
        const result = normalizePet(pet);
        expect(result.sprite).toBe('bulbasaur');
    });

    it('defaults spriteSize to 32 when not 48', () => {
        const pet: Pet = { name: 'Buddy', specie: 'Bulbasaur', color: 'generation 1' };
        expect(normalizePet(pet).spriteSize).toBe(32);
    });

    it('preserves spriteSize 48', () => {
        const pet: Pet = {
            name: 'Buddy',
            specie: 'Charizard',
            color: 'generation 1',
            spriteSize: 48,
        };
        expect(normalizePet(pet).spriteSize).toBe(48);
    });

    it('treats non-string form as missing', () => {
        // Simulates bad data loaded from a save file
        const pet = { name: 'X', specie: 'Squirtle', color: 'generation 1', form: 123 } as unknown as Pet;
        expect(normalizePet(pet).form).toBe('Squirtle');
    });
});

describe('getMaxHp', () => {
    it('returns 50 for a pet with no candyFed', () => {
        const pet: Pet = { name: 'A', specie: 'B', color: 'C' };
        expect(getMaxHp(pet)).toBe(50);
    });

    it('scales with candyFed', () => {
        const pet: Pet = { name: 'A', specie: 'B', color: 'C', candyFed: 10 };
        expect(getMaxHp(pet)).toBe(70); // 50 + 10*2
    });

    it('caps at level 100', () => {
        const pet: Pet = { name: 'A', specie: 'B', color: 'C', candyFed: 200 };
        expect(getMaxHp(pet)).toBe(250); // 50 + 100*2
    });
});

describe('getMaxStamina', () => {
    it('returns 50 for a pet with no candyFed', () => {
        const pet: Pet = { name: 'A', specie: 'B', color: 'C' };
        expect(getMaxStamina(pet)).toBe(50);
    });

    it('scales with candyFed', () => {
        const pet: Pet = { name: 'A', specie: 'B', color: 'C', candyFed: 25 };
        expect(getMaxStamina(pet)).toBe(100); // 50 + 25*2
    });

    it('caps at level 100', () => {
        const pet: Pet = { name: 'A', specie: 'B', color: 'C', candyFed: 150 };
        expect(getMaxStamina(pet)).toBe(250); // 50 + 100*2
    });
});
