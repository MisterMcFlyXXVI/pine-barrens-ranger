/**
 * Game orchestrator: owns world state, runs the update loop, resolves tool
 * use / interaction, and drives the sleep → grow → ship → save day cycle.
 */
import { oriTick } from './orientation';
import { recordPrints, goldCount, backfillAlbum } from './album';
import { markMilestone } from './barks';
import { morningNews, eveningEventToday, eventNow, eventStallAt, winterBeaten, eventOn } from './calendar';
import { Companion, petPet, petOvernight, adoptionTick , petHouseInteract } from './pet';
import { NamePrompt } from '../ui/namePrompt';
import { onSettings, settings, adoptSaveSettings } from './settings';
import { LORE } from '../data/lore';
import { DEFAULT_LOOK, bodyFor, setPlayerName, nameOrRanger } from '../data/appearance';
import type { Appearance } from '../data/appearance';
import { setPlayerBody } from '../graphics/playerSprite';
import { CharacterCreator } from '../ui/creator';
import { Input } from '../input/input';
import { Camera } from '../graphics/camera';
import { Particles } from '../graphics/particles';
import { Lighting } from '../graphics/lighting';
import { ICON, MISC } from '../graphics/sprites';
import type { Look } from '../graphics/playerSprite';
import { sfx, Surface } from '../audio/sfx';
import { Clock, DAY_START } from './clock';
import { Inventory, Stack, HOTBAR_SIZE } from './inventory';
import { MapRuntime } from './world';
import { Player, TOOL_DURATION } from './player';
import { SaveData, Stats, clearResume, writeSave, writeResume, SAVE_VERSION, MapSave } from './save';
import { accountEmail, uploadSave } from './account';
import { BUILT_MAPS, BED_SPAWN, MapId, MAP_NAMES } from '../data/maps';
import { O, T, objProps, Interact, SLOW_GROUND, WADE_GROUND, COVER_OBJECTS, MOUNT_OBJECT } from '../data/tiles';
import { CROP_BY_ID, ITEMS, STARTING_ITEMS, ToolKind } from '../data/items';
import { CRYPTID_BY_ID, CryptidDef, Variant } from '../data/cryptids';
import { DayWeather, rollWeather, weatherAt, moonPhase, timeTags, Weather, WEATHER_LABEL } from '../data/weather';
import { Dex, Kit, newDex, loadDex, defaultKit } from './dex';
import { rollVariant, eligible, SpawnCtx } from './spawn';
import { Sightings } from './sightings';
import type { Approach } from './sightings';
import { Encounter } from './encounter';
import { music, TrackId } from '../audio/music';
import { StoryPanels } from '../ui/intro';
import { DriveIntro } from '../ui/driveIntro';
import { DexMenu } from '../ui/dex';
import { WeatherFx } from '../graphics/weatherFx';
import { Progress } from './progress';
import { Townsfolk, NpcRT } from './townsfolk';
import { talkTo } from './talk';
import { HOMES, isHome } from '../data/homes';
import { FESTIVAL_SPOTS, FESTIVAL_STALLS } from '../data/town';
import type { HomeId } from '../data/homes';
import { hearts } from './friends';
import { CraftMenu, BoardMenu, PedestalMenu, ShopMenu } from '../ui/shops';
import { GIFT_STOCK, MILESTONES, Recipe, ToolLine, UPGRADES } from '../data/economy';
import { QUESTS } from '../data/quests';
import { CRYPTIDS } from '../data/cryptids';
import { hash2, touchOn } from '../util';
import { campaignTick, setAct } from './campaign';
import { heartTick, sceneWaitingIn, rescueOvernight } from './heartScenes';
import { openLedger, gazeboRest, applyRestoration, handcarClosed, porchMusic, funded, friendMult } from './restoration';
import { bondsTick, visitorAt, dismantleTrap, wardenMount, wardenUse, awfulTick, foresightMult } from './bonds';
import { playIntro, playEpilogue } from '../ui/intro';
import { VanceJournal } from '../ui/vanceJournal';
import { FinaleScene } from '../ui/finale';
import { JOURNAL_PAGES, MINE_TEASE, LETTERS, RADIO_EARLY, RADIO_STATIC, RADIO_ELIAS, RADIO_HOME } from '../data/campaign';
import { OUTFITS, HATS } from '../data/outfits';
import type { Dir } from '../util';
import { DIR_VEC, randInt } from '../util';
import type { Overlay } from '../ui/overlay';
import { Dialog, BagMenu, DresserMenu, JournalMenu, SleepSummary } from '../ui/menus';
import { TitleScreen } from '../ui/title';
import { StorageMenu } from '../ui/storage';
import { WorldMap, handcarUnlocked } from '../ui/worldmap';
import { LINE_CLEARABLE, REPAIRS, STOPS, stopFlag } from '../data/handcar';
import { craftedNeed, haveCount, Need, needsWatch } from './materials';
import { renderWorld } from './render';
import { placeDeco, decoInteract, canPlaceDeco, homesteadOvernight, homesteadTick, fireSmoke, decoItemFor, recordTrack } from './homestead';
import { WALL_DECOS, DECO_BY_OBJ } from '../data/homestead';
import { mineTick, mineArrive, mineInteract, placeHemlock, placeTorch, mineBusy, crawlBlocked, mineStep, throwCoal, mineEmptyA, banked } from './mine';
import { MineMap } from '../ui/mineMap';
import { isDeepSeam, isMineMap, MINE_LEVELS, MINERS } from '../data/mine';

/** Rooms rebuilt to a new size since older saves (saves without a recorded size). */
const RESIZED_MAPS: ReadonlySet<MapId> = new Set<MapId>(['CABIN_INTERIOR', 'LAMP_HOUSE']);
import { drawHud, hotbarHit } from '../ui/hud';
import { checkSnares, waterAt, WEAPONS } from './outdoors';
import { Wildlife } from './wildlife';
import { AimGame, FishingGame } from '../ui/outdoors';

const MAX_STAMINA = 100;
const MAX_WATER = 20;
const START_GOLD = 500;

interface Toast {
  text: string;
  t: number;
}

const freshStats = (): Stats => ({ harvested: 0, shippedGold: 0, tilled: 0, cleared: 0, foraged: 0, daysPlayed: 0 });

export class Game {
  w = 240;
  h = 160;
  readonly input = new Input();
  readonly cam = new Camera();
  readonly particles = new Particles();
  readonly lighting = new Lighting();
  clock = new Clock();
  inv = new Inventory();
  /** Cabin Storage Crate (the workbench can craft from it). */
  storage = Game.newStorage();
  /** The Root Cellar out in the yard (18 slots). */
  cellar = Game.newCellar();
  /** Materials list: recipes the player wants to craft. */
  needs: Need[] = [];
  /** Deer roaming the current map (hunting). */
  wildlife = new Wildlife();
  /** A rifle shot scares cryptids off a map for the rest of that day. */
  private gunshots = new Map<MapId, number>();

  static newStorage(): Inventory { const s = new Inventory(); s.resize(36); return s; }
  static newCellar(): Inventory { const s = new Inventory(); s.resize(18); return s; }
  gold = START_GOLD;
  stamina = MAX_STAMINA;
  readonly maxStamina = MAX_STAMINA;
  water = MAX_WATER;
  readonly maxWater = MAX_WATER;
  sel = 0;
  look: Look = { outfit: 'ranger_jacket', hat: 'ranger_cap' };
  /** Name, body, skin, hair, facial hair (character creator). */
  appearance: Appearance = { ...DEFAULT_LOOK };
  wardrobe = new Set<string>();
  readonly maps = new Map<MapId, MapRuntime>();
  cur!: MapRuntime;
  readonly player = new Player();
  overlays: Overlay[] = [];
  mode: 'title' | 'play' = 'title';
  time = 0;
  shipped: Stack[] = [];
  stats: Stats = freshStats();
  mailRead = 0;
  toasts: Toast[] = [];
  banner = { text: '', t: 0 };
  selFlash = 0;
  prompt = '';
  private fade = 0;
  private fadeDir = 0;
  private fadeCb: (() => void) | null = null;
  private msgCd = 0;
  private ambientT = 2;
  private smokeT = 0;
  private lowStaminaWarned = false;
  private title = new TitleScreen();
  /** An account sign-in replaced the device save: refresh the title screen's summary. */
  reloadTitleSave(): void { this.title.reload(); }
  // ---- Phase 2: weather, Dex, Field Kit, encounters ----
  dayWeather: DayWeather = { morning: 'CLEAR', evening: 'CLEAR' };
  dex: Dex = newDex();
  kit: Kit = defaultKit();
  /** Day numbers on which Wisp-Light Oil / Lunar Dew were used (effects last that night). */
  wispNight = 0;
  lunarNight = 0;
  /** Mythic summons already answered today ("MAP:cryptid"). */
  summoned = new Set<string>();
  readonly weatherFx = new WeatherFx();
  /** Cryptids out in the wilds as visible clues (eyes, rustling, ripples, tracks). */
  readonly sightings = new Sightings();
  private rainT = 0;
  // ---- Phase 3: town progression & townsfolk ----
  progress = new Progress();
  readonly townsfolk = new Townsfolk();
  /** game.time when the current map was entered (folk already here vs. walking in). */
  enteredAt = 0;
  /** Your cabin companion (pup, cat or raven). */
  readonly companion = new Companion();
  private talks = new Map<string, number>();
  /** The porch radio has crackled to let you know someone's calling (once a night). */
  private radioHintDay = 0;
  private campaignT = 1;
  private pageSpots: Map<string, Array<{ id: number; x: number; y: number }>> | null = null;

  constructor(readonly canvas: HTMLCanvasElement, readonly g: CanvasRenderingContext2D) {
    // Volumes follow Settings (sliders on the title screen and in the Journal).
    onSettings((st) => sfx.setVolumes(st.music, st.sfx));
  }

  /* ------------------------------------------------------------ */
  /* Setup                                                         */
  /* ------------------------------------------------------------ */

  getMap(id: MapId): MapRuntime {
    let m = this.maps.get(id);
    if (!m) { m = new MapRuntime(id); m.spawnForage(this.clock.day, this.forageBoosts()); this.maps.set(id, m); if (this.stopRepaired(id)) this.clearLine(m); }
    return m;
  }

  private starterWardrobe(): Set<string> {
    const all = new URLSearchParams(location.search).get('wardrobe') === 'all';
    const s = new Set<string>();
    for (const o of OUTFITS) if (o.starter || all) s.add(o.id);
    for (const h of HATS) if (h.starter || all) s.add(h.id);
    return s;
  }

  newGame(): void {
    this.clock = new Clock();
    this.inv = new Inventory();
    for (const [id, n] of STARTING_ITEMS) this.inv.add(id, n);
    this.storage = Game.newStorage();
    this.cellar = Game.newCellar();
    this.needs = [];
    needsWatch.clear();
    this.gold = START_GOLD;
    this.stamina = MAX_STAMINA;
    this.water = MAX_WATER;
    this.sel = 0;
    this.look = { outfit: 'ranger_jacket', hat: 'ranger_cap' };
    this.setAppearance(DEFAULT_LOOK);
    this.wardrobe = this.starterWardrobe();
    this.maps.clear();
    this.shipped = [];
    this.stats = freshStats();
    this.mailRead = 0;
    this.dex = newDex();
    this.kit = defaultKit();
    this.wispNight = 0;
    this.lunarNight = 0;
    this.progress = new Progress();
    this.progress.flags.add('carry2');
    this.talks.clear();
    this.summoned.clear();
    this.rollDayWeather();
    if (new URLSearchParams(location.search).get('dev') === '1') {
      this.gold = 50000;
      for (const it of Object.values(ITEMS)) if (it.kind === 'gear') this.inv.add(it.id, 1);
      this.progress.tools.waders = 1;
      this.progress.tools.pack = UPGRADES.pack.length - 1;
      this.inv.resize(this.bagCapacity());
      for (const it of Object.values(ITEMS)) if (it.kind === 'gear' && !this.inv.count(it.id)) this.inv.add(it.id, 1);
    }
    // Start on the cabin porch (Act I), after the Firewatch-style intro.
    this.enterMap('CABIN_YARD', 29, 19, 'down');
    this.banner.t = 0;
    this.mode = 'play';
    this.overlays = [];
    this.openOverlay(new CharacterCreator(this, 'new', () => playIntro(this, () => {
      this.openOverlay(new Dialog([
        'The cabin porch creaks under your boots. Somewhere out in the pines, something answers the creak.',
        `Ranger Vance's half-burned Field Journal waits on the table inside. Clear the garden, grow lure crops, and sleep in the bed to end each day and save. ` + (touchOn() ? 'Tap DEX twice' : 'Press Tab twice') + ' to open your Campaign journal.',
        'Tucked in the door frame, a note in careful block capitals: "RANGER. GARDEN FIRST: TILL WITH THE HOE, PLANT A SEED, WATER IT. THEN GO SEE GIDEON AT THE STORE IN TOWN. HE\'LL SET YOU UP. -B. FINCH" (Your Orientation errands are in the Journal\'s QUEST LOG.)',
      ]));
      setAct(this, 1);
    })));
  }

  loadGame(d: SaveData): void {
    this.lastSaveKey = null;
    this.clock = new Clock();
    this.clock.day = d.day;
    this.clock.minutes = d.minutes;
    this.inv = new Inventory();
    this.inv.resize(Math.min(54, d.inv.length));
    d.inv.forEach((s, i) => { if (i < this.inv.slots.length && s && ITEMS[s.id]) this.inv.slots[i] = { id: s.id, n: s.n }; });
    this.storage = Game.newStorage();
    this.cellar = Game.newCellar();
    (d.storage ?? []).forEach((s, i) => { if (i < this.storage.slots.length && s && ITEMS[s.id]) this.storage.slots[i] = { id: s.id, n: s.n }; });
    (d.cellar ?? []).forEach((s, i) => { if (i < this.cellar.slots.length && s && ITEMS[s.id]) this.cellar.slots[i] = { id: s.id, n: s.n }; });
    this.needs = (d.needs ?? []).filter((n) => n && typeof n.recipe === 'string' && n.qty > 0).map((n) => ({ recipe: n.recipe, qty: n.qty }));
    needsWatch.clear();
    this.gold = d.gold;
    this.stamina = d.stamina;
    this.water = d.water;
    this.sel = Math.min(HOTBAR_SIZE - 1, Math.max(0, d.sel));
    this.look = { ...d.look };
    this.setAppearance(d.appearance ?? DEFAULT_LOOK);
    adoptSaveSettings(d.settings);
    this.wardrobe = new Set([...this.starterWardrobe(), ...d.wardrobe]);
    this.maps.clear();
    const rebuilt: MapId[] = [];
    for (const [id, ms] of Object.entries(d.maps) as Array<[MapId, MapSave]>) {
      if (!BUILT_MAPS.has(id)) continue;
      const m = this.getMap(id);
      // A room rebuilt to a new size since this save: its tile indices no longer line up, so start it fresh.
      if (ms.w !== undefined ? ms.w !== m.w || ms.h !== m.h : RESIZED_MAPS.has(id)) { rebuilt.push(id); this.refundRoom(ms); continue; }
      m.applyRemoved(ms.removed);
      ms.plots.forEach((p, i) => { if (m.plots[i]) Object.assign(m.plots[i], p); });
      for (const [i, hp] of ms.hp) m.hp.set(i, hp);
      for (const [i, o] of ms.placed ?? []) m.placeObject(i, o);
      for (const [i, c] of ms.snares ?? []) if (m.objects[i] === O.SNARE) m.snares.set(i, c && ITEMS[c] ? c : '');
      if (ms.seen) m.seenFromString(ms.seen); else m.revealTrails();
      m.forage.clear();
      for (const [i, item] of ms.forage) if (ITEMS[item]) m.forage.set(i, item);
    }
    this.getMap('CABIN_YARD');
    this.shipped = d.shipped ?? [];
    this.stats = { ...freshStats(), ...d.stats };
    this.mailRead = d.mailRead ?? 0;
    this.dex = loadDex(d.dex);
    this.kit = { ...defaultKit(), ...d.kit };
    this.wispNight = d.wispNight ?? 0;
    this.lunarNight = d.lunarNight ?? 0;
    this.progress = Progress.load(d.progress);
    // Specimens on display in a rebuilt room go back to the Storage Crate.
    for (const id of rebuilt) for (const [k, item] of Object.entries(this.progress.displays)) {
      if (!k.startsWith(`${id}:`)) continue;
      delete this.progress.displays[k];
      if (ITEMS[item]) this.storage.add(item, 1);
    }
    if (rebuilt.includes('CABIN_INTERIOR')) this.afterOverlays(() => this.toast('The cabin got a cozier layout. Your trophies and display pedestals are in the Storage Crate.'));
    // Regions were rebuilt before progress loaded: clear the lines of repaired stops now.
    for (const m of this.maps.values()) if (this.stopRepaired(m.id)) this.clearLine(m);
    if (this.inv.count('bog_waders') > 0 && this.progress.tools.waders === 0) this.progress.tools.waders = 1;
    // Saves from before carrying capacity: the old 27/36/45 packs map onto the new tiers, so nobody loses slots.
    if (!this.progress.flags.has('carry2')) {
      this.progress.tools.pack = Math.min(UPGRADES.pack.length - 1, this.progress.tools.pack + 1);
      this.progress.flags.add('carry2');
    }
    this.inv.resize(this.bagCapacity());
    // The Grant used to repair the station: keep it repaired for those saves (now a Ledger project).
    if (this.progress.has('grant')) this.progress.flags.add('proj_station');
    applyRestoration(this);
    backfillAlbum(this);
    // Saves already past Act I skip the orientation errands.
    if (this.progress.act >= 2) this.progress.flags.add('ori_done');
    // Story letters for milestones reached before letters existed: past Act II they're filed away, otherwise delivered now.
    for (const l of LETTERS) {
      if (this.progress.donations < l.donations || l.id in this.progress.mail) continue;
      this.progress.mail[l.id] = this.progress.act >= 3 ? 0 : this.clock.day;
      if (this.progress.act >= 3) this.progress.flags.add(`read_${l.id}`);
      if (l.id === 'barney12' && this.progress.act >= 3) this.progress.flags.add('inspector_done');
    }
    this.summoned.clear();
    this.rollDayWeather();
    const map = BUILT_MAPS.has(d.map) ? d.map : BED_SPAWN.map;
    this.enterMap(map, d.px, d.py, d.dir);
    this.mode = 'play';
    this.overlays = [];
    this.toast('Field journal loaded.');
    // Saves from before the character creator: introduce yourself once.
    if (!d.appearance) this.openOverlay(new CharacterCreator(this, 'returning', () => this.toast(`Welcome back, ${nameOrRanger()}.`)));
  }

