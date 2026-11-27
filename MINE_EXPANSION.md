# The Deep Seam — Post-Epilogue Mine Expansion

A non-combat folk-horror chapter beneath Pine Hollow No. 3. It opens only after the story is over, and it
leaves everything above ground exactly as it was: cloud saves, the four-act campaign, camcorder
encounters, heart scenes, the Restoration Ledger, the calendar, companion pets and all 37 cryptids.

Code: `src/data/mine.ts` (roster, ledger, maps), `src/engine/mine.ts` (rules, entities, overlay, HUD),
`src/graphics/mineSprites.ts` (art). Save state: `progress.mine` (optional; older saves load with a fresh one).

---

## 1. The gate

1. Finish Act IV and the dawn epilogue at the station (flag `finale`).
2. Reach 4 hearts with Gideon for the **Lamp-House Key** (heart scene "The first carving").
3. Fund **Restoration Project P4, Mine & Lamp House** on the Ledger (flag `mine_open`).

Only then does the **Lamp House** on the hill above town open (face it and press A). The boarded adit
beside it stays the surface view of the mine; the way down is the Lamp House lift. The Old Growth's
back entrance stays caved in.

## 2. What happened in 1914 (and why Walter knows)

- **The Deep Seam.** Below No. 3's working levels lies an older, deeper seam. In **March 1914**,
  company foreman **Amos Garrity** ordered the night shift to *rob the pillars* (cut out the coal pillars
  holding up the roof, for the tonnage bonus). When the roof began to "work", he blew his brass whistle
  to send the men back to the face. Then the roof came down, and the company **sealed the crosscuts with the
  men behind them** to save the haulageway. Twelve brass checks never came off the In-and-Out Board.
- **The timber-wright.** **Josef Meissgeier**, Opa Walter's uncle, was a *Zimmermann* (timber-wright)
  from the Allgäu who built No. 3's timber cribs. He refused to rob the pillars, and he wrote his warnings
  in the company ledger in old German script (Kurrent): *"Der Berg nimmt seinen Zehnten an Stille"*,
  "the mountain takes its tithe of quiet." Take more than your share and it takes the noise back: the
  whistles, the picks, the men. Josef never went underground again. His letters home are why Walter came
  to Pine Hollow in 1962.
- **Walter's own tag.** Walter worked No. 3 from 1962 until the March 1978 cave-in (Danny Vance's death).
  He hung check **312** on the board that morning and walked away: he *turned in* his tag and never went
  underground again. He took it down himself when the town reopened the Lamp House (P4). The 1978 collapse
  broke into the old sealed works. That is the hum Gideon has heard through the boards ever since.
- **The Foreman** is what is left of Garrity: a towering, slag-crusted shape dragging his tally chain,
  still counting tons, still blowing his whistle at any light or noise in his mine.

Walter translates the **Black-Edged Mine Ledger** pages you find (talk to him above ground; he reads
Kurrent). The translated pages are readable from the Journal's MINE LEDGER page.

## 3. Palette and sound

Underground, the cozy overworld gives way to a stark subterranean palette built from the same 16 GBC
colours: deep slate blacks (`#0b1316`, `#16262e`, `#3b4d7a`), **sulfur-amber** carbide glow (`#d99b52`,
`#f4e4b8`), **phosphor-green** listening radius (`#8ec488`, `#4e8c68`) and **coal-ember** reds (`#c44545`,
`#6e3438`). The screen is near-black outside your lamp.

Web Audio only (no files): dripping water, creaking timbers, distant pickaxe clinks, the Foreman's
distorted brass shift whistle, tag clinks, the canary's chirp and rattle, the Sounding Bar's ring or thud,
cave-in rumble and the blasting box crank. A sparse ambient `mine` music track (low drone, heartbeat, no melody).

## 4. The Mine Kit (replaces the Field Kit underground)

The four tools live in the **Lamp House locker**. Gearing up there is required before taking the lift
down. They show as four slots on the mine HUD.

