/**
 * The In-and-Out Board, close up: each brass check you carried up slides from
 * IN across to its OUT peg with a click, the board lamp warms a little, and
 * that miner's memory plays. One at a time, slowly. It should feel earned.
 */
import type { Game } from '../engine/game';
import type { Overlay } from './overlay';
import { Dialog } from './menus';
import { panel } from './panel';
import { drawText, drawTextCentered } from '../graphics/font';
import { P, hex } from '../graphics/palette';
import { sfx } from '../audio/sfx';
import { MINERS, MINER_BY_ID } from '../data/mine';
import type { MinerId } from '../data/mine';

const SLIDE = 1.1;

export class BankingScene implements Overlay {
  closed = false;
  private idx = 0;
  private t = 0;
  private clicked = false;
  private waiting = false;

  constructor(private readonly ids: MinerId[], private readonly notes: string[]) {}

  update(game: Game, dt: number): void {
    // Back from a memory: on to the next check.
    if (this.waiting) {
      this.waiting = false;
      this.idx++; this.t = 0; this.clicked = false;
      if (this.idx >= this.ids.length) {
        this.closed = true;
        sfx.trustChime();
        if (this.notes.length) game.openOverlay(new Dialog(this.notes));
        return;
      }
    }
    this.t += dt;
    if (!this.clicked && this.t >= SLIDE) { this.clicked = true; sfx.tagClink(); sfx.knock(); }
    const go = game.input.pressed('a') || game.input.taps.length > 0;
    if (go && this.t < SLIDE) { this.t = SLIDE; return; }
    if (go && this.t >= SLIDE + 0.2) {
      const m = MINER_BY_ID[this.ids[this.idx]];
      this.waiting = true;
      game.openOverlay(new Dialog([`You hang check ${m.check} on the OUT peg.`, ...m.memory]));
    }
  }

  draw(game: Game, g: CanvasRenderingContext2D): void {
    g.globalAlpha = 0.78; g.fillStyle = hex(P.VOID); g.fillRect(0, 0, game.w, game.h); g.globalAlpha = 1;
    const cur = this.ids[Math.min(this.idx, this.ids.length - 1)];
    const W = Math.min(game.w - 16, 220), H = 132;
    const x = Math.floor((game.w - W) / 2), y = Math.max(4, Math.floor((game.h - H) / 2) - 18);
    // The board lamp: warmer the more checks hang on OUT.
    const out = MINERS.filter((m) => game.progress.mine.tags[m.id] === 'out' && (!this.ids.includes(m.id) || this.ids.indexOf(m.id) < this.idx || (m.id === cur && this.clicked))).length;
    // A soft halo behind the board, warmer the more checks hang on OUT.
    for (let k = 0; k < 4; k++) { g.globalAlpha = (0.04 + out * 0.006) * (k + 1) / 2; g.fillStyle = hex(k > 1 ? P.LANTERN : P.AMBER); g.beginPath(); g.ellipse(x + W / 2, y + H / 2, W / 2 + 26 - k * 8, H / 2 + 18 - k * 6, 0, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1;
    // Oak frame, cranberry baize.
    g.fillStyle = hex(P.RUST); g.fillRect(x, y, W, H);
    g.fillStyle = hex(P.AMBER); g.fillRect(x, y, W, 2);
    g.fillStyle = hex(P.CRAN); g.fillRect(x + 4, y + 14, W - 8, H - 18);
    drawTextCentered(g, 'NIGHT SHIFT -- 11 MARCH 1914', x + W / 2, y + 4, P.LANTERN);
    const colW = Math.floor((W - 12) / 2);
    drawTextCentered(g, 'IN', x + 6 + colW / 2, y + 18, P.FOG);
    drawTextCentered(g, 'OUT', x + 6 + colW + colW / 2, y + 18, P.LANTERN);
    g.fillStyle = hex(P.SHADOW); g.fillRect(x + 6 + colW, y + 16, 1, H - 22);
    const slot = (col: number, k: number): [number, number] => [x + 10 + col * colW + (k % 2) * Math.floor(colW / 2), y + 30 + Math.floor(k / 2) * 16];
    MINERS.forEach((m, k) => {
      const [ix, iy] = slot(0, k), [ox, oy] = slot(1, k);
      for (const [px, py] of [[ix, iy], [ox, oy]]) { g.fillStyle = hex(P.SHADOW); g.fillRect(px + 2, py - 2, 2, 3); } // the pegs
      const st = game.progress.mine.tags[m.id];
      const isCur = m.id === cur;
      const pending = this.ids.includes(m.id) && this.ids.indexOf(m.id) > this.idx;
      let tx: number, ty: number;
      if (isCur) {
        const f = Math.min(1, this.t / SLIDE), e = f * f * (3 - 2 * f);
        tx = ix + (ox - ix) * e; ty = iy + (oy - iy) * e - Math.sin(e * Math.PI) * 12;
      } else if (st === 'out' && !pending) { tx = ox; ty = oy; } else { tx = ix; ty = iy; }
      const brass = isCur ? P.LANTERN : st === 'out' && !pending ? P.AMBER : P.RUST;
      g.fillStyle = hex(P.VOID); g.fillRect(Math.round(tx) - 1, Math.round(ty), 24, 11);
      g.fillStyle = hex(brass); g.fillRect(Math.round(tx), Math.round(ty) + 1, 22, 9);
      drawText(g, String(m.check).padStart(3), Math.round(tx) + 3, Math.round(ty) + 3, P.SHADOW);
    });
    const m = MINER_BY_ID[cur];
    const by = y + H + 6;
    panel(g, x, by, W, 26);
    drawTextCentered(g, `CHECK ${m.check}: ${m.name.toUpperCase()}`, x + W / 2, by + 5, P.LANTERN);
    drawTextCentered(g, `${m.age}, ${m.job.toUpperCase()}`.slice(0, 48), x + W / 2, by + 14, P.MIST);
    if (this.t >= SLIDE + 0.2 && Math.floor(game.time * 2) % 2 === 0) drawTextCentered(g, 'A: REMEMBER HIM', x + W / 2, by + 30, P.FERN);
  }
}
