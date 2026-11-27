/**
 * Overworld cryptid presence. Instead of an invisible dice roll yanking you into
 * an encounter, cryptids show themselves as clues you can see and stalk:
 *
 *   eyes    -- a pair of glowing eyes low in the brush (dusk, night, fog)
 *   rustle  -- a patch of cover shaking with something heavy inside it
 *   ripple  -- rings spreading on still water, something just under the surface
 *   tracks  -- a short line of fresh prints ending in a hiding spot
 *
 * Walk up quietly and press A to raise the camcorder (a calmer start). Running
 * nearby spooks the shy ones away; predators and territorial cryptids charge
 * instead. Stepping straight onto one startles it. Which cryptid, rare variant
 * odds, time/weather/zone rules and telegraph boosts all come from spawn.ts,
 * unchanged.
 */
import type { Game } from './game';
import type { CryptidDef, Variant } from '../data/cryptids';
import type { MapId } from '../data/mapgen';
import { T } from '../data/tiles';
import { pickCryptid, rollVariant, encounterChance, eligible } from './spawn';
import { sfx } from '../audio/sfx';

export type SignKind = 'eyes' | 'rustle' | 'ripple' | 'tracks';
export type Approach = 'quiet' | 'bumped';

export interface Sign {
  x: number;
  y: number;
  kind: SignKind;
  def: CryptidDef;
  variant: Variant;
  /** Seconds since it appeared and how long it stays. */
  age: number;
  ttl: number;
  /** Still there to be found; once it slips away, `fade` counts down to zero and it's gone. */
  live: boolean;
  fade: number;
  /** Prints leading in (tracks only). */
  prints: Array<[number, number]>;
  /** Random phase for animation. */
  seed: number;
}

const WATERY = new Set<number>([T.WATER, T.SHALLOW, T.SPRING]);
/** Creatures of the water show themselves as ripples, never as rustling on the bank. */
const SWIMMERS = new Set<string>(['polliwog', 'altamaha', 'chessie', 'bessie']);
/** How many clues can be out at once, and seconds between new ones. */
const CAP = 3;
const SPAWN_MIN = 5, SPAWN_JITTER = 6;

export class Sightings {
  signs: Sign[] = [];
  private map: MapId | null = null;
  private spawnT = 3;
  private checkT = 0;
  /** Quiet spell after an encounter, so the next clue isn't right on top of you. */
  private cool = 0;
  /** Now and then the nearest clue gives itself away by sound. */
  private cueT = 4;

  update(game: Game, dt: number): void {
    const m = game.cur;
    if (m.id !== this.map) { this.signs = []; this.map = m.id; this.spawnT = 2 + Math.random() * 2; }
    if (!m.def.wild || m.def.indoor) { this.signs.length = 0; return; }
    if (game.quietToday()) { for (const s of this.signs) this.leave(s); }
    this.cool = Math.max(0, this.cool - dt);
    this.checkT -= dt;
    const recheck = this.checkT <= 0;
    if (recheck) this.checkT = 2;
    for (const s of this.signs) {
      if (!s.live) { s.fade -= dt; continue; }
      s.age += dt;
      // Gone with time, or when the hour/weather no longer suits it.
      if (s.age > s.ttl || (recheck && !eligible(s.def, game.spawnCtx(s.x, s.y)))) this.leave(s);
    }
    this.signs = this.signs.filter((s) => s.live || s.fade > 0);
    this.cueT -= dt;
    if (this.cueT <= 0) {
      this.cueT = 4 + Math.random() * 5;
      const p = game.player;
      const near = this.signs.filter((s) => s.live && Math.abs(s.x - p.tx) + Math.abs(s.y - p.ty) <= 10)
        .sort((a, b) => (Math.abs(a.x - p.tx) + Math.abs(a.y - p.ty)) - (Math.abs(b.x - p.tx) + Math.abs(b.y - p.ty)))[0];
      if (near && !game.overlays.length) {
        if (near.kind === 'rustle') sfx.rustle();
        else if (near.kind === 'ripple') sfx.plop();
        else sfx.creature(near.def.temperament);
      }
    }
    if (game.quietToday() || this.cool > 0) return;
    this.spawnT -= dt;
    if (this.spawnT > 0) return;
    this.spawnT = SPAWN_MIN + Math.random() * SPAWN_JITTER;
    const cap = CAP + (game.wispNight === game.clock.day ? 1 : 0);
    if (this.signs.filter((s) => s.live).length < cap) this.trySpawn(game);
  }

  /** Slip away (fades out over a second). */
  leave(s: Sign): void { if (s.live) { s.live = false; s.fade = 1; } }

