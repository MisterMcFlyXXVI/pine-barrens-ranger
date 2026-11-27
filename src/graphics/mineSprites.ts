/**
 * The Deep Seam's art: coal ribs and floors, the mine objects, Coal-Chewers,
 * the Foreman, crosscut spirits and the Mine Kit HUD icons. Drawn from the
 * same 16 colours as everything else, kept to the subterranean end of the
 * palette: slate blacks, sulfur amber, phosphor green, coal-ember red.
 */
import { makeCanvas, Pen, outline, Canv } from './canvas';
import { P } from './palette';
import { mulberry32 } from '../util';
import { ICON } from './sprites';

const { VOID, SHADOW, PINE, MOSS, FERN, FOG, LANTERN, AMBER, RUST, CRAN, RED, TWILIGHT, MIST, MOON } = P;

export const MG: Record<string, Canv[]> = {};
export const MO: Record<string, Canv[]> = {};
export const MHUD: Record<string, Canv> = {};

function art(w: number, h: number, draw: (p: Pen) => void, line = false): Canv {
  const { c, g } = makeCanvas(w, h);
  draw(new Pen(g));
  return line ? outline(c) : c;
}

/* ---------------- ground ---------------- */

function coalFloor(seed: number): Canv {
  return art(16, 16, (p) => {
    const r = mulberry32(seed);
    // Trodden coal dust: dark, earthy, a few lumps underfoot and the odd glint.
    p.rect(0, 0, 16, 16, SHADOW);
    for (let k = 0; k < 16; k++) p.px(Math.floor(r() * 16), Math.floor(r() * 16), VOID);
    for (let k = 0; k < 4; k++) p.px(Math.floor(r() * 16), Math.floor(r() * 16), PINE);
    for (let k = 0; k < 2; k++) { const x = 1 + Math.floor(r() * 12), y = 1 + Math.floor(r() * 12); p.rect(x, y, 3, 2, VOID); p.px(x + 1, y, TWILIGHT); }
    if (r() < 0.5) p.px(Math.floor(r() * 16), Math.floor(r() * 16), MIST);
    if (r() < 0.25) { const x = 2 + Math.floor(r() * 11), y = 2 + Math.floor(r() * 11); p.hline(x, x + 2, y, RUST); } // an old rail spike
  });
}

function ribTop(seed: number): Canv {
  return art(16, 16, (p) => {
    const r = mulberry32(seed);
    p.rect(0, 0, 16, 16, VOID);
    for (let k = 0; k < 6; k++) { const x = Math.floor(r() * 15), y = Math.floor(r() * 15); p.px(x, y, SHADOW); p.px(x + 1, y + 1, SHADOW); }
  });
}

/** A coal rib seen face-on (a wall with floor in front of it): banded coal, slate partings. */
function ribFace(seed: number): Canv {
  return art(16, 16, (p) => {
    const r = mulberry32(seed);
    // Banded coal face: bright and dull bands, slate partings, the odd pyrite glint; timber lagging on some.
    p.rect(0, 0, 16, 16, VOID);
    for (let y = 0; y < 16; y += 4) { p.hline(0, 15, y + 1, SHADOW); p.hline(0, 15, y + 2, SHADOW); p.hline(0, 15, y + 3, (y / 4) % 2 ? PINE : VOID); }
    for (let k = 0; k < 6; k++) { const x = Math.floor(r() * 15), y = Math.floor(r() * 4) * 4 + 1; p.px(x, y, TWILIGHT); p.px(x + 1, y, MIST); }
    for (let k = 0; k < 3; k++) { const x = Math.floor(r() * 14); p.vline(x, 0, 15, VOID); } // cleats
    p.hline(0, 15, 14, SHADOW); p.hline(0, 15, 15, VOID);
    if (r() < 0.4) { const x = 2 + Math.floor(r() * 10); p.px(x, 6, AMBER); p.px(x + 1, 6, LANTERN); }
    if (r() < 0.3) { for (const x of [1, 5, 9, 13]) { p.rect(x, 0, 3, 14, RUST); p.vline(x, 0, 13, CRAN); p.px(x + 1, 3 + (x % 7), AMBER); } } // lagging boards
  });
}

