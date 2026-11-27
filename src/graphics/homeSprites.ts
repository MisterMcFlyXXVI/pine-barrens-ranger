/**
 * Homestead decoration art (src/data/homestead.ts): yard pieces, things for the
 * cabin wall, and floor furniture, plus their bag icons. Same 16 colours.
 */
import { makeCanvas, Pen, outline, Canv } from './canvas';
import { P } from './palette';
import { ICON } from './sprites';

const { VOID, SHADOW, PINE, FOREST, MOSS, FERN, FOG, LANTERN, AMBER, RUST, CRAN, RED, TWILIGHT, MIST, VIOLET, MOON } = P;

/** Homestead sprites by key; frames vary by kind (see each baker). */
export const HS: Record<string, Canv[]> = {};

function art(draw: (p: Pen) => void, w = 16, h = 16, line = true): Canv {
  const { c, g } = makeCanvas(w, h);
  draw(new Pen(g));
  return line ? outline(c) : c;
}

/* ------------------------------ yard ------------------------------ */

/** 0 = cold (embers), 1-2 = burning. */
function firePit(f: number): Canv {
  return art((p) => {
    p.ellipse(8, 11, 7, 3.5, SHADOW);
    for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; p.rect(Math.round(8 + Math.cos(a) * 6) - 1, Math.round(11 + Math.sin(a) * 3) - 1, 2, 2, k % 3 ? MIST : FOG); }
    p.ellipse(8, 11, 4, 1.8, VOID);
    p.line(5, 12, 11, 10, RUST); p.line(5, 10, 11, 12, AMBER);
    if (f === 0) { p.px(7, 11, RED); p.px(9, 11, CRAN); return; }
    const t = f === 1 ? 0 : 1;
    p.rect(6, 7 - t, 5, 4 + t, RED); p.rect(7, 5 + t, 3, 5 - t, AMBER); p.rect(7 + t, 3 + t, 2, 4, LANTERN);
    p.px(5 + t * 5, 6, AMBER); p.px(8, 2 + t * 2, LANTERN);
  }, 16, 16);
}

function logBench(): Canv {
  return art((p) => {
    p.rect(2, 7, 3, 5, RUST); p.rect(11, 7, 3, 5, RUST); p.hline(2, 4, 11, CRAN); p.hline(11, 13, 11, CRAN);
    p.rect(0, 3, 16, 5, AMBER); p.hline(0, 15, 3, LANTERN); p.hline(0, 15, 7, RUST);
    p.ellipse(1, 5, 1, 2, LANTERN); p.px(1, 5, RUST); p.ellipse(14, 5, 1, 2, LANTERN); p.px(14, 5, RUST);
    for (const x of [4, 9, 12]) p.px(x, 5, RUST);
  }, 16, 12);
}

/** 0 = hens in, 1 = a head out the door. */
function coop(f: number): Canv {
  return art((p) => {
    // Board-and-batten walls on stilts, a shed roof, a ramp to the pop door.
    p.vline(4, 19, 23, SHADOW); p.vline(19, 19, 23, SHADOW);
    p.rect(3, 9, 18, 11, CRAN); for (let x = 4; x < 21; x += 3) p.vline(x, 9, 19, RED);
    p.hline(3, 20, 19, SHADOW);
    for (let y = 3; y < 10; y++) p.hline(1 + Math.floor((y - 3) / 3), 22, y, y === 3 ? MIST : y % 2 ? SHADOW : TWILIGHT);
    p.rect(14, 11, 4, 3, FOG); p.vline(16, 11, 13, RUST); p.hline(14, 17, 12, RUST); // window
    p.rect(6, 14, 4, 5, VOID); // pop door
    if (f === 1) { p.rect(7, 14, 2, 2, FOG); p.px(6, 15, AMBER); p.px(8, 13, RED); p.px(8, 14, VOID); }
    p.line(5, 23, 9, 19, AMBER); p.line(6, 23, 10, 19, RUST);
    p.px(19, 22, AMBER); p.px(21, 23, LANTERN); // scattered corn
  }, 24, 24);
}

function picnic(): Canv {
  return art((p) => {
    p.line(4, 13, 7, 6, RUST); p.line(19, 13, 16, 6, RUST);
    p.rect(1, 9, 22, 2, AMBER); p.hline(1, 22, 9, LANTERN); // benches
    p.rect(3, 4, 18, 3, AMBER); p.hline(3, 20, 4, LANTERN); p.hline(3, 20, 6, RUST);
    for (const x of [8, 14]) p.vline(x, 4, 6, RUST);
    p.px(6, 3, RED); p.px(7, 3, FOG); // a checkered napkin
  }, 24, 14);
}

