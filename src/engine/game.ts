/**
 * Game orchestrator: owns world state, runs the update loop, resolves tool
 * use / interaction, and drives the sleep → grow → ship → save day cycle.
 */
import { Input } from '../input/input';
import { Camera } from '../graphics/camera';
import { Particles } from '../graphics/particles';
import { Lighting } from '../graphics/lighting';
import { ICON } from '../graphics/sprites';
import type { Look } from '../graphics/playerSprite';
import { sfx, Surface } from '../audio/sfx';
import { Clock, DAY_START } from './clock';
import { Inventory, Stack, HOTBAR_SIZE } from './inventory';
import { MapRuntime } from './world';
import { Player, TOOL_DURATION } from './player';
import { SaveData, Stats, writeSave, SAVE_VERSION, MapSave } from './save';
import { BUILT_MAPS, BED_SPAWN, MapId, MAP_NAMES } from '../data/maps';
import { O, T, objProps, Interact } from '../data/tiles';
import { CROP_BY_ID, ITEMS, STARTING_ITEMS, ToolKind } from '../data/items';
import { OUTFITS, HATS } from '../data/outfits';
import type { Dir } from '../util';
import { DIR_VEC, randInt } from '../util';
import type { Overlay } from '../ui/overlay';
import { Dialog, BagMenu, CatalogMenu, DresserMenu, JournalMenu, SleepSummary } from '../ui/menus';
import { TitleScreen } from '../ui/title';
import { renderWorld } from './render';
import { drawHud, hotbarHit } from '../ui/hud';

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
  gold = START_GOLD;
  stamina = MAX_STAMINA;
  readonly maxStamina = MAX_STAMINA;
  water = MAX_WATER;
  readonly maxWater = MAX_WATER;
  sel = 0;
  look: Look = { outfit: 'ranger_jacket', hat: 'ranger_cap' };
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

  constructor(readonly canvas: HTMLCanvasElement, readonly g: CanvasRenderingContext2D) {}

  /* ------------------------------------------------------------ */
  /* Setup                                                         */
  /* ------------------------------------------------------------ */

  getMap(id: MapId): MapRuntime {
    let m = this.maps.get(id);
    if (!m) { m = new MapRuntime(id); this.maps.set(id, m); }
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
    this.gold = START_GOLD;
    this.stamina = MAX_STAMINA;
    this.water = MAX_WATER;
    this.sel = 0;
    this.look = { outfit: 'ranger_jacket', hat: 'ranger_cap' };
    this.wardrobe = this.starterWardrobe();
    this.maps.clear();
    this.shipped = [];
    this.stats = freshStats();
    this.mailRead = 0;
    this.getMap('CABIN_YARD').spawnForage(1);
    this.enterMap(BED_SPAWN.map, BED_SPAWN.x, BED_SPAWN.y, BED_SPAWN.dir);
    this.mode = 'play';
    this.overlays = [];
    this.openOverlay(new Dialog([
      'Welcome to the Pine Barrens, Ranger. This old cabin is yours now: a garden out front, a creek out back, and woods full of things nobody can quite explain.',
      'Grow lure crops, clear the overgrown garden plots, and keep your field journal. Sleep in your bed to end each day and save. Check the mailbox outside for a letter!',
    ]));
  }

  loadGame(d: SaveData): void {
    this.clock = new Clock();
    this.clock.day = d.day;
    this.clock.minutes = d.minutes;
    this.inv = new Inventory();
    d.inv.forEach((s, i) => { if (i < this.inv.slots.length && s && ITEMS[s.id]) this.inv.slots[i] = { id: s.id, n: s.n }; });
    this.gold = d.gold;
    this.stamina = d.stamina;
    this.water = d.water;
    this.sel = Math.min(HOTBAR_SIZE - 1, Math.max(0, d.sel));
    this.look = { ...d.look };
    this.wardrobe = new Set([...this.starterWardrobe(), ...d.wardrobe]);
    this.maps.clear();
    for (const [id, ms] of Object.entries(d.maps) as Array<[MapId, MapSave]>) {
      if (!BUILT_MAPS.has(id)) continue;
      const m = this.getMap(id);
      m.applyRemoved(ms.removed);
      for (const [i, item] of ms.forage) m.forage.set(i, item);
      ms.plots.forEach((p, i) => { if (m.plots[i]) Object.assign(m.plots[i], p); });
      for (const [i, hp] of ms.hp) m.hp.set(i, hp);
    }
    this.getMap('CABIN_YARD');
    this.shipped = d.shipped ?? [];
    this.stats = { ...freshStats(), ...d.stats };
    this.mailRead = d.mailRead ?? 0;
    const map = BUILT_MAPS.has(d.map) ? d.map : BED_SPAWN.map;
    this.enterMap(map, d.px, d.py, d.dir);
    this.mode = 'play';
    this.overlays = [];
    this.toast('Field journal loaded.');
  }

  toSave(): SaveData {
    const maps: Partial<Record<MapId, MapSave>> = {};
    for (const [id, m] of this.maps) {
      maps[id] = {
        removed: [...m.removed],
        forage: [...m.forage.entries()],
        plots: m.plots.map((p) => ({ ...p })),
        hp: [...m.hp.entries()],
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
      sel: this.sel,
      look: { ...this.look },
      wardrobe: [...this.wardrobe],
      map: this.cur.id,
      px: this.player.tx,
      py: this.player.ty,
      dir: this.player.dir,
      maps,
      shipped: this.shipped.map((s) => ({ ...s })),
      stats: { ...this.stats },
      mailRead: this.mailRead,
    };
  }

  saveGame(): boolean {
    return writeSave(this.toSave());
  }

  enterMap(id: MapId, x: number, y: number, dir: Dir): void {
    this.cur = this.getMap(id);
    this.player.place(x, y, dir);
    this.particles.clear();
    this.cam.follow(this.player.x + 8, this.player.y + 8, this.cur.w * 16, this.cur.h * 16, 0, true);
    this.banner = { text: MAP_NAMES[id], t: 2.6 };
  }

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.cam.viewW = w;
    this.cam.viewH = h;
    if (this.mode === 'play') this.cam.follow(this.player.x + 8, this.player.y + 8, this.cur.w * 16, this.cur.h * 16, 0, true);
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
  private notice(text: string): void {
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

    const top = this.overlays[this.overlays.length - 1];
    if (top) {
      if (this.fadeDir === 0) top.update(this, dt);
      this.overlays = this.overlays.filter((o) => !o.closed);
    } else if (this.fadeDir === 0) {
      this.handleHotbarInput();
      if (this.clock.tick(dt)) this.passOut();
      this.updatePlayer(dt);
      this.updateAmbience(dt);
    }

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

  toggleMute(): void {
    const m = sfx.toggleMute();
    this.toast(m ? 'Sound muted (M)' : 'Sound on (M)');
    document.getElementById('mute-toggle')?.classList.toggle('on', !m);
  }

  /** Title screen → fade → new game or loaded save. */
  startFromTitle(load: SaveData | null): void {
    sfx.unlock();
    sfx.confirm();
    this.transition(() => {
      if (load) this.loadGame(load); else this.newGame();
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
    else if (inp.pressed('dex')) { sfx.open(); this.openOverlay(new JournalMenu()); }
  }

  /* ------------------------------------------------------------ */
  /* Player movement & actions                                     */
  /* ------------------------------------------------------------ */

  private updatePlayer(dt: number): void {
    const p = this.player;
    const inp = this.input;
    p.bumpCd = Math.max(0, p.bumpCd - dt);

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
    if (portal && !BUILT_MAPS.has(portal.to)) {
      this.notice(portal.closedMsg);
      if (p.bumpCd <= 0) { sfx.bump(); p.bumpCd = 0.4; }
      p.chain = false;
      return;
    }
    if (this.cur.blocked(nx, ny)) {
      if (p.bumpCd <= 0) { sfx.bump(); p.bumpCd = 0.45; }
      p.chain = false;
      return;
    }
    const run = this.input.held('b');
    p.beginStep(nx, ny, run);
    p.chain = true;
    const surf = this.surfaceAt(p.tx - dx, p.ty - dy);
    sfx.step(surf);
    if (surf !== 'wood' && !this.cur.def.indoor) this.particles.dust((p.tx - dx) * 16 + 8, (p.ty - dy) * 16 + 15, d);
    if (this.cur.obj(nx, ny) === O.TALLGRASS) {
      const i = this.cur.idx(nx, ny);
      this.cur.shake.set(i, this.time + 0.45);
      this.particles.leaves(nx * 16 + 8, ny * 16 + 12);
      sfx.rustle();
    }
  }

  private surfaceAt(x: number, y: number): Surface {
    const t = this.cur.ground(x, y);
    if (t === T.PORCH || t === T.FLOOR || t === T.BRIDGE || t === T.RUG || t === T.DOORMAT) return 'wood';
    if (t === T.PATH) return 'sand';
    if (t === T.SOIL) {
      const pi = this.cur.plotIndex(x, y);
      if (pi >= 0 && (this.cur.def.plots[pi].bog || this.cur.plots[pi].watered)) return 'bog';
      return 'sand';
    }
    const wet = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => this.cur.ground(x + dx, y + dy) === T.WATER);
    return wet ? 'bog' : 'grass';
  }

  private onArrive(x: number, y: number): void {
    const portal = this.cur.portalAt(x, y);
    if (portal && BUILT_MAPS.has(portal.to)) {
      sfx.door();
      this.transition(() => this.enterMap(portal.to, portal.tx, portal.ty, portal.dir));
    }
  }

  /** A button: interact with what's in front, else use the selected item. */
  private useA(repeat: boolean): void {
    const p = this.player;
    const [tx, ty] = p.facing();
    if (!repeat && this.tryInteract(tx, ty)) return;
    const st = this.selected;
    if (!st) { if (!repeat) this.notice('Nothing in hand. Pick a hotbar slot with 1-9 or tap it.'); return; }
    const def = ITEMS[st.id];
    if (def.kind === 'tool' && def.tool) {
      if (this.cur.def.indoor) { if (!repeat) this.notice(`Better not swing the ${def.name} indoors.`); return; }
      this.startTool(def.tool, tx, ty);
      return;
    }
    if (repeat) return;
    if (def.kind === 'seed') { this.plant(tx, ty); return; }
    if (def.edible) { this.eat(); return; }
    this.notice(`${def.name}: ship it in the bin, or save it as cryptid lure.`);
  }

  private startTool(tool: ToolKind, tx: number, ty: number): void {
    const cost = tool === 'can' ? 1 : 2;
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
    const hp = (m.hp.get(i) ?? props.hp ?? 1) - 1;
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
    if (left > 0) this.toast(`Bag full! ${left} ${ITEMS[id].name} lost.`);
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
    if (this.stamina >= this.maxStamina) { this.notice("You're not hungry right now."); return; }
    this.stamina = Math.min(this.maxStamina, this.stamina + def.edible);
    this.inv.removeAt(this.sel, 1);
    sfx.eat();
    this.toast(st.id === 'ghost_pepper' ? 'HOT! HOT! +2 energy... and tears.' : `Ate ${def.name}. +${def.edible} energy`);
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
    if (o === O.BLOCK) return m.structureAt(tx, ty) ? 'structure' : null;
    const k = objProps(o).interact;
    if (k) return k;
    return null;
  }

  private tryInteract(tx: number, ty: number): boolean {
    const kind = this.interactKind(tx, ty);
    if (!kind) return false;
    const m = this.cur;
    const i = m.idx(tx, ty);
    const cx = tx * 16 + 8, cy = ty * 16 + 10;
    switch (kind) {
      case 'forage': {
        const id = m.forage.get(i)!;
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
        this.openOverlay(new DresserMenu(this));
        return true;
      case 'workbench':
        sfx.open();
        this.openOverlay(new CatalogMenu());
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
      case 'mailbox':
        this.readMail();
        return true;
      case 'fireplace':
        sfx.blip();
        this.openOverlay(new Dialog(['The fire pops and crackles. Pine smoke and warmth fill the cabin.']));
        return true;
      case 'pedestal':
        sfx.blip();
        this.openOverlay(new Dialog(['An empty Trophy Pedestal. Specimens earned by gaining a cryptid\'s full Trust can be displayed here.']));
        return true;
      case 'bookshelf':
        sfx.blip();
        this.openOverlay(new Dialog([
          '"Field Guide to the Pine Barrens, 3rd Ed." A page is dog-eared: "Lures matter. A Jackalope will cross a whole meadow for Wild Clover."',
          'Scrawled in the margin: "Tall grass rustles when you walk through it. Some nights, something rustles back."',
        ]));
        return true;
      case 'stove':
        sfx.blip();
        this.openOverlay(new Dialog(['A cast-iron stove, still warm. A kettle hums quietly.']));
        return true;
      case 'crate':
        sfx.blip();
        this.openOverlay(new Dialog(['A crate of old ranger gear: rope, flares, and a box of film for a camera you don\'t own yet.']));
        return true;
      case 'lamp':
        sfx.blip();
        this.openOverlay(new Dialog(['A kerosene lamp post. It lights itself at dusk, somehow.']));
        return true;
      case 'table':
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
    }
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
    sfx.blip();
    this.openOverlay(new Dialog(['No new mail today.']));
  }

  private computePrompt(): string {
    const [tx, ty] = this.player.facing();
    const kind = this.interactKind(tx, ty);
    const labels: Partial<Record<string, string>> = {
      forage: 'PICK UP', harvest: 'HARVEST', bed: 'SLEEP', desk: 'SAVE', dresser: 'WARDROBE', workbench: 'CATALOG',
      ship: 'SHIP', barrel: 'REFILL', sign: 'READ', mailbox: 'MAIL', fireplace: 'LOOK', pedestal: 'LOOK',
      bookshelf: 'READ', structure: 'LOOK',
    };
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

    this.clock.newDay();
    this.clock.minutes = DAY_START;
    this.stamina = passOut ? Math.floor(this.maxStamina * 0.6) : this.maxStamina;
    this.lowStaminaWarned = false;
    this.stats.daysPlayed++;
    for (const m of this.maps.values()) m.spawnForage(this.clock.day);
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
    this.ambientT -= dt;
    if (this.ambientT <= 0) {
      this.ambientT = 2 + Math.random() * 5;
      if (!m.def.indoor) {
        const ph = this.clock.phase();
        if (ph === 'night' || ph === 'witching') sfx.cricket();
        else if (ph === 'day' && Math.random() < 0.6) sfx.bird();
      }
    }
    // Chimney smoke + ripe-crop sparkle
    this.smokeT -= dt;
    if (this.smokeT <= 0) {
      this.smokeT = 0.3;
      for (const s of m.def.structures) if (s.chimney) this.particles.smoke(s.x * 16 + s.chimney[0], s.y * 16 + s.chimney[1]);
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
