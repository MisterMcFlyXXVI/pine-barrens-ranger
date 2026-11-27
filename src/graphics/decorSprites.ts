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

/* ---------------------------- town props ---------------------------- */

function trashCan(): Canv {
  return art((p) => {
    p.rect(4, 6, 8, 9, MIST); for (const x of [5, 8, 11]) p.vline(x, 7, 14, TWILIGHT);
    p.rect(3, 4, 10, 2, FOG); p.px(7, 3, FOG); p.px(8, 3, FOG); p.px(10, 5, TWILIGHT); // dented lid, ajar
    p.px(12, 13, RUST); p.px(3, 14, AMBER);
  }, 16, 16, true);
}

function bike(): Canv {
  return art((p) => {
    for (const cx of [4, 12]) { for (let a = 0; a < 12; a++) p.px(Math.round(cx + Math.cos(a / 12 * Math.PI * 2) * 3), Math.round(11 + Math.sin(a / 12 * Math.PI * 2) * 3), SHADOW); p.px(cx, 11, MIST); }
    p.line(4, 11, 8, 7, RED); p.line(8, 7, 12, 11, RED); p.line(8, 7, 7, 11, RED); p.line(7, 11, 12, 11, RED);
    p.hline(6, 8, 6, SHADOW); p.line(11, 5, 12, 11, MIST); p.hline(10, 12, 5, SHADOW);
    p.rect(12, 7, 3, 2, AMBER); // basket
  }, 16, 16, true);
}

/** A tabby curled up on the step: breathing, now and then flicking its tail. */
function cat(frame: number): Canv {
  return art((p) => {
    const b = frame === 1 ? 1 : 0;
    p.ellipse(8, 12, 5, 2.5 + b * 0.4, AMBER);
    for (const x of [6, 8, 10]) p.px(x, 11, RUST);
    p.ellipse(4, 11, 2.2, 2, AMBER); p.px(3, 9, AMBER); p.px(5, 9, AMBER); p.px(3, 10, RUST); p.px(5, 10, RUST);
    p.px(3, 11, SHADOW); p.px(5, 11, SHADOW); // closed eyes
    if (frame === 2) { p.line(12, 12, 14, 9, AMBER); p.px(14, 8, RUST); } else p.hline(10, 13, 14, RUST);
  }, 16, 16, true);
}

function newsBox(): Canv {
  return art((p) => {
    p.vline(6, 11, 15, SHADOW); p.vline(10, 11, 15, SHADOW);
    p.rect(4, 2, 9, 10, CRAN); p.rect(5, 4, 7, 4, MIST); p.hline(6, 10, 5, SHADOW); p.hline(6, 9, 6, SHADOW);
    p.hline(4, 12, 9, RED); p.px(11, 10, LANTERN);
  }, 16, 16, true);
}

function flowerPot(kind: number): Canv {
  return art((p) => {
    p.rect(5, 11, 6, 4, RUST); p.hline(4, 11, 11, AMBER);
    const c = [RED, LANTERN, VIOLET][kind];
    for (const [x, y] of [[6, 8], [8, 7], [10, 9], [7, 10], [9, 10]]) { p.px(x, y, c); p.px(x, y + 1, MOSS); }
    p.px(8, 6, FERN);
  });
}

function milkCans(): Canv {
  return art((p) => {
    for (const [x, h] of [[3, 9], [9, 8]]) {
      p.rect(x, 15 - h, 5, h, MIST); p.rect(x + 1, 13 - h, 3, 2, MIST); p.hline(x, x + 4, 15 - h, FOG); p.vline(x + 4, 16 - h, 14, TWILIGHT);
      p.px(x + 2, 12 - h, SHADOW);
    }
  }, 16, 16, true);
}

/* ------------------------- square, station & mine ------------------------- */

/** A bronze coal miner on a stone plinth, lamp on his helmet and a pick on his shoulder. */
function statue(): Canv {
  return art((p) => {
    p.rect(2, 22, 12, 10, MIST); p.rect(1, 21, 14, 2, FOG); p.rect(1, 30, 14, 2, TWILIGHT);
    p.rect(5, 25, 6, 3, AMBER); p.hline(6, 9, 26, RUST); // plaque
    // figure (verdigris bronze)
    p.rect(6, 4, 4, 4, FOREST); p.hline(5, 10, 4, PINE); p.px(8, 3, LANTERN); // helmet + lamp
    p.rect(5, 8, 6, 7, FOREST); p.vline(5, 8, 14, PINE);
    p.rect(5, 15, 2, 6, FOREST); p.rect(9, 15, 2, 6, FOREST); p.hline(4, 11, 20, PINE);
    p.line(11, 6, 14, 12, RUST); p.line(10, 5, 13, 4, MIST); // pick
    p.px(7, 6, MOSS); p.px(6, 10, MOSS); p.px(9, 12, MOSS); // weathering
  }, 16, 32, true);
}

