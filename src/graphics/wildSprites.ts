/** Phase 2 biome art: bog, springs, old growth, ridge & sawmill tiles, wilderness objects, lure mounts. */
import { makeCanvas, Pen, outline, fromArt, Canv } from './canvas';
import { P } from './palette';
import { mulberry32 } from '../util';
import { GROUND, OVER, OBJ, STRUCT, ICON, tile, plankTile, edgeOverlay, bakeOak } from './sprites';

function bogTile(seed: number): Canv {
  const { c, p, r } = tile(P.PINE, [[P.FOREST, 0.14], [P.TWILIGHT, 0.04], [P.MOSS, 0.03]], seed);
  for (let i = 0; i < 2; i++) {
    const x = 2 + Math.floor(r() * 11), y = 2 + Math.floor(r() * 11);
    p.hline(x, x + 2, y, P.TWILIGHT); p.px(x + 1, y, P.MIST);
  }
  for (let i = 0; i < 3; i++) { const x = Math.floor(r() * 15), y = 1 + Math.floor(r() * 14); p.px(x, y, P.MOSS); p.px(x, y - 1, P.FERN); }
  return c;
}

function shallowTile(frame: number): Canv {
  const { c, p } = tile(P.MIST, [[P.TWILIGHT, 0.05], [P.FOREST, 0.02]], 801);
  const r = mulberry32(802);
  for (let k = 0; k < 5; k++) {
    const x = Math.floor(r() * 16), y = Math.floor(r() * 16);
    const xx = (x + frame * 2) % 16;
    p.px(xx, y, P.TWILIGHT); p.px((xx + 1) % 16, y, P.TWILIGHT);
    p.px((xx + 3) % 16, (y + 7) % 16, P.FOG);
  }
  return c;
}

function springTile(frame: number): Canv {
  const { c, p } = tile(P.MIST, [[P.MOON, 0.06], [P.FOG, 0.03]], 811);
  const r = mulberry32(812 + frame);
  for (let k = 0; k < 4; k++) { const x = r() * 14, y = r() * 14; p.px(x, y, P.FOG); p.px(x + 1, y, P.MOON); }
  for (let k = 0; k < 3; k++) p.px(r() * 16, r() * 16, P.LANTERN);
  return c;
}

function ledgeTile(seed: number): Canv {
  const { c, p, r } = tile(P.RUST, [[P.CRAN, 0.06], [P.AMBER, 0.05]], seed);
  for (let y = 3; y < 16; y += 4) {
    p.hline(0, 15, y, P.SHADOW);
    for (let x = 0; x < 16; x++) if (r() < 0.6) p.px(x, y - 1, P.AMBER);
  }
  for (let i = 0; i < 3; i++) { const x = r() * 15, y = r() * 15; p.px(x, y, P.MIST); p.px(x + 1, y, P.FOG); }
  return c;
}

function cliffTile(seed: number): Canv {
  const { c, p, r } = tile(P.CRAN, [[P.RUST, 0.1], [P.SHADOW, 0.05]], seed);
  for (let i = 0; i < 4; i++) {
    let x = 1 + Math.floor(r() * 14);
    for (let y = 0; y < 16; y++) { p.px(x, y, P.SHADOW); if (r() < 0.25) x += r() < 0.5 ? -1 : 1; }
  }
  for (let i = 0; i < 6; i++) p.px(r() * 16, r() * 16, P.AMBER);
  p.hline(0, 15, 15, P.VOID);
  return c;
}

function ruinTile(seed: number): Canv {
  const c = plankTile(P.AMBER, P.RUST, P.LANTERN, true, seed, 4);
  const p = new Pen(c.getContext('2d')!);
  const r = mulberry32(seed + 1);
  const hx = 2 + Math.floor(r() * 9), hy = 2 + Math.floor(r() * 9);
  if (r() < 0.6) { p.rect(hx, hy, 3 + Math.floor(r() * 2), 2, P.VOID); p.px(hx, hy - 1, P.SHADOW); p.px(hx + 1, hy + 2, P.CRAN); }
  for (let i = 0; i < 6; i++) p.px(r() * 16, r() * 16, r() < 0.5 ? P.FOREST : P.CRAN);
  return c;
}

