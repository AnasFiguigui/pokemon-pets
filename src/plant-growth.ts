import type { PlantInstance } from './models';
import type { PlantType } from './game-data';

/** Growth-time multiplier while growth mulch is active. */
export const GROWTH_MULCH_MULTIPLIER = 0.75;

/**
 * Calculates a plant's current phase and the timestamp at which that phase
 * actually started, based on elapsed time since `phaseStartTime`.
 *
 * Returning the exact phase-boundary timestamp (instead of "now") means
 * leftover growth time between ticks is never discarded — without it, up to
 * one tick interval was lost per phase transition, and hours could be lost
 * after a long shutdown.
 */
export function computePlantPhase(
    plant: PlantInstance,
    plantType: PlantType,
    now: number = Date.now(),
): { phase: number; phaseStartTime: string } {
    const startMs = new Date(plant.phaseStartTime).getTime();
    const elapsedHours = (now - startMs) / 3_600_000;
    const maxPhase = plantType.growthHours.length - 1;
    const growthMultiplier = plant.mulch === 'growth_mulch' ? GROWTH_MULCH_MULTIPLIER : 1;
    let phase = Math.min(plant.phase, maxPhase);
    let hoursConsumed = 0;
    while (phase < maxPhase) {
        const needed = plantType.growthHours[phase] * growthMultiplier;
        if (hoursConsumed + needed > elapsedHours) { break; }
        hoursConsumed += needed;
        phase++;
    }
    return { phase, phaseStartTime: new Date(startMs + hoursConsumed * 3_600_000).toISOString() };
}
