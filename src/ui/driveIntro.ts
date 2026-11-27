/**
 * The drive up: the New Game intro as one continuous, letterboxed cinematic.
 *
 *   1. ad      : the classified on a kitchen table at night, circled in red pen.
 *   2. legend  : a storm on the ridge; Elias's lantern climbing away, a white shape in the lightning.
 *   3. highway : Barney's old pickup on the mountain road, parallax ridges, signs, the tower blinking.
 *   4. cab     : through the windshield, the road winding into the dark. Barney asks why you came
 *                (his dialog sits over the moving scene), then two red eyes in the headlights.
 *   5. arrive  : the truck pulls up at the cabin; you climb out with your bag and Barney heads home.
 *
 * Everything is drawn here, from the palette; the world behind stays hidden until the fade.
 * A: next   B: skip (to Barney's question, then to the end).
 */
import type { Game } from '../engine/game';
import type { Overlay } from './overlay';
import { textRate } from '../engine/settings';
import { fillName, bodyFor } from '../data/appearance';
import { INTRO_TEXT, INTRO_CABIN, BARNEY_ASKS, BARNEY_REPLY, REASONS, REASON_CHOICE, REASON_LABEL } from '../data/campaign';
import type { Reason } from '../data/campaign';
import { hex, P } from '../graphics/palette';
import { drawText, drawTextCentered, wrapText } from '../graphics/font';
import { STRUCT } from '../graphics/sprites';
import { playerFrame } from '../graphics/playerSprite';
import { cryptidSilhouette } from '../graphics/cryptidSprites';
import { Dialog } from './menus';
import { sfx } from '../audio/sfx';
import { hash2 } from '../util';

type Beat = 'ad' | 'legend' | 'highway' | 'cab' | 'eyes' | 'arrive';
const ORDER: Beat[] = ['ad', 'legend', 'highway', 'cab', 'eyes', 'arrive'];