| Slot | Tool | What it does |
|---|---|---|
| 1 | **Justrite Brass Carbide Headlamp** | Your light. Burns **carbide fuel**. Refill with 1 **Carbide Pellets** + 1 **Drip-Seep Water** (R key, or tap the lamp on the HUD). The **Shutter Hood** (F key / SHUT button) hides your beam: Coal-Chewers and the Foreman can't see you, but your sight shrinks to a close **phosphor-green listening radius** (you can still *hear* things nearby, drawn in green). Open flame in **firedamp** ignites it. |
| 2 | **Canary in a Wire Cage** | Chirps in clean air. Falls silent and rattles its bars near **chokedamp / firedamp** pockets or when the Foreman's coal-dust haze rolls in. |
| 3 | **Fire-Boss Sounding Bar** | Tap the tile you face (T key / TAP button). **RING** = solid slate. **HOLLOW THUD** = a kettle-bottom, a false (calcified) support, or the keystone of a sealed crosscut. Also used to pry brass tags loose. Taps are loud: the Foreman hears them. |
| 4 | **Davy / Wolf Safety Lamp** | A wire-gauze flame on your belt. Burns blue-green near **firedamp** and picks out the load-bearing **Calcified Props** that need shoring. |
| 5 | **Hand-Crank Blasting Box & Black Powder** | Unlocked in the locker once all 12 tags hang on OUT. Wire the 4 Master Timber Cribs, then crank it at the ore-cart lift. |

Supplies: **Carbide Pellets** (Lamp House tin, and caches below), **Drip-Seep Water** (seeps on every
level), **Fresh Hemlock Timber Props** (Lamp House timber rack, 1 Timber each, and salvage stacks below),
**Miner's Biscuits** (Lamp House cupboard; Pepperoni Rolls work too).

**Breath:** in chokedamp, or in heavy haze, your breath runs down. At zero you pass out. The **Wet-Wool
Brattice Respirator** (found on Level 2) slows it to a crawl.

## 5. The levels

All three are entered by the Lamp House lift cage. Man-trip **safety alcoves** are cut into the ribs
along the haulage lines: the Foreman walks past anyone standing in one.

1. **Level 1 — The Drift Mouth & Main Haulageway** (64×40). A long rail haulage with side headings.
   Two calcified props, two Coal-Chewers, the first chalk tallies and ledger pages.
2. **Level 2 — The Gob Piles & Room-and-Pillar Workings** (64×48). A grid of coal pillars and waste-rock
   gob. Two calcified props (where the pillars were robbed), two Coal-Chewers, Anselm Kessler's sealed
   crosscut, a firedamp room and the first-aid station with the respirator.
3. **Level 3 — The Deep Face & Foreman's Tally Chamber** (60×44). Winding deep-face tunnels round the
   Foreman's chamber and its **4 Master Timber Cribs**. One calcified prop, two sealed crosscuts and the
   C&O ore-cart lift. The Foreman patrols here, and follows the clink of carried tags up to Level 2.

## 6. The In-and-Out Board: the twelve lost miners of 1914

