"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PetItem = exports.Save = void 0;
exports.normalizePet = normalizePet;
class Save {
    money = 0;
    pets = [];
    decoration = [];
    inventory = {
        candy: 0,
    };
    streak = {
        currentStreak: 0,
        lastClaimDate: '',
        longestStreak: 0,
        totalRewardsClaimed: 0,
    };
    telemetry = {
        pokemonAdded: {},
        pokemonEvolved: {},
        candyFed: 0,
        wildPokemonCaught: 0,
        decorationsPlaced: 0,
        goldEarned: 0,
        goldSpent: 0,
        sessionsCount: 0,
        lastSessionDate: '',
    };
}
exports.Save = Save;
class PetItem {
    index;
    label;
    description;
    constructor(index, name, description) {
        this.index = index;
        this.label = name;
        this.description = description;
    }
}
exports.PetItem = PetItem;
/** Normalizes optional pet fields for webview rendering. */
function normalizePet(pet) {
    const form = typeof pet.form === 'string' ? pet.form : pet.specie;
    const sprite = typeof pet.sprite === 'string'
        ? pet.sprite
        : form.toLowerCase().replaceAll(' ', '_');
    const spriteSize = pet.spriteSize === 48 ? 48 : 32;
    return { form, sprite, spriteSize };
}
//# sourceMappingURL=models.js.map