function lanternPost(on: boolean): Canv {
  return art((p) => {
    p.rect(6, 4, 3, 22, RUST); p.vline(6, 4, 25, AMBER);
    p.hline(6, 13, 4, RUST); p.hline(6, 13, 5, CRAN);
    p.vline(12, 6, 7, SHADOW);
    p.rect(10, 8, 5, 6, on ? LANTERN : MIST); p.rect(11, 9, 3, 4, on ? AMBER : TWILIGHT);
    if (on) p.px(12, 10, MOON);
    p.hline(10, 14, 8, AMBER); p.hline(10, 14, 13, AMBER); p.px(12, 7, AMBER);
    p.rect(5, 24, 5, 2, SHADOW);
  }, 16, 26);
}

/** 0 = quiet, 1 = a chickadee at the door. */
function birdhouse(f: number): Canv {
  return art((p) => {
    p.vline(8, 10, 23, RUST); p.vline(7, 12, 23, AMBER);
    p.rect(4, 4, 9, 7, FOG); p.vline(12, 4, 10, MIST);
    p.line(3, 4, 8, 0, RED); p.line(13, 4, 8, 0, CRAN); p.hline(3, 13, 4, CRAN);
    p.ellipse(8, 7, 1.2, 1.2, VOID);
    p.hline(6, 10, 10, RUST); p.px(8, 9, AMBER);
    if (f === 1) { p.rect(7, 6, 3, 2, MIST); p.px(8, 6, VOID); p.px(10, 7, AMBER); }
  }, 16, 24);
}

function scarecrow(): Canv {
  return art((p) => {
    p.vline(8, 9, 23, RUST); p.hline(1, 14, 10, RUST);
    p.rect(4, 9, 8, 7, RED); for (let x = 4; x < 12; x += 3) p.vline(x, 9, 15, CRAN); p.hline(4, 11, 12, CRAN); // flannel
    p.rect(1, 10, 3, 2, RED); p.rect(12, 10, 3, 2, RED);
    p.px(0, 11, AMBER); p.px(15, 11, AMBER); p.px(6, 16, AMBER); p.px(10, 16, AMBER); p.px(8, 17, LANTERN); // straw
    p.ellipse(8, 5, 3, 3, LANTERN); p.px(7, 5, VOID); p.px(9, 5, VOID); p.hline(7, 9, 7, RUST);
    p.rect(3, 1, 10, 2, AMBER); p.rect(5, 0, 6, 2, AMBER); p.hline(5, 10, 1, RUST); // straw hat
  }, 16, 24);
}

/** One frame per season: spring, summer, fall, winter. */
function planter(season: number): Canv {
  return art((p) => {
    const blooms = [[RED, MOON, LANTERN], [LANTERN, RED, VIOLET], [AMBER, RUST, LANTERN], [RED, FOG, RED]][season];
    const leaf = season === 3 ? PINE : season === 2 ? FOREST : MOSS;
    for (const [x, y] of [[3, 4], [6, 2], [9, 3], [12, 4], [4, 6], [11, 6], [8, 5]]) { p.rect(x, y + 1, 2, 3, leaf); }
    if (season === 3) { p.hline(2, 13, 3, FOG); p.hline(4, 11, 2, FOG); }
    [[3, 3], [7, 1], [10, 2], [13, 3], [5, 5], [11, 5]].forEach(([x, y], k) => p.px(x, y, blooms[k % 3]));
    p.rect(1, 7, 14, 6, AMBER); p.hline(1, 14, 7, LANTERN); p.hline(1, 14, 10, RUST); p.vline(5, 8, 12, RUST); p.vline(10, 8, 12, RUST);
    p.rect(0, 12, 16, 2, MIST); p.hline(0, 15, 13, SHADOW);
  }, 16, 14);
}

/* ------------------------------ wall ------------------------------ */

const frameBox = (p: Pen, x: number, y: number, w: number, h: number, wood: number = RUST, hi: number = AMBER) => {
  p.rect(x, y, w, h, wood); p.hline(x, x + w - 1, y, hi); p.vline(x, y, y + h - 1, hi);
};

