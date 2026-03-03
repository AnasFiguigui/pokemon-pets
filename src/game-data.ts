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
    'generation 1': [
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
        {
            name: 'Squirtle',
            forms: [
                { name: 'Squirtle', sprite: 'squirtle', spriteSize: 32 },
                { name: 'Wartortle', sprite: 'wartortle', spriteSize: 32 },
                { name: 'Blastoise', sprite: 'blastoise', spriteSize: 32 },
            ],
        },
    ],

    // 'generation 2': [
    //     {
    //         name: 'Chikorita',
    //         forms: [
    //             { name: 'Chikorita', sprite: 'chikorita', spriteSize: 32 },
    //             { name: 'Bayleef', sprite: 'bayleef', spriteSize: 32 },
    //             { name: 'Meganium', sprite: 'meganium', spriteSize: 48 },
    //         ],
    //     },
    //     {
    //         name: 'Cyndaquil',
    //         forms: [
    //             { name: 'Cyndaquil', sprite: 'cyndaquil', spriteSize: 32 },
    //             { name: 'Quilava', sprite: 'quilava', spriteSize: 32 },
    //             { name: 'Typhlosion', sprite: 'typhlosion', spriteSize: 48 },
    //         ],
    //     },
    //     {
    //         name: 'Totodile',
    //         forms: [
    //             { name: 'Totodile', sprite: 'totodile', spriteSize: 32 },
    //             { name: 'Croconaw', sprite: 'croconaw', spriteSize: 32 },
    //             { name: 'Feraligatr', sprite: 'feraligatr', spriteSize: 48 },
    //         ],
    //     },
    // ],

    // 'generation 3': [
    //     { name: 'Treecko', forms: [{ name: 'Treecko', sprite: 'treecko', spriteSize: 32 }, { name: 'Grovyle', sprite: 'grovyle', spriteSize: 32 }, { name: 'Sceptile', sprite: 'sceptile', spriteSize: 48 }] },
    //     { name: 'Torchic', forms: [{ name: 'Torchic', sprite: 'torchic', spriteSize: 32 }, { name: 'Combusken', sprite: 'combusken', spriteSize: 32 }, { name: 'Blaziken', sprite: 'blaziken', spriteSize: 48 }] },
    //     { name: 'Mudkip', forms: [{ name: 'Mudkip', sprite: 'mudkip', spriteSize: 32 }, { name: 'Marshtomp', sprite: 'marshtomp', spriteSize: 32 }, { name: 'Swampert', sprite: 'swampert', spriteSize: 48 }] },
    // ],

    // 'generation 4': [
    //     { name: 'Turtwig', forms: [{ name: 'Turtwig', sprite: 'turtwig', spriteSize: 32 }, { name: 'Grotle', sprite: 'grotle', spriteSize: 32 }, { name: 'Torterra', sprite: 'torterra', spriteSize: 48 }] },
    //     { name: 'Chimchar', forms: [{ name: 'Chimchar', sprite: 'chimchar', spriteSize: 32 }, { name: 'Monferno', sprite: 'monferno', spriteSize: 32 }, { name: 'Infernape', sprite: 'infernape', spriteSize: 48 }] },
    //     { name: 'Piplup', forms: [{ name: 'Piplup', sprite: 'piplup', spriteSize: 32 }, { name: 'Prinplup', sprite: 'prinplup', spriteSize: 32 }, { name: 'Empoleon', sprite: 'empoleon', spriteSize: 48 }] },
    // ],

    // 'generation 5': [
    //     { name: 'Snivy', forms: [{ name: 'Snivy', sprite: 'snivy', spriteSize: 32 }, { name: 'Servine', sprite: 'servine', spriteSize: 32 }, { name: 'Serperior', sprite: 'serperior', spriteSize: 48 }] },
    //     { name: 'Tepig', forms: [{ name: 'Tepig', sprite: 'tepig', spriteSize: 32 }, { name: 'Pignite', sprite: 'pignite', spriteSize: 32 }, { name: 'Emboar', sprite: 'emboar', spriteSize: 48 }] },
    //     { name: 'Oshawott', forms: [{ name: 'Oshawott', sprite: 'oshawott', spriteSize: 32 }, { name: 'Dewott', sprite: 'dewott', spriteSize: 32 }, { name: 'Samurott', sprite: 'samurott', spriteSize: 48 }] },
    // ],

    // 'generation 6': [
    //     { name: 'Chespin', forms: [{ name: 'Chespin', sprite: 'chespin', spriteSize: 32 }, { name: 'Quilladin', sprite: 'quilladin', spriteSize: 32 }, { name: 'Chesnaught', sprite: 'chesnaught', spriteSize: 48 }] },
    //     { name: 'Fennekin', forms: [{ name: 'Fennekin', sprite: 'fennekin', spriteSize: 32 }, { name: 'Braixen', sprite: 'braixen', spriteSize: 32 }, { name: 'Delphox', sprite: 'delphox', spriteSize: 48 }] },
    //     { name: 'Froakie', forms: [{ name: 'Froakie', sprite: 'froakie', spriteSize: 32 }, { name: 'Frogadier', sprite: 'frogadier', spriteSize: 32 }, { name: 'Greninja', sprite: 'greninja', spriteSize: 48 }] },
    // ],

    // 'generation 7': [
    //     { name: 'Rowlet', forms: [{ name: 'Rowlet', sprite: 'rowlet', spriteSize: 32 }, { name: 'Dartrix', sprite: 'dartrix', spriteSize: 32 }, { name: 'Decidueye', sprite: 'decidueye', spriteSize: 48 }] },
    //     { name: 'Litten', forms: [{ name: 'Litten', sprite: 'litten', spriteSize: 32 }, { name: 'Torracat', sprite: 'torracat', spriteSize: 32 }, { name: 'Incineroar', sprite: 'incineroar', spriteSize: 48 }] },
    //     { name: 'Popplio', forms: [{ name: 'Popplio', sprite: 'popplio', spriteSize: 32 }, { name: 'Brionne', sprite: 'brionne', spriteSize: 32 }, { name: 'Primarina', sprite: 'primarina', spriteSize: 48 }] },
    // ],

    // 'generation 8': [
    //     { name: 'Grookey', forms: [{ name: 'Grookey', sprite: 'grookey', spriteSize: 32 }, { name: 'Thwackey', sprite: 'thwackey', spriteSize: 32 }, { name: 'Rillaboom', sprite: 'rillaboom', spriteSize: 48 }] },
    //     { name: 'Scorbunny', forms: [{ name: 'Scorbunny', sprite: 'scorbunny', spriteSize: 32 }, { name: 'Raboot', sprite: 'raboot', spriteSize: 32 }, { name: 'Cinderace', sprite: 'cinderace', spriteSize: 48 }] },
    //     { name: 'Sobble', forms: [{ name: 'Sobble', sprite: 'sobble', spriteSize: 32 }, { name: 'Drizzile', sprite: 'drizzile', spriteSize: 32 }, { name: 'Inteleon', sprite: 'inteleon', spriteSize: 48 }] },
    // ],
};
