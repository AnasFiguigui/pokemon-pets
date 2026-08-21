import type { PlantInstance } from './models';

/** Ripe plants remain available for manual harvesting for five minutes. */
export const AUTO_HARVEST_DELAY_MS = 5 * 60_000;

/** Returns whether a ripe plant has waited long enough to be harvested automatically. */
export function isReadyForAutoHarvest(
    plant: PlantInstance,
    maxPhase: number,
    now: number = Date.now(),
): boolean {
    if (plant.phase < maxPhase) { return false; }

    const ripeSince = new Date(plant.phaseStartTime).getTime();
    return Number.isFinite(ripeSince) && now - ripeSince >= AUTO_HARVEST_DELAY_MS;
}
