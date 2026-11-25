/** Title screen: moonlit pine silhouette, blinking eyes in the treeline, menu. */
import type { Game } from '../engine/game';
import { drawText, drawTextCentered } from '../graphics/font';
import { hex, P } from '../graphics/palette';
import { OBJ } from '../graphics/sprites';
import { sfx } from '../audio/sfx';
import { loadSave, SaveData } from '../engine/save';
import { hash2 } from '../util';
import { inRect, panel, Rect } from './panel';

export class TitleScreen {
  private sel = 0;
  private save: SaveData | null = loadSave();

  private options(): Array<{ label: string; save: SaveData | null }> {
    const o: Array<{ label: string; save: SaveData | null }> = [];
    if (this.save) o.push({ label: 'CONTINUE', save: this.save });
    o.push({ label: 'NEW GAME', save: null });
    return o;
  }

  private optionRects(game: Game): Rect[] {
    const n = this.options().length;
    const y0 = Math.floor(game.h * 0.62);
    return Array.from({ length: n }, (_, i) => ({ x: Math.floor(game.w / 2) - 36, y: y0 + i * 12, w: 72, h: 11 }));
  }

  update(game: Game): void {
    const inp = game.input;
    const opts = this.options();
    if (inp.repeat('up')) { this.sel = (this.sel + opts.length - 1) % opts.length; sfx.unlock(); sfx.blip(); }
    if (inp.repeat('down')) { this.sel = (this.sel + 1) % opts.length; sfx.unlock(); sfx.blip(); }
    let go = inp.pressed('a');
    for (const t of inp.taps) {
      const hit = this.optionRects(game).findIndex((r) => inRect(r, t.x, t.y));
      if (hit >= 0) { this.sel = hit; go = true; }
    }
    if (go) game.startFromTitle(opts[this.sel].save);
  }

  draw(game: Game, g: CanvasRenderingContext2D): void {
    const W = game.w, H = game.h, t = game.time;
    // Sky bands
    const bands = [P.VOID, P.SHADOW, P.PINE, P.TWILIGHT];
    const bh = Math.ceil((H * 0.7) / bands.length);
    bands.forEach((c, i) => { g.fillStyle = hex(c); g.fillRect(0, i * bh, W, bh + 1); });
    // Stars
    for (let i = 0; i < 60; i++) {
      const x = Math.floor(hash2(i, 1, 5) * W), y = Math.floor(hash2(i, 2, 5) * H * 0.5);
      if ((Math.floor(t * 2 + i) % 7) === 0) continue;
      g.fillStyle = hex(i % 5 ? P.FOG : P.MOON);
      g.fillRect(x, y, 1, 1);
    }
    // Moon
    const mx = Math.floor(W * 0.78), my = Math.floor(H * 0.18);
    g.fillStyle = hex(P.MOON);
    g.beginPath(); g.arc(mx, my, 12, 0, Math.PI * 2); g.fill();
    g.fillStyle = hex(P.FOG);
    g.beginPath(); g.arc(mx - 2, my - 2, 9, 0, Math.PI * 2); g.fill();
    g.fillStyle = hex(P.MOON);
    g.fillRect(mx + 2, my + 1, 3, 2); g.fillRect(mx - 5, my + 3, 2, 2);
    // Treeline (two rows of pines darkened)
    const ground = Math.floor(H * 0.82);
    g.fillStyle = hex(P.SHADOW);
    g.fillRect(0, ground, W, H - ground);
    for (let row = 0; row < 2; row++) {
      for (let x = -10; x < W + 10; x += row ? 11 : 15) {
        const img = OBJ.pine[Math.floor(hash2(x, row, 3) * 4)];
        const yy = ground - img.height + 6 + row * 8 + Math.floor(hash2(x, row, 4) * 6);
        g.drawImage(img, x + (row ? 5 : 0), yy);
      }
      g.fillStyle = hex(row ? P.VOID : P.SHADOW);
      g.globalAlpha = row ? 0.35 : 0.55;
      g.fillRect(0, 0, W, H);
      g.globalAlpha = 1;
    }
    // Fog wisps
    g.globalAlpha = 0.18;
    g.fillStyle = hex(P.FOG);
    for (let i = 0; i < 5; i++) {
      const fx = ((t * (6 + i * 2) + i * 70) % (W + 80)) - 60;
      g.fillRect(Math.floor(fx), ground - 6 + i * 3, 60, 2);
    }
    g.globalAlpha = 1;
    // Eyes in the trees
    const blink = Math.floor(t * 1.3) % 5 === 0;
    if (!blink) {
      g.fillStyle = hex(P.RED);
      const ex = Math.floor(W * 0.2), ey = ground - 14;
      g.fillRect(ex, ey, 2, 1); g.fillRect(ex + 5, ey, 2, 1);
    }
    // Title
    const ty = Math.floor(H * 0.2);
    drawTextCentered(g, 'PINE BARRENS', W / 2, ty, P.FERN, P.VOID, 2);
    drawTextCentered(g, 'RANGER', W / 2, ty + 14, P.LANTERN, P.CRAN, 3);
    drawTextCentered(g, 'A CRYPTID FIELD-RESEARCH RPG', W / 2, ty + 34, P.MIST, P.VOID);
    // Menu
    const rects = this.optionRects(game);
    const r0 = rects[0];
    panel(g, r0.x - 4, r0.y - 4, r0.w + 8, rects.length * 12 + 6);
    this.options().forEach((o, i) => {
      const r = rects[i];
      const s = i === this.sel;
      drawTextCentered(g, o.label, r.x + r.w / 2, r.y + 2, s ? P.LANTERN : P.MIST);
      if (s && Math.floor(t * 3) % 2 === 0) drawText(g, '>', r.x + 4, r.y + 2, P.LANTERN);
    });
    drawTextCentered(g, 'PRESS A / SPACE', W / 2, H - 9, P.MIST, P.VOID);
  }
}
