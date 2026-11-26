# CLAUDE.md — Pine Holler Ranger  
  
## 1. Project Vision & Architectural Goals  
**Pine Holler Ranger** is a deep, systemic cryptid-research RPG set in **Pine Hollow, West Virginia** ("Pine Holler" to the locals), an Appalachian town in the Allegheny highlands whose high plateaus are locally called "the Barrens". Keep setting details West Virginian (coal camps, C&O railroad, the radio Quiet Zone, ramps, pepperoni rolls, buckwheat, Golden Delicious apples); cryptids may come from anywhere. It is blending **Stardew Valley** (expansive interconnected world exploration, homestead lure-farming, workbench crafting, seasonal/weather cycles, town restoration, NPC schedules & missing-person/pet side quests, tactile tool animations, and snappy sound effects) with **Game Boy Color Pokémon** (grid-based movement, strict 16-color pixel palette, tall-grass/fog encounters, turn-based split-screen pacification battles, 37-species Cryptid-Dex + Rare Variants).  
  
- **Deployment & Build Target:** Vite + TypeScript + HTML5 Canvas, deployed via GitHub -> Vercel (`npm run build` outputs to `dist/`). Zero external image, sprite, or audio files. Strict TypeScript compliance (zero unused variables/imports) so Vercel production builds succeed cleanly.  
- **Responsive Viewport:** Center the Canvas on `#0b1316` with crisp integer scaling (`imageSmoothingEnabled = false`), smooth camera follow with map-edge clamping, keyboard controls (`WASD`/Arrows, `Space`/`E` interact, `1-9` hotbar, `Tab` Dex/Journal, `M` mute), and optional touch D-pad/A/B buttons for mobile browsers.  
  
---  
  
## 2. World Scale & Map Architecture (Stardew-Scale & Larger)  
Do NOT build tiny 20x20 demo rooms. Build a **true Stardew-scale interconnected valley** where each major region is a large, richly detailed tile map (`60x60` to `90x90` tiles at `16x16` base resolution) packed with winding trails, hidden clearings, shortcut briars, water crossings, elevated ridges, interiors, and secret foraging nooks—plus clean portal architecture for future expansion zones.  
  
### Connected World Regions (`src/data/maps.ts`)  
1. **`CABIN_YARD` (64x64 tiles) & `CABIN_INTERIOR` (20x16 tiles):**  
   - Player's homestead clearing surrounded by tall pines, a creek, a shed, a Porch Workbench, a Shipping/Sell Bin, a Rain Barrel, and **36 tillable garden plots** (12 cleared at start, 24 unlockable by clearing brush/rocks).  
   - Interior features a Bed (sleep to advance day, save progress, grow watered crops), Save Journal, and **Trophy Pedestals** for displayed specimens.  
   - **Storage Crate** (36 slots) by the stove; the Porch Workbench crafts from bag + crate. A **Materials List** (Workbench LIST tab, +LIST on any recipe, Journal page) tracks have/need across bag and crate and toasts progress as materials are collected.  
2. **`PINE_HOLLOW_TOWN` (84x72 tiles) + Building Interiors:**  
   - **Whistle-Stop Diner (`DINER_INT`):** Social hub run by Mabel Miller; morning/evening NPC gatherings; Diner counter selling stamina/stealth food buffs (Buckwheat Pancakes, Pepperoni Rolls with a Long Haul tool-energy buff, Soup Beans & Cornbread, Cranberry Pie, Ghost Pepper Chili).  
   - **General Store & Outfitter (`STORE_INT`):** Sells lure seeds, film rolls, basic gear, and upgrades tools (Machete, Bog Waders, Lantern, Camera) plus carrying capacity: bags (Canvas Satchel 18 → Ranger Pack 27 → Expedition Pack 36 → Coal Miner's Frame Pack 45 slots) and pockets (Work Jeans → Cargo Pants +3 → Hunting Vest +6 → Miner's Bib Overalls +9).  
   - **Town Square & Bulletin Board:** Rotating daily bounties, lost-pet/missing-hiker notices, and host site for the seasonal **Town Folklore Festival**.  
   - **Pine Hollow Historical Society (`MUSEUM_INT`):** Run by Agnes Vance. Features 37 glass display cases (6x6 wings + a Sheepsquatch centerpiece) that visually populate as specimens are donated, a Basement Archive (unlocks at 8 donations), and a Gift Shop kiosk (unlocks at 16 donations).  
   - **Broken-Down Train Station (East Edge of Town):** Rusted tracks, overgrown platform, flickering signal lantern, and a dilapidated ticket booth run by retired stationmaster Barnaby Finch. Repairable via town questline; includes a gated rail-car portal (`EXPANSION_RAIL_PORTAL`) for future regional expansions.  