  toSave(): SaveData {
    const maps: Partial<Record<MapId, MapSave>> = {};
    for (const [id, m] of this.maps) {
      maps[id] = {
        removed: [...m.removed],
        forage: [...m.forage.entries()],
        plots: m.plots.map((p) => ({ ...p })),
        hp: [...m.hp.entries()],
        placed: [...m.placed.entries()],
        snares: [...m.snares.entries()],
        seen: m.seenToString(),
        w: m.w, h: m.h,
      };
    }
    return {
      v: SAVE_VERSION,
      day: this.clock.day,
      minutes: this.clock.minutes,
      gold: this.gold,
      stamina: this.stamina,
      water: this.water,
      inv: this.inv.slots.map((s) => (s ? { ...s } : null)),
      storage: this.storage.slots.map((s) => (s ? { ...s } : null)),
      cellar: this.cellar.slots.map((s) => (s ? { ...s } : null)),
      needs: this.needs.map((n) => ({ ...n })),
      sel: this.sel,
      look: { ...this.look },
      appearance: { ...this.appearance },
      settings: { ...settings() },
      wardrobe: [...this.wardrobe],
      map: this.cur.id,
      px: this.player.tx,
      py: this.player.ty,
      dir: this.player.dir,
      maps,
      shipped: this.shipped.map((s) => ({ ...s })),
      stats: { ...this.stats },
      mailRead: this.mailRead,
      progress: this.progress.toSave(),
      dex: this.dex,
      kit: { ...this.kit },
      wispNight: this.wispNight,
      lunarNight: this.lunarNight,
    };
  }

  saveGame(): boolean {
    const save = this.toSave();
    const ok = writeSave(save);
    if (ok) this.lastSaveKey = Game.saveKey(save);
    if (ok && accountEmail()) {
      // Off-device copy to the player's account. Runs in the background; the device save already succeeded.
      void uploadSave().then((r) => this.toast(r.ok ? 'Saved to your account.' : 'Cloud save failed. It will retry at your next save.'));
    }
    return ok;
  }

  /**
   * Why you can't go into someone's home right now (null = come on in): nobody's
   * home, they're asleep, or you're not close enough friends yet (4 hearts).
   */
  homeClosed(id: HomeId): string[] | null {
    const h = HOMES[id];
    // Someone has something to show you here: they leave the door open.
    if (sceneWaitingIn(this, id)) return null;
    const inside = this.townsfolk.on(id);
    if (!inside.length) return [id === 'STORE_LOFT' || id === 'DINER_ROOM' ? 'The door at the top of the stairs is shut. Nobody\'s up there.' : 'You knock. Nobody\'s home.'];
    if (inside.every((n) => n.inBed)) return ['The lights are out. Everybody inside is fast asleep.'];
    if (h.friends.some((f) => hearts(this, f) >= 4)) return null;
    const who = h.friends.map((f) => FRIEND_SHORT[f]).join(' or ');
    return [h.knock, `(Grow closer to ${who} -- 4 hearts -- and you'll be welcome to visit.)`];
  }

  enterMap(id: MapId, x: number, y: number, dir: Dir): void {
    this.cur = this.getMap(id);
    if (id === 'PINE_HOLLOW_TOWN' && this.progress.days.firstTown === undefined) this.progress.days.firstTown = this.clock.day;
    this.progress.visited.add(id);
    [x, y] = this.openSpot(x, y);
    this.enteredAt = this.time;
    this.player.place(x, y, dir);
    this.cur.reveal(x, y, 7);
    this.particles.clear();
    this.cam.follow(this.player.x + 8, this.player.y + 8, this.cur.w * 16, this.cur.h * 16, 0, true);
    this.banner = { text: MAP_NAMES[id], t: 2.6 };
    if (id === 'DINER_INT' && friendMult(this) > 1) this.toast('Friday Night Story Hour! Chats and gifts in here count double tonight.');
    if (id === 'PINE_HOLLOW_TOWN' && porchMusic(this)) this.toast('Fiddle music drifts over from the gazebo in the park.');
    // The first time you're invited into someone's home, they welcome you in.
    if (isHome(id) && !this.progress.flags.has(`visit_${id}`) && this.townsfolk.awakeIn(id)) {
      this.progress.flags.add(`visit_${id}`);
      this.openOverlay(new Dialog([...HOMES[id].welcome, '(Look around -- everything here tells you something about them.)']));
    }
  }