function painting(): Canv {
  return art((p) => {
    frameBox(p, 1, 2, 14, 11, AMBER, LANTERN);
    p.rect(2, 3, 12, 9, RED); p.rect(2, 3, 12, 3, AMBER); p.hline(2, 13, 3, LANTERN); // sunset
    p.ellipse(10, 6, 1.5, 1.5, LANTERN);
    p.rect(2, 8, 12, 4, VIOLET); p.line(2, 8, 6, 6, VIOLET); p.line(6, 6, 10, 8, VIOLET); // ridges
    for (const [x, h] of [[3, 3], [5, 4], [8, 3], [12, 4]]) { p.vline(x, 11 - h, 11, VOID); p.px(x - 1, 10, VOID); p.px(x + 1, 10, VOID); }
  }, 16, 16, false);
}

function photo(): Canv {
  return art((p) => {
    frameBox(p, 2, 2, 12, 11, SHADOW, MIST);
    p.rect(3, 3, 10, 9, LANTERN); p.rect(3, 9, 10, 3, AMBER);
    // Three figures on a porch, squinting into the sun.
    for (const [x, h, c] of [[5, 5, RUST], [8, 6, TWILIGHT], [11, 4, CRAN]] as const) { p.rect(x - 1, 11 - h + 2, 3, h - 2, c); p.rect(x - 1, 11 - h, 2, 2, AMBER); p.px(x, 11 - h, RUST); }
    p.px(3, 3, FOG); p.px(12, 3, FOG);
  }, 16, 16, false);
}

function parkMap(): Canv {
  return art((p) => {
    p.rect(0, 2, 16, 12, SHADOW); p.rect(1, 3, 14, 10, LANTERN);
    p.rect(1, 3, 14, 2, FOREST); p.hline(2, 13, 4, FERN); // header band
    p.rect(9, 6, 5, 3, MOSS); p.rect(2, 9, 4, 3, MOSS); p.rect(5, 6, 3, 2, TWILIGHT); // woods, the bog
    p.line(2, 7, 7, 10, RED); p.line(7, 10, 13, 11, RED); p.line(7, 10, 11, 6, RED); // trails
    p.px(12, 7, VOID); p.px(4, 10, VOID); p.px(13, 11, AMBER);
    p.px(0, 2, RED); p.px(15, 2, RED); // pushpins
  }, 16, 16, false);
}

function sampler(): Canv {
  return art((p) => {
    frameBox(p, 1, 2, 14, 12, AMBER, LANTERN);
    p.rect(2, 3, 12, 10, FOG);
    p.hline(3, 12, 4, RED); p.px(4, 5, RED); p.px(7, 5, RED); p.px(10, 5, RED); p.hline(4, 11, 6, CRAN); // the lettering
    p.line(3, 11, 7, 8, FOREST); p.line(7, 8, 9, 10, FOREST); p.line(9, 10, 12, 8, MOSS); p.hline(3, 12, 11, MOSS);
    p.px(8, 8, FOG); p.px(11, 9, RED);
  }, 16, 16, false);
}

function quilt(): Canv {
  return art((p) => {
    p.hline(1, 14, 1, RUST); p.px(1, 0, AMBER); p.px(14, 0, AMBER); // the rod
    p.rect(2, 2, 12, 12, LANTERN);
    const star = [[0, 0, TWILIGHT], [1, 1, RED], [2, 2, TWILIGHT], [3, 3, RED]] as const;
    for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
      const dx = Math.abs(x - 5.5), dy = Math.abs(y - 5.5);
      if (dx + dy < 3) p.px(2 + x, 2 + y, RED);
      else if (Math.abs(dx - dy) < 1 && dx < 6) p.px(2 + x, 2 + y, star[Math.floor(dx) % 4][2]);
    }
    p.hline(2, 13, 13, AMBER); p.vline(2, 2, 13, AMBER); p.vline(13, 2, 13, AMBER);
  }, 16, 16, false);
}

function banjo(): Canv {
  return art((p) => {
    p.line(9, 9, 13, 1, RUST); p.line(10, 9, 14, 1, AMBER); // neck
    p.rect(13, 0, 2, 2, SHADOW); p.px(15, 1, FOG);
    p.ellipse(6, 10, 5, 5, MIST); p.ellipse(6, 10, 4, 4, FOG); p.ellipse(6, 10, 4.5, 4.5, MIST);
    p.ellipse(6, 10, 3.5, 3.5, LANTERN);
    p.line(4, 12, 12, 2, SHADOW); p.rect(5, 11, 2, 1, RUST);
    p.px(6, 4, AMBER);
  }, 16, 16, true);
}