3. **`PINE_TRAIL_AND_ORCHARD` (80x80 tiles):**  
   - Winding dirt paths, stone walls, wild clover meadows, and an overgrown heirloom Golden Delicious Apple Grove connecting the Cabin Yard, Town, and Northern Woods. Features shortcut briars requiring the Brush Machete.  
4. **`CRANBERRY_BOG_AND_SPRINGS` (88x80 tiles), displayed as "Cranberry Glades":**  
   - Marshland maze of wooden boardwalks, shallow cranberry bogs (requires Bog Waders), willow islands, and steaming Sulphur Springs in the northwest corner. Modeled on WV's Cranberry Glades: about a third wild cranberry beds, the rest sphagnum glade with skunk cabbage and red spruce.  
5. **`OLD_GROWTH_AND_SAWMILL` (90x85 tiles) + `COAL_MINE_EXTERIOR`:**  
   - Towering ancient hemlocks, hollow logs, moonlit clearings, and the rotting multi-room ruins of an Abandoned Sawmill.  
   - **Abandoned Coal Mine Entrance (Northeast Foothills):** Heavy timber framing, rusted iron gate, warning signs, and slag heaps (`MINE_ENTRANCE_PORTAL` cleanly stubbed in map data for future underground dungeon expansion).  
6. **`RADIO_RIDGE_AND_CROSSROADS` (80x85 tiles):**  
   - Switchback mountain trails, steep sloped cliff tiles, a spooky four-way Crossroads, and the fenced Radio Tower summit with lightning-rod mounts.  
  
---  
  
## 3. Visual & Audio Engine (`src/graphics/` & `src/audio/`)  
- **Strict 16-Color GBC Pine-Barrens Palette:**  
  - `#0b1316` (void black), `#16262e` (deep shadow), `#1f3a3d` (pine dark), `#2d5a4c` (forest mid),  
  - `#4e8c68` (moss light), `#8ec488` (fern highlight), `#d8e8c8` (fog white), `#f4e4b8` (lantern warm),  
  - `#d99b52` (amber/wood), `#a65538` (rust/earth), `#6e3438` (cranberry dark), `#c44545` (moth-eye red),  
  - `#3b4d7a` (twilight blue), `#6b82b8` (mist blue), `#8c6d9c` (eerie violet), `#d4b4e3` (moonlight).  
- **Procedural Sprite Baker (`src/graphics/sprites.ts`):**  
  - 16x16 terrain tiles, crops (4 growth stages), items, and tools; 24x24 player, NPCs, and cryptids.  
  - **Modular Player Sprite Layers:** Base body + equippable Historical Society Outfits/Hats rendered dynamically so outfits visibly change the player character in the overworld.  
  - **Cryptid Idle Animations:** Every cryptid renders with a distinct 2-frame idle loop (bobbing, hovering, blinking, wing-flapping, or breathing).  
- **Stardew-Style Action Juice (`src/graphics/particles.ts`):**  
  - 4-direction 3-frame player walk cycle with boot dust puffs (`#d8e8c8`).  
  - 3-frame tool swing arcs (Hoe, Watering Can, Machete, Camera) with parabolic pixel particles (flying soil clods, arcing water droplets, cut leaf pixels, floating harvest pops, and screen-flash shutter effects).  
  - Smooth day/dusk/night/witching-hour lighting tint overlays + dynamic lantern light-radius cutout at night and procedural fog/rain/lightning weather particles.  
