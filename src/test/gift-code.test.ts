import { describe, it, expect } from 'vitest';
import { GIFT_CODE_PREFIX, encodeGiftCode, decodeGiftCode, sanitizeImportedPet } from '../gift-code';
import type { Pet } from '../models';

const pet: Pet = {
    name: 'Sparky',
    specie: 'Pikachu',
    color: 'generation 1',
    form: 'Pikachu',
    sprite: 'pikachu',
    spriteSize: 32,
    candyFed: 12,
    hp: 60,
    stamina: 55,
    friendship: 120.5,
    heldItem: 'thunder_stone',
};

describe('gift codes', () => {
    it('round-trips a pet through encode/decode', () => {
        const code = encodeGiftCode(pet);
        expect(code.startsWith(GIFT_CODE_PREFIX)).toBe(true);

        const decoded = decodeGiftCode(code);
        expect(decoded).toEqual(pet);
    });

    it('tolerates surrounding whitespace', () => {
        expect(decodeGiftCode(`  ${encodeGiftCode(pet)}\n`)?.name).toBe('Sparky');
    });

    it('rejects text without the prefix', () => {
        expect(decodeGiftCode('hello world')).toBeUndefined();
        expect(decodeGiftCode('')).toBeUndefined();
    });

    it('rejects broken base64 / JSON payloads', () => {
        expect(decodeGiftCode(`${GIFT_CODE_PREFIX}%%%not-base64%%%`)).toBeUndefined();
        expect(decodeGiftCode(GIFT_CODE_PREFIX + Buffer.from('not json').toString('base64'))).toBeUndefined();
    });

    it('rejects codes from a newer version', () => {
        const payload = Buffer.from(JSON.stringify({ v: 999, pet })).toString('base64');
        expect(decodeGiftCode(GIFT_CODE_PREFIX + payload)).toBeUndefined();
    });

    it('rejects payloads without a valid pet', () => {
        const payload = Buffer.from(JSON.stringify({ v: 1, pet: { name: 'X' } })).toString('base64');
        expect(decodeGiftCode(GIFT_CODE_PREFIX + payload)).toBeUndefined();
    });
});

describe('sanitizeImportedPet', () => {
    it('returns undefined for non-objects and pets missing name/specie', () => {
        expect(sanitizeImportedPet(null)).toBeUndefined();
        expect(sanitizeImportedPet('pet')).toBeUndefined();
        expect(sanitizeImportedPet([])).toBeUndefined();
        expect(sanitizeImportedPet({ name: 'A' })).toBeUndefined();
        expect(sanitizeImportedPet({ specie: 'B' })).toBeUndefined();
    });

    it('trims oversized names to 20 characters', () => {
        const result = sanitizeImportedPet({ name: 'x'.repeat(50), specie: 'Eevee' });
        expect(result?.name).toHaveLength(20);
    });

    it('drops non-stone held items', () => {
        expect(sanitizeImportedPet({ name: 'A', specie: 'Eevee', heldItem: 'candy' })?.heldItem).toBeUndefined();
        expect(sanitizeImportedPet({ name: 'A', specie: 'Eevee', heldItem: 'everstone' })?.heldItem).toBe('everstone');
    });

    it('clamps candy, stats, and friendship', () => {
        const result = sanitizeImportedPet({
            name: 'A', specie: 'Eevee',
            candyFed: 99999, hp: 99999, stamina: -5, friendship: 400,
        });
        expect(result?.candyFed).toBe(1000);
        expect(result?.hp).toBe(250);
        expect(result?.stamina).toBe(0);
        expect(result?.friendship).toBe(255);
    });

    it('preserves fractional friendship (ball-catch half points)', () => {
        expect(sanitizeImportedPet({ name: 'A', specie: 'Eevee', friendship: 100.5 })?.friendship).toBe(100.5);
    });

    it('normalizes sprite size to 32 or 48', () => {
        expect(sanitizeImportedPet({ name: 'A', specie: 'Eevee', spriteSize: 48 })?.spriteSize).toBe(48);
        expect(sanitizeImportedPet({ name: 'A', specie: 'Eevee', spriteSize: 64 })?.spriteSize).toBe(32);
    });
});