function antlers(): Canv {
  return art((p) => {
    p.ellipse(8, 11, 3, 4, RUST); p.ellipse(8, 11, 2, 3, AMBER); p.px(8, 9, LANTERN);
    const side = (d: number) => {
      p.line(8 + d, 8, 8 + d * 6, 1, LANTERN);
      p.line(8 + d * 3, 6, 8 + d * 2, 2, LANTERN); p.line(8 + d * 5, 3, 8 + d * 4, 0, FOG); p.line(8 + d * 6, 4, 8 + d * 7, 1, FOG);
    };
    side(-1); side(1);
    p.px(7, 8, AMBER); p.px(9, 8, AMBER);
  }, 16, 16, true);
}

/** Pendulum swings left/right; frame 2 = the cuckoo out on the hour. */
function cuckoo(f: number): Canv {
  return art((p) => {
    p.line(2, 4, 8, 0, RUST); p.line(14, 4, 8, 0, RUST); p.hline(2, 14, 4, CRAN);
    p.rect(3, 4, 11, 8, AMBER); p.vline(13, 4, 11, RUST);
    p.ellipse(8, 8, 2.5, 2.5, FOG); p.vline(8, 6, 8, VOID); p.hline(8, 9, 8, VOID);
    p.rect(7, 4, 3, 2, VOID);
    if (f === 2) { p.rect(7, 3, 3, 2, MIST); p.px(6, 4, AMBER); p.px(8, 3, VOID); }
    const sw = f === 1 ? 1 : f === 0 ? -1 : 0;
    p.line(8, 12, 8 + sw, 15, SHADOW); p.px(8 + sw, 15, LANTERN);
    p.vline(5, 12, 14, SHADOW); p.rect(4, 14, 2, 2, SHADOW); p.vline(11, 12, 13, SHADOW); p.rect(10, 13, 2, 2, SHADOW); // weights
  }, 16, 16, true);
}

/* ------------------------------ floor ------------------------------ */

function armchair(): Canv {
  return art((p) => {
    p.rect(2, 1, 12, 10, CRAN); p.rect(3, 2, 10, 8, RED); // back
    p.rect(0, 4, 3, 10, CRAN); p.rect(13, 4, 3, 10, CRAN); p.hline(0, 2, 4, RED); p.hline(13, 15, 4, RED); // wings / arms
    p.rect(3, 10, 10, 4, RED); p.hline(3, 12, 10, LANTERN); // cushion
    for (const [x, y] of [[5, 4], [8, 4], [11, 4], [6, 7], [10, 7]]) p.px(x, y, CRAN); // tufting
    p.rect(1, 14, 2, 3, RUST); p.rect(13, 14, 2, 3, RUST);
  }, 16, 17);
}

function floorLamp(on: boolean): Canv {
  return art((p) => {
    p.line(3, 0, 12, 0, on ? LANTERN : FOG);
    p.rect(3, 1, 10, 6, on ? LANTERN : FOG); p.hline(2, 13, 7, on ? AMBER : MIST); p.hline(4, 11, 1, on ? MOON : LANTERN);
    if (on) { p.px(7, 8, FERN); p.px(8, 8, MOON); }
    p.vline(8, 8, 23, AMBER); p.vline(7, 9, 23, RUST);
    p.rect(4, 23, 8, 2, SHADOW); p.hline(5, 10, 23, MIST);
  }, 16, 25);
}

function fern(): Canv {
  return art((p) => {
    for (const [a, l] of [[-2.4, 7], [-1.9, 8], [-1.4, 8], [-1.0, 7], [-0.6, 6], [-2.8, 6]] as const) {
      const ex = Math.round(8 + Math.cos(a) * l), ey = Math.round(9 + Math.sin(a) * l);
      p.line(8, 9, ex, ey, MOSS); p.px(ex, ey, FERN);
      const mx = Math.round(8 + Math.cos(a) * l * 0.6), my = Math.round(9 + Math.sin(a) * l * 0.6);
      p.px(mx + 1, my, FERN); p.px(mx - 1, my + 1, FOREST);
    }
    p.rect(4, 9, 8, 7, MIST); p.hline(3, 12, 9, FOG); p.hline(4, 11, 12, TWILIGHT); p.vline(11, 10, 15, TWILIGHT);
  }, 16, 16);
}

/** A little brown hen, 10x9: f = peck. */
function hen(f: number): Canv {
  return art((p) => {
    p.ellipse(5, 5, 3.5, 2.5, RUST); p.rect(2, 4, 3, 2, AMBER); p.px(1, 3, RUST); p.px(1, 4, CRAN); // body, wing, tail
    const hy = f ? 4 : 1;
    p.rect(7, hy, 2, 3, RUST); p.px(8, hy, VOID); p.px(9, hy + 1, AMBER); p.px(7, hy - 1, RED); // head, eye, beak, comb
    p.vline(4, 7, 8, AMBER); p.vline(6, 7, 8, AMBER);
  }, 11, 9);
}