- **Procedural Web Audio SFX (`src/audio/sfx.ts`):**  
  - Pure Web Audio API chiptune synthesizer (square, triangle, filtered noise) with zero external audio files.  
  - Distinct SFX for: footsteps (grass, wood, bog squelch), hoe till, watering splash, machete chop, seed plant, harvest pop, UI blip, cryptid alert `!`, camera shutter, trust chime, and Dex registration fanfare.  
  
---  
  
## 4. Turn-Based Cryptid Encounter System (`src/engine/encounter.ts`)  
- **Trigger:** Stepping in rustling grass, fog patches, bog reeds, or interacting with overworld cryptid shadows/lure totems triggers a classic GBC horizontal-blinds wipe into a split-screen battle UI.  
- **Core Meters:**  
  - **Trust (0 -> 100%):** Reach 100% to successfully log the cryptid, earn a Specimen Drop, and unlock a 1-time Museum Specimen.  
  - **Startle (0 -> 100%):** Reach 100% and skittish cryptids bolt (while Predator cryptids force the player to retreat).  
- **4-Slot Customizable Field Kit (Player Moveset):**  
  1. **Bait / Lure:** Tosses a selected crop/bait from inventory. Massive Trust boost if it matches `favoriteBait`; increases Startle if disliked.  
  2. **Signal / Call:** E.g., *Dim Lantern*, *Mimic Call*, *Brass/Silver Bell*, *Static Radio*, *Parabolic Dish*. Counters specific cryptid stances (`AGITATED`, `CURIOUS`, `SPECTRAL`, `PRIDEFUL`, `SHY`).  
  3. **Document:** *Quick Sketch* (safe, low Trust requirement), *Flash Photo* (high Startle risk unless Trust >= 75% or *Chronos Shutter* installed, yields 3-Star Gold entry), *Plaster Cast* (collects physical evidence).  
  4. **Stealth / Stance:** *Hold Breath* (-25% Startle), *Crouch Step* (boosts capture grade; required on slopes/stealth cryptids).  
- **3-Star Dex Mastery + Rare Variants:**  
  - 1-Star (Sighting), 2-Star (Behavior/Bait observed), 3-Star (Gold Photo + Specimen).  
  - **Rare Variants (1-in-32 base odds, boosted by lures/outfits):** **Albino** (`#d8e8c8`/`#d4b4e3` palette swap) and **Static-Charged** (`#f4e4b8`/`#6b82b8` aura) variants logged separately (74 total Dex entries).  
  
---  
  
## 5. Complete 37-Cryptid Roster (`src/data/cryptids.ts`)  
  
### Tier 1: Cabin Perimeter, Meadows & Slopes (Common / Uncommon)  
1. **Jackalope** (`PINE_TRAIL`, `DAY|DUSK`, `ANY`) — Brown rabbit (`#d99b52`) with `#f4e4b8` antlers; 1px hop anim. Lure: *Wild Clover*. Skittish; spooks at early Flash Photo.  
2. **Fresno Nightcrawler** (`CABIN_YARD|PINE_TRAIL`, `NIGHT`, `CLEAR|FOG`) — Tall white armless legs (`#d8e8c8`, `#8c6d9c` fold); alternating stride anim. Lure: *Moonberry*. Mesmerized by *Dim Lantern*.  
3. **Hoop Snake** (`PINE_TRAIL`, `DAY`, `CLEAR`) — Coiled green ring (`#4e8c68`/`#2d5a4c`) biting tail; rotating rock anim. Lure: *Sweet Sap*. Aggressive stance; counter with *Hold Breath*.  
4. **Squonk** (`OLD_GROWTH`, `ANY`, `RAIN`) — Drooping tearful pig-like creature (`#a65538`) with `#6b82b8` tear drops; trembling anim. Lure: *Ramps* (item id `wild_onion`). Starts at 50% Startle; *Quick Sketch* is safe.  
5. **Albatwitch** (`PINE_TRAIL` Apple Grove, `DUSK`, `ANY`) — Tiny hunched dark ape (`#1f3a3d`) tossing a `#c44545` apple; juggling anim. Lure: *Apple / Cider*. Steals bait on missed turns; loves *Mimic Call*.  
6. **Snarly Yow** (`PINE_TRAIL|TRAIN_STATION`, `DUSK|NIGHT`, `ANY`) — Massive spectral black hound (`#0b1316`) with `#c44545` eyes and `#6b82b8` mist trail; snapping jaw anim. Lure: *Smoked Venison / Iron Nail*. Immune to Flash Photo; solidify Trust with *Hold Breath* + *Brass Bell*.  
7. **Wampus Cat** (`PINE_TRAIL|RADIO_RIDGE`, `NIGHT`, `ANY`) — Six-legged rust panther (`#a65538`/`#6e3438`) with `#f4e4b8` eyes; kneading paws + lashing tail anim. Lure: *Catnip Mint*. Dodges bait unless *Mimic Call* is used first.  
8. **Slide-Rock Bolter** (`RADIO_RIDGE`, `DAY|DUSK`, `RAIN`) — Giant slope lizard (`#2d5a4c`) with `#d99b52` tail hooks; clenching hook anim. Lure: *Mineral Salt*. Must be logged within 4 turns before sliding downhill.  
9. **Wampahoofus** (`RADIO_RIDGE`, `DAY|DUSK`, `ANY`) — Deer-boar hybrid (`#a65538`) with `#d99b52` antlers and uneven legs (short left, long right); 20° slope-tilt anim. Lure: *Wild Acorn*. *Crouch Step* gives 2x Trust on steep tiles.  
  
