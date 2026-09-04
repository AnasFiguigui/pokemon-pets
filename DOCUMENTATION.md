# Pokémon Pets — VS Code Extension Technical Documentation

A virtual pet extension for VS Code that renders interactive pixel-art Pokémon in a sidebar webview panel. Pokémon wander, sleep, play fetch, evolve, and interact with a full shop/decoration/plant system.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Rendering Pipeline](#rendering-pipeline)
- [Sprite Sheet Format](#sprite-sheet-format)
- [Animation System](#animation-system)
- [AI State Machine](#ai-state-machine)
- [Friendship System](#friendship-system)
- [Evolution System](#evolution-system)
- [Evolution Animation](#evolution-animation)
- [Stamina / HP System](#stamina--hp-system)
- [Wild Pokémon System](#wild-pokémon-system)
- [Store / Shop System](#store--shop-system)
- [Plant Growth System](#plant-growth-system)
- [Decoration System](#decoration-system)
- [Day / Night Cycle](#day--night-cycle)
- [Save System](#save-system)
- [Daily Streak Rewards](#daily-streak-rewards)
- [Message Protocol](#message-protocol)
- [Backend Modules Reference](#backend-modules-reference)
- [Frontend Modules Reference](#frontend-modules-reference)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   VS Code Extension Host                │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ extension.ts │  │ evolution.ts │  │ save-manager  │  │
│  │ (main logic) │  │ (evo checks) │  │  .ts (persist)│  │
│  └──────┬───────┘  └──────────────┘  └───────────────┘  │
│         │                                               │
│  ┌──────┴───────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ webview-     │  │  day-night   │  │  telemetry    │  │
│  │ provider.ts  │  │   .ts        │  │   .ts         │  │
│  └──────┬───────┘  └──────────────┘  └───────────────┘  │
│         │                                               │
│  ┌──────┴───────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  models.ts   │  │  game-data   │  │  streak.ts    │  │
│  │  (types)     │  │   .ts        │  │  (daily)      │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
└──────────────────────────┬──────────────────────────────┘
                           │
              webview.postMessage() / vscode.postMessage()
                           │
┌──────────────────────────▼──────────────────────────────┐
│                   VS Code Webview                       │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │   main.js    │  │  base.js     │  │  runtime.js   │  │
│  │ (UI/menus/   │  │ (Vec2/Timer/ │  │ (GameObject/  │  │
│  │  handlers)   │  │  Util/Cursor)│  │  Game/Ball)   │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │   pets.js    │  │ wild-poke-   │  │ decoration.js │  │
│  │ (AI/Char/    │  │  mons.js     │  │ presets.js    │  │
│  │  Pokemon)    │  │              │  │ object.js     │  │
│  └──────────────┘  └──────────────┘  │ plant.js      │  │
│                                      └───────────────┘  │
└─────────────────────────────────────────────────────────┘
```

The extension uses a **backend/frontend split**:

- **Backend** (TypeScript): Runs in the VS Code extension host. Manages save data, evolution logic, timers (stamina drain, plant growth, day/night), and all game-state authority.
- **Frontend** (JavaScript): Runs inside a VS Code webview. Handles canvas rendering at 20 FPS, AI behavior, user input, menus, and visual effects.
- **Communication**: Async messages via `webview.postMessage()` (backend→frontend) and `vscode.postMessage()` (frontend→backend).

---

## Project Structure

```
pokemon-pets/
├── src/                        # Backend (TypeScript)
│   ├── extension.ts            # Main entry: commands, message router, timers
│   ├── models.ts               # Shared types: Pet, Save, Decoration, etc.
│   ├── game-data.ts            # Static data: species, consumables, plants
│   ├── save-manager.ts         # Persistence: load/save/sanitize JSON
│   ├── evolution.ts            # Evolution logic: candy + stone + friendship
│   ├── webview-provider.ts     # Webview lifecycle and HTML loading
│   ├── day-night.ts            # Time-of-day calculations
│   ├── streak.ts               # Daily streak rewards
│   ├── telemetry.ts            # Local-only stat tracking
│   └── test/                   # Vitest unit tests (236 tests)
├── media/                      # Frontend (JavaScript + assets)
│   ├── main.html               # Webview HTML skeleton
│   ├── main.css                # All styling (678 lines)
│   ├── main.js                 # UI, menus, store, message handlers
│   ├── core/
│   │   ├── base.js             # Vec2, Timer, Timeout, Util, Cursor, Menus
│   │   └── runtime.js          # Animation, GameObject, Ball, Game engine
│   ├── characters/
│   │   ├── pets.js             # AI, Character, PetAI, PokemonAnimations, Pokemon
│   │   └── wild-pokemons.js    # Wild Pokémon AI and character
│   ├── decoration/
│   │   ├── presets.js          # Decoration catalog (plants, lamps, misc)
│   │   ├── object.js           # Decoration class (drag, sell, lamp glow)
│   │   ├── plant.js            # Growable plant class
│   │   └── layers.js           # Reserved for future use
│   ├── sprites/                # All sprite sheet PNGs
│   │   ├── pokemons/           # Pet sprite sheets (4 cols × 13 rows)
│   │   ├── wild-pokemons/      # Wild Pokémon sprite sheets
│   │   ├── backgrounds/        # Tiling background images
│   │   └── ui/                 # UI sprites (menu border, etc.)
│   ├── fonts/                  # Custom Pokémon font
│   └── icons/                  # VS Code toolbar icons (dark + light)
├── package.json                # Extension manifest, commands, settings
├── tsconfig.json               # TypeScript config
└── CHANGELOG.md                # Version history
```

---

## Rendering Pipeline

The game runs a **fixed-timestep loop** at 20 FPS with double-buffered canvas rendering:

```
┌──────────────────────────────────────────────────────────┐
│                requestAnimationFrame(gameLoop)            │
│                          │                               │
│          ┌───────────────▼────────────────┐               │
│          │  Accumulate delta time          │               │
│          │  Cap at 5× interval (prevent   │               │
│          │  spiral on tab refocus)         │               │
│          └───────────────┬────────────────┘               │
│                          │                               │
│          ┌───────────────▼────────────────┐               │
│          │  For each needed update (50ms): │               │
│          │                                │               │
│          │   Game.update()                │               │
│          │     ├─ Increment frame counter  │               │
│          │     ├─ Check resize dirty flag  │               │
│          │     └─ For each active object:  │               │
│          │         obj.update()            │               │
│          │           ├─ AI.update()        │               │
│          │           │   └─ State machine  │               │
│          │           └─ Animation.update() │               │
│          │               └─ Advance frame  │               │
│          │                  Update offset  │               │
│          └───────────────┬────────────────┘               │
│                          │                               │
│          ┌───────────────▼────────────────┐               │
│          │  Game.draw()  (once per rAF)   │               │
│          │                                │               │
│          │  1. Clear buffer canvas         │               │
│          │  2. Sort objects by:            │               │
│          │     sortingLayer (primary)      │               │
│          │     sortingOrder = Y+H (depth)  │               │
│          │  3. For each active object:     │               │
│          │     obj.draw(bufferCtx)         │               │
│          │       ├─ ctx.save()             │               │
│          │       ├─ Translate to position  │               │
│          │       ├─ Optional horizontal    │               │
│          │       │  flip (scale -1)        │               │
│          │       ├─ drawImage(spriteSheet, │               │
│          │       │   srcX, srcY, w, h,     │               │
│          │       │   0, 0, w, h)           │               │
│          │       ├─ ctx.restore()          │               │
│          │       └─ drawMood() (pets only) │               │
│          │  4. Copy buffer → real canvas   │               │
│          │  5. onAfterDraw() → lamp masks  │               │
│          └────────────────────────────────┘               │
└──────────────────────────────────────────────────────────┘
```

**Key details:**
- The game uses `image-rendering: pixelated` CSS for crisp pixel art
- Canvas is scaled via `--scale` CSS variable (1x/2x/3x)
- Objects are Y-sorted for proper depth (back-to-front)
- Click detection uses a dedicated alpha-test canvas: draws the sprite at origin, checks pixel alpha at click position

---

## Sprite Sheet Format

Each Pokémon sprite sheet is a grid of **4 columns × 13 rows**:

```
         Col 0    Col 1    Col 2    Col 3
       ┌────────┬────────┬────────┬────────┐
Row 0  │ Walk Down (4 frames)              │  ← Movement
Row 1  │ Walk Down-Right                   │
Row 2  │ Walk Right                        │
Row 3  │ Walk Up-Right                     │
Row 4  │ Walk Up                           │
Row 5  │ Walk Up-Left                      │
Row 6  │ Walk Left                         │
Row 7  │ Walk Down-Left                    │  ← 8-directional
       ├────────┼────────┼────────┼────────┤
Row 8  │ Idle (4 frames, no loop)          │  ← Idle
Row 9  │ Special / Click (4 frames)        │  ← Interaction
       ├────────┼────────┼────────┼────────┤
Row 10 │ Sleep variant B (4 frames)        │  ← Sleep
Row 11 │ Sleep variant A (2 frames, loop)  │    (random pick)
       ├────────┼────────┼────────┼────────┤
Row 12 │ Evolve (4 frames)                 │  ← Evolution
       └────────┴────────┴────────┴────────┘

Frame size: 32×32 or 48×48 pixels (per species form)
```

**Other sprite sheets:**
- `consumables.png` — 12 consumable icons in a row (32×32 each)
- `decoration.png` — All decoration sprites (various sizes)
- `emotes.png` — Mood/emote icons (16×16 each)
- `ball.png` — Ball sprite (10×20, pixel-based bounce animation)
- `plants.png` — Plant sprites with phase offsets

---

## Animation System

The `Animation` class manages sprite-sheet frame cycling:

```javascript
new Animation(frames, speed, options)
```

- **`frames`** — Array of `[column, row]` pairs indexing the sprite sheet
- **`speed`** — Game frames per animation frame (lower = faster)
- **`options.loop`** — Whether to repeat (default: `true`)
- **`options.flip`** — Mirror sprite horizontally
- **`options.pixelOffset`** — Use raw pixel coords instead of `frame × size`

**How it works:**
1. Each game update calls `animation.update()`
2. Internal counter increments; when it reaches `speed`, the frame advances
3. For looping animations, frame wraps to 0 after the last
4. For non-looping, `finished = true` is set at the last frame
5. Returns `[x, y]` frame coordinates → multiplied by object size → used as `spriteOffset` in `drawImage`

**Animation assignment:**
- `object.animate(name, force?)` — looks up animation by name, resets and starts it
- Sleep animations are stored as arrays (randomly picks one variant)

---

## AI State Machine

Each pet runs a deterministic state machine at 20 FPS:

```
                    ┌──────────────────────────────────┐
                    │                                  │
                    ▼                                  │
              ┌──────────┐    timer done + 75%    ┌────┴─────┐
     ┌───────→│   IDLE   │──────────────────────→│  SLEEP   │
     │        │ (2–4 sec)│                        │(10–15 sec)│
     │        └────┬─────┘                        └──────────┘
     │             │
     │             │ timer done + 25%
     │             ▼
     │        ┌──────────┐   target       ┌──────────┐
     │        │   MOVE   │──reached──────→│   IDLE   │
     │        │ (walking)│                └──────────┘
     │        └──────────┘
     │
     │     click (or consumable used)
     │             │
     │             ▼
     │        ┌──────────┐   timer done
     └────────│ SPECIAL  │───────────────→ MOVE (random)
              │ (2 sec)  │
              └──────────┘

  ── Ball thrown ──────────────────────────────────────────

              ┌──────────┐   ball reached  ┌──────────┐
              │MOVE_BALL │────────────────→│ SPECIAL  │
              │(→ ball)  │   +friendship   │ (+ heart)│
              └──────────┘                 └──────────┘
```

**State transitions:**
- `IDLE`: Animate idle, wait 2–4 seconds. Then 75% chance sleep, 25% move to random point.
- `SLEEP`: Animate sleep for 10–15 seconds, then return to `IDLE`.
- `MOVE`: Move 1px/frame toward target. On arrival → `IDLE`.
- `SPECIAL`: Play special animation (2 sec), then move to random point.
- `MOVE_BALL`: Same as MOVE but toward balls. On arrival: notify backend (+0.5 friendship), show heart mood, play special.

**Mood system:** Pets display emote bubbles (16×16 sprites) above their heads. Heart mood lasts 10 minutes after consumable/ball. Random moods cycle otherwise. Visible for 2 seconds when triggered.

---

## Friendship System

Friendship is a **hidden float value** (0–255) tracked server-side only, never shown in UI.

### Ranges
| Range | Label | Notes |
|-------|-------|-------|
| 0–49 | Dislikes | Reserved for future wild Pokémon use |
| 50–99 | Neutral | New Pokémon start here (random) |
| 100–149 | Getting Friendly | |
| 150–199 | Very Friendly | |
| 200–254 | Close Bond | |
| 255 | Maximum | Cap |

### How Friendship Increases
| Action | Gain |
|--------|------|
| Feed Rare Candy | +1.0 |
| Feed Oran Berry | +2.0 |
| Use Potion | +3.0 |
| Pet catches ball | +0.5 |
| Auto-feed (any item) | Item's `friendshipGain` value |

### Friendship and Evolution
Some Pokémon forms require a minimum friendship to evolve (in addition to candy + items):

| Pokémon | Required Friendship | Other Requirements |
|---------|--------------------|--------------------|
| Charizard | 220 | 25 candy + Fire Stone |

Friendship is checked in both `feedCandy()` and `useItem()` methods. If `requiredFriendship` is defined on a form but the pet's friendship is below that threshold, evolution is blocked.

---

## Evolution System

```
                    ┌─────────────────┐
                    │  Feed Candy     │
                    │  (use_consumable│
                    │   id='candy')   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ candyFed++      │
                    │ friendship += 1 │
                    └────────┬────────┘
                             │
               ┌─────────────▼──────────────┐
               │  Next form exists?          │
               │  No requiredItem?           │
               │  candyFed >= candyCost?     │     No ──→ (no evolution)
               │  friendship >= required?    │───────────→
               └─────────────┬──────────────┘
                             │ Yes
                    ┌────────▼────────┐
                    │    EVOLVE!      │
                    │ Update form/    │
                    │ sprite/size     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Send 'evolution'│
                    │ message to      │
                    │ frontend        │
                    └─────────────────┘


                    ┌─────────────────┐
                    │  Use Stone      │
                    │  (use_consumable│
                    │   id='fire_st') │
                    └────────┬────────┘
                             │
               ┌─────────────▼──────────────┐
               │  Scan forms after current:  │
               │  requiredItem matches?      │
               │  candyFed >= candyCost?     │     No ──→ "It had no effect!"
               │  friendship >= required?    │───────────→ (stone not consumed)
               └─────────────┬──────────────┘
                             │ Yes
                    ┌────────▼────────┐
                    │    EVOLVE!      │
                    │ Stone consumed  │
                    │ Update form     │
                    └─────────────────┘
```

**Branching evolutions:** Eevee has 8 possible evolutions at the same candy cost (25), each requiring a different evolution stone. `useItem()` scans all forms after the current one for a match.

---

## Evolution Animation

The evolution visual effect is fully **canvas-based** (not CSS, since pets are rendered on canvas):

```
Phase 1: Slow Blink (1 second)          Phase 2: Medium (0.5s)     Phase 3: Fast (0.5s)
┌───┐   ┌───┐   ┌───┐   ┌───┐   ┌───┐  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐
│ ■ │   │   │   │ ■ │   │   │   │ ■ │  │■ │ │  │ │■ │ │  │ │■ │ ││││││││││││││││││││
│ ■ │   │   │   │ ■ │   │   │   │ ■ │  │■ │ │  │ │■ │ │  │ │■ │ ││││││││││││││││││││
└───┘   └───┘   └───┘   └───┘   └───┘  └──┘ └──┘ └──┘ └──┘ └──┘ └┘└┘└┘└┘└┘└┘└┘└┘└┘└┘
200ms   200ms   200ms   200ms   200ms   100ms each         50ms each
                                                            
────────── Old Form Blinks ──────────────────────────────── → New Form Appears
                                                              (special animation)
```

**Implementation:**
1. Old pet freezes at idle animation
2. `setActive(true/false)` toggles visibility rapidly in 3 phases:
   - 5 slow blinks at 200ms intervals
   - 5 medium blinks at 100ms intervals
   - 10 fast blinks at 50ms intervals
3. After ~2 seconds total, the old pet is removed from the game
4. A new `Pokemon` object is created with the evolved sprite at the **same position**
5. The new form plays its `special` animation as a celebration

---

## Stamina / HP System

```
Every 6 minutes:
┌─────────────────────┐
│ For each pet:       │
│                     │
│  stamina > 0?       │
│  ├─ Yes: stamina--  │
│  └─ No:  hp--       │
│                     │
│  hp <= 0?           │
│  └─ Yes: PET FAINTS │
│     (permanently    │
│      removed!)      │
└─────────────────────┘

HP Formula:    maxHp = 50 + min(candyFed, 100) × 2     → range: 50–250
Stamina:       maxStamina = same formula                → range: 50–250

Drain rate:    10 stamina/hour, then 10 HP/hour when starving
Survival:      ~5 hours from full stamina to starvation
               ~5 more hours until fainting (with base stats)
```

**Auto-feed** (when enabled):
- Triggers after each stamina drain tick
- Only feeds pets at ≤25% HP or stamina
- Uses cheapest available food/potion from inventory
- One item per pet per tick
- Also grants friendship from the consumable

---

## Wild Pokémon System

```
┌──────────────┐     10s delay      ┌──────────────┐
│  Extension   │───────────────────→│  Webview     │
│  starts      │  enable wild=true  │ schedules    │
│              │                    │ spawn timer  │
└──────────────┘                    └──────┬───────┘
                                          │ timer fires
                                          ▼
┌──────────────┐  spawn_wild_pokemon ┌──────────────┐
│   Backend    │◄────────────────────│   Frontend   │
│ pickWild()   │                    │              │
│ filters by   │ spawn_wild_pokemon │              │
│ time of day  │───────────────────→│ Create wild  │
│              │  { specie }        │ sprite       │
└──────────────┘                    └──────┬───────┘
                                          │ player clicks
                                          ▼
┌──────────────┐ wild_pokemon_caught ┌──────────────┐
│   Backend    │◄────────────────────│  Wild dies   │
│ reward =     │                    │ (special anim│
│ 60–100 gold  │     money + reward │  then remove)│
│              │───────────────────→│              │
└──────────────┘                    └──────┬───────┘
                                          │ 30s delay
                                          ▼
                                   (cycle repeats)
```

- Night-only species only spawn between 20:00–06:00
- Reward: 60 + random(0..8) × 5 = **60G to 100G** in 5G increments

---

## Store / Shop System

```
┌──────────────────────────────────────┐
│              SHOP                    │
│                                      │
│  ┌────────────┐  ┌────────────────┐  │
│  │Consumables │  │    Seeds       │  │
│  │            │  │                │  │
│  │ Candy  30G │  │ Oran Seed 50G │  │
│  │ Berry  15G │  │               │  │
│  │ Potion 25G │  └────────────────┘  │
│  │ Stones     │                      │
│  │ 100-120G   │  ┌────────────────┐  │
│  └────────────┘  │  Decorations   │  │
│                  │                │  │
│                  │ Plants  50-300G│  │
│                  │ Lamps   50-100G│  │
│                  │ Mid    200G    │  │
│                  │ Small  100G    │  │
│                  └────────────────┘  │
└──────────────────────────────────────┘
```

- **Consumables**: Backend validates gold, deducts, adds to inventory
- **Decorations**: Frontend deducts gold immediately, creates decoration, enters build mode for drag-to-place
- **Seeds**: Frontend deducts gold, creates plant at phase 0, enters build mode
- **Selling**: Decorations and plants can be sold for **80% of original price**
- Prices turn **red** in the UI when the player can't afford them

---

## Plant Growth System

```
Phase 0       Phase 1       Phase 2       Phase 3       Phase 4
 SEED         SPROUT        BLOSSOM       FRUIT          RIPE
  🌰            🌱            🌸            🍊            ✨🍊✨
  │              │              │              │              │
  └── hours ─────┴── hours ─────┴── hours ─────┴── hours ─────┘
      [0]            [1]            [2]            [3]            [4]
                                                                  │
                                                          ┌───────▼───────┐
                                                          │    HARVEST    │
                                                          │ random fruits │
                                                          │ (min–max)     │
                                                          └───────┬───────┘
                                                                  │
                                              ┌───────────────────┼───────────────────┐
                                              │                   │                   │
                                        harvestType =       harvestType =
                                         'single'           'repeatable'
                                              │                   │
                                        ┌─────▼─────┐      ┌─────▼─────┐
                                        │  DESTROY   │      │ Reset to  │
                                        │  plant     │      │ Phase 2   │
                                        │            │      │ (blossom) │
                                        └────────────┘      └───────────┘
```

- Growth is **time-based** (real clock), checked every 60 seconds
- `growthHours[i]` defines hours required for each phase
- Ripe plants show a **sparkle effect** (blinking yellow glow circle)
- Click a ripe plant (outside build mode) to harvest. Not-ripe shows "Not ripe yet..."
- Harvested items are added directly to inventory

---

## Decoration System

- **63 decorations** across 4 categories: Plants (11), Lamps (7), Mid Misc (15), Small Misc (30)
- All sprites from `decoration.png` sprite sheet
- **Snap to 16px grid** when placing/moving
- **Build mode**: Enter via menu → drag to place, toggle between move/sell modes
- **Lamps**: Have `isLamp: true`, `lightRadius`, and separate night sprites
  - At night: CSS `mask-image` punches transparent holes in the night overlay at lamp positions
  - Warm orange `radial-gradient` glow layers are added at lamp positions

---

## Day / Night Cycle

```
06:00 ──────────── DAY ──────────── 20:00
  │   overlay opacity = 0              │
  │   lamp sprites = off               │
  │                                    │
20:00 ──────────── NIGHT ─────────── 06:00
  │   overlay opacity = 0.65           │
  │   lamp sprites = lit               │
  │   mask holes at lamp positions     │
  │   warm glow at lamp positions      │
```

- Uses system clock (local time)
- Updated every 60 seconds via backend timer
- Night overlay: `background: #102040`, `mix-blend-mode: multiply`
- Night-only wild Pokémon species only spawn during night hours
- Wild species: Meowth (any time), Golbat (night only), Gastly (night only), Haunter (night only)

---

## Save System

### File Location
`<VS Code globalStorageUri>/save.json`

### Save Format
Pretty-printed JSON (4-space indent) containing:
```json
{
    "money": 500,
    "pets": [
        {
            "name": "Sparky",
            "specie": "Charmander",
            "color": "generation 1",
            "form": "Charmeleon",
            "sprite": "charmeleon",
            "spriteSize": 32,
            "candyFed": 12,
            "hp": 74,
            "stamina": 74,
            "friendship": 85.5
        }
    ],
    "decoration": [{ "x": 64, "y": 128, "category": "LAMPS", "name": "Lamp A" }],
    "plants": [{ "x": 32, "y": 96, "plantId": "oran_berry_plant", "phase": 3, "phaseStartTime": "..." }],
    "inventory": { "candy": 5, "oran_berry": 10 },
    "autoFeed": true,
    "streak": { "currentStreak": 7, "lastClaimDate": "2026-03-10", "longestStreak": 14, "totalRewardsClaimed": 20 },
    "telemetry": { "pokemonAdded": { "Charmander": 1 }, "candyFed": 12, "sessionsCount": 50, ... }
}
```

### Debounced Saving
```
scheduleSave() called  →  500ms timer starts
scheduleSave() again   →  timer already pending, ignored (coalesced)
                          ...
                  500ms →  fs.writeFile() async write
```

- `scheduleSave()`: Debounced 500ms coalesced writes (most operations)
- `saveGame()`: Immediate synchronous write (shutdown, import)
- `flushSave()`: Forces pending debounced save to run immediately

### Sanitization (on load)
Every field is validated with type checks, range clamping, and defaults:
- `money`: Must be number, default 0
- `pets`: Must be array, max 6 entries
- Each pet: HP/stamina initialized to max if missing, friendship initialized randomly 50–99 if missing, clamped to [0, 255]
- `inventory`: Must be object with non-negative number values
- `streak`, `telemetry`: Merged with defaults for forward-compatibility

### Import Sanitization
Import from clipboard applies even stricter validation:
- Creates fresh `Save` object
- Copies only known fields with explicit type and range checks
- Pet names capped to 20 characters
- `candyFed` clamped to 0–100
- Plant IDs validated against known `PlantTypes`

---

## Daily Streak Rewards

```
Day 1: 50G    "Welcome back!"
Day 2: 75G    "2-day streak!"
Day 3: 100G   "3-day streak!"
...
Day 7: 200G   "Keep it up! 7-day streak!"
...
Day 30: 500G  "Legendary coder! 30-day streak!"  (capped)
```

Formula: `min(500, 50 + (streakDays - 1) × 25)`

- Claimed automatically on extension activation (if not already claimed today)
- Reward notification appears after a 2-second delay
- Streak resets if you miss a day
- `longestStreak` tracks all-time best

---

## Message Protocol

### Frontend → Backend

| Message Type | Key Payload Fields | Purpose |
|---|---|---|
| `init` | — | Webview loaded, trigger game init |
| `money_delta` | `value` | Apply a relative gold change (clamped; authoritative total echoed back) |
| `spawn_wild_pokemon` | — | Request wild Pokémon species |
| `wild_pokemon_caught` | — | Wild Pokémon caught, compute reward |
| `ball_caught` | `index` | Pet at index caught ball (+0.5 friendship) |
| `pets_played` | `indexA, indexB` | Two pets played together (+1 friendship each, rate-limited) |
| `use_consumable` | `consumableId, index` | Use consumable on pet |
| `buy_consumable` | `consumableId, quantity` | Buy from shop |
| `add_decor` | `x, y, category, name, price` | Save new decoration (backend deducts price) |
| `move_decor` | `index, x, y` | Update decoration position |
| `remove_decor` | `index` | Remove decoration |
| `add_plant` | `plantId, x, y` | Save new plant (backend deducts seed price) |
| `move_plant` | `index, x, y` | Update plant position |
| `remove_plant` | `index` | Remove plant |
| `harvest_plant` | `index` | Harvest ripe plant |
| `request_pokedex` | — | Request Pokédex data |
| `request_badges` | — | Request achievements + calendar data |
| `claim_calendar_day` | `day` | Claim today's daily calendar reward |

### Backend → Frontend

| Message Type | Key Payload Fields | Purpose |
|---|---|---|
| `init` | — | Signal to unhide body |
| `reset` | — | Clear all game objects |
| `catalog` | `consumables[], plants[]` | Authoritative item prices/names (merged into webview catalogs) |
| `background` | `value` | Set background theme |
| `scale` | `value` | Set zoom level |
| `wild_pokemons` | `value` | Toggle wild spawning |
| `money` | `value, reward?` | Update gold display |
| `inventory` | `value` | Full inventory update |
| `day_night` | `timeOfDay, opacity` | Day/night tint |
| `spawn_pet` | `name, specie, color, form, sprite, spriteSize` | Create pet |
| `spawn_decor` | `x, y, category, name` | Create decoration |
| `spawn_plant` | `index, x, y, plantId, name, phase, size, spriteOffset, phaseStep` | Create plant |
| `spawn_wild_pokemon` | `specie` | Create wild Pokémon |
| `remove_pet` | `index` | Remove pet |
| `update_pet` | `index, name, specie, color, form, sprite, spriteSize` | Replace pet sprite (general) |
| `update_plant` | `index, phase` | Update plant growth |
| `destroy_plant` | `index` | Remove harvested plant (or a rejected placement) |
| `destroy_decor` | `index` | Remove a rejected decoration placement (decoration-only index) |
| `evolution` | `index, name, specie, color, form, sprite, spriteSize, newForm` | Evolution animation + swap |
| `pokedex` | `value[]` | Pokédex entries with stats |
| `badges_data` | `value{achievements[], calendar}` | Achievements/badges + daily calendar state |
| `pet_stats` | `value[]` | Updated HP/STA for all pets |
| `consumable_failed` | — | Item had no effect |
| `harvest_result` | `name, count` | Harvest notification |
| `retry_wild_spawn` | — | No eligible species, retry |

---

## Backend Modules Reference

### `extension.ts` — Main Entry Point (~940 lines)

| Function | Purpose |
|----------|---------|
| `activate(context)` | Extension lifecycle: creates services, registers commands, starts timers |
| `deactivate()` | Flushes saves, stops all timers |
| `initGame()` | Sends all initial state to webview (background, pets, decorations, plants) |
| `handleWebviewMessage(msg)` | Central message router for all 17+ message types |
| `addPetCommand()` | Multi-step quick pick: generation → species → name → create pet |
| `removePetCommand()` | Quick pick to remove a pet |
| `importSaveCommand()` | Import + strict sanitization from clipboard |
| `exportSaveCommand()` | Copy save JSON to clipboard |
| `drainStamina()` | 6-minute timer: drain stamina/HP, faint at 0 HP |
| `autoFeedPets()` | Feed low-HP pets with cheapest available food |
| `addFriendship(idx, amount)` | Increase pet friendship (clamped 0–255) |
| `buildPetStats()` | Build `[{hp, stamina, maxHp, maxStamina}]` array |
| `tickPlants()` | Check plant growth progress, advance phases |
| `sendDayNightTint()` | Send current time-of-day to webview |
| `loadPet(pet)` / `loadDecor(decor)` / `loadPlant(plant, idx)` | Send spawn messages |

### `save-manager.ts` — Persistence (~320 lines)

| Method | Purpose |
|--------|---------|
| `loadGame()` | Load + sanitize JSON (with migration from old format) |
| `saveGame()` | Synchronous immediate write |
| `scheduleSave()` | Debounced 500ms write |
| `flushSave()` | Force pending save to run now |
| `addPet(pet)` / `removePet(idx)` | Manage pet list |
| `updateMoney(amount)` | Set gold |
| `updateInventory(id, count)` | Set consumable count |
| `updatePetStats(idx, hp, sta)` | Update HP/stamina |
| `addDecor()` / `moveDecor()` / `removeDecor()` | Decoration CRUD |
| `addPlant()` / `movePlant()` / `removePlant()` / `updatePlantPhase()` | Plant CRUD |

### `evolution.ts` — Evolution Logic (~160 lines)

| Method | Purpose |
|--------|---------|
| `findSpecies(pet)` | Match pet to species data across all generations |
| `getCurrentFormIndex(pet, species)` | Find pet's current evolution stage |
| `getNextEvolution(pet)` | Return next form + candy needed |
| `feedCandy(petIndex)` | Feed candy → maybe evolve (checks item + friendship gates) |
| `useItem(petIndex, itemId)` | Use stone → scan matching forms → maybe evolve |

### `day-night.ts` — Time Calculations (~43 lines)

| Method | Purpose |
|--------|---------|
| `getTimeOfDay(date?)` | Returns `'day'` (6–20) or `'night'` (20–6) |
| `getOverlayOpacity(tod)` | Returns 0.65 for night, 0 for day |
| `pickWildPokemon(date?)` | Filter wild species by time, return random eligible |

### `streak.ts` — Daily Rewards (~95 lines)

| Method | Purpose |
|--------|---------|
| `claimDaily(today?)` | Claim reward if not already claimed today |
| `computeReward(streakDays)` | Calculate gold: `min(500, 50 + (days-1) × 25)` |

### `telemetry.ts` — Stats Tracking (~100 lines)

All tracking is local-only (stored in save file). Methods track: Pokémon added/evolved, candy fed, wild caught, decorations placed, gold earned/spent, sessions.

---

## Frontend Modules Reference

### `base.js` — Core Utilities (~410 lines)

| Class | Purpose |
|-------|---------|
| `Vec2` | 2D vector: arithmetic, rounding, equality |
| `Timer` | Frame-based countdown (uses `Game.frames`) |
| `Timeout` | setTimeout wrapper with `wait()` / `stop()` |
| `Util` | Random, clamp, moveTowards, titleCase, formatNumber |
| `Action` | Constants: NONE, CANDY, BALL, DECOR |
| `Cursor` | Custom cursor positioning and icon management |
| `Menus` | Modal menu toggle system (one menu at a time) |
| `DecorMode` | Build mode: move/sell toggle, overlay control |

### `runtime.js` — Game Engine (~654 lines)

| Class | Purpose |
|-------|---------|
| `Animation` | Sprite frame cycling with loop/flip/speed options |
| `GameObject` | Base renderable: position, size, sprite, animation, click detection |
| `Ball` | Throwable ball with bounce animation |
| `Game` | Singleton manager: canvas, game loop, object lists, money, inventory |

### `pets.js` — Pet System (~605 lines)

| Class | Purpose |
|-------|---------|
| `AI` | Base state machine: IDLE/MOVE/SPECIAL with timer-based transitions |
| `Character` | GameObject + AI integration |
| `PokemonAnimations` | Static sprite sheet layout definition (13 rows) |
| `PetMoods` | Emote sprite positions (12 moods + heart) |
| `PetAI` | Extended AI: ball catching, mood system, consumable use |
| `PokemonCharacter` | Character + species info + mood drawing |
| `Pokemon` | Concrete pet class with form and generation |

### `wild-pokemons.js` — Wild System

| Class | Purpose |
|-------|---------|
| `WildPokemonAI` | Click to catch → reward → 30s respawn |
| `WildPokemonCharacter` | Self-registers in `Game.wildPokemons` |
| `WildPokemon` | Short special animation on catch (0.4s) |

### `main.js` — Frontend Logic (~1000 lines)

| System | Purpose |
|--------|---------|
| Message handlers | Route 20+ message types to appropriate actions |
| Store/shop UI | Dynamic menu generation with sprite previews |
| Pokédex UI | Display pet sprites, HP/STA bars, levels |
| Backpack UI | Show owned consumables with counts |
| Night overlay | CSS mask-based lamp lighting system |
| Input handling | Mouse events routed by current action mode |
| Top bar | Gold display, quick-access buttons |

### `decoration/object.js` — Decoration Rendering

| Feature | Purpose |
|---------|---------|
| Grid snapping | 16px snap for all placements |
| Drag system | Click-drag with offset, sends position updates |
| Sell system | 80% refund on sell |
| Lamp handling | Night sprite swapping, mask dirty flag |

### `decoration/plant.js` — Plant Rendering

| Feature | Purpose |
|---------|---------|
| Phase sprites | `baseOffset + phase × stepOffset` |
| Sparkle effect | Blinking yellow glow when ripe |
| Harvest click | sends `harvest_plant` when ripe |
