/**
 * Overworld deer for hunting. They graze and wander on the Pine Trail, in the
 * Old Growth and up on Radio Ridge, mostly at dawn and dusk (more in fall),
 * and bolt if you run at them or stand right beside them.
 */
import type { Game } from './game';
import type { MapId } from '../data/maps';
import type { Dir } from '../util';
import { T } from '../data/tiles';
import { timeTags } from '../data/weather';
import { DEER_MAPS } from './outdoors';

export interface Deer {
  x: number; y: number;       // pixels (top-left of the tile)
  tx: number; ty: number;     // tile
  fromX: number; fromY: number;
  t: number; stepTime: number;
  left: boolean;
  state: 'graze' | 'walk' | 'flee';
  timer: number;
  buck: boolean;
  frame: number;
}

const OPEN = new Set<number>([T.GRASS, T.FOREST, T.CLOVER, T.HEMLOCK, T.ROCKY, T.SLOPE, T.PATH]);

export class Wildlife {
  deer: Deer[] = [];
  private map: MapId | null = null;
  private spawnT = 0;

  /** How many deer the woods hold right now. */
  private target(game: Game): number {
    if (!DEER_MAPS.has(game.cur.id)) return 0;
    const tags = timeTags(game.clock.minutes);
    let n = tags.includes('DAWN') || tags.includes('DUSK') ? 3 : tags.includes('WITCHING') || tags.includes('NIGHT') ? 0 : 1;
    if (n && game.clock.season === 'Fall') n += 1; // the rut
    return n;
  }

  private walkable(game: Game, x: number, y: number): boolean {
    const m = game.cur;
    return m.inBounds(x, y) && OPEN.has(m.ground(x, y)) && !m.blocked(x, y) && !m.portalAt(x, y);
  }

  private spawn(game: Game): void {
    const p = game.player;
    for (let tries = 0; tries < 40; tries++) {
      const x = Math.floor(Math.random() * game.cur.w), y = Math.floor(Math.random() * game.cur.h);
      const d = Math.hypot(x - p.tx, y - p.ty);
      if (d < 8 || d > 22 || !this.walkable(game, x, y) || game.cur.ground(x, y) === T.PATH) continue;
      this.deer.push({ x: x * 16, y: y * 16, tx: x, ty: y, fromX: x * 16, fromY: y * 16, t: 1, stepTime: 0.5, left: Math.random() < 0.5,
        state: 'graze', timer: 1 + Math.random() * 3, buck: Math.random() < 0.35, frame: 0 });
      return;
    }
  }

  /** Make every deer on the map bolt (a gunshot, a miss). */
  scatter(game: Game): void {
    for (const d of this.deer) { d.state = 'flee'; d.timer = 3.5; d.left = d.tx < game.player.tx; }
  }

  remove(d: Deer): void { this.deer = this.deer.filter((x) => x !== d); }

  update(game: Game, dt: number): void {
    if (game.cur.id !== this.map) { this.map = game.cur.id; this.deer = []; this.spawnT = 0; }
    const want = this.target(game);
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = 6;
      if (this.deer.length < want) this.spawn(game);
    }
    const p = game.player;
    for (const d of [...this.deer]) {
      // Movement interpolation
      if (d.t < 1) {
        d.t = Math.min(1, d.t + dt / d.stepTime);
        d.x = d.fromX + (d.tx * 16 - d.fromX) * d.t;
        d.y = d.fromY + (d.ty * 16 - d.fromY) * d.t;
        d.frame = Math.floor(d.t * 4) % 2;
        continue;
      }
      const dist = Math.hypot(d.tx - p.tx, d.ty - p.ty);
      // Spooked: running within 5 tiles, or standing right beside it.
      if (d.state !== 'flee' && (dist <= 1.5 || (p.running && p.moving && dist <= 5))) { d.state = 'flee'; d.timer = 3.5; }
      d.timer -= dt;
      if (d.state === 'flee') {
        if (d.timer <= 0 || dist > 16) { this.remove(d); continue; }
        this.step(game, d, Math.sign(d.tx - p.tx) || (Math.random() < 0.5 ? 1 : -1), Math.sign(d.ty - p.ty), 0.16);
      } else if (d.timer <= 0) {
        if (d.state === 'graze') {
          d.state = 'walk'; d.timer = 0.6 + Math.random() * 1.6;
        } else {
          d.state = 'graze'; d.timer = 2 + Math.random() * 4;
        }
      } else if (d.state === 'walk') {
        const dirs: Array<[number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        const [dx, dy] = dirs[Math.floor(Math.random() * 4)];
        this.step(game, d, dx, dy, 0.45);
      } else if (Math.random() < dt * 0.8) d.frame ^= 1; // grazing nod
    }
  }

  private step(game: Game, d: Deer, dx: number, dy: number, time: number): void {
    // Prefer the main direction, then either side.
    const options: Array<[number, number]> = dx && dy ? [[dx, 0], [0, dy]] : dx ? [[dx, 0], [0, 1], [0, -1]] : [[0, dy], [1, 0], [-1, 0]];
    for (const [ox, oy] of options) {
      const nx = d.tx + ox, ny = d.ty + oy;
      if (!this.walkable(game, nx, ny) || (nx === game.player.tx && ny === game.player.ty)) continue;
      d.fromX = d.tx * 16; d.fromY = d.ty * 16; d.tx = nx; d.ty = ny; d.t = 0; d.stepTime = time;
      if (ox) d.left = ox < 0;
      return;
    }
    if (d.state === 'flee') this.remove(d); // cornered: it slips away into the brush
  }

  /** Nearest deer in a straight line ahead of the player within `range` tiles. */
  inSights(game: Game, dir: Dir, range: number): { deer: Deer; dist: number } | null {
    const p = game.player;
    const v: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const [fx, fy] = v[dir];
    let best: { deer: Deer; dist: number } | null = null;
    for (const d of this.deer) {
      const rx = d.tx - p.tx, ry = d.ty - p.ty;
      const along = rx * fx + ry * fy, side = Math.abs(rx * fy - ry * fx);
      if (along >= 1 && along <= range && side <= 1 && (!best || along < best.dist)) best = { deer: d, dist: along };
    }
    return best;
  }
}
