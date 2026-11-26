/** Phase 3 art: town tiles & props, building facades, interiors, Buster, tracks, festival decor, food icons. */
import { makeCanvas, Pen, outline, fromArt, flipH, Canv } from './canvas';
import { P } from './palette';
import { mulberry32 } from '../util';
import { GROUND, OBJ, STRUCT, ICON, MISC, tile, plankTile } from './sprites';

/* ---------------- ground ---------------- */

function cobble(seed: number): Canv {
  const { c, p, r } = tile(P.MIST, [[P.TWILIGHT, 0.04]], seed);
  for (let row = 0; row < 4; row++) {
    const off = row % 2 ? 2 : 0;
    for (let x = -off; x < 16; x += 4) {
      p.hline(x, x + 3, row * 4, P.TWILIGHT);
      p.vline(x, row * 4, row * 4 + 3, P.TWILIGHT);
      if (r() < 0.5) p.px(x + 1, row * 4 + 1, P.FOG);
    }
  }
  return c;
}

function railTile(): Canv {
  const { c, p, r } = tile(P.RUST, [[P.MIST, 0.12], [P.CRAN, 0.1]], 1210);
  for (let y = 1; y < 16; y += 4) p.rect(0, y, 16, 2, P.CRAN);
  for (let y = 1; y < 16; y += 4) p.hline(0, 15, y, P.AMBER);
  p.vline(3, 0, 15, P.MIST); p.vline(4, 0, 15, P.TWILIGHT);
  p.vline(11, 0, 15, P.MIST); p.vline(12, 0, 15, P.TWILIGHT);
  for (let i = 0; i < 3; i++) p.px(r() * 16, r() * 16, P.FOREST);
  return c;
}

function checker(): Canv {
  const { c, p } = tile(P.FOG, [], 1220);
  for (let y = 0; y < 16; y += 4) for (let x = 0; x < 16; x += 4) if (((x + y) / 4) % 2 === 0) p.rect(x, y, 4, 4, P.SHADOW);
  p.px(1, 1, P.MOON);
  return c;
}

function marble(seed: number): Canv {
  const { c, p, r } = tile(P.FOG, [[P.MOON, 0.05], [P.MIST, 0.02]], seed);
  p.hline(0, 15, 15, P.MOON); p.vline(15, 0, 15, P.MOON);
  for (let i = 0; i < 2; i++) { let x = r() * 16; for (let y = 0; y < 16; y += 2) { p.px(x, y, P.MOON); x += r() < 0.5 ? 1 : -1; } }
  return c;
}

function stairs(): Canv {
  const { c, p } = tile(P.SHADOW, [], 1230);
  for (let k = 0; k < 4; k++) { p.rect(0, k * 4, 16, 3, k % 2 ? P.RUST : P.AMBER); p.hline(0, 15, k * 4, P.LANTERN); }
  p.rect(0, 0, 2, 16, P.CRAN); p.rect(14, 0, 2, 16, P.CRAN);
  return c;
}

/* ---------------- props ---------------- */

const mk = (w: number, h: number): { c: Canv; p: Pen } => { const { c, g } = makeCanvas(w, h); return { c, p: new Pen(g) }; };

function fountain(f: number): Canv {
  const { c, p } = mk(32, 34);
  p.ellipse(16, 25, 15, 8, P.MIST); p.ellipse(16, 24, 13, 6.5, P.TWILIGHT);
  p.ellipse(16, 23, 11, 5, f ? P.MIST : P.TWILIGHT);
  p.rect(14, 8, 4, 16, P.FOG); p.vline(17, 8, 23, P.MIST);
  p.ellipse(16, 9, 6, 2.5, P.MIST); p.ellipse(16, 8, 4, 1.5, P.TWILIGHT);
  const drops = f ? [[12, 4], [20, 5], [10, 12], [22, 13]] : [[13, 6], [19, 3], [9, 14], [23, 11]];
  for (const [x, y] of drops) { p.px(x, y, P.MOON); p.px(x, y + 1, P.MIST); }
  p.px(16, 2, P.FOG); p.px(16, 3, P.MOON);
  return outline(c);
}