function flagpole(f: number): Canv {
  return art((p) => {
    p.vline(3, 2, 42, MIST); p.px(3, 1, LANTERN); p.rect(1, 41, 5, 3, SHADOW);
    const w = f ? 1 : 0;
    // A gold-and-blue flag with a white seal, rippling.
    for (let x = 0; x < 11; x++) {
      const dy = Math.round(Math.sin(x * 0.7 + f * 1.6) * 1);
      p.vline(4 + x, 3 + dy, 9 + dy, TWILIGHT);
      p.px(4 + x, 3 + dy, LANTERN); p.px(4 + x, 9 + dy, LANTERN);
    }
    p.rect(8 + w, 5, 3, 3, FOG);
  }, 16, 44, true);
}

function gumball(): Canv {
  return art((p) => {
    p.rect(6, 12, 4, 4, RED); p.rect(5, 10, 6, 2, RED); p.px(8, 11, LANTERN);
    p.ellipse(8, 6, 4, 4, MIST); p.ellipse(8, 6, 3, 3, FOG);
    for (const [x, y, c] of [[7, 6, RED], [9, 5, LANTERN], [8, 8, VIOLET], [6, 5, MOSS], [10, 7, AMBER]] as Array<[number, number, number]>) p.px(x, y, c);
    p.rect(7, 1, 2, 2, RED);
  }, 16, 16, true);
}

/** The town water tower: a wooden tank on trestle legs, with a spout arm. */
function waterTower(): Canv {
  return art((p) => {
    for (const x of [6, 25]) p.line(x, 47, x + (x < 16 ? 4 : -4), 22, SHADOW);
    p.line(8, 40, 23, 30, RUST); p.line(23, 40, 8, 30, RUST);
    p.rect(4, 6, 24, 18, RUST); for (let x = 6; x < 28; x += 4) p.vline(x, 7, 23, CRAN);
    for (const y of [9, 15, 21]) p.hline(4, 27, y, SHADOW);
    p.rect(2, 2, 28, 5, SHADOW); p.hline(5, 26, 1, SHADOW); p.px(16, 0, SHADOW);
    p.line(27, 18, 31, 24, MIST); // spout
    p.rect(9, 12, 14, 4, AMBER); p.hline(11, 20, 13, RUST); // faded C&O lettering
    p.px(5, 22, MOSS); p.px(26, 8, MOSS);
  }, 32, 48, true);
}

/** A rusted coal tipple over the old loading track. */
function tipple(): Canv {
  return art((p) => {
    for (const x of [4, 22, 40]) { p.vline(x, 20, 55, SHADOW); p.vline(x + 1, 20, 55, RUST); }
    for (let y = 26; y < 56; y += 10) { p.line(4, y, 22, y + 8, RUST); p.line(22, y, 40, y + 8, RUST); }
    p.rect(1, 6, 46, 16, RUST); for (let x = 3; x < 46; x += 4) p.vline(x, 7, 21, CRAN);
    p.rect(0, 2, 48, 5, SHADOW); p.rect(14, 10, 8, 6, SHADOW); p.rect(30, 10, 8, 6, VOID);
    p.rect(18, 22, 12, 8, RUST); p.line(18, 30, 22, 34, RUST); p.line(29, 30, 25, 34, RUST); // chute
    p.line(46, 8, 54, 0, SHADOW); // conveyor stub
    for (const [x, y] of [[6, 12], [40, 18], [12, 20], [44, 4]]) { p.px(x, y, MOSS); p.px(x + 1, y, FOREST); }
  }, 48, 56, true);
}

function mineCart(): Canv {
  return art((p) => {
    p.rect(2, 5, 12, 7, RUST); p.rect(3, 6, 10, 2, SHADOW); p.hline(2, 13, 5, AMBER);
    for (const x of [4, 11]) { p.rect(x - 1, 12, 3, 3, SHADOW); p.px(x, 13, MIST); }
    for (const x of [4, 7, 10]) { p.px(x, 4, VOID); p.px(x + 1, 3, SHADOW); } // a few lumps of coal
    p.px(6, 9, CRAN); p.px(12, 7, CRAN);
  }, 16, 16, true);
}

