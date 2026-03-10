# Contributing to Pokemon Pets

Thank you for your interest in contributing! Here's how you can help.

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [VS Code](https://code.visualstudio.com/)

### Getting Started

```bash
git clone https://github.com/Anasfiguigui/Pokemon-Pets.git
cd Pokemon-Pets
npm install
```

Press **F5** in VS Code to launch the Extension Development Host.

## Project Structure

```
src/                  TypeScript source (VS Code extension)
  extension.ts        Entry point – activation, commands, message handling
  save-manager.ts     Save/load logic with debounced writes
  webview-provider.ts Webview panel provider
  models.ts           Shared types and helpers (Pet, Save, HP/Stamina)
  game-data.ts        Pokémon species, forms, consumables & plant data
  evolution.ts        Candy feeding & item-based evolution logic
  telemetry.ts        Opt-in local stats tracker
  day-night.ts        Day/night cycle tinting & wild Pokémon selection
  streak.ts           Daily coding streak rewards
  test/               Unit tests (Vitest)
media/                Webview assets (HTML, CSS, JS, sprites)
  core/               Base classes (Vec2, Menus, Game loop, GameObject)
  characters/         Pet AI, wild Pokémon AI, movement & mood system
  decoration/         Decoration objects, plants, presets & layers
out/                  Compiled output (auto-generated)
```

## Scripts

| Command                | Description                    |
| ---------------------- | ------------------------------ |
| `npm run compile`      | Compile TypeScript             |
| `npm run watch`        | Watch & compile                |
| `npm run lint`         | Lint TypeScript source         |
| `npm test`             | Run unit tests                 |
| `npm run test:coverage`| Run tests with coverage report |

## Adding New Pokémon

1. Add sprite sheets to `media/sprites/pokemons/`.
2. Update `src/game-data.ts` with the species and form data.
3. Follow the existing naming conventions (lowercase, underscores).

## Adding New Consumables or Plants

1. Add the item definition in `src/game-data.ts` (Consumables or PlantTypes array).
2. Add the matching entry in the `ConsumableCatalog` or `PlantCatalog` array in `media/main.js`.
3. Add sprite frames to the relevant sprite sheet (`media/sprites/consumables.png` or `media/sprites/plants.png`).
4. If the consumable restores HP/Stamina, set `restoreHp` and/or `restoreStamina` on the item definition.

## Adding New Decorations

1. Add spritesheet frames to `media/sprites/decoration.png`.
2. Add the preset definition to `media/decoration/presets.js` under the appropriate category.

## Pull Requests

- One feature or fix per PR.
- Run `npm test` and `npm run lint` before submitting.
- Add tests for new functionality when possible.

## Code Style

- TypeScript strict mode enabled.
- ESLint rules are enforced — run `npm run lint`.
- Use `===` over `==`.

## Reporting Issues

Open an issue on GitHub with:

- A clear title and description.
- Steps to reproduce.
- VS Code version and OS.

## License

By contributing you agree that your contributions will be licensed under the [MIT License](LICENSE).