function mineRail(horiz: boolean): Canv {
  return art(16, 16, (p) => {
    p.g.drawImage(MG.floor[0], 0, 0);
    const put = (a: number, b: number, c: number) => (horiz ? p.px(b, a, c) : p.px(a, b, c));
    for (let t = 1; t < 16; t += 4) for (let a = 2; a <= 13; a++) put(a, t, a % 4 === 0 ? CRAN : RUST);
    for (let t = 0; t < 16; t++) { put(4, t, MIST); put(11, t, MIST); put(5, t, TWILIGHT); put(12, t, TWILIGHT); }
  });
}

function alcove(): Canv {
  return art(16, 16, (p) => {
    p.rect(0, 0, 16, 16, VOID);
    p.rect(2, 3, 12, 13, SHADOW);
    p.vline(2, 3, 15, AMBER); p.vline(13, 3, 15, AMBER); p.hline(2, 13, 3, AMBER); // timber frame
    p.vline(3, 4, 15, RUST); p.vline(12, 4, 15, RUST);
    p.rect(5, 6, 6, 1, FOG); p.px(6, 6, RED); p.px(9, 6, RED); // chalked "SAFE" mark
  });
}

function gob(seed: number): Canv {
  return art(16, 16, (p) => {
    const r = mulberry32(seed);
    p.rect(0, 0, 16, 16, SHADOW);
    for (let k = 0; k < 7; k++) { const x = Math.floor(r() * 12), y = Math.floor(r() * 12); p.ellipse(x + 2, y + 2, 2 + r() * 2, 1.5 + r(), k % 2 ? TWILIGHT : VOID); p.px(x + 1, y + 1, MIST); }
  });
}

function lampFloor(seed: number): Canv {
  return art(16, 16, (p) => {
    const r = mulberry32(seed);
    p.rect(0, 0, 16, 16, RUST);
    for (let y = 3; y < 16; y += 4) p.hline(0, 15, y, CRAN);
    for (let k = 0; k < 5; k++) p.px(Math.floor(r() * 16), Math.floor(r() * 16), SHADOW);
    p.px(Math.floor(r() * 16), 1 + 4 * Math.floor(r() * 3), AMBER);
  });
}

/** A crawlway: a low hole in the coal, roof hanging close (dark bands above and below). */
function crawlTile(horiz: boolean): Canv {
  return art(16, 16, (p) => {
    p.rect(0, 0, 16, 16, VOID);
    const put = (a: number, b: number, c: number) => (horiz ? p.px(a, b, c) : p.px(b, a, c));
    for (let a = 0; a < 16; a++) for (let b = 4; b < 12; b++) put(a, b, (a * 7 + b * 3) % 11 === 0 ? TWILIGHT : SHADOW);
    for (let a = 0; a < 16; a++) { put(a, 3, TWILIGHT); put(a, 12, VOID); if (a % 5 === 2) put(a, 4, MIST); }
  });
}

/** A seep puddle on the floor (drawn over coal floor near seeps). */
function puddle(seed: number): Canv {
  return art(16, 16, (p) => {
    const r = mulberry32(seed);
    const cx = 5 + Math.floor(r() * 6), cy = 6 + Math.floor(r() * 5);
    p.ellipse(cx, cy, 4 + r() * 2, 1.6 + r(), TWILIGHT); p.ellipse(cx, cy, 2.5, 0.8, MIST); p.px(cx - 1, cy - 1, FOG);
  });
}

/* ---------------- objects ---------------- */

/** A coal seam in the rib: bright bands with a glint. */
function seam(f: number): Canv {
  return art(16, 16, (p) => {
    p.g.drawImage(MG.ribFace[1], 0, 0);
    for (const y of [5, 9, 12]) { p.hline(1, 14, y, VOID); p.hline(2, 13, y - 1, TWILIGHT); }
    for (const [x, y] of [[4, 8], [10, 4], [12, 11], [6, 11]]) p.px(x, y, MIST);
    p.px(9 + f, 8, FOG); p.px(3, 4 + f, LANTERN);
    p.rect(5, 14, 6, 2, SHADOW); p.px(6, 14, TWILIGHT); p.px(9, 15, MIST); // loose lumps at its foot
  });
}

