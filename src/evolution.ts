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
    equipped?: boolean;         // true if item was equipped as held item instead of evolving
}

/**
 * Handles candy feeding and Pokémon evolution through the form chain.
 */
/** Pre-built map from lowercase species name → PokemonSpecies for O(1) lookup. */
const SpeciesMap: ReadonlyMap<string, PokemonSpecies> = new Map(
    Object.values(Pokemons).flat().map(s => [s.name.toLowerCase(), s]),
);

export class EvolutionService {
    private readonly saveManager: SaveManager;

    constructor(saveManager: SaveManager) {
        this.saveManager = saveManager;
    }

    /** Finds the species data for a pet by matching specie name across all generations. */
    public findSpecies(pet: Pet): PokemonSpecies | undefined {
        return SpeciesMap.get(pet.specie.toLowerCase());
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

        const currentCandyCost = species.forms[currentIdx].candyCost;
        const candyFed = pet.candyFed ?? 0;

        // Scan forms in the same order as feedCandy — skip requiredItem forms
        for (let i = currentIdx + 1; i < species.forms.length; i++) {
            const form = species.forms[i];
            if (form.candyCost <= currentCandyCost) { continue; } // skip sibling forms
            if (form.requiredItem) { continue; }
            return { nextForm: form, candyNeeded: Math.max(0, form.candyCost - candyFed) };
        }

        // All remaining forms require items — show the first valid one
        for (let i = currentIdx + 1; i < species.forms.length; i++) {
            const form = species.forms[i];
            if (form.candyCost <= currentCandyCost) { continue; }
            return { nextForm: form, candyNeeded: Math.max(0, form.candyCost - candyFed) };
        }
        return undefined; // no forward evolution possible (all siblings)
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
        const currentCandyCost = species.forms[currentIdx].candyCost;

        // ── Priority 1: Check held-item evolution ──────────────────────
        // If the pet holds an item, check forms matching that item FIRST.
        // This gives held-item evolutions priority over time-of-day forms
        // (e.g. Eevee holding shiny_stone → Sylveon before Espeon/Umbreon).
        if (pet.heldItem) {
            for (let i = currentIdx + 1; i < species.forms.length; i++) {
                const form = species.forms[i];
                if (form.candyCost <= currentCandyCost) { continue; } // skip sibling forms
                if (form.requiredItem !== pet.heldItem) { continue; }
                const friendshipMet = typeof form.requiredFriendship !== 'number'
                    || (pet.friendship ?? 0) >= form.requiredFriendship;
                if (!friendshipMet) { continue; }
                if (pet.candyFed < form.candyCost) { continue; }

                // Evolve via held item!
                pet.form = form.name;
                pet.sprite = form.sprite;
                pet.spriteSize = form.spriteSize;
                pet.heldItem = undefined; // consumed
                this.saveManager.scheduleSave();

                return {
                    evolved: true,
                    newForm: form,
                    totalCandy: pet.candyFed,
                };
            }
        }

        // ── Priority 2: Normal candy evolution ─────────────────────────
        // Scan all forms after the current one for a valid candy evolution
        // (supports branching evolutions like Eevee)
        for (let i = currentIdx + 1; i < species.forms.length; i++) {
            const nextForm = species.forms[i];
            // Skip sibling forms at the same candy level (prevents lateral evolution)
            if (nextForm.candyCost <= currentCandyCost) { continue; }
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
        const currentCandyCost = species.forms[currentIdx].candyCost;
        const candyFed = pet.candyFed ?? 0;

        // Scan all forms after the current one for a matching requiredItem
        let canEquip = false;
        for (let i = currentIdx + 1; i < species.forms.length; i++) {
            const form = species.forms[i];
            if (form.candyCost <= currentCandyCost) { continue; } // skip sibling forms
            if (form.requiredItem !== itemId) { continue; }

            // This item is relevant to at least one future form
            canEquip = true;

            const friendshipMet = typeof form.requiredFriendship !== 'number'
                || (pet.friendship ?? 0) >= form.requiredFriendship;
            if (friendshipMet && candyFed >= form.candyCost) {
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

        // Item didn't trigger evolution but matches a future form → equip it
        if (canEquip) {
            pet.heldItem = itemId;
            this.saveManager.scheduleSave();
            return { evolved: false, totalCandy: candyFed, equipped: true };
        }

        return {
            evolved: false,
            totalCandy: candyFed,
        };
    }

    /**
     * Checks whether a pet's held item now triggers evolution (e.g. after
     * friendship changed from feeding, ball catch, etc.).
     * Returns an evolution result — callers should handle the same way as feedCandy.
     */
    public checkHeldItemEvolution(petIndex: number): EvolutionResult {
        const pet = this.saveManager.save.pets[petIndex];
        if (!pet || !pet.heldItem) {
            return { evolved: false, totalCandy: pet?.candyFed ?? 0 };
        }

        const species = this.findSpecies(pet);
        if (!species) {
            return { evolved: false, totalCandy: pet.candyFed ?? 0 };
        }

        const currentIdx = this.getCurrentFormIndex(pet, species);
        const currentCandyCost = species.forms[currentIdx].candyCost;
        const candyFed = pet.candyFed ?? 0;

        for (let i = currentIdx + 1; i < species.forms.length; i++) {
            const form = species.forms[i];
            if (form.candyCost <= currentCandyCost) { continue; } // skip sibling forms
            if (form.requiredItem !== pet.heldItem) { continue; }
            const friendshipMet = typeof form.requiredFriendship !== 'number'
                || (pet.friendship ?? 0) >= form.requiredFriendship;
            if (!friendshipMet) { continue; }
            if (candyFed < form.candyCost) { continue; }

            // Evolve via held item!
            pet.form = form.name;
            pet.sprite = form.sprite;
            pet.spriteSize = form.spriteSize;
            pet.heldItem = undefined;
            this.saveManager.scheduleSave();

            return {
                evolved: true,
                newForm: form,
                totalCandy: candyFed,
            };
        }

        return { evolved: false, totalCandy: candyFed };
    }
}