| # | Check | Name | Age | Job | Puzzle | Level |
|---|---|---|---|---|---|---|
| 1 | 14 | Ezra Pettit | 41 | timberman | Calcified Prop | 1 |
| 2 | 27 | Giuseppe "Joe" Rinaldi | 33 | coal loader (from Calabria) | Calcified Prop | 1 |
| 3 | 31 | Moses Turner | 38 | coal loader (from Alabama) | Calcified Prop | 2 |
| 4 | 45 | Lajos Horváth | 29 | shot-firer (from Hungary) | Calcified Prop | 2 |
| 5 | 52 | Harlan Bledsoe | 52 | track layer | Calcified Prop | 3 |
| 6 | 63 | Dewey Calloway | 17 | brakeman | Coal-Chewer | 1 |
| 7 | 71 | Owen Pritchard | 46 | motorman (from Wales) | Coal-Chewer | 1 |
| 8 | 78 | Tomasz Woźniak | 24 | mule driver (from Poland) | Coal-Chewer | 2 |
| 9 | 84 | Silas Haddix | 35 | pumpman | Coal-Chewer | 2 |
| 10 | 90 | Anselm Kessler | 19 | Josef Meissgeier's timber apprentice | Sealed Crosscut | 2 |
| 11 | 97 | Clement Vance | 44 | fire boss (Agnes and Elias's great-uncle) | Sealed Crosscut | 3 |
| 12 | 103 | Benjy Lusk | 11 | trapper boy | Sealed Crosscut | 3 |

Dewey is Pippa's great-great-uncle; Silas was Earl Haddix's grandfather (Ruth's family).

### The three rescue puzzles (none of them is combat)

- **Calcified Props (5).** Miners turned to petrified anthracite, still holding up a sagging roof. The
  Safety Lamp shows they're load-bearing, and the Sounding Bar thuds hollow on them. Wedge a **Fresh
  Hemlock Timber Prop** on a floor tile beside one (select it and press A), *then* pry the brass tag loose.
  The man crumbles to dust and the hemlock takes the roof. Pry without shoring and the roof comes in:
  you pass out.
- **Wandering Coal-Chewers (4).** Ember-throated husks walking the dark rail lines, chewing coal. Open
  carbide light draws them, and if one reaches you, you pass out. Approach with the **shutter closed**,
  then hold **Drip-Seep Water**, a **Pepperoni Roll** or a **Miner's Biscuit** and press A. The coal-hunger
  breaks, and they hand you their tag and go quiet.
- **Sealed Crosscut Spirits (3).** A rubble wall where the company bricked the men in. Tap along it with
  the Sounding Bar: every stone rings except one, the **keystone**, which thuds hollow. Pry it and the wall
  falls. Behind it is trapped **chokedamp**, a faint figure and a dented tin dinner bucket. Wear the
  **Wet-Wool Brattice Respirator** to reach the bucket and take the tag from it.

### Carry-back tension and the surface ritual

- Unbanked tags **clink** as you walk. The Foreman hears them: he comes up to Level 2 while you carry any.
- **Passing out** (gas, a cave-in, a Chewer or the Foreman) puts you back on the Lamp House bench with
  half your stamina. Any tags you were carrying are **dropped where you fell**, glinting. Go back for them.
- At the **In-and-Out Board**, hang each tag on the **OUT** peg. A short, peaceful memory of that miner
  plays, and he's gone from the shaft for good. Every 3 tags banked, the **Foreman's coal-dust haze**
  weakens (4 → 3 → 2 → 1 → none).

## 7. The Foreman and the finale

- **The Foreman** patrols Level 3 (and Level 2 while you carry tags). Open carbide glare in his line of
  sight, or a Sounding Bar strike within earshot, sets off his distorted whistle and he comes for you. Break
  line of sight, close your shutter, or step into a **man-trip safety alcove** or a darkened crosscut and
  he loses you.
- **Finale.** With all 12 tags on OUT, the **Hand-Crank Blasting Box** and 4 **Black Powder** charges
  appear in the locker. Go down to the Tally Chamber, wire the **4 Master Timber Cribs** (A on each) while
  he hunts you, then reach the **C&O ore-cart lift** and crank the box. The cribs go, the Deep Seam falls in
  on itself and the Foreman with it, and you ride the ore cart up through the dust. Level 3 is sealed for
  good (flag `seam_sealed`). Levels 1 and 2 stay open, quiet now.

## 8. Lore pickups

- **Chalk Tally Marks** on the coal ribs (each crew's count of their last shift, getting shakier).
- **Dented dinner buckets**: what each man packed.
- **Ledger pages** (9, German script): Josef's warnings, the tonnage tallies, Garrity's orders and the
  last entry. They're collected in the **Black-Edged Mine Ledger**. Walter translates them above ground,
  and they then read in plain English in the Journal.

## 9. Outfits (wear them underground or in town)

| Outfit | How | Effect |
|---|---|---|
| **Canvas Miner's Coveralls** + **Hard-Boiled Leather Cap** | Lamp House locker, first visit | The look. |
| **Wet-Wool Brattice Respirator & Goggles** (hat) | Level 2 first-aid station | Breath lasts much longer in gas and haze; needed for the crosscut buckets. |
| **Fire-Boss Heavy Oilskin Slicker** | Bank 6 tags | Seep drips don't chill you; slower stamina loss underground. |
| **Walter's Restored Brass Lapel Tag** | From Walter after the seam is sealed | Calm breathing: slow stamina regen while worn anywhere. Walter, Gideon, Ruth and Elias notice it. |

## 10. Controls

| Action | Keyboard | Touch |
|---|---|---|
| Shutter hood | F | **SHUT** pill (shown underground) |
| Sounding Bar tap | T | **TAP** pill (shown underground) |
| Refill headlamp | R | tap the lamp slot on the mine HUD |
| Interact / place prop / offer food | Space / E | A |

## 11. Continuity notes

- The 1914 sealed shift is older than the Miners' Memorial (1927) and the 1978 cave-in. Danny Vance
  died in 1978 and is **not** one of the twelve.
- The P4 reopening scene (Walter taking check 312 down) is unchanged. The 1914 board is the older board
  found behind its panel.
- Above ground nothing new spawns, and no cryptid, encounter or campaign rule changes.