/** The rideable ore car, empty, wheels greased. */
function rideCart(): Canv {
  return art(16, 16, (p) => {
    p.rect(1, 4, 14, 8, RUST); p.hline(1, 14, 4, AMBER); p.rect(2, 5, 12, 3, SHADOW);
    for (const x of [3, 7, 11]) p.vline(x, 5, 11, CRAN);
    p.ellipse(4, 13, 2, 2, VOID); p.ellipse(12, 13, 2, 2, VOID); p.px(4, 13, LANTERN); p.px(12, 13, LANTERN);
    p.hline(0, 1, 8, SHADOW); p.hline(14, 15, 8, SHADOW); // couplers
  }, true);
}

/** The canary in its cage (cabin window, after). */
function canaryCage(f: number): Canv {
  return art(16, 22, (p) => {
    p.vline(8, 0, 3, SHADOW); p.ellipse(8, 5, 5, 2, AMBER);
    for (const x of [3, 6, 10, 13]) p.vline(x, 5, 17, AMBER);
    p.hline(3, 13, 17, AMBER); p.rect(2, 18, 13, 3, RUST); p.hline(2, 14, 18, AMBER);
    p.hline(4, 12, 12, RUST); // perch
    p.ellipse(8 + f, 10, 2, 1.6, LANTERN); p.px(10 + f, 9, AMBER); p.px(7 + f, 9, VOID); p.px(6 + f, 11, AMBER);
  }, true);
}

/** Pale cave fungus that glows faintly. */
function fungus(f: number): Canv {
  return art(16, 16, (p) => {
    for (const [x, y, r] of [[5, 11, 2], [9, 9, 3], [12, 12, 2]] as Array<[number, number, number]>) {
      p.vline(x, y, 14, MIST); p.ellipse(x, y, r, r * 0.6, f ? FERN : MOSS); p.px(x - 1, y - 1, FOG);
    }
  });
}



/** A miner turned to anthracite, braced against the roof; a brass check at his collar. */
function calcified(f: number): Canv {
  return art(16, 26, (p) => {
    p.rect(4, 0, 8, 3, TWILIGHT); p.hline(2, 13, 0, MIST);              // the sagging roof slab on his hands
    p.rect(3, 2, 2, 7, SHADOW); p.rect(11, 2, 2, 7, SHADOW);           // arms up
    p.rect(5, 5, 6, 5, VOID); p.px(6, 7, SHADOW); p.px(9, 7, SHADOW);  // head (no face, just facets)
    p.rect(4, 10, 8, 9, VOID); p.vline(6, 11, 18, SHADOW); p.vline(10, 12, 17, TWILIGHT);
    p.rect(4, 19, 3, 7, VOID); p.rect(9, 19, 3, 7, VOID); p.px(5, 22, SHADOW); p.px(10, 21, SHADOW);
    p.px(7, 11, f ? LANTERN : AMBER); p.px(8, 11, AMBER);              // the brass check
    for (const [x, y] of [[5, 13], [10, 15], [7, 20]]) p.px(x, y, MIST); // anthracite glint
  }, true);
}

function hemlockProp(): Canv {
  return art(16, 26, (p) => {
    p.rect(3, 0, 10, 3, AMBER); p.hline(3, 12, 0, LANTERN);   // cap piece
    p.rect(6, 3, 4, 23, AMBER); p.vline(6, 3, 25, RUST); p.vline(9, 3, 25, LANTERN);
    p.px(7, 9, RUST); p.px(8, 16, RUST); p.px(7, 21, MOSS);
    p.rect(4, 24, 8, 2, RUST);                              // wedge
  }, true);
}

function post(): Canv {
  return art(16, 16, (p) => {
    p.g.drawImage(MG.ribFace[0], 0, 0);
    p.rect(6, 0, 4, 16, RUST); p.vline(6, 0, 15, CRAN); p.vline(9, 0, 15, AMBER);
    p.rect(2, 0, 12, 2, RUST); p.hline(2, 13, 0, AMBER);
  });
}

function rubble(seed: number): Canv {
  return art(16, 18, (p) => {
    const r = mulberry32(seed);
    p.rect(0, 2, 16, 16, SHADOW);
    for (let k = 0; k < 9; k++) { const x = Math.floor(r() * 12), y = 3 + Math.floor(r() * 12); p.rect(x, y, 3 + Math.floor(r() * 3), 2, k % 3 === 0 ? CRAN : k % 3 === 1 ? TWILIGHT : VOID); p.px(x, y, MIST); }
    p.hline(1, 14, 2, TWILIGHT);
    p.hline(3, 12, 9, FOG); // chalked "SEALED" stroke
  }, true);
}

