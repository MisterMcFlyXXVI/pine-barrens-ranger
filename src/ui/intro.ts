/**
 * Firewatch-style story panels: a skippable 4-panel GBC pixel-art sequence
 * used for the New Game intro and the campaign epilogue, plus the act card.
 */
import { fillName } from '../data/appearance';
import type { Game } from '../engine/game';
import type { Overlay } from './overlay';
import { hex, P } from '../graphics/palette';
import { drawText, drawTextCentered, wrapText } from '../graphics/font';
import { STRUCT } from '../graphics/sprites';
import { cryptidFrame } from '../graphics/cryptidSprites';
import { playerFrame, personFrame } from '../graphics/playerSprite';
import { NPCS_BY_ID } from '../data/npcs';
import { INTRO_TEXT, INTRO_CABIN, EPILOGUE_TEXT, BARNEY_ASKS, BARNEY_REPLY, REASONS, REASON_CHOICE, REASON_LABEL } from '../data/campaign';
import type { Reason } from '../data/campaign';
import { Dialog } from './menus';
import { recolor } from '../graphics/canvas';
import type { Canv } from '../graphics/canvas';
import { sfx } from '../audio/sfx';
import { panel } from './panel';
import { hash2 } from '../util';

/** Art painter for one panel: draws into the frame rect (already clipped). */
type Art = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number) => void;