/** The lamp house, where miners once checked out their cap lamps. */
function lampHouse(night: boolean): Canv {
  return art((p) => {
    p.rect(2, 12, 28, 22, FOG); for (let y = 14; y < 34; y += 3) p.hline(2, 29, y, MIST);
    for (let y = 2; y < 13; y++) { const i = Math.round((12 - y) * 1.2); p.hline(i, 31 - i, y, y % 3 ? SHADOW : TWILIGHT); }
    p.rect(5, 18, 8, 7, AMBER); p.rect(6, 19, 6, 5, night ? LANTERN : MIST); p.vline(9, 19, 23, RUST);
    p.rect(18, 20, 8, 14, SHADOW); p.rect(19, 21, 6, 13, RUST);
    p.rect(8, 27, 16, 3, CRAN); // faded sign band
    p.px(3, 32, MOSS); p.px(4, 31, FOREST); p.px(28, 30, MOSS);
  }, 32, 36, true);
}

/** An old coonhound asleep on the porch: ears flopped, ribs rising and falling. */
function dog(frame: number): Canv {
  return art((p) => {
    const b = frame ? 1 : 0;
    p.ellipse(9, 12, 6, 2.6 + b * 0.4, RUST); p.ellipse(9, 13, 5, 1.6, AMBER);
    p.ellipse(3, 12, 2.5, 2, RUST); p.rect(1, 12, 2, 2, AMBER); p.px(1, 13, VOID); // muzzle + nose
    p.rect(3, 10, 2, 4, CRAN); // floppy ear
    p.px(3, 11, SHADOW);
    p.hline(14, 15, 13, RUST);
    if (frame === 1) { p.px(2, 9, FOG); p.px(1, 8, FOG); } // a snore
  }, 16, 16, true);
}

/* ---------------------------- home interiors ---------------------------- */

/** Things hung on a wall: drawn on the wall-face tile. */
function wallFrame(kind: string): Canv {
  return art((p) => {
    const box = (x: number, y: number, w: number, h: number, wood: number = RUST) => { p.rect(x, y, w, h, wood); p.rect(x + 1, y + 1, w - 2, h - 2, FOG); };
    switch (kind) {
      case 'photo': box(3, 3, 10, 9, AMBER); p.rect(4, 4, 8, 7, MIST); p.rect(5, 7, 2, 4, SHADOW); p.rect(9, 6, 2, 5, SHADOW); p.px(6, 6, AMBER); p.px(10, 5, AMBER); break;
      case 'clock': p.ellipse(8, 7, 5, 5, RUST); p.ellipse(8, 7, 4, 4, FOG); p.vline(8, 4, 7, SHADOW); p.hline(8, 10, 7, SHADOW); p.rect(7, 12, 3, 3, AMBER); break;
      case 'sampler': box(2, 3, 12, 9, AMBER); p.hline(4, 11, 5, RED); p.hline(4, 9, 7, FOREST); p.hline(5, 11, 9, RED); p.px(3, 4, CRAN); p.px(12, 10, CRAN); break;
      case 'map': box(2, 3, 12, 10, SHADOW); p.rect(3, 4, 10, 8, LANTERN); p.line(4, 10, 8, 6, RED); p.line(8, 6, 12, 8, RED); p.px(6, 5, FOREST); p.px(10, 10, FOREST); p.px(9, 9, TWILIGHT); break;
      case 'rods': p.line(2, 13, 13, 3, RUST); p.line(3, 14, 14, 5, AMBER); p.rect(1, 6, 2, 2, SHADOW); p.rect(13, 6, 2, 2, SHADOW); p.px(13, 9, RED); break;
      case 'drawing': p.rect(3, 3, 10, 10, FOG); p.px(3, 3, RED); p.px(12, 3, RED); p.ellipse(8, 8, 3, 2, AMBER); p.px(6, 6, RED); p.px(10, 6, RED); p.line(5, 11, 11, 11, FOREST); break;
      case 'poster': p.rect(3, 2, 10, 12, TWILIGHT); p.ellipse(8, 7, 3, 3, FOG); p.px(7, 7, RED); p.px(9, 7, RED); p.hline(4, 11, 11, LANTERN); break;
      case 'quilt': box(2, 2, 12, 12, AMBER); for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) if ((x + y) % 4 === 0 || (x - y + 10) % 4 === 0) p.px(3 + x, 3 + y, (x < 5) === (y < 5) ? RED : TWILIGHT); break;
      case 'window': p.ellipse(8, 8, 5, 5, AMBER); p.ellipse(8, 8, 4, 4, MIST); p.vline(8, 4, 12, RUST); p.hline(4, 12, 8, RUST); p.px(6, 6, FOG); break;
      case 'star':
        p.ellipse(8, 8, 6, 6, SHADOW); p.ellipse(8, 8, 5, 5, LANTERN);
        for (let a = 0; a < 8; a++) { const t = (a / 8) * Math.PI * 2; for (let k = 1; k < 5; k++) p.px(Math.round(8 + Math.cos(t) * k), Math.round(8 + Math.sin(t) * k), a % 2 ? AMBER : RED); }
        break;
      default: box(3, 3, 10, 9);
    }
  });
}