function bucket(): Canv {
  return art(16, 16, (p) => {
    p.rect(4, 6, 8, 8, MIST); p.rect(5, 7, 6, 6, TWILIGHT); p.hline(4, 11, 9, MIST); p.hline(4, 11, 12, SHADOW);
    p.rect(3, 4, 10, 2, FOG); p.px(7, 3, FOG); p.px(8, 3, FOG); // lid & knob
    p.line(4, 6, 8, 1, SHADOW); p.line(11, 6, 8, 1, SHADOW);     // bail
    p.px(6, 10, VOID); p.px(10, 8, VOID);                      // dents
  }, true);
}

function chalk(): Canv {
  return art(16, 16, (p) => {
    p.g.drawImage(MG.ribFace[1], 0, 0);
    for (let row = 0; row < 3; row++) for (let k = 0; k < 2; k++) {
      const x0 = 2 + k * 7, y0 = 3 + row * 4;
      for (let s = 0; s < 4; s++) p.vline(x0 + s, y0, y0 + 2, FOG);
      p.line(x0 - 1, y0 + 2, x0 + 4, y0, FOG);
    }
  });
}

function page(): Canv {
  return art(16, 16, (p) => {
    p.rect(3, 6, 10, 8, LANTERN); p.rect(3, 6, 10, 1, VOID); p.vline(3, 6, 13, VOID); p.vline(12, 6, 13, VOID); p.hline(3, 12, 13, VOID);
    for (const y of [8, 10, 12]) p.hline(5, 10, y, SHADOW);
    p.px(11, 7, AMBER);
  }, true);
}

function seep(f: number): Canv {
  return art(16, 16, (p) => {
    p.g.drawImage(MG.ribFace[2], 0, 0);
    p.vline(8, 0, 9, MIST); p.vline(8, 2 + f * 3, 4 + f * 3, FOG);
    p.ellipse(8, 13, 5, 2, TWILIGHT); p.ellipse(8, 13, 3, 1, MIST); p.px(7, 12, FOG);
  });
}

function carbideTin(): Canv {
  return art(16, 16, (p) => {
    p.rect(4, 5, 8, 10, TWILIGHT); p.rect(5, 6, 6, 8, MIST); p.rect(4, 4, 8, 2, SHADOW);
    p.rect(6, 8, 4, 3, LANTERN); p.px(7, 9, RED); p.px(8, 9, RED); // label
    p.px(5, 14, SHADOW);
  }, true);
}

/** Josef's Master Crib: notched logs, log-cabin style, floor to roof. */
function crib(wired: boolean): Canv {
  return art(16, 28, (p) => {
    for (let y = 0; y < 28; y += 4) {
      const across = (y / 4) % 2 === 0;
      if (across) { p.rect(0, y, 16, 3, RUST); p.hline(0, 15, y, AMBER); p.px(0, y + 1, CRAN); p.px(15, y + 1, CRAN); }
      else { p.rect(1, y, 3, 3, AMBER); p.rect(12, y, 3, 3, AMBER); p.px(2, y + 1, CRAN); p.px(13, y + 1, CRAN); }
    }
    p.px(6, 9, LANTERN); p.px(7, 9, LANTERN); p.px(9, 9, LANTERN); // J.M.
    if (wired) { p.rect(6, 15, 4, 5, CRAN); p.hline(6, 9, 15, RED); p.line(8, 20, 14, 27, AMBER); }
  }, true);
}

function liftCage(): Canv {
  return art(16, 28, (p) => {
    p.rect(1, 0, 14, 2, SHADOW); p.vline(8, 0, 2, MIST);
    for (const x of [1, 14]) p.vline(x, 2, 27, MIST);
    for (let x = 3; x < 14; x += 3) p.vline(x, 4, 26, TWILIGHT);
    for (const y of [4, 15, 26]) p.hline(1, 14, y, MIST);
    p.rect(5, 6, 6, 4, AMBER); p.px(7, 7, LANTERN); // the bell
    p.hline(1, 14, 27, SHADOW);
  }, true);
}