function cloverTile(seed: number): Canv {
  const { c, p, r } = tile(P.MOSS, [[P.FOREST, 0.06], [P.FERN, 0.03]], seed);
  for (let i = 0; i < 4; i++) {
    const x = 2 + Math.floor(r() * 12), y = 2 + Math.floor(r() * 12);
    p.px(x, y, P.FERN); p.px(x + 1, y, P.FERN); p.px(x, y + 1, P.FERN); p.px(x + 1, y + 1, P.FOREST);
  }
  if (r() < 0.7) { const x = 2 + Math.floor(r() * 12), y = 2 + Math.floor(r() * 12); p.px(x, y, P.MOON); p.px(x, y - 1, P.FOG); }
  return c;
}

/* ---------------- objects ---------------- */

function bakeApple(seed: number): Canv {
  const c = bakeOak(seed);
  const p = new Pen(c.getContext('2d')!);
  const r = mulberry32(seed * 7);
  for (let i = 0; i < 7; i++) { const x = 5 + r() * 14, y = 5 + r() * 12; p.px(x, y, P.LANTERN); p.px(x, y + 1, P.AMBER); } // Golden Delicious
  return c;
}

function bakeStoneWall(): Canv {
  const { c, g } = makeCanvas(16, 16);
  const p = new Pen(g);
  const r = mulberry32(901);
  for (let row = 0; row < 3; row++) {
    for (let x = -((row * 3) % 6); x < 16; x += 6) {
      const y = 5 + row * 4;
      p.rect(x, y, 6, 4, r() < 0.5 ? P.MIST : P.TWILIGHT);
      p.hline(x + 1, x + 4, y, P.FOG);
      p.hline(x, x + 5, y + 3, P.SHADOW);
      if (r() < 0.3) p.px(x + 2, y + 1, P.MOSS);
    }
  }
  return outline(c);
}

function bakeWillow(seed: number): Canv {
  const { c, g } = makeCanvas(24, 32);
  const p = new Pen(g);
  const r = mulberry32(seed);
  p.ellipse(12, 30, 9, 2, P.PINE);
  p.rect(10, 16, 4, 14, P.RUST); p.vline(13, 16, 29, P.CRAN);
  p.ellipse(12, 9, 10, 7, P.FOREST);
  p.ellipse(10, 7, 6, 4, P.MOSS);
  for (let x = 2; x < 22; x += 2) {
    const len = 10 + Math.floor(r() * 10);
    for (let y = 8; y < 8 + len && y < 28; y++) p.px(x + (y % 5 === 0 ? 1 : 0), y, y % 3 ? P.MOSS : P.FERN);
  }
  return outline(c);
}

function bakeHemlock(seed: number): Canv {
  const W = 28, H = 54, cx = 14;
  const { c, g } = makeCanvas(W, H);
  const p = new Pen(g);
  const r = mulberry32(seed);
  p.ellipse(14, H - 3, 11, 3, P.SHADOW);
  p.rect(10, H - 16, 8, 14, P.CRAN); p.vline(11, H - 16, H - 3, P.RUST); p.vline(16, H - 16, H - 3, P.SHADOW);
  p.px(9, H - 3, P.CRAN); p.px(18, H - 3, P.CRAN);
  const tiers: Array<[number, number, number]> = [[1, 12, 5], [8, 22, 8], [16, 32, 11], [24, 42, 13]];
  for (let ti = tiers.length - 1; ti >= 0; ti--) {
    const [y0, y1, wm] = tiers[ti];
    for (let y = y0; y <= y1; y++) {
      const wd = Math.max(1, Math.round(1 + ((y - y0) / (y1 - y0)) * (wm - 1)));
      for (let x = cx - wd; x < cx + wd; x++) {
        const rel = (x - (cx - wd)) / (2 * wd);
        let col: number = P.PINE;
        if (rel < 0.3) col = r() < 0.2 ? P.MOSS : P.FOREST;
        else if (rel > 0.7) col = P.SHADOW;
        if (y >= y1 - 1) col = P.SHADOW;
        if (x === cx - wd || x === cx + wd - 1) col = P.VOID;
        p.px(x, y, col);
      }
    }
  }
  return c;
}