/** Barney's HO-scale Pine Hollow branch on a table, the little engine making its rounds. */
function modelTrain(f: number): Canv {
  return art((p) => {
    p.rect(1, 6, 30, 8, AMBER); p.hline(1, 30, 6, LANTERN); p.vline(2, 14, 15, RUST); p.vline(29, 14, 15, RUST);
    p.rect(2, 7, 28, 6, MOSS); p.rect(20, 7, 4, 3, FOREST); p.px(26, 8, TWILIGHT); // hills, pond
    p.ellipse(16, 10, 12, 2.5, RUST); p.ellipse(16, 10, 10, 1.5, MOSS); // oval of track
    const pos = [[6, 10], [10, 8], [16, 7.5], [22, 8], [26, 10], [22, 12], [16, 12.5], [10, 12]][f % 8];
    p.rect(pos[0] - 2, pos[1] - 2, 4, 2, SHADOW); p.px(pos[0] - 2, pos[1] - 3, SHADOW); p.px(pos[0] + 1, pos[1] - 2, RED);
    p.rect(13, 3, 3, 3, RUST); p.rect(14, 1, 2, 2, FOG); // tiny water tower
  }, 32, 16, true);
}

/** Clara's ham rig: dials, a reel-to-reel and blinking lights. */
function radioRig(f: number): Canv {
  return art((p) => {
    p.rect(0, 6, 32, 10, RUST); p.hline(0, 31, 6, AMBER);
    p.rect(2, 1, 12, 8, SHADOW); p.rect(3, 2, 10, 4, TWILIGHT); p.hline(4, 11, 4, f ? MIST : FOG);
    for (const x of [4, 7, 10]) p.px(x, 7, f && x === 7 ? RED : LANTERN);
    p.ellipse(19, 4, 2.5, 2.5, SHADOW); p.ellipse(25, 4, 2.5, 2.5, SHADOW); p.px(19, 4, f ? FOG : MIST); p.px(25, 4, f ? MIST : FOG);
    p.rect(17, 7, 10, 2, SHADOW);
    p.vline(29, 0, 6, MIST); p.px(29, 0, f ? RED : CRAN); // mic stand
  }, 32, 16, true);
}

/* ------------------------------ story ------------------------------ */

/** Elias's field radio on the porch, rigged to a car battery; the dial glows when someone's calling. */
function porchRadio(glow: boolean): Canv {
  return art((p) => {
    p.rect(2, 9, 12, 6, RUST); p.hline(2, 13, 9, AMBER); // crate
    p.rect(3, 3, 10, 6, SHADOW); p.rect(4, 4, 5, 3, glow ? LANTERN : TWILIGHT); p.px(5, 5, glow ? AMBER : MIST);
    p.px(11, 4, glow ? RED : CRAN); p.px(11, 6, MIST);
    p.vline(12, 0, 3, MIST); p.px(12, 0, glow ? LANTERN : FOG); // antenna
    p.rect(9, 11, 4, 3, VOID); p.px(10, 11, RED); // battery
  }, 16, 16, true);
}

