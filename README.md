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
  Barney, Dr. Okafor, Pippa, Sam and Toby each have 5 hearts, loves/likes/dislikes, and rewards at 2 and 4 hearts
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
  Agnes's porch with her and Barney, and takes the white one its supper on Thursdays. At 32 donations the Town
  Restoration Grant repairs the station and opens the Coal Mine gate (a future underground expansion).
- **Title screen**: New Game (asks before replacing a save), Continue, Export Save (downloads a JSON file), Import Save (choose a JSON file).
