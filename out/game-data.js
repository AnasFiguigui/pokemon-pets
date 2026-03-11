"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pokemons = exports.WildPokemonSpecies = exports.PlantTypes = exports.Consumables = void 0;
exports.Consumables = [
    { id: 'candy', name: 'Rare Candy', price: 30, description: 'Feed to a Pokémon to help it grow.', category: 'candy', friendshipGain: 3 },
    { id: 'oran_berry', name: 'Oran Berry', price: 30, description: 'Restores HP and stamina.', category: 'food', restoreHp: 10, restoreStamina: 15, friendshipGain: 2 },
    { id: 'potion', name: 'Potion', price: 100, description: 'Restores HP to a Pokémon.', category: 'potion', restoreHp: 20, friendshipGain: 1 },
    { id: 'super_potion', name: 'Super Potion', price: 280, description: 'Restores a large amount of HP to a Pokémon.', category: 'potion', restoreHp: 60, friendshipGain: 5 },
    { id: 'hyper_potion', name: 'Hyper Potion', price: 500, description: 'Restores a massive amount of HP to a Pokémon.', category: 'potion', restoreHp: 120, friendshipGain: 10 },
    { id: 'fire_stone', name: 'Fire Stone', price: 100, description: 'A stone that radiates warmth.', category: 'stone' },
    { id: 'water_stone', name: 'Water Stone', price: 100, description: 'A stone that shimmers like water.', category: 'stone' },
    { id: 'thunder_stone', name: 'Thunder Stone', price: 100, description: 'A stone that crackles with electricity.', category: 'stone' },
    { id: 'leaf_stone', name: 'Leaf Stone', price: 100, description: 'A stone that smells of fresh leaves.', category: 'stone' },
    { id: 'moon_stone', name: 'Moon Stone', price: 120, description: 'A stone that glows in moonlight.', category: 'stone' },
    { id: 'sun_stone', name: 'Sun Stone', price: 120, description: 'A stone that sparkles in sunlight.', category: 'stone' },
    { id: 'dusk_stone', name: 'Dusk Stone', price: 120, description: 'A stone that absorbs darkness.', category: 'stone' },
    { id: 'shiny_stone', name: 'Shiny Stone', price: 120, description: 'A stone that shines brilliantly.', category: 'stone' },
    { id: 'ice_stone', name: 'Ice Stone', price: 100, description: 'A stone that feels cold to the touch.', category: 'stone' },
    { id: 'growth_mulch', name: 'Growth Mulch', price: 200, description: 'Reduces plant growth time by 25%.', category: 'mulch' },
    { id: 'damp_mulch', name: 'Damp Mulch', price: 200, description: 'Increases harvest yield by 1.', category: 'mulch' },
    { id: 'stable_mulch', name: 'Stable Mulch', price: 300, description: 'Doubles the harvest window duration.', category: 'mulch' },
    { id: 'gooey_mulch', name: 'Gooey Mulch', price: 300, description: 'Adds 1 extra regrow cycle.', category: 'mulch' },
];
exports.PlantTypes = [
    {
        id: 'oran_berry_plant', name: 'Oran Berry Seed', price: 50, description: 'Grows Oran Berries. Regrows after each harvest!', producesId: 'oran_berry', harvestType: 'repeatable', growthHours: [0.01, 0.01, 0.01, 0.01, 0.01], minFruits: 1, maxFruits: 3, size: [16, 32], spriteOffset: [0, 0], phaseStep: [16, 0],
    },
];
exports.WildPokemonSpecies = [
    { specie: 'meowth', nightOnly: false },
];
exports.Pokemons = {
    'generation 1': [
        {
            name: 'Bulbasaur',
            forms: [
                { name: 'Bulbasaur', sprite: 'bulbasaur', spriteSize: 32, candyCost: 0 },
                { name: 'Ivysaur', sprite: 'ivysaur', spriteSize: 32, candyCost: 10 },
                { name: 'Venusaur', sprite: 'venusaur', spriteSize: 32, candyCost: 25 },
            ],
        },
        {
            name: 'Charmander',
            forms: [
                { name: 'Charmander', sprite: 'charmander', spriteSize: 32, candyCost: 0 },
                { name: 'Charmeleon', sprite: 'charmeleon', spriteSize: 32, candyCost: 10 },
                { name: 'Charizard', sprite: 'charizard', spriteSize: 48, candyCost: 25, requiredItem: 'fire_stone', requiredFriendship: 220 },
            ],
        },
        {
            name: 'Squirtle',
            forms: [
                { name: 'Squirtle', sprite: 'squirtle', spriteSize: 32, candyCost: 0 },
                { name: 'Wartortle', sprite: 'wartortle', spriteSize: 32, candyCost: 10 },
                { name: 'Blastoise', sprite: 'blastoise', spriteSize: 32, candyCost: 25 },
            ],
        },
        {
            name: 'Eevee',
            forms: [
                { name: 'Eevee', sprite: 'eevee', spriteSize: 32, candyCost: 0 },
                { name: 'Vaporeon', sprite: 'vaporeon', spriteSize: 32, candyCost: 25, requiredItem: 'water_stone' },
                { name: 'Jolteon', sprite: 'jolteon', spriteSize: 32, candyCost: 25, requiredItem: 'thunder_stone' },
                { name: 'Flareon', sprite: 'flareon', spriteSize: 32, candyCost: 25, requiredItem: 'fire_stone' },
                { name: 'Espeon', sprite: 'espeon', spriteSize: 32, candyCost: 25, requiredItem: 'sun_stone' },
                { name: 'Umbreon', sprite: 'umbreon', spriteSize: 32, candyCost: 25, requiredItem: 'moon_stone' },
                { name: 'Leafeon', sprite: 'leafeon', spriteSize: 32, candyCost: 25, requiredItem: 'leaf_stone' },
                { name: 'Glaceon', sprite: 'glaceon', spriteSize: 32, candyCost: 25, requiredItem: 'ice_stone' },
                { name: 'Sylveon', sprite: 'sylveon', spriteSize: 32, candyCost: 25, requiredItem: 'shiny_stone' },
            ],
        },
    ],
    // 'generation 2': [
    //     {
    //         name: 'Chikorita',
    //         forms: [
    //             { name: 'Chikorita', sprite: 'chikorita', spriteSize: 32, candyCost: 0 },
    //             { name: 'Bayleef', sprite: 'bayleef', spriteSize: 32, candyCost: 10 },
    //             { name: 'Meganium', sprite: 'meganium', spriteSize: 48, candyCost: 25 },
    //         ],
    //     },
    //     {
    //         name: 'Cyndaquil',
    //         forms: [
    //             { name: 'Cyndaquil', sprite: 'cyndaquil', spriteSize: 32, candyCost: 0 },
    //             { name: 'Quilava', sprite: 'quilava', spriteSize: 32, candyCost: 10 },
    //             { name: 'Typhlosion', sprite: 'typhlosion', spriteSize: 48, candyCost: 25 },
    //         ],
    //     },
    //     {
    //         name: 'Totodile',
    //         forms: [
    //             { name: 'Totodile', sprite: 'totodile', spriteSize: 32, candyCost: 0 },
    //             { name: 'Croconaw', sprite: 'croconaw', spriteSize: 32, candyCost: 10 },
    //             { name: 'Feraligatr', sprite: 'feraligatr', spriteSize: 48, candyCost: 25 },
    //         ],
    //     },
    // ],
    // 'generation 3': [
    //     { name: 'Treecko', forms: [{ name: 'Treecko', sprite: 'treecko', spriteSize: 32, candyCost: 0 }, { name: 'Grovyle', sprite: 'grovyle', spriteSize: 32, candyCost: 10 }, { name: 'Sceptile', sprite: 'sceptile', spriteSize: 48, candyCost: 25 }] },
    //     { name: 'Torchic', forms: [{ name: 'Torchic', sprite: 'torchic', spriteSize: 32, candyCost: 0 }, { name: 'Combusken', sprite: 'combusken', spriteSize: 32, candyCost: 10 }, { name: 'Blaziken', sprite: 'blaziken', spriteSize: 48, candyCost: 25 }] },
    //     { name: 'Mudkip', forms: [{ name: 'Mudkip', sprite: 'mudkip', spriteSize: 32, candyCost: 0 }, { name: 'Marshtomp', sprite: 'marshtomp', spriteSize: 32, candyCost: 10 }, { name: 'Swampert', sprite: 'swampert', spriteSize: 48, candyCost: 25 }] },
    // ],
    // 'generation 4': [
    //     { name: 'Turtwig', forms: [{ name: 'Turtwig', sprite: 'turtwig', spriteSize: 32, candyCost: 0 }, { name: 'Grotle', sprite: 'grotle', spriteSize: 32, candyCost: 10 }, { name: 'Torterra', sprite: 'torterra', spriteSize: 48, candyCost: 25 }] },
    //     { name: 'Chimchar', forms: [{ name: 'Chimchar', sprite: 'chimchar', spriteSize: 32, candyCost: 0 }, { name: 'Monferno', sprite: 'monferno', spriteSize: 32, candyCost: 10 }, { name: 'Infernape', sprite: 'infernape', spriteSize: 48, candyCost: 25 }] },
    //     { name: 'Piplup', forms: [{ name: 'Piplup', sprite: 'piplup', spriteSize: 32, candyCost: 0 }, { name: 'Prinplup', sprite: 'prinplup', spriteSize: 32, candyCost: 10 }, { name: 'Empoleon', sprite: 'empoleon', spriteSize: 48, candyCost: 25 }] },
    // ],
    // 'generation 5': [
    //     { name: 'Snivy', forms: [{ name: 'Snivy', sprite: 'snivy', spriteSize: 32, candyCost: 0 }, { name: 'Servine', sprite: 'servine', spriteSize: 32, candyCost: 10 }, { name: 'Serperior', sprite: 'serperior', spriteSize: 48, candyCost: 25 }] },
    //     { name: 'Tepig', forms: [{ name: 'Tepig', sprite: 'tepig', spriteSize: 32, candyCost: 0 }, { name: 'Pignite', sprite: 'pignite', spriteSize: 32, candyCost: 10 }, { name: 'Emboar', sprite: 'emboar', spriteSize: 48, candyCost: 25 }] },
    //     { name: 'Oshawott', forms: [{ name: 'Oshawott', sprite: 'oshawott', spriteSize: 32, candyCost: 0 }, { name: 'Dewott', sprite: 'dewott', spriteSize: 32, candyCost: 10 }, { name: 'Samurott', sprite: 'samurott', spriteSize: 48, candyCost: 25 }] },
    // ],
    // 'generation 6': [
    //     { name: 'Chespin', forms: [{ name: 'Chespin', sprite: 'chespin', spriteSize: 32, candyCost: 0 }, { name: 'Quilladin', sprite: 'quilladin', spriteSize: 32, candyCost: 10 }, { name: 'Chesnaught', sprite: 'chesnaught', spriteSize: 48, candyCost: 25 }] },
    //     { name: 'Fennekin', forms: [{ name: 'Fennekin', sprite: 'fennekin', spriteSize: 32, candyCost: 0 }, { name: 'Braixen', sprite: 'braixen', spriteSize: 32, candyCost: 10 }, { name: 'Delphox', sprite: 'delphox', spriteSize: 48, candyCost: 25 }] },
    //     { name: 'Froakie', forms: [{ name: 'Froakie', sprite: 'froakie', spriteSize: 32, candyCost: 0 }, { name: 'Frogadier', sprite: 'frogadier', spriteSize: 32, candyCost: 10 }, { name: 'Greninja', sprite: 'greninja', spriteSize: 48, candyCost: 25 }] },
    // ],
    // 'generation 7': [
    //     { name: 'Rowlet', forms: [{ name: 'Rowlet', sprite: 'rowlet', spriteSize: 32, candyCost: 0 }, { name: 'Dartrix', sprite: 'dartrix', spriteSize: 32, candyCost: 10 }, { name: 'Decidueye', sprite: 'decidueye', spriteSize: 48, candyCost: 25 }] },
    //     { name: 'Litten', forms: [{ name: 'Litten', sprite: 'litten', spriteSize: 32, candyCost: 0 }, { name: 'Torracat', sprite: 'torracat', spriteSize: 32, candyCost: 10 }, { name: 'Incineroar', sprite: 'incineroar', spriteSize: 48, candyCost: 25 }] },
    //     { name: 'Popplio', forms: [{ name: 'Popplio', sprite: 'popplio', spriteSize: 32, candyCost: 0 }, { name: 'Brionne', sprite: 'brionne', spriteSize: 32, candyCost: 10 }, { name: 'Primarina', sprite: 'primarina', spriteSize: 48, candyCost: 25 }] },
    // ],
    // 'generation 8': [
    //     { name: 'Grookey', forms: [{ name: 'Grookey', sprite: 'grookey', spriteSize: 32, candyCost: 0 }, { name: 'Thwackey', sprite: 'thwackey', spriteSize: 32, candyCost: 10 }, { name: 'Rillaboom', sprite: 'rillaboom', spriteSize: 48, candyCost: 25 }] },
    //     { name: 'Scorbunny', forms: [{ name: 'Scorbunny', sprite: 'scorbunny', spriteSize: 32, candyCost: 0 }, { name: 'Raboot', sprite: 'raboot', spriteSize: 32, candyCost: 10 }, { name: 'Cinderace', sprite: 'cinderace', spriteSize: 48, candyCost: 25 }] },
    //     { name: 'Sobble', forms: [{ name: 'Sobble', sprite: 'sobble', spriteSize: 32, candyCost: 0 }, { name: 'Drizzile', sprite: 'drizzile', spriteSize: 32, candyCost: 10 }, { name: 'Inteleon', sprite: 'inteleon', spriteSize: 48, candyCost: 25 }] },
    // ],
};
//# sourceMappingURL=game-data.js.map