/**
 * 37 procedural 24x24 cryptid sprites, each with a distinct 2-frame idle
 * loop. Rare variants are derived: Albino (fog/moonlight palette swap) and
 * Static-Charged (crackling lantern/mist aura).
 */
import { makeCanvas, Pen, outline, recolor, Canv } from './canvas';
import { P } from './palette';
import { ICON } from './sprites';
import { CRYPTIDS, Variant } from '../data/cryptids';
import { hash2 } from '../util';

type Draw = (p: Pen, f: number) => void;

const { VOID, SHADOW, PINE, FOREST, MOSS, FERN, FOG, LANTERN, AMBER, RUST, CRAN, RED, TWILIGHT, MIST, VIOLET, MOON } = P;

/* Small helpers */
const E = (p: Pen, cx: number, cy: number, rx: number, ry: number, c: number) => p.ellipse(cx, cy, rx, ry, c);
const thick = (p: Pen, x0: number, y0: number, x1: number, y1: number, r: number, c: number) => {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  for (let i = 0; i <= n; i++) E(p, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, r, r, c);
};

const DRAW: Record<string, Draw> = {
  sheepsquatch(p, f) {
    const b = f ? 1 : 0; // heavy breathing: the whole fleece rises and falls
    for (let i = 0; i < 3; i++) p.px(3 + i * 2 + f, 5 - i - f, i % 2 ? LANTERN : FOG); // sulfur wisps
    for (const x of [7, 10, 14, 17]) p.rect(x, 18, 2, 4, SHADOW);
    p.rect(6, 21, 4, 1, VOID); p.rect(14, 21, 4, 1, VOID);
    E(p, 12, 14 - b, 8, 6 + b * 0.5, FOG);
    for (const [x, y] of [[6, 12], [9, 10], [13, 9], [17, 11], [19, 14], [5, 16], [10, 15], [15, 16], [18, 18]]) E(p, x, y - b, 1.6, 1.4, LANTERN);
    E(p, 12, 7 - b, 3.6, 3.4, SHADOW); E(p, 12, 9 - b, 2.2, 1.6, PINE);
    p.px(10, 6 - b, RED); p.px(14, 6 - b, RED);
    E(p, 7, 5 - b, 2.4, 2.2, AMBER); E(p, 17, 5 - b, 2.4, 2.2, AMBER);
    p.px(7, 5 - b, RUST); p.px(17, 5 - b, RUST); p.px(6, 7 - b, AMBER); p.px(18, 7 - b, AMBER);
    p.rect(3, 13 - b, 2, 4, FOG); p.rect(19, 13 - b, 2, 4, FOG); p.px(3, 17 - b, SHADOW); p.px(20, 17 - b, SHADOW);
  },
  jackalope(p, f) {
    const b = f ? -2 : 0;
    E(p, 11, 17 + b, 6, 4.2, AMBER); E(p, 11, 19 + b, 4, 1.6, LANTERN);
    E(p, 16, 12 + b, 3.5, 3, AMBER);
    p.rect(13, 6 + b, 2, 5, AMBER); p.px(13, 7 + b, RUST);
    p.line(16, 9 + b, 15, 3 + b, LANTERN); p.px(14, 4 + b, LANTERN); p.px(16, 5 + b, LANTERN);
    p.line(18, 9 + b, 20, 3 + b, LANTERN); p.px(21, 4 + b, LANTERN); p.px(19, 5 + b, LANTERN);
    p.px(17, 12 + b, VOID); p.px(19, 13 + b, RED);
    p.rect(4, 15 + b, 2, 2, FOG);
    p.rect(14, 20 + b, 3, 2, RUST); p.rect(6, 20, 5, 2, RUST);
  },
  nightcrawler(p, f) {
    const s = f ? 1 : 0;
    p.rect(9 - s, 11, 2, 11, FOG); p.rect(13 + s, 11, 2, 11, FOG);
    p.vline(10 - s, 11, 21, MOON); p.vline(14 + s, 11, 21, MOON);
    p.rect(8 - s, 21, 3, 1, MOON); p.rect(13 + s, 21, 3, 1, MOON);
    E(p, 12, 6, 4.5, 5.5, FOG); E(p, 13, 7, 3, 4, MOON);
    p.hline(9, 15, 8, VIOLET); p.hline(10, 14, 10, VIOLET); p.px(11, 4, VIOLET); p.px(13, 4, VIOLET);
  },
  hoop_snake(p, f) {
    const ox = f ? 1 : 0;
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
      const d = Math.hypot(x + 0.5 - 12 - ox, y + 0.5 - 13);
      if (d < 5 || d > 8.6) continue;
      const a = Math.atan2(y - 13, x - 12 - ox) + f * 0.5;
      p.px(x, y, Math.floor((a + Math.PI) * 2.2) % 2 ? MOSS : FOREST);
    }
    E(p, 12 + ox, 5, 3.5, 2.6, MOSS); p.px(14 + ox, 4, RED); p.px(10 + ox, 6, FERN); p.hline(10 + ox, 14 + ox, 7, PINE);
  },
  squonk(p, f) {
    const s = f ? 1 : 0;
    E(p, 13 + s, 15, 8, 5.5, RUST); E(p, 14 + s, 17, 6, 3, CRAN);
    E(p, 7 + s, 13, 4.5, 4, RUST); p.rect(2 + s, 14, 3, 2, CRAN); p.px(2 + s, 14, VOID);
    for (const [x, y] of [[11, 12], [16, 13], [19, 15], [9, 16], [14, 11]]) p.px(x + s, y, CRAN);
    p.px(6 + s, 11, VOID); p.px(9 + s, 11, VOID); p.px(5 + s, 10, SHADOW); p.px(10 + s, 10, SHADOW);
    p.px(6 + s, 13 + f * 2, MIST); p.px(9 + s, 14 + f * 3, MIST); p.px(9 + s, 13 + f * 3, MOON);
    for (const x of [8, 11, 16, 19]) p.rect(x + s, 19, 2, 3, CRAN);
  },
  albatwitch(p, f) {
    E(p, 11, 16, 6, 5, PINE); E(p, 13, 10, 4, 3.5, PINE); E(p, 14, 11, 2.5, 2, SHADOW);
    p.px(13, 10, LANTERN); p.px(15, 10, LANTERN);
    p.line(7, 14, 7, 7, PINE); p.line(16, 14, 18, 7, PINE);
    const ax = f ? 16 : 7, ay = f ? 4 : 3;
    E(p, ax + 0.5, ay + 1, 2, 2, RED); p.px(ax, ay - 1, FOREST); p.px(ax - 1, ay, FOG);
    p.rect(7, 20, 3, 2, PINE); p.rect(13, 20, 3, 2, PINE);
  },
  snarly_yow(p, f) {
    for (let i = 0; i < 5; i++) p.px(1 + i + (f + i) % 2, 12 + (i % 3) * 2, i % 2 ? MIST : TWILIGHT);
    E(p, 11, 14, 8, 5, VOID); E(p, 18, 10, 4, 3.5, VOID);
    p.rect(19, 10, 4, 2, VOID); p.rect(19, 12 + f, 4, 1, VOID);
    if (f) { p.px(20, 12, FOG); p.px(22, 12, FOG); }
    p.px(16, 6, VOID); p.px(17, 5, VOID); p.px(19, 6, VOID);
    p.rect(17, 9, 2, 1, RED);
    for (const x of [5, 8, 14, 17]) p.rect(x, 17, 2, 5, VOID);
    p.hline(6, 15, 9, TWILIGHT); p.hline(16, 19, 7, TWILIGHT);
  },
  wampus_cat(p, f) {
    E(p, 11, 14, 8, 4, RUST);
    for (const x of [7, 10, 13]) p.vline(x, 11, 13, CRAN);
    for (const [i, x] of [5, 7, 10, 12, 15, 17].entries()) p.rect(x, 17 - ((i + f) % 2), 1, 5, i % 2 ? CRAN : RUST);
    E(p, 19, 10, 3.5, 3, RUST); p.px(17, 7, RUST); p.px(21, 7, RUST);
    p.px(18, 10, LANTERN); p.px(20, 10, LANTERN); p.px(21, 11, CRAN);
    if (f) p.line(3, 13, 1, 6, CRAN); else p.line(3, 13, 5, 5, CRAN);
  },
  bolter(p, f) {
    thick(p, 5, 6, 18, 18, 3, FOREST);
    thick(p, 8, 10, 17, 18, 1.5, MOSS);
    E(p, 19, 19, 4, 3, FOREST); p.hline(16, 22, 20, PINE); p.px(19, 17, LANTERN);
    p.line(5, 6, 2, 2, FOREST);
    const k = f ? 1 : 0;
    p.px(1, 1 + k, AMBER); p.px(2, 0, AMBER); p.px(3, 2 - k, AMBER); p.px(4, 1, AMBER);
    for (const [x, y] of [[8, 14], [14, 8], [12, 18], [17, 13]]) p.rect(x, y, 2, 2, PINE);
  },
  wampahoofus(p, f) {
    const t = f ? 1 : 0;
    E(p, 12, 14 + t, 7, 4.5, RUST); E(p, 12, 16 + t, 5, 2, CRAN);
    p.rect(6, 18, 2, 2, CRAN); p.rect(9, 18, 2, 2, CRAN);
    p.rect(14, 17, 2, 5, RUST); p.rect(17, 17, 2, 5, RUST);
    E(p, 18, 10, 3, 3, RUST); p.rect(20, 11, 3, 2, CRAN); p.px(21, 13, FOG); p.px(18, 9, VOID);
    p.line(17, 7, 15, 2, AMBER); p.px(14, 3, AMBER); p.line(19, 7, 21, 2, AMBER); p.px(22, 3, AMBER);
  },
  loveland_frog(p, f) {
    E(p, 11, 15, 5, 6, MOSS); E(p, 11, 16, 3, 4, FERN);
    p.rect(6, 12, 3, 7, AMBER); p.rect(14, 12, 3, 7, AMBER); p.px(7, 14, LANTERN); p.px(15, 16, LANTERN);
    E(p, 11, 7, 5, 4, MOSS); E(p, 8, 5, 1.6, 1.6, FOG); E(p, 14, 5, 1.6, 1.6, FOG);
    p.px(8, 5, VOID); p.px(14, 5, VOID); p.hline(8, 14, 9, FOREST);
    p.line(16, 13, 19, 8 + f, LANTERN);
    p.px(20, 7 + f, LANTERN); if (f) { p.px(21, 6, MOON); p.px(19, 5, FOG); } else { p.px(22, 8, MOON); p.px(21, 9, FOG); }
    p.rect(7, 20, 3, 2, MOSS); p.rect(12, 20, 3, 2, MOSS);
  },
  polliwog(p, f) {
    const w = f ? 2 : -2;
    for (let x = 15; x < 24; x++) {
      const y = 13 + Math.round(w * Math.sin((x - 15) / 3));
      const th = Math.max(0, 3 - (x - 15) / 3);
      p.vline(x, y - th, y + th, x > 20 ? RED : CRAN);
    }
    E(p, 9, 13, 7, 6, CRAN); E(p, 8, 15, 4, 2.5, RED);
    p.px(14, 10, FERN); p.px(15, 12, FERN); p.px(14, 15, FERN); p.px(15, 9, FERN);
    E(p, 6, 11, 1.5, 1.5, FOG); p.px(6, 11, VOID);
    p.px(4, 4 + f, MIST); p.px(7, 2 + f, MOON); p.px(3, 7 - f, MIST);
  },
  skunk_ape(p, f) {
    E(p, 12, 14, 7 + f * 0.6, 7, CRAN);
    for (let i = 0; i < 10; i++) p.px(7 + ((i * 5) % 11), 9 + ((i * 3) % 11), RUST);
    E(p, 12, 6, 4, 4, CRAN); E(p, 12, 7, 2.5, 2, RUST);
    p.px(11, 6, VOID); p.px(13, 6, VOID);
    p.line(5, 11, 4, 20, CRAN); p.line(19, 11, 20, 20, CRAN);
    p.rect(8, 20, 3, 2, CRAN); p.rect(13, 20, 3, 2, CRAN);
    for (const [x, y] of [[3, 4], [20, 6], [5, 1], [18, 2]]) p.px(x, y - f, FERN);
  },
  altamaha(p, f) {
    p.rect(0, 18, 24, 6, TWILIGHT);
    for (let x = 0; x < 24; x += 3) p.px((x + f * 2) % 24, 19, MIST);
    for (let x = 6; x < 23; x++) {
      const h = Math.max(0, Math.round(5 * Math.sin((x + f * 2) * 0.55)));
      if (h) { p.vline(x, 18 - h, 18, FOREST); p.px(x, 18 - h, FERN); }
    }
    E(p, 4, 13, 3, 2.5, FOREST); p.vline(3, 14, 18, FOREST); p.vline(4, 14, 18, FOREST);
    p.px(3, 12, LANTERN); p.px(1, 14, PINE);
  },
  wisp(p, f) {
    const dx = f ? 1 : -1, dy = f ? -1 : 0;
    E(p, 12 + dx, 14 + dy, 6, 7, MIST);
    p.line(12 + dx, 3 + dy, 9 + dx, 9 + dy, MIST); p.line(12 + dx, 3 + dy, 15 + dx, 9 + dy, MIST);
    E(p, 12 + dx, 14 + dy, 4, 5, MOON); E(p, 12 + dx, 15 + dy, 2, 2.5, FOG);
    p.px(8 + dx, 6 + dy, VIOLET); p.px(16 + dx, 8 + dy, VIOLET); p.px(12 + dx, 2 + dy, MOON);
  },
  chessie(p, f) {
    p.rect(0, 19, 24, 5, TWILIGHT); p.px(3 + f, 20, MIST); p.px(15 - f, 21, MIST);
    E(p, 18, 18, 4, 2, PINE);
    const hy = 5 + f * 2;
    thick(p, 7, 19, 9, 12, 2, PINE); thick(p, 9, 12, 14, hy + 1, 2, PINE);
    for (let i = 0; i < 4; i++) p.px(7 + i * 2, 16 - i * 3, TWILIGHT);
    E(p, 16, hy, 3.5, 2, PINE); p.px(17, hy - 1, LANTERN); p.hline(16, 19, hy + 1, TWILIGHT);
  },
  bessie(p, f) {
    p.rect(0, 19, 24, 5, TWILIGHT); for (let x = 0; x < 24; x += 4) p.hline(x + f, x + f + 1, 20, MIST);
    thick(p, 5, 19, 8, 9, 2.2, FOREST); E(p, 16, 18, 5, 2, FOREST);
    p.px(5, 14, FERN); p.px(6, 11, FERN); p.px(15, 16, FERN); p.px(18, 16, FERN);
    E(p, 11, 8, 4, 2.5, FOREST); p.px(12, 7, LANTERN);
    p.line(14, 9, 17, 11 + f, AMBER); p.line(14, 10, 16, 13 + f, AMBER);
  },
  pukwudgie(p, f) {
    const L = f ? 4 : 2;
    for (let a = -2.6; a <= -0.4; a += 0.35) p.line(12, 12, 12 + Math.cos(a) * (6 + L), 12 + Math.sin(a) * (6 + L), FOG);
    E(p, 12, 17, 4, 4, RUST); E(p, 12, 11, 3.5, 3.5, RUST);
    p.px(11, 11, LANTERN); p.px(13, 11, LANTERN); p.hline(11, 13, 13, CRAN);
    p.rect(9, 20, 2, 2, CRAN); p.rect(13, 20, 2, 2, CRAN);
  },
  ozark_howler(p, f) {
    E(p, 11, 15, 7, 5, SHADOW); E(p, 16, 9, 4, 3.5, SHADOW);
    E(p, 13, 6, 2, 2, AMBER); p.px(12, 8, AMBER); E(p, 19, 6, 2, 2, AMBER); p.px(20, 8, AMBER);
    p.px(15, 8, RED); p.px(18, 8, RED);
    p.rect(16, 11, 4, 1 + f, VOID); if (f) p.px(17, 11, FOG);
    for (const x of [6, 9, 13, 16]) p.rect(x, 18, 2, 4, SHADOW);
    if (f) { for (const r of [3, 5]) for (let a = -0.8; a <= 0.8; a += 0.4) p.px(20 + Math.cos(a) * r, 11 + Math.sin(a) * r, VIOLET); }
  },
  slippery_skin(p, f) {
    E(p, 11, 15, 8, 6, VOID); E(p, 17, 10, 4, 3.5, VOID);
    const hl = f ? [[8, 11], [13, 12], [18, 8]] : [[6, 13], [11, 10], [16, 9]];
    for (const [x, y] of hl) { p.px(x, y, TWILIGHT); p.px(x + 1, y, MIST); }
    p.px(18, 9, FOG);
    for (const x of [6, 9, 13, 16]) p.rect(x, 19, 2, 3, VOID);
    p.px(8, 21 + f, MIST); p.px(15, 22 - f, MIST);
    for (const [x, y] of [[4, 6], [7, 3], [20, 3]]) p.px(x, y - f, LANTERN);
  },
  mothman(p, f) {
    const s = f ? 2 : 0;
    for (const side of [-1, 1]) {
      for (let y = 4; y < 20; y++) {
        const w = Math.round((y < 10 ? (y - 4) * 1.2 : (20 - y) * 0.8) + s);
        for (let k = 1; k <= w; k++) p.px(12 + side * (2 + k), y, k === w ? TWILIGHT : VOID);
      }
    }
    E(p, 12, 12, 3, 7, VOID); E(p, 12, 6, 3, 3, VOID);
    p.rect(10, 5, 2, 2, RED); p.rect(13, 5, 2, 2, RED);
    p.rect(10, 19, 1, 3, VOID); p.rect(13, 19, 1, 3, VOID);
  },
  jersey_devil(p, f) {
    const b = f ? 1 : 0;
    const wy = f ? 14 : 2;
    p.line(10, 10 + b, 1, wy, CRAN); p.line(10, 11 + b, 5, wy + 2, CRAN); p.line(10, 12 + b, 3, wy + 6, CRAN);
    for (let i = 0; i < 6; i++) p.line(10, 10 + b, 1 + i, wy + i, CRAN);
    E(p, 11, 13 + b, 4, 5, RUST);
    thick(p, 12, 10 + b, 16, 6 + b, 1.2, RUST); E(p, 18, 6 + b, 3, 2, RUST); p.rect(19, 6 + b, 3, 2, CRAN);
    p.px(18, 5 + b, RED); p.px(16, 3 + b, RUST); p.px(17, 3 + b, CRAN);
    p.line(9, 17 + b, 4, 21, AMBER); p.px(3, 20, AMBER); p.px(3, 22, AMBER);
    p.rect(10, 18 + b, 1, 3, CRAN); p.rect(13, 18 + b, 1, 3, CRAN);
  },
  snallygaster(p, f) {
    p.line(9, 9, 2, 3, PINE); p.line(9, 10, 1, 8, PINE); for (let i = 0; i < 5; i++) p.line(9, 9, 2 + i, 3 + i, PINE);
    E(p, 11, 11, 6, 4, PINE); p.hline(7, 15, 9, FOREST);
    E(p, 16, 8, 3, 2.5, PINE); p.px(16, 7, RED);
    p.line(18, 8, 23, 9, FOG); p.line(18, 9, 23, 10 + f * 2, FOG); p.px(19, 8, MIST);
    for (let x = 8; x <= 14; x += 2) for (let y = 15; y < 22; y++) p.px(x + Math.round(Math.sin((y + x + f * 2) * 0.8)), y, RED);
  },
  dover_demon(p, f) {
    const t = f ? 1 : 0;
    E(p, 12 + t, 7, 5, 5.5, AMBER); E(p, 10 + t, 7, 1.5, 2, RED); E(p, 15 + t, 7, 1.5, 2, RED);
    p.rect(11, 12, 2, 7, AMBER);
    p.line(11, 13, 6, 18, AMBER); p.line(12, 13, 17, 18, AMBER);
    p.line(11, 19, 9, 22, AMBER); p.line(12, 19, 14, 22, AMBER);
  },
  grafton(p, f) {
    const l = f ? -1 : 0, r = f ? 0 : -1;
    E(p, 7, 9 + l, 4, 3, FOG); E(p, 17, 9 + r, 4, 3, FOG);
    E(p, 12, 14, 7, 6, FOG); p.vline(17, 10, 19, MIST); p.vline(18, 11, 18, MIST);
    p.line(4, 10 + l, 3, 19, FOG); p.line(20, 10 + r, 21, 19, MIST);
    p.rect(8, 19, 3, 3, MIST); p.rect(14, 19, 3, 3, MIST);
    p.px(11, 12, MIST); p.px(13, 12, MIST);
  },
  dwayyo(p, f) {
    const s = f ? 1 : 0;
    E(p, 12, 14, 4, 6, CRAN); E(p, 12, 15, 2.5, 4, SHADOW);
    E(p, 12, 6, 3.5, 3, CRAN); p.rect(14 + s, 6, 4, 2, SHADOW); p.px(17 + s, 6, VOID);
    p.px(10, 3, CRAN); p.px(10, 2, CRAN); p.px(13, 3, CRAN); p.px(13, 2, CRAN);
    p.px(13, 5, LANTERN); p.px(15 + s, 8, LANTERN); p.px(17 + s, 8, LANTERN);
    p.line(9, 11, 6, 17, CRAN); p.line(15, 11, 18, 17, CRAN);
    p.px(5 - f, 18, LANTERN); p.px(6, 18 + f, LANTERN); p.px(19 + f, 18, LANTERN);
    p.line(11, 19, 9, 22, CRAN); p.line(13, 19, 15, 22, CRAN);
  },
  hodag(p, f) {
    E(p, 10, 15, 8, 5, PINE); E(p, 10, 18, 6, 2, MOSS);
    for (let x = 4; x < 16; x += 3) { p.px(x, 9, MOSS); p.px(x + 1, 10, MOSS); }
    E(p, 18, 13, 5, 4, PINE); p.hline(15, 22, 15, FOG); p.px(16, 16, FOG); p.px(20, 16, FOG);
    p.px(19, 11, RED); p.line(16, 10, 15, 7, LANTERN); p.line(20, 10, 21, 7, LANTERN);
    for (const x of [4, 8, 12, 16]) p.rect(x, 19, 2, 3, PINE);
    const st = f ? [[22, 11], [23, 10], [22, 9], [23, 8]] : [[22, 12], [23, 11]];
    for (const [x, y] of st) p.px(x, y, FOG);
  },
  hopkinsville_goblin(p, f) {
    const b = f ? -1 : 0;
    E(p, 12, 16 + b, 3, 4, FERN); p.line(9, 14 + b, 6, 19 + b, FERN); p.line(15, 14 + b, 18, 19 + b, FERN);
    E(p, 12, 10 + b, 4, 3.5, FOG);
    const tip = f ? 1 : 0;
    p.line(8, 9 + b, 2, 4 + b + tip, FERN); p.line(8, 11 + b, 3, 6 + b + tip, FERN); p.px(4, 6 + b, FOG);
    p.line(16, 9 + b, 22, 4 + b - tip, FERN); p.line(16, 11 + b, 21, 6 + b - tip, FERN); p.px(20, 6 + b, FOG);
    p.rect(10, 9 + b, 2, 2, LANTERN); p.rect(13, 9 + b, 2, 2, LANTERN);
    p.rect(10, 20 + b, 1, 2, FERN); p.rect(13, 20 + b, 1, 2, FERN);
  },
  pigman(p, f) {
    const h = f ? 1 : 0;
    p.rect(6, 12 - h, 12, 9, PINE); p.vline(8, 9 - h, 12, PINE); p.vline(15, 9 - h, 12, PINE);
    p.px(8, 13 - h, AMBER); p.px(15, 13 - h, AMBER); p.hline(7, 16, 16, SHADOW);
    p.rect(4, 12 - h, 2, 7, FOG); p.rect(18, 12 - h, 2, 7, FOG);
    E(p, 12, 7, 4.5, 4, FOG); E(p, 12, 9, 2.2, 1.6, MOON); p.px(11, 9 + f, VOID); p.px(13, 9 + f, VOID);
    p.px(10, 6, RED); p.px(14, 6, RED); p.px(8, 3, FOG); p.px(16, 3, FOG);
    p.rect(7, 21, 4, 1, SHADOW); p.rect(13, 21, 4, 1, SHADOW);
  },
  flatwoods(p, f) {
    const R = f ? 11 : 10;
    for (let a = 0; a < 40; a++) { const ang = (a / 40) * Math.PI * 2; p.px(12 + Math.cos(ang) * R, 11 + Math.sin(ang) * R * 0.95, MOON); }
    for (let y = 12; y < 23; y++) { const w = Math.round(2 + (y - 12) * 0.7); p.hline(12 - w, 11 + w, y, y % 3 ? FOREST : PINE); }
    for (let y = 1; y < 11; y++) { const w = Math.round(y < 4 ? y * 1.5 : 6 - (y - 4) * 0.4); p.hline(12 - w, 11 + w, y, CRAN); }
    E(p, 12, 8, 3, 3, SHADOW); p.px(11, 8, RED); p.px(13, 8, RED);
  },
  sasquatch(p, f) {
    const c = f ? 0.6 : 0;
    E(p, 12, 14, 7 + c, 8, SHADOW);
    for (let i = 0; i < 12; i++) p.px(6 + ((i * 7) % 13), 8 + ((i * 5) % 13), RUST);
    E(p, 12, 5, 4, 4, SHADOW); E(p, 12, 6, 2.5, 2.2, RUST);
    p.px(11, 5, LANTERN); p.px(13, 5, LANTERN);
    p.line(5, 9, 3, 20, SHADOW); p.line(19, 9, 21, 20, SHADOW); p.px(3, 20, RUST); p.px(21, 20, RUST);
    p.rect(8, 21, 3, 2, SHADOW); p.rect(13, 21, 3, 2, SHADOW);
  },
  thunderbird(p, f) {
    const wy = f ? 10 : 4;
    for (const side of [-1, 1]) {
      for (let k = 0; k < 10; k++) {
        const x = 12 + side * (3 + k), y = Math.round(11 + ((wy - 11) * k) / 9);
        p.vline(x, y, y + 3 - Math.floor(k / 4), k % 2 ? SHADOW : TWILIGHT);
      }
    }
    E(p, 12, 13, 3, 5, TWILIGHT); E(p, 12, 7, 2.5, 2.5, TWILIGHT); p.px(13, 7, LANTERN); p.rect(14, 8, 2, 1, LANTERN);
    p.px(11, 4, LANTERN); p.px(12, 3, LANTERN); p.px(13, 4, LANTERN); p.px(12, 2, LANTERN);
    p.line(11, 18, 10, 21, SHADOW); p.line(13, 18, 14, 21, SHADOW);
    for (const [x, y] of f ? [[3, 3], [20, 18]] : [[21, 2], [3, 17]]) { p.px(x, y, LANTERN); p.px(x + 1, y + 1, MIST); }
  },
  indrid_cold(p, f) {
    p.rect(8, 10, 8, 10, FOREST);
    for (let y = 10; y < 20; y++) for (let x = 8; x < 16; x++) if ((x + y + f) % 4 === 0) p.px(x, y, FERN);
    p.vline(11, 10, 15, PINE); p.vline(12, 10, 15, PINE);
    p.rect(9, 20, 2, 2, PINE); p.rect(13, 20, 2, 2, PINE);
    p.rect(6, 10, 2, 8, FOREST); p.rect(16, 10, 2, 8, FOREST);
    E(p, 12, 5, 3.5, 4, VOID);
    p.hline(10, 14, 7, FOG); p.px(9, 6, FOG); p.px(15, 6, FOG);
  },
  bray_road(p, f) {
    const s = f ? 1 : 0;
    E(p, 12, 13, 6, 7, SHADOW); E(p, 12, 13, 3, 4, TWILIGHT);
    E(p, 12, 5, 4, 3, SHADOW); p.rect(14, 5, 5, 2, SHADOW);
    p.px(9, 1, SHADOW); p.px(9, 2, SHADOW); p.px(14, 1, SHADOW); p.px(14, 2, SHADOW);
    p.px(12, 4, LANTERN); p.px(15, 7 + s, LANTERN); p.px(17, 7 + s, LANTERN); p.rect(14, 7, 5, s, VOID);
    p.line(6, 9, 3, 17, SHADOW); p.line(18, 9, 21, 17, SHADOW);
    p.px(2, 18 - s, LANTERN); p.px(22, 18 - s, LANTERN);
    p.rect(8, 19, 3, 3, SHADOW); p.rect(13, 19, 3, 3, SHADOW);
  },
  wendigo(p, f) {
    const hx = f ? 1 : 0;
    p.rect(10, 9, 4, 11, SHADOW);
    for (const y of [11, 13, 15]) p.hline(9, 14, y, FOG);
    p.line(10, 10, 5, 19, SHADOW); p.line(13, 10, 18, 19, SHADOW);
    p.line(11, 20, 10, 23, SHADOW); p.line(12, 20, 13, 23, SHADOW);
    E(p, 12 + hx, 6, 2.5, 3, SHADOW);
    p.px(11 + hx, 6, RED); p.px(13 + hx, 6, RED);
    const a = LANTERN;
    p.line(11 + hx, 4, 6 + hx, 0, a); p.line(8 + hx, 2, 6 + hx, 3, a); p.px(5 + hx, 1, a);
    p.line(13 + hx, 4, 18 + hx, 0, a); p.line(16 + hx, 2, 18 + hx, 3, a); p.px(19 + hx, 1, a);
    if (f) { p.px(16, 8, FOG); p.px(17, 7, MOON); p.px(18, 8, FOG); } else { p.px(15, 9, MOON); }
  },
  weaver(p, f) {
    for (let y = 2; y < 23; y++) { const w = Math.round(2 + y * 0.35); p.hline(12 - w, 11 + w, y, y < 7 ? MOON : y % 4 ? MOON : FOG); }
    E(p, 12, 5, 2.5, 2.5, SHADOW); p.px(11, 5, FOG); p.px(13, 5, FOG);
    for (const [x, y] of [[9, 11], [14, 13], [10, 17], [15, 19], [12, 15]]) p.px(x, y, TWILIGHT);
    for (const side of [-1, 1]) for (let k = 0; k < 7; k++) p.px(12 + side * (6 + k), 9 + k + Math.round(Math.sin(k + f * 2)), FOG);
  },
  awful(p, f) {
    const s = f ? 2 : 0;
    for (const side of [-1, 1]) for (let k = 0; k < 7 + s; k++) {
      const x = 12 + side * (2 + k), y = 6 + Math.round(k * 0.4) - s;
      p.vline(x, y, y + 4, k === 6 + s ? LANTERN : SHADOW);
    }
    E(p, 11, 16, 7, 4.5, AMBER); E(p, 11, 18, 5, 2, RUST);
    for (const x of [6, 9, 13, 16]) { p.rect(x, 19, 2, 3, AMBER); p.px(x, 22, RED); p.px(x + 1, 22, RED); }
    E(p, 18, 10, 3, 3, LANTERN); p.px(19, 9, VOID); p.rect(20, 11, 2, 1, AMBER); p.px(21, 12, AMBER);
    p.px(17, 7 - f, SHADOW); p.px(18, 6 - f, SHADOW); p.px(16, 7, SHADOW);
    p.line(4, 15, 1, 12 + f, RUST);
  },
};

