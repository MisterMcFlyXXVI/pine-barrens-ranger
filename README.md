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

## Storage & materials list
- **Carrying capacity**: new games start with an 18-slot Canvas Satchel. The Outfitter sells bigger bags (27/36/45)
  and pocket upgrades (Cargo Pants +3, Hunting Vest +6, Miner's Bib Overalls +9) that add together. Older saves keep
  their slots. With a full bag, forage stays where it is; encounter specimens go to the Storage Crate.
- **Storage Crate** in the cabin (by the stove): 36 slots; tap an item to move its stack between crate and bag.
  The Porch Workbench crafts from your bag first, then the crate.
- **Materials list**: at the Workbench, select a recipe and tap **+LIST** (or press DEX/Tab). The **LIST** tab shows
  have/need for every material (bag + crate), crafts when ready, and removes entries. The Journal has a read-only
  Materials List page, and the game toasts your progress as you collect materials.

## Cryptid encounters
- **You can see them coming**: cryptids appear as clues in the wilds: glowing eyes low in the brush (dusk, night, fog),
  cover shaking with something heavy inside it, ripples on still water, or a line of fresh prints. You can hear them
  too: rustles, splashes and calls. Wisp-Light Oil makes every clue glow.
- **Stalk them**: walk up and press A (RAISE CAMCORDER) for a calm start. Running nearby spooks the shy ones away (the
  Jackalope Antler Cap helps); predators and territorial cryptids charge; stepping right onto one startles it.
- **Through the camcorder**: the encounter is seen through your viewfinder: blinking REC, tape counter, battery (your
  stamina), a focus reticle that zooms in as Trust grows, pine boughs, cattails or rocks in the foreground, and rain or
  snow on the lens. The music drops to a held breath: heartbeat, crickets, wind and tape hiss, with the creature calling.
  The rules are unchanged: 4-slot Field Kit, Trust/Startle, 3-star mastery, Rare Variants, summons.

## Fishing, trapping, hunting & cooking
- **Fishing Rod** (General Store, 250g): face a creek, the bog lake or the old canal and press A. Wait for the bite,
  hook it, then reel when the marker is in the green. Creek: Brook Trout, Creek Chub. Lake/canal: Smallmouth Bass,
  Channel Catfish (dusk/night). Deep pool: rare Muskie.
- **Snare Traps** (Workbench: 3 Plant Fiber + 1 Iron Nail = 2): set on open grass/forest in the wild or your yard;
  overnight they may catch a rabbit, squirrel or (deep woods) ruffed grouse.
- **Hunting**: deer roam the Pine Trail, Old Growth and Radio Ridge, mostly at dawn/dusk and more in fall. Running
  spooks them. **Hunting Bow** (700g): quiet, 3-tile range, tighter shot, arrows often recovered (craft 5 at the
  Workbench). **Deer Rifle** (1400g): 6-tile range, easier shot, cartridges, but the gunshot scares cryptids off
  that map until tomorrow. A deer gives Raw Venison and a Deer Hide (bucks: antlers too).
- **Cabin Stove** (in addition to the Diner): Venison Stew, Fried Brook Trout, Rabbit Pot Pie, Squirrel &
  Dumplings, Catfish & Hushpuppies, Grouse & Golden Apples (new Lucky buff: 2x rare variants), Pawpaw Bread, plus
  lures: Smoked Venison (x2), Rabbit Haunch (Wampus Cat, Hodag, Dwayyo), Smoked Fish. Uses the materials list and
  Storage Crate.

## Music, map & friendships
- **Handcar stops**: every region has a small platform on a rail spur beside a trail. Each (except Town, the
  station) starts broken; repair it with materials at its HANDCAR STOP sign. Once Barney's service runs (Telegraph
  Repair quest or 2 hearts with Barney), he waits at every repaired stop: ride stop-to-stop (about an hour) and get
  dropped on the destination platform. There's no fast travel from anywhere else.
- **The old C&O spur**: a continuous, worn line runs from each stop through the region toward its rail neighbours
  (pathfound: it crosses trails, goes around buildings/gardens/cliffs, and crosses water on timber trestles that stay
  unwalkable). Until the stop is repaired, trees, tall grass and ferns sit on the line; repairing clears them so the
  rails are a walkable route. The local map draws it as a railroad symbol where explored; the valley map shows the C&O SPUR.
- **Lineside details**: crossbucks where the old line crosses a trail, "W" whistle posts before crossings and
  C&O mileposts along the track (all readable). Handcar stop signs carry a black-on-yellow locomotive.