  private trySpawn(game: Game): void {
    const m = game.cur, p = game.player;
    const w = game.weatherNow();
    const ph = game.clock.phase();
    const dark = ph !== 'day' || w === 'FOG';
    for (let attempt = 0; attempt < 40; attempt++) {
      const a = Math.random() * Math.PI * 2, r = 5 + Math.random() * 9;
      const x = Math.round(p.tx + Math.cos(a) * r), y = Math.round(p.ty + Math.sin(a) * r);
      if (!m.inBounds(x, y) || m.portalAt(x, y)) continue;
      if (this.signs.some((s) => Math.abs(s.x - x) + Math.abs(s.y - y) < 5)) continue;
      const g = m.ground(x, y), o = m.obj(x, y);
      const nearDeep = [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]].some(([dx, dy]) => m.ground(x + dx, y + dy) === T.WATER);
      const water = WATERY.has(g);
      // The same places the old rustling-grass rolls favoured, plus open water near the bank.
      const suit = water ? (g === T.WATER && !this.shore(game, x, y) ? 0 : 0.06) : encounterChance(g, o, w, nearDeep);
      if (suit <= 0 || Math.random() > suit * 10) continue;
      if (!water && m.blocked(x, y, true)) continue;
      const ctx = game.spawnCtx(x, y);
      const def = pickCryptid(ctx, Math.random);
      if (!def) continue;
      const variant = rollVariant(Math.random, game.rareMult(), ctx.pylonHere);
      // Swimmers surface in the nearest water; if there's none close by, they're not here after all.
      let sx = x, sy = y;
      if (SWIMMERS.has(def.id) && !water) {
        let best: [number, number] | null = null;
        for (let r2 = 1; r2 <= 3 && !best; r2++) for (let dy = -r2; dy <= r2 && !best; dy++) for (let dx = -r2; dx <= r2; dx++) {
          if (WATERY.has(m.ground(x + dx, y + dy)) && this.shore(game, x + dx, y + dy)) { best = [x + dx, y + dy]; break; }
        }
        if (!best) continue;
        [sx, sy] = best;
      }
      const wet = WATERY.has(m.ground(sx, sy));
      let kind: SignKind = wet ? 'ripple' : dark ? (Math.random() < 0.7 ? 'eyes' : 'rustle') : 'rustle';
      if (!wet && (g === T.PATH || g === T.GRASS || g === T.CLOVER || g === T.ROCKY || g === T.FOREST) && Math.random() < 0.35) kind = 'tracks';
      const prints = kind === 'tracks' ? this.layPrints(game, sx, sy) : [];
      if (kind === 'tracks' && prints.length < 2) kind = dark ? 'eyes' : 'rustle';
      this.signs.push({ x: sx, y: sy, kind, def, variant, age: 0, ttl: 45 + Math.random() * 40, live: true, fade: 0, prints, seed: Math.random() * 100 });
      return;
    }
  }

  /** Water tiles worth rippling: next to a bank you can stand on. */
  private shore(game: Game, x: number, y: number): boolean {
    const m = game.cur;
    return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !m.blocked(x + dx, y + dy, true));
  }

  /** A few prints wandering in toward the hiding spot. */
  private layPrints(game: Game, x: number, y: number): Array<[number, number]> {
    const m = game.cur;
    const out: Array<[number, number]> = [];
    let cx = x, cy = y;
    const dirs: Array<[number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let [dx, dy] = dirs[Math.floor(Math.random() * 4)];
    for (let k = 0; k < 5; k++) {
      if (Math.random() < 0.3) [dx, dy] = dirs[Math.floor(Math.random() * 4)];
      const nx = cx + dx, ny = cy + dy;
      if (!m.inBounds(nx, ny) || m.blocked(nx, ny, true) || m.portalAt(nx, ny)) break;
      cx = nx; cy = ny;
      out.push([cx, cy]);
    }
    return out;
  }

  /** The live clue on (or, for water, facing) this tile. */
  at(x: number, y: number): Sign | null {
    return this.signs.find((s) => s.live && s.x === x && s.y === y) ?? null;
  }

  /** Called as the player takes a step: running spooks the shy ones, predators charge, stepping onto one startles it. */
  onStep(game: Game, nx: number, ny: number, running: boolean): void {
    for (const s of this.signs) {
      if (!s.live) continue;
      if (s.x === nx && s.y === ny) { this.engage(game, s, 'bumped'); return; }
      const d = Math.max(Math.abs(s.x - nx), Math.abs(s.y - ny));
      const t = s.def.temperament;
      const cap = game.look.hat === 'jackalope_cap' && t === 'skittish' ? 0.5 : 1;
      if (running && d <= 4) {
        if (t === 'predator' || t === 'territorial') { if (d <= 2 && game.look.outfit !== 'wendigo_mantle') { this.engage(game, s, 'bumped'); return; } continue; }
        const chance = (t === 'skittish' ? 0.8 : t === 'spectral' ? 0.6 : 0.45) * cap;
        if (Math.random() < chance) this.spook(game, s);
      } else if (!running && d <= 2 && t === 'skittish' && Math.random() < 0.1 * cap) this.spook(game, s);
    }
  }

  private spook(game: Game, s: Sign): void {
    this.leave(s);
    const px = s.x * 16 + 8, py = s.y * 16 + 10;
    if (s.kind === 'ripple') game.particles.splash(px, py); else game.particles.leaves(px, py);
    sfx.rustle();
    game.toast('Whatever it was heard you coming, and slipped away. (Walk, don\'t run.)');
  }

  /** Raise the camcorder. */
  engage(game: Game, s: Sign, approach: Approach): void {
    this.signs = this.signs.filter((o) => o !== s);
    this.cool = 10;
    game.startEncounter(s.def, s.variant, game.cur.ground(s.x, s.y) === T.SLOPE, false, approach);
  }

  /** After any encounter: a short lull. */
  rest(): void { this.cool = Math.max(this.cool, 8); }
}