### Tier 2: Cranberry Bog, Waterways & Mineral Springs (Uncommon)  
10. **Loveland Frog** (`CRANBERRY_BOG`, `DUSK|NIGHT`, `RAIN`) — Upright green frog (`#4e8c68`) in `#d99b52` vest holding `#f4e4b8` wand; waving wand spark anim. Lure: *Swamp Moss*. Calmed by *Static Radio*.  
11. **Bog Polliwog** (`CRANBERRY_BOG`, `ANY`, `ANY`) — Giant cranberry-stained tadpole (`#6e3438`) with `#8ec488` gills; tail-swish + bubble anim. Lure: *Cranberry Mash*. Drops *Bog Slime*.  
12. **Skunk Ape** (`CRANBERRY_BOG`, `DUSK|NIGHT`, `ANY`) — Shaggy swamp ape (`#6e3438`/`#a65538`) with rising `#8ec488` odor pixels; heaving chest anim. Lure: *Fermented Berry Mash*. Requires *Scent Mask* to prevent odor Startle.  
13. **Altamaha-ha** (`CRANBERRY_BOG` Lake, `DAY|DUSK`, `FOG|RAIN`) — Humped river serpent (`#2d5a4c`) with `#8ec488` fins; sine-wave undulation anim. Lure: *Smoked Fish / Swamp Moss*.  
14. **Will-o'-the-Wisp** (`CRANBERRY_BOG`, `NIGHT`, `FOG|CLEAR`) — Floating violet/blue flame (`#6b82b8`/`#d4b4e3`) with `#d8e8c8` core; figure-eight flicker anim. Lure: *Wisp-Light Oil / Lantern Pulse*. Immune to physical food bait.  
15. **Chessie** (`CRANBERRY_BOG` Deep Water, `DAY`, `FOG`) — Long dark-teal serpent (`#1f3a3d`/`#3b4d7a`) with ridged neck; dipping head/coil anim. Lure: *Swamp Moss*. Surfaces every other turn; *Crouch Step* while submerged, photo when surfaced.  
16. **Bessie** (`CRANBERRY_BOG` Canal, `DAY`, `CLEAR`) — Mossy serpent (`#2d5a4c`/`#8ec488`) with `#d99b52` barbels; water-ripple anim. Lure: *Sweet Corn*. Loves *Acoustic Caller* (+35% Trust).  
17. **Pukwudgie** (`PINE_TRAIL|CRANBERRY_BOG`, `DUSK`, `ANY`) — Knee-high forest spirit (`#a65538`) with `#d8e8c8` porcupine quills; bristling quill anim. Lure: *Wild Honeycomb*. Steals 1 item unless fed honey on Turn 1.  
18. **Ozark Howler** (`RADIO_RIDGE|OLD_GROWTH`, `NIGHT`, `ANY`) — Horned bear-cat (`#16262e`) with `#d99b52` ram horns and `#8c6d9c` sonic waves; roaring anim. Lure: *Smoked Venison*. Howl raises Startle +20/turn unless countered by *Static Radio* or *Parabolic Dish*.  
19. **Ole Slippery Skin** (`CRANBERRY_BOG` Mineral Springs, `DUSK|NIGHT`, `FOG|RAIN`) — Oil-sheened black/blue bear (`#0b1316`/`#3b4d7a`) dripping `#6b82b8` water with `#f4e4b8` sulfur fumes; shimmering coat anim. Lure: *Sulfur Rotten Egg / Mineral Salt*. Requires *Scent Mask* to block sulfur Startle.  
  
