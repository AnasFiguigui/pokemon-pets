import type { QuickPickItem } from 'vscode';

export type Pet = {
    name: string;
    specie: string;
    color: string;
    form?: string;
    sprite?: string;
    spriteSize?: 32 | 48;
};

export type Decoration = {
    x: number;
    y: number;
    category: string;
    name: string;
};

export class Save {
    public money: number = 0;
    public pets: Pet[] = [];
    public decoration: Decoration[] = [];
}

export class PetItem implements QuickPickItem {
    public index: number;
    public label: string;
    public description: string;

    constructor(index: number, name: string, description: string) {
        this.index = index;
        this.label = name;
        this.description = description;
    }
}

/** Normalizes optional pet fields for webview rendering. */
export function normalizePet(pet: Pet): { form: string; sprite: string; spriteSize: 32 | 48 } {
    const form = typeof pet.form === 'string' ? pet.form : pet.specie;
    const sprite = typeof pet.sprite === 'string'
        ? pet.sprite
        : form.toLowerCase().replaceAll(' ', '_');
    const spriteSize: 32 | 48 = pet.spriteSize === 48 ? 48 : 32;
    return { form, sprite, spriteSize };
}
