/**
 * Procedural sprite baker. Every pixel in the game is generated here at boot
 * from the 16-colour palette — no external image files.
 */
import { makeCanvas, Pen, fromArt, flipH, outline, Canv } from './canvas';
import { P } from './palette';
import { mulberry32 } from '../util';
import { CROPS } from '../data/items';

export const TILE = 16;

export const GROUND: Record<string, Canv[]> = {};
export const OVER: Record<string, Canv> = {};
export const OBJ: Record<string, Canv[]> = {};
export const ICON: Record<string, Canv> = {};
export const CROP: Record<string, Canv[]> = {};
export const STRUCT: Record<string, Canv[]> = {};
export const MISC: Record<string, Canv> = {};

type Rng = () => number;

function tile(base: number, specks: Array<[number, number]>, seed: number): { c: Canv; p: Pen; r: Rng } {
  const { c, g } = makeCanvas(TILE, TILE);
  const p = new Pen(g);
  const r = mulberry32(seed);
  p.rect(0, 0, TILE, TILE, base);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const v = r();
      let acc = 0;
      for (const [col, d] of specks) {
        acc += d;
        if (v < acc) { p.px(x, y, col); break; }
      }
    }
  }
  return { c, p, r };
}

/* ------------------------------------------------------------------ */
/* Ground                                                              */
/* ------------------------------------------------------------------ */

function grassTile(seed: number, flowers: boolean): Canv {
  const { c, p, r } = tile(P.MOSS, [[P.FOREST, 0.08], [P.FERN, 0.025]], seed);
  for (let i = 0; i < 5; i++) {
    const x = Math.floor(r() * 15), y = 1 + Math.floor(r() * 14);
    p.px(x, y - 1, P.FERN); p.px(x, y, P.FOREST); p.px(x + 1, y, P.FOREST);
  }
  if (flowers) {
    const cols = [P.LANTERN, P.MOON, P.RED, P.FOG];
    for (let i = 0; i < 3; i++) {
      const x = 2 + Math.floor(r() * 12), y = 2 + Math.floor(r() * 12);
      const col = cols[Math.floor(r() * cols.length)];
      p.px(x - 1, y, col); p.px(x + 1, y, col); p.px(x, y - 1, col); p.px(x, y + 1, col);
      p.px(x, y, P.AMBER);
    }
  }
  return c;
}

function forestTile(seed: number): Canv {
  const { c, p, r } = tile(P.FOREST, [[P.PINE, 0.16], [P.MOSS, 0.04]], seed);
  for (let i = 0; i < 4; i++) {
    const x = Math.floor(r() * 14), y = Math.floor(r() * 15);
    p.px(x, y, P.RUST); p.px(x + 1, y + (r() < 0.5 ? 1 : 0), P.RUST);
  }
  return c;
}

function pathTile(seed: number): Canv {
  const { c, p, r } = tile(P.AMBER, [[P.LANTERN, 0.06], [P.RUST, 0.06]], seed);
  for (let i = 0; i < 2; i++) {
    const x = 1 + Math.floor(r() * 13), y = 1 + Math.floor(r() * 13);
    p.px(x, y, P.MIST); p.px(x + 1, y, P.TWILIGHT); p.px(x, y - 1, P.FOG);
  }
  return c;
}

function plotTile(base: number, specks: Array<[number, number]>, border: number, seed: number, furrow?: [number, number], sparkle?: number): Canv {
  const { c, p, r } = tile(base, specks, seed);
  if (furrow) {
    for (let y = 2; y < 16; y += 4) {
      for (let x = 1; x < 15; x++) {
        if (r() < 0.85) p.px(x, y, furrow[0]);
        p.px(x, y + 1, furrow[1]);
      }
    }
  }
  if (sparkle !== undefined) for (let i = 0; i < 4; i++) p.px(1 + r() * 14, 1 + r() * 14, sparkle);
  p.hline(0, 15, 0, border); p.vline(0, 0, 15, border);
  p.hline(0, 15, 15, border); p.vline(15, 0, 15, border);
  return c;
}

function waterTile(frame: number): Canv {
  const { c, g } = makeCanvas(TILE, TILE);
  const p = new Pen(g);
  p.rect(0, 0, 16, 16, P.TWILIGHT);
  const r = mulberry32(77);
  for (let k = 0; k < 6; k++) {
    const x = Math.floor(r() * 16), y = Math.floor(r() * 16);
    const xx = (x + frame * 2) % 16;
    p.px(xx, y, P.MIST); p.px((xx + 1) % 16, y, P.MIST);
    if (r() < 0.5) p.px((xx + 2) % 16, y, P.MIST);
  }
  const r2 = mulberry32(90 + frame);
  for (let k = 0; k < 2; k++) p.px(r2() * 16, r2() * 16, P.MOON);
  return c;
}

function plankTile(base: number, line: number, grain: number, vertical: boolean, seed: number, gap = 4): Canv {
  const { c, p, r } = tile(base, [[grain, 0.05]], seed);
  for (let i = gap - 1; i < 16; i += gap) {
    if (vertical) p.vline(i, 0, 15, line); else p.hline(0, 15, i, line);
  }
  // staggered butt joints
  for (let i = 0; i < 16; i += gap) {
    const o = Math.floor(r() * 14) + 1;
    if (vertical) p.px(i + 1, o, line); else p.px(o, i + 1, line);
  }
  return c;
}

type Side = 'N' | 'S' | 'W' | 'E';

/** Generic edge fringe overlay: layers[k] painted at depth k from the side. */
function edgeOverlay(side: Side, layers: Array<{ c: number[]; p: number }>, seed: number): Canv {
  const { c, g } = makeCanvas(TILE, TILE);
  const p = new Pen(g);
  const r = mulberry32(seed);
  for (let k = 0; k < layers.length; k++) {
    const L = layers[k];
    for (let i = 0; i < 16; i++) {
      if (r() >= L.p) continue;
      const col = L.c[Math.floor(r() * L.c.length)];
      if (side === 'N') p.px(i, k, col);
      else if (side === 'S') p.px(i, 15 - k, col);
      else if (side === 'W') p.px(k, i, col);
      else p.px(15 - k, i, col);
    }
  }
  return c;
}

