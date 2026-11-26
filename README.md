# Pine Holler Ranger

A cryptid field-research RPG set in Pine Hollow, West Virginia ("Pine Holler" to the locals), in the Allegheny
highlands. Stardew-style homesteading meets GBC-style encounters, built with
Vite + TypeScript + HTML5 Canvas. Every sprite and sound is generated in code: there are no image or audio files.

## Run locally
```bash
npm install
npm run dev      # open the printed http://localhost:5173 URL
npm run build    # type-checks (strict) and outputs to dist/
```

## Deploy to Vercel
1. Push this repository to GitHub.
2. On vercel.com, click **Add New → Project** and import the repository.
3. Vercel reads `vercel.json` (framework `vite`, build `npm run build`, output `dist`). Leave the defaults and click **Deploy**.
No environment variables or API keys are needed.

## Saves & backups
- The game saves on the device when you sleep in the bed or use the cabin desk.
- **Cloud backup** (title screen → CLOUD BACKUP → TURN ON): every save is also uploaded to a Redis database
  attached to the Vercel project, under a recovery code like `HOLLER-ABCD-EFGH-JKLM`. On a new device or after
  deleting the app, choose RESTORE FROM CODE. No accounts; the server stores saves under a hash of the code and keeps
  the previous upload as a spare. Server code: `api/save.ts`.
- **One-time setup:** in the Vercel dashboard open the project → **Storage** → create an **Upstash for Redis**
  database (free plan) and connect it to the project, then redeploy. Check it at `https://<your-site>/api/save`:
  it should show `{"cloud":true}`.
- **EXPORT SAVE** opens the Share sheet on phones (save to Files / iCloud Drive, AirDrop, email) or downloads a file.

## Controls
| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | WASD / Arrows | D-pad (slide your thumb to change direction) |
| Use / interact / confirm (A) | Space / E / Enter | A |
| Cancel / hold to run (B) | Shift / Esc | B |
| Hotbar | 1-9 / mouse wheel | Tap a slot |
| Bag | I / B | BAG |
| Journal & Dex | Tab / J | DEX |
| Mute | M | SND |

Touch controls appear automatically on touch screens; the **PAD** button toggles them.

Handy URL flags for trying things out:
- `?wardrobe=all` unlocks every Historical Society outfit in the cabin wardrobe.
- `?dev=1` starts a **new game** with 50,000 gold, Bog Waders and every piece of Field Kit gear (handy for testing).

## Phase 1 contents
- 16-color palette, procedural sprite baker, modular player outfits and hats, particles, lighting, Web Audio SFX
- `CABIN_YARD` (64x64) and `CABIN_INTERIOR` (20x16), with 36 garden plots (12 open, 24 overgrown), all 8 lure crops, and a day/night clock
- Bed sleep saves to `localStorage`; the journal desk saves manually

## Phase 2 contents
- **Four wilderness regions**, all linked to the Cabin Yard and to each other:
  - `PINE_TRAIL_AND_ORCHARD` (80x80): clover meadows, a walled Golden Delicious apple grove, stone walls, a stream, pawpaws
  - `CRANBERRY_BOG_AND_SPRINGS` (88x80), shown as **Cranberry Glades**: wild cranberry beds (about a third of the bog) and sphagnum glade with skunk cabbage and red spruce, boardwalks, shallow water you need Bog Waders to wade, a central lake, the deep pool, the old canal, steaming Sulphur Springs
  - `OLD_GROWTH_AND_SAWMILL` (90x85): giant hemlocks, the sawmill ruins (hall, roof loft, timber yard), moonlit clearings, the Coal Mine gate (`MINE_ENTRANCE_PORTAL` stub)
  - `RADIO_RIDGE_AND_CROSSROADS` (80x85): cliff bands with switchback slopes, the radio tower summit, the High Cliffs, the four-way Crossroads
