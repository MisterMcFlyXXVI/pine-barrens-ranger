/**
 * Small-detail art: regional wildflowers with seasonal looks, railroad / trail /
 * homestead props, and ground decals (puddles, leaf litter, snow). Procedural.
 * DECOR[key][season] is null when the plant isn't showing that season.
 */
import { makeCanvas, Pen, outline, Canv } from './canvas';
import { P } from './palette';

const { VOID, SHADOW, PINE, FOREST, MOSS, FERN, FOG, LANTERN, AMBER, RUST, CRAN, RED, TWILIGHT, MIST, VIOLET, MOON } = P;

/** Spring, Summer, Fall, Winter. */
export const DECOR: Record<string, Array<Canv | null>> = {};
export const PROP: Record<string, Canv[]> = {};
export const DECAL: Record<string, Canv[]> = {};

function art(draw: (p: Pen) => void, w = 16, h = 16, line = false): Canv {
  const { c, g } = makeCanvas(w, h);
  draw(new Pen(g));
  return line ? outline(c) : c;
}

const stem = (p: Pen, x: number, y0: number, y1: number, c: number = MOSS) => p.vline(x, y0, y1, c);

/* ------------------------------ plants ------------------------------ */

function forgetMeNot(bloom: boolean): Canv {
  return art((p) => {
    for (const [x, y] of [[4, 11], [7, 9], [10, 12], [12, 10], [6, 13], [9, 14]]) {
      stem(p, x, y + 1, 15, FOREST);
      if (bloom) { p.px(x - 1, y, MIST); p.px(x + 1, y, MIST); p.px(x, y - 1, MIST); p.px(x, y + 1, MIST); p.px(x, y, LANTERN); }
      else { p.px(x, y, MOSS); p.px(x + 1, y + 1, FERN); }
    }
  });
}

function thistle(stage: 'rosette' | 'bloom' | 'seed' | 'dry'): Canv {
  return art((p) => {
    if (stage === 'rosette') { for (const [dx, dy] of [[-3, 0], [3, 0], [-2, -2], [2, -2], [0, -3]]) p.line(8, 14, 8 + dx, 14 + dy, MOSS); p.px(8, 14, FOREST); return; }
    const col = stage === 'dry' ? RUST : MOSS;
    stem(p, 8, 5, 15, col); stem(p, 5, 8, 15, col); stem(p, 11, 7, 15, col);
    for (const [x, y] of [[6, 11], [10, 12], [7, 13], [9, 9]]) { p.px(x, y, col); p.px(x - 1, y - 1, col); p.px(x + 1, y - 1, col); } // spiky leaves
    for (const [x, y] of [[8, 4], [5, 7], [11, 6]]) {
      p.rect(x - 1, y + 1, 3, 2, stage === 'dry' ? AMBER : FOREST); // bracts
      if (stage === 'bloom') { p.hline(x - 1, x + 1, y, VIOLET); p.px(x, y - 1, MOON); p.px(x - 1, y - 1, VIOLET); p.px(x + 1, y - 1, VIOLET); }
      if (stage === 'seed') { p.hline(x - 1, x + 1, y, FOG); p.px(x, y - 1, FOG); p.px(x - 2, y - 2, FOG); p.px(x + 2, y - 2, FOG); }
      if (stage === 'dry') { p.hline(x - 1, x + 1, y, RUST); }
    }
  }, 16, 16, true);
}

function rhododendron(bloom: boolean, buds: boolean): Canv {
  return art((p) => {
    p.ellipse(8, 10, 7, 5, FOREST);
    for (const [x, y] of [[4, 9], [8, 7], [12, 10], [6, 12], [10, 12], [3, 11], [13, 8]]) { p.ellipse(x, y, 2, 1.2, PINE); p.px(x - 1, y - 1, MOSS); }
    p.rect(7, 14, 2, 2, RUST);
    if (bloom) for (const [x, y] of [[5, 7], [10, 6], [12, 9], [7, 10], [3, 9]]) { p.ellipse(x, y, 1.6, 1.4, VIOLET); p.px(x, y - 1, MOON); p.px(x + 1, y, MOON); }
    else if (buds) for (const [x, y] of [[5, 7], [10, 6], [12, 9]]) p.px(x, y, CRAN);
  }, 16, 16, true);
}

function trillium(bloom: boolean): Canv {
  return art((p) => {
    stem(p, 8, 9, 15, FOREST);
    for (const [dx, dy] of [[-3, 1], [3, 1], [0, 3]]) { p.line(8, 10, 8 + dx, 10 + dy, MOSS); p.px(8 + dx, 10 + dy, FERN); }
    if (bloom) { for (const [dx, dy] of [[-2, -1], [2, -1], [0, -3]]) { p.line(8, 7, 8 + dx, 7 + dy, FOG); } p.px(8, 7, LANTERN); }
  });
}