function bakeGround(): void {
  GROUND.grass = [0, 1, 2, 3].map((i) => grassTile(100 + i, false));
  GROUND.flowers = [0, 1, 2].map((i) => grassTile(200 + i, true));
  GROUND.forest = [0, 1, 2].map((i) => forestTile(300 + i));
  GROUND.path = [0, 1, 2].map((i) => pathTile(400 + i));
  GROUND.soil = [plotTile(P.RUST, [[P.CRAN, 0.12], [P.AMBER, 0.05]], P.CRAN, 501)];
  GROUND.tilled = [plotTile(P.CRAN, [[P.RUST, 0.06]], P.SHADOW, 502, [P.RUST, P.SHADOW])];
  GROUND.tilledWet = [plotTile(P.SHADOW, [[P.CRAN, 0.06]], P.VOID, 503, [P.CRAN, P.VOID], P.MIST)];
  GROUND.bog = [plotTile(P.FOREST, [[P.PINE, 0.15], [P.TWILIGHT, 0.06]], P.PINE, 504)];
  GROUND.bogTilled = [plotTile(P.PINE, [[P.FOREST, 0.06]], P.SHADOW, 505, [P.FOREST, P.SHADOW])];
  GROUND.bogWet = [plotTile(P.SHADOW, [[P.TWILIGHT, 0.08]], P.VOID, 506, [P.TWILIGHT, P.VOID], P.MIST)];
  GROUND.water = [waterTile(0), waterTile(1)];
  GROUND.bridge = [plankTile(P.AMBER, P.RUST, P.LANTERN, true, 601)];
  GROUND.porch = [plankTile(P.AMBER, P.RUST, P.RUST, false, 602)];
  GROUND.floor = [plankTile(P.RUST, P.CRAN, P.AMBER, true, 603, 5), plankTile(P.RUST, P.CRAN, P.AMBER, true, 604, 5)];

  // Interior walls
  {
    const { c, p } = tile(P.SHADOW, [[P.VOID, 0.1]], 701);
    p.hline(0, 15, 15, P.PINE);
    GROUND.wallTop = [c];
  }
  {
    const { c, p } = tile(P.PINE, [], 702);
    for (let x = 1; x < 16; x += 4) p.vline(x, 0, 15, P.FOREST);
    for (let y = 2; y < 16; y += 5) for (let x = 3; x < 16; x += 4) p.px(x, y, P.MOSS);
    GROUND.wallFace = [c];
  }
  {
    const { c, p } = tile(P.RUST, [[P.CRAN, 0.03]], 703);
    for (let x = 3; x < 16; x += 4) p.vline(x, 3, 15, P.CRAN);
    p.hline(0, 15, 0, P.LANTERN); p.hline(0, 15, 1, P.AMBER); p.hline(0, 15, 2, P.CRAN);
    p.hline(0, 15, 15, P.SHADOW);
    GROUND.wallBase = [c];
  }
  {
    const { c, p } = tile(P.SHADOW, [[P.PINE, 0.08]], 704);
    p.hline(0, 15, 0, P.VOID);
    GROUND.wallSide = [c];
  }
  {
    const { c, p } = tile(P.CRAN, [[P.RED, 0.04]], 705);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.abs(x - 7.5) + Math.abs(y - 7.5);
      if (Math.floor(d) === 6) p.px(x, y, P.RED);
      if (Math.floor(d) === 2) p.px(x, y, P.AMBER);
    }
    GROUND.rug = [c];
  }
  {
    const { c, p } = tile(P.RUST, [], 706);
    for (let y = 2; y < 14; y++) for (let x = 1; x < 15; x++) if ((x + y) % 2 === 0) p.px(x, y, P.AMBER);
    p.hline(1, 14, 2, P.CRAN); p.hline(1, 14, 13, P.CRAN);
    GROUND.doormat = [c];
  }
  {
    const { c, p } = tile(P.VOID, [], 707);
    p.rect(0, 0, 2, 16, P.RUST); p.rect(14, 0, 2, 16, P.RUST);
    p.vline(2, 0, 15, P.CRAN); p.vline(13, 0, 15, P.CRAN);
    for (let y = 0; y < 6; y++) p.hline(3, 12, y, y < 3 ? P.SHADOW : P.VOID);
    GROUND.door = [c];
  }
  {
    const { c, p } = tile(P.TWILIGHT, [[P.MIST, 0.05]], 708);
    for (let y = 3; y < 16; y += 4) p.hline(0, 15, y, P.SHADOW);
    for (let y = 0; y < 16; y += 4) p.px((y * 3) % 16, y + 1, P.SHADOW);
    GROUND.hearth = [c];
  }
  GROUND.void = [tile(P.VOID, [], 1).c];

  const grassFringe = [{ c: [P.MOSS], p: 1 }, { c: [P.MOSS, P.FOREST], p: 0.55 }, { c: [P.FOREST], p: 0.12 }];
  OVER.pathN = edgeOverlay('N', grassFringe, 11);
  OVER.pathS = edgeOverlay('S', grassFringe, 12);
  OVER.pathW = edgeOverlay('W', grassFringe, 13);
  OVER.pathE = edgeOverlay('E', grassFringe, 14);
  OVER.bankN = edgeOverlay('N', [{ c: [P.SHADOW], p: 1 }, { c: [P.SHADOW], p: 0.65 }, { c: [P.MIST], p: 0.25 }], 21);
  OVER.bankS = edgeOverlay('S', [{ c: [P.RUST], p: 1 }, { c: [P.CRAN], p: 0.7 }, { c: [P.MIST], p: 0.3 }], 22);
  OVER.bankW = edgeOverlay('W', [{ c: [P.SHADOW], p: 1 }, { c: [P.MIST], p: 0.3 }], 23);
  OVER.bankE = edgeOverlay('E', [{ c: [P.SHADOW], p: 1 }, { c: [P.MIST], p: 0.3 }], 24);
  OVER.railN = edgeOverlay('N', [{ c: [P.RUST], p: 1 }, { c: [P.CRAN], p: 1 }, { c: [P.SHADOW], p: 0.5 }], 31);
  OVER.railS = edgeOverlay('S', [{ c: [P.CRAN], p: 1 }, { c: [P.RUST], p: 1 }], 32);
  OVER.rugN = edgeOverlay('N', [{ c: [P.AMBER], p: 1 }, { c: [P.RED], p: 1 }], 41);
  OVER.rugS = edgeOverlay('S', [{ c: [P.AMBER], p: 1 }, { c: [P.RED], p: 1 }], 42);
  OVER.rugW = edgeOverlay('W', [{ c: [P.AMBER], p: 1 }, { c: [P.RED], p: 1 }], 43);
  OVER.rugE = edgeOverlay('E', [{ c: [P.AMBER], p: 1 }, { c: [P.RED], p: 1 }], 44);
}

/* ------------------------------------------------------------------ */
/* Trees & nature objects                                              */
/* ------------------------------------------------------------------ */

function bakePine(seed: number): Canv {
  const w = 20, h = 36, cx = 10;
  const { c, g } = makeCanvas(w, h);
  const p = new Pen(g);
  const r = mulberry32(seed);
  p.ellipse(10, h - 3, 7.5, 2.5, P.PINE);
  p.rect(8, h - 11, 4, 9, P.RUST);
  p.rect(10, h - 11, 2, 9, P.CRAN);
  p.px(8, h - 3, P.CRAN); p.px(11, h - 3, P.SHADOW);
  const sway = r() < 0.5 ? 0 : 1;
  const tiers: Array<[number, number, number]> = [[1, 9, 4], [6, 15, 6], [11, 21, 8], [16, 28, 10]];
  for (let ti = tiers.length - 1; ti >= 0; ti--) {
    const [y0, y1, wm] = tiers[ti];
    const off = ti === 0 ? sway : 0;
    for (let y = y0; y <= y1; y++) {
      const f = (y - y0) / (y1 - y0);
      const wd = Math.max(1, Math.round(1 + f * (wm - 1)));
      for (let x = cx - wd + off; x < cx + wd + off; x++) {
        const rel = (x - (cx - wd + off)) / (2 * wd);
        let col: number = P.FOREST;
        if (rel < 0.32) col = r() < 0.22 ? P.FERN : P.MOSS;
        else if (rel > 0.66) col = P.PINE;
        if (y === y1 || (y === y1 - 1 && r() < 0.45)) col = P.PINE;
        if (x === cx - wd + off || x === cx + wd + off - 1) col = P.SHADOW;
        p.px(x, y, col);
      }
      if (y === y1) for (let x = cx - wd + 1; x < cx + wd - 1; x += 2) if (r() < 0.55) p.px(x, y + 1, P.SHADOW);
    }
  }
  p.px(cx - 1 + sway, 0, P.SHADOW); p.px(cx + sway, 0, P.SHADOW);
  // pinecones
  for (let i = 0; i < 2; i++) p.px(6 + r() * 8, 14 + r() * 12, P.RUST);
  return c;
}