function board(): Canv {
  return art(32, 22, (p) => {
    p.rect(0, 0, 32, 20, RUST); p.rect(1, 1, 30, 18, CRAN);
    p.rect(2, 2, 13, 3, LANTERN); p.rect(17, 2, 13, 3, LANTERN); // IN / OUT headers
    p.px(7, 3, SHADOW); p.px(8, 3, SHADOW); p.px(22, 3, SHADOW); p.px(23, 3, SHADOW); p.px(24, 3, SHADOW);
    p.vline(16, 1, 18, SHADOW);
    for (let k = 0; k < 12; k++) { const x = 3 + (k % 4) * 3, y = 7 + Math.floor(k / 4) * 4; p.px(x, y, SHADOW); p.px(x + 15, y, SHADOW); }
    p.vline(4, 20, 21, RUST); p.vline(27, 20, 21, RUST);
  }, true);
}

function locker(): Canv {
  return art(16, 26, (p) => {
    p.rect(1, 0, 14, 26, TWILIGHT); p.rect(2, 1, 12, 24, MIST);
    p.vline(8, 1, 24, TWILIGHT);
    for (const y of [3, 5, 7]) { p.hline(3, 6, y, TWILIGHT); p.hline(10, 13, y, TWILIGHT); }
    p.px(6, 13, LANTERN); p.px(10, 13, LANTERN);
    p.rect(3, 15, 4, 3, AMBER); p.px(4, 16, LANTERN); // a hung headlamp
  }, true);
}

function timberRack(): Canv {
  return art(16, 20, (p) => {
    p.vline(2, 2, 19, RUST); p.vline(13, 2, 19, RUST);
    for (const y of [5, 10, 15]) { p.rect(0, y, 16, 3, AMBER); p.hline(0, 15, y, LANTERN); p.px(0, y + 1, MOSS); p.px(15, y + 2, RUST); }
  }, true);
}

function oreCart(): Canv {
  return art(16, 16, (p) => {
    p.rect(2, 5, 12, 7, RUST); p.hline(2, 13, 5, AMBER); p.rect(3, 6, 10, 2, VOID);
    for (const x of [4, 7, 10]) p.px(x, 5, SHADOW);
    p.ellipse(5, 13, 2, 2, SHADOW); p.ellipse(11, 13, 2, 2, SHADOW); p.px(5, 13, MIST); p.px(11, 13, MIST);
  }, true);
}

function brattice(f: number): Canv {
  return art(16, 22, (p) => {
    p.hline(0, 15, 0, RUST);
    for (let x = 1; x < 15; x++) { const sway = Math.round(Math.sin(x * 0.7 + f * 1.4)); p.vline(x, 1, 21 + sway, x % 3 ? SHADOW : TWILIGHT); }
  }, true);
}

function firstAid(): Canv {
  return art(16, 16, (p) => {
    p.rect(2, 4, 12, 10, FOG); p.rect(3, 5, 10, 8, MOON); p.hline(2, 13, 4, MIST);
    p.rect(7, 6, 2, 6, RED); p.rect(5, 8, 6, 2, RED);
  }, true);
}

function cupboard(): Canv {
  return art(16, 22, (p) => {
    p.rect(1, 0, 14, 22, RUST); p.rect(2, 1, 12, 9, CRAN); p.rect(2, 12, 12, 9, CRAN);
    p.rect(4, 3, 8, 5, AMBER); p.px(6, 4, LANTERN); p.px(9, 5, LANTERN); // biscuits in a tin
    p.px(7, 15, LANTERN); p.px(8, 15, LANTERN);
  }, true);
}

/** A pitch torch on an iron stake, spitting. */
function torch(f: number): Canv {
  return art(16, 22, (p) => {
    p.vline(7, 9, 21, SHADOW); p.vline(8, 9, 21, TWILIGHT); p.hline(5, 10, 21, SHADOW);
    p.rect(6, 7, 4, 3, RUST); p.hline(6, 9, 8, AMBER);
    p.rect(6, 3 - f, 4, 4 + f, RED); p.rect(7, 2 - f, 2, 4, AMBER); p.px(7 + f, 1 - f, LANTERN); p.px(8, 4, LANTERN);
    p.px(5 + f * 5, 2, AMBER);
  }, true);
}

/* ---------------- figures ---------------- */

