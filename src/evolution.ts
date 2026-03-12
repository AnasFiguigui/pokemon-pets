import type { Pet } from './models';
import type { SaveManager } from './save-manager';
import type { PokemonForm, PokemonSpecies } from './game-data';
import { Pokemons } from './game-data';
import { DayNightCycle } from './day-night';

export interface EvolutionResult {
    evolved: boolean;
    newForm?: PokemonForm;
    totalCandy: number;
    nextEvolutionAt?: number;   // candy needed for next form, undefined if max
}

/**
 * Handles candy feeding and Pokémon evolution through the form chain.
 */
export class EvolutionService {
    private readonly saveManager: SaveManager;

    constructor(saveManager: SaveManager) {
        this.saveManager = saveManager;
    }

    /** Finds the species data for a pet by matching specie name across all generations. */
    public findSpecies(pet: Pet): PokemonSpecies | undefined {
        for (const species of Object.values(Pokemons).flat()) {
            if (species.name.toLowerCase() === pet.specie.toLowerCase()) {
                return species;
            }
        }
        return undefined;
    }

    /** Returns the current form index of a pet within its species. */
    public getCurrentFormIndex(pet: Pet, species: PokemonSpecies): number {
        const formName = (pet.form ?? pet.specie).toLowerCase();
        const idx = species.forms.findIndex(f => f.name.toLowerCase() === formName);
        return Math.max(idx, 0);
    }

    /** Returns info about the next evolution, or undefined if already max. */
    public getNextEvolution(pet: Pet): { nextForm: PokemonForm; candyNeeded: number } | undefined {
        const species = this.findSpecies(pet);
        if (!species) { return undefined; }

        const currentIdx = this.getCurrentFormIndex(pet, species);
        if (currentIdx >= species.forms.length - 1) { return undefined; }

        const candyFed = pet.candyFed ?? 0;

        // Scan forms in the same order as feedCandy — skip requiredItem forms
        for (let i = currentIdx + 1; i < species.forms.length; i++) {
            const form = species.forms[i];
            if (form.requiredItem) { continue; }
            return { nextForm: form, candyNeeded: Math.max(0, form.candyCost - candyFed) };
        }

        // All remaining forms require items — show the immediate next one
        const nextForm = species.forms[currentIdx + 1];
        return { nextForm, candyNeeded: Math.max(0, nextForm.candyCost - candyFed) };
    }

    /**
     * Feed candy to a pet at the given index.
     * Returns the evolution result (whether evolution happened, new totals, etc.).
     */
    public feedCandy(petIndex: number): EvolutionResult {
        const pet = this.saveManager.save.pets[petIndex];
        if (!pet) {
            return { evolved: false, totalCandy: 0 };
        }

        // Increment candy count
        pet.candyFed = (pet.candyFed ?? 0) + 1;

        const species = this.findSpecies(pet);
        if (!species) {
            this.saveManager.scheduleSave();
            return { evolved: false, totalCandy: pet.candyFed };
        }

        const currentIdx = this.getCurrentFormIndex(pet, species);

        // Scan all forms after the current one for a valid candy evolution
        // (supports branching evolutions like Eevee)
        for (let i = currentIdx + 1; i < species.forms.length; i++) {
            const nextForm = species.forms[i];
            // Skip forms that require a special item (those use useItem())
            if (nextForm.requiredItem) { continue; }
            // Check friendship requirement
            const friendshipMet = typeof nextForm.requiredFriendship !== 'number'
                || (pet.friendship ?? 0) >= nextForm.requiredFriendship;
            if (!friendshipMet) { continue; }
            // Check time-of-day requirement (e.g. Espeon = day, Umbreon = night)
            if (nextForm.requiredTimeOfDay) {
                const timeOfDay = DayNightCycle.getTimeOfDay();
                if (timeOfDay !== nextForm.requiredTimeOfDay) { continue; }
            }
            // Check candy requirement
            if (pet.candyFed < nextForm.candyCost) { continue; }

            // Evolve!
            pet.form = nextForm.name;
            pet.sprite = nextForm.sprite;
            pet.spriteSize = nextForm.spriteSize;
            this.saveManager.scheduleSave();

            const furtherIdx = i + 1;
            const nextEvolutionAt = furtherIdx < species.forms.length
                ? species.forms[furtherIdx].candyCost
                : undefined;

            return {
                evolved: true,
                newForm: nextForm,
                totalCandy: pet.candyFed,
                nextEvolutionAt,
            };
        }

        this.saveManager.scheduleSave();

        const nextFormIdx = currentIdx + 1;
        const nextEvolutionAt = nextFormIdx < species.forms.length
            ? species.forms[nextFormIdx].candyCost
            : undefined;

        return {
            evolved: false,
            totalCandy: pet.candyFed,
            nextEvolutionAt,
        };
    }

    /**
     * Use a special item on a pet. Scans all forms after the current one for a
     * form that requires this item AND where the pet has enough candy.
     * Supports branching evolutions (e.g. Eevee → multiple stone evolutions).
     */
    public useItem(petIndex: number, itemId: string): EvolutionResult {
        const pet = this.saveManager.save.pets[petIndex];
        if (!pet) {
            return { evolved: false, totalCandy: 0 };
        }

        const species = this.findSpecies(pet);
        if (!species) {
            return { evolved: false, totalCandy: pet.candyFed ?? 0 };
        }

        const currentIdx = this.getCurrentFormIndex(pet, species);
        const candyFed = pet.candyFed ?? 0;

        // Scan all forms after the current one for a matching requiredItem
        for (let i = currentIdx + 1; i < species.forms.length; i++) {
            const form = species.forms[i];
            const friendshipMet = typeof form.requiredFriendship !== 'number'
                || (pet.friendship ?? 0) >= form.requiredFriendship;
            if (form.requiredItem === itemId && friendshipMet && candyFed >= form.candyCost) {
                // Evolve!
                pet.form = form.name;
                pet.sprite = form.sprite;
                pet.spriteSize = form.spriteSize;
                this.saveManager.scheduleSave();

                return {
                    evolved: true,
                    newForm: form,
                    totalCandy: candyFed,
                };
            }
        }

        return {
            evolved: false,
            totalCandy: candyFed,
        };
    }
}