function bakeHollowLog(): Canv {
  const { c, g } = makeCanvas(16, 16);
  const p = new Pen(g);
  p.ellipse(8, 14, 8, 1.6, P.SHADOW);
  p.rect(0, 5, 13, 9, P.RUST);
  p.hline(0, 12, 5, P.AMBER); p.hline(0, 12, 13, P.CRAN);
  p.ellipse(12.5, 9.5, 3.5, 4.5, P.AMBER);
  p.ellipse(12.5, 9.5, 2.2, 3.2, P.VOID);
  for (const x of [2, 5, 8]) { p.px(x, 4, P.MOSS); p.px(x + 1, 4, P.FERN); }
  p.px(3, 9, P.CRAN); p.px(7, 10, P.CRAN);
  return outline(c);
}

function bakeRuinWall(seed: number): Canv {
  const { c, g } = makeCanvas(16, 24);
  const p = new Pen(g);
  const r = mulberry32(seed);
  p.rect(0, 4, 16, 20, P.CRAN);
  for (let x = 0; x < 16; x += 4) { p.vline(x, 4, 23, P.SHADOW); p.vline(x + 1, 4, 23, P.RUST); }
  const top = 4 + Math.floor(r() * 6);
  g.clearRect(0, 0, 16, top);
  for (let x = 0; x < 16; x++) if (r() < 0.4) g.clearRect(x, top, 1, 1 + Math.floor(r() * 3));
  p.hline(0, 15, 14, P.AMBER); p.hline(0, 15, 15, P.SHADOW);
  for (let i = 0; i < 4; i++) p.px(r() * 16, 10 + r() * 12, P.FOREST);
  p.px(4, 18, P.MIST); p.px(11, 9, P.MIST);
  return outline(c);
}

function bakeLumber(): Canv {
  const { c, g } = makeCanvas(16, 16);
  const p = new Pen(g);
  for (let k = 0; k < 4; k++) {
    const y = 12 - k * 3, x0 = k % 2;
    p.rect(x0, y, 15, 3, k % 2 ? P.AMBER : P.RUST);
    p.hline(x0, x0 + 14, y, P.LANTERN);
    p.px(x0 + 14, y + 1, P.CRAN);
  }
  p.px(3, 4, P.FOREST); p.px(10, 7, P.FOREST);
  return outline(c);
}

function bakeSawBlade(): Canv {
  const { c, g } = makeCanvas(16, 18);
  const p = new Pen(g);
  p.ellipse(8, 9, 7.5, 7.5, P.MIST);
  for (let a = 0; a < 12; a++) {
    const ang = (a / 12) * Math.PI * 2;
    p.px(8 + Math.cos(ang) * 8, 9 + Math.sin(ang) * 8, P.FOG);
  }
  p.ellipse(8, 9, 2, 2, P.SHADOW);
  for (const [x, y] of [[4, 6], [11, 12], [5, 13], [12, 5]]) { p.px(x, y, P.RUST); p.px(x + 1, y, P.CRAN); }
  p.px(6, 4, P.FOG);
  return outline(c);
}

function bakeSlag(): Canv {
  const { c, g } = makeCanvas(16, 16);
  const p = new Pen(g);
  const inside = (x: number, y: number) => ((x + 0.5 - 8) / 7.5) ** 2 + ((y + 0.5 - 13) / 7) ** 2 <= 1 && y < 16;
  const r = mulberry32(931);
  p.blob(16, 16, inside, (_x, y, edge) => (edge ? P.VOID : r() < 0.1 ? P.MIST : y < 10 ? P.SHADOW : P.PINE));
  p.px(6, 9, P.AMBER); p.px(10, 11, P.FOG);
  return c;
}

