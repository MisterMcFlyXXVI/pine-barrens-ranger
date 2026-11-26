/**
 * Little life: butterflies over meadows by day, fireflies at dusk, dragonflies
 * over water, frogs that plop off the bank as you come near, dawn mist and
 * ripples on creeks, and leaves drifting down in the fall. Mostly stateless,
 * derived from tile hashes and the clock, so nothing needs saving.
 */
import type { Game } from '../engine/game';
import { O, T } from '../data/tiles';
import { hash2 } from '../util';
import { hex, P } from './palette';
import { sfx } from '../audio/sfx';

const WATERY = new Set<number>([T.WATER, T.SHALLOW, T.SPRING]);
const MEADOW_OBJ = new Set<number>([O.TALLGRASS, O.FLOWERS, O.THISTLE, O.ASTER, O.CHICORY, O.QUEEN_ANNE, O.FORGET_ME_NOT]);
const BUTTERFLY = [P.LANTERN, P.FOG, P.AMBER, P.MIST, P.MOON];

/** Frogs that have jumped in: tile index -> time they come back. Reset on map change. */
const frogGone = new Map<number, number>();
let frogMap = '';
let lastChime = 0;

export interface View { x0: number; x1: number; y0: number; y1: number; cx: number; cy: number; season: number; time: number }

const dot = (g: CanvasRenderingContext2D, x: number, y: number, c: number, w = 1, h = 1) => { g.fillStyle = hex(c); g.fillRect(Math.round(x), Math.round(y), w, h); };

