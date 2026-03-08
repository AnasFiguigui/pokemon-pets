# Change Log

## [v0.9.3]

### New Features
- **Consumables & Backpack system** — 10 consumable items (Candy + 9 Evolution Stones) with a backpack UI and consumable shop section.
- **Eevee & branching evolutions** — Eevee with all 8 stone-based evolutions (Flareon, Vaporeon, Jolteon, Leafeon, Glaceon, Espeon, Umbreon, Sylveon).
- **Item-gated evolution** — Pokémon can evolve using specific evolution stones (e.g. Charizard via Fire Stone).
- **Day/Night cycle** — Time-based tinting and wild Pokémon selection.
- **Daily coding streaks** — Streak rewards with gold bonuses for consecutive days.
- **Import / Export saves** — Copy save data to clipboard or import from clipboard.
- **Local telemetry & stats** — Opt-in local stats tracking (nothing sent externally).
- **Top bar** — Persistent top bar showing gold and candy count, with toggle button.
- **8-direction movement** — Pokémon move in all 8 directions with matching animations.

### Improvements
- **Debounced save writes** — Multiple rapid changes coalesce into a single disk write instead of blocking the extension host.
- **Decoration drag optimized** — Position is saved once on drop instead of every frame.
- **Configuration listener disposal** — Fixed a minor memory leak on config change listener.
- **Cleaner evolution code** — Deduplicated candy/item evolution handling.
- **Hidden scrollbars** — Menu scrollbars are now invisible for a cleaner look.
- **Backpack item icons** — Consumables in the backpack now show their sprite icons.

## [v0.9.0]

- Initial release (Beta)