### Tier 3: Old Growth & Abandoned Sawmill (Rare)  
20. **Mothman** (`OLD_GROWTH` Sawmill, `NIGHT`, `FOG|CLEAR`) — Winged black silhouette (`#0b1316`) with glowing `#c44545` eyes and `#3b4d7a` wing edges; blinking + wing-flare anim. Lure: *Ghost Pepper / High-Beam Lantern*. Spooks at loud sounds.  
21. **Jersey Devil** (`OLD_GROWTH|PINE_TRAIL`, `NIGHT`, `ANY`) — Horse-headed bat-winged creature (`#a65538`/`#6e3438`) with `#d99b52` forked tail; hovering flap anim. Lure: *Charred Wood / Smoked Venison*. Fast Startle gain.  
22. **Snallygaster** (`OLD_GROWTH` Sawmill Roof, `DUSK`, `ANY`) — Winged reptile (`#1f3a3d`) with `#d8e8c8` metal beak and `#c44545` tentacles; snapping beak anim. Lure: *Fermented Berry Mash*. Weak to *Brass Bell* / *Static Radio*.  
23. **Dover Demon** (`PINE_TRAIL|TRAIN_STATION`, `NIGHT`, `ANY`) — Spindly peach-tan biped (`#d99b52`) with oversized head and `#c44545` eyes; head-tilt anim. Lure: *Glow-Shroom*. Moving/Crouch Step lowers Trust; use *Hold Breath* + *Dim Lantern*.  
24. **Grafton Monster** (`OLD_GROWTH` Sawmill, `ANY`, `FOG`) — Broad, headless pale hulk (`#d8e8c8`/`#6b82b8`); heavy shoulder-shift stomp anim. Lure: *Mineral Salt*. Slow Startle; requires 3 turns of *Crouch Step*.  
25. **Dwayyo** (`OLD_GROWTH`, `NIGHT`, `ANY`) — Upright dark-red/black wolf biped (`#6e3438`/`#16262e`) with `#f4e4b8` fangs; sniffing + claw-flex anim. Lure: *Smoked Venison*. Spawns more often when carrying a *Moth Scale* or *Snallygaster* drop.  
26. **Hodag** (`OLD_GROWTH` Timber, `NIGHT`, `ANY`) — Spiny reptilian bulldog (`#1f3a3d`/`#4e8c68`) with `#f4e4b8` horns and `#d8e8c8` nostril steam; steam-puff anim. Lure: *Charred Wood*. Territorial; *Crouch Step* increases Startle—toss bait from afar.  
27. **Hopkinsville Goblin** (`RADIO_RIDGE|COAL_MINE`, `NIGHT`, `ANY`) — Small metallic silver-green figure (`#8ec488`/`#d8e8c8`) with huge pointed ears; hovering ear-swivel anim. Lure: *Ionized Battery Pack*. Immune to Flash Startle; *Flash Photo* actually increases Trust.  
28. **Pigman of Northfield** (`OLD_GROWTH` Sawmill, `NIGHT`, `ANY`) — Hulking biped in tattered `#1f3a3d` overalls with pale `#d8e8c8` porcine snout and `#c44545` eyes; shoulder-heave + snout-twitch anim. Lure: *Sweet Corn / Fermented Berry Mash*. Must feed bait before using *Crouch Step* or *Flash Photo*.  
  
