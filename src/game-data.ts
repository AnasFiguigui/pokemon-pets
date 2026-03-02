export type PokemonForm = {
    name: string;
    sprite: string;
    spriteSize: 32 | 48;
};

export type PokemonSpecies = {
    name: string;
    forms: PokemonForm[];
};

export const WildPokemonSpecies: string[] = [
    // 'beedrill',
    'meowth',
    // 'golbat',
    // 'rattata',
];

export const Pokemons: { [generation: string]: PokemonSpecies[] } = {
    '1': [
        {
            name: 'Bulbasaur',
            forms: [
                { name: 'Bulbasaur', sprite: 'bulbasaur', spriteSize: 32 },
                { name: 'Ivysaur', sprite: 'ivysaur', spriteSize: 32 },
                { name: 'Venusaur', sprite: 'venusaur', spriteSize: 32 },
            ],
        },
        {
            name: 'Charmander',
            forms: [
                { name: 'Charmander', sprite: 'charmander', spriteSize: 32 },
                { name: 'Charmeleon', sprite: 'charmeleon', spriteSize: 32 },
                { name: 'Charizard', sprite: 'charizard', spriteSize: 48 },
            ],
        },
    ],
};
