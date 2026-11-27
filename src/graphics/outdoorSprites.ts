/**
 * Fishing, trapping, hunting & cooking art: item icons, the snare object,
 * the overworld deer, and the fishing bobber. All procedural.
 */
import { makeCanvas, Pen, outline, flipH, Canv } from './canvas';
import { P } from './palette';
import { ICON, OBJ, MISC } from './sprites';

const { VOID, SHADOW, PINE, FOREST, MOSS, FERN, FOG, LANTERN, AMBER, RUST, CRAN, RED, TWILIGHT, MIST, MOON } = P;

function icon(draw: (p: Pen) => void, line = true): Canv {
  const { c, g } = makeCanvas(16, 16);
  draw(new Pen(g));
  return line ? outline(c) : c;
}

/** Side-view fish facing right. */
function fish(body: number, belly: number, fin: number, spots: number | null, len = 12): Canv {
  return icon((p) => {
    const x0 = 8 - len / 2;
    p.ellipse(8, 8, len / 2 - 1, 2.6, body);
    p.hline(x0 + 2, x0 + len - 3, 10, belly);
    p.rect(x0 - 1, 6, 2, 5, fin); p.px(x0 - 2, 5, fin); p.px(x0 - 2, 11, fin); // tail
    p.px(8, 5, fin); p.px(9, 5, fin); // dorsal
    p.px(x0 + len - 3, 7, VOID); // eye
    if (spots !== null) for (const [x, y] of [[6, 7], [8, 8], [10, 7], [5, 9]]) p.px(x, y, spots);
  });
}

/** A bowl of something with steam. */
function bowl(food: number, bits: number[], steam = true): Canv {
  return icon((p) => {
    if (steam) { p.px(6, 2, FOG); p.px(7, 1, FOG); p.px(10, 2, FOG); p.px(9, 1, FOG); }
    p.ellipse(8, 8, 6, 2, food);
    bits.forEach((c, i) => p.px(4 + i * 3, 8 - (i % 2), c));
    p.rect(3, 9, 11, 3, RUST); p.rect(4, 12, 9, 1, CRAN); p.hline(3, 13, 9, AMBER);
  });
}

/** Food on a plate. */
function plate(draw: (p: Pen) => void): Canv {
  return icon((p) => {
    p.ellipse(8, 11, 7, 2.5, FOG); p.ellipse(8, 11, 5, 1.5, MOON);
    draw(p);
  });
}

function snareObj(caught: boolean): Canv {
  const { c, g } = makeCanvas(16, 16);
  const p = new Pen(g);
  p.vline(4, 5, 13, RUST); p.px(4, 4, AMBER); // stake
  for (let a = 0; a < Math.PI * 2; a += 0.35) p.px(Math.round(9 + Math.cos(a) * 3.5), Math.round(11 + Math.sin(a) * 2), MIST); // wire loop
  p.line(4, 6, 8, 9, MIST);
  if (caught) { p.ellipse(10, 11, 3.5, 2.2, AMBER); p.px(12, 9, AMBER); p.px(13, 9, AMBER); p.px(7, 11, FOG); p.px(12, 10, VOID); }
  return outline(c);
}

/** Overworld white-tailed deer (facing right), 24x20, two frames. */
function deer(frame: number, buck: boolean, grazing: boolean): Canv {
  const { c, g } = makeCanvas(24, 20);
  const p = new Pen(g);
  const legs = frame ? [[7, 14], [9, 15], [15, 14], [17, 15]] : [[7, 15], [9, 14], [15, 15], [17, 14]];
  for (const [x, y] of legs) p.rect(x, 12, 1, y - 11, RUST);
  p.ellipse(12, 10, 6, 3, AMBER); p.hline(8, 16, 12, LANTERN);
  p.rect(5, 8, 2, 3, FOG); // white tail
  const hx = grazing ? 18 : 18, hy = grazing ? 13 : 5;
  p.line(16, 9, hx, hy + 1, AMBER); p.line(17, 9, hx + 1, hy + 1, AMBER); // neck
  p.ellipse(hx + 1, hy, 2, 1.6, AMBER); p.px(hx + 3, hy + 1, VOID); p.px(hx + 1, hy - 1, VOID);
  p.px(hx, hy - 2, RUST); // ear
  if (buck) { p.line(hx, hy - 2, hx - 2, hy - 5, LANTERN); p.px(hx - 3, hy - 4, LANTERN); p.line(hx + 1, hy - 2, hx + 2, hy - 5, LANTERN); p.px(hx + 3, hy - 4, LANTERN); }
  return outline(c);
}