function board(): Canv {
  const { c, p } = mk(16, 24);
  p.rect(2, 14, 2, 10, P.RUST); p.rect(12, 14, 2, 10, P.RUST);
  p.rect(0, 2, 16, 14, P.RUST); p.rect(1, 3, 14, 12, P.AMBER);
  p.rect(0, 0, 16, 3, P.CRAN);
  const notes: Array<[number, number, number]> = [[2, 4, P.FOG], [7, 5, P.LANTERN], [11, 4, P.MOON], [3, 9, P.LANTERN], [9, 10, P.FOG]];
  for (const [x, y, col] of notes) { p.rect(x, y, 4, 4, col); p.px(x + 1, y, P.RED); p.hline(x, x + 3, y + 2, P.MIST); }
  return outline(c);
}

function bench(): Canv {
  const { c, p } = mk(16, 14);
  p.rect(1, 2, 14, 3, P.AMBER); p.hline(1, 14, 4, P.RUST);
  p.rect(1, 7, 14, 3, P.AMBER); p.hline(1, 14, 9, P.RUST);
  p.rect(2, 10, 2, 4, P.SHADOW); p.rect(12, 10, 2, 4, P.SHADOW);
  return outline(c);
}

function flowerbed(): Canv {
  const { c, p } = mk(16, 14);
  p.rect(0, 6, 16, 8, P.RUST); p.hline(0, 15, 6, P.AMBER); p.rect(1, 7, 14, 4, P.CRAN);
  const r = mulberry32(1240);
  for (let i = 0; i < 10; i++) { const x = 1 + r() * 14, y = 2 + r() * 7; p.px(x, y + 1, P.FOREST); p.px(x, y, [P.RED, P.LANTERN, P.MOON, P.VIOLET][i % 4]); }
  return outline(c);
}

function counter(): Canv {
  const { c, p } = mk(16, 18);
  p.rect(0, 4, 16, 4, P.FOG); p.hline(0, 15, 4, P.MOON); p.hline(0, 15, 7, P.MIST);
  p.rect(0, 8, 16, 10, P.RED); p.hline(0, 15, 8, P.CRAN);
  for (let x = 3; x < 16; x += 5) p.vline(x, 9, 17, P.CRAN);
  return c;
}

function stool(): Canv {
  const { c, p } = mk(16, 16);
  p.ellipse(8, 7, 4, 2, P.RED); p.hline(5, 10, 6, P.LANTERN);
  p.rect(7, 9, 2, 6, P.MIST); p.hline(5, 10, 15, P.TWILIGHT);
  return outline(c);
}

function grill(): Canv {
  const { c, p } = mk(16, 22);
  p.rect(0, 6, 16, 16, P.SHADOW); p.rect(1, 6, 14, 4, P.MIST); p.hline(1, 14, 6, P.FOG);
  p.ellipse(5, 8, 2, 1, P.AMBER); p.ellipse(11, 8, 2, 1, P.LANTERN);
  p.rect(2, 12, 12, 6, P.TWILIGHT); p.px(4, 14, P.RED); p.px(8, 14, P.RED);
  p.px(5, 4, P.FOG); p.px(6, 2, P.MOON); p.px(11, 3, P.FOG);
  return outline(c);
}

function jukebox(f: number): Canv {
  const { c, p } = mk(16, 26);
  p.rect(1, 4, 14, 22, P.CRAN); p.ellipse(8, 6, 7, 4, P.CRAN);
  p.ellipse(8, 7, 5, 3, f ? P.LANTERN : P.AMBER);
  p.rect(3, 12, 10, 6, P.MIST); for (let x = 4; x < 12; x += 2) p.vline(x, 13, 16, P.TWILIGHT);
  p.rect(3, 20, 10, 4, P.SHADOW);
  for (let y = 5; y < 25; y += 3) { p.px(1, y, (y + f) % 2 ? P.RED : P.LANTERN); p.px(14, y, (y + f) % 2 ? P.LANTERN : P.RED); }
  return outline(c);
}

