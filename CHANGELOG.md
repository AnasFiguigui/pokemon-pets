# Change Log

## [v1.4.0] — Auto Harvest

### New Features
- **Togepi line** — Togepi → Togetic → Togekiss (Generation 2).
- **Shinx line** — Shinx → Luxio → Luxray (Generation 4).
- **Riolu line** — Riolu → Lucario (Generation 4).
- **Auto harvest** — When Auto Feed is enabled, ripe plants are now harvested automatically after five minutes, leaving a grace period for manual harvesting.
- **Everstone** — A new held item that prevents a Pokémon from evolving while equipped. It remains in the held slot until manually removed and returned to the backpack.
- **Menu scale setting** — In-game menus can now be displayed at Small, Default, or Large scale independently of the Pokémon size. The existing menu size remains the default.
- **Ground Tiles** — Added a free Item Shop category with 13-piece Pond, Sand Path, and Dirt Path sets, including four inner-corner tiles per style. These background pieces always render beneath Pokémon, plants, and ordinary decorations.
- **Python & PHP banners** — Added two programming-language banners to the Item Shop's Special category.

### Improvements
- **Shared harvest logic** — Manual and automatic harvesting now use the same validated backend flow, including repeatable crops and Damp/Gooey Mulch effects.
- **Held-item save imports** — Imported saves now preserve valid held stones, including Everstone.
- **Quick shop button** — Build Mode now has a `+` button between Sell and Close. It finalizes the current placement and reopens the last visited shop page for faster repeated placement.

### Bug Fixes
- **Rapid evolution sprites** — Consecutive evolutions now animate in sequence, preventing the in-game sprite from getting stuck one form behind the Pokédex when candies are fed quickly.
- **Responsive wallet bar** — The money, Pokédex, Backpack, and candy controls now remain visible and centered when the extension sidebar is very narrow.
- **Responsive menu controls** — Pokédex feeding and Backpack selling buttons now wrap instead of disappearing, while Item Shop cards share rows evenly and switch to one card per row when space is limited.

## [v1.3.0] — New Pokémon Across Generations

### New Features
- **Gastly line** — Gastly → Haunter → Gengar (Generation 1).
- **Generation 2 starters** — Chikorita → Bayleef → Meganium, Cyndaquil → Quilava → Typhlosion, Totodile → Croconaw → Feraligatr.
- **Generation 3 starters** — Treecko → Grovyle → Sceptile, Torchic → Combusken → Blaziken, Mudkip → Marshtomp → Swampert.
- **Generation 4 starters** — Turtwig → Grotle → Torterra, Chimchar → Monferno → Infernape, Piplup → Prinplup → Empoleon.
- **Generation 5 starters** — Snivy → Servine → Serperior, Tepig → Pignite → Emboar, Oshawott → Dewott → Samurott.
- **Zorua line** — Zorua → Zoroark, plus Hisuian variant (Zorua → Zoroark Hisuian).
- **Configurable max Pokémon** — New `pokemon-pets.maxPokemon` setting lets you choose how many Pokémon you can have at once (1–12, default 6).
- **Wild Gastly & Haunter** — Gastly and Haunter now appear as night-only wild Pokémon.
- **Razz Berry & Maranga Berry** — Two new berries with matching seeds and plantable crops. Razz Berry restores HP + stamina; Maranga Berry is a stamina-focused berry with a single-harvest plant.

### Improvements
- **Save import hardened** — Friendship, HP, stamina, inventory, telemetry, and decoration data are now fully validated on import.
- **Money upper bound** — Gold is now capped at 999,999,999 to prevent overflow.
- **Plant/decoration validation** — `move_plant` and `remove_plant` message handlers now validate input types.


## [v1.2.0] — Quick Access, Held Items & More

### New Features
- **Quick Access decorations** — 8 free shortcut objects that trigger actions when clicked (Pokédex, throw Pokéball, Item Shop, Backpack, Build Mode).
- **Held item slot** — Pokémon can now hold an item in a dedicated slot.
- **Coding activity rewards** — Earn gold from file saves and git pushes.
- **More decoration plants** — Additional decor plant varieties in the shop.

