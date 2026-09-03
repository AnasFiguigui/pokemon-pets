import { describe, it, expect } from 'vitest';
import { computePlantPhase, GROWTH_MULCH_MULTIPLIER } from '../plant-growth';
import type { PlantInstance } from '../models';
import type { PlantType } from '../game-data';

const HOUR_MS = 3_600_000;

const plantType: PlantType = {
    id: 'test_plant', name: 'Test Plant', price: 100, description: '',
    producesId: 'oran_berry', harvestType: 'repeatable',
    growthHours: [1, 2, 2, 3, 2],
    minFruits: 1, maxFruits: 3, size: [16, 32], spriteOffset: [0, 0], phaseStep: [16, 0],
};

function plantAt(phase: number, startMs: number, mulch?: PlantInstance['mulch']): PlantInstance {
    return { x: 0, y: 0, plantId: 'test_plant', phase, phaseStartTime: new Date(startMs).toISOString(), mulch };
}

describe('computePlantPhase', () => {
    it('stays at the current phase before the phase duration elapses', () => {
        const start = 1_000_000_000_000;
        const result = computePlantPhase(plantAt(0, start), plantType, start + 0.5 * HOUR_MS);
        expect(result.phase).toBe(0);
        expect(new Date(result.phaseStartTime).getTime()).toBe(start);
    });

    it('advances one phase exactly at the boundary', () => {
        const start = 1_000_000_000_000;
        const result = computePlantPhase(plantAt(0, start), plantType, start + 1 * HOUR_MS);
        expect(result.phase).toBe(1);
        expect(new Date(result.phaseStartTime).getTime()).toBe(start + 1 * HOUR_MS);
    });

    it('preserves leftover growth time when a phase boundary was crossed between ticks', () => {
        const start = 1_000_000_000_000;
        // 1.5h elapsed: phase 0 needs 1h → advance to phase 1 with 0.5h already consumed
        const result = computePlantPhase(plantAt(0, start), plantType, start + 1.5 * HOUR_MS);
        expect(result.phase).toBe(1);
        // Phase 1 started at the 1h boundary, NOT at "now" — the extra 0.5h counts
        expect(new Date(result.phaseStartTime).getTime()).toBe(start + 1 * HOUR_MS);
    });

    it('advances multiple phases after a long absence', () => {
        const start = 1_000_000_000_000;
        // 1 + 2 + 2 = 5h reaches phase 3; 0.5h into it
        const result = computePlantPhase(plantAt(0, start), plantType, start + 5.5 * HOUR_MS);
        expect(result.phase).toBe(3);
        expect(new Date(result.phaseStartTime).getTime()).toBe(start + 5 * HOUR_MS);
    });

    it('caps at the final (ripe) phase', () => {
        const start = 1_000_000_000_000;
        const result = computePlantPhase(plantAt(0, start), plantType, start + 1000 * HOUR_MS);
        expect(result.phase).toBe(plantType.growthHours.length - 1);
    });

    it('clamps an out-of-range stored phase to the max', () => {
        const start = 1_000_000_000_000;
        const result = computePlantPhase(plantAt(99, start), plantType, start);
        expect(result.phase).toBe(plantType.growthHours.length - 1);
    });

    it('growth mulch shortens the required time by the multiplier', () => {
        const start = 1_000_000_000_000;
        const needed = 1 * GROWTH_MULCH_MULTIPLIER * HOUR_MS;
        const without = computePlantPhase(plantAt(0, start), plantType, start + needed);
        const withMulch = computePlantPhase(plantAt(0, start, 'growth_mulch'), plantType, start + needed);
        expect(without.phase).toBe(0);
        expect(withMulch.phase).toBe(1);
    });

    it('returns the stored phase when the timestamp is in the future', () => {
        const start = 1_000_000_000_000;
        const result = computePlantPhase(plantAt(2, start), plantType, start - HOUR_MS);
        expect(result.phase).toBe(2);
    });
});