function shelf(seed: number): Canv {
  const { c, p } = mk(16, 26);
  const r = mulberry32(seed);
  p.rect(0, 0, 16, 26, P.RUST); p.rect(1, 1, 14, 24, P.CRAN);
  for (const y of [1, 9, 17]) {
    for (let x = 1; x < 15;) {
      const w = 2 + Math.floor(r() * 2), h = 3 + Math.floor(r() * 4);
      p.rect(x, y + 7 - h, w, h, [P.RED, P.MIST, P.FERN, P.LANTERN, P.AMBER, P.VIOLET][Math.floor(r() * 6)]);
      x += w + 1;
    }
    p.hline(0, 15, y + 7, P.AMBER);
  }
  return outline(c);
}

function anvil(): Canv {
  const { c, p } = mk(16, 16);
  p.rect(2, 4, 13, 4, P.TWILIGHT); p.hline(2, 14, 4, P.MIST); p.rect(0, 5, 3, 2, P.TWILIGHT);
  p.rect(5, 8, 6, 3, P.SHADOW); p.rect(3, 11, 10, 4, P.RUST); p.hline(3, 12, 11, P.AMBER);
  p.rect(9, 1, 1, 3, P.RUST); p.rect(7, 0, 5, 2, P.MIST);
  return outline(c);
}

function forge(f: number): Canv {
  const { c, p } = mk(16, 30);
  p.rect(2, 0, 12, 30, P.MIST);
  for (let y = 2; y < 30; y += 4) p.hline(2, 13, y, P.TWILIGHT);
  p.rect(4, 16, 8, 8, P.VOID);
  p.rect(5, 19, 6, 5, f ? P.AMBER : P.RED); p.rect(6, 21, 4, 3, P.LANTERN);
  return outline(c);
}

function displayCase(): Canv {
  const { c, p } = mk(16, 26);
  p.rect(1, 20, 14, 6, P.AMBER); p.hline(1, 14, 20, P.LANTERN); p.hline(1, 14, 25, P.RUST);
  p.rect(2, 2, 12, 18, P.MOON); p.rect(3, 3, 10, 16, P.TWILIGHT);
  p.px(4, 4, P.FOG); p.px(4, 5, P.FOG); p.px(5, 4, P.FOG);
  p.hline(2, 13, 2, P.FOG);
  return outline(c);
}

function kiosk(open: boolean): Canv {
  const { c, p } = mk(16, 28);
  p.rect(1, 12, 14, 16, P.RUST); p.hline(1, 14, 12, P.AMBER);
  p.rect(0, 0, 16, 6, open ? P.RED : P.SHADOW);
  for (let x = 0; x < 16; x += 4) p.rect(x, 4, 2, 3, open ? P.FOG : P.TWILIGHT);
  p.vline(1, 6, 12, P.RUST); p.vline(14, 6, 12, P.RUST);
  if (open) { p.rect(3, 9, 3, 3, P.MOON); p.rect(7, 8, 3, 4, P.LANTERN); p.rect(11, 9, 3, 3, P.FERN); }
  return outline(c);
}

function mapTable(): Canv {
  const { c, p } = mk(16, 18);
  p.rect(0, 4, 16, 8, P.RUST); p.rect(1, 3, 14, 7, P.LANTERN);
  p.line(2, 5, 7, 8, P.FOREST); p.line(7, 8, 13, 4, P.TWILIGHT); p.px(10, 6, P.RED); p.px(11, 6, P.RED);
  p.rect(1, 12, 2, 6, P.CRAN); p.rect(13, 12, 2, 6, P.CRAN);
  p.px(13, 3, P.FOG); p.px(14, 4, P.FOG);
  return outline(c);
}

function railcar(restored: boolean): Canv {
  const { c, p } = mk(32, 52);
  const body = restored ? P.CRAN : P.RUST, trim = restored ? P.LANTERN : P.AMBER;
  p.rect(1, 4, 30, 44, body);
  p.rect(0, 2, 32, 4, restored ? P.SHADOW : P.CRAN);
  for (let y = 10; y < 44; y += 10) { p.rect(4, y, 10, 6, restored ? P.MIST : P.SHADOW); p.rect(18, y, 10, 6, restored ? P.MIST : P.SHADOW); }
  p.hline(1, 30, 8, trim);
  if (!restored) { const r = mulberry32(1250); for (let i = 0; i < 40; i++) p.px(1 + r() * 30, 4 + r() * 44, r() < 0.5 ? P.CRAN : P.AMBER); }
  p.rect(2, 48, 6, 4, P.SHADOW); p.rect(24, 48, 6, 4, P.SHADOW);
  return outline(c);
}