const fill = (g: CanvasRenderingContext2D, c: number, x: number, y: number, w: number, h: number) => { g.fillStyle = hex(c); g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

function stars(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number, n = 30): void {
  for (let i = 0; i < n; i++) {
    if ((Math.floor(t * 2 + i) % 9) === 0) continue;
    fill(g, i % 4 ? P.FOG : P.MOON, x + hash2(i, 1, 3) * w, y + hash2(i, 2, 3) * h, 1, 1);
  }
}

function treeline(g: CanvasRenderingContext2D, x: number, base: number, w: number, color: number, seed: number, hgt = 26): void {
  g.fillStyle = hex(color);
  for (let i = -4; i < w + 8; i += 7) {
    const th = hgt * 0.6 + hash2(i, seed, 9) * hgt * 0.5;
    for (let k = 0; k < th; k++) {
      const half = Math.floor((k / th) * 5) + 1;
      g.fillRect(Math.round(x + i - half), Math.round(base - th + k), half * 2, 1);
    }
  }
  g.fillRect(x, base, w, 20);
}

function fogBands(g: CanvasRenderingContext2D, x: number, y: number, w: number, t: number, n = 4): void {
  g.fillStyle = hex(P.FOG);
  for (let i = 0; i < n; i++) {
    g.globalAlpha = 0.18;
    const fx = ((t * (6 + i * 3) + i * 47) % (w + 80)) - 60;
    g.fillRect(Math.round(x + fx), Math.round(y + i * 5), 70, 4);
    g.fillRect(Math.round(x + fx - w - 80), Math.round(y + i * 5), 70, 4);
  }
  g.globalAlpha = 1;
}

/* ---------------- intro art ---------------- */

const adArt: Art = (g, x, y, w, h) => {
  fill(g, P.RUST, x, y, w, h);
  const pw = Math.min(w - 16, 150), ph = h - 12;
  const px = x + (w - pw) / 2, py = y + 6;
  fill(g, P.LANTERN, px, py, pw, ph);
  fill(g, P.AMBER, px, py + ph - 2, pw, 2);
  drawTextCentered(g, 'THE HOLLER GAZETTE', px + pw / 2, py + 4, P.CRAN);
  fill(g, P.CRAN, px + 4, py + 11, pw - 8, 1);
  drawText(g, 'CLASSIFIEDS', px + 5, py + 15, P.RUST);
  fill(g, P.VOID, px + 4, py + 22, pw - 8, ph - 28);
  fill(g, P.FOG, px + 5, py + 23, pw - 10, ph - 30);
  const lines = wrapText('HELP WANTED: OVERNIGHT FIRE-WATCH RANGER. PINE HOLLOW, W.VA. ROOM & BOARD. NO QUESTIONS.', pw - 16);
  lines.slice(0, 5).forEach((l, i) => drawText(g, l, px + 8, py + 26 + i * 7, P.SHADOW));
  const tx = px + pw - 18, ty = py + 15;
  for (let k = 0; k < 6; k++) fill(g, P.FOREST, tx - k, ty + k, k * 2 + 1, 1);
};

const fogArt: Art = (g, x, y, w, h, t) => {
  fill(g, P.SHADOW, x, y, w, h);
  stars(g, x, y, w, h * 0.5, t);
  fill(g, P.MOON, x + w * 0.8, y + 8, 8, 8);
  treeline(g, x, y + h * 0.72, w, P.PINE, 1);
  const walk = (t * 6) % (w * 0.5);
  const fx = x + w * 0.25 + walk, fy = y + h * 0.72 - 9;
  fill(g, P.VOID, fx, fy, 3, 8); fill(g, P.VOID, fx - 1, fy - 3, 4, 3);
  fill(g, P.LANTERN, fx + 3, fy + 3, 2, 2);
  fogBands(g, x, y + h * 0.55, w, t, 5);
  g.globalAlpha = Math.min(0.7, walk / (w * 0.5));
  fill(g, P.FOG, fx - 6, fy - 6, 16, 16);
  g.globalAlpha = 1;
};

const towerArt: Art = (g, x, y, w, h, t) => {
  fill(g, P.VOID, x, y, w, h);
  stars(g, x, y, w, h * 0.6, t, 40);
  const tx = x + w * 0.66, base = y + h * 0.62;
  for (let k = 0; k < 34; k++) { const half = Math.round((k / 34) * 6) + 1; fill(g, P.TWILIGHT, tx - half, base - 34 + k, 1, 1); fill(g, P.TWILIGHT, tx + half, base - 34 + k, 1, 1); }
  if (Math.floor(t * 1.5) % 2 === 0) { fill(g, P.RED, tx - 1, base - 37, 3, 3); g.globalAlpha = 0.3; fill(g, P.RED, tx - 4, base - 40, 9, 9); g.globalAlpha = 1; }
  treeline(g, x, base + 4, w, P.SHADOW, 2, 18);
  fill(g, P.AMBER, x, y + h - 14, w, 14);
  const vx = x + w * 0.2 + Math.sin(t) * 2, vy = y + h - 22;
  fill(g, P.CRAN, vx, vy, 22, 8); fill(g, P.CRAN, vx + 4, vy - 5, 12, 5); fill(g, P.TWILIGHT, vx + 6, vy - 4, 8, 3);
  fill(g, P.VOID, vx + 2, vy + 7, 4, 3); fill(g, P.VOID, vx + 15, vy + 7, 4, 3);
  g.globalAlpha = 0.35; fill(g, P.LANTERN, vx + 22, vy + 1, 30, 6); g.globalAlpha = 1;
  fill(g, P.LANTERN, vx + 21, vy + 2, 2, 2);
};

const cabinArt: Art = (g, x, y, w, h, t) => {
  fill(g, P.SHADOW, x, y, w, h);
  stars(g, x, y, w, h * 0.4, t);
  treeline(g, x, y + h * 0.5, w, P.PINE, 3, 22);
  fill(g, P.FOREST, x, y + h * 0.5, w, h * 0.5);
  const cab = STRUCT.cabin[1];
  const s = Math.min(1, (h - 10) / cab.height);
  const cw = cab.width * s, ch = cab.height * s;
  g.drawImage(cab, Math.round(x + (w - cw) / 2), Math.round(y + h - ch - 4), Math.round(cw), Math.round(ch));
  const pl = playerFrame({ outfit: 'ranger_jacket', hat: 'ranger_cap' }, 'down', 0, 'walk');
  g.drawImage(pl, Math.round(x + w / 2 - 6), Math.round(y + h - 26));
  g.globalAlpha = 0.18 + Math.sin(t * 6) * 0.04;
  fill(g, P.LANTERN, x + w / 2 - 18, y + h - 34, 36, 30);
  g.globalAlpha = 1;
};

/* ---------------- epilogue art ---------------- */

/** Dawn at the C&O station: rails running into mist, and Elias walking the ties with the carving. */
const dawnArt: Art = (g, x, y, w, h, t) => {
  const bands = [P.VIOLET, P.CRAN, P.AMBER, P.LANTERN];
  bands.forEach((c, i) => fill(g, c, x, y + (i * h * 0.5) / 4, w, h * 0.5 / 4 + 1));
  treeline(g, x, y + h * 0.58, w, P.PINE, 4);
  fill(g, P.RUST, x, y + h * 0.58, w, h);
  // platform on the left, rails converging into the mist
  fill(g, P.AMBER, x, y + h * 0.62, w * 0.28, h);
  for (let k = 0; k < 6; k++) fill(g, P.RUST, x, y + h * 0.62 + k * 6, w * 0.28, 1);
  const vx = x + w * 0.6;
  for (let yy = 0; yy < h * 0.42; yy += 3) { const sp = 4 + yy * 0.5; fill(g, P.SHADOW, vx - sp - 2, y + h * 0.58 + yy, sp * 2 + 4, 1); }
  for (let yy = 0; yy < h * 0.42; yy++) { const sp = 2 + yy * 0.35; fill(g, P.MIST, vx - sp, y + h * 0.58 + yy, 1, 1); fill(g, P.MIST, vx + sp, y + h * 0.58 + yy, 1, 1); }
  const walk = Math.min(1, t / 6);
  const v = personFrame(NPCS_BY_ID.vance.body, NPCS_BY_ID.vance.look, 'down', Math.floor(t * 3) % 3, 'walk');
  const vy = y + h * 0.5 + walk * h * 0.2, vs = 1 + walk * 0.5;
  g.drawImage(v, Math.round(vx - 12 * vs), Math.round(vy - 8 * vs), Math.round(24 * vs), Math.round(24 * vs));
  g.drawImage(carvingSprite(), Math.round(vx - 6 * vs), Math.round(vy + 2 * vs), Math.round(12 * vs), Math.round(12 * vs));
  fogBands(g, x, y + h * 0.5, w, t, 5);
};

/** The carving itself on the platform boards. */
const carvingArt: Art = (g, x, y, w, h, t) => {
  fill(g, P.LANTERN, x, y, w, h * 0.45);
  fill(g, P.AMBER, x, y + h * 0.45, w, h);
  for (let k = 0; k < 8; k++) fill(g, P.RUST, x, y + h * 0.45 + k * 8, w, 1);
  const s = Math.max(2, Math.floor(Math.min(w, h) / 30));
  g.globalAlpha = 0.3; fill(g, P.RUST, x + w / 2 - 12 * s, y + h * 0.82, 24 * s, 3 * s); g.globalAlpha = 1;
  g.drawImage(carvingSprite(), Math.round(x + w / 2 - 12 * s), Math.round(y + h * 0.84 - 24 * s), 24 * s, 24 * s);
  // morning light glints
  if (Math.floor(t * 2) % 3 === 0) fill(g, P.FOG, x + w / 2 + 4 * s, y + h * 0.84 - 18 * s, 2, 2);
};

/** Agnes coming down the platform; Barney at the whistle; the ranger holding a brass key. */
const reunionArt: Art = (g, x, y, w, h, t) => {
  const bands = [P.CRAN, P.AMBER, P.LANTERN, P.LANTERN];
  bands.forEach((c, i) => fill(g, c, x, y + (i * h * 0.5) / 4, w, h * 0.5 / 4 + 1));
  treeline(g, x, y + h * 0.55, w, P.FOREST, 7);
  fill(g, P.AMBER, x, y + h * 0.62, w, h);
  for (let k = 0; k < 6; k++) fill(g, P.RUST, x, y + h * 0.62 + k * 7, w, 1);
  const base = y + h * 0.62 - 6;
  const pos: Array<[string, number, 'left' | 'right']> = [['barnaby', 0.12, 'right'], ['vance', 0.58, 'left'], ['agnes', 0.82 - Math.min(0.14, t * 0.03), 'left']];
  for (const [id, fx, dir] of pos) g.drawImage(personFrame(NPCS_BY_ID[id as 'vance'].body, NPCS_BY_ID[id as 'vance'].look, dir, id === 'agnes' ? Math.floor(t * 6) % 3 : 0, 'walk'), Math.round(x + w * fx - 12), Math.round(base));
  g.drawImage(playerFrame({ outfit: 'ranger_jacket', hat: 'ranger_cap' }, 'right', 0, 'walk'), Math.round(x + w * 0.36 - 12), Math.round(base));
  fill(g, P.LANTERN, x + w * 0.36 + 6, base + 13, 3, 2); // the key
  // whistle steam
  for (let k = 0; k < 4; k++) { g.globalAlpha = 0.5 - k * 0.1; fill(g, P.FOG, x + w * 0.12 + 4 + k * 3, base - 6 - k * 5 - (t * 6) % 5, 5 + k, 4); }
  g.globalAlpha = 1;
};

const mineArt: Art = (g, x, y, w, h, t) => {
  fill(g, P.VOID, x, y, w, h);
  const mine = STRUCT.mineOpen?.[0] ?? STRUCT.mine[0];
  g.drawImage(mine, Math.round(x + w / 2 - mine.width / 2), Math.round(y + h - mine.height));
  if (Math.floor(t * 0.8) % 3 !== 0) { fill(g, P.RED, x + w / 2 - 4, y + h - 34, 2, 1); fill(g, P.RED, x + w / 2 + 2, y + h - 34, 2, 1); }
  g.globalAlpha = 0.5 + Math.sin(t * 3) * 0.2; fill(g, P.LANTERN, x + w / 2 - 1, y + h - 20, 2, 2); g.globalAlpha = 1;
};

export const INTRO_ARTS: readonly Art[] = [adArt, fogArt, towerArt, cabinArt];
export const EPILOGUE_ARTS: readonly Art[] = [dawnArt, carvingArt, reunionArt, mineArt];

export class StoryPanels implements Overlay {
  closed = false;
  private idx = 0;
  private t = 0;
  private shown = 0;
  private blip = 0;

  constructor(
    private readonly texts: readonly string[],
    private readonly arts: readonly Art[],
    private readonly onDone: () => void,
    private readonly skippable = true,
  ) {}

  private finish(): void {
    this.closed = true;
    this.onDone();
  }

  update(game: Game, dt: number): void {
    this.t += dt;
    const inp = game.input;
    const text = fillName(this.texts[this.idx]);
    if (this.skippable && inp.pressed('b')) { sfx.cancel(); this.finish(); return; }
    if (this.shown < text.length) {
      this.shown = Math.min(text.length, this.shown + dt * 45);
      this.blip += dt;
      if (this.blip > 0.07) { this.blip = 0; sfx.type(); }
      if ((inp.pressed('a') || inp.taps.length) && this.t > 0.25) this.shown = text.length;
      return;
    }
    if (inp.pressed('a') || inp.taps.length) {
      sfx.blip();
      if (this.idx >= this.texts.length - 1) { this.finish(); return; }
      this.idx++; this.shown = 0; this.t = 0;
    }
  }

  draw(game: Game, g: CanvasRenderingContext2D): void {
    const W = game.w, H = game.h;
    fill(g, P.VOID, 0, 0, W, H);
    const lines = wrapText(fillName(this.texts[this.idx]), Math.min(W - 16, 260) - 10);
    const boxH = Math.max(4, lines.length) * 8 + 10;
    const fw = Math.min(W - 16, 260), fh = Math.max(60, Math.min(H - boxH - 30, 150));
    const fx = Math.floor((W - fw) / 2), fy = Math.max(6, Math.floor((H - fh - boxH - 14) / 2));
    // framed art panel
    fill(g, P.FOG, fx - 3, fy - 3, fw + 6, fh + 6);
    fill(g, P.VOID, fx - 1, fy - 1, fw + 2, fh + 2);
    g.save();
    g.beginPath(); g.rect(fx, fy, fw, fh); g.clip();
    this.arts[this.idx](g, fx, fy, fw, fh, this.t);
    g.restore();
    // text box
    const by = fy + fh + 8;
    panel(g, fx - 3, by, fw + 6, boxH);
    let left = Math.floor(this.shown);
    lines.forEach((l, k) => { if (left > 0) drawText(g, l.slice(0, left), fx + 3, by + 5 + k * 8, P.FOG); left -= l.length + 1; });
    // pager dots + hints
    for (let i = 0; i < this.texts.length; i++) fill(g, i === this.idx ? P.LANTERN : P.PINE, W / 2 - this.texts.length * 4 + i * 8, by + boxH + 4, 4, 2);
    if (this.skippable) drawText(g, 'B: SKIP', 4, H - 8, P.PINE);
    if (this.shown >= fillName(this.texts[this.idx]).length && Math.floor(game.time * 3) % 2 === 0) drawText(g, 'A >', W - 16, H - 8, P.LANTERN);
  }
}

/** Big act-title card ("ACT II / RESTORING PINE HOLLOW"). */
export class ActCard implements Overlay {
  closed = false;
  private t = 0;

  constructor(private readonly num: string, private readonly title: string) {}

  update(game: Game, dt: number): void {
    this.t += dt;
    if (this.t > 0.6 && (game.input.pressed('a') || game.input.pressed('b') || game.input.taps.length)) this.closed = true;
    if (this.t > 4) this.closed = true;
  }

  draw(game: Game, g: CanvasRenderingContext2D): void {
    const W = game.w, H = game.h;
    const k = Math.min(1, this.t * 3);
    g.globalAlpha = 0.7 * k; fill(g, P.VOID, 0, 0, W, H); g.globalAlpha = 1;
    const bh = 44, by = Math.floor(H / 2 - bh / 2);
    const bw = Math.round(W * k);
    fill(g, P.SHADOW, (W - bw) / 2, by, bw, bh);
    fill(g, P.AMBER, (W - bw) / 2, by, bw, 2); fill(g, P.AMBER, (W - bw) / 2, by + bh - 2, bw, 2);
    if (k >= 1) {
      drawTextCentered(g, this.num, W / 2, by + 8, P.AMBER, P.VOID, 2);
      drawTextCentered(g, this.title.toUpperCase(), W / 2, by + 26, P.LANTERN, P.VOID);
    }
  }
}

/** The drive up: ad, legend and Barney's truck, then his question, then the cabin. */
export function playIntro(game: Game, onDone: () => void): void {
  game.openOverlay(new StoryPanels(INTRO_TEXT, INTRO_ARTS.slice(0, 3), () => askWhy(game, onDone)));
}

function askWhy(game: Game, onDone: () => void): void {
  const pick = (r: Reason) => () => {
    game.progress.reason = r;
    game.openOverlay(new StoryPanels(INTRO_CABIN, [cabinArt], onDone));
    game.openOverlay(new Dialog([`You: "${REASON_CHOICE[r]}"`, ...BARNEY_REPLY[r]]));
  };
  game.openOverlay(new Dialog([...BARNEY_ASKS], REASONS.map((r) => ({ label: REASON_LABEL[r], fn: pick(r) }))));
}

let carvingCache: Canv | null = null;
/** Elias's hand-carved Sheepsquatch: the cryptid's own sprite, in ridge white oak. */
export function carvingSprite(): Canv {
  if (!carvingCache) {
    carvingCache = recolor(cryptidFrame('sheepsquatch', 'normal', 0), [
      [P.FOG, P.LANTERN], [P.MOON, P.LANTERN], [P.LANTERN, P.AMBER], [P.AMBER, P.RUST], [P.SHADOW, P.RUST], [P.RED, P.CRAN],
      [P.MIST, P.AMBER], [P.TWILIGHT, P.RUST], [P.VIOLET, P.AMBER], [P.PINE, P.RUST], [P.FOREST, P.RUST], [P.MOSS, P.AMBER], [P.FERN, P.LANTERN],
    ]);
  }
  return carvingCache;
}

export function playEpilogue(game: Game, onDone: () => void): void {
  game.openOverlay(new StoryPanels(EPILOGUE_TEXT, EPILOGUE_ARTS, onDone, false));
}
