import { describe, expect, it } from 'vitest';
import { AUTO_HARVEST_DELAY_MS, isReadyForAutoHarvest } from '../auto-harvest';
import type { PlantInstance } from '../models';

function plant(overrides: Partial<PlantInstance> = {}): PlantInstance {
    return {
        x: 0,
        y: 0,
        plantId: 'oran_berry_plant',
        phase: 4,
        phaseStartTime: new Date(1_000_000).toISOString(),
        ...overrides,
    };
}

describe('isReadyForAutoHarvest', () => {
    it('waits the full five minutes after the plant becomes ripe', () => {
        const ripePlant = plant();

        expect(isReadyForAutoHarvest(ripePlant, 4, 1_000_000 + AUTO_HARVEST_DELAY_MS - 1)).toBe(false);
        expect(isReadyForAutoHarvest(ripePlant, 4, 1_000_000 + AUTO_HARVEST_DELAY_MS)).toBe(true);
    });

    it('never auto-harvests a plant that is not ripe', () => {
        expect(isReadyForAutoHarvest(plant({ phase: 3 }), 4, Number.MAX_SAFE_INTEGER)).toBe(false);
    });

    it('rejects an invalid phase timestamp', () => {
        expect(isReadyForAutoHarvest(plant({ phaseStartTime: 'invalid' }), 4, Number.MAX_SAFE_INTEGER)).toBe(false);
    });
});