/** Seasonal gathering stalls (Calendar). 32x32, anchored at the bottom-left of a 2x2 area. */
function eventProp(kind: string, f: number): Canv {
  return art((p) => {
    const fire = (x: number, y: number) => { p.rect(x, y, 6, 2, RUST); p.px(x + 1, y - 1 - f, RED); p.px(x + 3, y - 2 + f, AMBER); p.px(x + 4, y - 1, LANTERN); p.px(x + 2, y - 2, LANTERN); };
    if (kind === 'apple_butter') {
      // Copper kettle on a tripod over a wood fire, the long stirring paddle leaning in.
      p.line(6, 30, 12, 10, SHADOW); p.line(26, 30, 20, 10, SHADOW); p.line(16, 31, 16, 10, SHADOW);
      fire(13, 29);
      p.rect(9, 17, 14, 9, RUST); p.hline(9, 22, 17, AMBER); p.hline(10, 21, 25, CRAN); p.rect(10, 18, 3, 6, AMBER);
      p.rect(10, 16, 12, 2, CRAN); p.hline(11, 20, 16, RED); // apple butter
      p.line(18, 17, 27, 4, AMBER); p.rect(26, 2, 3, 3, RUST);
      for (let k = 0; k < 3; k++) p.px(12 + k * 4, 13 - ((f + k) % 2), FOG);
      return;
    }
    if (kind === 'ramp_feed') {
      // Trestle table with two skillets of ramps and potatoes, a bushel basket.
      p.rect(1, 20, 30, 3, AMBER); p.hline(1, 30, 20, LANTERN); p.vline(3, 23, 30, RUST); p.vline(28, 23, 30, RUST);
      for (const x of [4, 17]) { p.rect(x, 16, 10, 4, SHADOW); p.rect(x + 1, 16, 8, 2, AMBER); p.px(x + 2, 16, MOSS); p.px(x + 5, 16, FERN); p.px(x + 7, 17, MOSS); p.hline(x + 10, x + 12, 18, SHADOW); }
      for (let k = 0; k < 4; k++) p.px(6 + k * 6, 13 - ((f + k) % 2), FOG);
      p.rect(11, 25, 8, 6, RUST); p.hline(11, 18, 25, AMBER); for (const x of [12, 14, 16]) p.vline(x, 23, 25, FOREST); p.px(13, 22, MOSS); p.px(15, 22, MOSS);
      return;
    }
    if (kind === 'buckwheat') {
      // Long table, a griddle with a stack of buckwheat cakes and sausage coils.
      p.rect(1, 21, 30, 3, AMBER); p.hline(1, 30, 21, LANTERN); p.vline(3, 24, 30, RUST); p.vline(28, 24, 30, RUST);
      p.rect(3, 17, 13, 4, VOID); p.hline(3, 15, 17, SHADOW); for (const x of [5, 9, 12]) { p.rect(x, 16, 3, 1, AMBER); p.px(x + 1, 15, RUST); }
      p.rect(19, 15, 6, 6, RUST); for (let y = 15; y < 21; y += 2) p.hline(19, 24, y, AMBER); p.hline(20, 23, 14, LANTERN); // the stack
      p.rect(26, 18, 4, 3, CRAN); p.px(27, 18, RED);
      for (let k = 0; k < 3; k++) p.px(6 + k * 4, 12 - ((f + k) % 2), FOG);
      return;
    }
    if (kind === 'new_year') {
      // A big crock of sauerkraut and a pork roast on the trestle table.
      p.rect(1, 21, 30, 3, AMBER); p.hline(1, 30, 21, LANTERN); p.vline(3, 24, 30, RUST); p.vline(28, 24, 30, RUST);
      p.rect(4, 12, 10, 9, FOG); p.hline(4, 13, 12, MOON); p.hline(4, 13, 15, TWILIGHT); p.rect(5, 10, 8, 2, LANTERN); for (const x of [6, 9, 11]) p.px(x, 10, FERN);
      p.ellipse(22, 18, 6, 3, RUST); p.hline(17, 27, 16, AMBER); p.px(21, 17, CRAN); p.px(24, 18, CRAN); p.rect(16, 19, 12, 2, FOG);
      for (let k = 0; k < 3; k++) p.px(7 + k * 3, 7 - ((f + k) % 2), FOG);
      return;
    }
    if (kind === 'st_martin') {
      // Paper lanterns on sticks stuck in a hay bale, and a basket of lebkuchen.
      p.rect(6, 24, 20, 7, AMBER); p.hline(6, 25, 24, LANTERN); for (let x = 8; x < 26; x += 4) p.vline(x, 25, 30, RUST);
      const cols = [RED, LANTERN, TWILIGHT, MOSS, VIOLET];
      for (let k = 0; k < 5; k++) { const x = 5 + k * 5, y = 6 + (k % 2) * 4; p.vline(x + 1, y + 5, 24, SHADOW); p.ellipse(x + 1, y + 2, 2, 2.5, cols[k]); p.px(x + 1, y + 2, (f + k) % 2 ? LANTERN : MOON); }
      return;
    }
    if (kind === 'belsnickel') {
      // The Belsnickel's sack spilling apples and nuts, a bundle of birch switches, his cowbell.
      p.ellipse(14, 24, 9, 6, AMBER); p.ellipse(14, 22, 7, 4, LANTERN); p.rect(11, 14, 6, 6, AMBER); p.hline(11, 16, 16, RUST);
      for (const [x, y] of [[6, 28], [9, 29], [22, 28], [19, 29]] as Array<[number, number]>) { p.rect(x, y, 2, 2, (x + y) % 2 ? RED : CRAN); }
      for (const [x, y] of [[13, 29], [16, 29]] as Array<[number, number]>) p.px(x, y, RUST);
      for (let k = 0; k < 4; k++) p.line(25 + k, 30, 27 + k * 1.5, 8, k % 2 ? FOG : MIST);
      p.rect(2, 12 + f, 5, 5, AMBER); p.hline(2, 6, 12 + f, LANTERN); p.px(4, 17 + f, SHADOW);
      return;
    }
    if (kind === 'fasnacht' || kind === 'fasnacht_burnt') {
      // Old Man Winter on the woodpile (or what's left of him).
      for (let y = 26; y < 31; y++) p.hline(4 + (y - 26), 27 - (y - 26), y, (y % 2) ? RUST : AMBER);
      if (kind === 'fasnacht') {
        p.vline(16, 8, 26, AMBER); p.hline(10, 22, 14, AMBER);
        p.rect(12, 13, 9, 11, MIST); p.vline(16, 13, 23, TWILIGHT);
        p.rect(13, 4, 7, 7, LANTERN); p.px(14, 6, VOID); p.px(18, 6, VOID);
        p.rect(13, 9, 7, 5, MOON); p.px(15, 14, MOON); p.px(17, 15, MOON);
        p.hline(12, 20, 3, SHADOW); p.rect(13, 1, 7, 2, SHADOW);
        p.rect(20, 16, 6, 4, FOG); p.px(21, 17, SHADOW); p.px(23, 17, SHADOW);
      } else {
        for (const [x, y] of [[8, 24], [12, 22], [16, 20], [20, 22], [24, 24], [14, 18], [18, 17]] as Array<[number, number]>) {
          p.rect(x, y + f, 2, 3, (x + f) % 3 ? RED : AMBER); p.px(x, y - 1 - f, LANTERN);
        }
        for (let k = 0; k < 4; k++) p.px(10 + k * 4, 10 - ((f + k) % 3), MIST);
      }
      return;
    }
    if (kind === 'memorial') {
      // A rope between two posts, twelve paper lanterns on it, a thirteenth with no name.
      p.vline(1, 6, 31, RUST); p.vline(30, 6, 31, RUST);
      for (let x = 2; x < 30; x++) p.px(x, 7 + Math.round(Math.sin(((x - 2) / 27) * Math.PI) * 4), SHADOW);
      for (let k = 0; k < 12; k++) {
        const x = 3 + k * 2.2, y = 9 + Math.round(Math.sin(((x - 2) / 27) * Math.PI) * 4);
        p.rect(Math.round(x), y, 2, 3, (k + f) % 3 ? LANTERN : AMBER);
      }
      p.rect(14, 22, 4, 5, (f ? MOON : FOG)); p.px(15, 21, SHADOW);
      return;
    }
    if (kind === 'osterhase') {
      // A moss-lined basket of painted eggs and Matthias's wooden hare (with antlers, at Pippa's insistence).
      p.ellipse(13, 25, 10, 5, AMBER); p.hline(3, 23, 22, RUST); for (let x = 5; x < 23; x += 3) p.vline(x, 22, 29, RUST);
      p.line(4, 22, 13, 12, RUST); p.line(22, 22, 13, 12, RUST);
      p.hline(5, 21, 21, MOSS);
      for (const [x, y, c] of [[7, 19, RED], [11, 18, TWILIGHT], [15, 19, LANTERN], [19, 19, VIOLET], [9, 20, MOSS]] as Array<[number, number, number]>) { p.ellipse(x, y, 2, 2.5, c); p.px(x, y, MOON); }
      p.rect(25, 18, 4, 8, AMBER); p.rect(26, 13, 3, 5, AMBER); p.vline(26, 8, 12, LANTERN); p.vline(28, 8, 12, LANTERN); p.px(25, 7, LANTERN); p.px(29, 7, LANTERN); p.px(27, 15, VOID);
      return;
    }
    // Old Christmas: a ring of tin lanterns on posts around a pot of hot cider.
    for (const [x, y] of [[3, 14], [27, 14], [8, 6], [22, 6]] as Array<[number, number]>) {
      p.vline(x + 1, y + 4, 30, SHADOW); p.rect(x, y, 3, 4, (f + x) % 2 ? LANTERN : AMBER); p.px(x + 1, y - 1, SHADOW);
    }
    p.rect(11, 22, 10, 7, SHADOW); p.hline(11, 20, 22, MIST); p.rect(12, 21, 8, 2, CRAN);
    fire(13, 30);
    for (let k = 0; k < 3; k++) p.px(13 + k * 3, 18 - ((f + k) % 2), FOG);
  }, 32, 32, true);
}