- **Music**: procedural chiptune (no audio files) for the title, cabin, town, woods, glades, Radio Ridge, nights,
  interiors, encounters and the festival. The SND button (or M) cycles music+sound -> sound effects only -> off.
- **Pocket Map** (MAP pill / P), styled like a national-park trail brochure: REGION map with red dashed trails,
  labeled landmarks and trailheads, compass, scale bar and fog over ground you haven't explored yet (fog clears as
  you walk and is saved); VALLEY overview with fog over unexplored regions (info only: travel is by handcar, from a stop).
- **Townsfolk friendships**: chat daily and give one gift a day (talk while holding an item). Mabel, Gideon, Agnes,
  Barney, Dr. Okafor, Pippa, Sam, Toby and Ruth each have 5 hearts, loves/likes/dislikes, and rewards at 2 and 4 hearts
  (e.g. Mabel's skillet doubles stove meals, Barney's handcar, Agnes's lucky brooch, discounts). The Journal's
  Townsfolk page shows hearts and the tastes you've discovered.

## Town life & homes
- **Everyone has a home**: Agnes's cottage (Elias moves in after the campaign), Barney and Buster's house, the
  Miller-Thorne house (Mabel & Gideon), the Calloway house (Pippa), Ruth Haddix's house (Sam and his grandma Ruth,
  who keeps chickens), Toby's loft over the store and Dr. Okafor's room over the diner.
- **Visit at 4 hearts**: knock on a front door (or climb the stairs) while someone's home and awake. Until you're
  close friends you hear them through the door; once you are, you're welcomed in. Every object in a home has its
  own little story.
- **Real routines**: townsfolk walk to doors and through them (taking time to cross maps even out of sight), come
  home of an evening and climb into bed (drawn tucked in, with Zs). Windows only glow where someone is home and
  awake; closed shops go dark.
