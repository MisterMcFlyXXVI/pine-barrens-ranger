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
Add `?wardrobe=all` to the URL to preview the locked Historical Society outfits in the cabin wardrobe.

## Phase 1 contents
- 16-color palette, procedural sprite baker, modular player outfits and hats, particles, lighting, Web Audio SFX
- `CABIN_YARD` (64x64) and `CABIN_INTERIOR` (20x16), with 36 garden plots (12 open, 24 overgrown), all 8 lure crops, and a day/night clock
- Bed sleep saves to `localStorage`; the journal desk saves manually