function bakeOak(seed: number): Canv {
  const w = 24, h = 30;
  const { c, g } = makeCanvas(w, h);
  const p = new Pen(g);
  const r = mulberry32(seed);
  p.ellipse(12, h - 3, 8, 2.5, P.PINE);
  p.rect(10, h - 12, 4, 10, P.RUST); p.rect(12, h - 12, 2, 10, P.CRAN);
  p.px(9, h - 3, P.RUST); p.px(14, h - 3, P.CRAN);
  const circles: Array<[number, number, number]> = [[12, 9, 8], [6, 13, 5.5], [18, 13, 5.5], [12, 15, 6.5], [8, 7, 4.5], [16, 7, 4.5]];
  const inside = (x: number, y: number) => circles.some(([cx, cy, rr]) => (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= rr * rr);
  const noise = new Map<number, number>();
  p.blob(w, 22, inside, (x, y, edge) => {
    if (edge) return P.SHADOW;
    let v = noise.get(y * w + x);
    if (v === undefined) { v = r(); noise.set(y * w + x, v); }
    const light = (x - y) / 24 + v * 0.35;
    if (light > 0.25) return v > 0.8 ? P.FERN : P.MOSS;
    if (light > -0.25) return P.FOREST;
    return P.PINE;
  });
  // acorns
  for (let i = 0; i < 3; i++) p.px(5 + r() * 14, 8 + r() * 10, P.AMBER);
  return c;
}

function bakeBrush(seed: number, berries: boolean): Canv {
  const { c, g } = makeCanvas(16, 16);
  const p = new Pen(g);
  const r = mulberry32(seed);
  const circles: Array<[number, number, number]> = [[8, 9, 5], [4.5, 11, 3.8], [11.5, 11, 3.8], [8, 12, 4.5]];
  const inside = (x: number, y: number) => circles.some(([cx, cy, rr]) => (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= rr * rr) && y < 16;
  p.blob(16, 16, inside, (x, y, edge) => {
    if (edge) return P.SHADOW;
    const v = r();
    if (y < 8 + (x > 8 ? 1 : 0)) return v < 0.3 ? P.FERN : P.MOSS;
    return v < 0.25 ? P.MOSS : v < 0.6 ? P.FOREST : P.PINE;
  });
  p.px(6, 6, P.RUST); p.px(5, 5, P.RUST); p.px(10, 6, P.RUST);
  if (berries) for (let i = 0; i < 4; i++) p.px(3 + r() * 10, 8 + r() * 5, P.RED);
  return c;
}

function bakeRock(seed: number, big: boolean): Canv {
  const { c, g } = makeCanvas(16, 16);
  const p = new Pen(g);
  const r = mulberry32(seed);
  const cx = 8, cy = big ? 9 : 10.5, rx = big ? 7.5 : 6, ry = big ? 6.5 : 4.5;
  const inside = (x: number, y: number) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
  p.blob(16, 16, inside, (x, y, edge) => {
    if (edge) return P.SHADOW;
    const l = (cx - x) / rx + (cy - y) / ry + r() * 0.3;
    const baseHi = big ? P.MIST : P.FOG;
    const baseMid = big ? P.TWILIGHT : P.MIST;
    if (l > 0.9) return baseHi;
    if (l > -0.4) return baseMid;
    return big ? P.SHADOW : P.TWILIGHT;
  });
  if (big) { p.px(5, 4, P.MOSS); p.px(6, 4, P.FERN); p.px(7, 3, P.MOSS); p.px(4, 5, P.MOSS); }
  p.px(9, 9, P.SHADOW); p.px(10, 10, P.SHADOW);
  return c;
}

function bakeStump(): Canv {
  const { c, g } = makeCanvas(16, 16);
  const p = new Pen(g);
  p.ellipse(8, 13.5, 7, 2, P.PINE);
  p.rect(3, 7, 10, 7, P.RUST);
  p.vline(10, 8, 13, P.CRAN); p.vline(11, 8, 13, P.CRAN); p.vline(12, 7, 13, P.CRAN);
  p.vline(5, 9, 12, P.CRAN);
  p.px(2, 13, P.RUST); p.px(13, 13, P.CRAN);
  p.ellipse(8, 7, 5.5, 2.5, P.AMBER);
  p.ellipse(8, 7, 3, 1.3, P.RUST);
  p.px(8, 7, P.AMBER);
  return outline(c);
}

function bakeLog(): Canv {
  const { c, g } = makeCanvas(16, 16);
  const p = new Pen(g);
  p.ellipse(8, 14, 8, 1.6, P.PINE);
  p.rect(1, 7, 12, 7, P.RUST);
  p.hline(1, 12, 7, P.AMBER); p.hline(1, 12, 12, P.CRAN); p.hline(1, 12, 13, P.CRAN);
  p.hline(3, 9, 10, P.CRAN);
  p.ellipse(13, 10.5, 2.5, 3.5, P.AMBER);
  p.px(13, 10, P.RUST); p.px(13, 11, P.RUST);
  p.px(4, 6, P.MOSS); p.px(5, 6, P.FERN); p.px(6, 6, P.MOSS); p.px(9, 6, P.MOSS);
  return outline(c);
}

function bakeTallGrass(frame: number): Canv {
  const { c, g } = makeCanvas(16, 16);
  const p = new Pen(g);
  const r = mulberry32(55);
  for (let i = 0; i < 11; i++) {
    const x = 1 + Math.floor(r() * 14);
    const hgt = 5 + Math.floor(r() * 7);
    const lean = (r() < 0.5 ? -1 : 1) * (frame ? 1 : 0);
    const col = r() < 0.3 ? P.FERN : r() < 0.6 ? P.MOSS : P.FOREST;
    for (let k = 0; k < hgt; k++) {
      const xx = x + (k > hgt / 2 ? lean : 0);
      p.px(xx, 15 - k, k < 2 ? P.FOREST : col);
    }
    p.px(x + (hgt > 6 ? lean : 0), 15 - hgt, P.FERN);
  }
  return c;
}

function bakeFern(): Canv {
  const { c, g } = makeCanvas(16, 16);
  const p = new Pen(g);
  const fronds: Array<[number, number]> = [[-6, -3], [-4, -7], [0, -9], [4, -7], [6, -3]];
  for (const [dx, dy] of fronds) {
    p.line(8, 14, 8 + dx, 14 + dy, P.FOREST);
    const steps = 4;
    for (let s = 1; s <= steps; s++) {
      const x = 8 + (dx * s) / steps, y = 14 + (dy * s) / steps;
      p.px(x - 1, y, P.MOSS); p.px(x + 1, y - 1, P.FERN);
    }
  }
  return c;
}

function bakeFlowers(): Canv {
  const { c, g } = makeCanvas(16, 16);
  const p = new Pen(g);
  const r = mulberry32(88);
  for (let i = 0; i < 7; i++) {
    const x = 2 + Math.floor(r() * 12), y = 5 + Math.floor(r() * 9);
    p.vline(x, y, 15, P.FOREST);
    const col = [P.LANTERN, P.MOON, P.RED, P.VIOLET, P.FOG][i % 5];
    p.px(x - 1, y, col); p.px(x + 1, y, col); p.px(x, y - 1, col); p.px(x, y, P.AMBER);
  }
  return c;
}

function bakeBriar(): Canv {
  const { c, g } = makeCanvas(16, 16);
  const p = new Pen(g);
  const r = mulberry32(99);
  p.ellipse(8, 14, 7, 2, P.PINE);
  for (let i = 0; i < 9; i++) {
    const x0 = r() * 16, y0 = 4 + r() * 11, x1 = r() * 16, y1 = 3 + r() * 12;
    p.line(x0, y0, x1, y1, i % 2 ? P.RUST : P.CRAN);
  }
  for (let i = 0; i < 10; i++) p.px(r() * 16, 3 + r() * 12, P.FOREST);
  for (let i = 0; i < 6; i++) p.px(r() * 16, 3 + r() * 12, P.LANTERN);
  for (let i = 0; i < 3; i++) p.px(2 + r() * 12, 4 + r() * 10, P.RED);
  return outline(c);
}

function bakeReeds(frame: number): Canv {
  const { c, g } = makeCanvas(16, 20);
  const p = new Pen(g);
  const stalks: Array<[number, number]> = [[3, 12], [6, 16], [9, 13], [12, 15]];
  for (const [x, hgt] of stalks) {
    const lean = frame && x % 2 ? 1 : 0;
    p.vline(x, 20 - hgt + 3, 19, P.FOREST);
    p.rect(x + lean, 20 - hgt, 1, 4, P.RUST);
    p.px(x + lean, 20 - hgt, P.CRAN);
    p.px(x + lean, 20 - hgt - 1, P.MOSS);
  }
  p.line(1, 19, 4, 13, P.MOSS); p.line(14, 19, 11, 12, P.MOSS);
  return c;
}

function bakeLilypad(flower: boolean): Canv {
  const { c, g } = makeCanvas(16, 16);
  const p = new Pen(g);
  const inside = (x: number, y: number) => ((x + 0.5 - 8) / 6) ** 2 + ((y + 0.5 - 9) / 4) ** 2 <= 1 && !(x >= 8 && y >= 9 && x - 8 <= y - 9);
  p.blob(16, 16, inside, (x, y, edge) => (edge ? P.FOREST : y < 8 && x < 9 ? P.FERN : P.MOSS));
  if (flower) { p.px(5, 7, P.MOON); p.px(6, 6, P.FOG); p.px(7, 7, P.MOON); p.px(6, 7, P.LANTERN); }
  return c;
}

function bakeMushrooms(): Canv {
  const { c, g } = makeCanvas(16, 16);
  const p = new Pen(g);
  const caps: Array<[number, number, number]> = [[5, 11, P.RED], [10, 12, P.AMBER], [8, 9, P.RED]];
  for (const [x, y, col] of caps) {
    p.vline(x, y + 1, y + 3, P.FOG);
    p.hline(x - 2, x + 2, y, col); p.hline(x - 1, x + 1, y - 1, col);
    p.px(x - 1, y - 1, P.FOG);
  }
  return outline(c);
}

/* ------------------------------------------------------------------ */
/* Homestead fixtures & furniture                                      */
/* ------------------------------------------------------------------ */

function bakeFence(mask: number): Canv {
  const { c, g } = makeCanvas(16, 16);
  const p = new Pen(g);
  if (mask & 8) { p.rect(0, 6, 7, 2, P.AMBER); p.rect(0, 10, 7, 2, P.AMBER); p.hline(0, 6, 7, P.RUST); p.hline(0, 6, 11, P.RUST); }
  if (mask & 2) { p.rect(9, 6, 7, 2, P.AMBER); p.rect(9, 10, 7, 2, P.AMBER); p.hline(9, 15, 7, P.RUST); p.hline(9, 15, 11, P.RUST); }
  if (mask & 1) { p.rect(7, 0, 2, 4, P.AMBER); p.vline(8, 0, 3, P.RUST); }
  if (mask & 4) { p.rect(7, 13, 2, 3, P.AMBER); p.vline(8, 13, 15, P.RUST); }
  p.rect(6, 3, 4, 11, P.AMBER);
  p.vline(9, 3, 13, P.RUST); p.hline(6, 9, 13, P.CRAN);
  p.hline(6, 9, 3, P.LANTERN);
  return outline(c);
}

function bakeSign(): Canv {
  const { c, g } = makeCanvas(16, 16);
  const p = new Pen(g);
  p.rect(7, 9, 2, 7, P.RUST); p.vline(8, 9, 15, P.CRAN);
  p.rect(2, 2, 12, 8, P.AMBER);
  p.hline(2, 13, 9, P.RUST); p.vline(13, 2, 9, P.RUST); p.hline(2, 13, 2, P.LANTERN);
  p.hline(4, 10, 4, P.CRAN); p.hline(4, 11, 6, P.CRAN); p.hline(4, 8, 8, P.CRAN);
  return outline(c);
}

function bakeMailbox(): Canv {
  const { c, g } = makeCanvas(16, 16);
  const p = new Pen(g);
  p.rect(7, 9, 2, 7, P.RUST);
  p.rect(3, 3, 9, 7, P.MIST);
  p.hline(4, 10, 2, P.MIST);
  p.hline(3, 11, 9, P.TWILIGHT); p.vline(11, 3, 9, P.TWILIGHT);
  p.hline(4, 9, 3, P.FOG);
  p.rect(3, 4, 2, 5, P.TWILIGHT);
  p.vline(12, 1, 5, P.RED); p.rect(13, 1, 2, 2, P.RED);
  return outline(c);
}

function bakeWorkbench(): Canv {
  const { c, g } = makeCanvas(16, 18);
  const p = new Pen(g);
  p.rect(1, 6, 14, 3, P.AMBER); p.hline(1, 14, 6, P.LANTERN);
  p.rect(1, 9, 14, 4, P.RUST); p.hline(1, 14, 12, P.CRAN);
  p.rect(2, 13, 2, 5, P.CRAN); p.rect(12, 13, 2, 5, P.CRAN);
  p.hline(4, 11, 15, P.RUST);
  // tools on top
  p.hline(3, 8, 5, P.FOG); p.hline(3, 8, 4, P.MIST); p.px(2, 4, P.RUST); p.px(2, 5, P.RUST);
  p.rect(10, 2, 2, 4, P.TWILIGHT); p.rect(9, 1, 4, 2, P.MIST);
  p.rect(13, 4, 2, 2, P.SHADOW);
  p.px(5, 10, P.LANTERN); p.px(10, 10, P.LANTERN);
  return outline(c);
}

function bakeShipBin(): Canv {
  const { c, g } = makeCanvas(18, 18);
  const p = new Pen(g);
  p.rect(1, 6, 16, 11, P.AMBER);
  for (let x = 4; x < 17; x += 4) p.vline(x, 6, 16, P.RUST);
  p.hline(1, 16, 16, P.CRAN);
  p.rect(0, 3, 18, 4, P.CRAN); p.hline(0, 17, 3, P.RED); p.hline(0, 17, 6, P.SHADOW);
  p.rect(6, 9, 6, 4, P.LANTERN);
  p.hline(7, 10, 10, P.RUST); p.hline(7, 10, 11, P.RUST); p.px(8, 9, P.RUST);
  return outline(c);
}

function bakeRainBarrel(): Canv {
  const { c, g } = makeCanvas(16, 18);
  const p = new Pen(g);
  p.rect(2, 4, 12, 13, P.RUST);
  p.vline(3, 5, 15, P.AMBER); p.vline(12, 5, 15, P.CRAN); p.vline(13, 5, 15, P.CRAN);
  p.hline(2, 13, 6, P.SHADOW); p.hline(2, 13, 14, P.SHADOW);
  p.ellipse(8, 4, 6, 2.2, P.RUST);
  p.ellipse(8, 4, 4.8, 1.4, P.TWILIGHT);
  p.hline(6, 9, 4, P.MIST);
  p.px(13, 11, P.MIST); p.px(14, 11, P.MIST);
  return outline(c);
}

function bakeLamp(): Canv {
  const { c, g } = makeCanvas(16, 32);
  const p = new Pen(g);
  p.rect(7, 10, 2, 22, P.SHADOW); p.vline(7, 10, 31, P.TWILIGHT);
  p.rect(5, 30, 6, 2, P.SHADOW);
  p.rect(4, 3, 8, 8, P.VOID);
  p.rect(5, 4, 6, 6, P.LANTERN); p.rect(7, 5, 2, 3, P.FOG);
  p.hline(3, 12, 2, P.SHADOW); p.hline(5, 10, 1, P.SHADOW); p.px(7, 0, P.SHADOW); p.px(8, 0, P.SHADOW);
  p.vline(5, 4, 9, P.AMBER);
  return outline(c);
}

function bakeBed(): Canv {
  const { c, g } = makeCanvas(16, 32);
  const p = new Pen(g);
  p.rect(0, 0, 16, 8, P.RUST); p.hline(0, 15, 0, P.AMBER); p.rect(2, 2, 12, 4, P.CRAN);
  p.rect(1, 8, 14, 22, P.CRAN);
  p.rect(2, 7, 12, 5, P.FOG); p.hline(2, 13, 11, P.MIST);
  const r = mulberry32(5);
  for (let y = 13; y < 28; y += 4) for (let x = 2; x < 14; x += 4) {
    const col = [P.RED, P.LANTERN, P.CRAN, P.AMBER][Math.floor(r() * 4)];
    p.rect(x, y, 4, 4, col);
  }
  p.hline(1, 14, 12, P.RED);
  p.rect(0, 28, 16, 4, P.RUST); p.hline(0, 15, 28, P.AMBER);
  return outline(c);
}

function bakeDesk(): Canv {
  const { c, g } = makeCanvas(16, 20);
  const p = new Pen(g);
  p.rect(0, 8, 16, 3, P.AMBER); p.hline(0, 15, 8, P.LANTERN);
  p.rect(0, 11, 16, 6, P.RUST); p.rect(2, 12, 5, 3, P.CRAN); p.px(4, 13, P.LANTERN);
  p.rect(1, 17, 2, 3, P.CRAN); p.rect(13, 17, 2, 3, P.CRAN);
  // open journal
  p.rect(3, 5, 9, 4, P.FOG); p.vline(7, 5, 8, P.MIST);
  p.hline(4, 6, 6, P.TWILIGHT); p.hline(8, 10, 6, P.TWILIGHT); p.hline(4, 6, 7, P.MIST);
  p.vline(9, 8, 10, P.RED);
  // candle
  p.rect(13, 4, 2, 5, P.FOG); p.px(13, 3, P.AMBER); p.px(13, 2, P.LANTERN);
  return outline(c);
}

function bakeDresser(): Canv {
  const { c, g } = makeCanvas(16, 26);
  const p = new Pen(g);
  p.rect(3, 0, 10, 9, P.AMBER); p.rect(4, 1, 8, 7, P.MIST); p.px(5, 2, P.FOG); p.px(6, 3, P.FOG);
  p.rect(0, 9, 16, 17, P.RUST);
  p.hline(0, 15, 9, P.AMBER);
  for (let y = 11; y < 24; y += 5) { p.rect(2, y, 12, 4, P.CRAN); p.hline(2, 13, y, P.AMBER); p.px(7, y + 2, P.LANTERN); p.px(8, y + 2, P.LANTERN); }
  return outline(c);
}

function bakeFireplace(frame: number): Canv {
  const { c, g } = makeCanvas(32, 44);
  const p = new Pen(g);
  p.rect(4, 0, 24, 44, P.MIST);
  for (let y = 2; y < 44; y += 4) {
    p.hline(4, 27, y, P.TWILIGHT);
    for (let x = 4 + ((y / 4) % 2) * 3; x < 28; x += 6) p.vline(x, y - 3, y, P.TWILIGHT);
  }
  p.rect(0, 20, 32, 4, P.AMBER); p.hline(0, 31, 20, P.LANTERN); p.hline(0, 31, 23, P.RUST);
  p.rect(7, 26, 18, 18, P.VOID);
  p.rect(9, 40, 14, 3, P.RUST); p.hline(9, 22, 42, P.CRAN);
  const r = mulberry32(17 + frame * 3);
  for (let i = 0; i < 30; i++) {
    const x = 10 + r() * 12, y = 31 + r() * 9;
    const hgt = (y - 30) / 10;
    p.px(x, y, hgt < 0.35 ? P.LANTERN : hgt < 0.7 ? P.AMBER : P.RED);
  }
  p.rect(14 + frame, 36, 4, 4, P.LANTERN); p.px(15 + frame, 34, P.AMBER);
  // mantle trinkets: candle + jar
  p.rect(6, 16, 2, 4, P.FOG); p.px(6, 15, P.LANTERN);
  p.rect(23, 15, 4, 5, P.FERN); p.hline(23, 26, 15, P.LANTERN);
  return outline(c);
}

function bakePedestal(): Canv {
  const { c, g } = makeCanvas(16, 26);
  const p = new Pen(g);
  p.rect(1, 21, 14, 5, P.AMBER); p.hline(1, 14, 21, P.LANTERN); p.hline(1, 14, 25, P.RUST);
  p.rect(4, 12, 8, 9, P.FOG); p.vline(10, 12, 20, P.MIST); p.vline(11, 12, 20, P.MIST);
  p.rect(2, 10, 12, 2, P.AMBER);
  // glass case (empty)
  p.rect(3, 0, 10, 10, P.MOON);
  p.rect(4, 1, 8, 9, P.TWILIGHT);
  p.px(5, 2, P.FOG); p.px(5, 3, P.FOG); p.px(6, 2, P.FOG);
  return outline(c);
}

function bakeTable(): Canv {
  const { c, g } = makeCanvas(16, 18);
  const p = new Pen(g);
  p.rect(0, 5, 16, 7, P.AMBER); p.hline(0, 15, 5, P.LANTERN); p.hline(0, 15, 11, P.RUST);
  p.rect(1, 12, 2, 6, P.RUST); p.rect(13, 12, 2, 6, P.RUST);
  p.rect(6, 2, 4, 5, P.FERN); p.hline(6, 9, 2, P.FOG); p.px(7, 4, P.FOG);
  p.ellipse(12, 8, 2, 1, P.FOG);
  return outline(c);
}

function bakeChair(): Canv {
  const { c, g } = makeCanvas(16, 18);
  const p = new Pen(g);
  p.rect(4, 2, 8, 8, P.RUST); p.rect(5, 3, 6, 2, P.AMBER);
  p.rect(3, 10, 10, 3, P.AMBER); p.hline(3, 12, 12, P.RUST);
  p.rect(4, 13, 2, 5, P.CRAN); p.rect(10, 13, 2, 5, P.CRAN);
  return outline(c);
}

function bakeBookshelf(): Canv {
  const { c, g } = makeCanvas(16, 30);
  const p = new Pen(g);
  p.rect(0, 0, 16, 30, P.RUST);
  p.rect(1, 1, 14, 28, P.CRAN);
  const r = mulberry32(21);
  for (let s = 0; s < 3; s++) {
    const y = 2 + s * 9;
    for (let x = 1; x < 15;) {
      const bw = 1 + Math.floor(r() * 2);
      const bh = 5 + Math.floor(r() * 3);
      const col = [P.RED, P.TWILIGHT, P.FOREST, P.AMBER, P.VIOLET, P.MIST][Math.floor(r() * 6)];
      p.rect(x, y + 7 - bh, bw, bh, col);
      x += bw + (r() < 0.15 ? 1 : 0);
    }
    p.hline(0, 15, y + 7, P.AMBER);
  }
  return outline(c);
}

function bakeStove(): Canv {
  const { c, g } = makeCanvas(16, 28);
  const p = new Pen(g);
  p.rect(6, 0, 3, 12, P.SHADOW); p.vline(6, 0, 11, P.TWILIGHT);
  p.rect(1, 12, 14, 14, P.SHADOW);
  p.hline(1, 14, 12, P.TWILIGHT);
  p.rect(3, 17, 10, 6, P.VOID); p.rect(5, 19, 6, 3, P.RED); p.hline(6, 9, 20, P.AMBER);
  p.rect(2, 26, 2, 2, P.SHADOW); p.rect(12, 26, 2, 2, P.SHADOW);
  p.rect(9, 8, 5, 4, P.MIST); p.hline(10, 12, 7, P.MIST); p.px(14, 9, P.MIST); p.px(10, 9, P.FOG);
  return outline(c);
}

function bakePlant(): Canv {
  const { c, g } = makeCanvas(16, 20);
  const p = new Pen(g);
  p.rect(4, 13, 8, 7, P.RUST); p.hline(3, 12, 13, P.AMBER); p.vline(11, 14, 19, P.CRAN);
  const leaves: Array<[number, number, number, number]> = [[8, 13, 3, 3], [8, 13, 13, 4], [8, 13, 6, 1], [8, 13, 11, 0], [8, 13, 8, 2]];
  for (const [x0, y0, x1, y1] of leaves) {
    p.line(x0, y0, x1, y1, P.FOREST);
    p.px(x1, y1, P.FERN); p.px((x0 + x1) / 2, (y0 + y1) / 2 - 1, P.MOSS);
  }
  return outline(c);
}

function bakeCrate(): Canv {
  const { c, g } = makeCanvas(16, 16);
  const p = new Pen(g);
  p.rect(1, 3, 14, 12, P.AMBER);
  p.hline(1, 14, 3, P.LANTERN); p.hline(1, 14, 14, P.RUST);
  p.line(2, 4, 13, 13, P.RUST); p.line(2, 13, 13, 4, P.RUST);
  p.vline(1, 3, 14, P.RUST); p.vline(14, 3, 14, P.RUST);
  return outline(c);
}

function bakeWindow(night: boolean): Canv {
  const { c, g } = makeCanvas(16, 16);
  const p = new Pen(g);
  p.rect(2, 2, 12, 12, P.AMBER);
  p.rect(3, 3, 10, 10, night ? P.TWILIGHT : P.MIST);
  if (!night) { p.px(4, 4, P.FOG); p.px(5, 4, P.FOG); p.px(4, 5, P.FOG); }
  else { p.px(10, 5, P.MOON); p.px(5, 9, P.FOG); }
  p.vline(8, 3, 12, P.AMBER); p.hline(3, 12, 8, P.AMBER);
  p.rect(1, 2, 2, 12, P.CRAN); p.rect(13, 2, 2, 12, P.CRAN);
  p.hline(1, 14, 14, P.RUST);
  return c;
}

function bakeWoodpile(): Canv {
  const { c, g } = makeCanvas(16, 16);
  const p = new Pen(g);
  const logs: Array<[number, number]> = [[3, 12], [8, 12], [13, 12], [5, 8], [10, 8], [8, 4]];
  for (const [x, y] of logs) {
    p.ellipse(x, y, 2.6, 2.4, P.RUST);
    p.ellipse(x, y, 1.4, 1.2, P.AMBER);
    p.px(x, y, P.RUST);
  }
  return outline(c);
}

/* ------------------------------------------------------------------ */
/* Structures                                                          */
/* ------------------------------------------------------------------ */

function bakeCabin(night: boolean): Canv {
  const W = 96, H = 96;
  const { c, g } = makeCanvas(W, H);
  const p = new Pen(g);
  const r = mulberry32(3);
  // log walls
  const wallTop = 50;
  p.rect(2, wallTop, 92, H - wallTop, P.RUST);
  for (let y = wallTop; y < H; y += 5) {
    p.hline(2, 93, y, P.AMBER);
    p.hline(2, 93, y + 3, P.CRAN);
    p.hline(2, 93, y + 4, P.SHADOW);
    for (let k = 0; k < 4; k++) p.px(4 + r() * 88, y + 1 + r() * 2, P.CRAN);
  }
  // corner log-ends
  for (let y = wallTop + 2; y < H; y += 5) {
    for (const x of [1, 92]) { p.rect(x, y - 1, 3, 4, P.AMBER); p.px(x + 1, y, P.RUST); }
  }
  // roof
  const roofTop = 6, roofBot = 54;
  for (let y = roofTop; y <= roofBot; y++) {
    const f = (y - roofTop) / (roofBot - roofTop);
    const inset = Math.round((1 - f) * 10);
    const row = Math.floor((y - roofTop) / 4);
    for (let x = inset; x < W - inset; x++) {
      let col: number = row % 2 ? P.FOREST : P.PINE;
      if ((y - roofTop) % 4 === 3) col = P.SHADOW;
      else if (((x + row * 3) % 8) === 0) col = P.SHADOW;
      if (x < W * 0.35 && (y - roofTop) % 4 === 0 && row % 2) col = P.MOSS;
      p.px(x, y, col);
    }
  }
  p.hline(10, W - 11, roofTop, P.SHADOW);
  p.hline(11, W - 12, roofTop + 1, P.MOSS);
  for (let i = 0; i < 9; i++) { const x = 14 + r() * 60, y = 12 + r() * 36; p.px(x, y, P.FERN); p.px(x + 1, y, P.MOSS); }
  p.hline(0, W - 1, roofBot + 1, P.SHADOW); p.hline(0, W - 1, roofBot + 2, P.VOID);
  // chimney
  p.rect(70, 0, 11, 22, P.MIST);
  for (let y = 2; y < 22; y += 4) { p.hline(70, 80, y, P.TWILIGHT); p.vline(72 + ((y / 4) % 2) * 4, y - 3, y, P.TWILIGHT); }
  p.rect(69, 0, 13, 2, P.SHADOW);
  p.vline(80, 2, 21, P.TWILIGHT);
  // door
  const dx = 34, dy = 66;
  p.rect(dx - 2, dy - 2, 16, H - dy + 2, P.SHADOW);
  p.rect(dx, dy, 12, H - dy, P.CRAN);
  for (let x = dx + 3; x < dx + 12; x += 4) p.vline(x, dy, H - 1, P.SHADOW);
  p.hline(dx, dx + 11, dy + 8, P.RUST); p.hline(dx, dx + 11, dy + 20, P.RUST);
  p.px(dx + 9, dy + 15, P.LANTERN); p.px(dx + 9, dy + 16, P.AMBER);
  // plaque above door
  p.rect(dx - 1, dy - 9, 14, 6, P.LANTERN); p.hline(dx - 1, dx + 12, dy - 4, P.AMBER);
  p.hline(dx + 1, dx + 10, dy - 7, P.FOREST); p.hline(dx + 2, dx + 8, dy - 5, P.FOREST);
  // windows
  for (const wx of [10, 64]) {
    const wy = 64;
    p.rect(wx - 3, wy, 3, 16, P.FOREST); p.rect(wx + 18, wy, 3, 16, P.FOREST);
    p.hline(wx - 3, wx - 1, wy + 5, P.PINE); p.hline(wx + 18, wx + 20, wy + 10, P.PINE);
    p.rect(wx, wy, 18, 16, P.AMBER);
    p.rect(wx + 2, wy + 2, 14, 12, night ? P.LANTERN : P.MIST);
    if (night) { p.rect(wx + 4, wy + 4, 4, 3, P.FOG); }
    else { p.px(wx + 3, wy + 3, P.FOG); p.px(wx + 4, wy + 3, P.FOG); p.px(wx + 3, wy + 4, P.FOG); p.rect(wx + 9, wy + 9, 6, 4, P.TWILIGHT); }
    p.vline(wx + 8, wy + 2, wy + 13, P.RUST); p.hline(wx + 2, wx + 15, wy + 7, P.RUST);
    p.rect(wx - 1, wy + 16, 20, 2, P.RUST);
    // flower box
    p.rect(wx, wy + 18, 18, 3, P.CRAN);
    for (let k = 0; k < 6; k++) p.px(wx + 1 + k * 3, wy + 17, [P.RED, P.LANTERN, P.MOON][k % 3]);
  }
  return outline(c);
}

function bakeShed(): Canv {
  const W = 64, H = 80;
  const { c, g } = makeCanvas(W, H);
  const p = new Pen(g);
  const wallTop = 38;
  p.rect(2, wallTop, 60, H - wallTop, P.CRAN);
  for (let x = 2; x < 62; x += 5) { p.vline(x, wallTop, H - 1, P.SHADOW); p.vline(x + 1, wallTop, H - 1, P.RUST); }
  // tin roof
  for (let y = 4; y <= 42; y++) {
    const f = (y - 4) / 38;
    const inset = Math.round((1 - f) * 6);
    for (let x = inset; x < W - inset; x++) {
      const col = x % 4 === 0 ? P.TWILIGHT : x % 4 === 1 ? P.FOG : P.MIST;
      p.px(x, y, col);
    }
  }
  for (let i = 0; i < 18; i++) p.px(8 + ((i * 37) % 48), 8 + ((i * 53) % 30), P.RUST);
  p.hline(0, W - 1, 43, P.SHADOW); p.hline(0, W - 1, 44, P.VOID);
  // double door
  const dx = 17, dy = 52;
  p.rect(dx - 1, dy - 1, 30, H - dy + 1, P.SHADOW);
  p.rect(dx, dy, 28, H - dy, P.RUST);
  p.vline(dx + 14, dy, H - 1, P.SHADOW);
  p.line(dx + 1, dy + 1, dx + 13, H - 2, P.AMBER); p.line(dx + 13, dy + 1, dx + 1, H - 2, P.AMBER);
  p.line(dx + 15, dy + 1, dx + 27, H - 2, P.AMBER); p.line(dx + 27, dy + 1, dx + 15, H - 2, P.AMBER);
  p.rect(dx + 12, dy + 12, 4, 4, P.TWILIGHT); p.px(dx + 13, dy + 14, P.MIST);
  p.hline(dx, dx + 27, dy, P.AMBER);
  return outline(c);
}

/* ------------------------------------------------------------------ */
/* Item icons                                                          */
/* ------------------------------------------------------------------ */

const ICON_ART: Record<string, string[]> = {
  hoe: [
    '........1111',
    '.......1ddd1',
    '......1d6dd1',
    '.......11d1.',
    '.......191..',
    '......191...',
    '.....191....',
    '....191.....',
    '...191......',
    '..191.......',
    '.181........',
    '.11.........',
  ],
  watering_can: [
    '............',
    '...11111....',
    '..1.....1...',
    '..1.....1...',
    '.111111111.1',
    '1ddddddddd1d',
    '1d66dddddd11',
    '1d6dddddddd1',
    '1ddddddddd1.',
    '1ccccccccc1.',
    '.1ccccccc1..',
    '..1111111...',
  ],
  machete: [
    '..........11',
    '.........161',
    '........16d1',
    '.......16d1.',
    '......16d1..',
    '.....16d1...',
    '....16d1....',
    '...16d1.....',
    '..111d1.....',
    '..1891......',
    '.1891.......',
    '.111........',
  ],
  wild_clover: [
    '............',
    '...55...55..',
    '..5445.5445.',
    '..5445.5445.',
    '...55443.5..',
    '....5443....',
    '..55..3.....',
    '.5445.3..f..',
    '.5445.3.fef.',
    '..55..3..f..',
    '.....3......',
    '....3.......',
  ],
  catnip_mint: [
    '.....f......',
    '....efe.....',
    '.....e......',
    '...5.e.5....',
    '..545e545...',
    '.54445444...',
    '..5.444.5...',
    '.545.4.545..',
    '.5445444445.',
    '..44.4.44...',
    '.....4......',
    '.....3......',
  ],
  swamp_moss: [
    '............',
    '............',
    '....5..5....',
    '...54554.5..',
    '..54434445..',
    '.5433343345.',
    '.4333d33334.',
    '.3332333d33.',
    '.3233323333.',
    '..22322232..',
    '...222222...',
    '............',
  ],
  sweet_corn: [
    '.....1......',
    '....177.....',
    '...17877....',
    '...178871...',
    '..4178781...',
    '..41787814..',
    '.441878714..',
    '.4341787144.',
    '..434787434.',
    '...4317344..',
    '....44344...',
    '.....33.....',
  ],
  glow_shroom: [
    '............',
    '....1111....',
    '...1ffff1...',
    '..1f6ff6f1..',
    '..1fffffd1..',
    '.1dddddddd1.',
    '..1116611...',
    '....1661....',
    '....1661....',
    '....1661....',
    '...166661...',
    '....1111....',
  ],
  ghost_pepper: [
    '........4...',
    '.......44...',
    '......44....',
    '....1bb41...',
    '...1b7bbb1..',
    '...1b7bbb1..',
    '..1bbbbba1..',
    '..1bbbba1...',
    '.1bbbaa1....',
    '.1baa11.....',
    '..11........',
    '............',
  ],
  cranberries: [
    '.....43.....',
    '....4..3....',
    '...3....3...',
    '..1a1..1a1..',
    '.1ba71ab7a1.',
    '.1bba1bbaa1.',
    '..1a1.1aa1..',
    '...1aa11....',
    '..1b7ba1....',
    '..1bbaa1....',
    '...1aa1.....',
    '....11......',
  ],
  moonberry: [
    '.....44.....',
    '....4..7....',
    '...4..7f7...',
    '..1e1..7....',
    '.1f6e11e1...',
    '.1ffe1f6e1..',
    '..1e11ffe1..',
    '...11e1e1...',
    '....1f6e1...',
    '....1ffe1...',
    '.....1e1....',
    '......1.....',
  ],
  pine_resin: [
    '............',
    '.....1......',
    '....171.....',
    '....181.....',
    '...17881....',
    '...17881....',
    '..1788891...',
    '..1788891...',
    '..1888991...',
    '...18991....',
    '....111.....',
    '............',
  ],
  wild_acorn: [
    '.....1......',
    '.....91.....',
    '...111111...',
    '..1aaaaaa1..',
    '.1a9a9a9aa1.',
    '.1aaaaaaaa1.',
    '..18888881..',
    '..17888891..',
    '..17888891..',
    '...188891...',
    '....1991....',
    '.....11.....',
  ],
  wild_onion: [
    '....4..4....',
    '....4.44....',
    '....44.4....',
    '.....44.....',
    '.....43.....',
    '....1661....',
    '...166f61...',
    '..16f6ff61..',
    '..1666f661..',
    '...16ff61...',
    '....1111....',
    '....8..8....',
  ],
  wild_honeycomb: [
    '............',
    '...111111...',
    '..17878781..',
    '.1878787871.',
    '.1787878781.',
    '.1878787871.',
    '.1787878781.',
    '..18787871..',
    '...188881...',
    '....1881....',
    '.....18.....',
    '.....1......',
  ],
  plant_fiber: [
    '............',
    '..4.....4...',
    '..34...43...',
    '...34.43....',
    '...3443.....',
    '....99......',
    '...3443.....',
    '..34..43....',
    '.34....43...',
    '.4......4...',
    '............',
    '............',
  ],
  charred_wood: [
    '............',
    '............',
    '...111111...',
    '..10101011..',
    '.101b10101..',
    '.1010101b1..',
    '.10b010101..',
    '.101010101..',
    '..1111111...',
    '............',
    '............',
    '............',
  ],
  crushed_quartz: [
    '............',
    '.....1......',
    '....161.1...',
    '...16f6161..',
    '...16ff6f1..',
    '..16fdf6d1..',
    '..1ffdf6d1..',
    '.16d1fd1d1..',
    '.1dd1dd11...',
    '..11.11.....',
    '............',
    '............',
  ],
  mineral_salt: [
    '............',
    '............',
    '.....11.....',
    '....1761....',
    '...176661...',
    '..17666671..',
    '..16676661..',
    '.1666666661.',
    '.1d66d6d6d1.',
    '..11111111..',
    '............',
    '............',
  ],
};

const SEED_ART = [
  '..11111111..',
  '.1777777771.',
  '.1788888871.',
  '.17XXXXXX71.',
  '.17XYYYYX71.',
  '.17XYYYYX71.',
  '.17XXXXXX71.',
  '.1777777771.',
  '.1799999971.',
  '.1777777771.',
  '.1777777771.',
  '..11111111..',
];

const SEED_COLORS: Record<string, [number, number]> = {
  clover: [P.FERN, P.MOSS], catnip: [P.VIOLET, P.MOSS], moss: [P.FOREST, P.TWILIGHT], corn: [P.LANTERN, P.AMBER],
  shroom: [P.MOON, P.MIST], pepper: [P.RED, P.CRAN], cranberry: [P.CRAN, P.RED], moonberry: [P.MOON, P.VIOLET],
};

function bakeIcons(): void {
  for (const [id, art] of Object.entries(ICON_ART)) ICON[id] = fromArt(art, {}, 16, 16);
  for (const crop of CROPS) {
    const [x, y] = SEED_COLORS[crop.id];
    ICON[crop.seed] = fromArt(SEED_ART, { X: x, Y: y }, 16, 16);
  }
  // Watering can sprites used during the pour animation
  MISC.canUp = fromArt(ICON_ART.watering_can, {});
  {
    const { c, g } = makeCanvas(12, 12);
    g.translate(6, 6); g.rotate(Math.PI / 5); g.drawImage(MISC.canUp, -6, -6);
    MISC.canTilt = c;
  }
  MISC.canUpL = flipH(MISC.canUp);
  MISC.canTiltL = flipH(MISC.canTilt);
}

/* ------------------------------------------------------------------ */
/* Crops (4 growth stages)                                             */
/* ------------------------------------------------------------------ */

const CROP_ART: Record<string, string[]> = {
  clover: [
    '................', '................', '................', '.....5.....f....',
    '....545...fef...', '..55.4.55..f....', '.5445.54455.4...', '.54445.4445.4...',
    '..554.4.55.44...', '....4.4.4..4....', '.55.4.444..4.55.', '5445.44.4.4.5445',
    '.5444..444.4445.', '..554.4.4.4.55..', '....3343433.....', '................',
  ],
  catnip: [
    '................', '......f...f.....', '.....efe.efe....', '......e...e..f..',
    '..f..5e5.5e5efe.', '.efe.454.454.e..', '..e.54445444545.', '.545.4454544454.',
    '.4454.4.44.4.4..', '..44545.4.5454..', '.54.4445.44445..', '5445.4.4.4.4.45.',
    '.45.444.4.444.4.', '..4.4.4.4.4.4...', '....33433343....', '................',
  ],
  moss: [
    '................', '................', '................', '................',
    '................', '................', '......5..5......', '....55455455....',
    '...5443443345...', '..543333433345..', '.54333d33333345.', '.43333233d33334.',
    '.3332333323333c.', '..33233322332c..', '...222222222....', '................',
  ],
  corn: [
    '......4.........', '.....454...4....', '....4.45..454...', '...4..478.45.4..',
    '..4...4788.4..4.', '.4...47788.4...4', '....4.4878.4....', '...45.4788.45...',
    '..4.5.4787.4.5..', '.4..544778.44.4.', '....54.478.4....', '...54...4..45...',
    '..54....4...45..', '.......343......', '......33433.....', '................',
  ],
  shroom: [
    '................', '................', '................', '................',
    '......1111......', '.....1ffff1.....', '....1f6ff6f1....', '....1fffffd1.11.',
    '....1ddddddd1ff1', '.11..1166611fdf1', '1ff1...161..1611', '1fdd1..161...61.',
    '.161...161...61.', '..61...666...6..', '...33433343333..', '................',
  ],
  pepper: [
    '................', '................', '......4..4......', '.....454454.....',
    '....45444454....', '...4544.44454...', '...44.b4.4.44...', '..4..bb74..b.4..',
    '....bb7b4.bb7...', '....bbb.4.bbb...', '....abb.4.abb...', '.....ab.4..ab...',
    '......a.4...a...', '........4.......', '......33433.....', '................',
  ],
  cranberry: [
    '................', '................', '................', '......3333......',
    '....33444433....', '...3445b544b3...', '..344ba44445b3..', '..3b4444b44443..',
    '.344445444ba443.', '.34b44a44b44b43.', '.3444b44444a443.', '..34444b444443..',
    '...334443b433...', '.....333333.....', '......9..9......', '................',
  ],
  moonberry: [
    '................', '........7.......', '...7...7f7......', '..7f7...7..f....',
    '...7.5..5.fef...', '....545545.f....', '...5f44f445.....', '..5fef4fef445...',
    '..54f44f4f445...', '..544fef4fef5...', '...5444f44f45...', '....54444445....',
    '.....554455.....', '.......44.......', '......33433.....', '................',
  ],
};

const CROP_COLORS: Record<string, { leaf: number; dark: number; fruit: number; tall?: boolean }> = {
  clover: { leaf: P.FERN, dark: P.FOREST, fruit: P.MOON },
  catnip: { leaf: P.MOSS, dark: P.FOREST, fruit: P.VIOLET },
  moss: { leaf: P.MOSS, dark: P.PINE, fruit: P.MIST },
  corn: { leaf: P.MOSS, dark: P.FOREST, fruit: P.LANTERN, tall: true },
  shroom: { leaf: P.MOON, dark: P.MIST, fruit: P.FOG },
  pepper: { leaf: P.MOSS, dark: P.FOREST, fruit: P.RED },
  cranberry: { leaf: P.MOSS, dark: P.FOREST, fruit: P.CRAN },
  moonberry: { leaf: P.FERN, dark: P.FOREST, fruit: P.MOON },
};

function cropStage(id: string, stage: number): Canv {
  const { c, g } = makeCanvas(16, 16);
  const p = new Pen(g);
  const k = CROP_COLORS[id];
  if (id === 'shroom') {
    const caps: Array<[number, number, number]> = stage === 0 ? [[8, 12, 1]] : stage === 1 ? [[6, 11, 2], [10, 12, 1]] : [[7, 9, 3], [11, 11, 2], [4, 12, 1]];
    for (const [x, y, s] of caps) {
      p.vline(x, y + 1, 13, P.FOG);
      p.hline(x - s, x + s, y, k.leaf); if (s > 1) p.hline(x - s + 1, x + s - 1, y - 1, k.leaf);
      p.px(x - s + 1, y, P.FOG);
    }
    return outline(c);
  }
  const stem = (y0: number) => { p.vline(7, y0, 13, k.dark); p.vline(8, y0 + 1, 13, k.dark); };
  const leaf = (x: number, y: number, dir: number, len: number) => {
    for (let i = 1; i <= len; i++) p.px(x + dir * i, y - (i === len ? 1 : 0), i === len ? k.leaf : k.dark);
    p.px(x + dir, y - 1, k.leaf);
  };
  if (stage === 0) {
    stem(11);
    p.hline(4, 6, 10, k.leaf); p.hline(5, 6, 9, P.FERN); p.px(6, 11, k.dark);
    p.hline(9, 11, 10, k.leaf); p.hline(9, 10, 9, P.FERN); p.px(9, 11, k.dark);
    p.px(7, 10, k.leaf); p.px(8, 10, k.leaf);
  } else if (stage === 1) {
    stem(8);
    leaf(7, 12, -1, 3); leaf(8, 11, 1, 3); leaf(7, 9, -1, 2);
    p.px(7, 7, k.leaf); p.px(8, 7, k.leaf);
  } else {
    const top = k.tall ? 2 : 5;
    stem(top);
    for (let y = 12, s = -1; y > top + 1; y -= 2, s = -s) leaf(s < 0 ? 7 : 8, y, s, y > 8 ? 4 : 3);
    p.px(7, top - 1, k.fruit); p.px(8, top - 1, k.fruit); p.px(8, top, k.fruit);
    p.px(4, 9, k.fruit);
  }
  return outline(c);
}

function bakeCrops(): void {
  for (const crop of CROPS) {
    CROP[crop.id] = [cropStage(crop.id, 0), cropStage(crop.id, 1), cropStage(crop.id, 2), outline(fromArt(CROP_ART[crop.id]), P.SHADOW)];
  }
}

/* ------------------------------------------------------------------ */

export function bakeAll(): void {
  bakeGround();
  OBJ.pine = [bakePine(1), bakePine(2), bakePine(3), bakePine(4)];
  OBJ.oak = [bakeOak(5), bakeOak(6)];
  OBJ.brush = [bakeBrush(7, false), bakeBrush(8, true), bakeBrush(9, false)];
  OBJ.rock = [bakeRock(10, false), bakeRock(11, false)];
  OBJ.boulder = [bakeRock(12, true)];
  OBJ.stump = [bakeStump()];
  OBJ.log = [bakeLog()];
  OBJ.tallgrass = [bakeTallGrass(0), bakeTallGrass(1)];
  OBJ.fern = [bakeFern()];
  OBJ.flowers = [bakeFlowers()];
  OBJ.briar = [bakeBriar()];
  OBJ.reeds = [bakeReeds(0), bakeReeds(1)];
  OBJ.lilypad = [bakeLilypad(false), bakeLilypad(true)];
  OBJ.mushrooms = [bakeMushrooms()];
  OBJ.fence = Array.from({ length: 16 }, (_, m) => bakeFence(m));
  OBJ.sign = [bakeSign()];
  OBJ.mailbox = [bakeMailbox()];
  OBJ.workbench = [bakeWorkbench()];
  OBJ.shipbin = [bakeShipBin()];
  OBJ.barrel = [bakeRainBarrel()];
  OBJ.lamp = [bakeLamp()];
  OBJ.bed = [bakeBed()];
  OBJ.desk = [bakeDesk()];
  OBJ.dresser = [bakeDresser()];
  OBJ.fireplace = [bakeFireplace(0), bakeFireplace(1)];
  OBJ.pedestal = [bakePedestal()];
  OBJ.table = [bakeTable()];
  OBJ.chair = [bakeChair()];
  OBJ.bookshelf = [bakeBookshelf()];
  OBJ.stove = [bakeStove()];
  OBJ.plant = [bakePlant()];
  OBJ.crate = [bakeCrate()];
  OBJ.window = [bakeWindow(false), bakeWindow(true)];
  OBJ.woodpile = [bakeWoodpile()];
  STRUCT.cabin = [bakeCabin(false), bakeCabin(true)];
  STRUCT.shed = [bakeShed()];
  bakeIcons();
  bakeCrops();
}