function bakeDeadTree(seed: number): Canv {
  const { c, g } = makeCanvas(20, 34);
  const p = new Pen(g);
  const r = mulberry32(seed);
  p.ellipse(10, 32, 6, 1.5, P.PINE);
  p.rect(9, 8, 3, 25, P.SHADOW); p.vline(9, 8, 32, P.CRAN);
  const branch = (x: number, y: number, dx: number, len: number) => {
    let cx = x, cy = y;
    for (let i = 0; i < len; i++) { cx += dx; if (r() < 0.5) cy -= 1; p.px(cx, cy, P.SHADOW); }
  };
  branch(10, 14, -1, 7); branch(11, 11, 1, 7); branch(10, 20, 1, 5); branch(10, 8, -1, 4);
  p.vline(10, 2, 8, P.SHADOW);
  p.px(10, 16, P.LANTERN); p.px(10, 17, P.AMBER);
  return outline(c);
}

function bakeCranBush(): Canv {
  const { c, g } = makeCanvas(16, 16);
  const p = new Pen(g);
  const r = mulberry32(941);
  for (let i = 0; i < 26; i++) { const x = 1 + r() * 14, y = 8 + r() * 7; p.px(x, y, r() < 0.5 ? P.FOREST : P.MOSS); }
  for (let i = 0; i < 8; i++) { const x = 2 + r() * 12, y = 8 + r() * 6; p.px(x, y, P.RED); p.px(x, y + 1, P.CRAN); }
  return c;
}

/** Red spruce: the narrow, dark spire of the high Allegheny glades. */
function bakeSpruce(seed: number): Canv {
  const { c, g } = makeCanvas(20, 34);
  const p = new Pen(g);
  const r = mulberry32(seed);
  p.ellipse(10, 32, 7, 1.8, P.SHADOW);
  p.rect(9, 26, 3, 7, P.RUST); p.vline(11, 26, 32, P.CRAN);
  for (let y = 2; y < 28; y++) {
    const half = Math.min(8, 1 + (y - 2) * 0.32 + (y % 4 === 0 ? 1 : 0));
    for (let x = Math.round(10 - half); x <= Math.round(10 + half); x++) {
      const edge = Math.abs(x - 10) >= half - 1;
      p.px(x, y, edge ? (r() < 0.5 ? P.PINE : P.SHADOW) : (x < 10 ? P.FOREST : P.PINE));
    }
    if (y % 4 === 0) p.hline(Math.round(10 - half), Math.round(10 + half), y, P.SHADOW);
  }
  p.px(10, 1, P.PINE); p.px(10, 0, P.FOREST);
  return outline(c);
}

/** Skunk cabbage: broad green leaves around a mottled purple hood. */
function bakeSkunkCabbage(): Canv {
  const { c, g } = makeCanvas(16, 16);
  const p = new Pen(g);
  p.ellipse(4, 10, 3.5, 2.2, P.MOSS); p.ellipse(12, 10, 3.5, 2.2, P.MOSS);
  p.ellipse(5, 7, 2.6, 3.2, P.FOREST); p.ellipse(11, 7, 2.6, 3.2, P.FOREST);
  p.line(4, 10, 6, 6, P.FERN); p.line(12, 10, 10, 6, P.FERN);
  p.ellipse(8, 10, 2.2, 3, P.CRAN); p.px(8, 8, P.VIOLET); p.px(7, 11, P.AMBER); p.px(9, 10, P.VIOLET);
  p.hline(3, 13, 13, P.PINE);
  return outline(c);
}

function bakeTotem(): Canv {
  const { c, g } = makeCanvas(16, 30);
  const p = new Pen(g);
  p.ellipse(8, 28, 6, 1.6, P.SHADOW);
  p.rect(4, 4, 8, 25, P.AMBER); p.vline(11, 4, 28, P.RUST);
  for (const y of [6, 14, 22]) {
    p.hline(4, 11, y - 1, P.RUST);
    p.px(6, y + 1, P.VOID); p.px(9, y + 1, P.VOID); p.hline(6, 9, y + 4, P.CRAN);
  }
  p.rect(2, 9, 2, 3, P.LANTERN); p.rect(12, 17, 2, 3, P.LANTERN);
  p.rect(5, 1, 6, 3, P.LANTERN); p.hline(5, 10, 1, P.AMBER);
  return outline(c);
}