/** A painted barn star on a cedar post (the Snallygaster ward). */
function barnStarPost(): Canv {
  return art((p) => {
    p.rect(7, 12, 2, 12, RUST); p.vline(8, 12, 23, AMBER);
    p.ellipse(8, 7, 7, 7, SHADOW); p.ellipse(8, 7, 6, 6, LANTERN);
    for (let a = 0; a < 8; a++) { const t = (a / 8) * Math.PI * 2; for (let k = 1; k < 6; k++) p.px(Math.round(8 + Math.cos(t) * k), Math.round(7 + Math.sin(t) * k), a % 2 ? AMBER : RED); }
    p.px(8, 7, CRAN);
  }, 16, 24, true);
}

/** A little fir with real candles on its branches (the old German way), and a straw star on top. */
function candleTree(f: number): Canv {
  return art((p) => {
    p.rect(6, 27, 5, 4, RUST); p.hline(6, 10, 27, AMBER); p.vline(8, 24, 27, SHADOW);
    for (let y = 4; y < 25; y++) { const w = Math.floor((y - 3) * 0.32) + 1; p.hline(8 - w, 8 + w, y, (y % 4 === 0) ? FOREST : PINE); if (y % 4 === 1) { p.px(8 - w, y, FOREST); p.px(8 + w, y, FOREST); } }
    for (const [x, y] of [[8, 7], [5, 12], [11, 13], [4, 19], [12, 18], [8, 16], [6, 23], [10, 22]] as Array<[number, number]>) {
      p.px(x, y, MOON); p.px(x, y - 1, (x + y + f) % 2 ? LANTERN : AMBER); if ((x + f) % 3 === 0) p.px(x, y - 2, LANTERN);
    }
    for (const [x, y] of [[6, 10], [10, 16], [7, 20]] as Array<[number, number]>) p.px(x, y, RED);
    p.px(8, 1, LANTERN); p.hline(7, 9, 2, LANTERN); p.px(8, 3, LANTERN); p.px(6, 2, AMBER); p.px(10, 2, AMBER);
  }, 16, 32, true);
}

