import { WildPokemonSpecies } from './game-data';

export type TimeOfDay = 'day' | 'night';

/**
 * Determines time-of-day based on the system clock.
 * Night = 20:00 – 06:00, Day = 06:00 – 20:00.
 */
export class DayNightCycle {

    /** Returns the current time of day. */
    public static getTimeOfDay(date: Date = new Date()): TimeOfDay {
        const hour = date.getHours();
        return (hour >= 6 && hour < 20) ? 'day' : 'night';
    }

    /** Returns the CSS filter tint for the current time of day. */
    public static getTint(timeOfDay: TimeOfDay): string {
        switch (timeOfDay) {
            case 'night':
                return 'brightness(0.55) saturate(0.7) sepia(0.3) hue-rotate(200deg)';
            case 'day':
            default:
                return 'none';
        }
    }

    /**
     * Picks a random wild Pokémon eligible for the current time of day.
     * Night-only species only appear at night; non night-only appear anytime.
     */
    public static pickWildPokemon(date: Date = new Date()): string | undefined {
        const timeOfDay = this.getTimeOfDay(date);
        const eligible = WildPokemonSpecies.filter(
            entry => !entry.nightOnly || timeOfDay === 'night',
        );

        if (eligible.length === 0) { return undefined; }
        return eligible[Math.floor(Math.random() * eligible.length)].specie;
    }
}