- **Weekdays & weather**: Sunday breakfast at the diner (Buster's allowed in), Barney and Gideon fish your pond on
  Sunday afternoons, the Junior Cryptid Club visits your cabin on Saturday mornings, Dr. Okafor researches at the
  museum on Mondays. Rain sends the kids to the museum, Barney to the diner and Dr. Okafor's show to her room.
- **Out and about**: Agnes lunches on a square bench, Mabel takes a 2 PM break out front, Gideon works an open-air
  anvil in the late afternoon (you can shop there), Toby hauls hinges to the museum, Ruth rocks on her porch and
  feeds the hens. Shops only open while their keeper is on duty; greetings change with what people are doing.

## Wildflowers, little life & seasons
- **Regional wildflowers** (`src/data/decor.ts`, art in `src/graphics/decorSprites.ts`) with a different look each
  season: forget-me-nots on wet banks, thistle and asters in the meadows and on the ridge, rhododendron thickets
  (WV's state flower, blooming in summer; cut with the Machete), trillium, mayapple and ramps on the woodland floor in
  spring, Indian pipe in deep shade, pitcher plants on the Glades, chicory and Queen Anne's lace along the roads.
  Placement is deterministic and never walls off ground; creek stones line the shallows.
- **Trail details**: painted blazes on trailside trees (a colour per region), trailhead boards at region entrances,
  and old Pine Hollow Coal & Coke Co. signs at the company store and the mine.
- **Lived-in town**: weathered buildings (moss on the shingles, rain streaks, cracked and patched boards, a burnt-out
  letter in the diner sign) with ivy climbing the walls, chimneys that smoke, curtains and window boxes, attic
  windows and porch lamps. At night each lit window glows on its own (a couple of museum rooms stay dark). By the
  doors: porch cats you can pet, flower pots, trash cans, a bicycle, milk cans, a clothesline and the Gazette box.
- **Town square & works**: lawns with shade trees and brick walks around the fountain, a Miners' Memorial and a
  flagpole; a gumball machine (1g) and a glowing EAT sign at the diner; a cinder yard and C&O water tower behind the
  station; a coal tipple, ore carts on a loading track and the old lamp house up by the mine. An old hound naps on a
  porch and chickens scratch around the backyards (they scatter when you walk up).
- **Homestead**: porch rocking chair (sit a spell), wind chimes that ring when you're near, a clothesline of laundry
  and a barn quilt on the shed.
- **Little life** (`src/graphics/ambient.ts`): butterflies over meadows by day, fireflies on summer evenings,
  dragonflies over water, frogs that plop off the bank as you come close, ripples, dawn mist over creeks before 8am,
  leaves drifting down in fall and puddles on trails after rain.
- **Seasons**: flowers bloom in their season; fall turns oaks, brush, willows and apple trees gold and rust with
  leaf litter on the ground; winter lays snow (deep in the open, drifts at the edges, trampled on trails) and caps
  trees, rocks, fences and roofs.

## Saves & accounts
- The game saves on the device when you sleep in the bed or use the cabin desk.
- **Quick resume**: whenever the app is switched away from or closed (and every 90s), the game snapshots exactly
  where you are. If that's newer than your last real save, the title screen offers **RESUME**; CONTINUE still loads
  the last bed/desk save. Snapshots stay on the device; bed/desk saves also go to your account.
- **Accounts** (title screen → ACCOUNT): Continue with Google, or email + password (with password reset).
  While signed in, every save also uploads to the player's account, and signing in on another device (or after
  deleting the app) brings the save back. If the device and the account disagree, the player chooses which to keep.
  The database keeps the previous upload as a spare ("Restore the previous cloud save").
- Built on **Supabase** (Auth + a `pine_holler_saves` table with Row Level Security, so each player can only read their own
  row). Client code: `src/engine/account.ts`, `src/ui/accountModal.ts`. Database setup: `supabase/schema.sql`.
- Configuration: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (the names Vercel's Supabase integration sets
  are accepted too). Only the public key is ever used; the build refuses a secret/service_role key.
  Without these, the game runs normally and ACCOUNT explains accounts aren't set up. See `.env.example`.
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
- **The story**: Elias Vance, Agnes's brother, was a C&O trackman for 34 years. His brother Danny died in the Pine Hollow No. 3
  cave-in. When the county threatened to close the town, Elias set out to prove its folklore was real. He chained an
  injured Sheepsquatch with iron traps and drove it up the ridge in a storm, the four Wardens turned him back, and he
  holed up, ashamed, in the old fire-warden cabin above the Quiet Zone.
- **Opening drive**: Barney drives you up to Pine Holler and asks why you took the job: you lost someone, your old life
  burned out, or you stopped belonging anywhere. Your answer is saved and colours your own log, the inspector scene and
  the finale.
- **Your log & Elias's journal** (cabin table): your own fire-watch log grows as the story moves; then Elias's
  half-burned journal and its 9 torn pages, hidden around the valley.
- **Porch radio**: Elias's old field radio on the cabin porch. At dusk and night it crackles: Agnes and Barney check
  on your stove at first; later a faint voice from an unknown Quiet Zone frequency (him); after the ending, Elias.
- **Campaign tracker** (Tab: CAMPAIGN page), checked automatically; free-roam play is never blocked.
  - **Act I – The Fire-Watch**: read the journal, clear the garden, harvest a crop, explore Pine Trail, meet Agnes, log a cryptid.
  - **Act II – Restoring Pine Hollow**: explore the Glades and Old Growth, find 4 pages, and grow the museum. Letters
    arrive in your mailbox the morning after each milestone: **6** (Agnes opens the Archive Basement), **12** (Barney:
    County Inspector Harlan Pruitt is at the station, 9 to 5, deciding whether Pine Hollow stays funded), **18** (Mabel,
    with a pepperoni roll; garlands go up and stalls are built in the Town Park over three days), **24** (the Folklore
    Festival is TONIGHT). Festival: bonfire, fiddles, campfire pepperoni rolls, merchants, Pruitt's verdict, and Agnes
    hands you Elias's Ridge Survey Map by the fire.
  - **Act III – The Four Wardens**: log the Sasquatch, the Wendigo, the Thunderbird and The Awful.
  - **Act IV – The Midnight Broadcast**: the Static Radio at the Crossroads in the Witching Hour. Tune the three
    frequencies from his pages; Indrid Cold carries your voice to Elias's transmitter, and you talk him home.
  - **Dawn epilogue**: you wake on the C&O platform as Elias walks out of the mist with a hand-carved Sheepsquatch for
    the museum's centerpiece and gives you the cabin for good.
- **Post-game**: Elias lives with Agnes, works at the Society, eats Sunday breakfast and sits out Sunday evenings on
  Agnes's porch with her and Barney, and takes the white one its supper on Thursdays. At 32 donations the County
  Restoration Grant matches the town: Restoration Ledger projects cost half the coins, and the old rail car is restored.

## Your ranger
- **Character creator** (`src/ui/creator.ts`, `src/data/appearance.ts`), before the drive up: your name, body
  (two builds, unlabelled), 4 skin tones, 7 hairstyles, 6 hair colours, facial hair (none, stubble, moustache, beard)
  and what you arrive in (Ranger Uniform or the new Chore Coat & Jeans; both stay in your wardrobe). The name box is a
  real text field over the canvas, so phones bring up their own keyboard. Hair that would match your skin is drawn a
  shade darker so it always reads.
- **Your name**: Barney asks it on the drive up; friends at 3+ hearts sometimes greet you by it; it comes up in heart
  scenes, Agnes's 24-specimen letter, the porch radio after the ending, the finale (Indrid Cold and Elias) and the
  epilogue. Everyone else still calls you "Ranger". Dialogue text can use `{name}`.
- **Portraits & voices**: when a townsperson talks, their face appears beside the text with a name plate, and their
  words come in their own voice (Gideon low and slow, Pippa high and quick, Indrid Cold an eerie hum).
- **The cabin mirror**: the wardrobe now offers "Look in the mirror" to change your look any time. Saves from before the
  creator open it once on load.

## Cryptid lore
- Every Dex entry has a **LORE** page (A on the detail page, or tap LORE): a field sketch, **the legend** behind it
  (unlocked at 2 stars: where and when the real-world story comes from) and **In Pine Holler** (3 stars: how it lives in
  the valley and what the townsfolk say). Donated specimens' museum cases show Agnes's placard.
- **Why they're all here**: the Quiet Zone. Everywhere else the sky is full of signal; Pine Holler is one of the last
  quiet places, so the stories come here to sleep (Dr. Okafor's theory).

## Getting started: Ranger Orientation
- Ten first-week errands teach the game and walk you around town. Barney's note starts you in the garden; then
  Gideon (buy at his counter, craft a pair of snares, set one), Mabel (eat to restore energy, ship something for coin),
  Agnes (read the Bulletin Board, raise your camcorder at a cryptid clue, donate your first specimen) and Barney (his
  old fishing rod: catch a fish). Talk to each person to take their errand on; each pays a small reward. Current
  step: Journal, QUEST LOG.
- More letters arrive between the big milestones (Clara at 3 donations, the Junior Cryptid Club at 9, Gideon at 15,
  Ruth at 21) with gifts and field tips, and there are new side quests: Ruth's Ramp Run, Gideon's Slag Heap Salvage,
  Clara's Night Show, and in Act III Agnes's Frost on the Antler and Barney's Grounding the Ridge.
- Weather never locks you out: winter brings cold rain and thundersnow, and a storm always comes within about ten
  days in any season (the Thunderbird, The Awful and rain cryptids stay reachable). Winter wilds have their own finds.

## The Deep Seam (after the ending)
A non-combat folk-horror chapter under No. 3. See `MINE_EXPANSION.md` for the full design.
- **Opens** after the dawn epilogue, once Ledger project P4 (Mine & Lamp House, with Gideon's Lamp-House Key) is
  funded. Face the Lamp House on the hill above town and press A.
- **The Mine Kit** from the Lamp House locker: carbide headlamp with a **shutter hood** (F / SHUT pill), a canary
  that goes quiet near gas, a fire-boss **Sounding Bar** (T / TAP pill: RING or HOLLOW THUD), and a Davy safety lamp
  that burns blue-green near firedamp. Refill the headlamp with Carbide Pellets + Drip-Seep Water (R, or tap the
  lamp on the mine HUD).
- **Three levels**: the Drift Mouth & Main Haulageway, the Gob Piles & Room-and-Pillar workings, and the Deep Face
  & the Foreman's Tally Chamber.
- **Twelve lost miners** of the 1914 sealed shift, still IN on the In-and-Out Board:
  - 5 **Calcified Props**: shore with a hemlock prop, then pry the tag.
  - 4 **Coal-Chewers**: shutter closed, then offer seep water, a pepperoni roll or a miner's biscuit.
  - 3 **Sealed Crosscuts**: find the hollow keystone, then wear the wet-wool respirator to reach the bucket.
- **Banking**: hang each tag on OUT in the Lamp House for a short memory of that miner. Carried tags clink and
  draw the Foreman. Pass out and you drop them where you fell.
- **The Foreman** hunts open light and loud taps. Hide in man-trip alcoves. With all 12 out, wire the four Master
  Timber Cribs and crank the blasting box at the ore-cart lift to seal the Deep Seam for good.
- **Second pass**: directional sound and your own breathing, a forward headlamp beam, coal decoys from the seams,
  crawlways the Foreman can't follow, flooded drifts, a rideable ore car, a Foreman who learns your hiding places,
  a named canary that needs feeding, a Miner's Almanac, the banking ceremony, a mine map, a difficulty setting
  (Settings: THE MINE), Memorial Night, Barney's Sunday tours and the Old Works with blind cavefish. Details in
  `MINE_EXPANSION.md` section 12.
- **Pitch torches**: craft them at the Workbench and set them down underground to light big areas for good. But
  in torchlight, things down there can see you even with your shutter closed.
- **Josef Meissgeier's ledger** (German script): Opa Walter translates it. Outfits: miner's coveralls and leather
  cap, the wet-wool respirator, the fire-boss oilskin, and Walter's restored brass lapel tag.

## The Meissgeiers & the old feast days
- A German family at the end of the east lane, in a half-timbered house with a painted barn star on the gable:
  - **Omi Liesl** (baker): bakery stall in the Town Square on Saturdays 9-1, bread at the diner weekday mornings.
    Sells Fastnacht donuts, springerle, lebkuchen and stollen.
  - **Matthias** (her grandson, a woodcarver taught by Elias): carves on his porch, helps Gideon at the forge Tue/Thu.
    He'll teach you to carve Fasnacht masks (goat, owl, bear), which go straight into your wardrobe.
  - **Opa Walter** (herbalist and hiker from the Allgaeu Alps): he worked No. 3 until the March '78 cave-in, when Danny
    Vance traded him his place at the face. He never went underground again; he climbs the mountains instead. Tuesdays
    and Fridays he picks herbs on the **High Bald** atop Radio Ridge (mountain mint, bee balm, Turk's-cap lily, and wild
    ginseng in the woods), and sells dried herbs from his porch. His check, No. 312, still hangs in the lamp house.
- Each has 5 hearts, gift tastes, rewards and three heart scenes (the barn-star recipe, the Ranger's Mask, Opa's herb
  satchel and the old Spruce Knob branch that climbs on into the high country).
- Ruth's late husband is **Earl** Haddix, who dug Walter out of the cave-in.
- New gatherings: **New Year's Pork & Sauerkraut** (Winter 1, Lucky), **St. Martin's Lantern Walk** (Fall 11, dusk,
  friendship with everyone walking), **Belsnickel Night** (Fall 26: Walter in furs; Gideon goes as Krampus, which is
  only a costume), **Fasnacht** (Winter 26: masks, donuts, burn Old Man Winter and the rest of winter turns mild) and
  the **Osterhase Egg Hunt** (Spring 20: painted eggs hidden around the orchard; bring them to the basket in the square).
- Candlelit Christmas trees stand in every home, the diner, the museum, your cabin and the square from Fall 22
  until Old Christmas.
- **Painted Barn Star** (taught by Omi Liesl): raise it in your cabin yard and Snallygaster encounters start calmer.

## A living world
- **Townsfolk notice things**: before their usual hello they'll bring up your first Mothman, a rare variant, a Warden
  at peace, a restoration they woke up to, last night's storm or fog, you wearing Elias's coat (Mabel and Agnes),
  your new gear (Gideon), or you wandering about past midnight. Each remark is said once (weather ones once a day).
- **West Virginia calendar** (Journal: CALENDAR): the **Pine Holler Ramp Feed** (Spring 14), the **Apple Butter
  Stir-Off** (Fall 6), **Buckwheat Festival Weekend** (Fall 24-25) and **Old Christmas** (Winter 6, at the gazebo once
  it's built). The whole town gathers; visit the stall to pitch in once a day (skillets, kettle, supper table, cider
  and an old story) for seasonal food with buffs, or browse its stock.
- **Birthdays** for everyone (Elias's counts once he's home), on the calendar and in the morning news. A gift on
  someone's birthday counts 2.5x and gets a special thank-you.
- **Field Photo Album** (Journal: PHOTO ALBUM): a framed viewfinder print for every 3-star Gold and every rare variant,
  stamped with season, day, time, biome and weather, with a field-note caption. X/37 Gold Prints.
- **A cabin companion**: early on, Barney and Mabel bring a basket to your porch: Buster's hound pup (sniffs out clues
  and barks toward them), a tuxedo barn cat (leaves gifts on the doormat) or a ridge raven (perches on posts and caws
  when rare odds are up). Name them; they follow you around the yard and town (the pup and raven come into the
  wilds too), wait outside doors, sleep by the stove, and enjoy a daily pet (+15 stamina).
- **Settings** (title screen, or the Journal's last page): text speed, music and sound-effect volume, screen shake.

## Heart scenes, cryptid bonds & the Restoration Ledger
- **Heart scenes** (`src/data/heartScenes.ts`, `src/engine/heartScenes.ts`): 26 short scenes, 3 or 4 per townsperson,
  each showing a piece of Elias's story from their side. One plays when you walk into its place at its time with enough
  friendship (half hearts count: 3.5 = 350 points); the townsperson steps in beside you, then goes back to their day. At
  most one a day. Their homes open for a scene even before 4 hearts, if they're home. Some give keepsakes:
  - Agnes (5): **Elias's brass radio key** (tap GOOD NIGHT to the ridge on the porch radio).
  - Barney (5): **conductor's whistle** (the handcar at any hour).
  - Gideon (4): **Lamp-House Key** (needed for Ledger P4).
  - Mabel (4): **Elias's wool coat** (wardrobe).
  - Clara (4, Radio Ridge in fog or storm): calibrates your Static Radio, which then calms every cryptid a little more.
  - Pippa (4): **binocular strap** (one more cryptid clue out at a time).
  - Toby (4): **spare handcar crank** (the handcar at any hour).
  - The kids' 2.5-heart scene is a small rescue: they sneak out to the sawmill at dusk; follow their boot prints past a
    Sheepsquatch (walk, don't run) and walk them home. The Journal's Townsfolk page (tap a name) lists each person's
    memories and, once you're close enough, where and when the next one happens. Ruth is now a friend too.
- **Homestead visits** (`src/engine/bonds.ts`): once a cryptid is mastered (3 stars), now and then it visits the cabin
  yard, at most one visitor a day:
  - **Jackalope**: clover by the garden at dawn; leaves a Lucky Clover.
  - **Albatwitch**: an apple on the porch rail at dusk; leaves Silver Silk.
  - **Mothman**: on the shed roof on foggy nights; grants **Foresight**, which names a region where Rare Variants are
    twice as likely until you sleep (also shown on the Journal's status page).
  - **Fresno Nightcrawler**: strides the garden at midnight; the crops it steps over grow a day.
  - **Loveland Frog**: on the rain barrel in the rain; waters every tilled plot.
- **Warden errands**: each Warden has an optional two-step errand (listed under Act III). Finishing one starts your
  next encounter with it at +25 Trust:
  - **Sasquatch**: dismantle Elias's three rusted traps on the Old Growth west trail.
  - **Wendigo**: listen at your Bone Chime, then offer it Smoked Venison.
  - **Thunderbird**: plant a Lightning Rod on the ridge, then ground the static with Scrap Copper.
  - **The Awful**: find Elias's smashed blind on the High Cliffs, then stand your ground there at dawn or in a storm,
    holding a Brass Bell or Parabolic Dish.
- **Town Restoration Ledger** (lectern in the Historical Society, or the Porch Workbench's LEDGER choice), funded with
  materials (bag + crate) and coins. **Timber** comes from stumps, logs and lumber piles, or the Outfitter.
  - **P1 Diner Neon** (3 Scrap Copper, 1 Glow-Shroom, 150g): the EAT sign lights from dusk; Friday Night Story Hour
    (6-9 PM): friendship at the diner counts double.
  - **P2 Station Roof & Signal Lamp** (10 Timber, 5 Iron Nails, 300g): the station is repaired and lit, the signal lamp
    burns, and the handcar runs until midnight (normally 6 AM to 9 PM). Traveling Merchants come by rail on foggy
    weekend afternoons.
  - **P3 Park Gazebo** (12 Timber, 4 Crushed Quartz, 450g): a lantern-lit gazebo on the park's west lawn. Sunday
    afternoon porch music (1-5 PM); sitting in it once a Sunday restores all your stamina.
  - **P4 Mine & Lamp House** (after the ending, with Gideon's Lamp-House Key; 5 Iron Nails, 500g): lights the lamp
    house and opens the No. 3 mine gate, and the Lamp House: the way down into the Deep Seam.
- **Title screen**: New Game (asks before replacing a save), Continue, Export Save (downloads a JSON file), Import Save (choose a JSON file).