/** The town gazebo (Restoration Ledger P3): 3 tiles wide, pointed roof, lanterns under the eaves. */
function gazebo(night: boolean): Canv {
  return art((p) => {
    // Platform and steps
    p.rect(1, 40, 46, 6, AMBER); p.hline(1, 46, 40, LANTERN); p.hline(1, 46, 45, RUST);
    for (let x = 4; x < 46; x += 6) p.vline(x, 41, 44, RUST);
    p.rect(18, 44, 12, 4, AMBER); p.hline(18, 29, 46, LANTERN);
    // Posts and railing (open in the middle where the steps come up)
    for (const x of [3, 15, 32, 44]) { p.rect(x, 18, 2, 22, FOG); p.vline(x + 1, 18, 39, MIST); }
    for (const [x0, x1] of [[3, 15], [32, 45]] as Array<[number, number]>) {
      p.hline(x0, x1, 31, FOG); p.hline(x0, x1, 38, FOG);
      for (let x = x0 + 2; x < x1; x += 3) p.vline(x, 32, 37, MIST);
    }
    // Shady interior and a bench
    p.rect(5, 20, 10, 11, SHADOW); p.rect(17, 20, 15, 20, SHADOW); p.rect(34, 20, 10, 11, SHADOW);
    p.rect(19, 33, 10, 2, RUST);
    // Roof: two pitched faces with shingle rows and white trim
    for (let y = 4; y < 19; y++) {
      const half = Math.round((y - 3) * 1.55);
      p.hline(24 - half, 23 + half, y, y % 3 === 0 ? CRAN : RUST);
    }
    p.hline(0, 47, 18, FOG); p.hline(1, 46, 19, MIST);
    for (let x = 2; x < 46; x += 4) p.px(x, 20, FOG);
    p.vline(24, 0, 4, AMBER); p.px(24, 0, LANTERN); p.px(23, 2, AMBER); p.px(25, 2, AMBER);
    // Lanterns under the eaves
    for (const x of [6, 24, 42]) {
      p.vline(x, 20, 21, SHADOW);
      p.rect(x - 1, 22, 3, 3, night ? LANTERN : AMBER); p.px(x, 23, night ? FOG : RUST);
    }
  }, 48, 48, true);
}

/** Agnes's Restoration Ledger, open on a lectern. */
function ledgerStand(): Canv {
  return art((p) => {
    p.rect(6, 7, 4, 8, RUST); p.hline(4, 11, 14, RUST); p.vline(7, 8, 13, AMBER);
    p.rect(2, 3, 12, 5, AMBER);
    p.rect(3, 2, 5, 5, FOG); p.rect(8, 2, 5, 5, FOG); p.vline(8, 2, 6, MIST);
    for (const y of [3, 5]) { p.hline(4, 6, y, TWILIGHT); p.hline(9, 11, y, TWILIGHT); }
    p.px(10, 7, RED); p.px(10, 8, RED); // ribbon marker
  }, 16, 16, true);
}

/** A rusted leg-hold trap chained to a root, jaws open. */
function oldTrap(): Canv {
  return art((p) => {
    p.hline(2, 13, 12, SHADOW); // shadow
    p.rect(4, 9, 8, 3, RUST); p.hline(4, 11, 9, AMBER); p.px(7, 10, SHADOW); p.px(8, 10, SHADOW); // plate
    for (const x of [3, 5, 7, 9, 11]) { p.px(x, 7, FOG); p.px(x + 1, 8, MIST); } // teeth
    p.hline(3, 12, 8, RUST); p.px(2, 8, RUST); p.px(13, 8, RUST); // jaws
    for (let k = 0; k < 4; k++) p.px(12 + (k % 2), 12 - k, MIST); // chain
    p.rect(13, 13, 3, 2, PINE); p.px(14, 13, MOSS); // root
  }, 16, 16, true);
}