function bakeRod(frame: number): Canv {
  const { c, g } = makeCanvas(16, 32);
  const p = new Pen(g);
  p.rect(5, 28, 6, 4, P.MIST); p.hline(5, 10, 28, P.FOG);
  p.vline(7, 3, 28, P.AMBER); p.vline(8, 3, 28, P.RUST);
  for (let y = 10; y < 28; y += 5) p.hline(6, 9, y, P.CRAN);
  p.px(7, 1, P.LANTERN); p.px(8, 2, P.LANTERN); p.px(7, 2, P.AMBER);
  if (frame) { p.px(5, 1, P.LANTERN); p.px(10, 3, P.FOG); p.px(4, 4, P.MIST); }
  return outline(c);
}

function bakeChime(frame: number): Canv {
  const { c, g } = makeCanvas(16, 28);
  const p = new Pen(g);
  p.vline(2, 2, 27, P.RUST); p.vline(13, 2, 27, P.RUST);
  p.hline(1, 14, 2, P.AMBER); p.hline(1, 14, 3, P.RUST);
  for (let k = 0; k < 4; k++) {
    const x = 4 + k * 2 + (frame && k % 2 ? 1 : 0);
    p.vline(x, 4, 7 + k, P.FOG);
    p.rect(x, 8 + k, 1, 4, k % 2 ? P.FOG : P.LANTERN);
  }
  p.px(5, 15, P.LANTERN); p.px(4, 16, P.LANTERN); p.px(9, 17, P.LANTERN); p.px(10, 18, P.LANTERN);
  return outline(c);
}

function bakePylon(frame: number): Canv {
  const { c, g } = makeCanvas(16, 34);
  const p = new Pen(g);
  p.rect(3, 29, 10, 5, P.TWILIGHT); p.hline(3, 12, 29, P.MIST);
  p.rect(6, 8, 4, 21, P.SHADOW);
  for (let y = 11; y < 28; y += 3) { p.hline(4, 11, y, P.AMBER); p.px(4, y, P.RUST); }
  p.ellipse(8, 5, 5, 3, P.MIST); p.hline(4, 11, 4, P.FOG);
  const sparks = frame ? [[1, 2], [14, 6], [3, 9]] : [[13, 1], [2, 5], [12, 9]];
  for (const [x, y] of sparks) { p.px(x, y, P.LANTERN); p.px(x + 1, y + 1, P.MIST); }
  return outline(c);
}

function bakeRodBase(): Canv {
  const { c, g } = makeCanvas(16, 16);
  const p = new Pen(g);
  p.rect(3, 9, 10, 6, P.MIST); p.hline(3, 12, 9, P.FOG); p.hline(3, 12, 14, P.TWILIGHT);
  p.rect(7, 5, 2, 4, P.AMBER);
  return outline(c);
}

/* ---------------- structures ---------------- */

function bakeMine(): Canv {
  const W = 80, H = 80;
  const { c, g } = makeCanvas(W, H);
  const p = new Pen(g);
  const r = mulberry32(951);
  const inside = (x: number, y: number) => ((x + 0.5 - 40) / 40) ** 2 + ((y + 0.5 - 60) / 52) ** 2 <= 1 && y < H;
  p.blob(W, H, inside, (_x, y, edge) => (edge ? P.VOID : r() < 0.12 ? P.CRAN : y < 20 && r() < 0.3 ? P.MOSS : P.RUST));
  // timber frame
  p.rect(22, 32, 36, 48, P.VOID);
  p.rect(22, 30, 6, 50, P.AMBER); p.rect(52, 30, 6, 50, P.AMBER);
  p.vline(27, 30, 79, P.RUST); p.vline(57, 30, 79, P.RUST);
  p.rect(18, 26, 44, 6, P.AMBER); p.hline(18, 61, 26, P.LANTERN); p.hline(18, 61, 31, P.RUST);
  // iron gate
  for (let x = 30; x < 52; x += 4) p.vline(x, 34, 79, P.MIST);
  p.hline(28, 51, 46, P.TWILIGHT); p.hline(28, 51, 62, P.TWILIGHT);
  p.rect(38, 50, 4, 6, P.AMBER); p.px(39, 52, P.SHADOW);
  // warning sign
  p.rect(30, 18, 20, 7, P.RED); p.hline(32, 47, 20, P.FOG); p.hline(33, 45, 22, P.FOG);
  return outline(c);
}

