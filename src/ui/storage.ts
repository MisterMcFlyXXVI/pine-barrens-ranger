/**
 * Cabin Storage Crate: the crate's slots on top, your bag below. Tap a slot
 * (or press A) to move that whole stack to the other side. Each grid scrolls
 * on its own when the screen is short.
 */
import type { Game } from '../engine/game';
import type { Overlay } from './overlay';
import type { Inventory } from '../engine/inventory';
import { drawText, drawTextRight } from '../graphics/font';
import { hex, P } from '../graphics/palette';
import { ICON } from '../graphics/sprites';
import { sfx } from '../audio/sfx';
import { ITEMS } from '../data/items';
import { inRect, panel, slotBox, Rect } from './panel';
import { drawClipped, More, tapMore } from './readMore';

const COLS = 9, S = 18, GAP = 1;

interface Grid { inv: Inventory; label: string; rows: number; scroll: number; top: number }

export class StorageMenu implements Overlay {
  closed = false;
  /** Which grid the cursor is in (0 = crate, 1 = bag) and its slot. */
  private side = 0;
  private cursor = 0;
  private scrolls = [0, 0];
  private mores: Array<More | null> = [];

  /** cellar: the yard's Root Cellar instead of the cabin's Storage Crate. */
  constructor(private readonly cellar = false) {}
  private box(game: Game): Inventory { return this.cellar ? game.cellar : game.storage; }

  private layout(game: Game): Rect & { grids: Grid[]; cells: Rect[][] } {
    const w = COLS * (S + GAP) - GAP + 10;
    const x = Math.floor((game.w - w) / 2);
    const invs = [this.box(game), game.inv];
    const totalRows = invs.map((v) => Math.ceil(v.slots.length / COLS));
    // Header 12 + two labels 9 each + info 26 + footer 10; split what's left between the grids.
    const avail = Math.max(2 * (S + GAP) * 2, game.h - 8 - 12 - 18 - 26 - 10);
    let rows = totalRows.map((r) => Math.min(r, Math.max(2, Math.floor(avail / 2 / (S + GAP)))));
    const spare = Math.floor(avail / (S + GAP)) - rows[0] - rows[1];
    if (spare > 0) rows = rows.map((r, i) => Math.min(totalRows[i], r + Math.ceil(spare / 2)));
    const h = 12 + 18 + (rows[0] + rows[1]) * (S + GAP) + 26 + 10;
    const y = Math.max(2, Math.floor((game.h - h) / 2) - 6);
    const grids: Grid[] = [];
    const cells: Rect[][] = [];
    let gy = y + 12;
    invs.forEach((inv, k) => {
      const top = gy + 9;
      grids.push({ inv, label: k === 0 ? (this.cellar ? 'ROOT CELLAR' : 'STORAGE CRATE') : 'YOUR BAG', rows: rows[k], scroll: this.scrolls[k], top });
      const cs: Rect[] = [];
      for (let i = 0; i < rows[k] * COLS; i++) {
        cs.push({ x: x + 5 + (i % COLS) * (S + GAP), y: top + Math.floor(i / COLS) * (S + GAP), w: S, h: S });
      }
      cells.push(cs);
      gy = top + rows[k] * (S + GAP);
    });
    return { x, y, w, h, grids, cells };
  }

  /** Keep the cursor's row inside its grid's visible window. */
  private follow(L: ReturnType<StorageMenu['layout']>): void {
    const g = L.grids[this.side];
    const row = Math.floor(this.cursor / COLS);
    if (row < this.scrolls[this.side]) this.scrolls[this.side] = row;
    if (row >= this.scrolls[this.side] + g.rows) this.scrolls[this.side] = row - g.rows + 1;
  }

  private moveStack(game: Game, from: Inventory, to: Inventory, i: number): void {
    const st = from.slots[i];
    if (!st) { sfx.error(); return; }
    const left = to.add(st.id, st.n);
    const moved = st.n - left;
    if (!moved) { sfx.error(); game.toast(to === game.inv ? 'Your bag is full.' : 'The crate is full.'); return; }
    from.removeAt(i, moved);
    sfx.plant();
  }