/* ------------------------------ second wave ------------------------------ */

function porchSwing(f: number): Canv {
  return art((p) => {
    p.line(1, 22, 6, 1, RUST); p.line(22, 22, 17, 1, RUST); p.line(2, 22, 7, 1, AMBER); p.line(21, 22, 16, 1, AMBER);
    p.rect(4, 1, 16, 2, AMBER); p.hline(4, 19, 1, LANTERN);
    const sw = f ? 1 : 0;
    p.vline(7 + sw, 3, 12, FOG); p.vline(16 + sw, 3, 12, FOG);
    p.rect(6 + sw, 8, 12, 4, AMBER); for (let x = 7; x < 18; x += 2) p.vline(x + sw, 8, 11, RUST); // back slats
    p.rect(5 + sw, 12, 14, 2, AMBER); p.hline(5 + sw, 18 + sw, 12, LANTERN); p.hline(5 + sw, 18 + sw, 13, RUST);
    p.rect(9 + sw, 10, 4, 2, RED); p.px(10 + sw, 10, LANTERN); // a cushion
  }, 24, 23);
}

/** f: bees in two places. */
function beeSkep(f: number): Canv {
  return art((p) => {
    p.rect(3, 13, 10, 2, RUST); p.vline(4, 15, 17, RUST); p.vline(11, 15, 17, RUST);
    for (let y = 3; y < 13; y++) {
      const w = Math.round(Math.sqrt(Math.max(0, 1 - ((y - 12) / 9.5) ** 2)) * 5.5);
      p.hline(8 - w, 7 + w, y, y % 2 ? AMBER : LANTERN);
    }
    p.px(8, 2, AMBER); p.rect(7, 10, 2, 2, VOID);
    for (const [x, y] of f ? [[2, 5], [13, 2], [11, 8]] : [[3, 2], [14, 6], [1, 9]]) { p.px(x, y, LANTERN); p.px(x + 1, y, VOID); }
  }, 16, 18, true);
}

function smokehouse(): Canv {
  return art((p) => {
    p.rect(2, 22, 20, 4, MIST); for (let x = 3; x < 22; x += 4) p.px(x, 23, FOG); p.hline(2, 21, 25, SHADOW); // stone footing
    p.rect(3, 9, 18, 13, RUST); for (let x = 4; x < 21; x += 3) p.vline(x, 9, 21, CRAN);
    for (let y = 2; y < 10; y++) { const i = Math.round((9 - y) * 1.2); p.hline(1 + i, 22 - i, y, y % 2 ? SHADOW : PINE); }
    p.rect(9, 0, 6, 3, PINE); p.hline(9, 14, 0, MOSS); // ridge vent
    p.rect(9, 13, 6, 9, AMBER); p.vline(12, 13, 21, RUST); p.px(13, 17, VOID); // door
    p.px(5, 8, MIST); p.px(18, 8, MIST); // smoke at the eaves
  }, 24, 26);
}

function rootCellar(): Canv {
  return art((p) => {
    p.ellipse(12, 12, 12, 7, FOREST); p.ellipse(12, 11, 10, 5, MOSS); for (const [x, y] of [[6, 7], [15, 6], [19, 10]]) p.px(x, y, FERN); // sod mound
    p.rect(4, 10, 16, 8, MIST); for (let x = 5; x < 20; x += 3) p.px(x, 11 + (x % 2), FOG); p.hline(4, 19, 17, SHADOW); // stone face
    p.rect(7, 11, 10, 7, AMBER); p.vline(12, 11, 17, RUST); p.hline(7, 16, 14, RUST); // plank doors
    p.px(11, 15, VOID); p.px(13, 15, VOID);
  }, 24, 18);
}

function hammock(f: number): Canv {
  return art((p) => {
    p.rect(1, 2, 2, 14, RUST); p.rect(29, 2, 2, 14, RUST); p.px(1, 2, AMBER); p.px(29, 2, AMBER);
    const sag = f ? 1 : 0;
    for (let x = 3; x < 29; x++) {
      const y = 5 + Math.round(Math.sin(((x - 3) / 26) * Math.PI) * (5 + sag));
      p.px(x, y, (x % 3) ? FOG : MIST); p.px(x, y + 1, (x + 1) % 3 ? LANTERN : MIST);
    }
    p.line(3, 4, 6, 6, FOG); p.line(28, 4, 25, 6, FOG);
  }, 32, 16);
}