function bakeTower(blink: boolean): Canv {
  const W = 48, H = 112;
  const { c, g } = makeCanvas(W, H);
  const p = new Pen(g);
  p.rect(6, H - 10, 36, 10, P.MIST); p.hline(6, 41, H - 10, P.FOG); p.hline(6, 41, H - 1, P.TWILIGHT);
  const top = 6;
  for (let y = top; y < H - 10; y++) {
    const f = (y - top) / (H - 10 - top);
    const half = Math.round(3 + f * 15);
    p.px(24 - half, y, P.TWILIGHT); p.px(23 + half, y, P.TWILIGHT);
  }
  for (let y = top + 6; y < H - 10; y += 8) {
    const f0 = (y - top) / (H - 10 - top), f1 = (y + 8 - top) / (H - 10 - top);
    const h0 = Math.round(3 + f0 * 15), h1 = Math.round(3 + f1 * 15);
    p.line(24 - h0, y, 23 + h1, y + 8, P.MIST);
    p.line(23 + h0, y, 24 - h1, y + 8, P.MIST);
    p.hline(24 - h0, 23 + h0, y, P.TWILIGHT);
  }
  p.rect(20, 20, 8, 6, P.SHADOW); p.rect(21, 21, 6, 4, P.MIST);
  p.vline(24, 0, top, P.MIST);
  p.rect(22, 0, 4, 3, blink ? P.RED : P.CRAN);
  if (blink) { p.px(21, 1, P.RED); p.px(26, 1, P.RED); }
  return outline(c);
}

export function bakeWild(): void {
  GROUND.bog = [bogTile(1001), bogTile(1002), bogTile(1003)];
  GROUND.shallow = [shallowTile(0), shallowTile(1)];
  GROUND.spring = [springTile(0), springTile(1)];
  GROUND.boardwalk = [plankTile(P.RUST, P.SHADOW, P.AMBER, false, 1011)];
  GROUND.hemlock = [0, 1, 2].map((i) => {
    const { c, p, r } = tile(P.PINE, [[P.SHADOW, 0.12], [P.FOREST, 0.07]], 1020 + i);
    for (let k = 0; k < 4; k++) { const x = r() * 14, y = r() * 15; p.px(x, y, P.RUST); p.px(x + 1, y + 1, P.CRAN); }
    return c;
  });
  GROUND.rocky = [0, 1, 2].map((i) => {
    const { c, p, r } = tile(P.RUST, [[P.CRAN, 0.1], [P.AMBER, 0.05]], 1030 + i);
    for (let k = 0; k < 2; k++) { const x = r() * 14, y = r() * 14; p.px(x, y, P.MIST); p.px(x + 1, y, P.TWILIGHT); p.px(x, y - 1, P.FOG); }
    return c;
  });
  GROUND.slope = [ledgeTile(1040), ledgeTile(1041)];
  GROUND.cliff = [cliffTile(1050), cliffTile(1051)];
  GROUND.ruin = [ruinTile(1060), ruinTile(1061), ruinTile(1062)];
  GROUND.clover = [cloverTile(1070), cloverTile(1071), cloverTile(1072)];
  OVER.cliffLip = edgeOverlay('N', [{ c: [P.MOSS], p: 1 }, { c: [P.MOSS, P.FOREST], p: 0.8 }, { c: [P.FOREST], p: 0.4 }], 1080);
  OVER.cliffEdgeS = edgeOverlay('S', [{ c: [P.VOID], p: 1 }, { c: [P.SHADOW], p: 0.8 }], 1081);
  OVER.shallowN = edgeOverlay('N', [{ c: [P.TWILIGHT], p: 1 }, { c: [P.FOG], p: 0.3 }], 1082);
  OVER.shallowS = edgeOverlay('S', [{ c: [P.TWILIGHT], p: 0.8 }], 1083);
  OVER.shallowW = edgeOverlay('W', [{ c: [P.TWILIGHT], p: 0.8 }], 1084);
  OVER.shallowE = edgeOverlay('E', [{ c: [P.TWILIGHT], p: 0.8 }], 1085);

  OBJ.apple = [bakeApple(61), bakeApple(62)];
  OBJ.stonewall = [bakeStoneWall()];
  OBJ.willow = [bakeWillow(71), bakeWillow(72)];
  OBJ.hemlock = [bakeHemlock(81), bakeHemlock(82), bakeHemlock(83)];
  OBJ.hollowlog = [bakeHollowLog()];
  OBJ.ruinwall = [bakeRuinWall(91), bakeRuinWall(92), bakeRuinWall(93)];
  OBJ.lumber = [bakeLumber()];
  OBJ.sawblade = [bakeSawBlade()];
  OBJ.slag = [bakeSlag()];
  OBJ.deadtree = [bakeDeadTree(101), bakeDeadTree(102)];
  OBJ.cranbush = [bakeCranBush()];
  OBJ.spruce = [bakeSpruce(131), bakeSpruce(132)];
  OBJ.skunkcabbage = [bakeSkunkCabbage()];
  OBJ.totem = [bakeTotem()];
  OBJ.rod = [bakeRod(0), bakeRod(1)];
  OBJ.chime = [bakeChime(0), bakeChime(1)];
  OBJ.pylon = [bakePylon(0), bakePylon(1)];
  OBJ.rodbase = [bakeRodBase()];
  STRUCT.mine = [bakeMine()];
  STRUCT.tower = [bakeTower(false), bakeTower(true)];

  // Inventory icons for mounts reuse the shrunk sprite silhouettes.
  const shrink = (src: Canv): Canv => {
    const { c, g } = makeCanvas(16, 16);
    const s = Math.min(14 / src.width, 14 / src.height);
    const w = Math.max(1, Math.round(src.width * s)), h = Math.max(1, Math.round(src.height * s));
    g.drawImage(src, Math.floor((16 - w) / 2), Math.floor((16 - h) / 2), w, h);
    return c;
  };
  ICON.lure_totem = shrink(OBJ.totem[0]);
  ICON.lightning_rod = shrink(OBJ.rod[0]);
  ICON.antler_chime = shrink(OBJ.chime[0]);
  ICON.tesla_pylon = shrink(OBJ.pylon[0]);
  bakeP2Icons();
}