const ALBINO_SWAP: Array<[number, number]> = [
  [VOID, FOG], [SHADOW, MOON], [PINE, MOON], [FOREST, FOG], [MOSS, FOG], [FERN, MOON], [AMBER, FOG],
  [RUST, MOON], [CRAN, MOON], [TWILIGHT, MOON], [MIST, FOG], [VIOLET, MOON], [LANTERN, FOG],
];

const cache = new Map<string, Canv>();

function baseDraw(id: string, f: number): Canv {
  const { c, g } = makeCanvas(24, 24);
  (DRAW[id] ?? DRAW.jackalope)(new Pen(g), f);
  return c;
}

function addAura(src: Canv, f: number): Canv {
  const { c, g } = makeCanvas(24, 24);
  g.drawImage(src, 0, 0);
  const d = g.getImageData(0, 0, 24, 24).data;
  const op = (x: number, y: number) => x >= 0 && y >= 0 && x < 24 && y < 24 && d[(y * 24 + x) * 4 + 3] > 0;
  const p = new Pen(g);
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
    if (op(x, y)) continue;
    if (op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1)) {
      const h = hash2(x, y, 77 + f);
      if (h < 0.35) p.px(x, y, MIST);
      else if (h < 0.5) p.px(x, y, LANTERN);
    }
  }
  return c;
}