/** Coal-Chewer: a husk with an ember throat, jaw working. */
function chewer(f: number): Canv {
  return art(16, 24, (p) => {
    p.rect(5, 2, 6, 6, VOID); p.px(6, 4, SHADOW); p.px(9, 4, SHADOW);
    p.rect(6, 6 + f, 4, 2, SHADOW); p.px(7, 7 + f, VOID);             // working jaw
    p.rect(6, 8, 4, 3, RED); p.px(7, 9, LANTERN); p.px(8, 9, AMBER);  // ember throat
    p.rect(4, 10, 8, 8, VOID); p.vline(6, 11, 17, SHADOW);
    p.rect(2, 10, 2, 7 - f, VOID); p.rect(12, 10, 2, 6 + f, VOID);    // hanging arms
    p.rect(5, 18, 2, 6, VOID); p.rect(9, 18, 2, 6, VOID);
    p.px(3, 16 - f, SHADOW); p.px(12, 15 + f, TWILIGHT);              // a lump of coal in one hand
  }, true);
}

/** The Foreman: too tall for the drift, slag-crusted, dragging a tally chain, whistle at his lips. */
function foreman(f: number): Canv {
  return art(24, 34, (p) => {
    p.rect(8, 0, 8, 3, SHADOW); p.hline(6, 17, 2, SHADOW);              // foreman's bowler
    p.rect(8, 3, 8, 7, VOID); p.px(10, 5, RED); p.px(13, 5, RED);      // ember eyes
    p.rect(12, 7, 4, 1, AMBER); p.px(16, 7, LANTERN);                  // brass whistle
    p.rect(5, 10, 14, 13, VOID);
    for (const [x, y] of [[7, 12], [15, 14], [9, 18], [13, 20], [17, 11]]) { p.px(x, y, CRAN); p.px(x + 1, y, RED); } // slag embers
    p.rect(2, 11, 3, 11 + f, VOID); p.rect(19, 11, 3, 10 - f, VOID);
    p.rect(7, 23, 4, 11, VOID); p.rect(13, 23, 4, 11, VOID);
    for (let k = 0; k < 6; k++) p.px(3 + (k % 2), 22 + f + k * 2, MIST); // the tally chain
    p.px(9, 30, SHADOW); p.px(15, 29, SHADOW);
  }, true);
}

/** The Foreman as a shape in the dark: solid shadow, no detail. */
function foremanShape(): Canv {
  return art(24, 34, (p) => {
    p.rect(8, 0, 8, 3, SHADOW); p.hline(6, 17, 2, SHADOW); p.rect(8, 3, 8, 7, SHADOW);
    p.rect(5, 10, 14, 13, SHADOW); p.rect(2, 11, 3, 11, SHADOW); p.rect(19, 11, 3, 10, SHADOW);
    p.rect(7, 23, 4, 11, SHADOW); p.rect(13, 23, 4, 11, SHADOW);
  });
}

/** A crosscut spirit: faint, seated, waiting for the whistle. */
function spirit(f: number): Canv {
  return art(16, 22, (p) => {
    p.rect(6, 2 + f, 5, 5, MOON); p.px(7, 4 + f, TWILIGHT); p.px(9, 4 + f, TWILIGHT);
    p.rect(5, 7 + f, 7, 7, MIST); p.rect(4, 14, 9, 4, MIST); p.hline(4, 12, 18, TWILIGHT);
    p.px(6, 1 + f, AMBER); // a lamp on his cap
  });
}

function tagGlint(f: number): Canv {
  return art(16, 16, (p) => {
    p.ellipse(8, 11, 3, 3, AMBER); p.ellipse(8, 11, 2, 2, LANTERN); p.px(8, 11, VOID);
    if (f) { p.px(11, 7, FOG); p.px(12, 6, FOG); p.px(10, 6, LANTERN); }
  }, true);
}

/* ---------------- HUD & icons ---------------- */

