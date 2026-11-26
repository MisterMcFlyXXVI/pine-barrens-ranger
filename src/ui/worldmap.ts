/**
 * Pocket map: REGION (a live minimap of where you are, with exits, snares and
 * lure mounts) and VALLEY (every region, how they connect, and Barney's handcar
 * fast travel once it's unlocked).
 */
import type { Game } from '../engine/game';
import type { Overlay } from './overlay';
import type { MapId } from '../data/mapgen';
import type { MapRuntime } from '../engine/world';
import { drawText, drawTextCentered, drawTextRight } from '../graphics/font';
import { hex, P } from '../graphics/palette';
import { makeCanvas, Canv } from '../graphics/canvas';
import { sfx } from '../audio/sfx';
import { T, O, MOUNT_OBJECT } from '../data/tiles';
import { BUILT_MAPS, MAP_NAMES, getMapDef } from '../data/maps';
import { CRYPTIDS } from '../data/cryptids';
import { inRect, panel, Rect } from './panel';
import { Dialog } from './menus';

/** Outdoor regions on the valley map: position (0..1) and short label. */
const NODES: Array<{ id: MapId; x: number; y: number; label: string }> = [
  { id: 'OLD_GROWTH_AND_SAWMILL', x: 0.5, y: 0.13, label: 'OLD GROWTH' },
  { id: 'RADIO_RIDGE_AND_CROSSROADS', x: 0.17, y: 0.44, label: 'RADIO RIDGE' },
  { id: 'PINE_TRAIL_AND_ORCHARD', x: 0.5, y: 0.44, label: 'PINE TRAIL' },
  { id: 'CRANBERRY_BOG_AND_SPRINGS', x: 0.83, y: 0.34, label: 'GLADES' },
  { id: 'CABIN_YARD', x: 0.5, y: 0.8, label: 'CABIN' },
  { id: 'PINE_HOLLOW_TOWN', x: 0.83, y: 0.74, label: 'TOWN' },
];

const OUTDOOR = new Set(NODES.map((n) => n.id));

/** Which outdoor region an interior belongs to (for "you are here"). */
function outdoorOf(id: MapId): MapId {
  if (OUTDOOR.has(id)) return id;
  if (id === 'CABIN_INTERIOR') return 'CABIN_YARD';
  return 'PINE_HOLLOW_TOWN';
}

/** Region links from the portal graph. */
function links(): Array<[MapId, MapId]> {
  const out: Array<[MapId, MapId]> = [];
  for (const id of OUTDOOR) {
    for (const p of getMapDef(id).portals) {
      const to = p.to as MapId;
      if (OUTDOOR.has(to) && id < to && !out.some(([a, b]) => a === id && b === to)) out.push([id, to]);
    }
  }
  return out;
}

/** Where fast travel drops you in a region: the porch at home, else the first trailhead leading in. */
function arrival(target: MapId): { x: number; y: number } | null {
  if (target === 'CABIN_YARD') return { x: 29, y: 19 };
  for (const id of BUILT_MAPS) {
    if (id === target) continue;
    const p = getMapDef(id).portals.find((q) => q.to === target);
    if (p) return { x: p.tx, y: p.ty };
  }
  return null;
}

/** Barney's handcar: after the Telegraph Repair quest, or once Barney trusts you (2 hearts). */
export function handcarUnlocked(game: Game): boolean {
  return game.progress.done('telegraph') || game.progress.flags.has('handcar');
}

const rgb = (i: number): [number, number, number] => { const h = hex(i); return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; };

const TREES = new Set<number>([O.PINE, O.OAK, O.HEMLOCK_TREE, O.RED_SPRUCE, O.WILLOW, O.APPLE_TREE, O.DEAD_TREE]);