/* ---------------- Phase 2 item icons ---------------- */

const P2_ICONS: Record<string, string[]> = {
  wild_apple: ['.....3......', '.....34.....', '....3.44....', '..1111111...', '.177777881..', '17667777781.', '17677777781.', '17777777781.', '17777777881.', '.177777889..', '..18888891..', '...11111....'],
  sweet_sap: ['....1111....', '...198891...', '...1aaaa1...', '..17777771..', '..17888871..', '..17877871..', '..17887771..', '..17888871..', '..17888871..', '..17777771..', '...111111...', '............'],
  foraged_meat: ['............', '...1111.....', '..1bbbb1....', '.1bb6bbb1...', '.1b6bbbbb1..', '.1bbbbbab61.', '..1bbbaa1661', '...1aaa1.161', '....111..11.', '............', '............', '............'],
  foraged_egg: ['............', '....1111....', '...166661...', '..16766661..', '..16666d61..', '.166d66666..', '.1666666d1..', '.16d666661..', '..1666661...', '...11111....', '............', '............'],
  sulfur_crust: ['............', '.....1......', '....171.1...', '...17781771.', '..1787878871', '.17878787871', '.18787888871', '.18888888881', '..111111111.', '............', '............', '............'],
  scrap_copper: ['............', '..1111......', '.18881..11..', '.189981188..', '..1999818981', '...1881.1891', '..118981.11.', '.1898891....', '.188.881....', '..11..11....', '............', '............'],
  iron_nail: ['............', '...11111....', '...1ddd1....', '....1d1.....', '....1d1.....', '....1d1.....', '....1d1.....', '....1d1.....', '....1d1.....', '.....1......', '............', '............'],
  smoked_venison: ['............', '..11111.....', '.1a9a9a1....', '1a99999a1...', '1a9a9a9a11..', '1a99999a161.', '.1a9a9a1661.', '..11111.161.', '.......11...', '............', '............', '............'],
  fermented_mash: ['....111.....', '...16661....', '...1ddd1....', '..1aaaaa1...', '.1abbbbba1..', '.1ababab61..', '.1abbbbba1..', '.1aababaa1..', '.1aaaaaaa1..', '..1111111...', '............', '............'],
  sulfur_egg: ['............', '....1111....', '...177871...', '..17878871..', '..18788781..', '.178787878..', '.18878887...', '.17887888...', '..1888881...', '...11111.7..', '.....7..7...', '......7.....'],
  battery_pack: ['............', '...11..11...', '..1dd11dd1..', '.1cccccccc1.', '.1c777777c1.', '.1c7c77c7c1.', '.1c777777c1.', '.1cccccccc1.', '.1c55cc55c1.', '.1cccccccc1.', '..11111111..', '............'],
  smoked_fish: ['............', '............', '.....1111...', '1...188881..', '11.1899988.1', '191899890891', '11.1899988.1', '1...188881..', '.....1111...', '............', '............', '............'],
  apple_cider: ['....111.....', '....191.....', '...11111....', '..1777771...', '..1888881...', '.188888881..', '.189888881..', '.189888881..', '.188888881..', '.188888881..', '..1111111...', '............'],
  wisp_oil: ['....111.....', '....161.....', '...16661....', '..1d666d1...', '.1defffed1..', '.1dffeffd1..', '.1deffffd1..', '.1dfeffed1..', '..1defed1...', '...11111....', '............', '............'],
  brimstone_incense: ['.....7......', '....7.......', '.....7......', '.....b......', '.....9......', '.....9......', '...11911....', '..1aaaaa1...', '..1a888a1...', '...1aaa1....', '....111.....', '............'],
  lunar_dew: ['....111.....', '....1f1.....', '...1fff1....', '..1f777f1...', '.1f77f77f1..', '.1fff7fff1..', '.1f7ff7ff1..', '.1fffff7f1..', '..1fffff1...', '...11111....', '............', '............'],
  bog_waders: ['............', '..1111.1111.', '..1441.1441.', '..1441.1441.', '..1441.1441.', '..1441.1441.', '..1441.1441.', '..1331.1331.', '.13331133331', '.11111111111', '............', '............'],
  scent_mask: ['............', '...111111...', '..14444441..', '.1455555541.', '.1444444441.', '.1434343431.', '.1444444441.', '..14444441..', '...111111...', '..1.....1...', '............', '............'],
  thermal_lens: ['............', '...111111...', '..1bbbbbb1..', '.1b7bbbbab1.', '.1bbbbbbab1.', '.1bbbbbbab1.', '.1babbbbab1.', '..1aaaaaa1..', '...111111...', '....1991....', '....1991....', '.....11.....'],
  brass_bell: ['.....1......', '....191.....', '...18881....', '..1877881...', '..1878881...', '..1888881...', '.188888881..', '.199999991..', '..1111111...', '.....1a1....', '......1.....', '............'],
  silver_bell: ['.....1......', '....1d1.....', '...1d6d1....', '..1d66dd1...', '..1d6ddd1...', '..1ddddd1...', '.1ddddddd1..', '.1ccccccc1..', '..1111111...', '.....1a1....', '......1.....', '............'],
  static_radio: ['.........1..', '........1...', '..11111111..', '.1cccccccc1.', '.1c66c7b7c1.', '.1c66c777c1.', '.1cccccccc1.', '.1c1c1c1cc1.', '.1cccccccc1.', '..11111111..', '............', '............'],
  parabolic_dish: ['............', '.1111.......', '1dddd11.....', '1d666dd1....', '.1d666dd1...', '..1d66ddd1..', '...1dddd1771', '....1dd17...', '.....11.1...', '.......191..', '......19991.', '......11111.'],
  chronos_shutter: ['............', '..11111111..', '.1cccccccc1.', '.1c111111c1.', '.1c1fefe1c1.', '.1c1efef1c1.', '.1c1fefe1c1.', '.1c111111c1.', '.1c77cc66c1.', '.1cccccccc1.', '..11111111..', '............'],
};

function bakeP2Icons(): void {
  for (const [id, art] of Object.entries(P2_ICONS)) ICON[id] = fromArt(art, {}, 16, 16);
}