function hudLamp(open: boolean, lit: boolean): Canv {
  return art(12, 12, (p) => {
    p.rect(3, 3, 6, 7, AMBER); p.rect(4, 4, 4, 5, RUST); p.rect(4, 10, 4, 1, SHADOW);
    p.ellipse(6, 5, 2, 2, lit ? (open ? LANTERN : FERN) : SHADOW);
    if (!open) p.rect(3, 2, 6, 3, SHADOW); // the shutter hood
    if (lit && open) { p.px(10, 4, LANTERN); p.px(11, 3, LANTERN); p.px(10, 6, AMBER); }
  });
}
function hudCanary(singing: boolean): Canv {
  return art(12, 12, (p) => {
    p.ellipse(6, 1, 3, 1, MIST);
    for (const x of [2, 5, 8, 10]) p.vline(x, 1, 10, MIST);
    p.hline(1, 10, 10, MIST);
    if (singing) { p.ellipse(6, 6, 2, 2, LANTERN); p.px(8, 5, AMBER); p.px(5, 5, VOID); p.px(10, 3, LANTERN); }
    else { p.rect(4, 8, 4, 2, LANTERN); p.px(4, 8, VOID); } // fallen silent on the floor of the cage
  });
}
function hudBar(): Canv {
  return art(12, 12, (p) => { p.line(2, 10, 10, 2, MIST); p.line(2, 11, 10, 3, TWILIGHT); p.rect(9, 1, 2, 2, FOG); });
}
function hudSafety(state: 'clear' | 'fire' | 'choke'): Canv {
  return art(12, 12, (p) => {
    p.rect(3, 9, 6, 2, AMBER); p.rect(4, 3, 4, 6, MIST); p.hline(3, 8, 2, AMBER);
    for (const y of [4, 6, 8]) p.hline(4, 7, y, TWILIGHT);
    const flame = state === 'fire' ? FERN : state === 'choke' ? SHADOW : LANTERN;
    p.px(5, 5, flame); p.px(6, 5, flame); p.px(6, 4, state === 'fire' ? MIST : AMBER);
  });
}
function hudBox(): Canv {
  return art(12, 12, (p) => { p.rect(2, 4, 8, 7, RUST); p.hline(2, 9, 4, AMBER); p.vline(6, 1, 4, MIST); p.hline(4, 8, 1, MIST); p.px(9, 6, RED); });
}

