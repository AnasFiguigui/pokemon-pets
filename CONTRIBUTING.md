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
  extension.ts        Entry point – activation, commands
  save-manager.ts     Save/load logic, pet & decoration management
  webview-provider.ts Webview panel provider
  models.ts           Shared types and helpers
  game-data.ts        Pokémon species & form data
  test/               Unit tests (Vitest)
media/                Webview assets (HTML, CSS, JS, sprites)
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
