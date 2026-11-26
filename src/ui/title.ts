/** Title screen: New Game, Continue, Export / Import Save JSON. */
import type { Game } from '../engine/game';
import { drawText, drawTextCentered, wrapText } from '../graphics/font';
import { hex, P } from '../graphics/palette';
import { OBJ } from '../graphics/sprites';
import { sfx } from '../audio/sfx';
import { loadSave, SaveData } from '../engine/save';
import { exportSave, importSave } from './saveio';
import { hash2 } from '../util';
import { inRect, panel, Rect } from './panel';

type Opt = 'continue' | 'new' | 'export' | 'import';
const LABEL: Record<Opt, string> = { continue: 'CONTINUE', new: 'NEW GAME', export: 'EXPORT SAVE', import: 'IMPORT SAVE' };

export class TitleScreen {
  private sel = 0;
  private save: SaveData | null = loadSave();
  private msg = '';
  private msgT = 0;
  private confirmNew = false;

  private options(): Opt[] {
    return this.save ? ['continue', 'new', 'export', 'import'] : ['new', 'import'];
  }

  private optionRects(game: Game): Rect[] {
    const n = this.options().length;
    const y0 = Math.max(Math.floor(game.h * 0.5), game.h - 22 - n * 12 - 26);
    return Array.from({ length: n }, (_, i) => ({ x: Math.floor(game.w / 2) - 42, y: y0 + i * 12, w: 84, h: 11 }));
  }

  private say(m: string): void { this.msg = m; this.msgT = 5; }

  update(game: Game): void {
    const inp = game.input;
    this.msgT = Math.max(0, this.msgT - 1 / 60);
    const opts = this.options();
    if (this.sel >= opts.length) this.sel = 0;
    if (this.confirmNew) {
      if (inp.pressed('a')) { this.confirmNew = false; game.startFromTitle(null); }
      else if (inp.pressed('b') || inp.taps.length) { this.confirmNew = false; sfx.cancel(); }
      return;
    }
    if (inp.repeat('up')) { this.sel = (this.sel + opts.length - 1) % opts.length; sfx.unlock(); sfx.blip(); }
    if (inp.repeat('down')) { this.sel = (this.sel + 1) % opts.length; sfx.unlock(); sfx.blip(); }
    let go = inp.pressed('a');
    for (const t of inp.taps) {
      const hit = this.optionRects(game).findIndex((r) => inRect(r, t.x, t.y));
      if (hit >= 0) { this.sel = hit; go = true; }
    }
    if (!go) return;
    sfx.unlock();
    const o = opts[this.sel];
    if (o === 'continue' && this.save) game.startFromTitle(this.save);
    else if (o === 'new') { if (this.save) { this.confirmNew = true; sfx.alert(); } else game.startFromTitle(null); }
    else if (o === 'export') { sfx.confirm(); this.say(exportSave()); }
    else if (o === 'import') {
      sfx.open();
      importSave((m, ok) => { this.say(m); if (ok) { this.save = loadSave(); this.sel = 0; sfx.fanfare(); } else sfx.error(); });
    }
  }