function ticketBooth(): Canv {
  const { c, p } = mk(16, 28);
  p.rect(1, 8, 14, 20, P.CRAN); p.rect(0, 4, 16, 5, P.FOREST); p.hline(0, 15, 4, P.MOSS);
  p.rect(3, 11, 10, 7, P.TWILIGHT); p.rect(4, 12, 8, 5, P.MIST); p.hline(3, 12, 18, P.AMBER);
  p.rect(5, 21, 6, 3, P.LANTERN); p.hline(6, 9, 22, P.RUST);
  p.rect(5, 0, 6, 4, P.AMBER);
  return outline(c);
}

function signalLantern(lit: boolean): Canv {
  const { c, p } = mk(16, 32);
  p.rect(7, 8, 2, 24, P.SHADOW); p.rect(5, 29, 6, 3, P.SHADOW);
  p.rect(4, 1, 8, 8, P.VOID); p.rect(5, 2, 6, 6, lit ? P.RED : P.CRAN); p.px(6, 3, lit ? P.LANTERN : P.RUST);
  p.hline(3, 12, 0, P.SHADOW);
  return outline(c);
}

function register(): Canv {
  const { c, p } = mk(16, 18);
  p.rect(0, 4, 16, 4, P.FOG); p.rect(0, 8, 16, 10, P.RED); p.hline(0, 15, 8, P.CRAN);
  p.rect(3, 0, 10, 5, P.AMBER); p.rect(4, 1, 8, 2, P.LANTERN); p.px(6, 3, P.SHADOW); p.px(9, 3, P.SHADOW);
  return c;
}

function poster(): Canv {
  const { c, p } = mk(16, 16);
  p.rect(3, 2, 10, 13, P.LANTERN); p.hline(3, 12, 2, P.RED);
  p.ellipse(8, 8, 3, 3, P.SHADOW); p.px(7, 7, P.RED); p.px(9, 7, P.RED);
  p.hline(4, 11, 12, P.RUST); p.hline(5, 10, 13, P.RUST);
  return outline(c);
}

function hedge(): Canv {
  const { c, p } = mk(16, 16);
  const r = mulberry32(1260);
  p.rect(0, 4, 16, 11, P.FOREST);
  for (let i = 0; i < 30; i++) p.px(r() * 16, 4 + r() * 11, r() < 0.4 ? P.MOSS : P.PINE);
  p.hline(0, 15, 4, P.MOSS); p.hline(0, 15, 14, P.PINE);
  return c;
}

function boothSeat(): Canv {
  const { c, p } = mk(16, 20);
  p.rect(2, 0, 12, 12, P.RED); p.hline(2, 13, 0, P.LANTERN); p.vline(13, 0, 11, P.CRAN);
  p.rect(1, 11, 14, 5, P.RED); p.hline(1, 14, 11, P.LANTERN); p.rect(2, 16, 12, 4, P.SHADOW);
  return outline(c);
}

/* ---------------- buildings ---------------- */

function facade(W: number, H: number, wallTop: number, wall: number, wallSh: number, roof: number, roofSh: number, seed: number): { c: Canv; p: Pen } {
  const { c, p } = mk(W, H);
  const r = mulberry32(seed);
  p.rect(2, wallTop, W - 4, H - wallTop, wall);
  for (let y = wallTop + 3; y < H; y += 4) p.hline(2, W - 3, y, wallSh);
  for (let y = 4; y <= wallTop + 3; y++) {
    const inset = Math.round((1 - (y - 4) / (wallTop - 1)) * 8);
    for (let x = inset; x < W - inset; x++) p.px(x, y, (y - 4) % 4 === 3 ? roofSh : ((x + (y >> 2) * 3) % 9 === 0 ? roofSh : roof));
  }
  p.hline(8, W - 9, 4, P.SHADOW);
  for (let i = 0; i < 6; i++) p.px(10 + r() * (W - 20), 8 + r() * (wallTop - 8), roofSh);
  p.hline(0, W - 1, wallTop + 3, P.SHADOW);
  return { c, p };
}