### Tier 4: Radio Ridge, Deep Woods & Crossroads Mythics (Legendary)  
29. **Flatwoods Monster** (`RADIO_RIDGE`, `NIGHT`, `FOG`) — Armored `#2d5a4c` skirt, `#6e3438` spade cowl, `#c44545` eyes, `#d4b4e3` aura; floating pulse anim. Lure: *Ionized Battery Pack*. Requires *Thermal Lens* (or *Mothman Goggles*) to pierce mist shield.  
30. **Sasquatch (Elder)** (`OLD_GROWTH`, `DUSK`, `ANY`) — Towering 24x24 dark-umber figure (`#16262e`/`#a65538`) with `#f4e4b8` amber eyes; breathing + head-turn anim. Lure: *Wild Honeycomb + Apple*. Summoned by placing **3 Wooden Lure Totems** in Old Growth.  
31. **Thunderbird** (`RADIO_RIDGE`, `ANY`, `STORM`) — Massive `#3b4d7a`/`#16262e` wingspan with `#f4e4b8` lightning-crest feathers; crackling spark anim. Lure: *Copper Lightning Rod*. Spawns on Radio Ridge during active thunderstorms.  
32. **Indrid Cold** (`RADIO_RIDGE` Crossroads, `NIGHT` Witching Hr, `CLEAR|FOG`) — Shimmering green suit (`#2d5a4c`/`#8ec488`), `#0b1316` shadow face, wide `#d8e8c8` grin; suit-shimmer anim. Lure: *Static Radio*. Tune *Static Radio* frequencies to raise Trust.  
33. **Beast of Bray Road** (`OLD_GROWTH`, `NIGHT` Full Moon, `ANY`) — Muscular wolf-man (`#16262e`/`#3b4d7a`) with `#f4e4b8` fangs/eyes; snarl + claw anim. Lure: *Smoked Venison*. High aggression; calm with *Brimstone Incense* or *Hold Breath* + *Silver Bell*.  
34. **Wendigo** (`OLD_GROWTH`, `NIGHT` Witching Hr, `FOG|SNOW`) — Gaunt skeletal-antlered silhouette (`#16262e`) with `#d8e8c8` rib ridges, `#f4e4b8` antlers, `#c44545` eyes; frost-breath + head-snap anim. Lure: *Smoked Venison*. Summoned by placing a **Bone & Antler Chime** in Old Growth. Alternate *Hold Breath* when eyes flare red with tossing *Smoked Venison*.  
35. **The Weaver (Fresno Elder)** (`RADIO_RIDGE` Crossroads, `NIGHT` Witching Hr, `FOG`) — Towering cloaked patriarch (`#d4b4e3`/`#d8e8c8`) with `#3b4d7a` runes and trailing silk ribbons; billowing silk anim. Lure: *Lunar Dew Distillate / Moonberry*. Requires 3-Star Dex entries for *Fresno Nightcrawler* & *Will-o'-the-Wisp*.  
36. **The Awful** (`RADIO_RIDGE` High Cliffs, `DAY` Dawn | `STORM`, `ANY`) — Griffin-like beast with `#d99b52`/`#a65538` lion body, `#16262e`/`#f4e4b8` eagle head & wings, `#c44545` talons; wing-spread + crest-bristle anim. Lure: *Smoked Venison + Brass Bell*. Proud stance: cowering (*Hold Breath*) lowers Trust; stand ground with *Brass Bell* or *Parabolic Dish*.  

### No. 37: West Virginia Local  
37. **Sheepsquatch** (`CRANBERRY_BOG|OLD_GROWTH`, `DUSK|NIGHT`, `ANY`) — Bear-sized shaggy white beast (`#d8e8c8`/`#f4e4b8`) with `#d99b52` curled ram horns, `#16262e` face and `#c44545` eyes; heavy-breathing fleece + sulfur-wisp anim. Lure: *Mineral Salt / Wild Clover*. Territorial; sulfur stench needs *Scent Mask*; answers *Mimic Call*. Drop: *Sulfur-Matted Fleece*.  
  
