import * as vscode from 'vscode';

export type Pet = {
    name: string;
    specie: string;
    color: string;
    form?: string;
    sprite?: string;
    spriteSize?: 32 | 48;
};

export type Decoration = {
    x: 0;
    y: 0;
    category: string;
    name: string;
};

export class Save {
    public money: number = 0;
    public pets: Array<Pet> = new Array<Pet>();
    public decoration: Array<Decoration> = new Array<Decoration>();
}

export class PetItem implements vscode.QuickPickItem {
    public index: number;
    public label: string;
    public description: string;

    constructor(index: number, name: string, description: string) {
        this.index = index;
        this.label = name;
        this.description = description;
    }
}
