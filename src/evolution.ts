import type { Pet } from './models';
import type { SaveManager } from './save-manager';
import type { PokemonForm, PokemonSpecies } from './game-data';
import { Pokemons } from './game-data';

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

        const nextForm = species.forms[currentIdx + 1];
        const candyFed = pet.candyFed ?? 0;
        const candyNeeded = nextForm.candyCost - candyFed;

        return { nextForm, candyNeeded: Math.max(0, candyNeeded) };
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
            this.saveManager.saveGame();
            return { evolved: false, totalCandy: pet.candyFed };
        }

        const currentIdx = this.getCurrentFormIndex(pet, species);
        const nextFormIdx = currentIdx + 1;

        // Check if evolution is possible
        if (nextFormIdx < species.forms.length) {
            const nextForm = species.forms[nextFormIdx];
            // Only evolve via candy if the form does NOT require a special item
            if (!nextForm.requiredItem && pet.candyFed >= nextForm.candyCost) {
                // Evolve!
                pet.form = nextForm.name;
                pet.sprite = nextForm.sprite;
                pet.spriteSize = nextForm.spriteSize;
                this.saveManager.saveGame();

                const furtherIdx = nextFormIdx + 1;
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
        }

        this.saveManager.saveGame();

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
     * Use a special item on a pet. Checks if the next evolution requires this item
     * AND the pet has enough candy. If so, evolves the pet.
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
        const nextFormIdx = currentIdx + 1;

        if (nextFormIdx < species.forms.length) {
            const nextForm = species.forms[nextFormIdx];
            const candyFed = pet.candyFed ?? 0;

            // Check if this form requires this specific item AND has enough candy
            if (nextForm.requiredItem === itemId && candyFed >= nextForm.candyCost) {
                // Evolve!
                pet.form = nextForm.name;
                pet.sprite = nextForm.sprite;
                pet.spriteSize = nextForm.spriteSize;
                this.saveManager.saveGame();

                const furtherIdx = nextFormIdx + 1;
                const nextEvolutionAt = furtherIdx < species.forms.length
                    ? species.forms[furtherIdx].candyCost
                    : undefined;

                return {
                    evolved: true,
                    newForm: nextForm,
                    totalCandy: candyFed,
                    nextEvolutionAt,
                };
            }
        }

        return {
            evolved: false,
            totalCandy: pet.candyFed ?? 0,
        };
    }
}