function mayapple(flower: boolean, yellow: boolean): Canv {
  return art((p) => {
    for (const [x, y] of [[5, 10], [11, 9], [8, 12]]) {
      stem(p, x, y, 15, yellow ? AMBER : FOREST);
      p.hline(x - 3, x + 3, y, yellow ? AMBER : MOSS); p.hline(x - 2, x + 2, y - 1, yellow ? LANTERN : FERN);
      p.px(x - 3, y + 1, yellow ? RUST : FOREST); p.px(x + 3, y + 1, yellow ? RUST : FOREST);
    }
    if (flower) { p.px(8, 14, FOG); p.px(7, 14, FOG); p.px(9, 14, FOG); }
  });
}

function indianPipe(dark: boolean): Canv {
  return art((p) => {
    for (const [x, h] of [[6, 6], [8, 8], [10, 5], [12, 4]]) {
      const c = dark ? MIST : FOG;
      stem(p, x, 15 - h, 15, c);
      p.px(x - 1, 15 - h, c); p.px(x - 1, 16 - h, dark ? TWILIGHT : MOON); // nodding head
    }
  });
}

function pitcherPlant(stage: 0 | 1 | 2 | 3): Canv {
  return art((p) => {
    const body = stage === 3 ? RUST : stage === 2 ? CRAN : stage === 1 ? RED : MOSS;
    for (const [x, h] of [[5, 7], [8, 9], [11, 6]]) {
      p.rect(x - 1, 15 - h, 3, h, body); p.vline(x - 1, 15 - h, 15, stage === 0 ? FOREST : CRAN);
      p.px(x, 15 - h, VOID); p.px(x + 1, 14 - h, body); // hooded mouth
    }
    if (stage === 1) { stem(p, 13, 3, 15, MOSS); p.rect(12, 2, 3, 2, RED); }
  });
}

function chicory(bloom: number): Canv {
  return art((p) => {
    p.line(8, 15, 6, 4, MOSS); p.line(8, 15, 11, 5, MOSS);
    if (bloom > 0) for (const [x, y] of [[6, 4], [7, 8], [10, 6], [11, 5]].slice(0, bloom)) { p.px(x - 1, y, MIST); p.px(x + 1, y, MIST); p.px(x, y - 1, MIST); p.px(x, y + 1, MIST); p.px(x, y, FOG); }
  });
}

function queenAnne(stage: 'leaf' | 'bloom' | 'nest'): Canv {
  return art((p) => {
    stem(p, 8, 4, 15, stage === 'nest' ? RUST : MOSS); stem(p, 5, 7, 15, stage === 'nest' ? RUST : MOSS);
    if (stage === 'leaf') { p.px(7, 12, FERN); p.px(9, 11, FERN); p.px(6, 13, FERN); return; }
    for (const [x, y] of [[8, 4], [5, 7]]) {
      if (stage === 'bloom') { p.hline(x - 2, x + 2, y, FOG); p.hline(x - 1, x + 1, y - 1, FOG); p.px(x, y, CRAN); }
      else { p.hline(x - 1, x + 1, y, AMBER); p.px(x - 1, y - 1, RUST); p.px(x + 1, y - 1, RUST); }
    }
  });
}

function rampPatch(flower: boolean): Canv {
  return art((p) => {
    if (flower) { for (const x of [6, 10]) { stem(p, x, 6, 15, MOSS); p.px(x - 1, 5, FOG); p.px(x + 1, 5, FOG); p.px(x, 4, FOG); } return; }
    for (const [x, y] of [[4, 10], [8, 9], [12, 10], [6, 12], [10, 12]]) {
      p.ellipse(x, y, 1.5, 3, MOSS); p.vline(x, y - 2, y + 2, FERN);
      p.px(x, y + 3, CRAN); p.px(x, y + 4, VIOLET); // red-purple stems
    }
  });
}

function aster(bloom: boolean): Canv {
  return art((p) => {
    for (const [x, y] of [[4, 9], [7, 7], [10, 10], [12, 8], [6, 12]]) {
      stem(p, x, y + 1, 15, MOSS);
      if (bloom) { p.px(x - 1, y, VIOLET); p.px(x + 1, y, VIOLET); p.px(x, y - 1, MOON); p.px(x, y + 1, VIOLET); p.px(x, y, AMBER); }
      else p.px(x, y, FERN);
    }
  });
}

/* ------------------------------ props ------------------------------ */