- **Shortcut briars** you clear with the Machete, plus foraging spots that respawn daily in every region
- **Weather**: clear, fog, rain, thunderstorm (snow in winter), with a forecast each morning. Rain waters the garden.
- **Lure mounts** you place in the wilds: Wooden Lure Totem, Copper Lightning Rod, Bone & Antler Chime, Tesla Coil Pylon
- **All 37 cryptids** (the 36 originals plus West Virginia's own Sheepsquatch), each with its own sprite, 2-frame idle animation and spawn rules, plus Albino and Static-Charged rare variants (1 in 32)
- **Turn-based encounters**: tall grass, reeds, ferns, shallow water and fog trigger a split-screen battle with Trust and Startle meters and a 4-slot Field Kit (Bait / Signal / Document / Stealth)
- **Cryptid-Dex** (Tab): silhouettes, 3-star mastery, behavior notes, rare-variant toggles, 74 entries in all

## Phase 3 contents
- **Pine Hollow Town** (84x72): reach it by the east road from the Cabin Yard or the south-east road from Pine Trail. It has:
  - the Town Square, with a fountain and the Bulletin Board
  - the Whistle-Stop Diner (`DINER_INT`), the General Store & Outfitter (`STORE_INT`) and the Historical Society (`MUSEUM_INT`) with its Archive Basement
  - the Broken-Down Train Station, whose rusted rail car is the `EXPANSION_RAIL_PORTAL` stub
  - a boarded-up Coal Mine adit in the north-east foothills (the `MINE_ENTRANCE_PORTAL` stub)
- **Historical Society**: donate specimens to Agnes Vance. Each donation fills one of the 37 museum display cases (36 in the wings, plus a Sheepsquatch centerpiece).
  - The 10 donation milestones unlock the 6 wearable reward outfits (each with a gameplay perk), the Archive Basement, the Gift Shop, the Folklore Festival (Sunday nights) and the Town Restoration Grant.
- **Townsfolk**: Agnes, Barnaby, Mabel, Gideon, Dr. Clara Okafor, and Pippa & Sam each follow a daily schedule and share a different cryptid rumor each day.
  - Toby and Buster join the town once you rescue them.
  - Old Ezri and Professor Pike, the Traveling Merchants, visit the Square on foggy nights and festival nights.
- **10 side quests**, including following pawprints to find Buster, boot tracks to rescue Toby, and Pippa's scattered sketch pages, all tracked in the Journal's Quest Log.
- **Economy**:
  - Porch Workbench crafting: 13 recipes, plus 6 merchant blueprints.
  - Outfitter upgrades for the Machete, Bog Waders, Lantern, Camera and Field Pack.
  - Diner food that gives a buff for the rest of the day, including Pepperoni Rolls (Long Haul: tools cost 1 energy) and Soup Beans & Cornbread.
  - A daily Bulletin Board request, and telegraph sighting reports once you fix Barnaby's telegraph.

## Phase 4: Campaign "The Signal on Radio Ridge"
- **Opening intro**: a 4-panel pixel-art story (B skips). It explains the fire-watch ad and how Ranger Elias Vance vanished. New games start on the cabin porch.
- **Vance's Field Journal**: read it at the cabin table. 9 torn pages are hidden around the valley, and the journal fills in as you find them.
- **Campaign tracker**: Tab opens the Journal, whose first page is CAMPAIGN. Objectives are checked automatically, and free-roam play is never blocked.
  - **Act I – The Fire-Watch**: read the journal, clear the garden, harvest a crop, explore Pine Trail, meet Agnes, log a cryptid.
  - **Act II – Restoring Pine Hollow**: explore the Cranberry Glades and the Old Growth, find 4 pages, reach 24 donations, attend the Folklore Festival. Then talk to Agnes.
  - **Act III – The Four Wardens**: log the Sasquatch, the Wendigo, the Thunderbird and The Awful.
  - **Act IV – The Midnight Broadcast**: use the Static Radio at the Crossroads in the Witching Hour. You tune three frequencies (the journal pages give the answers), then the epilogue plays and free play continues.
- **Post-game**: Elias Vance lives in town. At 32 donations the Town Restoration Grant repairs the station and opens the Coal Mine gate, which teases a future underground expansion.
- **Title screen**: New Game (asks before replacing a save), Continue, Export Save (downloads a JSON file), Import Save (choose a JSON file).