function window4(p: Pen, x: number, y: number, night: boolean, w = 18, h = 14): void {
  p.rect(x, y, w, h, P.AMBER); p.rect(x + 2, y + 2, w - 4, h - 4, night ? P.LANTERN : P.MIST);
  if (!night) { p.px(x + 3, y + 3, P.FOG); p.px(x + 4, y + 3, P.FOG); }
  p.vline(x + (w >> 1), y + 2, y + h - 3, P.RUST);
}

function door(p: Pen, x: number, y: number, h: number, col: number): void {
  p.rect(x - 1, y - 1, 14, h + 1, P.SHADOW); p.rect(x, y, 12, h, col);
  p.vline(x + 5, y, y + h - 1, P.SHADOW); p.px(x + 9, y + h / 2, P.LANTERN);
}

function diner(night: boolean): Canv {
  const W = 128, H = 112;
  const { c, p } = facade(W, H, 44, P.FOG, P.MIST, P.RED, P.CRAN, 1300);
  p.rect(2, 72, W - 4, 4, P.RED); p.rect(2, 80, W - 4, 2, P.RED);
  p.rect(28, 22, 72, 16, P.SHADOW); p.rect(30, 24, 68, 12, night ? P.LANTERN : P.AMBER);
  for (let x = 34; x < 94; x += 8) p.rect(x, 27, 5, 6, night ? P.RED : P.RUST);
  window4(p, 12, 56, night, 22, 14); window4(p, 92, 56, night, 22, 14);
  door(p, 52, 84, 28, P.RED);
  return outline(c);
}

function store(night: boolean): Canv {
  const W = 128, H = 112;
  const { c, p } = facade(W, H, 44, P.AMBER, P.RUST, P.FOREST, P.PINE, 1310);
  p.rect(6, 50, W - 12, 6, P.FOREST); for (let x = 6; x < W - 6; x += 8) p.rect(x, 50, 4, 6, P.FOG);
  p.rect(30, 26, 68, 12, P.LANTERN); p.hline(34, 92, 31, P.RUST); p.hline(36, 88, 33, P.RUST);
  window4(p, 12, 60, night, 24, 18); window4(p, 92, 60, night, 24, 18);
  door(p, 52, 82, 30, P.FOREST);
  p.rect(100, 84, 12, 10, P.RUST); p.rect(102, 86, 8, 4, P.MIST);
  return outline(c);
}

function museum(night: boolean): Canv {
  const W = 192, H = 144;
  const { c, p } = mk(W, H);
  p.rect(4, 54, W - 8, H - 54, P.FOG);
  for (let y = 58; y < H; y += 6) p.hline(4, W - 5, y, P.MOON);
  for (let y = 10; y < 54; y++) {
    const half = Math.round(((y - 10) / 44) * (W / 2 - 4));
    p.hline(W / 2 - half, W / 2 + half - 1, y, (y % 6 === 0) ? P.MIST : P.MOON);
  }
  p.hline(0, W - 1, 52, P.MIST); p.hline(0, W - 1, 53, P.TWILIGHT);
  p.ellipse(W / 2, 36, 7, 7, P.AMBER); p.ellipse(W / 2, 36, 5, 5, P.LANTERN);
  for (let x = 14; x < W - 10; x += 24) { p.rect(x, 58, 8, H - 66, P.MOON); p.vline(x + 7, 58, H - 9, P.MIST); p.rect(x - 2, 56, 12, 3, P.FOG); }
  window4(p, 22, 88, night, 18, 24); window4(p, W - 40, 88, night, 18, 24);
  door(p, 86, 104, 40, P.RUST);
  p.rect(70, 62, 52, 10, P.SHADOW); p.rect(72, 64, 48, 6, P.AMBER);
  return outline(c);
}