  /**
   * Safety net: never put the player outside the map or inside something solid
   * (a door pointing at a rebuilt room, an old quick-resume). Nearest open tile wins.
   */
  private openSpot(x: number, y: number): [number, number] {
    const m = this.cur;
    const cx = Math.max(0, Math.min(m.w - 1, x)), cy = Math.max(0, Math.min(m.h - 1, y));
    if (cx === x && cy === y && !m.blocked(x, y, true)) return [x, y];
    for (let r = 0; r < Math.max(m.w, m.h); r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const tx = cx + dx, ty = cy + dy;
        if (m.inBounds(tx, ty) && !m.blocked(tx, ty, true) && !m.portalAt(tx, ty)) return [tx, ty];
      }
    }
    return [cx, cy];
  }

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.cam.viewW = w;
    this.cam.viewH = h;
    if (this.mode === 'play') this.cam.follow(this.player.x + 8, this.player.y + 8, this.cur.w * 16, this.cur.h * 16, 0, true);
  }

  /* ------------------------------------------------------------ */
  /* Weather                                                       */
  /* ------------------------------------------------------------ */

  private rollDayWeather(): void {
    // Old Man Winter burned at Fasnacht: the last days of winter roll spring weather.
    this.dayWeather = rollWeather(this.clock.day, winterBeaten(this) ? 0 : Math.floor((this.clock.day - 1) / 28) % 4);
  }

  weatherNow(): Weather {
    return weatherAt(this.dayWeather, this.clock.minutes);
  }

  hasGear(id: string): boolean {
    return this.inv.count(id) > 0;
  }

  /* ------------------------------------------------------------ */
  /* Phase 3: perks, town economy & progression                    */
  /* ------------------------------------------------------------ */

  hasWaders(): boolean {
    return this.progress.tools.waders >= 1 || this.hasGear('bog_waders');
  }

  /** Step-time multiplier for the destination tile, after outfit & upgrade perks. */
  terrainMult(ground: number): number {
    let m = SLOW_GROUND[ground] ?? 1;
    const wet = ground === T.BOG || ground === T.SHALLOW || ground === T.SPRING;
    if (wet && (this.look.outfit === 'frog_slicker' || this.progress.tools.waders >= 2)) m = 1;
    if (this.look.hat === 'jackalope_cap' && !this.cur.def.indoor) m *= 0.87;
    return m;
  }

  /** Rare-variant odds multiplier: Lunar Dew, festival nights, Shimmer Suit. */
  rareMult(): number {
    let k = 1;
    if (this.lunarNight === this.clock.day) k *= 3;
    if (this.isFestival()) k *= 3;
    if (this.look.outfit === 'shimmer_suit') k *= 2;
    if (this.progress.buffs.lucky === this.clock.day) k *= 2;
    if (this.progress.flags.has('agnes_brooch')) k *= 1.5;
    k *= foresightMult(this);
    return k;
  }

  isFestival(): boolean {
    // Sunday nights once the museum holds 24 specimens, plus the very first festival (the night Agnes's letter arrives).
    // Sundays (unless another gathering has the park that evening), and always the very first one.
    const first = this.clock.day === this.progress.firstFest;
    return this.progress.has('festival') && (first || (this.clock.weekday === 'Sun' && !eveningEventToday(this))) && this.clock.minutes >= 1080;
  }

  /** Outfitter upgrade price (Gideon's 4-heart discount stacks with the Shimmer Suit). */
  upgradePrice(cost: number): number {
    const c = this.priceOf(cost);
    return this.progress.flags.has('gideon_discount') ? Math.round(c * 0.75) : c;
  }

  priceOf(cost: number): number {
    return this.look.outfit === 'shimmer_suit' ? Math.round(cost * 0.75) : cost;
  }

  /** Extra night light radius from lantern upgrades and the Mothman Goggles. */
  lanternBonus(): number {
    let b = this.progress.tools.lantern * 12;
    const w = this.weatherNow();
    if (this.look.hat === 'mothman_goggles' && (w === 'FOG' || this.clock.minutes >= 1200)) b += 16;
    return b;
  }

  buy(id: string, cost: number, qty = 1): boolean {
    if (this.gold < cost) { sfx.error(); this.toast('Not enough gold.'); return false; }
    const def = ITEMS[id];
    const owned = this.inv.count(id) + this.storage.count(id) > 0;
    if ((def.kind === 'gear' || def.kind === 'tool') && owned) { sfx.error(); this.toast(`You already own the ${def.name}.`); return false; }
    if (!this.inv.canFit(id)) { sfx.error(); this.toast('Your bag is full.'); return false; }
    this.gold -= cost;
    const left = this.inv.add(id, qty);
    if (left) this.storage.add(id, left);
    sfx.coin();
    if (this.cur.id === 'STORE_INT') this.progress.flags.add('did_buy_store');
    return true;
  }

  craft(r: Recipe): void {
    const out = ITEMS[r.out];
    if (out.kind === 'gear' && this.inv.count(r.out) > 0) { sfx.error(); this.toast(`You already have a ${out.name}.`); return; }
    if (!r.inputs.every(([id, n]) => haveCount(this, id) >= n)) { sfx.error(); this.toast('Missing ingredients.'); return; }
    // Fasnacht masks go straight on the wardrobe hook.
    const wear = r.out.startsWith('mask_');
    if (wear && this.wardrobe.has(r.out)) { sfx.error(); this.toast(`You already carved a ${out.name}.`); return; }
    if (!wear && !this.inv.canFit(r.out)) { sfx.error(); this.toast('Your bag is full.'); return; }
    // The Porch Workbench uses your bag first, then the cabin Storage Crate.
    for (const [id, n] of r.inputs) {
      const fromBag = Math.min(n, this.inv.count(id));
      if (fromBag) this.inv.remove(id, fromBag);
      if (n - fromBag) this.storage.remove(id, n - fromBag);
    }
    // Mabel's skillet (2 hearts): stove meals make two servings.
    const qty = r.station === 'stove' && out.kind === 'food' && this.progress.flags.has('skillet') ? r.qty * 2 : r.qty;
    if (wear) this.wardrobe.add(r.out);
    else { const over = this.inv.add(r.out, qty); if (over) this.storage.add(r.out, over); }
    sfx.harvest();
    this.progress.flags.add('did_craft');
    const left = craftedNeed(this, r.id);
    const verb = r.station === 'stove' ? 'Cooked' : 'Crafted';
    if (r.station === 'stove') sfx.eat();
    this.toast(`${verb} ${qty > 1 ? `${qty} ` : ''}${out.name}!${left < 0 ? '' : left ? ` (${left} more on your list)` : ' Crossed off your list.'}`);
  }

  buyBlueprint(id: string, cost: number): void {
    if (this.progress.blueprints.has(id)) return;
    if (this.gold < cost) { sfx.error(); this.toast('Not enough gold.'); return; }
    this.gold -= cost;
    this.progress.blueprints.add(id);
    sfx.fanfare();
    this.toast('Blueprint learned! Craft it at your Porch Workbench.');
  }

  /** Carrying capacity: bag tier + pocket tier (Outfitter upgrades). */
  bagCapacity(): number {
    const t = this.progress.tools;
    return (UPGRADES.pack[t.pack]?.slots ?? 18) + (UPGRADES.pockets[t.pockets]?.slots ?? 0);
  }

  upgradeTool(line: ToolLine): void {
    const lv = this.progress.tools[line];
    const next = UPGRADES[line][lv + 1];
    if (!next) return;
    const cost = this.upgradePrice(next.cost);
    if (this.gold < cost) { sfx.error(); this.toast('Not enough gold.'); return; }
    if (!next.mats.every(([id, n]) => this.inv.count(id) >= n)) { sfx.error(); this.toast('Gideon: "Bring me the materials first."'); return; }
    this.gold -= cost;
    for (const [id, n] of next.mats) this.inv.remove(id, n);
    this.progress.tools[line] = lv + 1;
    if (line === 'waders' && lv + 1 === 1 && this.inv.count('bog_waders') === 0) this.inv.add('bog_waders', 1);
    if (line === 'pack' || line === 'pockets') { this.inv.resize(this.bagCapacity()); this.toast(`Your bag now holds ${this.bagCapacity()} slots.`); }
    sfx.rockHit(); sfx.fanfare();
    this.toast(`Upgraded to ${next.name}!`);
  }

  donate(cid: string): void {
    const c = CRYPTIDS.find((x) => x.id === cid);
    if (!c || this.progress.donated.has(cid) || !this.inv.remove(c.drop.id, 1)) return;
    this.progress.donated.add(cid);
    sfx.trustChime();
    this.toast(`Donated ${c.drop.name}! (${this.progress.donations}/${CRYPTIDS.length})`);
    this.queueLetters();
    const reached = this.progress.newlyReached();
    if (!reached.length) return;
    const pages: string[] = [];
    for (const m of reached) {
      for (const w of m.wear ?? []) this.wardrobe.add(w);
      pages.push(`Agnes: "${m.count} specimens! The Society awards you: ${m.title}." ${m.desc}${m.wear ? ' (Wear it from your cabin Wardrobe.)' : ''}`);
      if (m.flag === 'grant') pages.push('The County Restoration Grant is approved! From now on the County matches every coin the town puts in: Restoration Ledger projects cost half. Work crews start on the old rail car.');
    }
    sfx.fanfare();
    this.openOverlay(new Dialog(pages));
  }

  /** Story letters go out the morning after a donation milestone. */
  private queueLetters(): void {
    for (const l of LETTERS) if (this.progress.donations >= l.donations && !(l.id in this.progress.mail)) this.progress.mail[l.id] = this.clock.day + 1;
  }

  /** Story letters waiting in the cabin mailbox. */
  unreadLetters(): typeof LETTERS[number][] {
    const p = this.progress;
    return LETTERS.filter((l) => (p.mail[l.id] ?? 0) > 0 && p.mail[l.id] <= this.clock.day && !p.flags.has(`read_${l.id}`));
  }

  hasMail(): boolean { return this.mailRead < 2 || this.unreadLetters().length > 0; }

  /** Festival prep after Mabel's letter: 0 posts, 1 frames, 2 finished stalls (-1 = not started). */
  prepStage(): number {
    const p = this.progress;
    if (!p.flags.has('read_mabel18') && !p.has('festival')) return -1;
    const start = p.mail.mabel18 ?? 0;
    if (p.has('festival') || !start) return 2;
    return Math.max(0, Math.min(2, this.clock.day - start));
  }

  /** A festival stall stands on this town tile (they block the path once they're up). */
  stallAt(x: number, y: number): boolean {
    if (this.cur.id !== 'PINE_HOLLOW_TOWN' || this.prepStage() < 0) return false;
    if (this.isFestival() && x === FESTIVAL_SPOTS.bonfire[0] && y === FESTIVAL_SPOTS.bonfire[1]) return true;
    return FESTIVAL_STALLS.some(([sx, sy]) => sx === x && sy === y);
  }

  private stallNote(x: number, y: number): string {
    const kind = FESTIVAL_STALLS.find(([sx, sy]) => sx === x && sy === y)?.[2] ?? 'pie';
    const st = this.prepStage();
    if (st < 2) return ['Four posts and a pile of lumber. Gideon\'s chalked "PIE" on one of them.', 'The frame\'s up. Toby is hammering with great enthusiasm and moderate accuracy.'][st];
    return {
      pie: 'Mabel\'s pie stand: cranberry, apple, buckwheat-honey. A sign says "NO CRYPTIDS (PIPPA THIS MEANS YOU)."',
      lantern: 'Paper lanterns and hand-painted signs: the Junior Cryptid Club\'s booth. Sam drew every lantern a different cryptid.',
      cider: 'Barney\'s cider stand, built from old C&O ties. The cider is cold, the price is "whatever you got."',
      crafts: 'Ruth\'s quilt stall. A Bear\'s Paw quilt hangs in front, and a jar labeled "CHICKEN MONEY."',
    }[kind] ?? '';
  }

  /** Festival night: Gideon toasts pepperoni rolls on green sticks over the bonfire. */
  private bonfireRoll(): void {
    const p = this.progress;
    if (p.festRollDay === this.clock.day) { sfx.blip(); this.openOverlay(new Dialog(['Gideon: "One per customer. Mabel\'s counting."'])); return; }
    if (!this.inv.canFit('pepperoni_roll')) { sfx.error(); this.notice('Your bag is full. Make room for a pepperoni roll.'); return; }
    p.festRollDay = this.clock.day;
    this.inv.add('pepperoni_roll', 1);
    sfx.eat();
    this.openOverlay(new Dialog(['Gideon hands you a pepperoni roll toasted on a green stick over the bonfire. The cheese has gone crisp at the edges. It is, objectively, the best food in West Virginia.', '(You got a Pepperoni Roll.)']));
  }

  /** The field radio on the cabin porch: neighbours check in at dusk, and later, a faint voice from the ridge. */
  private porchRadio(): void {
    const p = this.progress;
    const ph = this.clock.phase();
    sfx.blip();
    if (ph === 'day') { this.openOverlay(new Dialog(['Elias\'s old field radio, rigged to a car battery. Neighbors check in on it most evenings, from dusk on.'])); return; }
    if (p.radioDay === this.clock.day) { this.openOverlay(new Dialog(['Just static now, soft as rain. Time to bank the stove and get some sleep.'])); return; }
    p.radioDay = this.clock.day;
    const d = this.clock.day;
    let pages: string[];
    // Clara reads the names of the miners you've brought out, a few each night.
    const unaired = MINERS.filter((m) => p.mine.tags[m.id] === 'out' && !p.mine.aired.includes(m.id));
    if (unaired.length) {
      for (const m of unaired) p.mine.aired.push(m.id);
      const names = unaired.map((m) => `${m.name}, ${m.age}, ${m.job.split(',')[0]}`).join('. ');
      pages = [`CLARA (WKPB): "...and before the music tonight, the names. ${names}. Brought out of No. 3 this week, after eighty-three years. Welcome home, gentlemen."`, 'Then four seconds of nothing at all, on purpose. In the Quiet Zone you can hear exactly how long four seconds is.'];
    } else if (p.flags.has('finale')) pages = RADIO_HOME[d % RADIO_HOME.length];
    else if (p.act >= 3) pages = d % 2 ? RADIO_ELIAS[p.reason ?? 'belong'] : RADIO_STATIC[d % RADIO_STATIC.length];
    else if (p.donations >= 12) pages = d % 3 === 0 ? RADIO_STATIC[d % RADIO_STATIC.length] : RADIO_EARLY[d % RADIO_EARLY.length];
    else pages = RADIO_EARLY[d % RADIO_EARLY.length];
    sfx.radioStatic();
    // With Elias's brass key you can answer him in Morse, the way he and Agnes used to.
    const key = this.keepsake('radio_key') && !p.flags.has('finale')
      ? ['You clip Elias\'s brass key onto the set and tap out a slow GOOD NIGHT. A pause. Then, faint and steady from up the ridge: GN ... 73.']
      : [];
    this.openOverlay(new Dialog(['You key the porch radio. The dial glows amber.', ...pages, ...key]));
  }

  /** Today's Bulletin Board request (deterministic per day). */
  boardRequest(): { id: string; qty: number; reward: number } {
    const pool: Array<[string, number]> = [
      ['wild_clover', 5], ['catnip_mint', 3], ['sweet_corn', 2], ['cranberries', 6], ['wild_onion', 4], ['pine_resin', 4],
      ['glow_shroom', 2], ['smoked_venison', 1], ['mineral_salt', 3], ['wild_apple', 5], ['foraged_egg', 3], ['plant_fiber', 10],
    ];
    const [id, qty] = pool[Math.floor(hash2(this.clock.day, 1, 31) * pool.length)];
    return { id, qty, reward: Math.round(ITEMS[id].price * qty * 1.6) + 60 };
  }

  deliverBoard(): void {
    const req = this.boardRequest();
    if (this.progress.boardDay === this.clock.day) return;
    if (this.inv.count(req.id) < req.qty) { sfx.error(); this.toast(`You need ${req.qty} ${ITEMS[req.id].name}.`); return; }
    this.inv.remove(req.id, req.qty);
    this.gold += req.reward;
    this.progress.boardDay = this.clock.day;
    sfx.coin();
    this.toast(`Request complete! +${req.reward}g`);
  }

  /** Telegraph sighting report cryptid for today (boosts its spawn weight). */
  reportCryptid(): string | undefined {
    if (!this.progress.done('telegraph')) return undefined;
    const pool = CRYPTIDS.filter((c) => !c.summon && c.tier <= 3);
    return pool[Math.floor(hash2(this.clock.day, 2, 77) * pool.length)].id;
  }

  sightingReport(): string | null {
    const id = this.reportCryptid();
    if (!id) return null;
    const c = CRYPTIDS.find((x) => x.id === id)!;
    const where = MAP_NAMES[c.maps[0]];
    const when = c.times === 'ANY' ? 'all day' : c.times.join('/').toLowerCase();
    return `Wire from down the line: ${c.name} activity reported near ${where} (${when}). Sightings are up today!`;
  }

  boardNotices(): Array<{ title: string; sub: string; text: string }> {
    const out: Array<{ title: string; sub: string; text: string }> = [];
    for (const q of QUESTS) if (q.notice && !this.progress.done(q.id)) out.push({ title: q.title.toUpperCase(), sub: this.progress.active(q.id) ? 'IN PROGRESS' : 'NOTICE', text: q.notice });
    if (this.progress.has('festival')) out.push({ title: 'FOLKLORE FESTIVAL: SUNDAYS!', sub: 'TOWN SQUARE, 6 PM', text: 'The Pine Hollow Folklore Festival lights up the Town Square every Sunday night. Bonfire, pie, Traveling Merchants, and rare cryptids abroad!' });
    else out.push({ title: 'FESTIVAL FUND', sub: `${this.progress.donations}/24 SPECIMENS`, text: 'The Historical Society will revive the Folklore Festival once the museum holds 24 specimens. -A.V.' });
    out.push({ title: 'MERCHANT NOTICE', sub: 'FOGGY NIGHTS', text: 'Traveling Merchants Old Ezri Vance-Kerr and Prof. Sterling Pike set up in the Square on foggy nights after 6 PM.' });
    const nextM = MILESTONES.find((m) => this.progress.donations < m.count);
    if (nextM) out.push({ title: 'SOCIETY GOAL', sub: `${nextM.count} DONATIONS`, text: `Next Historical Society milestone at ${nextM.count} specimens: ${nextM.title}.` });
    return out;
  }

  setDisplay(key: string, item: string | null): void {
    const cur = this.progress.displays[key];
    if (cur) { this.inv.add(cur, 1); delete this.progress.displays[key]; }
    if (item && this.inv.remove(item, 1)) { this.progress.displays[key] = item; sfx.confirm(); this.toast(`${ITEMS[item].name} is on display.`); }
    else sfx.blip();
  }

  talkCount(id: string): number {
    const n = (this.talks.get(id) ?? 0) + 1;
    this.talks.set(id, n);
    return n;
  }

  /** Act IV: Static Radio at the Crossroads in the Witching Hour. */
  private tryFinale(): boolean {
    const p = this.progress;
    if (p.act !== 4) return false;
    const atCrossroads = this.cur.id === 'RADIO_RIDGE_AND_CROSSROADS' && this.cur.zonesAt(this.player.tx, this.player.ty).includes('crossroads');
    if (!atCrossroads || this.clock.phase() !== 'witching') {
      sfx.error();
      this.notice(atCrossroads ? 'Only static. Clara said the Witching Hour: midnight to 2 AM.' : 'Static... Clara said to tune it at the Radio Ridge Crossroads, in the Witching Hour.');
      return true;
    }
    sfx.alert();
    this.openOverlay(new Dialog(['You switch on the Static Radio. The needle swings on its own, and the dead tree at the Crossroads begins to hum...'], [
      { label: 'Listen', fn: () => this.openOverlay(new FinaleScene(this.progress.reason, () => this.finishCampaign())) },
      { label: 'Not yet', fn: () => undefined },
    ]));
    return true;
  }

  private finishCampaign(): void {
    const p = this.progress;
    p.flags.add('finale');
    p.act = 5;
    for (const id of ['indrid_cold', 'weaver']) {
      const e = this.dex[id];
      e.seen = true;
      e.behavior = true;
      if (!e.logged) { e.logged = true; const c = CRYPTIDS.find((x) => x.id === id)!; this.inv.add(c.drop.id, 1); }
    }
    // Elias carves a Sheepsquatch for the museum's centerpiece and signs the cabin over to you.
    p.flags.add('carving');
    p.flags.add('cabin_deed');
    // The night passes (crops grow, the journal saves), and you wake on the station platform at dawn.
    sfx.sleep();
    this.transition(() => {
      this.overnight(false);
      this.clock.minutes = 6 * 60;
      this.enterMap('PINE_HOLLOW_TOWN', 66, 36, 'right');
      this.banner.t = 0;
      this.saveGame();
      sfx.morning();
      playEpilogue(this, () => {
        this.openOverlay(new Dialog([
          'Elias Vance: "Agnes says I\'m sleeping in my old room and I\'m not to argue. Sundays I\'m at the diner with her and Barney. Come find us."',
          '(The hand-carved Sheepsquatch now stands in the Historical Society\'s centerpiece case, and the fire-watch cabin is yours for good.)',
        ]));
        this.toast('CAMPAIGN COMPLETE! The valley stays open. Elias Vance has come home.');
      });
    });
  }

  markRumor(cid: string): void {
    const e = this.dex[cid];
    if (e) e.rumor = true;
  }

  /* ------------------------------------------------------------ */
  /* Helpers used by UI                                            */
  /* ------------------------------------------------------------ */

  toast(text: string): void {
    if (this.toasts.length && this.toasts[this.toasts.length - 1].text === text) { this.toasts[this.toasts.length - 1].t = 3.2; return; }
    this.toasts.push({ text, t: 3.2 });
    if (this.toasts.length > 3) this.toasts.shift();
  }

  /** Rate-limited toast for repeated bumps. */
  notice(text: string): void {
    if (this.msgCd > 0) return;
    this.msgCd = 1.2;
    this.toast(text);
  }

  openOverlay(o: Overlay): void {
    this.overlays.push(o);
    this.input.releaseAll();
  }

  get selected(): Stack | null {
    return this.inv.slots[this.sel];
  }

  selectSlot(i: number): void {
    if (i === this.sel) return;
    this.sel = ((i % HOTBAR_SIZE) + HOTBAR_SIZE) % HOTBAR_SIZE;
    this.selFlash = 1.6;
    sfx.blip();
  }

  pendingPayout(): number {
    return this.shipped.reduce((a, s) => a + (ITEMS[s.id]?.price ?? 0) * s.n, 0);
  }

  /** Apply character-creator choices to the player sprite and dialogue. */
  setAppearance(a: Appearance): void {
    this.appearance = { ...a };
    setPlayerBody(bodyFor(this.appearance));
    setPlayerName(this.appearance.name);
  }

  /** Screen shake until this time (render reads it; off in Settings). */
  shakeT = 0;
  shake(secs: number): void { this.shakeT = Math.max(this.shakeT, this.time + secs); }

  /** Run once every dialog is closed (e.g. walk somewhere after a scene). */
  afterOverlays(fn: () => void): void { this.afterQ.push(fn); }
  private afterQ: Array<() => void> = [];

  /** Holding one of Elias's keepsakes (bag or crate). */
  keepsake(id: string): boolean { return haveCount(this, id) > 0; }
  /** Keepsakes that make forage groups richer. */
  forageBoosts(): Set<string> {
    const s = new Set(['herb_satchel'].filter((k) => this.keepsake(k)));
    const e = eventOn(this.clock.day);
    if (e) s.add(`event:${e.id}`);
    return s;
  }

  /** Fade out → run → fade in. */
  transition(cb: () => void): void {
    if (this.fadeDir !== 0) return;
    this.fadeDir = 1;
    this.fadeCb = cb;
    this.input.releaseAll();
  }

  get fading(): boolean {
    return this.fadeDir !== 0;
  }

  get fadeAlpha(): number {
    return this.fade;
  }

  /* ------------------------------------------------------------ */
  /* Main loop                                                     */
  /* ------------------------------------------------------------ */

  update(dt: number): void {
    this.time += dt;
    this.input.beginFrame(dt);
    if (this.input.pressed('mute')) this.toggleMute();
    music.play(this.musicTrack());
    this.updateFade(dt);

    if (this.mode === 'title') {
      if (this.fadeDir === 0) this.title.update(this);
      this.input.endFrame();
      return;
    }

    this.msgCd = Math.max(0, this.msgCd - dt);
    this.selFlash = Math.max(0, this.selFlash - dt);
    this.banner.t = Math.max(0, this.banner.t - dt);
    for (const t of this.toasts) t.t -= dt;
    this.toasts = this.toasts.filter((t) => t.t > 0);

    CharacterCreator.sweep(this.overlays);
    NamePrompt.sweep(this.overlays);
    const top = this.overlays[this.overlays.length - 1];
    if (top) {
      if (this.fadeDir === 0) top.update(this, dt);
      this.overlays = this.overlays.filter((o) => !o.closed);
    } else if (this.fadeDir === 0 && this.afterQ.length) {
      this.afterQ.shift()!();
    } else if (this.fadeDir === 0) {
      this.handleHotbarInput();
      if (this.clock.tick(dt)) this.passOut();
      this.townsfolk.update(this, dt);
      this.companion.update(this, dt);
      this.sightings.update(this, dt);
      this.campaignT -= dt;
      if (this.campaignT <= 0) { this.campaignT = 0.5; campaignTick(this); heartTick(this); bondsTick(this); awfulTick(this); adoptionTick(this); oriTick(this); needsWatch.tick(this); }
      this.updatePlayer(dt);
      mineTick(this, dt);
      homesteadTick(this);
      this.wildlife.update(this, dt);
      this.updateAmbience(dt);
    }

    const outdoors = !this.cur.def.indoor;
    if (this.weatherFx.update(dt, this.weatherNow(), outdoors) && outdoors) { sfx.thunder(); this.shake(0.6); }
    this.particles.update(dt);
    this.cam.follow(this.player.x + 8, this.player.y + 8, this.cur.w * 16, this.cur.h * 16, dt);
    this.prompt = this.overlays.length || this.fadeDir ? '' : this.computePrompt();
    this.input.endFrame();
  }

  private updateFade(dt: number): void {
    if (this.fadeDir === 0) return;
    this.fade += this.fadeDir * dt * 4;
    if (this.fadeDir > 0 && this.fade >= 1) {
      this.fade = 1;
      const cb = this.fadeCb;
      this.fadeCb = null;
      cb?.();
      this.fadeDir = -1;
    } else if (this.fadeDir < 0 && this.fade <= 0) {
      this.fade = 0;
      this.fadeDir = 0;
    }
  }

  render(): void {
    const g = this.g;
    g.imageSmoothingEnabled = false;
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#0b1316';
    g.fillRect(0, 0, this.w, this.h);
    if (this.mode === 'title') {
      this.title.draw(this, g);
    } else {
      renderWorld(this, g);
      drawHud(this, g);
      for (const o of this.overlays) o.draw(this, g);
    }
    if (this.fade > 0) {
      g.globalAlpha = Math.min(1, this.fade);
      g.fillStyle = '#0b1316';
      g.fillRect(0, 0, this.w, this.h);
      g.globalAlpha = 1;
    }
  }

  /** M / the SND button cycle: music + sound -> sound effects only -> off -> back on. */
  toggleMute(): void {
    if (!sfx.muted && music.enabled) { music.setEnabled(false); this.toast('Music off, sound effects on (M)'); }
    else if (!sfx.muted) { sfx.toggleMute(); this.toast('All sound off (M)'); }
    else { sfx.toggleMute(); music.setEnabled(true); this.toast('Music and sound on (M)'); }
    Game.syncSoundButton();
  }

  /** Label the corner button with the current sound state. */
  static syncSoundButton(): void {
    const b = document.getElementById('mute-toggle');
    if (!b) return;
    b.textContent = sfx.muted ? 'OFF' : music.enabled ? 'SND' : 'SFX';
    b.classList.toggle('on', !sfx.muted);
  }

  /** Background music that fits the moment. */
  private musicTrack(): TrackId {
    if (this.mode === 'title') return 'title';
    // The Deep Seam's drone warms as the tags come out; once it's sealed, the hymn.
    if (this.cur && isDeepSeam(this.cur.id)) return this.progress.mine.sealed ? 'mine_hymn' : banked(this) >= 6 ? 'mine_warm' : 'mine';
    if (eventNow(this)?.id === 'memorial' && this.cur.id === 'PINE_HOLLOW_TOWN') return 'mine_hymn';
    const top = this.overlays[this.overlays.length - 1];
    if (top instanceof Encounter) return 'encounter';
    if (top instanceof StoryPanels || top instanceof FinaleScene || this.overlays.some((o) => o instanceof DriveIntro)) return 'title';
    const m = this.cur;
    if (!m) return 'title';
    const rec = recordTrack(this);
    if (rec) return rec as TrackId;
    if (m.def.indoor) return 'interior';
    const tags = timeTags(this.clock.minutes);
    const night = tags.includes('NIGHT') || tags.includes('WITCHING');
    if (m.id === 'PINE_HOLLOW_TOWN') return this.isFestival() || porchMusic(this) || eventNow(this) ? 'festival' : night ? 'night' : 'town';
    if (night) return 'night';
    if (m.id === 'CABIN_YARD') return 'cabin';
    if (m.id === 'CRANBERRY_BOG_AND_SPRINGS') return 'bog';
    if (m.id === 'RADIO_RIDGE_AND_CROSSROADS') return 'ridge';
    return 'woods';
  }

  /** Quick-resume snapshot (app hidden / closed / every 90s). Skipped on the title screen and mid-transition. */
  snapshot(): void {
    if (this.mode !== 'play' || this.fadeDir !== 0 || !this.cur) return;
    const d = this.toSave();
    // Nothing meaningful changed since the last real save (just walking / the clock ticking): no snapshot.
    if (this.lastSaveKey !== null && Game.saveKey(d) === this.lastSaveKey) { clearResume(); return; }
    writeResume(d);
  }

  /** Fingerprint of a save that ignores position, time of day and stamina. */
  private static saveKey(d: SaveData): string {
    const { minutes: _m, stamina: _s, px: _x, py: _y, dir: _d, ...rest } = d;
    return JSON.stringify(rest);
  }
  private lastSaveKey: string | null = null;

  /** Title screen → fade → new game or loaded save. `fromRealSave`: loading the real save (CONTINUE), so it becomes the baseline for quick-resume snapshots. */
  startFromTitle(load: SaveData | null, fromRealSave = false): void {
    sfx.unlock();
    sfx.confirm();
    this.transition(() => {
      if (!load) { this.newGame(); return; }
      try {
        this.loadGame(load);
      } catch (e) {
        // A damaged save: stay on the title (the save itself is left untouched) rather than crash.
        console.error('Could not load save', e);
        this.mode = 'title'; this.overlays.length = 0;
        this.title.say('That field journal could not be read. It is kept safe: use EXPORT SAVE and send it in, or start a NEW GAME.', 10);
        return;
      }
      if (fromRealSave) this.lastSaveKey = Game.saveKey(this.toSave());
    });
  }

  private handleHotbarInput(): void {
    const inp = this.input;
    for (const i of inp.hotbar) this.selectSlot(i);
    if (inp.wheel) this.selectSlot(this.sel + inp.wheel);
    for (const t of inp.taps) {
      const hit = hotbarHit(this, t.x, t.y);
      if (hit >= 0) this.selectSlot(hit);
    }
    if (inp.pressed('bag')) { sfx.open(); this.openOverlay(new BagMenu()); }
    else if (inp.pressed('dex')) { sfx.open(); this.openOverlay(new DexMenu()); }
    else if (inp.pressed('map')) { sfx.open(); this.openOverlay(isMineMap(this.cur.id) ? new MineMap() : new WorldMap(this)); }
  }

  /* ------------------------------------------------------------ */
  /* Player movement & actions                                     */
  /* ------------------------------------------------------------ */

  private updatePlayer(dt: number): void {
    const p = this.player;
    const inp = this.input;
    p.bumpCd = Math.max(0, p.bumpCd - dt);
    if (mineBusy()) return;

    if (p.action) {
      const a = p.action;
      a.t += dt;
      if (!a.applied && a.t >= (TOOL_DURATION * 2) / 3) {
        a.applied = true;
        this.applyTool(a.tool, a.tx, a.ty);
      }
      if (a.t >= TOOL_DURATION) {
        p.action = null;
        // Hold A to keep swinging (Stardew feel)
        if (inp.held('a')) this.useA(true);
      }
      return;
    }

    if (p.moving) {
      if (p.advance(dt)) {
        this.cur.reveal(p.tx, p.ty, 7);
        this.onArrive(p.tx, p.ty);
        if (this.fadeDir !== 0) return;
        const d = inp.dir();
        if (d) {
          p.dir = d;
          this.tryStep(d);
        } else p.chain = false;
      }
      return;
    }

    if (inp.pressed('a')) { this.useA(false); return; }

    const d = inp.dir();
    if (!d) { p.turnHold = 0; p.chain = false; return; }
    if (d !== p.dir) {
      p.dir = d;
      p.turnHold = 0;
      if (!p.chain) return;
    }
    p.turnHold += dt;
    if (p.chain || p.turnHold > 0.08) this.tryStep(d);
  }

  private tryStep(d: Dir): void {
    const p = this.player;
    const [dx, dy] = DIR_VEC[d];
    const nx = p.tx + dx, ny = p.ty + dy;
    const portal = this.cur.portalAt(nx, ny);
    const locked = portal && portal.requires === 'archive' && !this.progress.has('archive');
    if (portal && portal.to === 'COAL_MINE' && funded(this, 'mine') && this.msgCd <= 0) {
      this.msgCd = 1.5;
      p.chain = false;
      // The town's adit is the drift mouth: first the teaser, then (kitted out) straight down to Level 1.
      if (!this.progress.flags.has('mine') || this.cur.id !== 'PINE_HOLLOW_TOWN') {
        this.progress.flags.add('mine');
        sfx.door();
        this.openOverlay(new Dialog(this.cur.id === 'PINE_HOLLOW_TOWN' ? [...MINE_TEASE] : ['This back way into No. 3 caved in long ago. The way down is the Lamp House on the hill above town.']));
        return;
      }
      if (!this.progress.mine.kit) { this.notice('Gear up at the Lamp House locker first (face the Lamp House up the hill and press A).'); return; }
      sfx.door();
      const L1 = MINE_LEVELS.MINE_L1;
      this.transition(() => this.enterMap('MINE_L1', L1.arrive[0], L1.arrive[1], 'up'));
      return;
    }
    if (portal && portal.to === 'MINE_L3' && this.progress.mine.sealed) {
      p.chain = false;
      if (this.msgCd <= 0) { this.msgCd = 1.5; this.notice('The manway down to Level 3 ends in a wall of fallen rock. The Deep Seam is closed for good.'); }
      return;
    }
    if (portal && portal.requires === 'home' && isHome(portal.to)) {
      const shut = this.homeClosed(portal.to);
      if (shut) {
        p.chain = false;
        if (this.msgCd <= 0) { this.msgCd = 1.2; sfx.knock(); this.openOverlay(new Dialog(shut)); }
        return;
      }
    }
    if (portal && (!BUILT_MAPS.has(portal.to) || locked)) {
      this.notice(locked ? 'The basement door is locked. Agnes: "The Archive opens for researchers with 6 donations, dear."'
        : (portal.to === 'COAL_MINE' ? funded(this, 'mine') : this.progress.has('grant')) && portal.grantMsg ? portal.grantMsg : portal.closedMsg);
      if (p.bumpCd <= 0) { sfx.bump(); p.bumpCd = 0.4; }
      p.chain = false;
      return;
    }
    if (this.townsfolk.at(this.cur.id, nx, ny)) { p.chain = false; return; }
    if (crawlBlocked(this, nx, ny)) { if (p.bumpCd <= 0) { sfx.bump(); p.bumpCd = 0.45; } p.chain = false; return; }
    if (this.stallAt(nx, ny)) { if (p.bumpCd <= 0) { sfx.bump(); p.bumpCd = 0.45; } p.chain = false; return; }
    if (this.cur.blocked(nx, ny, this.hasWaders())) {
      if (p.bumpCd <= 0) { sfx.bump(); p.bumpCd = 0.45; }
      if (WADE_GROUND.has(this.cur.ground(nx, ny))) this.notice('The water is deep, cold muck. You need Bog Waders to wade through (Gideon\'s Outfitter in town).');
      else if (this.cur.ground(nx, ny) === T.CLIFF) this.notice('A sheer rock face. Look for a switchback trail.');
      p.chain = false;
      return;
    }
    const run = this.input.held('b');
    p.beginStep(nx, ny, run, this.terrainMult(this.cur.ground(nx, ny)));
    p.chain = true;
    // Cryptid clues react to how you move: running spooks the shy ones, stepping onto one startles it.
    this.sightings.onStep(this, nx, ny, run);
    const surf = this.surfaceAt(p.tx - dx, p.ty - dy);
    if (isMineMap(this.cur.id)) { mineStep(this, nx, ny, run); if (WADE_GROUND.has(this.cur.ground(nx, ny))) this.particles.splash(nx * 16 + 8, ny * 16 + 12); }
    else if (WADE_GROUND.has(this.cur.ground(nx, ny))) { sfx.wade(); this.particles.splash(nx * 16 + 8, ny * 16 + 12); }
    else sfx.step(surf);
    if (surf !== 'wood' && !this.cur.def.indoor) this.particles.dust((p.tx - dx) * 16 + 8, (p.ty - dy) * 16 + 15, d);
    const cover = this.cur.obj(nx, ny);
    if (COVER_OBJECTS.has(cover) && cover !== O.TALLGRASS) { this.particles.leaves(nx * 16 + 8, ny * 16 + 12, cover === O.REEDS ? [3, 9, 4] : undefined); sfx.rustle(); }
    if (this.cur.obj(nx, ny) === O.TALLGRASS) {
      const i = this.cur.idx(nx, ny);
      this.cur.shake.set(i, this.time + 0.45);
      this.particles.leaves(nx * 16 + 8, ny * 16 + 12);
      sfx.rustle();
    }
  }

  private surfaceAt(x: number, y: number): Surface {
    const t = this.cur.ground(x, y);
    if (t === T.PORCH || t === T.FLOOR || t === T.BRIDGE || t === T.RUG || t === T.DOORMAT || t === T.BOARDWALK || t === T.RUIN_FLOOR) return 'wood';
    if (t === T.PATH || t === T.ROCKY || t === T.SLOPE) return 'sand';
    if (t === T.BOG || t === T.SHALLOW || t === T.SPRING) return 'bog';
    if (t === T.SOIL) {
      const pi = this.cur.plotIndex(x, y);
      if (pi >= 0 && (this.cur.def.plots[pi].bog || this.cur.plots[pi].watered)) return 'bog';
      return 'sand';
    }
    const wet = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => this.cur.ground(x + dx, y + dy) === T.WATER);
    return wet ? 'bog' : 'grass';
  }

  private onArrive(x: number, y: number): void {
    mineArrive(this, x, y);
    const portal = this.cur.portalAt(x, y);
    if (portal && BUILT_MAPS.has(portal.to)) {
      sfx.door();
      this.transition(() => this.enterMap(portal.to, portal.tx, portal.ty, portal.dir));
      return;
    }
  }

  /* ------------------------------------------------------------ */
  /* Encounters                                                    */
  /* ------------------------------------------------------------ */

  spawnCtx(x: number, y: number): SpawnCtx {
    return {
      map: this.cur.id,
      zones: this.cur.zonesAt(x, y),
      minutes: this.clock.minutes,
      weather: this.weatherNow(),
      fullMoon: moonPhase(this.clock.day).full,
      dex: this.dex,
      has: (id) => this.inv.count(id) > 0,
      pylonHere: this.cur.countPlaced(O.PYLON) > 0,
      boost: this.reportCryptid(),
      waterBonus: this.look.outfit === 'frog_slicker',
    };
  }

  /** Called when the rifle fires: no cryptids on this map until tomorrow, and the deer scatter. */
  gunshot(): void {
    this.gunshots.set(this.cur.id, this.clock.day);
    this.wildlife.scatter(this);
    this.toast('The shot echoes off the ridges. Cryptids here will lie low until tomorrow.');
  }

  quietToday(): boolean { return this.gunshots.get(this.cur.id) === this.clock.day; }

  startEncounter(def: CryptidDef, variant: Variant, slope: boolean, summoned: boolean, approach?: Approach): void {
    this.player.chain = false;
    this.openOverlay(new Encounter(this, { def, variant, slope, summoned, approach }));
  }

  /** After an encounter commits to the Dex: album prints and news for the townsfolk. */
  onLogged(def: CryptidDef, variant: Variant, beforeStars: number, firstLog: boolean, rareNew: boolean): void {
    const made = recordPrints(this, def, variant, beforeStars, rareNew);
    if (made.length) this.toast(`New ${made.join(' & ')} print in your Field Photo Album! (${goldCount(this)}/${CRYPTIDS.length} Gold)`);
    if (firstLog && def.id === 'mothman') markMilestone(this, 'mothman');
    if (firstLog && ['sasquatch', 'wendigo', 'thunderbird', 'awful'].includes(def.id)) markMilestone(this, `warden_${def.id}`);
    if (rareNew && variant !== 'normal') markMilestone(this, `rare_${def.id}:${variant}`);
  }

  /** Called by the encounter as it closes. */
  encounterEnded(): void {
    this.sightings.rest();
  }

  /** Which mythic (if any) a placed mount can summon right now. */
  summonAt(o: number): CryptidDef | null {
    const id = this.cur.id;
    const ph = this.clock.phase();
    const w = this.weatherNow();
    let c: CryptidDef | null = null;
    if (o === O.TOTEM && id === 'OLD_GROWTH_AND_SAWMILL' && ph === 'dusk' && this.cur.countPlaced(O.TOTEM) >= 3) c = CRYPTID_BY_ID.sasquatch;
    else if (o === O.CHIME && id === 'OLD_GROWTH_AND_SAWMILL' && ph === 'witching' && (w === 'FOG' || w === 'SNOW')) c = CRYPTID_BY_ID.wendigo;
    else if (o === O.ROD && id === 'RADIO_RIDGE_AND_CROSSROADS' && w === 'STORM') c = CRYPTID_BY_ID.thunderbird;
    else if (o === O.PYLON && (ph === 'night' || ph === 'witching') && w === 'CLEAR') {
      const ctx = this.spawnCtx(this.player.tx, this.player.ty);
      c = ['thunderbird', 'hopkinsville_goblin', 'mothman'].map((k) => CRYPTID_BY_ID[k]).find((k) => k.maps.includes(id) && eligible(k, { ...ctx, zones: k.zones ?? [] }, true)) ?? null;
    }
    if (c && this.summoned.has(`${id}:${c.id}`)) return null;
    return c;
  }

  /** A button: interact with what's in front, else use the selected item. */
  private useA(repeat: boolean): void {
    const p = this.player;
    const [tx, ty] = p.facing();
    if (!repeat && this.tryInteract(tx, ty)) return;
    const st = this.selected;
    // Underground: A with nothing to use it on (and nothing usable in hand), twice quickly, sounds the bar.
    if (!repeat && (!st || ITEMS[st.id].kind === 'tool') && !(st && ITEMS[st.id].tool === 'rod' && this.cur.id === 'MINE_L4') && mineEmptyA(this)) return;
    if (!repeat && st?.id === 'coal_lump') { throwCoal(this); return; }
    if (!st) { if (!repeat) this.notice(touchOn() ? 'Nothing in hand. Tap a hotbar slot to pick it.' : 'Nothing in hand. Pick a hotbar slot with 1-9 or tap it.'); return; }
    if (!repeat && wardenUse(this, st.id)) return;
    const def = ITEMS[st.id];
    if (def.kind === 'tool' && def.tool) {
      if (this.cur.def.indoor && !(def.tool === 'rod' && this.cur.id === 'MINE_L4')) { if (!repeat) this.notice(`Better not swing the ${def.name} indoors.`); return; }
      if (def.tool === 'rod' || def.tool === 'bow' || def.tool === 'rifle') { if (!repeat) this.useOutdoorTool(def.tool, tx, ty); return; }
      this.startTool(def.tool, tx, ty);
      return;
    }
    if (repeat) return;
    if (def.kind === 'seed') { this.plant(tx, ty); return; }
    if (st.id === 'snare') { this.placeSnare(tx, ty); return; }
    if (def.kind === 'placeable') { this.placeMount(st.id, tx, ty); return; }
    if (def.edible) { this.eat(); return; }
    if (st.id === 'static_radio' && this.tryFinale()) return;
    if (def.kind === 'gear') { this.notice(`${def.name} is part of your Field Kit. Carry it into encounters.`); return; }
    this.notice(`${def.name}: ship it in the bin, or use it as cryptid bait.`);
  }

  private useOutdoorTool(tool: 'rod' | 'bow' | 'rifle', tx: number, ty: number): void {
    const p = this.player;
    if (tool === 'rod') {
      // Cast one or two tiles out.
      const [dx, dy] = DIR_VEC[p.dir];
      const spot = [[tx, ty], [tx + dx, ty + dy]].find(([x, y]) => waterAt(this.cur, x, y));
      if (!spot) { this.notice('Face a creek, the bog lake or the canal to cast.'); return; }
      if (this.stamina < 2) { sfx.error(); this.notice("You're too exhausted to fish. Eat something or get some sleep."); return; }
      if (!this.inv.slots.some((s) => !s)) { sfx.error(); this.notice('No room in your bag for a fish. Make space first.'); return; }
      this.stamina -= 2;
      this.openOverlay(new FishingGame(this, waterAt(this.cur, spot[0], spot[1])!, spot[0], spot[1]));
      return;
    }
    const w = WEAPONS[tool];
    if (this.inv.count(w.ammo) <= 0) { sfx.error(); this.notice(tool === 'rifle' ? 'No cartridges. The General Store sells them.' : 'No arrows. Craft them at the Porch Workbench or buy them in town.'); return; }
    const room = this.inv.slots.filter((s) => !s).length + (this.inv.canFit('raw_venison') && this.inv.count('raw_venison') ? 1 : 0) + (this.inv.canFit('deer_hide') && this.inv.count('deer_hide') ? 1 : 0);
    if (room < 2) { sfx.error(); this.notice('Make room in your bag first: a deer means venison and a hide to carry home.'); return; }
    const hit = this.wildlife.inSights(this, p.dir, w.range);
    if (!hit) { this.notice(`No deer in range. Face one within ${w.range} tiles.${tool === 'bow' ? ' Walk, don\'t run, to sneak close.' : ''}`); return; }
    this.openOverlay(new AimGame(this, hit.deer, w, tool, hit.dist));
  }

  /** Is this region's handcar stop repaired (Town's is the station: always)? */
  stopRepaired(id: MapId): boolean {
    return id === 'PINE_HOLLOW_TOWN' ? STOPS.has(id) : this.progress.flags.has(stopFlag(id));
  }

  /** Repaired and Barney is running the handcar: he waits here for you. */
  stopActive(id: MapId): boolean { return STOPS.has(id) && this.stopRepaired(id) && handcarUnlocked(this); }

  /** A repaired stop's line is cleared of trees and growth so you can walk it (trestles stay off-limits). */
  clearLine(m: MapRuntime): void {
    const stop = STOPS.get(m.id);
    if (!stop) return;
    for (const t of stop.route.keys()) {
      if (stop.trestle.has(t) || m.placed.has(t) || !LINE_CLEARABLE.has(m.objects[t])) continue;
      m.objects[t] = O.NONE;
      m.hp.delete(t);
    }
  }

  private useHandcarStop(): void {
    const id = this.cur.id;
    const name = MAP_NAMES[id];
    if (!this.stopRepaired(id)) {
      const need = REPAIRS[id];
      if (!need) return;
      const list = need.mats.map(([it, n]) => `${n} ${ITEMS[it].name} (have ${haveCount(this, it)})`).join(', ');
      const can = need.mats.every(([it, n]) => haveCount(this, it) >= n) && this.gold >= need.gold;
      sfx.blip();
      this.openOverlay(new Dialog([
        `HANDCAR STOP: ${name.toUpperCase()}. The spur rails are buckled and the platform boards have rotted through.`,
        `To repair it: ${list}, and ${need.gold}g for parts. (Materials in your Storage Crate count.)`,
      ], can ? [
        { label: 'Repair it', fn: () => {
          for (const [it, n] of need.mats) { const fromBag = Math.min(n, this.inv.count(it)); if (fromBag) this.inv.remove(it, fromBag); if (n - fromBag) this.storage.remove(it, n - fromBag); }
          this.gold -= need.gold;
          this.progress.flags.add(stopFlag(id));
          this.clearLine(this.cur);
          sfx.rockHit(); sfx.fanfare();
          this.toast(handcarUnlocked(this) ? `${name} stop repaired! Barney can pick you up here now.` : `${name} stop repaired! Now Barney just needs his handcar running.`);
        } },
        { label: 'Not now', fn: () => undefined },
      ] : undefined));
      return;
    }
    if (!handcarUnlocked(this)) {
      sfx.blip();
      this.openOverlay(new Dialog([id === 'PINE_HOLLOW_TOWN'
        ? "Barney's old handcar sits on the station siding under a tarp. He'd need a working telegraph to run the line safely."
        : 'The stop is ready, but the handcar is still parked at the station in town.',
        '(Fast travel: finish Barney\'s Telegraph Repair quest, or become friends with him.)']));
      return;
    }
    const shut = handcarClosed(this);
    if (shut) { sfx.blip(); this.openOverlay(new Dialog([shut])); return; }
    const offHours = this.clock.minutes < 6 * 60 || this.clock.minutes >= (funded(this, 'station') ? 24 : 21) * 60;
    if (offHours) {
      sfx.open();
      const crank = this.keepsake('handcar_crank');
      this.openOverlay(new Dialog([crank
        ? 'You fit Elias\'s spare crank to the handcar and pump it yourself. The rails sing in the dark.'
        : 'You blow Barney\'s whistle. Three long notes down the line. Before long a lantern bobs out of the dark: "Somebody rang?" He\'s in his slippers.'], [
        { label: 'Pick a stop', fn: () => this.openOverlay(new WorldMap(this, id)) },
        { label: 'Not now', fn: () => undefined },
      ]));
      return;
    }
    sfx.open();
    this.openOverlay(new Dialog([id === 'PINE_HOLLOW_TOWN' ? 'Barney: "Hop on, Ranger! Where to?"' : 'Barney leans on the pump handle. "Figured you\'d turn up here. Where to?"'], [
      { label: 'Pick a stop', fn: () => this.openOverlay(new WorldMap(this, id)) },
      { label: 'Not now', fn: () => undefined },
    ]));
  }

  private placeSnare(tx: number, ty: number): void {
    const m = this.cur;
    if (!m.def.wild) { sfx.error(); this.notice('Set snares out in the wild, or in your cabin yard.'); return; }
    const g = m.ground(tx, ty);
    const ok = m.inBounds(tx, ty) && m.obj(tx, ty) === O.NONE && !m.forage.has(m.idx(tx, ty)) && !m.portalAt(tx, ty) && !m.blocked(tx, ty)
      && m.plotIndex(tx, ty) < 0 && (g === T.GRASS || g === T.FOREST || g === T.CLOVER || g === T.HEMLOCK);
    if (!ok) { sfx.error(); this.notice('Snares go on open grass or forest floor, off the trail.'); return; }
    const i = m.idx(tx, ty);
    m.placeObject(i, O.SNARE);
    m.snares.set(i, '');
    this.inv.removeAt(this.sel, 1);
    sfx.till();
    this.toast(`Snare set. Check it each morning. (${m.countPlaced(O.SNARE)} here)`);
    this.progress.flags.add('did_snare');
  }

  private checkSnare(i: number, cx: number, cy: number): void {
    const m = this.cur;
    const caught = m.snares.get(i) ?? '';
    if (caught) {
      if (!this.inv.canFit(caught)) { sfx.error(); this.notice('Your bag is full. Store things in the cabin crate, or get a bigger bag at the Outfitter.'); return; }
      m.snares.set(i, '');
      sfx.harvest();
      this.give(caught, 1, cx, cy);
      this.toast(`Caught a ${ITEMS[caught].name.replace(/^Raw /, '')}! The snare is reset.`);
      return;
    }
    sfx.blip();
    this.openOverlay(new Dialog(['The snare is set, but empty. Small game moves at night: check it in the morning.'], [
      { label: 'Leave it set', fn: () => undefined },
      { label: 'Pick it up', fn: () => {
        if (!this.inv.canFit('snare')) { sfx.error(); this.toast('Your bag is full.'); return; }
        m.removeObject(i); m.snares.delete(i); this.inv.add('snare', 1); sfx.confirm();
      } },
    ]));
  }

  private placeMount(id: string, tx: number, ty: number): void {
    const m = this.cur;
    if (placeDeco(this, id, tx, ty)) return;
    if (id === 'display_pedestal') {
      const ok = m.id === 'CABIN_INTERIOR' && m.obj(tx, ty) === O.NONE && !m.blocked(tx, ty) && m.ground(tx, ty) !== T.DOORMAT && !m.portalAt(tx, ty);
      if (!ok) { sfx.error(); this.notice('Display pedestals go on open floor inside your cabin.'); return; }
      m.placeObject(m.idx(tx, ty), O.PEDESTAL);
      this.inv.removeAt(this.sel, 1);
      sfx.confirm();
      this.toast('Display pedestal placed. Face it and press A to show a specimen.');
      return;
    }
    if (id === 'hemlock_prop') { placeHemlock(this, tx, ty); return; }
    if (id === 'pitch_torch') { placeTorch(this, tx, ty); return; }
    if (id === 'barn_star') {
      const ok = m.id === 'CABIN_YARD' && m.obj(tx, ty) === O.NONE && !m.blocked(tx, ty) && !m.portalAt(tx, ty) && m.plotIndex(tx, ty) < 0 && m.ground(tx, ty) !== T.PATH;
      if (!ok) { sfx.error(); this.notice('Hang the barn star on open ground in your cabin yard (off the path and the garden).'); return; }
      if (m.countPlaced(O.BARN_STAR) >= 1) { sfx.error(); this.notice('One barn star is plenty. The Snallygaster can count.'); return; }
      m.placeObject(m.idx(tx, ty), O.BARN_STAR);
      this.inv.removeAt(this.sel, 1);
      sfx.till();
      this.toast('Barn star raised. Omi Liesl would approve.');
      return;
    }
    const o = MOUNT_OBJECT[id];
    if (!m.def.wild || m.id === 'CABIN_YARD') { sfx.error(); this.notice('Lure mounts only work out in the wilderness regions.'); return; }
    const g = m.ground(tx, ty);
    const ok = m.inBounds(tx, ty) && m.obj(tx, ty) === O.NONE && !m.forage.has(m.idx(tx, ty)) && !m.portalAt(tx, ty)
      && !m.blocked(tx, ty) && g !== T.PATH && g !== T.BOARDWALK && g !== T.BRIDGE;
    if (!ok) { sfx.error(); this.notice('Place mounts on open ground beside the trail (not on the path).'); return; }
    m.placeObject(m.idx(tx, ty), o);
    this.inv.removeAt(this.sel, 1);
    sfx.till();
    this.particles.clods(tx * 16 + 8, ty * 16 + 12, [8, 9, 7]);
    const name = ITEMS[id].name;
    if (o === O.TOTEM) this.toast(`${name} placed. Totems here: ${m.countPlaced(O.TOTEM)}/3${m.id === 'OLD_GROWTH_AND_SAWMILL' ? '' : ' (they matter in the Old Growth)'}`);
    else this.toast(`${name} placed.`);
  }

  private startTool(tool: ToolKind, tx: number, ty: number): void {
    const cost = tool === 'can' || this.progress.buffs.haul === this.clock.day ? 1 : 2;
    if (this.stamina < cost) { sfx.error(); this.notice("You're too exhausted to work. Eat something or get some sleep."); return; }
    this.stamina -= cost;
    if (!this.lowStaminaWarned && this.stamina < 20) { this.lowStaminaWarned = true; this.toast('You feel worn out... time to rest soon.'); }
    this.player.action = { tool, t: 0, applied: false, tx, ty };
    sfx.swing();
  }

  private applyTool(tool: ToolKind, tx: number, ty: number): void {
    const m = this.cur;
    const cx = tx * 16 + 8, cy = ty * 16 + 10;
    if (!m.inBounds(tx, ty)) return;
    const i = m.idx(tx, ty);
    const o = m.obj(tx, ty);
    const props = objProps(o);
    const pi = m.plotIndex(tx, ty);

    if (tool === 'can') {
      if (m.ground(tx, ty) === T.WATER || o === O.RAIN_BARREL) { this.refill(cx, cy); return; }
      if (this.water <= 0) { sfx.error(); this.notice('The watering can is empty. Refill at the creek or the Rain Barrel.'); return; }
      this.water--;
      sfx.water();
      this.particles.droplets(cx, cy);
      if (pi >= 0 && m.plots[pi].tilled && o === O.NONE) {
        m.plots[pi].watered = true;
      }
      return;
    }

    if (props.tool === tool && props.hp) {
      this.hitObject(i, tx, ty, o);
      return;
    }

    if (tool === 'hoe') {
      if (pi >= 0 && o === O.NONE) {
        const plot = m.plots[pi];
        if (!plot.tilled) {
          plot.tilled = true;
          this.stats.tilled++;
          sfx.till();
          this.particles.clods(cx, cy, m.def.plots[pi].bog ? [3, 2, 1] : undefined);
        } else {
          this.particles.clods(cx, cy);
          sfx.till();
        }
        return;
      }
      sfx.till();
      this.particles.clods(cx, cy, [4, 3, 9]);
      if (props.tool === 'machete') this.notice(`Use the Machete on the ${props.name.toLowerCase()}.`);
      else if (o === O.NONE && m.ground(tx, ty) !== T.SOIL) this.notice('The roots here are too thick. Till the garden plots instead.');
      return;
    }

    // machete
    sfx.chop();
    this.particles.leaves(cx, cy);
    if (props.tool === 'hoe') { sfx.rockHit(); this.notice('Too hard for a blade. Break rocks with the Hoe.'); }
  }

  private hitObject(i: number, tx: number, ty: number, o: number): void {
    const m = this.cur;
    const props = objProps(o);
    const cx = tx * 16 + 8, cy = ty * 16 + 10;
    const dmg = props.tool === 'machete' ? 1 + this.progress.tools.machete : 1;
    const hp = (m.hp.get(i) ?? props.hp ?? 1) - dmg;
    m.shake.set(i, this.time + 0.25);
    const rocky = o === O.ROCK;
    const woody = o === O.STUMP || o === O.LOG;
    if (rocky) { sfx.rockHit(); this.particles.chips(cx, cy); }
    else if (woody) { sfx.chop(); this.particles.wood(cx, cy); }
    else { sfx.chop(); this.particles.leaves(cx, cy, o === O.BRIAR ? [9, 10, 3] : undefined); }
    if (hp > 0) { m.hp.set(i, hp); return; }

    m.removeObject(i);
    this.stats.cleared++;
    if (rocky || woody) sfx.crumble(); else sfx.rustle();
    this.particles.leaves(cx, cy, rocky ? [13, 6, 12] : woody ? [8, 9, 7] : undefined);
    for (const d of props.drops ?? []) {
      if (Math.random() < d.chance) this.give(d.item, randInt(Math.random, d.min, d.max), cx, cy);
    }
    const pi = m.plotIndex(tx, ty);
    if (pi >= 0) {
      sfx.confirm();
      this.toast(`Garden plot cleared! (${m.plotsCleared()}/${m.def.plots.length})`);
    }
  }

  /** Add to inventory with a pop particle; overflow is reported. */
  give(id: string, n: number, cx: number, cy: number): void {
    if (n <= 0) return;
    const left = this.inv.add(id, n);
    const icon = ICON[id];
    if (icon) this.particles.pop(cx, cy, icon);
    if (left > 0) this.toast(`Bag full! ${left} ${ITEMS[id].name} left behind.`);
  }

  private refill(cx: number, cy: number): void {
    this.water = this.maxWater;
    sfx.refill();
    this.particles.splash(cx, cy);
    this.toast('Watering can refilled.');
  }

  private plant(tx: number, ty: number): void {
    const m = this.cur;
    const st = this.selected;
    if (!st) return;
    const def = ITEMS[st.id];
    const crop = def.crop ? CROP_BY_ID[def.crop] : undefined;
    if (!crop) return;
    const pi = m.plotIndex(tx, ty);
    if (pi < 0) { this.notice('Seeds need a garden plot. Head to the fenced garden.'); return; }
    if (m.obj(tx, ty) !== O.NONE) { this.notice('Clear this plot first.'); return; }
    const plot = m.plots[pi];
    if (!plot.tilled) { this.notice('Till the soil with the Hoe before planting.'); return; }
    if (plot.crop) { this.notice('Something is already growing here.'); return; }
    if (crop.bogOnly && !m.def.plots[pi].bog) { sfx.error(); this.notice(`${crop.name} only takes root in damp bog soil (the dark east column).`); return; }
    plot.crop = crop.id;
    plot.days = 0;
    this.inv.removeAt(this.sel, 1);
    sfx.plant();
    this.particles.clods(tx * 16 + 8, ty * 16 + 12, m.def.plots[pi].bog ? [3, 2] : [9, 10]);
  }

  private eat(): void {
    const st = this.selected;
    if (!st) return;
    const def = ITEMS[st.id];
    if (!def.edible) return;
    if (this.stamina >= this.maxStamina && !def.buff) { this.notice("You're not hungry right now."); return; }
    this.stamina = Math.min(this.maxStamina, this.stamina + def.edible);
    this.inv.removeAt(this.sel, 1);
    sfx.eat();
    this.progress.flags.add('did_eat');
    if (def.buff) this.progress.buffs[def.buff] = this.clock.day;
    const buffTxt = def.buff === 'stealth' ? ' STEALTH buff today!' : def.buff === 'calm' ? ' STEADY NERVES buff today!' : def.buff === 'haul' ? ' LONG HAUL buff today!' : def.buff === 'lucky' ? ' LUCKY buff today!' : '';
    this.toast(st.id === 'ghost_pepper' ? 'HOT! HOT! +2 energy... and tears.' : `Ate ${def.name}. +${def.edible} energy.${buffTxt}`);
    if (this.stamina >= 20) this.lowStaminaWarned = false;
  }

  /* ------------------------------------------------------------ */
  /* Interaction                                                   */
  /* ------------------------------------------------------------ */

  private interactKind(tx: number, ty: number): Interact | 'forage' | 'harvest' | 'structure' | null {
    const m = this.cur;
    if (!m.inBounds(tx, ty)) return null;
    const i = m.idx(tx, ty);
    if (m.forage.has(i)) return 'forage';
    const pi = m.plotIndex(tx, ty);
    if (pi >= 0) {
      const plot = m.plots[pi];
      const crop = plot.crop ? CROP_BY_ID[plot.crop] : null;
      if (crop && plot.days >= crop.days) return 'harvest';
    }
    const anchor = m.anchorIdx(i);
    const o = m.objects[anchor];
    if (o === O.BLOCK) { const s = m.structureAt(tx, ty); return s && !s.open ? 'structure' : null; }
    const k = objProps(o).interact;
    if (k) return k;
    return null;
  }

  /** NPC standing on (or just behind a counter at) the facing tile. */
  private npcFacing(tx: number, ty: number): NpcRT | null {
    const direct = this.townsfolk.at(this.cur.id, tx, ty);
    if (direct) return direct;
    const o = this.cur.objects[this.cur.anchorIdx(this.cur.idx(tx, ty))];
    if (o === O.COUNTER || o === O.REGISTER) {
      const [dx, dy] = DIR_VEC[this.player.dir];
      for (let k = 1; k <= 3; k++) {
        const n = this.townsfolk.at(this.cur.id, tx + dx * k, ty + dy * k)
          ?? this.townsfolk.at(this.cur.id, tx + dx * k + 1, ty + dy * k) ?? this.townsfolk.at(this.cur.id, tx + dx * k - 1, ty + dy * k);
        if (n) return n;
      }
    }
    return null;
  }

  private trackAt(tx: number, ty: number): { quest: string; index: number; kind: string; hint: string; total: number } | null {
    for (const { spec, tracks } of this.progress.tracksOn(this.cur.id)) {
      const index = tracks.findIndex((t) => t.x === tx && t.y === ty);
      if (index < 0) continue;
      if ((tracks[index].kind === 'page' || tracks[index].kind === 'book') && this.progress.quests[spec.quest].found.includes(index)) continue;
      return { quest: spec.quest, index, kind: tracks[index].kind, hint: tracks[index].hint, total: tracks.length };
    }
    return null;
  }

  /** Torn Vance journal pages lying in the wilds, resolved to walkable tiles. */
  journalPagesOn(map: MapId): Array<{ id: number; x: number; y: number }> {
    if (!this.pageSpots) {
      this.pageSpots = new Map();
      for (const pg of JOURNAL_PAGES) {
        if (!pg.map || pg.x === undefined || pg.y === undefined) continue;
        const m = this.getMap(pg.map);
        let spot: [number, number] = [pg.x, pg.y];
        search: for (let r = 0; r < 10; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const x = pg.x + dx, y = pg.y + dy;
          if (!m.blocked(x, y, true) && !m.portalAt(x, y) && m.obj(x, y) === O.NONE) { spot = [x, y]; break search; }
        }
        const list = this.pageSpots.get(pg.map) ?? [];
        list.push({ id: pg.id, x: spot[0], y: spot[1] });
        this.pageSpots.set(pg.map, list);
      }
    }
    // The last three pages (the warden cabin, the man in green, the last entry) turn up once Act III begins,
    // so the ending isn't lying in the town square on day one.
    return (this.pageSpots.get(map) ?? []).filter((p) => !this.progress.pages.has(p.id) && (p.id < 7 || this.progress.act >= 3));
  }

  /** A rebuilt room's player-placed things go back to the Storage Crate. */
  private refundRoom(ms: MapSave): void {
    const back: Record<number, string> = { [O.PEDESTAL]: 'display_pedestal', [O.HEMLOCK_PROP]: 'hemlock_prop', [O.BARN_STAR]: 'barn_star', [O.TORCH]: 'pitch_torch' };
    for (const [k, v] of Object.entries(MOUNT_OBJECT)) back[v] = k;
    for (const [, o] of ms.placed ?? []) { const it = back[o] ?? decoItemFor(o); if (it && ITEMS[it]) this.storage.add(it, 1); }
  }

  /** In someone's home, everything has a story. */
  private homeNote(tx: number, ty: number): string | null {
    const m = this.cur;
    if (!m.def.home || !m.inBounds(tx, ty)) return null;
    return m.def.signs.get(m.anchorIdx(m.idx(tx, ty))) ?? null;
  }

  private tryInteract(tx: number, ty: number): boolean {
    const page = this.journalPagesOn(this.cur.id).find((p) => p.x === tx && p.y === ty);
    if (page) {
      this.progress.pages.add(page.id);
      sfx.harvest();
      this.particles.pop(tx * 16 + 8, ty * 16 + 8, MISC.page);
      const pg = JOURNAL_PAGES[page.id];
      this.openOverlay(new Dialog([`You found a torn page from Ranger Vance's journal: "${pg.title}".`, pg.text, `(${[...this.progress.pages].filter((x) => x > 0).length}/${JOURNAL_PAGES.length - 1} pages. Read them all at the cabin table.)`]));
      return true;
    }
    const npc = this.npcFacing(tx, ty);
    if (npc) { talkTo(this, npc); return true; }
    if (mineInteract(this, tx, ty)) return true;
    if (decoInteract(this, tx, ty)) return true;
    if (visitorAt(this, tx, ty)) return true;
    if (this.progress.pet && this.companion.at(this, tx, ty)) { petPet(this); return true; }
    if (eventStallAt(this, tx, ty)) return true;
    const track = this.trackAt(tx, ty);
    if (track) { this.inspectTrack(track); return true; }
    const sign = this.sightings.at(tx, ty);
    if (sign) { this.sightings.engage(this, sign, 'quiet'); return true; }
    const homeNote = this.homeNote(tx, ty);
    if (homeNote) { sfx.blip(); this.openOverlay(new Dialog([homeNote])); return true; }
    if (this.cur.id === 'PINE_HOLLOW_TOWN' && this.isFestival() && tx === FESTIVAL_SPOTS.bonfire[0] && ty === FESTIVAL_SPOTS.bonfire[1]) { this.bonfireRoll(); return true; }
    if (this.stallAt(tx, ty)) { sfx.blip(); this.openOverlay(new Dialog([this.stallNote(tx, ty)])); return true; }
    const kind = this.interactKind(tx, ty);
    if (!kind) return false;
    const m = this.cur;
    const i = m.idx(tx, ty);
    const cx = tx * 16 + 8, cy = ty * 16 + 10;
    switch (kind) {
      case 'forage': {
        const id = m.forage.get(i)!;
        if (!this.inv.canFit(id)) { this.notice('Your bag is full. Store things in the cabin crate, or get a bigger bag at the Outfitter.'); sfx.error(); return true; }
        m.forage.delete(i);
        this.stats.foraged++;
        sfx.harvest();
        this.give(id, 1, cx, cy);
        this.toast(`Found ${ITEMS[id].name}!`);
        return true;
      }
      case 'harvest':
        this.harvest(tx, ty);
        return true;
      case 'structure': {
        const s = m.structureAt(tx, ty);
        if (s && !s.open && s.lockedMsg) { sfx.bump(); this.openOverlay(new Dialog([s.lockedMsg])); }
        return !!s && !s.open;
      }
      case 'bed':
        sfx.blip();
        this.openOverlay(new Dialog(['Climb into bed and end the day? (Crops grow, shipments pay out, and your journal is saved.)'], [
          { label: 'Sleep', fn: () => this.sleep(false) },
          { label: 'Not yet', fn: () => undefined },
        ]));
        return true;
      case 'desk': {
        const ok = this.saveGame();
        if (ok) { sfx.confirm(); this.toast('Field journal saved.'); }
        else { sfx.error(); this.toast('Could not save (storage blocked).'); }
        this.openOverlay(new JournalMenu());
        return true;
      }
      case 'dresser':
        sfx.open();
        this.openOverlay(new Dialog(['The old wardrobe. A speckled mirror is screwed to the inside of the door.'], [
          { label: 'Change clothes', fn: () => this.openOverlay(new DresserMenu(this)) },
          { label: 'Look in the mirror', fn: () => this.openOverlay(new CharacterCreator(this, 'mirror', () => undefined)) },
          { label: 'Leave', fn: () => undefined },
        ]));
        return true;
      case 'workbench':
        sfx.open();
        this.openOverlay(new Dialog(['The Porch Workbench. Your tools hang on nails, and the Town Restoration Ledger is tacked up over the vise.'], [
          { label: 'Craft', fn: () => this.openOverlay(new CraftMenu()) },
          { label: 'Restoration Ledger', fn: () => openLedger(this, 'bench') },
          { label: 'Leave', fn: () => undefined },
        ]));
        return true;
      case 'ledger':
        openLedger(this, 'museum');
        return true;
      case 'mine':
      case 'deco':
        return false;
      case 'pethouse':
        petHouseInteract(this);
        return true;
      case 'barnstar':
        sfx.blip();
        this.openOverlay(new Dialog(['Your painted barn star: eight points, red and gold, in a ring of tulips. The Snallygaster gives a yard with a star a wide berth, Omi says. (Snallygaster encounters start calmer while it stands.)'], [
          { label: 'Leave it up', fn: () => undefined },
          { label: 'Take it down', fn: () => {
            if (!this.inv.canFit('barn_star')) { sfx.error(); this.toast('Your bag is full.'); return; }
            this.cur.removeObject(this.cur.idx(tx, ty)); this.inv.add('barn_star', 1); sfx.confirm();
          } },
        ]));
        return true;
      case 'gazebo':
        gazeboRest(this);
        return true;
      case 'ship':
        this.shipSelected();
        return true;
      case 'barrel':
        this.refill(cx, cy);
        return true;
      case 'sign':
        sfx.blip();
        this.openOverlay(new Dialog([m.def.signs.get(m.anchorIdx(i)) ?? 'The sign is too weathered to read.']));
        return true;
      case 'radio':
        this.porchRadio();
        return true;
      case 'cat': {
        sfx.blip();
        const lines = ['The cat cracks one eye, decides you\'re all right, and purrs.', 'A scrap of a tabby. Somebody in town has been feeding it -- probably everybody.', 'The cat stretches, shows you its belly, and dares you to try.'];
        this.openOverlay(new Dialog([lines[(this.clock.day + tx + ty) % lines.length]]));
        return true;
      }
      case 'dog': {
        sfx.blip();
        this.openOverlay(new Dialog(['The old hound thumps his tail twice without opening his eyes. That\'s about as excited as he gets these days.']));
        return true;
      }
      case 'gumball': {
        if (this.gold < 1) { sfx.error(); this.openOverlay(new Dialog(['It takes a penny. You don\'t have one.'])); return true; }
        this.gold -= 1;
        sfx.coin();
        const c = ['cranberry red', 'buckwheat brown', 'Golden Delicious yellow', 'Mothman black', 'ramp green'][(this.clock.day + this.clock.minutes) % 5];
        this.openOverlay(new Dialog([`Crank, rattle, clunk. A ${c} gumball. It tastes faintly of the 1970s. (-1g)`]));
        return true;
      }
      case 'rocker': {
        sfx.blip();
        const h = Math.floor(this.clock.minutes / 60) % 24;
        const view = h < 6 || h >= 21 ? 'The holler is dark. Somewhere past the creek, something whistles back.' : h >= 18 ? 'The ridges go blue, then violet. Lightning bugs come up out of the grass.' : 'Wind in the pines. A crow argues with nobody in particular.';
        this.openOverlay(new Dialog(['You sit a spell and rock on the porch. The old chair creaks just right.', view]));
        return true;
      }
      case 'mailbox':
        this.readMail();
        return true;
      case 'fireplace':
        sfx.blip();
        this.openOverlay(new Dialog(['The fire pops and crackles. Pine smoke and warmth fill the cabin.']));
        return true;
      case 'pedestal':
        sfx.open();
        this.openOverlay(new PedestalMenu(`${m.id}:${m.anchorIdx(i)}`));
        return true;
      case 'bookshelf':
        sfx.blip();
        this.openOverlay(new Dialog([
          '"Field Guide to the Allegheny Barrens, 3rd Ed." A page is dog-eared: "Lures matter. A Jackalope will cross a whole meadow for Wild Clover."',
          'Scrawled in the margin: "Tall grass rustles when you walk through it. Some nights, something rustles back."',
        ]));
        return true;
      case 'stove':
        if (m.id === 'CABIN_INTERIOR') { sfx.open(); this.openOverlay(new CraftMenu('stove')); return true; }
        sfx.blip();
        this.openOverlay(new Dialog(['A cast-iron stove, still warm. A kettle hums quietly.']));
        return true;
      case 'snare':
        this.checkSnare(i, cx, cy);
        return true;
      case 'handcar':
        this.useHandcarStop();
        return true;
      case 'crate':
        if (m.id === 'CABIN_INTERIOR') { sfx.open(); this.openOverlay(new StorageMenu()); return true; }
        sfx.blip();
        this.openOverlay(new Dialog(['A crate of old ranger gear: rope, flares, and a box of film for a camera you don\'t own yet.']));
        return true;
      case 'lamp':
        sfx.blip();
        this.openOverlay(new Dialog(['A kerosene lamp post. It lights itself at dusk, somehow.']));
        return true;
      case 'table':
        if (m.id === 'CABIN_INTERIOR') {
          sfx.open();
          if (!this.progress.flags.has('journal')) { this.progress.flags.add('journal'); this.toast("Ranger Vance's Field Journal added to your story."); }
          this.openOverlay(new VanceJournal());
          return true;
        }
        sfx.blip();
        this.openOverlay(new Dialog(['A worn table. Someone carved "J.D. WAS HERE" with a claw-sized gouge.']));
        return true;
      case 'woodpile':
        sfx.blip();
        this.openOverlay(new Dialog(['Split pine, neatly stacked. Smells like resin.']));
        return true;
      case 'plant':
        sfx.blip();
        this.openOverlay(new Dialog(['A leafy fern in a clay pot. It seems happy.']));
        return true;
      case 'apple': {
        const ai = m.anchorIdx(i);
        m.shake.set(ai, this.time + 0.5);
        sfx.shake();
        this.particles.leaves(cx, cy - 10);
        if (m.shaken.has(ai)) { this.notice('No more ripe apples on this tree today.'); return true; }
        if (!this.inv.canFit('wild_apple')) { this.notice('Your bag is full. Store things in the cabin crate, or get a bigger bag at the Outfitter.'); sfx.error(); return true; }
        m.shaken.add(ai);
        this.give('wild_apple', 1 + (Math.random() < 0.4 ? 1 : 0), cx, cy - 4);
        this.toast('A Golden Delicious drops!');
        return true;
      }
      case 'hollow': {
        sfx.blip();
        const day = this.clock.day;
        const lucky = (i * 31 + day * 17) % 5 === 0;
        const pick = ['wild_honeycomb', 'foraged_egg', 'charred_wood', 'scrap_copper'][(i + day) % 4];
        if (lucky && !m.shaken.has(i) && !this.inv.canFit(pick)) { this.notice('Your bag is full. Store things in the cabin crate, or get a bigger bag at the Outfitter.'); sfx.error(); return true; }
        if (lucky && !m.shaken.has(i)) {
          m.shaken.add(i);
          this.give(pick, 1, cx, cy);
          this.toast(`Something was tucked inside: ${ITEMS[pick].name}!`);
        } else this.openOverlay(new Dialog(['You peer into the hollow log. Musty darkness... and a few long, coarse hairs.']));
        return true;
      }
      case 'sawblade':
        sfx.blip();
        this.openOverlay(new Dialog(['A rusted six-foot saw blade. Deep gouges on it look like... claw marks? Something sharpened itself here.']));
        return true;
      case 'rodbase':
        sfx.blip();
        this.openOverlay(new Dialog(['A concrete lightning-rod mount. Place a Copper Lightning Rod on open ground here on Radio Ridge, then wait for a thunderstorm.']));
        return true;
      case 'mount':
        this.interactMount(m.anchorIdx(i));
        return true;
      case 'trap':
        dismantleTrap(this, m.anchorIdx(i));
        return true;
      case 'board':
        this.progress.flags.add('did_board');
        sfx.open();
        this.openOverlay(new BoardMenu());
        return true;
      case 'counter':
        sfx.blip();
        this.openOverlay(new Dialog([m.id === 'DINER_INT' ? 'A bell sits on the counter. "SERVING 6:15 AM TO 9 PM. BREAK 2 TO 2:30. SUNDAY BREAKFAST 8 TO 11 -- ALL WELCOME."' : m.id === 'STORE_INT' ? 'A sign: "OPEN 8 TO 5. LUNCH 12 TO 1. SUNDAYS CLOSED AFTER 1. Afternoons I\'m at the anvil out back. -- G.T."' : 'The front desk. Agnes keeps hours 8 AM to 5 PM.']));
        return true;
      case 'case': {
        const cid = m.def.meta?.get(m.anchorIdx(i)) ?? '';
        const c = CRYPTIDS.find((x) => x.id === cid);
        sfx.blip();
        if (!c) return true;
        const num = `No.${String(c.num).padStart(2, '0')}`;
        const lore = LORE[c.id];
        this.openOverlay(new Dialog(this.progress.donated.has(c.id) ? [
          `${num} ${c.name}. Specimen: ${c.drop.name}. "Donated by {name}, Fire-Watch Ranger."`,
          ...(lore ? [`Agnes's placard, in her careful copperplate: "${lore.legend}"`] : [c.look]),
        ] : [
          `An empty case labeled ${num} ${this.dex[c.id].seen ? c.name : '?????'}. Agnes is waiting for a specimen.`]));
        return true;
      }
      case 'kiosk':
        if (this.progress.has('giftshop')) { sfx.open(); this.openOverlay(new ShopMenu('MUSEUM GIFT SHOP', () => GIFT_STOCK)); }
        else { sfx.blip(); this.openOverlay(new Dialog(['GIFT SHOP -- COMING SOON. "Opens when the collection reaches 16 specimens." -A.V.'])); }
        return true;
      case 'maptable':
        this.readSurvey(m.def.meta?.get(m.anchorIdx(i)) ?? '');
        return true;
      case 'railcar':
        sfx.blip();
        this.openOverlay(new Dialog([this.progress.has('grant')
          ? 'The rail car has been sanded, painted cranberry red, and greased. A brass plate reads: EXPANSION LINE -- SERVICE COMING SOON.'
          : 'A rail car rusted solid to the tracks. Something has been sleeping inside: tufts of black fur cover the seats.']));
        return true;
      case 'booth':
        sfx.blip();
        this.openOverlay(new Dialog(['TICKET BOOTH. A faded timetable lists stops nobody has visited in decades: Hollow Junction, Point Pleasant, Flatwoods, Bray Road...']));
        return true;
      case 'signal':
        sfx.blip();
        this.openOverlay(new Dialog([funded(this, 'station') ? 'The signal lantern burns a steady red down the line, rewired with the town\'s own money.' : 'The old signal lantern flickers on its own. There are no wires.']));
        return true;
      case 'jukebox':
        sfx.fanfare();
        this.toast('The jukebox plays "Moonlight in the Holler" (1958).');
        return true;
      case 'grill':
        sfx.blip();
        this.openOverlay(new Dialog(['The griddle sizzles. Pancake batter, onions, and something Mabel calls "Squonk-style hash" (it is just potatoes).']));
        return true;
      case 'shelf':
        sfx.blip();
        this.openOverlay(new Dialog([m.id === 'STORE_INT' ? 'Shelves of canned beans, film canisters, rope, and a jar labeled "JACKALOPE JERKY (NOT REAL)".' : m.id === 'DINER_INT' ? 'Jars of pie fillings and a framed health certificate from 1962.' : 'Shelves of preserved oddities.']));
        return true;
      case 'anvil':
        sfx.rockHit();
        this.openOverlay(new Dialog(["Gideon's anvil and forge. Talk to Gideon during shop hours for tool & gear upgrades."]));
        return true;
      case 'fountain':
        sfx.water();
        this.openOverlay(new Dialog(['The Founders Fountain. Coins glint at the bottom, along with a single antler.']));
        return true;
      case 'poster':
        sfx.blip();
        this.openOverlay(new Dialog([m.id === 'DINER_INT' ? 'A poster: "PINE HOLLOW FOLKLORE FESTIVAL -- Sundays after donations reach 24! Merchants! Bonfire! Pie!"' : 'A faded poster of a red-eyed silhouette: "HAVE YOU SEEN ME? Report sightings to WKPB."']));
        return true;
    }
  }

  private inspectTrack(t: { quest: string; index: number; kind: string; hint: string; total: number }): void {
    const q = this.progress.quests[t.quest];
    if (t.kind === 'page' || t.kind === 'book') {
      q.found.push(t.index);
      sfx.harvest();
      const pages = q.found.length;
      if (pages >= t.total) {
        this.progress.setStage('sketchbook', 2);
        this.openOverlay(new Dialog(['You found the red sketchbook and all its loose pages! Drawings of Jackalopes, a Hoop Snake... and a very tall pair of legs.', 'Quest updated: return it to Pippa & Sam.']));
      } else this.toast(t.kind === 'book' ? `Found the sketchbook! (${pages}/${t.total}) Some pages are still missing.` : `Found a sketch page! (${pages}/${t.total})`);
      return;
    }
    sfx.blip();
    const what = t.kind === 'paw' ? 'Fresh bloodhound pawprints' : 'Muddy boot prints, size 9';
    this.toast(t.hint === 'here' ? `${what} end right here!` : `${what}. They lead ${t.hint}.`);
  }

  private readSurvey(key: string): void {
    const text: Record<string, string> = {
      totems: 'SURVEY MAP: OLD GROWTH. "Three carved lure totems placed among the hemlocks; visit one at DUSK. The Elder (Sasquatch) comes for honeycomb and apples." Pencilled below: Totem = charred wood (old logs and stumps, the burn scar) + wild honeycomb + wild acorn (both forage in the hemlocks and on Pine Trail).',
      chime: 'SURVEY MAP: OLD GROWTH. "A Bone & Antler Chime hung in the Old Growth rings for the WENDIGO in the WITCHING HOUR, but only in FOG or SNOW. Hold breath when its eyes flare." Pencilled below: Chime = Frost-Rim Antler (Old Growth leaf litter, or Ezri on foggy nights) + Silver Silk (from a logged Fresno Nightcrawler) + pine resin.',
      rod: 'SURVEY MAP: RADIO RIDGE. "A Copper Lightning Rod on the ridge during a THUNDERSTORM calls down the THUNDERBIRD. It also roams storms on its own." Pencilled below: Rod = 3 scrap copper (slag heaps, sawmill, ridge summit) + 1 iron nail. Storms come in every season, even as thundersnow in winter.',
      weaver: 'SURVEY MAP: CROSSROADS. "The Weaver walks the Crossroads in the foggy WITCHING HOUR, only for researchers with 3-Star Nightcrawler and Will-o-the-Wisp entries. Lunar Dew."',
      awful: 'SURVEY MAP: HIGH CLIFFS. "The Awful perches on Radio Ridge\'s western cliffs at DAWN, or any time during a THUNDERSTORM. Never cower."',
    };
    this.progress.archiveRead = true;
    sfx.open();
    this.openOverlay(new Dialog([text[key] ?? 'A map too water-damaged to read.', 'Survey notes copied into your Cryptid-Dex.']));
  }

  private interactMount(i: number): void {
    const m = this.cur;
    const o = m.objects[i];
    const name = objProps(o).name;
    const summon = this.summonAt(o);
    if (summon) {
      sfx.summon();
      this.summoned.add(`${m.id}:${summon.id}`);
      const variant = rollVariant(Math.random, this.rareMult(), o === O.PYLON || m.countPlaced(O.PYLON) > 0);
      this.openOverlay(new Dialog([`The ${name} ${o === O.CHIME ? 'rings by itself in the fog' : o === O.ROD ? 'crackles as lightning arcs into it' : o === O.PYLON ? 'hums and arcs violet light' : 'creaks... the forest goes silent'}. Something answers.`], [
        { label: 'Investigate', fn: () => this.startEncounter(summon, variant, false, true) },
        { label: 'Back away', fn: () => this.summoned.delete(`${m.id}:${summon.id}`) },
      ]));
      return;
    }
    if (wardenMount(this, o)) return;
    const hint: Record<number, string> = {
      [O.TOTEM]: `Totems in this region: ${m.countPlaced(O.TOTEM)}/3. In the Old Growth, three totems at dusk call something enormous.`,
      [O.CHIME]: 'The chime hangs still. In the Old Growth it rings for something during the foggy (or snowy) Witching Hour.',
      [O.ROD]: 'The copper rod waits. On Radio Ridge, a thunderstorm brings its guardian down.',
      [O.PYLON]: 'The coil hums. On clear nights it draws electric cryptids, and nearby rare variants come out Static-Charged.',
    };
    sfx.blip();
    this.openOverlay(new Dialog([hint[o] ?? `A ${name}.`], [
      { label: 'Leave it', fn: () => undefined },
      { label: 'Take it down', fn: () => this.takeDownMount(i) },
    ]));
  }

  private takeDownMount(i: number): void {
    const m = this.cur;
    const o = m.objects[i];
    const id = Object.keys(MOUNT_OBJECT).find((k) => MOUNT_OBJECT[k] === o);
    if (!id) return;
    if (!this.inv.canFit(id)) { this.notice('Your bag is full. Store things in the cabin crate, or get a bigger bag at the Outfitter.'); sfx.error(); return; }
    m.removeObject(i);
    const x = i % m.w, y = Math.floor(i / m.w);
    this.give(id, 1, x * 16 + 8, y * 16 + 8);
    sfx.confirm();
  }

  private harvest(tx: number, ty: number): void {
    const m = this.cur;
    const pi = m.plotIndex(tx, ty);
    const plot = m.plots[pi];
    const crop = plot.crop ? CROP_BY_ID[plot.crop] : null;
    if (!crop) return;
    const n = randInt(Math.random, crop.yield[0], crop.yield[1]);
    if (!this.inv.canFit(crop.produce)) { sfx.error(); this.notice('Your bag is full!'); return; }
    sfx.harvest();
    this.give(crop.produce, n, tx * 16 + 8, ty * 16 + 8);
    this.stats.harvested += n;
    if (crop.regrow) plot.days = crop.days - crop.regrow;
    else { plot.crop = null; plot.days = 0; }
    this.particles.leaves(tx * 16 + 8, ty * 16 + 10);
  }

  private shipSelected(): void {
    const st = this.selected;
    const pending = this.pendingPayout();
    if (!st || ITEMS[st.id].price <= 0) {
      sfx.blip();
      this.openOverlay(new Dialog([`SHIPPING BIN. Hold an item and press A to ship the whole stack. Payment arrives at dawn. Pending: ${pending}g.`]));
      return;
    }
    const def = ITEMS[st.id];
    const existing = this.shipped.find((s) => s.id === st.id);
    if (existing) existing.n += st.n; else this.shipped.push({ id: st.id, n: st.n });
    this.inv.slots[this.sel] = null;
    sfx.coin();
    this.progress.flags.add('did_ship');
    this.toast(`Shipped ${st.n} ${def.name} (+${def.price * st.n}g at dawn)`);
  }

  private readMail(): void {
    if (this.mailRead < 1) {
      this.mailRead = 1;
      sfx.confirm();
      this.openOverlay(new Dialog([
        'A letter from Agnes Vance, Pine Hollow Historical Society:',
        '"Dear Ranger, welcome! The previous ranger left seeds in your bag and a Mail-Order Catalog at the Porch Workbench. Grow lures, sell extras in the Shipping Bin, and keep notes on anything... unusual."',
        '"P.S. Clear those overgrown garden plots. Your predecessor let the brush swallow two thirds of them. -A.V."',
      ]));
      return;
    }
    if (this.mailRead < 2) {
      this.mailRead = 2;
      sfx.confirm();
      this.openOverlay(new Dialog([
        'A second letter, on Historical Society stationery:',
        '"Ranger -- do visit Pine Hollow! Take the east road past your bridge, or the south-east road off Pine Trail. Mabel will feed you, Gideon will outfit you, and I will gladly accept any specimen you bring."',
        '"Workbench crafting recipes are enclosed. And should you see two odd merchants in the Square on a foggy night... buy the blueprints. Trust me. -A.V."',
      ]));
      return;
    }
    const letter = this.unreadLetters()[0];
    if (letter) {
      this.progress.flags.add(`read_${letter.id}`);
      if (letter.gift) this.inv.add(letter.gift[0], letter.gift[1]);
      if (letter.id === 'agnes24') this.progress.firstFest = this.clock.day;
      sfx.confirm();
      const more = this.unreadLetters().length;
      this.openOverlay(new Dialog(more ? [...letter.pages, '(There\'s another letter under this one.)'] : [...letter.pages]));
      return;
    }
    sfx.blip();
    this.openOverlay(new Dialog(['No new mail today.']));
  }

  private computePrompt(): string {
    const [tx, ty] = this.player.facing();
    const kind = this.interactKind(tx, ty);
    const labels: Partial<Record<string, string>> = {
      forage: 'PICK UP', harvest: 'HARVEST', bed: 'SLEEP', desk: 'SAVE', dresser: 'WARDROBE', workbench: 'WORKBENCH', trap: 'DISMANTLE', gazebo: 'SIT', ledger: 'LEDGER',
      ship: 'SHIP', barrel: 'REFILL', sign: 'READ', rocker: 'SIT', radio: 'RADIO', cat: 'PET', dog: 'PET', gumball: 'GUMBALL 1G', mailbox: 'MAIL', fireplace: 'LOOK',
      bookshelf: 'READ', structure: 'LOOK', apple: 'SHAKE', hollow: 'SEARCH', sawblade: 'LOOK', rodbase: 'LOOK',
      board: 'READ BOARD', case: 'LOOK', kiosk: 'GIFT SHOP', maptable: 'STUDY', railcar: 'LOOK', pedestal: 'DISPLAY',
    };
    if (this.journalPagesOn(this.cur.id).some((pg) => pg.x === tx && pg.y === ty)) return 'PICK UP PAGE';
    if (kind === 'table' && this.cur.id === 'CABIN_INTERIOR') return 'READ JOURNAL';
    if (kind === 'pethouse') return this.progress.pet ? (this.progress.pet.along ? 'SEND HOME' : 'TAKE ALONG') : 'LOOK';
    if (kind === 'deco') { const dd = DECO_BY_OBJ[this.cur.obj(tx, ty)]; return dd?.item === 'deco_coop' ? 'COOP' : dd?.item === 'deco_fire_pit' ? 'FIRE PIT' : 'LOOK'; }
    if (this.cur.id === 'CABIN_INTERIOR' && this.cur.ground(tx, ty) === T.WALL_BASE && WALL_DECOS.has(this.cur.obj(tx, ty - 1))) return 'LOOK';
    if (kind === 'crate' && this.cur.id === 'CABIN_INTERIOR') return 'STORAGE';
    if (kind === 'stove' && this.cur.id === 'CABIN_INTERIOR') return 'COOK';
    const held = this.selected ? ITEMS[this.selected.id]?.tool : undefined;
    if (held === 'rod' && !kind) { const [dx, dy] = DIR_VEC[this.player.dir]; if (waterAt(this.cur, tx, ty) || waterAt(this.cur, tx + dx, ty + dy)) return 'FISH'; }
    if ((held === 'bow' || held === 'rifle') && this.wildlife.inSights(this, this.player.dir, WEAPONS[held].range)) return 'SHOOT';
    if (kind === 'handcar') return this.stopActive(this.cur.id) ? 'RIDE HANDCAR' : this.stopRepaired(this.cur.id) ? 'HANDCAR' : 'REPAIR STOP';
    if (kind === 'snare') return this.cur.snares.get(this.cur.idx(tx, ty)) ? 'COLLECT' : 'CHECK SNARE';
    if (this.selected?.id === 'static_radio' && this.progress.act === 4 && this.cur.zonesAt(this.player.tx, this.player.ty).includes('crossroads')) return 'TUNE RADIO';
    const npc = this.npcFacing(tx, ty);
    if (npc) return npc.inBed ? 'SHH...' : `TALK: ${npc.def.name.split(' ')[0].replace(/"/g, '').toUpperCase()}`;
    if (this.homeNote(tx, ty)) return 'LOOK';
    if (this.sightings.at(tx, ty)) return 'RAISE CAMCORDER';
    if (this.cur.id === 'PINE_HOLLOW_TOWN' && this.isFestival() && tx === FESTIVAL_SPOTS.bonfire[0] && ty === FESTIVAL_SPOTS.bonfire[1]) return 'PEPPERONI ROLL';
    if (this.stallAt(tx, ty)) return 'LOOK';
    const tr = this.trackAt(tx, ty);
    if (tr) return tr.kind === 'page' || tr.kind === 'book' ? 'PICK UP' : 'INSPECT TRACKS';
    if (kind === 'mount') {
      const o = this.cur.objects[this.cur.anchorIdx(this.cur.idx(tx, ty))];
      return this.summonAt(o) ? 'INVESTIGATE!' : 'CHECK MOUNT';
    }
    if (kind && labels[kind]) return labels[kind]!;
    const st = this.selected;
    if (!st) return '';
    const def = ITEMS[st.id];
    const m = this.cur;
    const o = m.obj(tx, ty);
    const props = objProps(o);
    const pi = m.plotIndex(tx, ty);
    if (def.tool === 'can') {
      if (m.ground(tx, ty) === T.WATER) return 'REFILL';
      if (pi >= 0 && m.plots[pi].tilled && !m.plots[pi].watered && o === O.NONE) return 'WATER';
      return '';
    }
    if (def.tool === 'hoe') {
      if (props.tool === 'hoe') return 'BREAK';
      if (pi >= 0 && o === O.NONE && !m.plots[pi].tilled) return 'TILL';
      return '';
    }
    if (def.tool === 'machete') return props.tool === 'machete' ? 'CUT' : '';
    if (def.kind === 'seed' && pi >= 0 && m.plots[pi].tilled && !m.plots[pi].crop && o === O.NONE) return 'PLANT';
    if (def.kind === 'placeable' && this.cur.def.wild && o === O.NONE && !this.cur.blocked(tx, ty)) return 'PLACE';
    if (def.kind === 'placeable' && canPlaceDeco(this, st.id, tx, ty)) return this.cur.ground(tx, ty) === T.WALL_BASE ? 'HANG' : 'PLACE';
    if (def.edible && kind === null && o === O.NONE) return 'EAT';
    return '';
  }

  /* ------------------------------------------------------------ */
  /* Day cycle                                                     */
  /* ------------------------------------------------------------ */

  sleep(passOut: boolean): void {
    sfx.sleep();
    this.transition(() => {
      const summary = this.overnight(passOut);
      this.enterMap(BED_SPAWN.map, BED_SPAWN.x, BED_SPAWN.y, BED_SPAWN.dir);
      this.banner.t = 0;
      this.openOverlay(new SleepSummary(summary.title, summary.lines));
      sfx.morning();
    });
  }

  private passOut(): void {
    this.sleep(true);
  }

  private overnight(passOut: boolean): { title: string; lines: string[] } {
    const lines: string[] = [];
    const payout = this.pendingPayout();
    if (payout > 0) {
      const count = this.shipped.reduce((a, s) => a + s.n, 0);
      lines.push(`Shipped ${count} item${count === 1 ? '' : 's'}: +${payout}g`);
      this.gold += payout;
      this.stats.shippedGold += payout;
    }
    this.shipped = [];

    let grew = 0, ready = 0, thirsty = 0;
    for (const m of this.maps.values()) {
      for (const plot of m.plots) {
        const crop = plot.crop ? CROP_BY_ID[plot.crop] : null;
        if (crop) {
          if (plot.watered && plot.days < crop.days) { plot.days++; grew++; }
          else if (!plot.watered && plot.days < crop.days) thirsty++;
          if (plot.days >= crop.days) ready++;
        }
        plot.watered = false;
      }
    }
    if (grew) lines.push(`${grew} crop${grew === 1 ? '' : 's'} grew overnight.`);
    if (ready) lines.push(`${ready} crop${ready === 1 ? ' is' : 's are'} ready to harvest!`);
    if (thirsty) lines.push(`${thirsty} unwatered crop${thirsty === 1 ? '' : 's'} didn't grow.`);

    if (passOut) {
      const lost = Math.min(250, Math.floor(this.gold * 0.1));
      this.gold -= lost;
      lines.unshift('You collapsed on the trail at 2 AM.');
      lines.push(lost > 0 ? `Someone carried you home... ${lost}g went missing.` : 'Someone carried you home.');
    }

    // Remember last night's weather: the town will talk about it in the morning.
    if (this.dayWeather.evening === 'STORM' || this.dayWeather.morning === 'STORM') markMilestone(this, 'storm');
    if (this.dayWeather.evening === 'FOG') markMilestone(this, 'fog');
    this.clock.newDay();
    this.clock.minutes = DAY_START;
    this.summoned.clear();
    this.rollDayWeather();
    const wm = this.dayWeather.morning;
    if (wm === 'RAIN' || wm === 'STORM') {
      let n = 0;
      for (const mm of this.maps.values()) for (const plot of mm.plots) if (plot.tilled) { plot.watered = true; n++; }
      if (n) lines.push('Rain is falling -- the garden is watered.');
    }
    const moon = moonPhase(this.clock.day);
    lines.push(`Forecast: ${WEATHER_LABEL[wm]}${this.dayWeather.evening !== wm ? `, ${WEATHER_LABEL[this.dayWeather.evening]} tonight` : ''}. ${moon.label}.`);
    this.stamina = passOut ? Math.floor(this.maxStamina * 0.6) : this.maxStamina;
    this.lowStaminaWarned = false;
    this.stats.daysPlayed++;
    const kids = rescueOvernight(this);
    if (kids) lines.push(kids);
    lines.push(...morningNews(this.clock.day, this.progress.flags.has('finale')));
    if (this.progress.days.memorial === this.clock.day) lines.push('Tonight: Memorial Night in the Town Park, 7 to 11 PM. Twelve lanterns for the men of the 1914 shift.');
    if (this.unreadLetters().length) lines.push('There\'s a letter waiting in your mailbox.');
    if (this.progress.has('festival') && this.clock.weekday === 'Sun') lines.push('Tonight: the Pine Hollow Folklore Festival in the Town Park!');
    else if (this.dayWeather.evening === 'FOG') lines.push('Fog tonight: the Traveling Merchants may visit the Town Square.');
    for (const m of this.maps.values()) { m.spawnForage(this.clock.day, this.forageBoosts()); checkSnares(m); }
    const gift = petOvernight(this);
    if (gift) lines.push(gift);
    lines.push(...homesteadOvernight(this));
    this.player.place(BED_SPAWN.x, BED_SPAWN.y, BED_SPAWN.dir);
    this.cur = this.getMap(BED_SPAWN.map);
    lines.push(this.saveGame() ? 'Field journal saved.' : 'Warning: could not save.');
    return { title: `${this.clock.season} ${this.clock.dayOfSeason} - ${this.clock.weekday}`, lines };
  }

  /* ------------------------------------------------------------ */
  /* Ambience                                                      */
  /* ------------------------------------------------------------ */

  private updateAmbience(dt: number): void {
    const m = this.cur;
    if (m.id === 'CABIN_YARD' && this.clock.phase() !== 'day' && this.progress.radioDay !== this.clock.day && this.radioHintDay !== this.clock.day && !this.overlays.length) {
      this.radioHintDay = this.clock.day;
      sfx.radioStatic();
      this.toast(this.progress.act >= 3 && !this.progress.flags.has('finale') ? 'The porch radio crackles. A faint voice, far up the ridge.' : 'The porch radio crackles. Someone is checking in.');
    }
    const wNow = this.weatherNow();
    if (!m.def.indoor && (wNow === 'RAIN' || wNow === 'STORM')) {
      this.rainT -= dt;
      if (this.rainT <= 0) { this.rainT = 0.35; sfx.rain(); }
    }
    this.ambientT -= dt;
    if (this.ambientT <= 0) {
      this.ambientT = 2 + Math.random() * 5;
      if (!m.def.indoor) {
        const ph = this.clock.phase();
        const w = this.weatherNow();
        if (w === 'STORM' || w === 'RAIN' || w === 'SNOW' || w === 'FOG') { this.ambientT = 3 + Math.random() * 4; return; }
        if (ph === 'night' || ph === 'witching') sfx.cricket();
        else if (ph === 'day' && Math.random() < 0.6) sfx.bird();
      }
    }
    // Chimney smoke + ripe-crop sparkle
    this.smokeT -= dt;
    if (this.smokeT <= 0) {
      this.smokeT = 0.3;
      for (const s of m.def.structures) if (s.chimney) this.particles.smoke(s.x * 16 + s.chimney[0], s.y * 16 + s.chimney[1]);
      for (const [fx, fy] of fireSmoke(this)) this.particles.smoke(fx, fy);
      // Mineral-spring steam
      for (let k = 0; k < 6; k++) {
        const x = Math.floor(this.cam.x / 16) + Math.floor(Math.random() * (this.w / 16 + 1));
        const y = Math.floor(this.cam.y / 16) + Math.floor(Math.random() * (this.h / 16 + 1));
        if (m.ground(x, y) === T.SPRING) this.particles.smoke(x * 16 + 8, y * 16 + 10);
      }
      if (Math.random() < 0.5) {
        m.def.plots.forEach((pd, i) => {
          const plot = m.plots[i];
          const crop = plot.crop ? CROP_BY_ID[plot.crop] : null;
          if (crop && plot.days >= crop.days && Math.random() < 0.15) this.particles.sparkle(pd.x * 16 + 8, pd.y * 16 + 8);
        });
      }
    }
  }
}

/** How the game refers to each friend in hints. */
const FRIEND_SHORT: Record<string, string> = {
  agnes: 'Agnes', barnaby: 'Barney', mabel: 'Mabel', gideon: 'Gideon', clara: 'Dr. Okafor', pippa: 'Pippa', sam: 'Sam', toby: 'Toby', ruth: 'Ruth',
  liesl: 'Omi Liesl', matthias: 'Matthias', walter: 'Opa Walter',
};