function crossbuck(): Canv {
  return art((p) => {
    p.vline(8, 6, 15, SHADOW); p.vline(7, 6, 15, MIST);
    p.line(2, 1, 13, 8, FOG); p.line(2, 2, 13, 9, FOG); p.line(13, 1, 2, 8, FOG); p.line(13, 2, 2, 9, FOG);
    p.line(3, 1, 12, 7, SHADOW); p.line(12, 1, 3, 7, SHADOW); // lettering hint
  }, 16, 16, true);
}

function milepost(): Canv {
  return art((p) => { p.rect(6, 4, 4, 12, FOG); p.vline(9, 4, 15, MIST); p.hline(6, 9, 6, VOID); p.hline(6, 9, 9, VOID); p.px(7, 7, VOID); p.px(8, 7, VOID); }, 16, 16, true);
}

function whistlePost(): Canv {
  return art((p) => { p.vline(8, 7, 15, FOG); p.rect(5, 1, 7, 7, FOG); p.line(6, 2, 7, 6, VOID); p.line(7, 6, 8, 3, VOID); p.line(8, 3, 9, 6, VOID); p.line(9, 6, 10, 2, VOID); }, 16, 16, true);
}

function trailhead(): Canv {
  return art((p) => {
    p.vline(3, 6, 15, RUST); p.vline(12, 6, 15, RUST);
    p.rect(2, 2, 12, 9, AMBER); p.rect(3, 3, 10, 7, LANTERN);
    p.line(4, 8, 7, 5, RED); p.line(7, 5, 11, 7, RED); p.px(5, 4, FOREST); p.px(10, 4, FOREST); p.px(9, 8, TWILIGHT); // tiny trail map
    p.hline(1, 14, 1, PINE); p.hline(2, 13, 0, PINE); // little roof
  }, 16, 16, true);
}

function rocker(frame: number): Canv {
  return art((p) => {
    const t = frame ? 1 : 0;
    p.line(3, 15 - t, 13, 15 + t - 1, RUST); // rockers
    p.vline(4, 9, 14, AMBER); p.vline(12, 9, 14, AMBER);
    p.rect(4, 9, 9, 2, AMBER); p.rect(4, 2, 2, 8, AMBER); p.rect(10, 2, 2, 8, AMBER);
    for (const y of [3, 5, 7]) p.hline(5, 11, y, RUST);
  }, 16, 16, true);
}

function chimes(frame: number): Canv {
  return art((p) => {
    p.hline(4, 12, 1, RUST);
    for (let k = 0; k < 4; k++) { const x = 5 + k * 2 + (frame && k % 2 ? 1 : 0); p.vline(x, 2, 5 + k, MIST); p.px(x, 6 + k, FOG); }
  });
}

function clothesline(frame: number): Canv {
  return art((p) => {
    p.vline(2, 3, 15, RUST); p.vline(45, 3, 15, RUST); p.hline(1, 3, 3, RUST); p.hline(44, 46, 3, RUST);
    p.hline(3, 44, 4, MIST);
    const sway = frame ? 1 : 0;
    // laundry: a quilt, a shirt and overalls
    p.rect(8 + sway, 5, 9, 8, CRAN); for (let k = 0; k < 3; k++) p.rect(9 + sway + k * 3, 6 + k * 2, 2, 2, LANTERN);
    p.rect(21, 5, 7, 5, MIST); p.rect(20, 5, 2, 3, MIST); p.rect(27, 5, 2, 3, MIST);
    p.rect(33 - sway, 5, 6, 3, TWILIGHT); p.rect(33 - sway, 8, 2, 5, TWILIGHT); p.rect(37 - sway, 8, 2, 5, TWILIGHT);
  }, 48, 16, true);
}

function creekStones(): Canv {
  return art((p) => { for (const [x, y, r] of [[4, 6, 2], [10, 9, 2.5], [6, 12, 1.6], [12, 4, 1.4]] as Array<[number, number, number]>) { p.ellipse(x, y, r, r * 0.8, MIST); p.px(x - 1, y - 1, FOG); p.px(x + 1, y + 1, TWILIGHT); } });
}

/* ------------------------------ decals ------------------------------ */

function puddle(seed: number): Canv {
  return art((p) => { const w = 4 + (seed % 3), h = 2 + (seed % 2); p.ellipse(8, 9, w, h, TWILIGHT); p.ellipse(7, 8, w - 1.5, h - 0.8, MIST); p.px(6, 8, FOG); });
}

function leafLitter(seed: number): Canv {
  return art((p) => {
    let a = seed; const r = () => { a = (a * 9301 + 49297) % 233280; return a / 233280; };
    for (let k = 0; k < 11; k++) {
      const x = Math.floor(r() * 14), y = Math.floor(r() * 14);
      const c = [AMBER, RUST, CRAN, LANTERN, AMBER][Math.floor(r() * 5)];
      if (r() < 0.5) { p.hline(x, x + 1, y, c); p.px(x + 1, y + 1, c); } else { p.vline(x, y, y + 1, c); p.px(x + 1, y, c); }
    }
  });
}