---  
  
## 6. Lure Farming, Crafting & Economy (`src/data/items.ts`)  
  
### Lure Crops (Grown in Cabin Yard)  
- **Wild Clover** (2d, 15g) | **Catnip Mint** (3d, 25g) | **Swamp Moss** (3d, Bog soil, 30g) | **Sweet Corn** (4d, 35g) | **Glow-Shroom** (4d, 45g) | **Ghost Pepper** (5d, 55g) | **Cranberry Bush** (5d, regrows every 3d, 40g) | **Moonberry** (6d, 80g).  
  
### Standard Workbench Recipes  
- **Smoked Venison** *(Foraged Meat + Pine Resin + Mineral Salt)*  
- **Fermented Berry Mash** *(Cranberries + Wild Apple)*  
- **Sulfur Rotten Egg** *(Foraged Egg + Mineral Salt)*  
- **Ionized Battery Pack** *(Scrap Copper + Glow-Shroom + Bog Slime)*  
- **Wooden Lure Totem** *(Charred Wood + Wild Honeycomb + Wild Acorn — placeable)*  
- **Copper Lightning Rod** *(3x Scrap Copper + Iron Nail — placeable)*  
- **Bone & Antler Chime** *(Frost-Rim Antler + Silver Silk + Pine Resin — placeable)*  
- **Scent Mask** *(Catnip Mint + Swamp Moss + Charred Wood — Kit Gear)*  
- **Thermal Lens** *(Glow-Shroom + Crushed Quartz + Scrap Copper — Kit Gear)*  
- **Brass / Silver Bell** *(Scrap Copper + Silver Silk + Iron Nail — Kit Gear)*  
- **Static Radio** *(Scrap Copper + Ionized Battery Pack — Kit Gear)*  
  