/** Barney's rail handcar (top-down on a vertical spur). Broken = tipped, rusted. */
function handcarObj(broken: boolean): Canv {
  const { c, g } = makeCanvas(16, 16);
  const p = new Pen(g);
  if (broken) {
    p.rect(3, 6, 9, 6, RUST); p.line(3, 6, 12, 11, CRAN); p.px(5, 8, AMBER); p.px(9, 10, AMBER);
    p.rect(2, 12, 3, 2, SHADOW); p.rect(11, 3, 3, 2, SHADOW); // loose wheels
    p.line(6, 4, 9, 2, RUST);
    return outline(c);
  }
  p.rect(3, 4, 10, 9, AMBER); p.hline(3, 12, 4, LANTERN); p.vline(3, 4, 12, RUST); p.vline(12, 4, 12, RUST);
  for (const y of [7, 10]) p.hline(4, 11, y, RUST); // deck boards
  for (const [x, y] of [[2, 4], [13, 4], [2, 11], [13, 11]]) p.rect(x, y, 1, 2, SHADOW); // wheels
  p.rect(7, 2, 2, 3, SHADOW); p.hline(4, 11, 1, MIST); // pump handle
  return outline(c);
}

/** A stretch of the abandoned spur: rusted rails, rotten ties, grass growing through. */
function oldRail(vertical: boolean, seed: number): Canv {
  const { c, g } = makeCanvas(16, 16);
  const p = new Pen(g);
  let a = seed;
  const r = () => { a = (a * 9301 + 49297) % 233280; return a / 233280; };
  for (let k = 0; k < 4; k++) { // ties, some missing
    if (r() < 0.2) continue;
    const o = 1 + k * 4;
    if (vertical) p.rect(3, o, 10, 2, r() < 0.5 ? RUST : CRAN); else p.rect(o, 3, 2, 10, r() < 0.5 ? RUST : CRAN);
  }
  for (const rail of [5, 10]) for (let t = 0; t < 16; t++) { // rails, rusted and broken in places
    if (r() < 0.12) continue;
    const col = r() < 0.3 ? RUST : r() < 0.5 ? SHADOW : MIST;
    if (vertical) p.px(rail, t, col); else p.px(t, rail, col);
  }
  for (let k = 0; k < 7; k++) { // grass tufts over the line
    const x = Math.floor(r() * 16), y = Math.floor(r() * 16);
    p.px(x, y, FERN); p.px(x, Math.max(0, y - 1), MOSS);
  }
  return c;
}

/**
 * A curved corner of old track joining the top edge to the right edge (the other three
 * corners are mirrors of it). Rails follow quarter-circles that meet the straight pieces'
 * rails (5 and 10 px in from the edge); ties fan out along the curve.
 */
