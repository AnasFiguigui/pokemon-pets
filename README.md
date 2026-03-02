# Pokemon Pets

<div align="center">

Keep your favorite Pokémon with you while coding in VS Code.

![Pokemon Pets](https://raw.githubusercontent.com/Anasfiguiguinzer/Pokemon-Pets/main/pets.png)

</div>

## Features

- Add Pokémon pets with a full flow: `generation -> species -> form`.
- Supports mixed sprite sizes per form (`32x32` and `48x48`).
- Pet moods and interactions (including candy and pokéball actions).
- Wild Pokémon spawn system with generic/automated animation handling.
- In-game store and decoration mode (move/sell/place decor).

## Commands

- `Pokemon Pets: Add Pokémon`
- `Pokemon Pets: Remove Pokémon`
- `Pokemon Pets: Pokémon actions`
- `Pokemon Pets Settings`
- `Pokemon Pets: Open save file (JSON)`
- `Pokemon Pets: Reload save file`

## Settings

- `pokemon-pets.background`: farm background theme
- `pokemon-pets.scale`: pet scale (`Small`, `Medium`, `Big`)
- `pokemon-pets.monsters`: toggles wild Pokémon spawning

## Wild Pokémon (Automated)

Wild Pokémon now use one shared animation format and one shared class.

- Sprite folder: `media/sprites/wild-pokemons/`
- Data list: `src/game-data.ts` -> `WildPokemonSpecies`

To add a new wild Pokémon:

1. Add its sprite sheet in `media/sprites/wild-pokemons/` using the filename `<name>.png` (lowercase).
2. Add its name to `WildPokemonSpecies` in `src/game-data.ts`.

All wild Pokémon use the same row layout (4 frames each):

- row 0: `moveDown`
- row 1: `moveRight`
- row 2: `moveUp`
- row 3: `moveLeft`
- row 4: `idle`
- row 5: `special`

## Where to find it

Open the **Explorer** panel and look for **Pokemon Pets**.

If it is not visible:

- `Ctrl+Shift+P` (Windows/Linux)
- `Cmd+Shift+P` (macOS)

Then run: **Focus on Pokemon Pets View**.

## VS Code Marketplace

Available on the VS Code Marketplace:

https://marketplace.visualstudio.com/items?itemName=anasfiguigui.pokemon-pets

## Contributing

Issues and feature requests are welcome:

https://github.com/Anasfiguiguinzer/Pokemon-Pets/issues

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).