/** Festival stalls go up over three days: posts, frame, then canopy and wares. */
function stall(stage: number, kind: string): Canv {
  const [c1, c2] = kind === 'pie' ? [RED, FOG] : kind === 'cider' ? [AMBER, LANTERN] : kind === 'lantern' ? [TWILIGHT, LANTERN] : [CRAN, FOG];
  return art((p) => {
    p.vline(2, 8, 31, RUST); p.vline(13, 8, 31, RUST);
    if (stage === 0) { p.rect(4, 27, 8, 4, AMBER); p.hline(4, 11, 27, LANTERN); return; } // lumber pile
    p.rect(1, 20, 14, 4, AMBER); p.hline(1, 14, 20, LANTERN); p.rect(2, 24, 12, 7, RUST); // counter
    if (stage === 1) { p.hline(1, 14, 8, RUST); return; }
    for (let x = 0; x < 16; x++) for (let y = 4; y < 10; y++) p.px(x, y, (x >> 1) % 2 ? c1 : c2); // striped canopy
    for (let x = 0; x < 16; x += 2) p.px(x, 10, (x >> 1) % 2 ? c1 : c2);
    if (kind === 'pie') for (const x of [3, 7, 11]) { p.rect(x, 18, 3, 2, AMBER); p.px(x + 1, 18, CRAN); }
    if (kind === 'cider') for (const x of [3, 6, 9, 12]) { p.rect(x, 17, 2, 3, AMBER); p.px(x, 17, LANTERN); }
    if (kind === 'lantern') for (const x of [3, 7, 11]) { p.rect(x, 12, 3, 3, [RED, LANTERN, VIOLET][x % 3]); p.px(x + 1, 11, SHADOW); }
    if (kind === 'crafts') { p.rect(3, 12, 10, 7, LANTERN); for (let k = 0; k < 4; k++) p.px(4 + k * 2, 13 + k, RED); }
  }, 16, 32, true);
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
  PROP.trashcan = [trashCan()];
  PROP.bike = [bike()];
  PROP.cat = [cat(0), cat(1), cat(2)];
  PROP.newsbox = [newsBox()];
  PROP.flowerpot = [flowerPot(0), flowerPot(1), flowerPot(2)];
  PROP.milkcans = [milkCans()];
  PROP.statue = [statue()];
  PROP.flagpole = [flagpole(0), flagpole(1)];
  PROP.gumball = [gumball()];
  PROP.watertower = [waterTower()];
  PROP.tipple = [tipple()];
  PROP.minecart = [mineCart()];
  PROP.lamphouse = [lampHouse(false), lampHouse(true)];
  PROP.dog = [dog(0), dog(1)];
  for (const k of ['photo', 'clock', 'sampler', 'map', 'rods', 'drawing', 'poster', 'quilt', 'window', 'star']) PROP[`frame_${k}`] = [wallFrame(k)];
  PROP.modeltrain = [0, 1, 2, 3, 4, 5, 6, 7].map(modelTrain);
  PROP.radiorig = [radioRig(0), radioRig(1)];
  PROP.porchradio = [porchRadio(false), porchRadio(true)];
  PROP.oldtrap = [oldTrap()];
  PROP.gazebo = [gazebo(false), gazebo(true)];
  for (const k of ['ramp_feed', 'apple_butter', 'buckwheat', 'old_christmas']) PROP[`ev_${k}`] = [eventProp(k, 0), eventProp(k, 1)];
  PROP.ledger = [ledgerStand()];
  for (const k of ['new_year', 'st_martin', 'belsnickel', 'fasnacht', 'fasnacht_burnt', 'osterhase', 'memorial']) PROP[`ev_${k}`] = [eventProp(k, 0), eventProp(k, 1)];
  PROP.barnstar = [barnStarPost()];
  PROP.candletree = [candleTree(0), candleTree(1)];
  for (const k of ['pie', 'cider', 'lantern', 'crafts']) PROP[`stall_${k}`] = [stall(0, k), stall(1, k), stall(2, k)];
  DECAL.puddle = [puddle(1), puddle(2), puddle(3)];
  DECAL.leaves = [leafLitter(5), leafLitter(17), leafLitter(29)];
  DECAL.snowLight = [snowLight(7), snowLight(19), snowLight(41)];
  for (let d = 0; d < 4; d++) DECAL[`snowDrift${d}`] = [snowDrift(d, 3), snowDrift(d, 11)];
  DECAL.snowFull = [snowFull(5), snowFull(29), snowFull(71)];
}