export function bakeMine(): void {
  MG.floor = [coalFloor(901), coalFloor(902), coalFloor(903)];
  MG.ribTop = [ribTop(911), ribTop(912)];
  MG.ribFace = [ribFace(921), ribFace(922), ribFace(923), ribFace(924), ribFace(925), ribFace(926)];
  MG.railH = [mineRail(true)]; MG.railV = [mineRail(false)];
  MG.alcove = [alcove()];
  MG.gob = [gob(931), gob(932)];
  MG.lampFloor = [lampFloor(941), lampFloor(942)];
  MO.calcified = [calcified(0), calcified(1)];
  MO.hemlock = [hemlockProp()];
  MO.post = [post()];
  MO.rubble = [rubble(951), rubble(952), rubble(953)];
  MO.bucket = [bucket()];
  MO.chalk = [chalk()];
  MO.page = [page()];
  MO.seep = [seep(0), seep(1)];
  MO.carbide = [carbideTin()];
  MO.crib = [crib(false), crib(true)];
  MO.lift = [liftCage()];
  MO.board = [board()];
  MO.locker = [locker()];
  MO.rack = [timberRack()];
  MO.cart = [oreCart()];
  MO.brattice = [brattice(0), brattice(1)];
  MO.firstAid = [firstAid()];
  MO.cupboard = [cupboard()];
  MO.torch = [torch(0), torch(1)];
  MG.crawlH = [crawlTile(true)]; MG.crawlV = [crawlTile(false)];
  MG.puddle = [puddle(961), puddle(962), puddle(963)];
  MO.seam = [seam(0), seam(1)];
  MO.rideCart = [rideCart()];
  MO.canaryCage = [canaryCage(0), canaryCage(1)];
  MO.fungus = [fungus(0), fungus(1)];
  MO.foremanShape = [foremanShape()];
  MO.chewer = [chewer(0), chewer(1)];
  MO.foreman = [foreman(0), foreman(1)];
  MO.spirit = [spirit(0), spirit(1)];
  MO.tag = [tagGlint(0), tagGlint(1)];
  for (const open of [true, false]) for (const lit of [true, false]) MHUD[`lamp_${open ? 'open' : 'shut'}_${lit ? 'lit' : 'out'}`] = hudLamp(open, lit);
  MHUD.canary = hudCanary(true); MHUD.canaryQuiet = hudCanary(false);
  MHUD.bar = hudBar(); MHUD.box = hudBox();
  for (const s of ['clear', 'fire', 'choke'] as const) MHUD[`safety_${s}`] = hudSafety(s);
  // Item icons.
  ICON.carbide_pellets = art(16, 16, (p) => { for (const [x, y] of [[5, 9], [9, 8], [7, 11], [10, 11], [6, 6]]) { p.ellipse(x, y, 2, 1.6, TWILIGHT); p.px(x - 1, y - 1, MIST); } }, true);
  ICON.seep_water = art(16, 16, (p) => { p.rect(5, 4, 6, 10, MIST); p.rect(6, 6, 4, 7, TWILIGHT); p.hline(6, 9, 6, FOG); p.rect(6, 2, 4, 2, RUST); }, true);
  ICON.hemlock_prop = art(16, 16, (p) => { p.line(3, 13, 12, 2, AMBER); p.line(4, 13, 13, 2, RUST); p.px(12, 2, LANTERN); p.px(6, 10, MOSS); }, true);
  ICON.pitch_torch = art(16, 16, (p) => { p.line(4, 14, 9, 6, SHADOW); p.line(5, 14, 10, 6, TWILIGHT); p.rect(9, 4, 3, 3, RUST); p.rect(9, 1, 3, 3, RED); p.px(10, 1, AMBER); p.px(10, 0, LANTERN); }, true);
  ICON.coal_lump = art(16, 16, (p) => { p.ellipse(8, 9, 5, 4, VOID); p.ellipse(7, 8, 3, 2.5, SHADOW); p.px(6, 7, MIST); p.px(10, 10, TWILIGHT); }, true);
  ICON.brass_button = art(16, 16, (p) => { p.ellipse(8, 8, 5, 5, AMBER); p.ellipse(8, 8, 3.5, 3.5, LANTERN); for (const [x, y] of [[7, 7], [9, 7], [7, 9], [9, 9]]) p.px(x, y, RUST); }, true);
  ICON.bird_seed = art(16, 16, (p) => { p.rect(4, 5, 8, 9, FOG); p.hline(4, 11, 5, MIST); p.rect(5, 2, 6, 3, AMBER); for (const [x, y] of [[6, 8], [9, 9], [7, 11], [10, 12], [5, 12]]) p.px(x, y, AMBER); }, true);
  ICON.club_badge = art(16, 16, (p) => { p.ellipse(8, 8, 6, 6, RED); p.ellipse(8, 8, 4.5, 4.5, LANTERN); p.rect(6, 6, 5, 4, VOID); p.px(7, 7, LANTERN); p.px(9, 7, LANTERN); }, true);
  ICON.blind_cavefish = art(16, 16, (p) => { p.ellipse(8, 8, 6, 2.6, MOON); p.hline(4, 11, 10, FOG); p.rect(1, 6, 2, 5, FOG); p.px(8, 5, MIST); }, true);
  ICON.cave_crayfish = art(16, 16, (p) => { p.ellipse(8, 9, 4, 2, FOG); p.rect(2, 7, 3, 2, MOON); p.rect(11, 7, 3, 2, MOON); p.px(4, 6, MIST); p.px(12, 6, MIST); for (let x = 5; x < 12; x += 2) p.px(x, 11, MIST); }, true);
  ICON.miner_biscuit = art(16, 16, (p) => { p.ellipse(8, 9, 5, 3.5, AMBER); p.ellipse(8, 8, 4, 2.5, LANTERN); p.px(6, 8, RUST); p.px(10, 9, RUST); }, true);
  ICON.black_powder = art(16, 16, (p) => { p.rect(4, 4, 8, 9, FOG); p.rect(5, 5, 6, 7, MOON); p.hline(5, 10, 8, VOID); p.line(12, 6, 15, 2, AMBER); }, true);
  ICON.blasting_box = art(16, 16, (p) => { p.rect(3, 7, 10, 7, RUST); p.hline(3, 12, 7, AMBER); p.vline(8, 2, 7, MIST); p.hline(5, 11, 2, MIST); p.px(11, 9, RED); }, true);
  ICON.mine_ledger = art(16, 16, (p) => { p.rect(3, 3, 10, 11, VOID); p.rect(4, 4, 8, 9, CRAN); p.rect(5, 5, 6, 7, LANTERN); for (const y of [7, 9]) p.hline(6, 9, y, SHADOW); }, true);
}
