/**
 * Act IV finale: the Midnight Broadcast. A scripted GBC-style encounter with
 * Indrid Cold and The Weaver, solved by tuning the Static Radio to the three
 * frequencies hidden in Ranger Vance's journal. Wrong tunings just crackle.
 */
import type { Game } from '../engine/game';
import type { Overlay } from './overlay';
import { FINALE_BEATS } from '../data/campaign';
import { cryptidFrame } from '../graphics/cryptidSprites';
import { playerFrame } from '../graphics/playerSprite';
import { drawText, drawTextCentered, wrapText } from '../graphics/font';
import { hex, P } from '../graphics/palette';
import { sfx } from '../audio/sfx';
import { panel, bar, inRect, Rect } from './panel';
import { clamp } from '../util';

export class FinaleScene implements Overlay {
  closed = false;
  private beat = 0;
  private t = 0;
  private shown = 0;
  private wipe = 1;
  private choice = 0;
  private reply: string | null = null;
  private signal = 0;
  private shownSignal = 0;
  private flash = 0;

  constructor(private readonly onDone: () => void) {
    sfx.summon();
  }

  private get text(): string {
    return this.reply ?? FINALE_BEATS[this.beat].text;
  }

  private choiceRects(game: Game): Rect[] {
    const W = game.w, H = game.h;
    const cw = Math.min(W - 16, 200);
    return [0, 1, 2].map((i) => ({ x: Math.floor((W - cw) / 2), y: H - 48 - 50 + i * 13, w: cw, h: 12 }));
  }

  update(game: Game, dt: number): void {
    this.t += dt;
    this.wipe = Math.max(0, this.wipe - dt * 1.5);
    this.flash = Math.max(0, this.flash - dt * 2);
    this.shownSignal += (this.signal - this.shownSignal) * Math.min(1, dt * 4);
    if (this.wipe > 0) return;
    const inp = game.input;
    const text = this.text;
    if (this.shown < text.length) {
      this.shown = Math.min(text.length, this.shown + dt * 55);
      if (inp.pressed('a') || inp.taps.length) this.shown = text.length;
      return;
    }
    const b = FINALE_BEATS[this.beat];
    if (b.tune && this.reply === null) {
      if (inp.repeat('up')) { this.choice = (this.choice + 2) % 3; sfx.blip(); }
      if (inp.repeat('down')) { this.choice = (this.choice + 1) % 3; sfx.blip(); }
      let pick = inp.pressed('a') ? this.choice : -1;
      for (const t of inp.taps) { const hit = this.choiceRects(game).findIndex((r) => inRect(r, t.x, t.y)); if (hit >= 0) { pick = hit; this.choice = hit; } }
      if (pick < 0) return;
      if (pick === b.tune.correct) {
        sfx.trustChime(); this.signal = clamp(this.signal + 34, 0, 100); this.flash = 0.6;
        this.reply = b.tune.ok;
      } else {
        sfx.error();
        this.reply = 'Only static hisses back. The Weaver waits, patient. (Vance\'s journal pages hold the frequencies.)';
      }
      this.shown = 0;
      return;
    }
    if (inp.pressed('a') || inp.taps.length) {
      sfx.blip();
      if (this.reply !== null) {
        const ok = b.tune && this.reply === b.tune.ok;
        this.reply = null; this.shown = 0;
        if (!ok) return; // retry the same tuning
      }
      if (this.beat >= FINALE_BEATS.length - 1) { this.closed = true; sfx.fanfare(); this.onDone(); return; }
      this.beat++; this.shown = 0; this.choice = 0;
      const sp = FINALE_BEATS[this.beat].speaker;
      if (sp === 'vance') { this.signal = 100; sfx.morning(); }
    }
  }