/** Drawn above the world but under the lighting tint. */
export function drawAmbient(game: Game, g: CanvasRenderingContext2D, v: View): void {
  const m = game.cur;
  if (m.def.indoor) return;
  if (frogMap !== m.id) { frogGone.clear(); frogMap = m.id; }
  const { x0, x1, y0, y1, cx, cy, season, time } = v;
  const phase = game.clock.phase();
  const mins = game.clock.minutes;
  const w = game.weatherNow();
  const wet = w === 'RAIN' || w === 'STORM' || w === 'SNOW';
  const day = phase === 'day';
  const warm = season < 3;
  const p = game.player;
  const ptx = (p.x + 8) / 16, pty = (p.y + 8) / 16;

  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const gr = m.ground(x, y), o = m.obj(x, y);
    const h = hash2(x, y, 77);
    const bx = x * 16 - cx, by = y * 16 - cy;
    if (WATERY.has(gr)) {
      // Ripples: a ring that spreads and fades every few seconds.
      if (h < 0.025 && season !== 3) {
        const t = (time * 0.4 + h * 40) % 1;
        const r = 1 + t * 5;
        g.globalAlpha = (1 - t) * 0.8;
        for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; dot(g, bx + 8 + Math.cos(a) * r, by + 8 + Math.sin(a) * r * 0.55, P.MIST); }
        g.globalAlpha = 1;
      }
      // Dawn mist off the water before 8 o'clock.
      if (mins < 480 && h < 0.5) {
        const fade = Math.min(1, (480 - mins) / 60);
        const drift = Math.sin(time * 0.3 + h * 20) * 6;
        g.globalAlpha = 0.18 * fade;
        g.fillStyle = hex(P.FOG);
        g.fillRect(Math.round(bx - 6 + drift), by + 3, 28, 5);
        g.fillRect(Math.round(bx + drift * 0.5), by - 2, 18, 4);
        g.globalAlpha = 1;
      }
      // Dragonflies dart over the water by day.
      if (day && warm && !wet && h > 0.975) {
        const hop = Math.floor(time / 1.3 + h * 9);
        const k = (time / 1.3 + h * 9) % 1;
        const ax = hash2(hop, x, 5) * 40 - 20, ay = hash2(hop, y, 6) * 24 - 16;
        const nx = hash2(hop + 1, x, 5) * 40 - 20, ny = hash2(hop + 1, y, 6) * 24 - 16;
        const e = k < 0.75 ? 0 : (k - 0.75) * 4;
        const dx = bx + 8 + ax + (nx - ax) * e, dy = by + ay + (ny - ay) * e;
        dot(g, dx, dy, P.TWILIGHT, 4, 1); dot(g, dx + 3, dy, P.MIST);
        if (Math.floor(time * 20) % 2) { dot(g, dx + 1, dy - 1, P.FOG); dot(g, dx + 2, dy - 1, P.FOG); }
        else { dot(g, dx + 1, dy + 1, P.FOG); dot(g, dx + 2, dy + 1, P.FOG); }
      }
      continue;
    }
    // Frogs on the bank: they plop into the water when you get close.
    if (warm && !wet && phase !== 'witching' && (gr === T.BOG || gr === T.GRASS || gr === T.CLOVER) && o === O.NONE && h < 0.06) {
      const toWater = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => WATERY.has(m.ground(x + dx, y + dy)));
      if (toWater) {
        const i = m.idx(x, y);
        const gone = frogGone.get(i) ?? 0;
        if (gone > time) { /* in the water */ }
        else if (Math.hypot(ptx - x - 0.5, pty - y - 0.5) < 2.4) {
          frogGone.set(i, time + 40 + h * 200);
          const wx = (x + toWater[0]) * 16 + 8, wy = (y + toWater[1]) * 16 + 8;
          game.particles.splash(wx, wy);
          sfx.plop();
        } else {
          const fx = bx + 6 + toWater[0] * 3, fy = by + 9 + toWater[1] * 3;
          const puff = Math.floor(time * 1.5 + h * 50) % 5 === 0;
          dot(g, fx, fy + 1, P.PINE, 5, 2); dot(g, fx, fy, P.MOSS, 5, 2);
          dot(g, fx + 1, fy - 1, P.FERN); dot(g, fx + 3, fy - 1, P.FERN);
          if (puff) dot(g, fx + 1, fy + 2, P.FOG, 3, 1); // throat puff
        }
      }
    }
    // Butterflies over the meadow flowers by day.
    if (day && warm && !wet && (gr === T.CLOVER || MEADOW_OBJ.has(o)) && h > 0.955) {
      const c = BUTTERFLY[Math.floor(h * 1000) % BUTTERFLY.length];
      const t = time * 0.8 + h * 30;
      const fx = bx + 8 + Math.sin(t) * 14 + Math.sin(t * 2.3) * 4, fy = by - 4 + Math.cos(t * 1.3) * 7;
      const open = Math.floor(time * 9 + h * 7) % 2 === 0;
      if (open) { dot(g, fx - 2, fy - 1, c, 2, 2); dot(g, fx + 1, fy - 1, c, 2, 2); }
      else { dot(g, fx - 1, fy - 2, c, 1, 2); dot(g, fx + 1, fy - 2, c, 1, 2); }
      dot(g, fx, fy - 1, P.VOID, 1, 2);
    }
    // Porch wind chimes ring now and then when you're nearby.
    if (o === O.CHIMES && time - lastChime > 6 && Math.hypot(ptx - x, pty - y) < 5 && Math.random() < 0.01) { lastChime = time; sfx.chimes(); }
  }

  // Leaves drifting down in the fall (screen-space, gently looping).
  if (season === 2 && !wet) {
    const n = m.id === 'PINE_HOLLOW_TOWN' ? 6 : 14;
    for (let k = 0; k < n; k++) {
      const s1 = hash2(k, 3, 91), s2 = hash2(k, 7, 92);
      const fall = 14 + s2 * 12;
      const yy = ((s1 * 400 + time * fall) % (game.h + 20)) - 10;
      const xx = ((s2 * 600 + time * 9 + Math.sin(time * 1.4 + k) * 10) % (game.w + 20)) - 10;
      const c = [P.AMBER, P.RUST, P.CRAN, P.LANTERN][k % 4];
      const flip = Math.floor(time * 3 + k) % 2;
      dot(g, xx, yy, c, flip ? 2 : 1, flip ? 1 : 2);
    }
  }
}

/** Fireflies glow over the grass on warm evenings; drawn on top of the night lighting. */
export function drawFireflies(game: Game, g: CanvasRenderingContext2D, v: View): void {
  const m = game.cur;
  if (m.def.indoor || v.season > 1) return;
  const phase = game.clock.phase();
  if (phase === 'day' || phase === 'witching') return;
  const w = game.weatherNow();
  if (w === 'RAIN' || w === 'STORM') return;
  const { x0, x1, y0, y1, cx, cy, time } = v;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const gr = m.ground(x, y);
    if (!(gr === T.GRASS || gr === T.CLOVER || gr === T.FOREST || gr === T.BOG)) continue;
    const h = hash2(x, y, 55);
    if (h > 0.22) continue;
    const t = time * 0.5 + h * 100;
    const glow = Math.sin(time * 1.7 + h * 60);
    if (glow < 0.05) continue;
    const fx = x * 16 - cx + 8 + Math.sin(t) * 10, fy = y * 16 - cy + 4 + Math.cos(t * 0.7) * 6;
    g.globalAlpha = 0.18 * glow;
    dot(g, fx - 2, fy - 2, P.FERN, 5, 5);
    g.globalAlpha = 0.45 * glow;
    dot(g, fx - 1, fy - 1, P.LANTERN, 3, 3);
    g.globalAlpha = Math.min(1, glow + 0.2);
    dot(g, fx, fy, P.LANTERN);
    g.globalAlpha = 1;
  }
}