function snowLight(seed: number): Canv {
  return art((p) => { let a = seed; const r = () => { a = (a * 9301 + 49297) % 233280; return a / 233280; }; for (let k = 0; k < 7; k++) { const x = Math.floor(r() * 14), y = Math.floor(r() * 15); p.hline(x, x + 1, y, FOG); } });
}

/** Snow covering one side of the tile (0 N, 1 E, 2 S, 3 W) with a soft wavy edge. */
function snowDrift(side: number, seed: number): Canv {
  return art((p) => {
    for (let a = 0; a < 16; a++) {
      const depth = 7 + Math.round(Math.sin(a * 0.7 + seed) * 2 + Math.sin(a * 1.9 + seed * 3));
      for (let b = 0; b < depth; b++) {
        const [x, y] = side === 0 ? [a, b] : side === 2 ? [a, 15 - b] : side === 1 ? [15 - b, a] : [b, a];
        p.px(x, y, b === depth - 1 ? MIST : FOG);
      }
    }
    p.hline(3 + (seed % 5), 5 + (seed % 5), 12 - (seed % 3), FOG);
  });
}

function snowFull(seed: number): Canv {
  return art((p) => {
    let a = seed; const r = () => { a = (a * 9301 + 49297) % 233280; return a / 233280; };
    p.rect(0, 0, 16, 16, FOG);
    for (let k = 0; k < 5; k++) { const x = Math.floor(r() * 14), y = Math.floor(r() * 15); p.hline(x, x + 2, y, MIST); }
    for (let k = 0; k < 2; k++) p.px(Math.floor(r() * 16), Math.floor(r() * 16), MOON);
  });
}

/** A painted Appalachian barn quilt square for the shed. */
function barnQuilt(): Canv {
  return art((p) => {
    p.rect(0, 0, 12, 12, VOID); p.rect(1, 1, 10, 10, LANTERN);
    for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
      const dx = Math.abs(x - 4.5), dy = Math.abs(y - 4.5);
      if (dx + dy < 2) p.px(1 + x, 1 + y, RED);
      else if (dx + dy < 4) p.px(1 + x, 1 + y, (x + y) % 2 ? FOREST : MOSS);
      else if ((x < 2 || x > 7) && (y < 2 || y > 7)) p.px(1 + x, 1 + y, TWILIGHT);
    }
  }, 12, 12);
}

export function bakeDecor(): void {
  DECOR.forgetmenot = [forgetMeNot(true), forgetMeNot(true), forgetMeNot(false), null];
  DECOR.thistle = [thistle('rosette'), thistle('bloom'), thistle('seed'), thistle('dry')];
  DECOR.rhododendron = [rhododendron(false, true), rhododendron(true, false), rhododendron(false, false), rhododendron(false, false)];
  DECOR.trillium = [trillium(true), trillium(false), null, null];
  DECOR.mayapple = [mayapple(true, false), mayapple(false, false), mayapple(false, true), null];
  DECOR.indianpipe = [null, indianPipe(false), indianPipe(true), null];
  DECOR.pitcher = [pitcherPlant(0), pitcherPlant(1), pitcherPlant(2), pitcherPlant(3)];
  DECOR.chicory = [chicory(0), chicory(4), chicory(2), null];
  DECOR.queenanne = [queenAnne('leaf'), queenAnne('bloom'), queenAnne('nest'), queenAnne('nest')];
  DECOR.ramps = [rampPatch(false), rampPatch(true), null, null];
  DECOR.aster = [null, aster(false), aster(true), null];
  PROP.crossbuck = [crossbuck()];
  PROP.milepost = [milepost()];
  PROP.whistle = [whistlePost()];
  PROP.trailhead = [trailhead()];
  PROP.rocker = [rocker(0), rocker(1)];
  PROP.chimes = [chimes(0), chimes(1)];
  PROP.clothesline = [clothesline(0), clothesline(1)];
  PROP.creekstones = [creekStones()];
  PROP.barnquilt = [barnQuilt()];
  DECAL.puddle = [puddle(1), puddle(2), puddle(3)];
  DECAL.leaves = [leafLitter(5), leafLitter(17), leafLitter(29)];
  DECAL.snowLight = [snowLight(7), snowLight(19), snowLight(41)];
  for (let d = 0; d < 4; d++) DECAL[`snowDrift${d}`] = [snowDrift(d, 3), snowDrift(d, 11)];
  DECAL.snowFull = [snowFull(5), snowFull(29), snowFull(71)];
}
