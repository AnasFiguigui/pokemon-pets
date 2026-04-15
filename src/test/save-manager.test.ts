import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import { SaveManager, DEFAULT_MAX_POKEMONS } from '../save-manager';
import type { Pet, Decoration } from '../models';

vi.mock('node:fs');
vi.mock('node:fs/promises');

const STORAGE = path.join('mock', 'storage');

/** Creates a complete save object with all required fields to avoid migration writes. */
function completeSave(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        money: 0,
        pets: [],
        decoration: [],
        plants: [],
        inventory: {},
        streak: { currentStreak: 0, lastClaimDate: '', longestStreak: 0, totalRewardsClaimed: 0 },
        telemetry: {
            pokemonAdded: {}, pokemonEvolved: {}, candyFed: 0,
            wildPokemonCaught: 0, decorationsPlaced: 0,
            goldEarned: 0, goldSpent: 0, sessionsCount: 0, lastSessionDate: '',
        },
        autoFeed: false,
        ...overrides,
    };
}

describe('SaveManager', () => {
    let manager: SaveManager;

    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(fsp.writeFile).mockResolvedValue(undefined);
        manager = new SaveManager(STORAGE);
    });

    // ── constructor ─────────────────────────────────────────────────────

    it('initializes with an empty save', () => {
        expect(manager.save.money).toBe(0);
        expect(manager.save.pets).toEqual([]);
        expect(manager.save.decoration).toEqual([]);
    });

    it('returns the save path containing save.json', () => {
        expect(manager.getSavePath()).toContain('save.json');
    });

    // ── loadGame ────────────────────────────────────────────────────────

    describe('loadGame', () => {
        it('creates storage folder when it does not exist', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);
            vi.mocked(fs.mkdirSync).mockReturnValue(undefined as any);
            vi.mocked(fs.writeFileSync).mockImplementation(() => {});

            manager.loadGame();

            expect(fs.mkdirSync).toHaveBeenCalledWith(STORAGE, { recursive: true });
        });

        it('loads a valid save file', () => {
            const saveData = {
                money: 250,
                pets: [{ name: 'A', specie: 'B', color: 'C' }],
                decoration: [],
            };
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(saveData));

            manager.loadGame();

            expect(manager.save.money).toBe(250);
            expect(manager.save.pets).toHaveLength(1);
            expect(manager.save.decoration).toEqual([]);
        });

        it('does not write file when nothing changed', () => {
            const saveData = completeSave();
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(saveData));

            manager.loadGame();

            expect(fs.writeFileSync).not.toHaveBeenCalled();
        });

        it('resets on corrupt save file and writes new save', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue('NOT JSON');
            vi.mocked(fs.writeFileSync).mockImplementation(() => {});

            manager.loadGame();

            expect(manager.save.money).toBe(0);
            expect(manager.save.pets).toEqual([]);
            expect(fs.writeFileSync).toHaveBeenCalled();
        });

        it('resets money if not a number', () => {
            const saveData = { money: 'invalid', pets: [], decoration: [] };
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(saveData));
            vi.mocked(fs.writeFileSync).mockImplementation(() => {});

            manager.loadGame();

            expect(manager.save.money).toBe(0);
            expect(fs.writeFileSync).toHaveBeenCalled();
        });

        it('trims pets when over the maximum', () => {
            const pets = Array.from({ length: 10 }, (_, i) => ({
                name: `Pet${i}`,
                specie: 'S',
                color: 'C',
            }));
            const saveData = { money: 0, pets, decoration: [] };
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(saveData));
            vi.mocked(fs.writeFileSync).mockImplementation(() => {});

            manager.loadGame();

            expect(manager.save.pets).toHaveLength(DEFAULT_MAX_POKEMONS);
            expect(fs.writeFileSync).toHaveBeenCalled();
        });

        it('resets pets if not an array', () => {
            const saveData = { money: 0, pets: 'bad', decoration: [] };
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(saveData));
            vi.mocked(fs.writeFileSync).mockImplementation(() => {});

            manager.loadGame();

            expect(manager.save.pets).toEqual([]);
        });

        it('resets decoration if not an array', () => {
            const saveData = { money: 0, pets: [], decoration: null };
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(saveData));
            vi.mocked(fs.writeFileSync).mockImplementation(() => {});

            manager.loadGame();

            expect(manager.save.decoration).toEqual([]);
        });

        it('keeps valid pets at exactly the maximum count', () => {
            const pets = Array.from({ length: DEFAULT_MAX_POKEMONS }, (_, i) => ({
                name: `Pet${i}`,
                specie: 'S',
                color: 'C',
                candyFed: 0,
                hp: 50,
                stamina: 50,
                friendship: 75,
            }));
            const saveData = completeSave({ pets });
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(saveData));

            manager.loadGame();

            expect(manager.save.pets).toHaveLength(DEFAULT_MAX_POKEMONS);
            // No trimming needed → no write
            expect(fs.writeFileSync).not.toHaveBeenCalled();
        });
    });

    // ── saveGame ────────────────────────────────────────────────────────

    describe('saveGame', () => {
        it('writes prettified JSON to disk immediately', () => {
            vi.mocked(fs.writeFileSync).mockImplementation(() => {});
            manager.save.money = 100;

            manager.saveGame();

            expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
            const writtenPath = vi.mocked(fs.writeFileSync).mock.calls[0][0];
            const writtenData = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string;

            expect(String(writtenPath)).toContain('save.json');
            expect(JSON.parse(writtenData).money).toBe(100);
        });
    });

    // ── scheduleSave / flushSave ────────────────────────────────────────

    describe('scheduleSave', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.mocked(fs.writeFileSync).mockImplementation(() => {});
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('writes to disk after the debounce delay', () => {
            manager.save.money = 42;
            manager.scheduleSave();

            expect(fsp.writeFile).not.toHaveBeenCalled();
            vi.runAllTimers();
            expect(fsp.writeFile).toHaveBeenCalledTimes(1);
        });

        it('coalesces multiple rapid calls into a single write', () => {
            manager.scheduleSave();
            manager.scheduleSave();
            manager.scheduleSave();

            vi.runAllTimers();
            expect(fsp.writeFile).toHaveBeenCalledTimes(1);
        });

        it('flushSave writes immediately if a save is pending', () => {
            manager.scheduleSave();
            expect(fs.writeFileSync).not.toHaveBeenCalled();

            manager.flushSave();
            expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
        });

        it('flushSave does nothing when no save is pending', () => {
            manager.flushSave();
            expect(fs.writeFileSync).not.toHaveBeenCalled();
        });

        it('saveGame clears a pending scheduled save', () => {
            manager.scheduleSave();
            manager.saveGame();
            expect(fs.writeFileSync).toHaveBeenCalledTimes(1);

            vi.runAllTimers();
            // Still only 1 call — the scheduled save was cleared
            expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
        });
    });

    // ── addPet ──────────────────────────────────────────────────────────

    describe('addPet', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.mocked(fs.writeFileSync).mockImplementation(() => {});
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('adds a pet and schedules a save', () => {
            const pet: Pet = { name: 'Spark', specie: 'Pikachu', color: 'gen1' };
            expect(manager.addPet(pet)).toBe(true);
            expect(manager.save.pets).toHaveLength(1);
            expect(manager.save.pets[0].name).toBe('Spark');
            vi.runAllTimers();
            expect(fsp.writeFile).toHaveBeenCalled();
        });

        it('rejects when at max capacity', () => {
            manager.save.pets = Array.from({ length: DEFAULT_MAX_POKEMONS }, (_, i) => ({
                name: `P${i}`,
                specie: 'S',
                color: 'C',
            }));

            const pet: Pet = { name: 'Extra', specie: 'S', color: 'C' };
            expect(manager.addPet(pet)).toBe(false);
            expect(manager.save.pets).toHaveLength(DEFAULT_MAX_POKEMONS);
            expect(fs.writeFileSync).not.toHaveBeenCalled();
        });
    });

    // ── removePet ───────────────────────────────────────────────────────

    describe('removePet', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.mocked(fs.writeFileSync).mockImplementation(() => {});
            manager.save.pets = [
                { name: 'A', specie: 'SA', color: 'C' },
                { name: 'B', specie: 'SB', color: 'C' },
            ];
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('removes and returns the pet at the given index', () => {
            const removed = manager.removePet(0);
            expect(removed?.name).toBe('A');
            expect(manager.save.pets).toHaveLength(1);
            expect(manager.save.pets[0].name).toBe('B');
            vi.runAllTimers();
            expect(fsp.writeFile).toHaveBeenCalled();
        });

        it('returns undefined for a positive out-of-range index', () => {
            expect(manager.removePet(5)).toBeUndefined();
            expect(fs.writeFileSync).not.toHaveBeenCalled();
        });

        it('returns undefined for a negative index', () => {
            expect(manager.removePet(-1)).toBeUndefined();
            expect(fs.writeFileSync).not.toHaveBeenCalled();
        });
    });

    // ── updateMoney ─────────────────────────────────────────────────────

    describe('updateMoney', () => {
        it('sets money and schedules a save', () => {
            vi.useFakeTimers();
            vi.mocked(fs.writeFileSync).mockImplementation(() => {});
            manager.updateMoney(999);
            expect(manager.save.money).toBe(999);
            vi.runAllTimers();
            expect(fsp.writeFile).toHaveBeenCalled();
            vi.useRealTimers();
        });
    });

    // ── Decoration management ───────────────────────────────────────────

    describe('decoration management', () => {
        const decor: Decoration = { x: 10, y: 20, category: 'plant', name: 'tree' };

        beforeEach(() => {
            vi.useFakeTimers();
            vi.mocked(fs.writeFileSync).mockImplementation(() => {});
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('addDecor pushes and schedules a save', () => {
            manager.addDecor(decor);
            expect(manager.save.decoration).toHaveLength(1);
            expect(manager.save.decoration[0]).toEqual(decor);
            vi.runAllTimers();
            expect(fsp.writeFile).toHaveBeenCalled();
        });

        it('moveDecor updates position and schedules a save', () => {
            manager.save.decoration.push({ ...decor });
            manager.moveDecor(0, 50, 60);
            expect(manager.save.decoration[0].x).toBe(50);
            expect(manager.save.decoration[0].y).toBe(60);
            vi.runAllTimers();
            expect(fsp.writeFile).toHaveBeenCalled();
        });

        it('moveDecor does nothing for an invalid index', () => {
            manager.moveDecor(99, 1, 2);
            expect(fs.writeFileSync).not.toHaveBeenCalled();
        });

        it('removeDecor removes and schedules a save', () => {
            manager.save.decoration.push({ ...decor });
            manager.removeDecor(0);
            expect(manager.save.decoration).toHaveLength(0);
            vi.runAllTimers();
            expect(fsp.writeFile).toHaveBeenCalled();
        });
    });

    // ── DEFAULT_MAX_POKEMONS constant ──────────────────────────────────

    it('exports DEFAULT_MAX_POKEMONS as 6', () => {
        expect(DEFAULT_MAX_POKEMONS).toBe(6);
    });

    // ── updateInventory ─────────────────────────────────────────────────

    describe('updateInventory', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.mocked(fs.writeFileSync).mockImplementation(() => {});
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('sets a consumable count and schedules a save', () => {
            manager.updateInventory('candy', 5);
            expect(manager.save.inventory.candy).toBe(5);
            vi.runAllTimers();
            expect(fsp.writeFile).toHaveBeenCalled();
        });

        it('clamps negative amount to zero and removes key', () => {
            manager.updateInventory('candy', -3);
            expect(manager.save.inventory.candy).toBeUndefined();
        });

        it('removes key when set to zero', () => {
            manager.save.inventory.candy = 5;
            manager.updateInventory('candy', 0);
            expect(manager.save.inventory.candy).toBeUndefined();
        });

        it('supports multiple different consumables', () => {
            manager.updateInventory('candy', 3);
            manager.updateInventory('fire_stone', 1);
            expect(manager.save.inventory.candy).toBe(3);
            expect(manager.save.inventory.fire_stone).toBe(1);
        });
    });

    // ── getConsumableCount ───────────────────────────────────────────────

    describe('getConsumableCount', () => {
        it('returns 0 for missing consumable', () => {
            expect(manager.getConsumableCount('candy')).toBe(0);
        });

        it('returns the stored count', () => {
            manager.save.inventory.fire_stone = 3;
            expect(manager.getConsumableCount('fire_stone')).toBe(3);
        });
    });

    // ── inventory validation in loadGame ─────────────────────────────────

    describe('inventory validation', () => {
        it('initializes inventory when missing from save', () => {
            const saveData = { money: 0, pets: [], decoration: [] };
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(saveData));
            vi.mocked(fs.writeFileSync).mockImplementation(() => {});

            manager.loadGame();

            expect(manager.save.inventory).toEqual({});
        });

        it('resets inventory when not an object', () => {
            const saveData = completeSave({ inventory: 'bad' });
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(saveData));
            vi.mocked(fs.writeFileSync).mockImplementation(() => {});

            manager.loadGame();

            expect(manager.save.inventory).toEqual({});
        });

        it('resets inventory when an array', () => {
            const saveData = completeSave({ inventory: [1, 2] });
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(saveData));
            vi.mocked(fs.writeFileSync).mockImplementation(() => {});

            manager.loadGame();

            expect(manager.save.inventory).toEqual({});
        });

        it('resets invalid consumable values to zero', () => {
            const saveData = completeSave({ inventory: { candy: 'bad', fire_stone: -5 } });
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(saveData));
            vi.mocked(fs.writeFileSync).mockImplementation(() => {});

            manager.loadGame();

            expect(manager.save.inventory.candy).toBe(0);
            expect(manager.save.inventory.fire_stone).toBe(0);
        });

        it('preserves valid inventory', () => {
            const saveData = completeSave({ inventory: { candy: 10, fire_stone: 2 } });
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(saveData));

            manager.loadGame();

            expect(manager.save.inventory.candy).toBe(10);
            expect(manager.save.inventory.fire_stone).toBe(2);
            expect(fs.writeFileSync).not.toHaveBeenCalled();
        });
    });

    // ── updatePetStats ──────────────────────────────────────────────────

    describe('updatePetStats', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.mocked(fs.writeFileSync).mockImplementation(() => {});
            manager.save.pets = [
                { name: 'A', specie: 'SA', color: 'C', hp: 50, stamina: 50 },
            ];
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('updates hp and stamina and schedules a save', () => {
            manager.updatePetStats(0, 30, 20);
            expect(manager.save.pets[0].hp).toBe(30);
            expect(manager.save.pets[0].stamina).toBe(20);
            vi.runAllTimers();
            expect(fsp.writeFile).toHaveBeenCalled();
        });

        it('clamps negative values to zero', () => {
            manager.updatePetStats(0, -10, -5);
            expect(manager.save.pets[0].hp).toBe(0);
            expect(manager.save.pets[0].stamina).toBe(0);
        });

        it('does nothing for invalid index', () => {
            manager.updatePetStats(99, 10, 10);
            expect(manager.save.pets[0].hp).toBe(50);
            expect(manager.save.pets[0].stamina).toBe(50);
        });
    });

    // ── HP/Stamina validation in loadGame ───────────────────────────────

    describe('HP/Stamina validation', () => {
        it('initializes missing hp and stamina to max values', () => {
            const saveData = completeSave({
                pets: [{ name: 'A', specie: 'SA', color: 'C', candyFed: 0 }],
            });
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(saveData));
            vi.mocked(fs.writeFileSync).mockImplementation(() => {});

            manager.loadGame();

            expect(manager.save.pets[0].hp).toBe(50); // 50 + 0*2
            expect(manager.save.pets[0].stamina).toBe(50);
        });

        it('clamps hp and stamina to max when they exceed it', () => {
            const saveData = completeSave({
                pets: [{ name: 'A', specie: 'SA', color: 'C', candyFed: 0, hp: 999, stamina: 999 }],
            });
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(saveData));
            vi.mocked(fs.writeFileSync).mockImplementation(() => {});

            manager.loadGame();

            expect(manager.save.pets[0].hp).toBe(50);
            expect(manager.save.pets[0].stamina).toBe(50);
        });

        it('preserves valid hp and stamina values', () => {
            const saveData = completeSave({
                pets: [{ name: 'A', specie: 'SA', color: 'C', candyFed: 10, hp: 60, stamina: 40 }],
            });
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(saveData));

            manager.loadGame();

            expect(manager.save.pets[0].hp).toBe(60);
            expect(manager.save.pets[0].stamina).toBe(40);
        });

        it('resets hp and stamina of 0 to max (pets with 0 HP should have been removed)', () => {
            const saveData = completeSave({
                pets: [{ name: 'A', specie: 'SA', color: 'C', candyFed: 5, hp: 0, stamina: 0 }],
            });
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(saveData));
            vi.mocked(fs.writeFileSync).mockImplementation(() => {});

            manager.loadGame();

            expect(manager.save.pets[0].hp).toBe(60);  // 50 + 5*2
            expect(manager.save.pets[0].stamina).toBe(60);
        });
    });
});