type G = CanvasRenderingContext2D;
const fill = (g: G, c: number, x: number, y: number, w: number, h: number) => { g.fillStyle = hex(c); g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
const alpha = (g: G, a: number, fn: () => void) => { const o = g.globalAlpha; g.globalAlpha = o * Math.max(0, Math.min(1, a)); fn(); g.globalAlpha = o; };

/** Rolling ridge height at world x (sum of a few sines, seeded per layer). */
function ridge(x: number, seed: number, amp: number): number {
  return (Math.sin(x * 0.011 + seed) * 0.5 + Math.sin(x * 0.023 + seed * 2.1) * 0.3 + Math.sin(x * 0.051 + seed * 3.7) * 0.2) * amp;
}

function stars(g: G, x: number, y: number, w: number, h: number, t: number, n = 40, drift = 0): void {
  for (let i = 0; i < n; i++) {
    if ((Math.floor(t * 2 + i * 1.3) % 11) === 0) continue;
    const sx = (((hash2(i, 1, 7) * w - drift) % w) + w) % w;
    fill(g, i % 5 ? P.FOG : P.MOON, x + sx, y + hash2(i, 2, 7) * h, 1, 1);
  }
}

/** A dark pine, point up, `s` tall, standing on (x, base). */
function pine(g: G, x: number, base: number, s: number, c: number): void {
  g.fillStyle = hex(c);
  for (let k = 0; k < s; k++) {
    const half = Math.max(0, Math.floor((k / s) * s * 0.32 + (k % 4 === 3 ? -1 : 0)));
    g.fillRect(Math.round(x - half), Math.round(base - s + k), half * 2 + 1, 1);
  }
  g.fillRect(Math.round(x), Math.round(base), 1, Math.max(1, Math.round(s * 0.12)));
}

/** Banded sky with a checker dither where the bands meet (no hard lines). */
function skyBands(g: G, x: number, y: number, w: number, h: number, cols: number[]): void {
  const bh = h / cols.length;
  cols.forEach((c, i) => fill(g, c, x, y + i * bh, w, bh + 1));
  for (let i = 1; i < cols.length; i++) {
    if (cols[i] === cols[i - 1]) continue;
    const by = Math.round(y + i * bh);
    for (let r = -3; r < 3; r++) {
      g.fillStyle = hex(r < 0 ? cols[i] : cols[i - 1]);
      const every = r === -3 || r === 2 ? 4 : 2;
      for (let sx = (r & 1); sx < w; sx += every) g.fillRect(Math.round(x + sx), by + r, 1, 1);
    }
  }
}

function moon(g: G, x: number, y: number, r: number): void {
  alpha(g, 0.12, () => { g.fillStyle = hex(P.MOON); g.beginPath(); g.arc(x, y, r * 2.2, 0, Math.PI * 2); g.fill(); });
  g.fillStyle = hex(P.MOON); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  fill(g, P.FOG, x - r * 0.4, y - r * 0.3, Math.max(1, r * 0.35), Math.max(1, r * 0.35));
  fill(g, P.VIOLET, x + r * 0.2, y + r * 0.2, Math.max(1, r * 0.3), Math.max(1, r * 0.25));
}

export class DriveIntro implements Overlay {
  closed = false;
  private beat = 0;
  private bt = 0;
  private shown = 0;
  private blip = 0;
  private asked = false;
  private fadeOut = -1;
  private nextThunder = 1.2;
  private flash = 0;

  constructor(private readonly game: Game, private readonly onDone: () => void) {}

  private get cur(): Beat { return ORDER[this.beat]; }

  private text(): string {
    switch (this.cur) {
      case 'ad': return INTRO_TEXT[0];
      case 'legend': return INTRO_TEXT[1];
      case 'highway': return INTRO_TEXT[2];
      case 'cab': return BARNEY_ASKS[0];
      case 'eyes': return 'Far up the road, something tall stands in the lane. Two red eyes catch the headlights... and then the road is empty. Barney: "...Deer." He drives a little faster.';
      case 'arrive': return INTRO_CABIN[0];
    }
  }

  /** The least time a beat stays up (so its animation can land). */
  private minTime(): number { return this.cur === 'arrive' ? 6.5 : this.cur === 'eyes' ? 2.4 : 0.8; }

  private go(i: number): void {
    this.beat = i; this.bt = 0; this.shown = 0;
    if (this.cur === 'cab') sfx.radioStatic();
    if (this.cur === 'arrive') sfx.door();
  }

  private ask(): void {
    this.asked = true;
    const pick = (r: Reason) => () => {
      this.game.progress.reason = r;
      this.game.openOverlay(new Dialog([`You: "${REASON_CHOICE[r]}"`, ...BARNEY_REPLY[r]]));
      this.go(ORDER.indexOf('eyes'));
    };
    this.game.openOverlay(new Dialog([BARNEY_ASKS[1]], REASONS.map((r) => ({ label: REASON_LABEL[r], fn: pick(r) }))));
  }

  private finish(): void {
    if (this.fadeOut < 0) this.fadeOut = 0;
  }

  update(game: Game, dt: number): void {
    if (this.fadeOut >= 0) {
      this.fadeOut += dt;
      if (this.fadeOut > 0.9) { this.closed = true; this.onDone(); }
      return;
    }
    this.bt += dt;
    const inp = game.input;
    // Skip: up to Barney's question (it matters), then to the end.
    if (inp.pressed('b')) {
      sfx.cancel();
      if (!this.asked) { this.go(ORDER.indexOf('cab')); this.shown = this.text().length; this.ask(); }
      else this.finish();
      return;
    }
    const text = fillName(this.text());
    if (this.shown < text.length) {
      this.shown = Math.min(text.length, this.shown + dt * textRate(45));
      this.blip += dt;
      if (this.blip > 0.07) { this.blip = 0; sfx.type(); }
      if ((inp.pressed('a') || inp.taps.length) && this.bt > 0.25) this.shown = text.length;
      return;
    }
    if ((inp.pressed('a') || inp.taps.length) && this.bt >= this.minTime()) {
      sfx.blip();
      if (this.cur === 'cab' && !this.asked) { this.ask(); return; }
      if (this.beat >= ORDER.length - 1) { this.finish(); return; }
      this.go(this.beat + 1);
    }
    // Storm: thunder with the lightning.
    if (this.cur === 'legend') {
      this.nextThunder -= dt;
      if (this.nextThunder <= 0) { this.nextThunder = 3 + Math.random() * 2.5; this.flash = 0.35; sfx.thunder(); }
    }
    this.flash = Math.max(0, this.flash - dt);
  }

  /* ------------------------------------------------------------------ */

  draw(game: Game, g: G): void {
    const W = game.w, H = game.h, t = game.time;
    fill(g, P.VOID, 0, 0, W, H);
    const lines = wrapText(fillName(this.text()), Math.min(W - 20, 300));
    const capH = Math.max(3, lines.length) * 8 + 12;
    const barT = Math.max(6, Math.round(H * 0.06));
    const sy = barT, sh = H - barT - capH;
    g.save();
    g.beginPath(); g.rect(0, sy, W, sh); g.clip();
    switch (this.cur) {
      case 'ad': this.drawAd(g, 0, sy, W, sh, t); break;
      case 'legend': this.drawLegend(g, 0, sy, W, sh, t); break;
      case 'highway': this.drawHighway(g, 0, sy, W, sh, t); break;
      case 'cab': case 'eyes': this.drawCab(g, 0, sy, W, sh, t); break;
      case 'arrive': this.drawArrive(g, 0, sy, W, sh, t); break;
    }
    g.restore();
    // Beat fade-in.
    if (this.bt < 0.5) alpha(g, 1 - this.bt / 0.5, () => fill(g, P.VOID, 0, sy, W, sh));
    // Letterbox and caption (hidden while Barney's dialog is up).
    fill(g, P.VOID, 0, 0, W, barT);
    fill(g, P.VOID, 0, H - capH, W, capH);
    const dialogUp = game.overlays[game.overlays.length - 1] !== this;
    if (!dialogUp) {
      let left = Math.floor(this.shown);
      const tx = Math.floor((W - Math.min(W - 20, 300)) / 2);
      lines.forEach((l, k) => { if (left > 0) drawText(g, l.slice(0, left), tx, H - capH + 6 + k * 8, P.FOG); left -= l.length + 1; });
      for (let i = 0; i < ORDER.length; i++) fill(g, i === this.beat ? P.LANTERN : P.PINE, W / 2 - ORDER.length * 4 + i * 8, sy - 4, 4, 2);
      drawText(g, 'B: SKIP', 4, 1 + Math.max(0, barT - 8), P.PINE);
      if (this.shown >= fillName(this.text()).length && this.bt >= this.minTime() && Math.floor(t * 3) % 2 === 0) drawText(g, 'A >', W - 18, H - 9, P.LANTERN);
    }
    if (this.fadeOut >= 0) alpha(g, this.fadeOut / 0.9, () => fill(g, P.VOID, 0, 0, W, H));
  }

  /* 1. The classified, circled in red, on a kitchen table at night. */
  private drawAd(g: G, x: number, y: number, w: number, h: number, t: number): void {
    // Table planks under a hanging lamp.
    for (let k = 0; k * 9 < h; k++) { fill(g, k % 2 ? P.RUST : P.CRAN, x, y + k * 9, w, 9); fill(g, P.SHADOW, x, y + k * 9 + 8, w, 1); }
    for (let i = 0; i < 18; i++) fill(g, P.CRAN, x + hash2(i, 3, 2) * w, y + hash2(i, 4, 2) * h, 6, 1);
    // Lamp pool.
    alpha(g, 0.22 + Math.sin(t * 2) * 0.02, () => { g.fillStyle = hex(P.LANTERN); g.beginPath(); g.ellipse(x + w * 0.5, y + h * 0.5, w * 0.48, h * 0.55, 0, 0, Math.PI * 2); g.fill(); });
    // The paper.
    const pw = Math.min(w - 40, 190), ph = h - 14;
    const px = x + (w - pw) / 2 - 10, py = y + 7;
    fill(g, P.SHADOW, px + 3, py + 3, pw, ph);
    fill(g, P.FOG, px, py, pw, ph);
    drawTextCentered(g, 'THE HOLLER GAZETTE', px + pw / 2, py + 4, P.SHADOW);
    fill(g, P.SHADOW, px + 4, py + 11, pw - 8, 1);
    // Columns of grey type.
    for (let c = 0; c < 3; c++) for (let r = 0; r < Math.floor((ph - 18) / 4); r++) {
      if (c === 1 && r >= 2 && r <= 9) continue;
      fill(g, P.MIST, px + 5 + c * ((pw - 10) / 3), py + 15 + r * 4, (pw - 10) / 3 - 5 - hash2(c, r, 5) * 6, 1);
    }
    // The ad itself.
    const ax = px + 5 + (pw - 10) / 3, ay = py + 21, aw = (pw - 10) / 3 - 4, ah = 30;
    fill(g, P.LANTERN, ax, ay, aw, ah);
    drawText(g, 'HELP', ax + 3, ay + 3, P.CRAN);
    drawText(g, 'WANTED', ax + 3, ay + 10, P.CRAN);
    for (let r = 0; r < 3; r++) fill(g, P.SHADOW, ax + 3, ay + 18 + r * 3, aw - 6 - r * 4, 1);
    // Red pen circling it.
    const k = Math.min(1, Math.max(0, (this.bt - 0.6) / 1.4));
    if (k > 0) {
      g.strokeStyle = hex(P.RED); g.lineWidth = 1;
      g.beginPath();
      for (let i = 0; i <= Math.floor(k * 40); i++) {
        const a = -Math.PI / 2 + (i / 40) * Math.PI * 2.15;
        const qx = ax + aw / 2 + Math.cos(a) * (aw / 2 + 5 + Math.sin(i) * 0.6), qy = ay + ah / 2 + Math.sin(a) * (ah / 2 + 5);
        if (i === 0) g.moveTo(Math.round(qx) + 0.5, Math.round(qy) + 0.5); else g.lineTo(Math.round(qx) + 0.5, Math.round(qy) + 0.5);
      }
      g.stroke();
      // The pen.
      const a = -Math.PI / 2 + k * Math.PI * 2.15;
      const ex = ax + aw / 2 + Math.cos(a) * (aw / 2 + 5), ey = ay + ah / 2 + Math.sin(a) * (ah / 2 + 5);
      g.strokeStyle = hex(P.VOID); g.lineWidth = 2;
      g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex + 14, ey - 16); g.stroke();
      fill(g, P.RED, ex - 1, ey - 1, 2, 2);
    }
    // Coffee mug and its steam.
    const mx = Math.min(x + w - 24, px + pw + 22), my = y + h * 0.62;
    g.fillStyle = hex(P.SHADOW); g.beginPath(); g.ellipse(mx + 2, my + 2, 10, 10, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = hex(P.FOG); g.beginPath(); g.ellipse(mx, my, 10, 10, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = hex(P.RUST); g.beginPath(); g.ellipse(mx, my, 7, 7, 0, 0, Math.PI * 2); g.fill();
    fill(g, P.FOG, mx + 9, my - 3, 4, 6);
    for (let i = 0; i < 4; i++) {
      const st = (t * 0.7 + i * 0.25) % 1;
      alpha(g, 0.45 * (1 - st), () => fill(g, P.FOG, mx - 3 + Math.sin(st * 6 + i) * 3, my - 6 - st * 22, 2, 2));
    }
  }

  /* 2. The legend: a storm on the ridge, a lantern climbing away, and something white in the lightning. */
  private drawLegend(g: G, x: number, y: number, w: number, h: number, t: number): void {
    const lit = this.flash > 0.2, glow = this.flash > 0;
    // Storm sky: banded, with rolling cloud shelves.
    skyBands(g, x, y, w, h * 0.7, lit ? [P.TWILIGHT, P.MIST] : [P.VOID, P.SHADOW]);
    // Low cloud shelves: rows of overlapping puffs, drifting.
    for (let row = 0; row < 3; row++) {
      const cy = y + h * (0.06 + row * 0.11);
      g.fillStyle = hex(lit ? (row === 2 ? P.FOG : P.MIST) : row === 1 ? P.VOID : P.SHADOW);
      for (let i = 0; i < 14; i++) {
        const span = w + 80;
        const cx = ((i * span / 14 + t * (3 + row * 2) + row * 37) % span) - 40;
        g.beginPath(); g.ellipse(cx, cy + Math.sin(i * 1.7 + row) * 3, 16 + hash2(i, row, 4) * 12, 5 + hash2(i, row + 3, 4) * 3, 0, 0, Math.PI * 2); g.fill();
      }
    }
    // The lightning bolt itself.
    if (glow) {
      g.strokeStyle = hex(P.MOON); g.lineWidth = 2;
      let bx = x + w * 0.62, by = y;
      g.beginPath(); g.moveTo(bx, by);
      for (let k = 0; k < 8; k++) { bx += (hash2(k, Math.floor(this.nextThunder * 10), 2) - 0.5) * 22; by += h * 0.06; g.lineTo(bx, by); }
      g.stroke();
    }
    // Far ridge, then the near ridge climbing to the right.
    const far = (sx: number) => y + h * 0.62 - ridge(sx, 4.4, 14) - (sx / w) * h * 0.18;
    g.fillStyle = hex(lit ? P.TWILIGHT : P.SHADOW);
    for (let sx = 0; sx < w; sx++) g.fillRect(x + sx, Math.round(far(sx)), 1, h);
    const base = (sx: number) => y + h * 0.97 - (sx / w) * h * 0.5 - ridge(sx, 1.7, 7);
    g.fillStyle = hex(lit ? P.PINE : P.VOID);
    for (let sx = 0; sx < w; sx++) g.fillRect(x + sx, Math.round(base(sx)), 1, h);
    for (let i = 0; i < 26; i++) { const tx = hash2(i, 5, 1) * w; if (Math.abs(tx - w * 0.14) < 18) continue; pine(g, x + tx, base(tx) + 1, 12 + hash2(i, 6, 1) * 14, lit ? P.FOREST : P.VOID); }
    // The cabin below, its door open and lit.
    const cx = x + w * 0.14, cy = base(w * 0.14);
    const wallC = lit ? P.RUST : P.VOID, roofC = lit ? P.PINE : P.VOID;
    fill(g, wallC, cx - 12, cy - 16, 26, 16);
    for (let k = 0; k < 9; k++) fill(g, roofC, cx - 15 + k, cy - 17 - k, 32 - k * 2, 1);
    fill(g, roofC, cx + 6, cy - 28, 3, 8); // chimney
    fill(g, P.LANTERN, cx - 2, cy - 11, 5, 11); // the open door
    fill(g, P.LANTERN, cx + 6, cy - 12, 4, 4); // window
    alpha(g, 0.22, () => { g.fillStyle = hex(P.LANTERN); g.beginPath(); g.ellipse(cx, cy, 22, 5, 0, 0, Math.PI * 2); g.fill(); });
    // A lantern climbing the ridge: Elias, walking away, slowly fading into the rain.
    const k = Math.min(1, this.bt / 10);
    const fx = w * (0.26 + k * 0.48), lx = x + fx, ly = base(fx);
    const step = Math.floor(t * 4) % 2;
    alpha(g, 1 - k * 0.75, () => {
      fill(g, P.VOID, lx - 2, ly - 12, 4, 7); // coat
      fill(g, P.VOID, lx - 2 + step, ly - 5, 1, 5); fill(g, P.VOID, lx + 1 - step, ly - 5, 1, 5); // legs
      fill(g, P.VOID, lx - 2, ly - 15, 4, 3); fill(g, P.VOID, lx - 3, ly - 15, 6, 1); // head and hat brim
      fill(g, P.VOID, lx + 2, ly - 11, 2, 1); fill(g, P.LANTERN, lx + 3, ly - 10, 2, 3); // the lantern
      alpha(g, 0.28 + Math.sin(t * 9) * 0.07, () => { g.fillStyle = hex(P.LANTERN); g.beginPath(); g.arc(lx + 4, ly - 9, 9, 0, Math.PI * 2); g.fill(); });
    });
    // In the lightning, a tall white shape on the crest.
    if (lit) {
      const sil = cryptidSilhouette('sheepsquatch', P.FOG, true);
      const qx = x + w * 0.88, qy = base(w * 0.88);
      g.drawImage(sil, Math.round(qx - 12), Math.round(qy - 22));
    }
    // Rain, slanting.
    g.fillStyle = hex(lit ? P.FOG : P.MIST);
    for (let i = 0; i < 110; i++) {
      const rx = (hash2(i, 9, 3) * (w + 40) + t * 70) % (w + 40) - 20, ry = (hash2(i, 8, 3) * h + t * 280 + i * 13) % h;
      alpha(g, 0.45, () => { g.fillRect(Math.round(x + rx), Math.round(y + ry), 1, 3); g.fillRect(Math.round(x + rx + 1), Math.round(y + ry + 3), 1, 2); });
    }
    if (this.flash > 0.28) alpha(g, 0.45, () => fill(g, P.MOON, x, y, w, h));
  }

  /* 3. The mountain road at night, side on: Barney's old pickup and the parallax ridges. */
  private drawHighway(g: G, x: number, y: number, w: number, h: number, t: number): void {
    const travel = this.bt * 70 + 400;
    // Sky.
    skyBands(g, x, y, w, h * 0.56, [P.VOID, P.VOID, P.SHADOW, P.TWILIGHT]);
    stars(g, x, y, w, h * 0.4, t, 50, travel * 0.02);
    moon(g, x + w * 0.8, y + h * 0.16, 5);
    // Far ridge with the radio tower.
    const horizon = y + h * 0.5;
    const far = (sx: number) => horizon - 14 - ridge(sx + travel * 0.08, 0.4, 14);
    g.fillStyle = hex(P.SHADOW);
    for (let sx = 0; sx < w; sx++) g.fillRect(x + sx, Math.round(far(sx)), 1, h);
    const towerX = ((w * 0.7 - travel * 0.08) % (w * 1.6) + w * 1.6) % (w * 1.6) - w * 0.3;
    if (towerX > -10 && towerX < w + 10) {
      const tb = far(towerX);
      for (let k = 0; k < 16; k++) { const half = Math.round((k / 16) * 3); fill(g, P.TWILIGHT, x + towerX - half, tb - 16 + k, 1, 1); fill(g, P.TWILIGHT, x + towerX + half, tb - 16 + k, 1, 1); }
      if (Math.floor(t * 1.5) % 2 === 0) { fill(g, P.RED, x + towerX - 1, tb - 18, 2, 2); alpha(g, 0.3, () => fill(g, P.RED, x + towerX - 3, tb - 20, 6, 6)); }
    }
    // Mid hills, forested.
    const mid = (sx: number) => horizon + 4 - ridge(sx + travel * 0.3, 2.2, 10);
    g.fillStyle = hex(P.PINE);
    for (let sx = 0; sx < w; sx++) g.fillRect(x + sx, Math.round(mid(sx)), 1, h);
    for (let i = 0; i < 40; i++) {
      const wx = i * 23, sx = ((wx - travel * 0.3) % (40 * 23) + 40 * 23) % (40 * 23) - 20;
      if (sx < -10 || sx > w + 10) continue;
      pine(g, x + sx, mid(sx) + 2, 8 + hash2(i, 2, 4) * 6, P.SHADOW);
    }
    // Fog in the hollows.
    for (let i = 0; i < 4; i++) {
      const fx = ((i * 97 - travel * (0.4 + i * 0.05)) % (w + 120) + w + 120) % (w + 120) - 80;
      alpha(g, 0.1, () => { fill(g, P.FOG, x + fx, mid(Math.max(0, fx)) + 4 + i * 2, 50, 2); fill(g, P.FOG, x + fx + 10, mid(Math.max(0, fx)) + 3 + i * 2, 28, 1); });
    }
    // The road.
    const road = y + h * 0.8;
    fill(g, P.VOID, x, road - 10, w, h);
    fill(g, P.SHADOW, x, road - 2, w, 10);
    for (let i = -1; i < w / 20 + 2; i++) { const dx = ((i * 20 - travel) % 20 + 20) % 20 + i * 20 - 20; fill(g, P.LANTERN, x + dx, road + 3, 8, 1); }
    fill(g, P.RUST, x, road + 8, w, 1);
    // Near trees, poles and signs, fastest.
    const near = travel * 1.0;
    for (let i = 0; i < 30; i++) {
      const wx = i * 41 + hash2(i, 3, 3) * 20, span = 30 * 41;
      const sx = ((wx - near * 0.9) % span + span) % span - 30;
      if (sx < -20 || sx > w + 20) continue;
      pine(g, x + sx, road - 9, 18 + hash2(i, 4, 3) * 14, P.VOID);
    }
    const poleGap = 110;
    for (let i = -1; i < w / poleGap + 2; i++) {
      const px = ((i * poleGap - near) % poleGap + poleGap) % poleGap + i * poleGap - poleGap;
      fill(g, P.SHADOW, x + px, road - 40, 2, 32); fill(g, P.SHADOW, x + px - 5, road - 38, 12, 1);
      g.strokeStyle = hex(P.SHADOW); g.lineWidth = 1;
      g.beginPath(); g.moveTo(x + px + 1, road - 38); g.quadraticCurveTo(x + px + poleGap / 2, road - 30, x + px + poleGap + 1, road - 38); g.stroke();
    }
    // Signs, in order, on a long loop.
    const signs: Array<[string[], number, number]> = [
      [['WELCOME TO', 'WEST VIRGINIA', 'WILD & WONDERFUL'], P.TWILIGHT, P.FOG],
      [['NATIONAL', 'RADIO QUIET ZONE'], P.FOG, P.SHADOW],
      [['PINE HOLLOW', '9'], P.FOREST, P.FOG],
    ];
    const loop = 1500;
    signs.forEach(([txt, bg, fg], k) => {
      const sx = ((k * 480 + w + 40 - near) % loop + loop) % loop - 100;
      if (sx < -90 || sx > w + 20) return;
      const sw = Math.max(...txt.map((s) => s.length)) * 4 + 8, shh = txt.length * 7 + 5;
      fill(g, P.SHADOW, x + sx + sw / 2 - 1, road - 22, 2, 14);
      fill(g, P.VOID, x + sx - 1, road - 23 - shh, sw + 2, shh + 2);
      fill(g, bg, x + sx, road - 22 - shh, sw, shh);
      txt.forEach((s, r) => drawTextCentered(g, s, x + sx + sw / 2, road - 19 - shh + r * 7, fg));
    });
    // The truck.
    const bump = Math.round(Math.sin(t * 13) * 0.6 + (hash2(Math.floor(travel / 9), 1, 1) > 0.85 ? 1 : 0));
    this.truck(g, x + w * 0.32, road - 2 - bump, t, 1, true);
  }

  /**
   * Barney's pickup, side on, wheels on (bx, by) (bx = middle). dir 1 = facing right.
   * `lights`: headlights on. Two heads in the cab: Barney in his cap, and you.
   */
  private truck(g: G, bx: number, by: number, t: number, dir: 1 | -1, lights: boolean, doorOpen = false, you = true, reversing = false): void {
    const X = (dx: number, ww = 1) => (dir === 1 ? bx + dx : bx - dx - ww);
    const r = (dx: number, dy: number, ww: number, hh: number, c: number) => fill(g, c, X(dx, ww), by + dy, ww, hh);
    // Headlight beam.
    if (lights) alpha(g, 0.18, () => { g.fillStyle = hex(P.LANTERN); g.beginPath(); g.moveTo(X(22), by - 9); g.lineTo(X(90), by - 18); g.lineTo(X(90), by + 3); g.closePath(); g.fill(); });
    // Body.
    r(-22, -12, 44, 8, P.CRAN); r(-22, -12, 44, 1, P.RED);
    r(-6, -21, 16, 10, P.CRAN); r(-6, -21, 16, 1, P.RED);
    r(-4, -19, 12, 6, P.TWILIGHT); r(2, -19, 1, 6, P.CRAN); // windows, the post between
    // Heads: Barney (driver's side, nearest the front) and you.
    const hair = bodyFor(this.game.appearance).hair;
    r(4, -17, 3, 4, P.AMBER); r(4, -18, 3, 2, P.TWILIGHT);
    if (you) { r(-2, -17, 3, 4, P.AMBER); r(-2, -18, 3, 2, hair); }
    if (doorOpen) { r(-6, -20, 1, 15, P.SHADOW); r(-14, -20, 8, 15, P.CRAN); r(-13, -19, 6, 6, P.TWILIGHT); }
    r(-22, -14, 14, 2, P.RUST); // the bed rail
    r(18, -11, 4, 3, P.FOG); // grille
    r(21, -10, 2, 2, lights ? P.LANTERN : P.AMBER); r(-23, -10, 2, 2, reversing ? P.FOG : P.RED);
    r(-22, -5, 44, 2, P.RUST); // running board / bumper line
    // Wheels, turning.
    for (const wx of [-15, 13]) {
      g.fillStyle = hex(P.VOID); g.beginPath(); g.arc(X(wx), by - 1, 4, 0, Math.PI * 2); g.fill();
      const a = t * 12 * dir;
      fill(g, P.MIST, X(wx) + Math.cos(a) * 2 - 0.5, by - 1 + Math.sin(a) * 2 - 0.5, 1, 1);
      fill(g, P.SHADOW, X(wx) - 1, by - 2, 2, 2);
    }
    // Exhaust.
    for (let i = 0; i < 3; i++) {
      const k = (t * 1.3 + i / 3) % 1;
      alpha(g, 0.35 * (1 - k), () => fill(g, P.MIST, X(-24 - k * 18), by - 4 - k * 6, 2 + k * 3, 2 + k * 3));
    }
  }

  /* 4. Through the windshield: the road winding into the dark, the dash radio hissing. */
  private drawCab(g: G, x: number, y: number, w: number, h: number, t: number): void {
    const horizon = y + Math.round(h * 0.4);
    const bottom = y + h;
    const T = this.bt + (this.cur === 'eyes' ? 20 : 0);
    fill(g, P.VOID, x, y, w, horizon - y);
    stars(g, x, y, w, horizon - y - 6, t, 35);
    // Mountains on the horizon, and the tower.
    g.fillStyle = hex(P.SHADOW);
    for (let sx = 0; sx < w; sx++) g.fillRect(x + sx, Math.round(horizon - 8 - ridge(sx + T * 3, 3.1, 7)), 1, 10);
    const tx = x + w * 0.72 - T * 0.6 % w;
    if (Math.floor(t * 1.5) % 2 === 0) fill(g, P.RED, tx, horizon - 22, 2, 2);
    fill(g, P.TWILIGHT, tx, horizon - 20, 1, 10);
    // The road, row by row (pseudo-3D).
    const curve = Math.sin(T * 0.35) * 0.45 + Math.sin(T * 0.13) * 0.25;
    const rows = bottom - horizon;
    const centerAt = (p: number) => x + w / 2 + curve * (1 - p) * (1 - p) * w * 0.45;
    for (let r = 0; r < rows; r++) {
      const p = (r + 1) / rows, z = 1 / p;
      const band = Math.floor(z * 2.2 + T * 9) % 2;
      const cx = centerAt(p), half = p * w * 0.44;
      // Grass: black far off, picked out by the headlights close in.
      const grass = p < 0.3 ? P.VOID : p < 0.6 ? (band ? P.SHADOW : P.VOID) : (band ? P.PINE : P.SHADOW);
      fill(g, grass, x, horizon + r, w, 1);
      fill(g, p < 0.5 ? P.VOID : P.SHADOW, cx - half, horizon + r, half * 2, 1);
      const edge = Math.max(1, p * 4);
      if (p > 0.12) { fill(g, P.MIST, cx - half - edge, horizon + r, edge, 1); fill(g, P.MIST, cx + half, horizon + r, edge, 1); }
      if (band && p > 0.08) fill(g, p > 0.5 ? P.LANTERN : P.AMBER, cx - Math.max(0.5, p * 1.5), horizon + r, Math.max(1, p * 3), 1);
    }
    // Trees streaming past, far to near.
    const trees: Array<[number, number]> = [];
    for (let k = 0; k < 24; k++) {
      const z = ((k * 0.55 - T * 2.2) % 13 + 13) % 13 + 0.9;
      trees.push([z, k]);
    }
    trees.sort((a, b) => b[0] - a[0]);
    for (const [z, k] of trees) {
      const p = 1 / z;
      if (p > 1.05) continue;
      const side = k % 2 ? 1 : -1;
      const cx = centerAt(p), half = p * w * 0.44;
      const tx2 = cx + side * (half + 4 + p * 26 + hash2(k, 1, 2) * p * 50);
      const yb = horizon + p * rows;
      const lit2 = p > 0.55;
      pine(g, tx2, yb, Math.max(3, p * 95), lit2 ? P.FOREST : p > 0.3 ? P.PINE : P.SHADOW);
      if (lit2) pine(g, tx2 - side * 1, yb, Math.max(3, p * 95) * 0.85, P.PINE);
    }
    // Two red eyes in the road, then gone.
    if (this.cur === 'eyes' && this.bt > 0.4 && this.bt < 1.9) {
      const p = 0.16 + (this.bt - 0.4) * 0.05, cx = centerAt(p), ey = horizon + p * rows - 10 - p * 20;
      const blink = Math.floor(this.bt * 6) % 9 === 0;
      if (!blink) { fill(g, P.RED, cx - 3, ey, 2, 1); fill(g, P.RED, cx + 2, ey, 2, 1); alpha(g, 0.3, () => fill(g, P.RED, cx - 5, ey - 2, 11, 5)); }
      alpha(g, 0.5, () => fill(g, P.VOID, cx - 2, ey - 2, 5, 16));
    }
    // Headlight glow on the near road.
    alpha(g, 0.1, () => { g.fillStyle = hex(P.LANTERN); g.beginPath(); g.moveTo(x + w * 0.2, bottom); g.lineTo(centerAt(0.45) - 10, horizon + rows * 0.45); g.lineTo(centerAt(0.45) + 10, horizon + rows * 0.45); g.lineTo(x + w * 0.8, bottom); g.fill(); });
    // Windshield frame: A-pillars, mirror, the pine-tree air freshener.
    g.fillStyle = hex(P.VOID);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + w * 0.1, y); g.lineTo(x, y + h * 0.7); g.fill();
    g.beginPath(); g.moveTo(x + w, y); g.lineTo(x + w * 0.9, y); g.lineTo(x + w, y + h * 0.7); g.fill();
    fill(g, P.VOID, x, y, w, 5);
    fill(g, P.SHADOW, x + w / 2 - 12, y + 3, 24, 6); fill(g, P.TWILIGHT, x + w / 2 - 11, y + 4, 22, 3);
    const sw = Math.sin(t * 2.2 + Math.sin(T * 0.35) * 2) * 3;
    g.strokeStyle = hex(P.SHADOW); g.lineWidth = 1; g.beginPath(); g.moveTo(x + w / 2, y + 9); g.lineTo(x + w / 2 + sw, y + 17); g.stroke();
    pine(g, x + w / 2 + sw, y + 25, 8, P.MOSS);
    // The dash.
    const dy = bottom - Math.round(h * 0.2);
    g.fillStyle = hex(P.SHADOW); g.beginPath(); g.moveTo(x, dy + 4); g.quadraticCurveTo(x + w / 2, dy - 6, x + w, dy + 4); g.lineTo(x + w, bottom); g.lineTo(x, bottom); g.fill();
    fill(g, P.VOID, x, dy + 10, w, bottom - dy);
    // Radio: dial glow and drifting needle, static.
    const rx = x + w / 2 - 22, ry = dy + 4;
    fill(g, P.RUST, rx - 1, ry - 1, 46, 12); fill(g, P.AMBER, rx, ry, 44, 10);
    for (let i = 0; i < 10; i++) fill(g, P.RUST, rx + 3 + i * 4, ry + 2, 1, 2);
    fill(g, P.RED, rx + 6 + (Math.sin(t * 0.7) * 0.5 + 0.5) * 30, ry + 1, 1, 7);
    for (let i = 0; i < 6; i++) if (hash2(i, Math.floor(t * 12), 9) > 0.5) fill(g, P.LANTERN, rx + 4 + hash2(i, 2, Math.floor(t * 12)) * 36, ry + 6 + (i % 2), 1, 1);
    // Barney's hands on the wheel (left: you ride shotgun).
    g.strokeStyle = hex(P.VOID); g.lineWidth = 3;
    g.beginPath(); g.arc(x + w * 0.16, bottom + 4, w * 0.13, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    fill(g, P.AMBER, x + w * 0.16 - w * 0.1 + Math.sin(T * 0.35) * 2, bottom - w * 0.07, 5, 4);
  }

  /* 5. Arrival: the truck pulls up at the cabin, you climb out, Barney heads back down the mountain. */
  private drawArrive(g: G, x: number, y: number, w: number, h: number, t: number): void {
    const a = this.bt;
    fill(g, P.VOID, x, y, w, h);
    fill(g, P.SHADOW, x, y + h * 0.35, w, h * 0.3);
    stars(g, x, y, w, h * 0.4, t, 45);
    moon(g, x + w * 0.15, y + h * 0.14, 4);
    // Tree line and the clearing.
    for (let i = 0; i < 26; i++) pine(g, x + i * (w / 25) + hash2(i, 1, 6) * 6, y + h * 0.62, 16 + hash2(i, 2, 6) * 14, P.VOID);
    const ground = y + h * 0.9;
    fill(g, P.PINE, x, y + h * 0.62, w, h);
    fill(g, P.SHADOW, x, ground - 3, w, 6); // the gravel drive
    for (let i = 0; i < 40; i++) fill(g, P.MIST, x + hash2(i, 4, 4) * w, ground - 2 + hash2(i, 5, 4) * 4, 1, 1);
    // The cabin, porch light on.
    const cab = STRUCT.cabin[1];
    const s = Math.min(1, (h * 0.62) / cab.height);
    const cw = cab.width * s, ch = cab.height * s;
    const cabX = x + w * 0.72 - cw / 2, cabY = ground - 4 - ch;
    g.drawImage(cab, Math.round(cabX), Math.round(cabY), Math.round(cw), Math.round(ch));
    alpha(g, 0.2 + Math.sin(t * 5) * 0.03, () => { g.fillStyle = hex(P.LANTERN); g.beginPath(); g.ellipse(cabX + cw / 2, ground - 6, cw * 0.55, 8, 0, 0, Math.PI * 2); g.fill(); });
    // The truck: rolls in and stops, waits, then backs away down the hill.
    const stopX = x + w * 0.3;
    let tx: number, dir: 1 | -1 = 1, rev = false;
    if (a < 2.4) { const k = a / 2.4, e = 1 - (1 - k) * (1 - k); tx = x - 60 + (stopX - x + 60) * e; }
    else if (a < 5.2) tx = stopX;
    else { const k = Math.min(1, (a - 5.2) / 2.6); tx = stopX - k * k * (w * 0.55); rev = true; }
    if (a >= 5.2) dir = 1;
    const moving = a < 2.4 || a > 5.2;
    const out = a > 2.9;
    this.truck(g, tx, ground, moving ? t : 0, dir, true, a > 2.6 && a < 3.4, !out, rev);
    // Barney's wave.
    if (a > 4.4 && a < 5.4 && Math.floor(t * 6) % 2 === 0) fill(g, P.AMBER, tx + 10, ground - 24, 2, 3);
    // You: out of the truck, up to the porch with your bag.
    if (out) {
      const k = Math.min(1, (a - 2.9) / 3), walking = k < 1;
      const px = stopX - 4 + k * (cabX + cw * 0.42 - stopX);
      const frame = walking ? [0, 1, 0, 2][Math.floor(t * 7) % 4] : 0;
      const img = playerFrame(this.game.look, walking ? 'right' : 'up', frame, 'walk');
      g.drawImage(img, Math.round(px - 12), Math.round(ground - 26));
      if (walking) fill(g, P.RUST, px + 6, ground - 12, 5, 6); // the duffel
    }
    // Something in the tall grass watching (two pale eyes, late).
    if (a > 7 && Math.floor(t * 0.8) % 4 !== 0) { fill(g, P.FERN, x + w * 0.93, ground - 12, 1, 1); fill(g, P.FERN, x + w * 0.93 + 3, ground - 12, 1, 1); }
    // Grass in front.
    for (let i = 0; i < 60; i++) { const gx = x + hash2(i, 7, 8) * w; fill(g, P.FOREST, gx, ground + 3 + hash2(i, 9, 8) * 4, 1, 3 + Math.sin(t * 2 + i) * 1); }
  }
}