function oldRailCorner(flipX: boolean, flipY: boolean, seed: number): Canv {
  const { c, g } = makeCanvas(16, 16);
  const p = new Pen(g);
  let a = seed;
  const r = () => { a = (a * 9301 + 49297) % 233280; return a / 233280; };
  const put = (x: number, y: number, col: number) => {
    if (x < 0 || y < 0 || x > 15 || y > 15) return;
    p.px(flipX ? 15 - x : x, flipY ? 15 - y : y, col);
  };
  // Centre of the curve: the top-right corner of the tile.
  const cx = 15.5, cy = -0.5;
  // Ties: chunky radial planks fanning around the bend (a couple rotted away).
  for (let k = 0; k < 4; k++) {
    if (r() < 0.15) continue;
    const ang = Math.PI / 2 + (k + 0.5) * (Math.PI / 2 / 4); // from pointing down to pointing left
    const col = r() < 0.6 ? RUST : CRAN;
    for (let rad = 3.5; rad <= 12.5; rad += 0.5) {
      const x = cx + Math.cos(ang) * rad, y = cy + Math.sin(ang) * rad;
      put(Math.round(x), Math.round(y), col);
      put(Math.round(x + Math.sin(ang)), Math.round(y - Math.cos(ang)), col); // 2px wide
    }
  }
  // Rails: two solid quarter-circles (light top, dark underside), rust in places.
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const d = Math.hypot(x - cx, y - cy);
    for (const rad of [5.5, 10.5]) {
      const e = d - rad;
      if (Math.abs(e) < 0.5) put(x, y, r() < 0.15 ? RUST : MIST);
      else if (e >= 0.5 && e < 1.2) put(x, y, SHADOW);
    }
  }
  for (let k = 0; k < 4; k++) { const x = Math.floor(r() * 16), y = Math.floor(r() * 16); if (Math.abs(Math.hypot(x - cx, y - cy) - 8) > 4) { put(x, y, FERN); put(x, Math.max(0, y - 1), MOSS); } }
  return c;
}

/** A weathered timber trestle carrying the line over water (purely visual; the water stays unwalkable). */
function trestle(vertical: boolean): Canv {
  const { c, g } = makeCanvas(16, 16);
  const p = new Pen(g);
  const put = (a: number, b: number, col: number) => (vertical ? p.px(a, b, col) : p.px(b, a, col));
  for (let t = 0; t < 16; t++) {
    for (const a of [2, 13]) put(a, t, SHADOW);            // stringers
    for (const a of [3, 12]) put(a, t, RUST);
    if (t % 3 === 0) for (let a = 2; a <= 13; a++) put(a, t, a % 5 === 0 ? CRAN : AMBER); // ties
    put(5, t, t % 7 === 3 ? RUST : MIST); put(10, t, t % 9 === 5 ? RUST : MIST);          // rails
  }
  for (const b of [1, 9]) { put(1, b, SHADOW); put(14, b, SHADOW); put(1, b + 1, SHADOW); put(14, b + 1, SHADOW); } // pilings
  return c;
}

function stopSign(): Canv {
  const { c, g } = makeCanvas(16, 16);
  const p = new Pen(g);
  p.vline(8, 7, 15, RUST);
  // Black-on-yellow railroad pictogram: a little steam locomotive.
  p.rect(1, 0, 15, 8, AMBER); p.rect(2, 1, 13, 6, LANTERN);
  p.vline(4, 1, 3, SHADOW);                       // smokestack
  p.px(7, 3, SHADOW);                             // dome
  p.rect(3, 4, 8, 2, SHADOW);                     // boiler
  p.rect(10, 2, 4, 4, SHADOW); p.px(11, 3, LANTERN); // cab + window
  p.px(2, 5, SHADOW);                             // cowcatcher
  for (const x of [4, 6, 9, 12]) p.px(x, 6, SHADOW); // drivers
  return outline(c);
}