/** Copper rooster; f = which way the wind has it. */
function weatherVane(f: number): Canv {
  return art((p) => {
    p.vline(8, 6, 27, SHADOW); p.vline(7, 8, 27, MIST);
    p.hline(3, 13, 12, AMBER); p.px(2, 12, AMBER); p.px(14, 12, AMBER);
    p.px(8, 10, AMBER); p.px(8, 14, AMBER); // N/S arms
    const d = f ? -1 : 1;
    p.rect(6, 3, 5, 3, AMBER); p.px(8 + d * 3, 2, AMBER); p.px(8 + d * 3, 3, RED); p.px(8 - d * 3, 2, RUST); p.px(8 - d * 3, 1, RUST); // rooster
    p.line(5, 6, 11, 6, RUST);
    p.rect(5, 26, 6, 2, SHADOW);
  }, 16, 28);
}

function carvingMothman(): Canv {
  return art((p) => {
    p.rect(4, 25, 10, 2, RUST);
    p.line(8, 6, 1, 16, RUST); p.line(9, 6, 16, 16, RUST); p.line(1, 16, 5, 20, RUST); p.line(16, 16, 12, 20, RUST); // wings
    for (let y = 8; y < 19; y++) { const w = y < 12 ? 6 - (12 - y) : 6 - Math.floor((y - 12) / 2); p.hline(8 - Math.max(0, w) + 1, 8 + Math.max(0, w) - 1, y, y % 3 ? AMBER : RUST); }
    p.rect(6, 18, 5, 7, AMBER); p.vline(8, 19, 24, RUST);
    p.rect(6, 3, 5, 5, AMBER); p.px(6, 2, RUST); p.px(10, 2, RUST);
    p.px(7, 5, RED); p.px(9, 5, RED);
  }, 17, 27);
}

function carvingSheepsquatch(): Canv {
  return art((p) => {
    p.rect(3, 24, 14, 2, RUST);
    for (let y = 8; y < 24; y++) for (let x = 4; x < 16; x++) if (((x - 10) ** 2) / 36 + ((y - 15) ** 2) / 72 < 1) p.px(x, y, (x + y) % 3 ? LANTERN : AMBER);
    p.rect(7, 4, 6, 6, AMBER); p.rect(8, 6, 4, 3, RUST); p.px(9, 6, RED); p.px(11, 6, RED);
    p.line(7, 4, 4, 3, AMBER); p.px(3, 4, AMBER); p.px(3, 5, RUST); p.line(13, 4, 16, 3, AMBER); p.px(17, 4, AMBER); p.px(17, 5, RUST);
    p.rect(5, 21, 3, 3, AMBER); p.rect(13, 21, 3, 3, AMBER);
  }, 20, 26);
}

/** flag: 0 WV, 1 Mothman, 2 club pennant, 3 Old Glory; f = wave. */
function flagpole(flag: number, f: number): Canv {
  return art((p) => {
    p.vline(3, 1, 31, FOG); p.vline(4, 2, 31, MIST); p.px(3, 0, AMBER); p.rect(1, 30, 6, 2, SHADOW);
    const w = (x: number) => (f ? Math.round(Math.sin(x * 0.7) * 0.8) : Math.round(Math.cos(x * 0.7) * 0.8));
    for (let x = 0; x < 11; x++) for (let y = 0; y < 7; y++) {
      if (flag === 2 && y > 6 - Math.floor(x / 2) && y > 0) continue; // pennant tapers
      if (flag === 2 && y < Math.floor(x / 2)) continue;
      let c: number = FOG;
      if (flag === 0) { c = x === 0 || y === 0 || y === 6 || x === 10 ? TWILIGHT : FOG; if (x >= 4 && x <= 6 && y >= 2 && y <= 4) c = (x + y) % 2 ? AMBER : MOSS; }
      else if (flag === 1) { c = VOID; if (y === 3 && (x === 4 || x === 6)) c = RED; if (y === 2 && (x === 3 || x === 7)) c = SHADOW; }
      else if (flag === 2) { c = x < 2 ? LANTERN : MOSS; if (x === 5 && y === 3) c = LANTERN; }
      else { c = y % 2 ? FOG : RED; if (x < 5 && y < 4) c = (x + y) % 2 ? FOG : TWILIGHT; }
      p.px(5 + x, 2 + y + w(x), c);
    }
  }, 16, 32);
}