function house(night: boolean, seed: number): Canv {
  const W = 96, H = 96;
  const roofs = [[P.TWILIGHT, P.SHADOW], [P.CRAN, P.SHADOW], [P.FOREST, P.PINE]];
  const [rf, rs] = roofs[seed % 3];
  const { c, p } = facade(W, H, 44, P.MOON, P.VIOLET, rf, rs, 1320 + seed);
  window4(p, 12, 60, night, 18, 14);
  door(p, 38, 66, 30, P.RUST);
  p.rect(70, 60, 14, 14, P.AMBER); p.rect(72, 62, 10, 10, night ? P.LANTERN : P.MIST);
  return outline(c);
}

function station(night: boolean, restored: boolean): Canv {
  const W = 112, H = 112;
  const { c, p } = facade(W, H, 48, restored ? P.CRAN : P.RUST, P.SHADOW, restored ? P.FOREST : P.TWILIGHT, P.SHADOW, 1330);
  p.rect(20, 28, 72, 12, P.LANTERN); p.hline(24, 88, 33, P.RUST);
  window4(p, 10, 60, night && restored, 20, 16); window4(p, 82, 60, night && restored, 20, 16);
  if (!restored) {
    for (const x of [10, 82]) { p.line(x, 60, x + 20, 76, P.AMBER); p.line(x + 20, 60, x, 76, P.AMBER); }
    p.line(40, 70, 72, 100, P.AMBER); p.line(72, 70, 40, 100, P.AMBER);
  }
  door(p, 50, 72, 40, restored ? P.FOREST : P.SHADOW);
  p.ellipse(56, 18, 6, 6, P.FOG); p.px(56, 15, P.SHADOW); p.px(56, 16, P.SHADOW); p.px(57, 18, P.SHADOW);
  return outline(c);
}

function mineBoarded(): Canv {
  const src = STRUCT.mine[0];
  const { c, g } = makeCanvas(src.width, src.height);
  g.drawImage(src, 0, 0);
  const p = new Pen(g);
  for (let y = 36; y < 78; y += 8) { p.rect(24, y, 32, 4, P.AMBER); p.hline(24, 55, y + 3, P.RUST); p.px(26, y + 1, P.SHADOW); p.px(53, y + 1, P.SHADOW); }
  return c;
}

/** Post-Grant mine: gate swung open onto darkness, a lantern glinting far below. */
function mineOpen(): Canv {
  const src = STRUCT.mine[0];
  const { c, g } = makeCanvas(src.width, src.height);
  g.drawImage(src, 0, 0);
  const p = new Pen(g);
  p.rect(28, 34, 24, 46, P.VOID);
  for (let y = 34; y < 80; y += 3) p.px(29 + (y % 2), y, P.SHADOW);
  for (let x = 52; x < 60; x += 2) p.vline(x, 40, 76, P.MIST);
  p.hline(52, 59, 50, P.TWILIGHT);
  p.px(40, 70, P.LANTERN); p.px(40, 69, P.AMBER);
  p.rect(30, 26, 20, 3, P.FOG); p.hline(32, 47, 27, P.SHADOW);
  return c;
}

/* ---------------- characters & quest decals ---------------- */

function buster(f: number): Canv {
  const { c, p } = mk(20, 16);
  const b = f ? -1 : 0;
  p.ellipse(9, 9 + b, 6, 3.5, P.AMBER); p.ellipse(9, 10 + b, 4, 2, P.LANTERN);
  p.ellipse(15, 6 + b, 3, 2.5, P.AMBER); p.rect(16, 6 + b, 3, 2, P.RUST); p.px(18, 6 + b, P.VOID);
  p.rect(13, 6 + b, 2, 5, P.RUST); p.px(15, 5 + b, P.VOID);
  p.hline(12, 14, 8 + b, P.RED);
  for (const x of [5, 7, 11, 13]) p.rect(x, 12, 1, 3, P.RUST);
  p.line(3, 8 + b, 1, 5 + f * 2, P.AMBER);
  return outline(c);
}

