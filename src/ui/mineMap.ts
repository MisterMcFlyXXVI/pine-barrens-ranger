/**
 * The mine map (MAP underground): a mine surveyor's chart of the level you're on,
 * inked in as you explore. Workings you've seen, rails, alcoves, crawlways and
 * flooded drifts, the lift, your torches, gas you've met, and any brass tags you
 * dropped where you fell.
 */
import type { Game } from '../engine/game';
import type { Overlay } from './overlay';
import { panel } from './panel';
import { drawText, drawTextCentered, drawTextRight } from '../graphics/font';
import { P, hex } from '../graphics/palette';
import { sfx } from '../audio/sfx';
import { T, O } from '../data/tiles';
import { MINE_LEVELS, MINER_BY_ID } from '../data/mine';
import { MAP_NAMES } from '../data/maps';

export class MineMap implements Overlay {
  closed = false;

  update(game: Game): void {
    const inp = game.input;
    if (inp.pressed('b') || inp.pressed('map') || inp.pressed('a') || inp.taps.length) { this.closed = true; sfx.cancel(); }
  }

  draw(game: Game, g: CanvasRenderingContext2D): void {
    const m = game.cur, L = MINE_LEVELS[m.id], s = game.progress.mine;
    const W = Math.min(game.w - 8, 260), H = Math.min(game.h - 8, 200);
    const x = Math.floor((game.w - W) / 2), y = Math.floor((game.h - H) / 2);
    panel(g, x, y, W, H, 'paper');
    g.fillStyle = hex(P.VOID); g.fillRect(x + 2, y + 2, W - 4, 10);
    drawText(g, 'PINE HOLLOW NO. 3 -- SURVEY', x + 5, y + 4, P.FOG);
    drawTextRight(g, (MAP_NAMES[m.id] ?? '').toUpperCase().replace('THE DEEP SEAM: ', ''), x + W - 5, y + 4, P.AMBER);
    const bx = x + 6, by = y + 16, bw = W - 12, bh = H - 34;
    const sc = Math.max(1, Math.floor(Math.min(bw / m.w, bh / m.h)));
    const ox = bx + Math.floor((bw - m.w * sc) / 2), oy = by + Math.floor((bh - m.h * sc) / 2);
    const seen = (tx: number, ty: number) => m.seen[ty * m.w + tx] === 1;
    for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) {
      if (!seen(tx, ty)) continue;
      const gr = m.ground(tx, ty);
      let c = -1;
      if (gr === T.COAL_FLOOR) c = P.SHADOW;
      else if (gr === T.MINE_RAIL) c = (tx + ty) % 2 ? P.RUST : P.SHADOW;
      else if (gr === T.ALCOVE) c = P.AMBER;
      else if (gr === T.CRAWL) c = (tx + ty) % 2 ? P.TWILIGHT : P.LANTERN;
      else if (gr === T.SHALLOW || gr === T.WATER) c = P.TWILIGHT;
      else if (gr === T.GOB) c = P.MIST;
      else if (gr === T.COAL_RIB) {
        // Ink the rib only where it edges a working (the outline of the tunnels).
        const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const q = m.ground(tx + dx, ty + dy); return q !== T.COAL_RIB && q !== T.VOID && seen(tx + dx, ty + dy); });
        if (edge) c = P.RUST;
      }
      if (c < 0) continue;
      g.fillStyle = hex(c); g.fillRect(ox + tx * sc, oy + ty * sc, sc, sc);
    }
    // Gas you've met: hatched.
    if (L) for (const z of L.gas) {
      let met = false;
      for (let ty = z.y; ty < z.y + z.h && !met; ty++) for (let tx = z.x; tx < z.x + z.w; tx++) if (seen(tx, ty)) { met = true; break; }
      if (!met) continue;
      g.fillStyle = hex(z.kind === 'fire' ? P.FERN : P.VIOLET);
      for (let ty = z.y; ty < z.y + z.h; ty++) for (let tx = z.x; tx < z.x + z.w; tx++) if ((tx + ty) % 2 === 0) g.fillRect(ox + tx * sc, oy + ty * sc, Math.max(1, sc - 1), Math.max(1, sc - 1));
    }
    const mark = (tx: number, ty: number, col: number, r = 1) => { g.fillStyle = hex(col); g.fillRect(ox + tx * sc + Math.floor(sc / 2) - r, oy + ty * sc + Math.floor(sc / 2) - r, r * 2 + 1, r * 2 + 1); };
    // Things on the level.
    for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) {
      if (!seen(tx, ty)) continue;
      const o = m.obj(tx, ty);
      if (o === O.LIFT) mark(tx, ty, P.VOID, 2);
      else if (o === O.TORCH) mark(tx, ty, P.LANTERN, 1);
      else if (o === O.CALCIFIED) mark(tx, ty, P.CRAN, 1);
      else if (o === O.RUBBLE) mark(tx, ty, P.CRAN, 0);
      else if (o === O.CRIB) mark(tx, ty, P.AMBER, 1);
      else if (o === O.SEEP) mark(tx, ty, P.MIST, 0);
    }
    for (const d of s.dropped) if (d.map === m.id && Math.floor(game.time * 3) % 2 === 0) mark(d.x, d.y, P.LANTERN, 2);
    // You.
    if (Math.floor(game.time * 2) % 2 === 0) mark(game.player.tx, game.player.ty, P.RED, 2);
    // Legend.
    const ly = y + H - 15;
    const key = (lx: number, col: number, label: string) => { g.fillStyle = hex(col); g.fillRect(lx, ly + 1, 4, 4); drawText(g, label, lx + 6, ly, P.SHADOW); return lx + 8 + label.length * 4 + 6; };
    let lx = x + 6;
    lx = key(lx, P.RED, 'YOU'); lx = key(lx, P.VOID, 'LIFT'); lx = key(lx, P.AMBER, 'ALCOVE'); lx = key(lx, P.LANTERN, 'TORCH');
    const drops = s.dropped.filter((d) => d.map === m.id);
    if (drops.length) drawTextRight(g, `DROPPED: ${drops.map((d) => MINER_BY_ID[d.id].check).join(', ')}`, x + W - 6, ly, P.CRAN);
    else drawTextRight(g, 'A/B: CLOSE', x + W - 6, ly, P.RUST);
    if (!L) drawTextCentered(g, 'NO SURVEY OF THIS LEVEL', x + W / 2, y + H / 2, P.RUST);
  }
}