export function cryptidFrame(id: string, variant: Variant, f: number): Canv {
  const key = `${id}|${variant}|${f}`;
  let c = cache.get(key);
  if (c) return c;
  let s = baseDraw(id, f);
  if (variant === 'albino') s = recolor(s, ALBINO_SWAP);
  if (variant === 'static') s = recolor(s, [[SHADOW, TWILIGHT], [VOID, TWILIGHT]]);
  s = outline(s);
  if (variant === 'static') s = addAura(s, f);
  cache.set(key, s);
  return s;
}

/** Solid silhouette for unlogged Dex entries and summon shadows. */
export function cryptidSilhouette(id: string, color: number = SHADOW, eyes = false): Canv {
  const key = `${id}|sil|${color}|${eyes}`;
  let c = cache.get(key);
  if (c) return c;
  const src = baseDraw(id, 0);
  const swaps: Array<[number, number]> = [];
  for (let i = 0; i < 16; i++) if (!(eyes && (i === RED || i === LANTERN))) swaps.push([i, color]);
  c = outline(recolor(src, swaps));
  cache.set(key, c);
  return c;
}

export function bakeCryptids(): void {
  for (const cr of CRYPTIDS) {
    cryptidFrame(cr.id, 'normal', 0);
    cryptidFrame(cr.id, 'normal', 1);
    // Specimen icon: a shrunken portrait on a paper tag
    const { c, g } = makeCanvas(16, 16);
    const p = new Pen(g);
    p.rect(1, 1, 14, 14, LANTERN); p.rect(1, 1, 14, 1, AMBER); p.rect(1, 14, 14, 1, RUST);
    g.drawImage(cryptidFrame(cr.id, 'normal', 0), 2, 2, 12, 12);
    p.px(13, 2, RED);
    ICON[cr.drop.id] ??= outline(c);
  }
}
