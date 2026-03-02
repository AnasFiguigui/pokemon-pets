"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PetItem = exports.Save = void 0;
class Save {
    money = 0;
    pets = new Array();
    decoration = new Array();
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
//# sourceMappingURL=models.js.map