export function bakeOutdoors(): void {
  // ---- Pass B: timber, the lucky clover and townsfolk keepsakes ----
  ICON.timber = icon((p) => { for (const y of [5, 8, 11]) { p.rect(2, y, 12, 3, AMBER); p.hline(2, 13, y, LANTERN); p.px(4, y + 1, RUST); p.px(10, y + 2, RUST); } });
  ICON.lucky_clover = icon((p) => { for (const [x, y] of [[6, 5], [10, 5], [6, 9], [10, 9]]) { p.rect(x - 2, y - 2, 4, 4, MOSS); p.px(x - 1, y - 1, FERN); } p.line(8, 9, 9, 15, FOREST); p.px(8, 7, LANTERN); });
  ICON.winterberry = icon((p) => { p.line(4, 14, 9, 3, RUST); p.line(7, 9, 12, 5, RUST); for (const [x, y] of [[8, 4], [10, 4], [11, 6], [6, 8], [9, 7], [12, 4]]) { p.px(x, y, RED); p.px(x, y - 1, CRAN); } });
  ICON.chaga = icon((p) => { p.ellipse(8, 9, 5, 4, VOID); p.ellipse(8, 8, 4, 3, SHADOW); for (const [x, y] of [[6, 7], [9, 9], [10, 6]]) p.px(x, y, AMBER); p.rect(3, 12, 10, 2, FOG); });
  ICON.jay_feather = icon((p) => { p.line(4, 14, 11, 2, SHADOW); for (let k = 0; k < 9; k++) { const x = 5 + Math.round(k * 0.7), y = 12 - Math.round(k * 1.2); p.rect(x, y, 3, 1, k % 2 ? TWILIGHT : MIST); } p.px(10, 3, FOG); });
  ICON.ramp_skillet = plate((p) => { p.ellipse(8, 9, 5, 2.5, AMBER); for (const [x, y] of [[5, 8], [8, 9], [11, 8]]) p.px(x, y, LANTERN); for (const [x, y] of [[6, 9], [9, 8], [10, 10]]) p.px(x, y, MOSS); p.px(7, 7, FERN); });
  ICON.apple_butter = icon((p) => { p.rect(5, 6, 7, 8, FOG); p.rect(6, 8, 5, 5, CRAN); p.hline(6, 10, 8, RUST); p.rect(5, 4, 7, 2, AMBER); p.hline(5, 11, 4, LANTERN); p.px(10, 9, RED); });
  ICON.buckwheat_cakes = plate((p) => { for (let k = 0; k < 3; k++) p.ellipse(7, 10 - k * 2, 4, 1.6, k % 2 ? RUST : AMBER); p.ellipse(12, 10, 2, 1.4, CRAN); p.px(7, 5, LANTERN); });
  ICON.hot_cider = icon((p) => { p.rect(4, 6, 7, 8, MIST); p.rect(5, 7, 5, 6, AMBER); p.hline(5, 9, 7, LANTERN); p.rect(11, 8, 2, 4, MIST); for (const [x, y] of [[6, 3], [8, 2], [7, 4]]) p.px(x, y, FOG); });
  ICON.radio_key = icon((p) => { p.rect(3, 10, 10, 3, RUST); p.hline(3, 12, 10, AMBER); p.line(6, 10, 11, 5, AMBER); p.rect(10, 3, 3, 3, SHADOW); p.px(11, 4, LANTERN); });
  ICON.conductor_whistle = icon((p) => { p.rect(3, 7, 9, 4, AMBER); p.hline(3, 11, 7, LANTERN); p.rect(11, 6, 3, 6, RUST); p.px(5, 9, SHADOW); p.line(2, 9, 0, 7, MIST); });
  ICON.lamphouse_key = icon((p) => { p.ellipse(5, 6, 3, 3, AMBER); p.px(5, 6, VOID); p.line(7, 8, 13, 14, AMBER); p.hline(11, 13, 12, AMBER); p.px(12, 14, AMBER); });
  ICON.binocular_strap = icon((p) => { p.rect(3, 6, 4, 6, SHADOW); p.rect(9, 6, 4, 6, SHADOW); p.px(4, 7, MIST); p.px(10, 7, MIST); p.hline(6, 9, 8, SHADOW); p.line(3, 5, 8, 1, RUST); p.line(13, 5, 8, 1, RUST); });
  ICON.handcar_crank = icon((p) => { p.line(3, 13, 11, 5, RUST); p.rect(10, 3, 4, 3, SHADOW); p.rect(2, 12, 3, 3, AMBER); p.rect(9, 9, 5, 4, FOG); p.hline(10, 12, 10, SHADOW); });
  // ---- tools & ammo ----
  ICON.fishing_rod = icon((p) => { p.line(3, 14, 13, 2, RUST); p.line(4, 14, 14, 2, AMBER); p.rect(3, 11, 2, 2, SHADOW); p.line(14, 2, 14, 9, FOG); p.px(14, 10, RED); });
  ICON.hunting_bow = icon((p) => { for (let y = 2; y <= 14; y++) p.px(Math.round(5 + Math.sin(((y - 2) / 12) * Math.PI) * 5), y, RUST); p.vline(5, 2, 14, FOG); p.rect(8, 7, 3, 3, AMBER); });
  ICON.deer_rifle = icon((p) => { p.line(2, 12, 14, 4, SHADOW); p.line(2, 13, 9, 9, RUST); p.rect(2, 11, 4, 3, RUST); p.px(9, 9, PINE); p.px(10, 8, MIST); });
  ICON.arrow = icon((p) => { p.line(3, 13, 12, 4, AMBER); p.px(13, 3, MIST); p.px(12, 3, MIST); p.px(13, 4, MIST); p.px(3, 12, RED); p.px(2, 13, RED); p.px(4, 14, RED); });
  ICON.rifle_cartridge = icon((p) => { p.rect(6, 6, 4, 8, AMBER); p.rect(7, 3, 2, 3, RUST); p.hline(6, 9, 12, LANTERN); });
  ICON.snare = icon((p) => { p.vline(4, 3, 14, RUST); for (let a = 0; a < Math.PI * 2; a += 0.4) p.px(Math.round(10 + Math.cos(a) * 3.5), Math.round(9 + Math.sin(a) * 3.5), MIST); p.line(4, 4, 8, 7, MIST); });
  // ---- game & fish ----
  ICON.raw_venison = icon((p) => { p.ellipse(8, 9, 5, 4, CRAN); p.ellipse(7, 8, 3, 2, RED); p.px(10, 7, FOG); p.px(11, 8, FOG); });
  ICON.deer_hide = icon((p) => { p.rect(3, 4, 10, 9, AMBER); p.px(2, 4, AMBER); p.px(13, 12, AMBER); p.px(2, 12, AMBER); p.px(13, 4, AMBER); for (const [x, y] of [[5, 6], [9, 9], [11, 5]]) p.px(x, y, LANTERN); });
  ICON.whitetail_antler = icon((p) => { p.line(4, 14, 8, 4, LANTERN); p.line(6, 9, 11, 6, LANTERN); p.line(7, 6, 12, 2, LANTERN); p.line(5, 12, 2, 8, LANTERN); });
  ICON.cottontail = icon((p) => { p.ellipse(8, 10, 5, 3, AMBER); p.ellipse(12, 8, 2, 2, AMBER); p.rect(12, 4, 1, 3, AMBER); p.px(13, 8, VOID); p.ellipse(3, 9, 1.4, 1.4, FOG); });
  ICON.squirrel = icon((p) => { p.ellipse(8, 10, 3.5, 3, MIST); p.ellipse(4, 6, 2.5, 4.5, TWILIGHT); p.ellipse(11, 7, 2, 2, MIST); p.px(12, 7, VOID); p.px(11, 5, MIST); });
  ICON.grouse = icon((p) => { p.ellipse(8, 9, 5, 3.5, RUST); p.ellipse(12, 6, 2, 2, RUST); p.px(13, 6, VOID); p.px(14, 7, AMBER); for (const x of [2, 3, 4]) p.vline(x, 7, 11, SHADOW); p.hline(5, 11, 11, AMBER); });
  ICON.brook_trout = fish(FOREST, AMBER, RED, LANTERN);
  ICON.creek_chub = fish(MIST, FOG, TWILIGHT, null, 10);
  ICON.smallmouth_bass = fish(AMBER, LANTERN, RUST, RUST);
  ICON.channel_catfish = fish(TWILIGHT, FOG, SHADOW, null);
  ICON.muskie = fish(MOSS, FERN, FOREST, PINE, 14);
  // ---- cooking ----
  ICON.venison_stew = bowl(RUST, [CRAN, FERN, LANTERN, CRAN]);
  ICON.squirrel_dumplings = bowl(LANTERN, [FOG, AMBER, FOG, FERN]);
  ICON.fried_trout = plate((p) => { p.ellipse(8, 9, 5, 2, AMBER); p.px(3, 9, RUST); p.px(12, 8, VOID); p.px(10, 8, LANTERN); p.px(6, 8, LANTERN); });
  ICON.rabbit_pot_pie = icon((p) => { p.ellipse(8, 8, 6, 3, AMBER); p.ellipse(8, 7, 5, 2, LANTERN); p.px(6, 6, RUST); p.px(10, 7, RUST); p.rect(3, 9, 11, 3, RUST); p.hline(3, 13, 9, CRAN); p.px(7, 4, FOG); p.px(9, 3, FOG); });
  ICON.catfish_hushpuppies = plate((p) => { p.ellipse(6, 9, 3.5, 1.6, AMBER); for (const [x, y] of [[10, 8], [12, 9], [11, 10]]) p.ellipse(x, y, 1.3, 1.3, RUST); p.px(9, 9, LANTERN); });
  ICON.grouse_apples = plate((p) => { p.ellipse(7, 8, 4, 2.4, RUST); p.ellipse(6, 7, 2, 1, AMBER); p.ellipse(12, 9, 1.6, 1.6, LANTERN); p.px(12, 7, FOREST); });
  ICON.pawpaw_bread = icon((p) => { p.rect(3, 7, 10, 6, AMBER); p.ellipse(8, 7, 5, 2.5, AMBER); p.hline(4, 12, 6, LANTERN); p.px(6, 9, FERN); p.px(10, 10, FERN); p.hline(3, 12, 13, RUST); });
  ICON.rabbit_haunch = icon((p) => { p.ellipse(9, 8, 4, 3, RUST); p.ellipse(8, 7, 2, 1.5, AMBER); p.line(4, 12, 6, 10, FOG); p.px(3, 13, FOG); p.px(4, 13, FOG); });

  OBJ.snare = [snareObj(false), snareObj(true)];
  OBJ.handcar = [handcarObj(false), handcarObj(true)];
  OBJ.stopsign = [stopSign()];
  MISC.oldRailH0 = oldRail(false, 11); MISC.oldRailH1 = oldRail(false, 29);
  MISC.oldRailV0 = oldRail(true, 47); MISC.oldRailV1 = oldRail(true, 83);
  MISC.trestleH = trestle(false); MISC.trestleV = trestle(true);
  // Corners by the two directions they join: NE, NW, SE, SW.
  MISC.oldRailNE = oldRailCorner(false, false, 101); MISC.oldRailNW = oldRailCorner(true, false, 113);
  MISC.oldRailSE = oldRailCorner(false, true, 127); MISC.oldRailSW = oldRailCorner(true, true, 139);
  for (const buck of [false, true]) for (const grazing of [false, true]) for (const f of [0, 1]) {
    const right = deer(f, buck, grazing);
    MISC[deerKey(buck, false, grazing, f)] = right;
    MISC[deerKey(buck, true, grazing, f)] = flipH(right);
  }
  // Fishing bobber (2 frames) for the cast line.
  MISC.bobber0 = icon((p) => { p.ellipse(8, 9, 2, 2, FOG); p.rect(6, 7, 5, 2, RED); p.vline(8, 4, 6, SHADOW); }, false);
  MISC.bobber1 = icon((p) => { p.ellipse(8, 10, 2, 1.5, FOG); p.rect(6, 8, 5, 2, RED); p.vline(8, 5, 7, SHADOW); p.px(4, 11, MIST); p.px(12, 11, MIST); }, false);
}

/** MISC key of a baked deer frame. */
export function deerKey(buck: boolean, left: boolean, grazing: boolean, frame: number): string {
  return `deer_${buck ? 'buck' : 'doe'}_${left ? 'l' : 'r'}_${grazing ? 'graze' : 'walk'}${frame}`;
}