/** Ranger Vance's half-burned field journal (sits on the cabin table). */
function vanceBook(): Canv {
  const { c, p } = mk(16, 16);
  p.rect(2, 5, 12, 8, P.FOREST); p.rect(3, 6, 10, 6, P.FOG); p.vline(8, 5, 12, P.PINE);
  p.hline(4, 7, 8, P.MIST); p.hline(9, 12, 8, P.MIST); p.hline(4, 6, 10, P.MIST);
  for (const [x, y] of [[11, 6], [12, 7], [12, 10], [13, 11], [10, 11]]) p.px(x, y, P.SHADOW);
  p.px(12, 6, P.VOID); p.px(13, 9, P.AMBER);
  return outline(c);
}

function paw(): Canv {
  const { c, p } = mk(16, 16);
  for (const [x, y] of [[5, 5], [10, 9]]) {
    p.rect(x, y + 1, 2, 2, P.SHADOW); p.px(x - 1, y - 1, P.SHADOW); p.px(x + 1, y - 2, P.SHADOW); p.px(x + 3, y - 1, P.SHADOW);
  }
  return c;
}

function boot(): Canv {
  const { c, p } = mk(16, 16);
  for (const [x, y] of [[4, 3], [10, 8]]) { p.rect(x, y, 3, 5, P.SHADOW); p.px(x + 1, y + 2, P.PINE); p.rect(x, y + 6, 3, 2, P.SHADOW); }
  return c;
}

function page(): Canv {
  const { c, p } = mk(16, 16);
  p.rect(4, 5, 9, 8, P.FOG); p.hline(4, 12, 5, P.MOON); p.line(5, 8, 11, 7, P.MIST); p.line(5, 10, 9, 10, P.MIST);
  p.ellipse(9, 9, 1.5, 1.5, P.SHADOW);
  return outline(c);
}

function sketchbook(): Canv {
  const { c, p } = mk(16, 16);
  p.rect(2, 4, 12, 9, P.RED); p.rect(3, 5, 10, 7, P.CRAN); p.vline(8, 4, 12, P.SHADOW);
  p.rect(4, 6, 3, 4, P.LANTERN); p.px(10, 7, P.LANTERN);
  return outline(c);
}

function bonfire(f: number): Canv {
  const { c, p } = mk(20, 24);
  p.ellipse(10, 21, 8, 2.5, P.SHADOW);
  for (const [x0, x1] of [[3, 16], [4, 17]]) p.line(x0, 21, x1, 17, P.RUST);
  const r = mulberry32(1400 + f);
  for (let i = 0; i < 40; i++) {
    const x = 5 + r() * 10, y = 4 + r() * 15;
    const k = (y - 4) / 15;
    p.px(x, y, k < 0.3 ? P.LANTERN : k < 0.7 ? P.AMBER : P.RED);
  }
  return c;
}

function wagon(main: number, trim: number): Canv {
  const { c, p } = mk(40, 36);
  p.rect(2, 8, 34, 20, main); p.ellipse(19, 9, 18, 7, main);
  p.hline(2, 35, 14, trim); p.rect(6, 16, 10, 8, P.SHADOW); p.rect(7, 17, 8, 6, P.LANTERN);
  for (let x = 20; x < 34; x += 4) p.vline(x, 16, 26, trim);
  for (const x of [8, 28]) { p.ellipse(x, 30, 5, 5, P.RUST); p.ellipse(x, 30, 2, 2, P.AMBER); }
  return outline(c);
}

function bunting(): Canv {
  const { c, p } = mk(16, 8);
  p.hline(0, 15, 1, P.SHADOW);
  const cols = [P.RED, P.LANTERN, P.FERN, P.MOON];
  for (let i = 0; i < 4; i++) { const x = i * 4; p.px(x, 2, cols[i]); p.px(x + 1, 2, cols[i]); p.px(x + 2, 2, cols[i]); p.px(x + 1, 3, cols[i]); p.px(x + 1, 4, cols[i]); }
  return c;
}

