# Pine Barrens Ranger

A cryptid field-research RPG (Stardew-style homesteading meets GBC-style encounters) built with
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
- `?dev=1` starts a **new game** with 50,000 gold and every piece of Field Kit gear (handy for testing encounters).

## Phase 1 contents
- 16-color palette, procedural sprite baker, modular player outfits and hats, particles, lighting, Web Audio SFX
- `CABIN_YARD` (64x64) and `CABIN_INTERIOR` (20x16), with 36 garden plots (12 open, 24 overgrown), all 8 lure crops, and a day/night clock
- Bed sleep saves to `localStorage`; the journal desk saves manually

## Phase 2 contents
- **Four wilderness regions**, all linked to the Cabin Yard and to each other:
  - `PINE_TRAIL_AND_ORCHARD` (80x80): clover meadows, a walled Apple Grove, stone walls, a stream
  - `CRANBERRY_BOG_AND_SPRINGS` (88x80): boardwalks, shallow water you need Bog Waders to wade, a central lake, the deep pool, the old canal, steaming Mineral Springs
  - `OLD_GROWTH_AND_SAWMILL` (90x85): giant hemlocks, the sawmill ruins (hall, roof loft, timber yard), moonlit clearings, the Coal Mine gate (`MINE_ENTRANCE_PORTAL` stub)
  - `RADIO_RIDGE_AND_CROSSROADS` (80x85): cliff bands with switchback slopes, the radio tower summit, the High Cliffs, the four-way Crossroads
- **Shortcut briars** you clear with the Machete, plus foraging spots that respawn daily in every region
- **Weather**: clear, fog, rain, thunderstorm (snow in winter), with a forecast each morning. Rain waters the garden.
- **Lure mounts** you place in the wilds: Wooden Lure Totem, Copper Lightning Rod, Bone & Antler Chime, Tesla Coil Pylon
- **All 36 cryptids**, each with its own sprite, 2-frame idle animation and spawn rules, plus Albino and Static-Charged rare variants (1 in 32)
- **Turn-based encounters**: tall grass, reeds, ferns, shallow water and fog trigger a split-screen battle with Trust and Startle meters and a 4-slot Field Kit (Bait / Signal / Document / Stealth)
- **Cryptid-Dex** (Tab): silhouettes, 3-star mastery, behavior notes, rare-variant toggles, 72 entries in all
- Kit gear, crafted baits and mounts are sold in the Porch Workbench catalog for now; Phase 3 moves them to workbench crafting