  draw(game: Game, g: CanvasRenderingContext2D): void {
    const W = game.w, H = game.h, t = game.time;
    const bands = [P.VOID, P.SHADOW, P.PINE, P.TWILIGHT];
    const bh = Math.ceil((H * 0.7) / bands.length);
    bands.forEach((c, i) => { g.fillStyle = hex(c); g.fillRect(0, i * bh, W, bh + 1); });
    for (let i = 0; i < 60; i++) {
      const x = Math.floor(hash2(i, 1, 5) * W), y = Math.floor(hash2(i, 2, 5) * H * 0.5);
      if ((Math.floor(t * 2 + i) % 7) === 0) continue;
      g.fillStyle = hex(i % 5 ? P.FOG : P.MOON);
      g.fillRect(x, y, 1, 1);
    }
    const mx = Math.floor(W * 0.78), my = Math.floor(H * 0.16);
    g.fillStyle = hex(P.MOON); g.beginPath(); g.arc(mx, my, 12, 0, Math.PI * 2); g.fill();
    g.fillStyle = hex(P.FOG); g.beginPath(); g.arc(mx - 2, my - 2, 9, 0, Math.PI * 2); g.fill();
    // radio tower on the ridge, blinking
    const tx = Math.floor(W * 0.12), tb = Math.floor(H * 0.62);
    g.fillStyle = hex(P.SHADOW);
    for (let k = 0; k < 40; k++) { const half = Math.round((k / 40) * 6) + 1; g.fillRect(tx - half, tb - 40 + k, 1, 1); g.fillRect(tx + half, tb - 40 + k, 1, 1); }
    if (Math.floor(t * 1.4) % 2 === 0) { g.fillStyle = hex(P.RED); g.fillRect(tx - 1, tb - 43, 3, 3); }
    const ground = Math.floor(H * 0.82);
    g.fillStyle = hex(P.SHADOW); g.fillRect(0, ground, W, H - ground);
    for (let row = 0; row < 2; row++) {
      for (let x = -10; x < W + 10; x += row ? 11 : 15) {
        const img = OBJ.pine[Math.floor(hash2(x, row, 3) * 4)];
        g.drawImage(img, x + (row ? 5 : 0), ground - img.height + 6 + row * 8 + Math.floor(hash2(x, row, 4) * 6));
      }
      g.fillStyle = hex(row ? P.VOID : P.SHADOW);
      g.globalAlpha = row ? 0.35 : 0.55;
      g.fillRect(0, 0, W, H);
      g.globalAlpha = 1;
    }
    g.globalAlpha = 0.18; g.fillStyle = hex(P.FOG);
    for (let i = 0; i < 5; i++) { const fx = ((t * (6 + i * 2) + i * 70) % (W + 80)) - 60; g.fillRect(Math.floor(fx), ground - 6 + i * 3, 60, 2); }
    g.globalAlpha = 1;
    if (Math.floor(t * 1.3) % 5 !== 0) { g.fillStyle = hex(P.RED); const ex = Math.floor(W * 0.62), ey = ground - 14; g.fillRect(ex, ey, 2, 1); g.fillRect(ex + 5, ey, 2, 1); }

    const ty = Math.max(8, Math.floor(H * 0.14));
    drawTextCentered(g, 'PINE BARRENS', W / 2, ty, P.FERN, P.VOID, 2);
    drawTextCentered(g, 'RANGER', W / 2, ty + 14, P.LANTERN, P.CRAN, 3);
    drawTextCentered(g, 'THE SIGNAL ON RADIO RIDGE', W / 2, ty + 34, P.MIST, P.VOID);

    const rects = this.optionRects(game);
    const r0 = rects[0];
    panel(g, r0.x - 4, r0.y - 4, r0.w + 8, rects.length * 12 + 6);
    this.options().forEach((o, i) => {
      const r = rects[i];
      const s = i === this.sel;
      drawTextCentered(g, LABEL[o], r.x + r.w / 2, r.y + 2, s ? P.LANTERN : P.MIST);
      if (s && Math.floor(t * 3) % 2 === 0) drawText(g, '>', r.x + 2, r.y + 2, P.LANTERN);
    });
    if (this.save) drawTextCentered(g, `SAVE: ${['SPR', 'SUM', 'FAL', 'WIN'][Math.floor((this.save.day - 1) / 28) % 4]} ${((this.save.day - 1) % 28) + 1}, ${this.save.gold}G`, W / 2, r0.y + rects.length * 12 + 5, P.PINE);
    if (this.confirmNew) {
      const w = Math.min(W - 20, 200);
      panel(g, (W - w) / 2, H / 2 - 18, w, 30);
      drawTextCentered(g, 'START OVER? YOUR SAVE WILL BE', W / 2, H / 2 - 12, P.LANTERN);
      drawTextCentered(g, 'REPLACED AT THE FIRST SLEEP.', W / 2, H / 2 - 5, P.LANTERN);
      drawTextCentered(g, 'A: YES   B: NO', W / 2, H / 2 + 3, P.FERN);
    }
    if (this.msgT > 0) wrapText(this.msg, W - 20).forEach((l, i) => drawTextCentered(g, l, W / 2, H - 20 + i * 7 - 7, P.AMBER, P.VOID));
    else drawTextCentered(g, 'PRESS A / SPACE', W / 2, H - 9, P.MIST, P.VOID);
  }
}