const FOOD_ICONS: Record<string, string[]> = {
  black_coffee: ['............', '....7.7.....', '.....7.7....', '..11111111..', '..16666661.1', '..10000001.1', '..10000001.1', '..10000001.1', '..16666661..', '...111111...', '.1111111111.', '............'],
  pancakes: ['............', '.....88.....', '....8778....', '..11111111..', '.1888888881.', '.1999999991.', '.1888888881.', '.1999999991.', '.1888888881.', '..11111111..', '..66666666..', '............'],
  cranberry_pie: ['............', '............', '...111111...', '..18888881..', '.1b8b8b8b81.', '.18b8b8b8b1.', '.1aaaaaaaa1.', '.1888888881.', '..19999991..', '...111111...', '............', '............'],
  ghost_chili: ['......4.....', '.....b4.....', '....bb......', '..11111111..', '.1bbbbbbbb1.', '.1b9b7bb9b1.', '.1bbbbbbbb1.', '.16666666661', '..16666661..', '...111111...', '............', '............'],
  pepperoni_roll: ['............', '............', '...111111...', '..18888881..', '.1887b78881.', '.18b8887b81.', '.1888b88881.', '.17b8887b81.', '..19999991..', '...111111...', '............', '............'],
  soup_beans: ['............', '.....7..7...', '......7..7..', '..11111111..', '.1999a99991.', '.19a999a991.', '.1666666661.', '..16666661..', '...111111...', '.1888888881.', '.1877878781.', '..11111111..'],
  display_pedestal: ['............', '...111111...', '..1fffff1...', '..1fcccf1...', '..1fcccf1...', '..1fffff1...', '..1888881...', '...16661....', '...16661....', '..1888881...', '.199999991..', '..1111111...'],
};

export function bakeTown(): void {
  GROUND.plaza = [cobble(1201), cobble(1202)];
  GROUND.platform = [plankTile(P.RUST, P.CRAN, P.AMBER, false, 1203, 4)];
  GROUND.rail = [railTile()];
  GROUND.checker = [checker()];
  GROUND.marble = [marble(1221), marble(1222)];
  GROUND.stairs = [stairs()];

  OBJ.fountain = [fountain(0), fountain(1)];
  OBJ.board = [board()];
  OBJ.bench = [bench()];
  OBJ.flowerbed = [flowerbed()];
  OBJ.counter = [counter()];
  OBJ.stool = [stool()];
  OBJ.grill = [grill()];
  OBJ.jukebox = [jukebox(0), jukebox(1)];
  OBJ.shelf = [shelf(1271), shelf(1272), shelf(1273)];
  OBJ.anvil = [anvil()];
  OBJ.forge = [forge(0), forge(1)];
  OBJ.case = [displayCase()];
  OBJ.kiosk = [kiosk(false), kiosk(true)];
  OBJ.maptable = [mapTable()];
  OBJ.railcar = [railcar(false), railcar(true)];
  OBJ.booth = [ticketBooth()];
  OBJ.signal = [signalLantern(false), signalLantern(true)];
  OBJ.register = [register()];
  OBJ.poster = [poster()];
  OBJ.hedge = [hedge()];
  OBJ.boothseat = [boothSeat()];

  STRUCT.diner = [diner(false), diner(true)];
  STRUCT.store = [store(false), store(true)];
  STRUCT.museum = [museum(false), museum(true)];
  STRUCT.house = [house(false, 0), house(true, 0), house(false, 1), house(true, 1), house(false, 2), house(true, 2)];
  STRUCT.station = [station(false, false), station(true, false), station(false, true), station(true, true)];
  STRUCT.mineBoarded = [mineBoarded()];
  STRUCT.mineOpen = [mineOpen()];

  MISC.busterR = buster(0); MISC.busterR1 = buster(1);
  MISC.busterL = flipH(MISC.busterR); MISC.busterL1 = flipH(MISC.busterR1);
  MISC.vanceBook = vanceBook();
  MISC.paw = paw(); MISC.boot = boot(); MISC.page = page(); MISC.sketchbook = sketchbook();
  MISC.bonfire0 = bonfire(0); MISC.bonfire1 = bonfire(1);
  MISC.wagonEzri = wagon(P.VIOLET, P.MOON); MISC.wagonPike = wagon(P.TWILIGHT, P.AMBER);
  MISC.bunting = bunting();

  for (const [id, art] of Object.entries(FOOD_ICONS)) ICON[id] = fromArt(art, {}, 16, 16);
}
