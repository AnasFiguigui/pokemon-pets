# Pokemon Pets

<div align="center">

To celebrate the release of the new Pokémon game, I created this extension so you can keep your favorite Pokémon by your side while coding in VS Code.

![Pokemon Pets](https://i.ibb.co/W4FDnf57/Pokemons.gif)

New Pokémon will be added in future releases.
</div>

## Community Voting

Vote for the next Pokémon to be added:

https://trello.com/b/c2UVCW13/next-pokemon

If your Pokémon is not on the list, join the board as a member and create a new card:

https://trello.com/invite/b/69a69027fb2fa3f5e91c9a77/ATTI583b65e193854c5295412e8d24384b75CBC4550F/next-pokemon

Rules:

- One Pokémon per card.
- Search before creating a new card to avoid duplicates.
- The top 10 most voted Pokémon will be added to the extension.

## Features

- Add Pokémon pets with a full flow: `generation -> species -> form`.
- Pet moods and interactions (including candy and pokéball actions).
- Wild Pokémon spawn system with generic/automated animation handling.
- In-game store and decoration mode (move/sell/place decor).
- **Consumables & Backpack** — 10 items including Candy and 9 Evolution Stones.
- **Branching evolutions** — Eevee evolves into 8 forms via evolution stones.
- **Day/Night cycle** — Time-based visual tinting and wild Pokémon variation.
- **Daily coding streaks** — Earn gold bonuses for consecutive coding days.
- **Import / Export saves** — Backup and restore your save via clipboard.
- **Local stats** — Opt-in local telemetry (nothing sent externally).
- **8-direction movement** — Pokémon walk in all directions with matching sprites.

## Settings

- `pokemon-pets.background`: farm background theme
- `pokemon-pets.scale`: pet scale (`Small`, `Medium`, `Big`)
- `pokemon-pets.wild`: toggles wild Pokémon spawning
- `pokemon-pets.dayNightCycle`: toggles the day/night visual tinting
- `pokemon-pets.telemetry`: toggles local stats tracking

## Where to find it

Open the **Explorer** panel and look for **Pokemon Pets**.

If it is not visible:

- `Ctrl+Shift+P` (Windows/Linux)
- `Cmd+Shift+P` (macOS)

Then run: **Focus on Pokemon Pets View**.

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [VS Code](https://code.visualstudio.com/)

### Getting Started

```bash
git clone https://github.com/Anasfiguigui/Pokemon-Pets.git
cd Pokemon-Pets
npm install
```

Press **F5** in VS Code to launch the Extension Development Host.

### Scripts

| Command                 | Description                    |
| ----------------------- | ------------------------------ |
| `npm run compile`       | Compile TypeScript             |
| `npm run watch`         | Watch & compile                |
| `npm run lint`          | Lint TypeScript source         |
| `npm test`              | Run unit tests                 |
| `npm run test:coverage` | Run tests with coverage report |

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).