function jackOLantern(litOn: boolean): Canv {
  return art((p) => {
    p.ellipse(8, 10, 6.5, 5, RUST); p.ellipse(8, 10, 5.5, 4.2, AMBER);
    p.vline(5, 6, 14, RUST); p.vline(11, 6, 14, RUST); p.vline(8, 6, 14, RUST);
    p.rect(7, 3, 2, 3, FOREST); p.px(9, 3, MOSS);
    const c = litOn ? LANTERN : VOID;
    p.px(5, 9, c); p.px(6, 8, c); p.px(6, 9, c); p.px(10, 9, c); p.px(11, 9, c); p.px(10, 8, c); // eyes
    p.hline(5, 11, 12, c); p.px(6, 13, c); p.px(10, 13, c); p.px(8, 13, c); p.px(7, 12, AMBER); p.px(9, 12, AMBER); // grin
  }, 16, 16);
}

function pathStone(v: number): Canv {
  return art((p) => {
    const sets = [[[4, 5, 4, 3], [11, 10, 3.5, 2.5]], [[8, 8, 5, 3.5]], [[5, 10, 3.5, 2.5], [11, 5, 3.5, 2.5], [12, 12, 2, 1.5]]][v];
    for (const [x, y, rx, ry] of sets) { p.ellipse(x, y + 1, rx, ry, SHADOW); p.ellipse(x, y, rx, ry, MIST); p.ellipse(x - 1, y - 1, rx - 1.5, ry - 1.2, FOG); }
  }, 16, 16, false);
}

function recordPlayer(f: number): Canv {
  return art((p) => {
    p.rect(1, 8, 14, 8, RUST); p.hline(1, 14, 8, AMBER); p.vline(14, 9, 15, CRAN); // table
    p.rect(2, 2, 12, 7, CRAN); p.rect(3, 3, 10, 5, SHADOW); // the case
    p.ellipse(7, 5, 3.5, 2, VOID); p.px(7, 5, f ? RED : LANTERN); p.px(f ? 5 : 9, 4, MIST); // the record, spinning
    p.line(12, 3, 9, 5, FOG);
    if (f) { p.px(13, 0, LANTERN); p.px(14, 1, AMBER); } else { p.px(12, 1, AMBER); p.px(13, 0, LANTERN); } // notes
  }, 16, 16);
}

function ragRug(): Canv {
  return art((p) => {
    const cols = [RED, LANTERN, TWILIGHT, AMBER, MOSS, CRAN];
    for (let r = 7; r >= 1; r--) p.ellipse(8, 8, r, r * 0.8, cols[r % cols.length]);
    for (let a = 0; a < 16; a++) { const t = (a / 16) * Math.PI * 2; p.px(Math.round(8 + Math.cos(t) * 6), Math.round(8 + Math.sin(t) * 4.8), FOG); }
  }, 16, 16, false);
}

function petBed(): Canv {
  return art((p) => {
    p.ellipse(8, 9, 7, 5, CRAN); p.ellipse(8, 9, 6, 4, RED); p.ellipse(8, 10, 4.5, 2.6, LANTERN); p.ellipse(8, 10, 3.5, 1.8, FOG);
    p.px(4, 7, CRAN); p.px(12, 7, CRAN);
  }, 16, 16, false);
}

/* ------------------------------ icons ------------------------------ */

function shrink(c: Canv): Canv {
  // Fit a sprite into a 16x16 bag icon (keeps the pixels crisp where it can).
  const s = Math.min(1, 14 / Math.max(c.width, c.height));
  const { c: o, g } = makeCanvas(16, 16);
  g.imageSmoothingEnabled = false;
  const w = Math.round(c.width * s), h = Math.round(c.height * s);
  g.drawImage(c, Math.floor((16 - w) / 2), Math.floor((16 - h) / 2), w, h);
  return o;
}

function xmasIcon(): Canv {
  return art((p) => {
    for (let x = 1; x < 15; x++) p.px(x, 5 + Math.round(Math.sin(x * 0.6) * 2), PINE);
    [[2, RED], [5, LANTERN], [8, MIST], [11, FERN], [14, RED]].forEach(([x, c]) => { const y = 6 + Math.round(Math.sin(x * 0.6) * 2); p.rect(x - 1, y, 2, 3, c); });
  }, 16, 16);
}

