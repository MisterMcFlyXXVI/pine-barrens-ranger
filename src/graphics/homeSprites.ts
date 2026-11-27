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
  };
  for (const [id, c] of Object.entries(icons)) ICON[id] = shrink(c);
  ICON.field_stone = art((p) => { p.ellipse(8, 10, 6, 3.5, MIST); p.ellipse(7, 9, 4, 2, FOG); p.px(10, 11, TWILIGHT); p.px(5, 11, TWILIGHT); }, 16, 16);
}