### Traveling Merchant Exclusive Blueprints (Folklore Festival & Foggy Nights)  
- **Old Ezri Vance-Kerr (Apothecary):**  
  1. **Lunar Dew Distillate** *(Blueprint: 450g | Craft: 2x Moonberry + 1x Silver Silk + 1x Mineral Salt)* — Universal Favorite Lure (+45% Trust) for any Tier 3/4 cryptid + 3x Rare Variant odds for the night.  
  2. **Brimstone & Cedar Incense** *(Blueprint: 300g | Craft: 2x Pine Resin + 1x Sulfur Crust + 1x Catnip Mint)* — Cuts incoming Startle spikes from Predator/Territorial cryptids by 50% for 5 turns.  
  3. **Wisp-Light Lantern Oil** *(Blueprint: 350g | Craft: 1x Glow-Shroom + 1x Bog Slime + 1x Ghost Pepper)* — Reveals hidden encounter tiles for 1 night and prevents spectral cryptids (*Will-o'-the-Wisp, Flatwoods Monster, Indrid Cold*) from phasing out.  
- **Professor Sterling Pike (Anomaly Machinist):**  
  4. **Tesla Coil Pylon** *(Blueprint: 600g | Craft: 3x Scrap Copper + 2x Ionized Battery Pack + 1x Static Feather)* — Placeable map device; forces Static-Charged Rare Variants and draws *Thunderbird, Mothman, Hopkinsville Goblins* on clear nights.  
  5. **Parabolic Sound Dish** *(Blueprint: 750g | Craft: 2x Scrap Copper + 1x Crushed Quartz + 1x Moth Scale)* — Upgraded Kit Gear; reveals cryptid stance on Turn 1 and boosts Trust +30% on vocal cryptids (*Ozark Howler, Loveland Frog, Bessie, The Awful*).  
  6. **Chronos Shutter Mod** *(Blueprint: 900g | Craft: 1x Frost-Rim Antler + 2x Crushed Quartz + 1x Silver Silk)* — Permanent Camera upgrade; *Flash Photo* generates 0 Startle and guarantees 3-Star Gold specimen quality.  
  
---  
  
## 7. Historical Society Rewards & Town NPCs (`src/data/npcs.ts`)  
  
### Historical Society Donation Milestones (Agnes Vance)  
- **5 Donations:** **Jackalope Antler Cap** (+15% trail speed, lowers skittish meadow Startle)  
- **8 Donations:** Unlocks **Archive Basement** (survey maps revealing exact Mythic summon rules)  
- **10 Donations:** **Loveland Frog Slicker** (immune to rain/bog slowdowns; +20% water cryptid spawns)  
- **15 Donations:** **Snarly Yow Shadow Cloak** (cuts initial Night/Witching Hour Startle by 50%)  
- **16 Donations:** Unlocks **Museum Gift Shop** (sells Moonberry/Glow-Shroom seeds & Cabin Display Pedestals)  
- **20 Donations:** **Mothman Goggles** (built-in permanent Thermal Vision in fog/darkness)  
- **24 Donations:** Unlocks **Pine Hollow Folklore Festival** (night festival in Town Square; Traveling Merchants appear; Rare Variant odds surge)  
- **28 Donations:** **Wendigo Antler Mantle** (Apex Presence: Predator cryptids never force player retreat)  
- **32 Donations:** **Town Restoration Grant** (repairs Broken-Down Train Station & unseals Abandoned Coal Mine entrance)  
- **36 Donations:** **Indrid Cold’s Shimmer Suit** (2x Rare Variant spawn rate globally + 25% shop discount)  
  
### Scheduled Town NPCs & Side Quests  
1. **Agnes Vance** *(Historical Society / Diner)* — Curator; tracks specimen donations, gives *Wampahoofus* survey quest.  
2. **Barnaby "Barney" Finch** *(Broken-Down Train Station)* — Retired stationmaster; **Lost Pet Quest** to find his bloodhound *Buster* on Pine Trail, and **Telegraph Repair Quest** (*5x Scrap Copper + Ionized Battery*).  
3. **Mabel Miller** *(Whistle-Stop Diner)* — Cook; crop harvest quests (*Sweet Corn + Cranberries*), *Albatwitch* orchard investigation, sells food buffs.  
4. **Gideon Thorne** *(Outfitter / Mine Gate)* — Blacksmith & former miner; **Missing Person Quest** to rescue apprentice *Toby* in Cranberry Bog; handles tool upgrades.  
5. **Dr. Clara Okafor** *(Radio Ridge / Diner)* — Folklorist & radio host; audio/photo proof quests for *Ozark Howler* & *Indrid Cold*.  
6. **Pippa & Sam** *(Town Square / Apple Grove)* — Junior Cryptid Club kids; **Lost Sketchbook Quest** near Hoop Snake trail + *Fresno Nightcrawler* photo request.  
  
---  
  
## 8. Phased Implementation Plan for Claude Code  
Build and verify cleanly in phases so the repository always compiles with zero TypeScript errors:  
- **Phase 1:** Scaffold Vite + TypeScript project (`vercel.json` if needed, strict `tsconfig.json`). Build the 16-color sprite baker, modular player outfit renderer, particle system, Web Audio chiptune synthesizer, smooth scrolling camera, `CABIN_YARD` (64x64) + `CABIN_INTERIOR`, 36 farmable garden plots, tool swings (Hoe, Watering Can, Machete), and Day/Dusk/Night clock.  
- **Phase 2:** Build `PINE_TRAIL_AND_ORCHARD` (80x80), `CRANBERRY_BOG_AND_SPRINGS` (88x80), `OLD_GROWTH_AND_SAWMILL` (90x85), and `RADIO_RIDGE_AND_CROSSROADS` (80x85) with biome encounter tables, all 36 cryptids (with 2-frame sprites & Rare Variants), the GBC turn-based Encounter Engine, and the Cryptid-Dex UI.  
- **Phase 3:** Build `PINE_HOLLOW_TOWN` (84x72) + interiors (Diner, Outfitter, Historical Society Museum, Broken-Down Train Station, Coal Mine Gate), the 6 scheduled NPCs, Lost Pet / Missing Hiker / Bulletin Board quest tracker, Historical Society donation pedestals & wearable outfits, Workbench crafting, and Traveling Merchants.  