  draw(game: Game, g: CanvasRenderingContext2D): void {
    const W = game.w, H = game.h, t = this.t;
    const arenaH = H - 50;
    g.fillStyle = hex(P.VOID); g.fillRect(0, 0, W, H);
    g.fillStyle = hex(P.SHADOW); g.fillRect(0, arenaH * 0.55, W, arenaH * 0.45);
    for (let i = 0; i < 40; i++) { g.fillStyle = hex(i % 3 ? P.FOG : P.MOON); g.fillRect((i * 53) % W, (i * 29) % Math.floor(arenaH * 0.5), 1, 1); }
    // crossroads
    g.fillStyle = hex(P.RUST); g.fillRect(W / 2 - 10, arenaH * 0.55, 20, arenaH * 0.45); g.fillRect(0, arenaH * 0.78, W, 10);
    const s = arenaH > 150 ? 3 : 2;
    const f = Math.floor(t * 2) % 2;
    const showWeaver = this.beat >= 2;
    const showIndrid = this.beat >= 1;
    if (showWeaver) {
      const k = Math.min(1, (this.beat === 2 ? this.t : 9) * 0.6);
      g.globalAlpha = k;
      g.drawImage(cryptidFrame('weaver', 'normal', f), Math.round(W * 0.62 - 12 * (s + 1)), Math.round(arenaH * 0.62 - 24 * (s + 1)), 24 * (s + 1), 24 * (s + 1));
      g.globalAlpha = 1;
    }
    if (showIndrid) g.drawImage(cryptidFrame('indrid_cold', 'normal', f), Math.round(W * 0.3 - 12 * s), Math.round(arenaH * 0.7 - 24 * s), 24 * s, 24 * s);
    g.drawImage(playerFrame(game.look, 'up', 0, 'walk'), Math.round(W / 2 - 12 * s), Math.round(arenaH - 24 * s + 8), 24 * s, 24 * s);
    // fog
    g.fillStyle = hex(P.FOG);
    for (let i = 0; i < 6; i++) {
      g.globalAlpha = 0.12;
      const fx = ((t * (5 + i * 2) + i * 70) % (W + 120)) - 100;
      g.fillRect(Math.round(fx), Math.round(arenaH * 0.45 + i * 9), 120, 6);
    }
    g.globalAlpha = 1;
    // signal meter
    const bw = Math.min(140, W - 20);
    panel(g, 4, 4, bw, 22);
    drawText(g, 'SIGNAL', 9, 8, P.LANTERN);
    bar(g, 40, 8, bw - 44, 5, this.shownSignal / 100, P.MIST);
    const static_ = Math.round((1 - this.shownSignal / 100) * 6);
    for (let i = 0; i < static_; i++) { g.fillStyle = hex(i % 2 ? P.FOG : P.MIST); g.fillRect(9 + ((i * 37 + Math.floor(t * 30)) % (bw - 14)), 17, 2, 1); }
    // choices
    const b = FINALE_BEATS[this.beat];
    if (b.tune && this.reply === null && this.shown >= this.text.length) {
      const rects = this.choiceRects(game);
      panel(g, rects[0].x - 3, rects[0].y - 4, rects[0].w + 6, 3 * 13 + 6);
      rects.forEach((r, i) => {
        const sel = i === this.choice;
        if (sel) { g.fillStyle = hex(P.FOREST); g.fillRect(r.x, r.y, r.w, r.h); }
        drawTextCentered(g, `${b.tune!.options[i]} MHZ`, r.x + r.w / 2, r.y + 3, sel ? P.LANTERN : P.FOG);
      });
    }
    // text box
    panel(g, 0, H - 48, W, 48);
    const lines = wrapText(this.text, W - 14);
    let left = Math.floor(this.shown);
    lines.slice(0, 5).forEach((l, k) => { if (left > 0) drawText(g, l.slice(0, left), 7, H - 43 + k * 8, P.FOG); left -= l.length + 1; });
    if (this.flash > 0) { g.globalAlpha = this.flash * 0.6; g.fillStyle = hex(P.MOON); g.fillRect(0, 0, W, arenaH); g.globalAlpha = 1; }
    if (this.wipe > 0) {
      g.fillStyle = hex(P.VOID);
      for (let y = 0, i = 0; y < H; y += 6, i++) { const w = Math.round(this.wipe * W); if (i % 2) g.fillRect(0, y, w, 6); else g.fillRect(W - w, y, w, 6); }
    }
  }
}