/** One pixel per tile. */
function bakeMinimap(m: MapRuntime): Canv {
  const { c, g } = makeCanvas(m.w, m.h);
  const img = g.createImageData(m.w, m.h);
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const gr = m.ground(x, y), o = m.obj(x, y);
    let col: number = P.FOREST;
    if (gr === T.WATER) col = P.TWILIGHT;
    else if (gr === T.SHALLOW || gr === T.SPRING) col = P.MIST;
    else if (gr === T.PATH || gr === T.BOARDWALK || gr === T.BRIDGE || gr === T.PLATFORM || gr === T.PORCH) col = P.AMBER;
    else if (gr === T.FOREST || gr === T.HEMLOCK) col = P.PINE;
    else if (gr === T.BOG) col = P.CRAN;
    else if (gr === T.ROCKY || gr === T.SLOPE) col = P.RUST;
    else if (gr === T.CLIFF || gr === T.VOID) col = P.SHADOW;
    else if (gr === T.PLAZA || gr === T.MARBLE) col = P.FOG;
    else if (gr === T.RAIL) col = P.SHADOW;
    else if (gr === T.SOIL) col = P.RUST;
    else if (gr === T.CLOVER) col = P.MOSS;
    if (TREES.has(o)) col = P.SHADOW;
    if (o === O.BLOCK) col = P.LANTERN;
    const [r, gg, b] = rgb(col);
    const k = (y * m.w + x) * 4;
    img.data[k] = r; img.data[k + 1] = gg; img.data[k + 2] = b; img.data[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

export class WorldMap implements Overlay {
  closed = false;
  private tab: 0 | 1;
  private pick = 0;
  private img: Canv | null = null;
  private imgFor = '';

  constructor(game: Game) {
    // Indoors there's no minimap worth showing: open on the valley.
    this.tab = game.cur.def.indoor ? 1 : 0;
    const here = outdoorOf(game.cur.id);
    this.pick = Math.max(0, NODES.findIndex((n) => n.id === here));
  }

  private box(game: Game): Rect & { tabs: Rect[]; body: Rect } {
    const w = Math.min(game.w - 6, 250), h = Math.min(game.h - 6, 200);
    const x = Math.floor((game.w - w) / 2), y = Math.floor((game.h - h) / 2);
    const tw = Math.floor((w - 8) / 2);
    return { x, y, w, h, tabs: [0, 1].map((i) => ({ x: x + 4 + i * tw, y: y + 13, w: tw - 2, h: 10 })), body: { x: x + 4, y: y + 26, w: w - 8, h: h - 26 - 22 } };
  }

  private nodeRects(B: Rect): Rect[] {
    return NODES.map((n) => {
      const w = n.label.length * 4 + 6, h = 11;
      return { x: Math.round(B.x + n.x * B.w - w / 2), y: Math.round(B.y + 6 + n.y * (B.h - 18) - h / 2), w, h };
    });
  }

  update(game: Game): void {
    const inp = game.input;
    const B = this.box(game);
    if (inp.pressed('b') || inp.pressed('map')) { this.closed = true; sfx.cancel(); return; }
    let go = false;
    for (const t of inp.taps) {
      const ti = B.tabs.findIndex((r) => inRect(r, t.x, t.y));
      if (ti >= 0) { this.tab = ti as 0 | 1; sfx.blip(); return; }
      if (this.tab === 1) {
        const ni = this.nodeRects(B.body).findIndex((r) => inRect({ x: r.x - 4, y: r.y - 4, w: r.w + 8, h: r.h + 8 }, t.x, t.y));
        if (ni >= 0) { this.pick = ni; go = true; }
      }
      if (!inRect(B, t.x, t.y)) { this.closed = true; sfx.cancel(); return; }
    }
    if (this.tab === 0) {
      if (inp.repeat('left') || inp.repeat('right')) { this.tab = 1; sfx.blip(); }
      return;
    }
    if (inp.repeat('right') || inp.repeat('down')) { this.pick = (this.pick + 1) % NODES.length; sfx.blip(); }
    if (inp.repeat('left') || inp.repeat('up')) { this.pick = (this.pick + NODES.length - 1) % NODES.length; sfx.blip(); }
    if (inp.pressed('a')) go = true;
    if (go) this.travel(game, NODES[this.pick].id);
  }

  private travel(game: Game, to: MapId): void {
    const here = outdoorOf(game.cur.id);
    const name = MAP_NAMES[to];
    if (to === here && !game.cur.def.indoor) { sfx.blip(); game.toast(`You're already in ${name}.`); return; }
    if (!game.progress.visited.has(to)) { sfx.error(); game.toast('You haven\'t explored there yet.'); return; }
    if (!handcarUnlocked(game)) { sfx.error(); game.toast('Fast travel: help Barney fix the telegraph (or win his trust) for a ride on his handcar.'); return; }
    const dest = arrival(to);
    if (!dest) return;
    sfx.open();
    game.openOverlay(new Dialog([`Ride Barney's old C&O handcar to ${name}? (Takes about an hour.)`], [
      { label: 'Ride the handcar', fn: () => {
        this.closed = true;
        game.transition(() => {
          game.enterMap(to, dest.x, dest.y, 'down');
          game.clock.minutes = Math.min(game.clock.minutes + 60, 26 * 60 - 1);
          game.toast(`The handcar clatters off into the trees. Welcome to ${name}.`);
        });
      } },
      { label: 'Not now', fn: () => undefined },
    ]));
  }

  draw(game: Game, g: CanvasRenderingContext2D): void {
    const B = this.box(game);
    panel(g, B.x, B.y, B.w, B.h, 'paper');
    drawText(g, 'POCKET MAP', B.x + 5, B.y + 5, P.CRAN);
    drawTextRight(g, MAP_NAMES[game.cur.id].toUpperCase(), B.x + B.w - 5, B.y + 5, P.RUST);
    ['REGION', 'VALLEY'].forEach((t, i) => {
      const r = B.tabs[i], sel = i === this.tab;
      g.fillStyle = hex(sel ? P.CRAN : P.AMBER); g.fillRect(r.x, r.y, r.w, r.h);
      drawTextCentered(g, t, r.x + r.w / 2, r.y + 3, sel ? P.LANTERN : P.RUST);
    });
    if (this.tab === 0) this.drawRegion(game, g, B.body);
    else this.drawValley(game, g, B.body);
    const foot = this.tab === 0 ? 'L/R: VALLEY  B: CLOSE'
      : handcarUnlocked(game) ? 'TAP A PLACE TO RIDE THE HANDCAR  B: CLOSE' : 'FAST TRAVEL LOCKED (ASK BARNEY)  B: CLOSE';
    drawText(g, foot, B.x + 5, B.y + B.h - 9, P.RUST);
  }

  private drawRegion(game: Game, g: CanvasRenderingContext2D, R: Rect): void {
    const m = game.cur;
    if (m.def.indoor) { drawTextCentered(g, 'INDOORS. CHECK THE VALLEY TAB.', R.x + R.w / 2, R.y + R.h / 2, P.RUST); return; }
    if (!this.img || this.imgFor !== m.id) { this.img = bakeMinimap(m); this.imgFor = m.id; }
    const infoH = 16;
    // Fill the box (fractional scale is fine: pixels stay crisp with smoothing off).
    const s = Math.max(1, Math.min(3, Math.min(R.w / m.w, (R.h - infoH) / m.h)));
    const mw = Math.floor(m.w * s), mh = Math.floor(m.h * s);
    const ox = Math.floor(R.x + (R.w - mw) / 2), oy = R.y;
    g.fillStyle = hex(P.VOID); g.fillRect(ox - 1, oy - 1, mw + 2, mh + 2);
    g.drawImage(this.img, ox, oy, mw, mh);
    const dot = (tx: number, ty: number, c: number, size = Math.max(2, Math.round(s))) => { g.fillStyle = hex(c); g.fillRect(Math.round(ox + tx * s + s / 2 - size / 2), Math.round(oy + ty * s + s / 2 - size / 2), size, size); };
    // Exits
    for (const p of m.def.portals) for (let yy = p.y; yy < p.y + p.h; yy++) for (let xx = p.x; xx < p.x + p.w; xx++) dot(xx, yy, P.LANTERN, Math.max(1, Math.ceil(s)));
    // Snares & mounts
    for (const [i, o] of m.placed) {
      const tx = i % m.w, ty = Math.floor(i / m.w);
      if (o === O.SNARE) dot(tx, ty, m.snares.get(i) ? P.RED : P.AMBER);
      else if (Object.values(MOUNT_OBJECT).includes(o)) dot(tx, ty, P.VIOLET);
    }
    // You
    if (Math.floor(game.time * 3) % 2 === 0) dot(game.player.tx, game.player.ty, P.RED, Math.max(3, Math.round(s) + 1));
    const iy = oy + mh + 4;
    const here = CRYPTIDS.filter((c) => c.maps.includes(m.id));
    const seen = here.filter((c) => game.dex[c.id]?.seen).length;
    drawText(g, `CRYPTIDS HERE: ${seen}/${here.length} SEEN`, R.x + 1, iy, P.CRAN);
    const legend: Array<[number, string]> = [[P.RED, 'YOU'], [P.LANTERN, 'EXIT'], [P.AMBER, 'SNARE'], [P.VIOLET, 'LURE']];
    let lx = R.x + R.w - 1 - legend.reduce((a, [, t]) => a + t.length * 4 + 8, 0);
    for (const [c, t] of legend) { g.fillStyle = hex(P.VOID); g.fillRect(lx - 1, iy, 5, 5); g.fillStyle = hex(c); g.fillRect(lx, iy + 1, 3, 3); drawText(g, t, lx + 5, iy, P.RUST); lx += t.length * 4 + 8; }
  }

  private drawValley(game: Game, g: CanvasRenderingContext2D, R: Rect): void {
    const rects = this.nodeRects(R);
    const center = (r: Rect) => [r.x + r.w / 2, r.y + r.h / 2];
    g.fillStyle = hex(P.AMBER);
    for (const [a, b] of links()) {
      const ra = rects[NODES.findIndex((n) => n.id === a)], rb = rects[NODES.findIndex((n) => n.id === b)];
      if (!ra || !rb) continue;
      const [x0, y0] = center(ra), [x1, y1] = center(rb);
      const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 3);
      for (let i = 0; i <= n; i += 1) g.fillRect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), 1, 1);
    }
    // The sealed coal mine, north-east of the Old Growth.
    const mine = { x: rects[0].x + rects[0].w + 14, y: rects[0].y, w: 30, h: 11 };
    g.fillStyle = hex(P.SHADOW); g.fillRect(mine.x, mine.y, mine.w, mine.h);
    drawTextCentered(g, game.progress.has('grant') ? 'MINE' : 'MINE?', mine.x + mine.w / 2, mine.y + 3, P.RUST);
    const here = outdoorOf(game.cur.id);
    NODES.forEach((n, i) => {
      const r = rects[i];
      const visited = game.progress.visited.has(n.id);
      const sel = i === this.pick;
      g.fillStyle = hex(P.VOID); g.fillRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2);
      g.fillStyle = hex(visited ? (sel ? P.MOSS : P.FOREST) : P.SHADOW); g.fillRect(r.x, r.y, r.w, r.h);
      drawTextCentered(g, visited ? n.label : '???', r.x + r.w / 2, r.y + 3, visited ? P.LANTERN : P.RUST);
      if (n.id === here && Math.floor(game.time * 3) % 2 === 0) { g.fillStyle = hex(P.RED); g.fillRect(r.x - 4, r.y + 3, 3, 3); }
    });
    const n = NODES[this.pick];
    const total = CRYPTIDS.filter((c) => c.maps.includes(n.id)).length;
    const seen = CRYPTIDS.filter((c) => c.maps.includes(n.id) && game.dex[c.id]?.seen).length;
    const info = game.progress.visited.has(n.id) ? `${MAP_NAMES[n.id].toUpperCase()}: ${seen}/${total} CRYPTIDS SEEN` : 'UNEXPLORED';
    drawText(g, info, R.x + 1, R.y + R.h - 6, P.CRAN);
  }
}