export function bakeHomestead(): void {
  HS.firepit = [firePit(0), firePit(1), firePit(2)];
  HS.bench = [logBench()];
  HS.coop = [coop(0), coop(1)];
  HS.picnic = [picnic()];
  HS.lanternpost = [lanternPost(false), lanternPost(true)];
  HS.birdhouse = [birdhouse(0), birdhouse(1)];
  HS.scarecrow = [scarecrow()];
  HS.planter = [planter(0), planter(1), planter(2), planter(3)];
  HS.painting = [painting()];
  HS.photo = [photo()];
  HS.parkmap = [parkMap()];
  HS.sampler = [sampler()];
  HS.quilt = [quilt()];
  HS.banjo = [banjo()];
  HS.antlers = [antlers()];
  HS.cuckoo = [cuckoo(0), cuckoo(1), cuckoo(2)];
  HS.armchair = [armchair()];
  HS.floorlamp = [floorLamp(false), floorLamp(true)];
  HS.fern = [fern()];
  HS.porchswing = [porchSwing(0), porchSwing(1)];
  HS.skep = [beeSkep(0), beeSkep(1)];
  HS.smokehouse = [smokehouse()];
  HS.cellar = [rootCellar()];
  HS.hammock = [hammock(0), hammock(1)];
  HS.vane = [weatherVane(0), weatherVane(1)];
  HS.carvemoth = [carvingMothman()];
  HS.carvesheep = [carvingSheepsquatch()];
  HS.flagpole = [0, 1, 2, 3].flatMap((k) => [flagpole(k, 0), flagpole(k, 1)]);
  HS.jack = [jackOLantern(false), jackOLantern(true)];
  HS.pathstone = [pathStone(0), pathStone(1), pathStone(2)];
  HS.record = [recordPlayer(0), recordPlayer(1)];
  HS.ragrug = [ragRug()];
  HS.petbed = [petBed()];
  const h0 = hen(0), h1 = hen(1);
  const mirror = (c: Canv) => { const { c: o, g } = makeCanvas(c.width, c.height); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); return o; };
  HS.hen = [h0, h1, mirror(h0), mirror(h1)];
  HS.egg = [art((p) => { p.ellipse(4, 4, 2.5, 3.2, FOG); p.px(3, 3, MOON); p.px(5, 5, MIST); }, 8, 8)];
  const icons: Record<string, Canv> = {
    deco_fire_pit: HS.firepit[1], deco_log_bench: HS.bench[0], deco_coop: HS.coop[1], deco_picnic: HS.picnic[0],
    deco_lantern_post: HS.lanternpost[1], deco_birdhouse: HS.birdhouse[1], deco_scarecrow: HS.scarecrow[0], deco_planter: HS.planter[1],
    deco_painting: HS.painting[0], deco_family_photo: HS.photo[0], deco_park_map: HS.parkmap[0], deco_sampler: HS.sampler[0],
    deco_quilt: HS.quilt[0], deco_banjo: HS.banjo[0], deco_antlers: HS.antlers[0], deco_clock: HS.cuckoo[2],
    deco_armchair: HS.armchair[0], deco_floor_lamp: HS.floorlamp[1], deco_fern: HS.fern[0],
    deco_porch_swing: HS.porchswing[0], deco_bee_skep: HS.skep[0], deco_smokehouse: HS.smokehouse[0], deco_root_cellar: HS.cellar[0],
    deco_hammock: HS.hammock[0], deco_weather_vane: HS.vane[0], deco_carving_mothman: HS.carvemoth[0], deco_carving_sheepsquatch: HS.carvesheep[0],
    deco_flagpole: HS.flagpole[0], deco_jack_o_lantern: HS.jack[1], deco_path_stone: HS.pathstone[1], deco_record_player: HS.record[0],
    deco_rag_rug: HS.ragrug[0], deco_pet_bed: HS.petbed[0], deco_xmas_lights: xmasIcon(),
  };
  for (const [id, c] of Object.entries(icons)) ICON[id] = shrink(c);
  ICON.field_pumpkin = art((p) => { p.ellipse(8, 10, 6.5, 5, RUST); p.ellipse(8, 10, 5.5, 4.2, AMBER); p.vline(5, 6, 14, RUST); p.vline(11, 6, 14, RUST); p.vline(8, 6, 14, RUST); p.rect(7, 3, 2, 3, FOREST); p.px(9, 3, MOSS); p.px(6, 8, LANTERN); });
  ICON.field_stone = art((p) => { p.ellipse(8, 10, 6, 3.5, MIST); p.ellipse(7, 9, 4, 2, FOG); p.px(10, 11, TWILIGHT); p.px(5, 11, TWILIGHT); }, 16, 16);
}