### Improvements
- **Item Shop layout** — Store categories and items now display in a 2-column grid with larger icons, showing the image above the name and price.
- **Species lookup optimized** — `findSpecies` changed from O(n) scan to O(1) map lookup.

### Removed
- **Plant wilting** — Ripe plants no longer wilt; they stay harvestable forever. Stable Mulch has been removed from the shop (no longer needed).

### Bug Fixes
- **Eevee lateral evolution** — Fixed stone-based evolutions incorrectly triggering on already-evolved Eeveelutions.
- **Quick Access click** — Fixed menus opened by quick-access decorations being immediately closed by the mouse-up handler.
- **Decoration sprites** — Fixed incorrect sprite offsets for some decorations.
- **Held slot sprite** — Fixed the held-item slot sprite rendering.

## [v1.1.0] — Plants, Mulch & Quality of Life

### New Features
- **Mulch system** — 4 mulch types that modify plant behavior: Growth Mulch (−25% growth time for 1 hour), Damp Mulch (+1 harvest yield), Stable Mulch (×2 harvest window, single-harvest only), Gooey Mulch (+1 regrow cycle, single-harvest only). All mulch is consumed after one use/harvest.
- **Friendship display** — Pokédex now shows a friendship tier message (Dislikes Trainer → Perfect Bond) next to each Pokémon's level.
- **Rename Pokémon** — Accessible from the actions menu or via command palette (`Pokemon Pets: Rename Pokémon`).
- **Seed placement preview** — When placing a seed, a 40% opacity ghost preview of the grown plant is shown to help with positioning.
- **Super Potion & Hyper Potion** — Two new healing consumables available in the shop.
- **Pokédex feed buttons** — Feed Candy and Food directly from each Pokémon's Pokédex entry.

### Improvements
- **Plant deferred purchase** — Seeds are paid for on placement, not on click, so cancelling doesn't cost gold.
- **Decoration deferred purchase** — Same deferred-buy logic for decoration items.
- **Build mode buttons** — Moved to bottom-left for better visibility.
- **Sell consumable UI** — Backpack now refreshes correctly after selling items.

### Bug Fixes
- **Money clamping bug** — Fixed a cap that limited single-transaction money changes, causing large sales to silently lose gold.
- **Consumable price sync** — Aligned frontend and backend prices so all items can be purchased correctly.
- **Plant price fix** — Corrected Oran Berry Seed price.

## [v1.0.0] — Official Release

### New Features
- **HP & Stamina system** — Each Pokémon now has HP and Stamina stats that scale with level. Stamina drains over time, and HP drains when stamina reaches zero. Pokémon that faint from exhaustion will leave.
- **Auto Feed** — Toggle automatic feeding for pets at low HP/stamina using your cheapest available food and potions.
- **Pokédex** — View all your summoned Pokémon with their name, level, HP bar, and Stamina bar.
- **Seeds & Plants** — Buy seeds from the store, plant them in your world, and harvest berries when they mature through 3 growth phases.
- **Food & Potions** — Oran Berry (+10 HP, +15 STA) and Potion (+20 HP) consumables to keep your Pokémon healthy.
- **Harvest system** — Click ripe plants to collect fruits that go straight into your backpack.
- **Wild Pokémon catch reward** — Catching wild Pokémon now shows the gold reward on screen.

### Improvements
- **Performance: GPU-accelerated rendering** — Double-buffer canvas no longer forces software rendering, enabling hardware acceleration.
- **Performance: Zero-allocation animation loop** — Animation frames no longer create temporary Vec2 objects every tick.
- **Performance: Cached cursor position** — Scaled cursor position is computed once on mouse move instead of allocating 2 Vec2 objects per access.
- **Performance: Cached DOM lookups** — Night overlay and lamp glow elements are cached at load time instead of queried every frame.
- **Performance: Resize event listener** — Window resize detection uses an event listener instead of polling every game tick.
- **Store menu fix** — Fixed a syntax error in decoration presets that prevented the store (and most webview functionality) from working.

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

