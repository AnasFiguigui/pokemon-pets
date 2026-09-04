# Pokemon Pets

<div align="center">

A browser-based Pokémon pet game — feed, collect, evolve, and decorate!

![Pokemon Pets](https://i.ibb.co/Z1wDcvzK/pokegif1.gif)
<br>
![Pokemon Pets](https://i.ibb.co/fY5VDhDX/pokegif2.gif)

</div>

## Community & Feedback

A Discord server is available for discussions, bug reports, feature suggestions, and community voting.

Join the server here:  
https://discord.gg/2wZWwZ8Egy

Use the server to:
- Report issues or bugs
- Suggest new features
- Vote on future additions
- Discuss the extension with other users

## Features

- Add Pokémon pets with a full flow: `generation -> species -> form`.
- Pet moods and interactions (including candy and pokéball actions).
- Wild Pokémon spawn system with catch rewards.
- In-game store and decoration mode (move/sell/place decor).
- **Decoration Categories** — Ground Tiles, Decor Plants, Lamps, Mid Misc, Small Misc, Fences, and Special (programming language banners — free!).
- **Ground Tiles** — Free 15-piece Pond, Sand Path, and Dirt Path sets for building custom water features and routes. Each set includes matching plant details, and all ground tiles render beneath Pokémon, plants, and ordinary decorations.
- **HP & Stamina** — Pokémon have health and stamina that drain over time; fainted Pokémon leave.
- **Auto Feed** — Automatically feeds low-health pets using your cheapest food and potions, and harvests ripe plants after a five-minute grace period.
- **Pokédex** — View all your Pokémon with level, HP bar, Stamina bar, and friendship tier.
- **Rename Pokémon** — Give your Pokémon custom nicknames from the actions menu or command palette.
- **Seeds & Plants** — Buy seeds, plant them with a ghost preview of the grown plant, and harvest berries when they mature.
  - Use Build Mode's `+` button to finalize the current placement and reopen the last visited shop page.
  - Build Mode keeps three session-based shortcut slots for quickly placing recently purchased decorations, ground tiles, or seeds again.
- **Mulch System** — Apply mulch to plants for bonuses. A colored dot appears below mulched plants so you always know which type is active:
  - 🟢 **Growth Mulch** — Reduces growth time by 25% for 1 hour. *(green dot)*
  - 🔵 **Damp Mulch** — Increases harvest yield by +1. Consumed after one harvest. *(blue dot)*
  - 🟠 **Stable Mulch** — Doubles the harvest window before a ripe plant wilts. Consumed after one harvest. *(orange dot)*
  - 🟣 **Gooey Mulch** — Grants 1 extra regrow cycle. Single-harvest plants only. *(purple dot)*
- **Consumables & Backpack** — Food, potions, candy, mulch, evolution stones, and Everstone with a backpack UI.
- **Everstone** — Equip it in a Pokémon's held-item slot to prevent evolution until you manually remove it.
- **Friendship** — Pokémon build friendship over time through feeding and catching; shown in the Pokédex.
- **Branching evolutions** — Eevee evolves into 8 forms via evolution stones.
- **Day/Night cycle** — Time-based visual tinting and wild Pokémon variation.
- **Coding Activity Rewards** — Earn gold and friendship by coding. File saves grant small rewards; Git commits grant gold; Git pushes grant gold, candy, and friendship to your Pokémon. Per-file cooldowns prevent abuse. All multipliers are configurable in settings.
- **Daily coding streaks** — Earn gold bonuses for consecutive coding days.
- **Pet playdates** — Pokémon occasionally walk up to each other and play, reacting with matching emotes and earning both a little friendship.
- **Pokémon gift codes** — Share a single Pokémon with a friend: export a gift code to the clipboard, and they import it with one command.
- **Settings Sync backup** — Your save is backed up through VS Code Settings Sync, so your Pokémon follow you to new machines automatically.
- **Import / Export saves** — Backup and restore your save via clipboard.
- **Local stats** — Opt-in local telemetry (nothing sent externally).
- **8-direction movement** — Pokémon walk in all directions with matching sprites.

<div align="center"> Maybe I went a little too far with the features 👀 </div>

## Settings

- `pokemon-pets.background`: farm background theme
- `pokemon-pets.scale`: pet scale (`Small`, `Medium`, `Big`)
- `pokemon-pets.menuScale`: in-game menu scale (`Small`, `Default`, `Large`; default `Default`)
- `pokemon-pets.wild`: toggles wild Pokémon spawning
- `pokemon-pets.maxPokemon`: maximum number of Pokémon you can have at once (`6`, max `12`)
- `pokemon-pets.dayNightCycle`: toggles the day/night visual tinting
- `pokemon-pets.syncSaveBackup`: back up the save via VS Code Settings Sync (`true`)
- `pokemon-pets.telemetry`: toggles local stats tracking
- `pokemon-pets.rewards.enabled`: toggles coding activity rewards (`true`)
- `pokemon-pets.rewards.saveGold`: gold earned per file save (`2`)
- `pokemon-pets.rewards.savesPerFriendship`: file saves needed for +1 friendship to a random pet (`10`)
- `pokemon-pets.rewards.saveCooldownSeconds`: per-file cooldown to prevent spam (`120`)
- `pokemon-pets.rewards.commitGold`: gold earned per Git commit (`100`, `0` disables)
- `pokemon-pets.rewards.pushGold`: gold earned per Git push (`200`)
- `pokemon-pets.rewards.pushCandy`: candy given to a random pet per Git push (`1`)
- `pokemon-pets.rewards.pushFriendship`: friendship added to all pets per Git push (`5`)

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

<!-- ### Getting Started

```bash
git clone https://github.com/Anasfiguigui/Pokemon-Pets.git
cd Pokemon-Pets
npm install
``` -->

Press **F5** in VS Code to launch the Extension Development Host.

<!-- ### Scripts

| Command                 | Description                    |
| ----------------------- | ------------------------------ |
| `npm run compile`       | Compile TypeScript             |
| `npm run watch`         | Watch & compile                |
| `npm run lint`          | Lint TypeScript source         |
| `npm test`              | Run unit tests                 |
| `npm run test:coverage` | Run tests with coverage report |

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. -->

## Enjoying Pokemon Pets?

If you like this extension, please share it with your friends and consider leaving a ⭐⭐⭐⭐⭐ rating on the [Marketplace](https://marketplace.visualstudio.com/items?itemName=AnasFiguigui.pokemon-pets)!

You might also enjoy my other extensions:

- **[Dark Reign Themes](https://marketplace.visualstudio.com/items?itemName=AnasFiguigui.dark-reign-theme)** — A collection of dark themes for VS Code.
- **[Kaomoji Status](https://marketplace.visualstudio.com/items?itemName=AnasFiguigui.kaomoji-status)** — Fun kaomoji in your status bar.

## Resource Consumption

This extension is designed to be **lightweight** and won't slow down your editor:

| Resource | Details |
|---|---|
| **Package size** | ~450 KB (compressed VSIX) |
| **CPU** | 20 FPS game loop via `requestAnimationFrame`, only active when the panel is visible. VS Code automatically suspends hidden webviews. |
| **Memory** | Minimal — sprite sheets are shared, no persistent connections or file watchers. |
| **Background timers** | A single 60-second interval handles all periodic tasks (day/night, plant growth, stamina drain). No work is done when there are no pets or plants. |
| **Disk I/O** | Save file writes are debounced — only written when data actually changes, not on every tick. |

## Thanks & Credits

- **[BOTPanzer](https://github.com/BOTPanzer)** — This project was inspired by their [Stardew Pets](https://marketplace.visualstudio.com/items?itemName=botpa.stardew-pets) extension for VS Code. Thank you for the amazing work and inspiration!

### Sprite Credits

All custom graphics not originating from official PMD games are licensed under [Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)](http://creativecommons.org/licenses/by/4.0/).

All sprites used in this project can be found at [PMD Sprite Collab](http://sprites.pmdcollab.org/).

A full list of contributing artists is available at the [PMD Sprite Collab Contributors page](https://sprites.pmdcollab.org/#/Contributors).

<!-- ## License

This project is licensed under the MIT License. See [LICENSE](LICENSE). -->

## About the Project

This project is a fan-made extension created for fun and experimentation.  
It is **not affiliated with, endorsed by, or supported by** Nintendo, Game Freak, or The Pokémon Company.

All Pokémon names, characters, images, and related assets are trademarks and copyrights of their respective owners.

This project is **non-commercial** and is not intended to generate profit. It exists purely for learning, creativity, and for the community to enjoy.