  update(game: Game): void {
    const inp = game.input;
    const invs = [this.box(game), game.inv];
    let L = this.layout(game);
    const n = invs[this.side].slots.length;
    let moved = false;
    if (inp.repeat('left')) { this.cursor = (this.cursor + n - 1) % n; moved = true; }
    if (inp.repeat('right')) { this.cursor = (this.cursor + 1) % n; moved = true; }
    if (inp.repeat('up')) {
      if (this.cursor >= COLS) this.cursor -= COLS;
      else { this.side ^= 1; const m = invs[this.side].slots.length; this.cursor = Math.min(m - 1, (Math.ceil(m / COLS) - 1) * COLS + (this.cursor % COLS)); }
      moved = true;
    }
    if (inp.repeat('down')) {
      if (this.cursor + COLS < n) this.cursor += COLS;
      else { this.side ^= 1; this.cursor = this.cursor % COLS; }
      moved = true;
    }
    if (moved) { sfx.blip(); this.follow(L); L = this.layout(game); }
    let act = inp.pressed('a');
    for (const t of inp.taps) {
      if (tapMore(game, this.mores, t)) return;
      let hit = false;
      L.cells.forEach((cs, k) => cs.forEach((r, j) => {
        const idx = j + L.grids[k].scroll * COLS;
        if (!hit && inRect(r, t.x, t.y) && idx < invs[k].slots.length) { this.side = k; this.cursor = idx; act = true; hit = true; }
      }));
      // Tap the grid's label to scroll it (when it has hidden rows).
      L.grids.forEach((g, k) => {
        const total = Math.ceil(invs[k].slots.length / COLS);
        if (!hit && total > g.rows && t.y >= g.top - 9 && t.y < g.top && inRect(L, t.x, t.y)) {
          const last = total - g.rows;
          this.scrolls[k] = g.scroll >= last ? 0 : Math.min(last, g.scroll + g.rows); // page down, then wrap to the top
          hit = true; sfx.blip();
        }
      });
      if (!hit && !inRect(L, t.x, t.y)) { this.close(game); return; }
    }
    if (act) {
      const [from, to] = this.side === 0 ? [this.box(game), game.inv] : [game.inv, this.box(game)];
      this.moveStack(game, from, to, this.cursor);
    }
    if (inp.pressed('b')) this.close(game);
  }

  private close(game: Game): void { this.closed = true; sfx.cancel(); game.input.releaseAll(); }

  draw(game: Game, g: CanvasRenderingContext2D): void {
    const L = this.layout(game);
    panel(g, L.x, L.y, L.w, L.h);
    drawText(g, 'CABIN STORAGE', L.x + 5, L.y + 4, P.LANTERN);
    drawTextRight(g, 'TAP: MOVE', L.x + L.w - 5, L.y + 4, P.MIST);
    L.grids.forEach((gr, k) => {
      const total = Math.ceil(gr.inv.slots.length / COLS);
      const used = gr.inv.slots.filter((s) => s).length;
      drawText(g, `${gr.label} ${used}/${gr.inv.slots.length}`, L.x + 5, gr.top - 8, k === this.side ? P.FERN : P.MIST);
      if (total > gr.rows) drawTextRight(g, `ROWS ${gr.scroll + 1}-${gr.scroll + gr.rows}/${total}`, L.x + L.w - 5, gr.top - 8, P.MIST);
      L.cells[k].forEach((r, j) => {
        const idx = j + gr.scroll * COLS;
        if (idx >= gr.inv.slots.length) return;
        const sel = k === this.side && idx === this.cursor;
        slotBox(g, r.x, r.y, r.w, sel, game.time);
        const st = gr.inv.slots[idx];
        if (st) {
          const icon = ICON[st.id];
          if (icon) g.drawImage(icon, r.x + 1, r.y + 1);
          if (st.n > 1) drawTextRight(g, String(st.n), r.x + r.w - 1, r.y + r.h - 6, P.FOG, P.VOID);
        }
      });
    });
    const iy = L.y + L.h - 36;
    g.fillStyle = hex(P.PINE); g.fillRect(L.x + 4, iy - 2, L.w - 8, 1);
    const st = (this.side === 0 ? this.box(game) : game.inv).slots[this.cursor];
    if (st) {
      const def = ITEMS[st.id];
      drawText(g, `${def.name}${st.n > 1 ? ` x${st.n}` : ''}`, L.x + 5, iy + 1, P.LANTERN);
      drawTextRight(g, `BAG ${game.inv.count(st.id)}  ${this.cellar ? 'CELLAR' : 'CRATE'} ${this.box(game).count(st.id)}`, L.x + L.w - 5, iy + 1, P.AMBER);
      this.mores = [drawClipped(g, def.desc, L.x + 5, iy + 9, L.w - 10, 2, 7, P.MIST, def.name, [P.FOREST, P.LANTERN])];
    } else {
      this.mores = [];
      drawText(g, 'EMPTY SLOT', L.x + 5, iy + 1, P.MIST);
      drawText(g, 'THE PORCH WORKBENCH CAN CRAFT', L.x + 5, iy + 9, P.MIST);
      drawText(g, 'WITH WHAT YOU KEEP IN HERE.', L.x + 5, iy + 16, P.MIST);
    }
    drawText(g, 'A: MOVE TO OTHER SIDE  B: CLOSE', L.x + 5, L.y + L.h - 9, P.MIST);
  }
}
