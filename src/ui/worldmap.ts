/**
 * Pocket map, styled like a national-park trail brochure: a black title band,
 * flat park colors, red dashed trails, labeled landmarks, compass and scale bar.
 * REGION is the map you're on, fogged where you haven't explored; VALLEY is the
 * whole valley with Barney's handcar fast travel.
 */
import type { Game } from '../engine/game';
import type { Overlay } from './overlay';
import type { MapId } from '../data/mapgen';
import type { MapRuntime } from '../engine/world';
import { drawText, drawTextCentered, drawTextRight } from '../graphics/font';
import { hex, P } from '../graphics/palette';
import { makeCanvas, Canv } from '../graphics/canvas';
import { valueNoise } from '../util';
import { sfx } from '../audio/sfx';
import { T, O, MOUNT_OBJECT } from '../data/tiles';
import { MAP_NAMES, getMapDef } from '../data/maps';
import { CRYPTIDS } from '../data/cryptids';
import { inRect, panel, Rect } from './panel';
import { Dialog } from './menus';
import { RAIL_LINKS, STOPS } from '../data/handcar';

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

/** Barney's handcar: after the Telegraph Repair quest, or once Barney trusts you (2 hearts). */
export function handcarUnlocked(game: Game): boolean {
  return game.progress.done('telegraph') || game.progress.flags.has('handcar');
}

const rgb = (i: number): [number, number, number] => { const h = hex(i); return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; };

const TREES = new Set<number>([O.PINE, O.OAK, O.HEMLOCK_TREE, O.RED_SPRUCE, O.WILLOW, O.APPLE_TREE, O.DEAD_TREE]);
const TRAILS = new Set<number>([T.PATH, T.BOARDWALK, T.BRIDGE]);
const PX = 2; // baked pixels per tile

/** Landmark labels for map zones. */
const ZONE_LABEL: Partial<Record<string, string>> = {
  lake: 'LAKE', deep: 'DEEP POOL', canal: 'OLD CANAL', springs: 'SULPHUR SPRINGS', sawmill: 'SAWMILL',
  timber: 'TIMBER STAND', crossroads: 'CROSSROADS', cliffs: 'HIGH CLIFFS', slope: 'SLIDE ROCK', summit: 'RADIO TOWER', orchard: 'APPLE GROVE',
};
const STRUCT_LABEL: Partial<Record<string, string>> = {
  cabin: 'CABIN', shed: 'SHED', mine: 'MINE', tower: 'TOWER', diner: 'DINER', store: 'STORE', museum: 'MUSEUM', station: 'STATION',
};

/** The region map in park-brochure colors, with fog over unexplored ground. */
function bakeMinimap(m: MapRuntime): Canv {
  const stop = STOPS.get(m.id);
  const W = m.w * PX, H = m.h * PX;
  const { c, g } = makeCanvas(W, H);
  const img = g.createImageData(W, H);
  const put = (x: number, y: number, col: number) => { const [r, gg, b] = rgb(col); const k = (y * W + x) * 4; img.data[k] = r; img.data[k + 1] = gg; img.data[k + 2] = b; img.data[k + 3] = 255; };
  const seen = (x: number, y: number) => m.inBounds(x, y) && m.seen[y * m.w + x] === 1;
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const gr = m.ground(x, y), o = m.obj(x, y);
    const water = (gx: number, gy: number) => { const q = m.ground(gx, gy); return q === T.WATER || q === T.SHALLOW || q === T.SPRING; };
    for (let py = 0; py < PX; py++) for (let px = 0; px < PX; px++) {
      const X = x * PX + px, Y = y * PX + py;
      const odd = (X + Y) % 2 === 1;
      let col: number = P.MOSS;
      if (gr === T.WATER || gr === T.SHALLOW) {
        const shore = !water(x - 1, y) || !water(x + 1, y) || !water(x, y - 1) || !water(x, y + 1);
        col = shore ? P.TWILIGHT : gr === T.SHALLOW ? P.MOON : P.MIST;
      } else if (gr === T.SPRING) col = odd ? P.MOON : P.FOG;
      else if (TRAILS.has(gr)) col = (x + y) % 4 < 2 ? P.RED : (gr === T.PATH ? P.LANTERN : P.AMBER); // red dashed trail
      else if (gr === T.FOREST || gr === T.HEMLOCK) col = odd ? P.FOREST : P.MOSS;
      else if (gr === T.CLOVER) col = odd ? P.FERN : P.MOSS;
      else if (gr === T.BOG) col = odd ? P.MOSS : P.VIOLET;
      else if (gr === T.ROCKY) col = odd ? P.AMBER : P.LANTERN;
      else if (gr === T.SLOPE) col = (X + Y * 2) % 4 === 0 ? P.RUST : P.AMBER;
      else if (gr === T.CLIFF) col = (X - Y) % 3 === 0 ? P.SHADOW : P.RUST;
      else if (gr === T.PLAZA || gr === T.MARBLE || gr === T.PLATFORM || gr === T.PORCH) col = P.FOG;
      else if (gr === T.RAIL) col = px === 0 ? P.SHADOW : P.MIST;
      else if (gr === T.SOIL) col = P.RUST;
      else if (gr === T.VOID) col = P.SHADOW;
      if (TREES.has(o)) col = (px + py) % 2 === 0 ? P.PINE : P.FOREST; // stippled woods
      if (o === O.BLOCK) col = px === 0 && py === 0 ? P.VOID : P.CRAN; // buildings
      // Railroad symbol along the old line: dark track with crossties.
      const rail = stop?.route.get(y * m.w + x);
      if (rail !== undefined && !TRAILS.has(gr) && gr !== T.WATER) {
        const along = rail === 0 ? py === 0 : px === 0;
        const tie = rail === 0 ? x % 2 === 0 : y % 2 === 0;
        col = along || tie ? P.VOID : P.FOG; // dark track with a pale edge so it reads on any ground
      }
      // Fog of war: drifting white mist with blue-grey wisps, thinning at the edge of what you've seen.
      if (!seen(x, y)) {
        const edge = seen(x - 1, y) || seen(x + 1, y) || seen(x, y - 1) || seen(x, y + 1);
        if (!edge || odd) {
          const n = valueNoise(X / 9, Y / 5, 77);
          col = n > 0.7 && (X + Y) % 2 === 0 ? P.MIST : n > 0.55 && (X * 3 + Y) % 7 === 0 ? P.MIST : P.FOG;
        }
      }
      put(X, Y, col);
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Tiny map symbol (5x5) for a landmark. */
function symbol(g: CanvasRenderingContext2D, x: number, y: number, kind: string): void {
  const art: Record<string, string[]> = {
    house: ['..x..', '.xxx.', 'xxxxx', '.x.x.', '.xxx.'],
    tower: ['..x..', '..x..', '.x.x.', '.x.x.', 'x...x'],
    mine: ['xxxxx', 'x...x', 'x.x.x', 'x...x', 'x...x'],
    station: ['xxxxx', 'x.x.x', 'xxxxx', 'x...x', 'xxxxx'],
  };
  const rows = art[kind] ?? art.house;
  g.fillStyle = hex(P.LANTERN); g.fillRect(x - 1, y - 1, 7, 7);
  g.fillStyle = hex(P.VOID);
  rows.forEach((r, j) => { for (let i = 0; i < 5; i++) if (r[i] === 'x') g.fillRect(x + i, y + j, 1, 1); });
}

/** Label with a dark backing plate, NPS-style. */
function plate(g: CanvasRenderingContext2D, text: string, cx: number, cy: number, fg: number = P.FOG, bg: number = P.VOID): void {
  const w = text.length * 4 + 3;
  const x = Math.round(cx - w / 2), y = Math.round(cy - 4);
  g.fillStyle = hex(bg); g.fillRect(x, y, w, 8);
  drawText(g, text, x + 2, y + 2, fg);
}

/** Places map labels without overlaps: tries the spot, then nudges below/above; skips if nothing fits. */
class LabelBoard {
  private used: Rect[] = [];
  constructor(private readonly bounds: Rect) {}
  reserve(r: Rect): void { this.used.push(r); }
  place(g: CanvasRenderingContext2D, text: string, cx: number, cy: number, fg: number, bg: number): boolean {
    const w = text.length * 4 + 3;
    for (const dy of [0, 9, -9, 18, -18]) {
      const r = { x: Math.round(cx - w / 2), y: Math.round(cy + dy - 4), w, h: 8 };
      const B = this.bounds;
      if (r.x < B.x || r.y < B.y || r.x + r.w > B.x + B.w || r.y + r.h > B.y + B.h) continue;
      if (this.used.some((u) => r.x < u.x + u.w + 1 && r.x + r.w + 1 > u.x && r.y < u.y + u.h + 1 && r.y + r.h + 1 > u.y)) continue;
      this.used.push(r);
      plate(g, text, cx, cy + dy, fg, bg);
      return true;
    }
    return false;
  }
}

function compass(g: CanvasRenderingContext2D, x: number, y: number): void {
  g.fillStyle = hex(P.VOID); g.fillRect(x - 5, y - 7, 11, 18);
  g.fillStyle = hex(P.LANTERN); g.fillRect(x - 4, y - 6, 9, 16);
  drawText(g, 'N', x - 1, y - 5, P.VOID);
  g.fillStyle = hex(P.RED);
  for (let k = 0; k < 3; k++) g.fillRect(x - k, y + 2 + k, 1 + 2 * k, 1); // arrowhead
  g.fillStyle = hex(P.VOID); g.fillRect(x, y + 5, 1, 4);
}

function scaleBar(g: CanvasRenderingContext2D, x: number, y: number): void {
  g.fillStyle = hex(P.LANTERN); g.fillRect(x - 1, y - 1, 46, 11);
  for (let k = 0; k < 4; k++) { g.fillStyle = hex(k % 2 ? P.FOG : P.VOID); g.fillRect(x + k * 5, y + 6, 5, 3); }
  drawText(g, '1/4 MI', x + 21, y + 4, P.VOID);
  drawText(g, '0', x, y, P.VOID);
}

export class WorldMap implements Overlay {
  closed = false;
  private tab: 0 | 1;
  private pick = 0;
  private img: Canv | null = null;
  private imgFor = '';

  /** Opened by talking to Barney at a handcar stop: the VALLEY tab picks a destination. */
  constructor(game: Game, private readonly fromStop: MapId | null = null) {
    // Indoors (or riding) the valley is what matters.
    this.tab = game.cur.def.indoor || fromStop ? 1 : 0;
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
    const name = MAP_NAMES[to];
    if (!this.fromStop) { sfx.error(); game.toast('Fast travel leaves from a handcar stop. Find the one in this region.'); return; }
    if (to === this.fromStop) { sfx.blip(); game.toast(`You're at the ${name} stop.`); return; }
    if (!game.progress.visited.has(to)) { sfx.error(); game.toast('You haven\'t explored there yet.'); return; }
    const stop = STOPS.get(to);
    if (!stop || !game.stopRepaired(to)) { sfx.error(); game.toast(`The ${name} stop needs repairs first. Walk there and fix it.`); return; }
    sfx.open();
    game.openOverlay(new Dialog([`Ride Barney's handcar to the ${name} stop? (About an hour.)`], [
      { label: 'Ride the handcar', fn: () => {
        this.closed = true;
        game.transition(() => {
          game.enterMap(to, stop.arrive.x, stop.arrive.y, stop.arrive.dir);
          game.clock.minutes = Math.min(game.clock.minutes + 60, 26 * 60 - 1);
          game.toast(`The handcar clatters down the spur. Welcome to ${name}.`);
        });
      } },
      { label: 'Not now', fn: () => undefined },
    ]));
  }

  draw(game: Game, g: CanvasRenderingContext2D): void {
    const B = this.box(game);
    panel(g, B.x, B.y, B.w, B.h, 'paper');
    // NPS-style black title band
    g.fillStyle = hex(P.VOID); g.fillRect(B.x + 2, B.y + 2, B.w - 4, 10);
    drawText(g, 'PINE HOLLER NATIONAL FOREST', B.x + 5, B.y + 4, P.FOG);
    drawTextRight(g, this.tab === 0 ? 'TRAIL MAP' : 'VALLEY', B.x + B.w - 5, B.y + 4, P.AMBER);
    ['REGION', 'VALLEY'].forEach((t, i) => {
      const r = B.tabs[i], sel = i === this.tab;
      g.fillStyle = hex(sel ? P.CRAN : P.AMBER); g.fillRect(r.x, r.y, r.w, r.h);
      drawTextCentered(g, t, r.x + r.w / 2, r.y + 3, sel ? P.LANTERN : P.RUST);
    });
    if (this.tab === 0) this.drawRegion(game, g, B.body);
    else this.drawValley(game, g, B.body);
    const foot = this.tab === 0 ? 'L/R: VALLEY  B: CLOSE'
      : this.fromStop ? 'TAP A WORKING STOP TO RIDE  B: CLOSE'
      : handcarUnlocked(game) ? 'RIDE FROM ANY WORKING HANDCAR STOP' : 'HANDCAR: ASK BARNEY AT THE STATION';
    drawText(g, foot, B.x + 5, B.y + B.h - 9, P.RUST);
  }

  private drawRegion(game: Game, g: CanvasRenderingContext2D, R: Rect): void {
    const m = game.cur;
    if (m.def.indoor) { drawTextCentered(g, 'INDOORS. CHECK THE VALLEY TAB.', R.x + R.w / 2, R.y + R.h / 2, P.RUST); return; }
    if (!this.img || this.imgFor !== m.id) { this.img = bakeMinimap(m); this.imgFor = m.id; }
    const infoH = 20;
    // Tiles -> screen: fill the box (fractional is fine with smoothing off).
    const s = Math.max(1, Math.min(3, Math.min((R.w - 4) / m.w, (R.h - infoH - 4) / m.h)));
    const mw = Math.floor(m.w * s), mh = Math.floor(m.h * s);
    const ox = Math.floor(R.x + (R.w - mw) / 2), oy = R.y + 2;
    // Brochure frame
    g.fillStyle = hex(P.VOID); g.fillRect(ox - 2, oy - 2, mw + 4, mh + 4);
    g.fillStyle = hex(P.AMBER); g.fillRect(ox - 1, oy - 1, mw + 2, mh + 2);
    g.drawImage(this.img, ox, oy, mw, mh);
    const sx = (tx: number) => Math.round(ox + (tx + 0.5) * s), sy = (ty: number) => Math.round(oy + (ty + 0.5) * s);
    const seenAt = (tx: number, ty: number) => m.inBounds(tx, ty) && m.seen[ty * m.w + tx] === 1;
    g.save(); g.beginPath(); g.rect(ox, oy, mw, mh); g.clip();
    const labels = new LabelBoard({ x: ox, y: oy, w: mw, h: mh });
    labels.reserve({ x: ox + mw - 14, y: oy, w: 14, h: 20 });  // compass
    labels.reserve({ x: ox, y: oy, w: 50, h: 16 });              // scale bar
    const youX = sx(game.player.tx), youY = sy(game.player.ty);
    labels.reserve({ x: youX - 4, y: youY - 4, w: 9, h: 9 });    // you
    labels.reserve({ x: youX - 26, y: youY - 14, w: 52, h: 9 }); // YOU ARE HERE
    // Landmarks you've seen
    for (const z of m.def.zones) {
      const label = ZONE_LABEL[z.zone];
      const cx = z.x + Math.floor(z.w / 2), cy = z.y + Math.floor(z.h / 2);
      if (label && seenAt(cx, cy)) labels.place(g, label, sx(cx), sy(cy), P.LANTERN, P.RUST);
    }
    for (const st of m.def.structures) {
      const cx = st.x + Math.floor(st.w / 2), cy = st.y + Math.floor(st.h / 2);
      if (!seenAt(cx, cy)) continue;
      const label = STRUCT_LABEL[st.kind];
      symbol(g, sx(cx) - 2, sy(cy) - 2, st.kind === 'tower' ? 'tower' : st.kind === 'mine' ? 'mine' : st.kind === 'station' ? 'station' : 'house');
      if (label && st.kind !== 'house') drawText(g, label, sx(cx) + 5, sy(cy) - 2, P.VOID, P.LANTERN);
    }
    // The handcar stop
    const stop = STOPS.get(m.id);
    if (stop && seenAt(stop.car.x, stop.car.y)) {
      const ok = game.stopRepaired(m.id);
      symbol(g, sx(stop.car.x) - 2, sy(stop.car.y) - 2, 'station');
      labels.reserve({ x: sx(stop.car.x) - 3, y: sy(stop.car.y) - 3, w: 7, h: 7 });
      labels.place(g, ok ? 'HANDCAR' : 'STOP (BROKEN)', sx(stop.car.x), sy(stop.car.y) - 8, P.LANTERN, ok ? P.FOREST : P.RUST);
    }
    // Trailheads (exits) with where they lead
    const done = new Set<string>();
    for (const p of m.def.portals) {
      const to = p.to as MapId;
      const cx = p.x + Math.floor(p.w / 2), cy = p.y + Math.floor(p.h / 2);
      if (!seenAt(cx, cy) || !OUTDOOR.has(to) || done.has(to)) continue;
      done.add(to);
      const node = NODES.find((n) => n.id === to);
      const name = (game.progress.visited.has(to) ? node?.label : '???') ?? '???';
      const left = cx <= 1, right = cx >= m.w - 2, top = cy <= 1;
      const text = left ? `< ${name}` : right ? `${name} >` : top ? `^ ${name}` : `${name} V`;
      const px = left ? sx(cx) + text.length * 2 + 3 : right ? sx(cx) - text.length * 2 - 3 : sx(cx);
      const py = top ? sy(cy) + 6 : cy >= m.h - 2 ? sy(cy) - 6 : sy(cy);
      labels.place(g, text, px, py, P.LANTERN, P.VOID);
    }
    // Snares & lure mounts
    const mark = (tx: number, ty: number, c: number) => { g.fillStyle = hex(P.VOID); g.fillRect(sx(tx) - 2, sy(ty) - 2, 5, 5); g.fillStyle = hex(c); g.fillRect(sx(tx) - 1, sy(ty) - 1, 3, 3); };
    for (const [i, o] of m.placed) {
      const tx = i % m.w, ty = Math.floor(i / m.w);
      if (o === O.SNARE) mark(tx, ty, m.snares.get(i) ? P.RED : P.AMBER);
      else if (Object.values(MOUNT_OBJECT).includes(o)) mark(tx, ty, P.VIOLET);
    }
    // You are here
    const yx = youX, yy = youY;
    const on = Math.floor(game.time * 3) % 2 === 0;
    g.fillStyle = hex(P.LANTERN); g.fillRect(yx - 3, yy - 3, 7, 7);
    g.fillStyle = hex(on ? P.RED : P.CRAN); g.fillRect(yx - 2, yy - 2, 5, 5);
    plate(g, 'YOU ARE HERE', yx, yy - 9, P.LANTERN, P.RED);
    g.restore();
    compass(g, ox + mw - 8, oy + 8);
    scaleBar(g, ox + 4, oy + 4);
    // Footer info + legend
    const iy = oy + mh + 5;
    const here = CRYPTIDS.filter((c) => c.maps.includes(m.id));
    const seenC = here.filter((c) => game.dex[c.id]?.seen).length;
    const explored = Math.round((m.seen.reduce((a, v) => a + v, 0) / m.seen.length) * 100);
    drawText(g, `EXPLORED ${explored}%   CRYPTIDS ${seenC}/${here.length}`, R.x + 1, iy, P.CRAN);
    let lx = R.x + 1;
    const ly = iy + 8;
    g.fillStyle = hex(P.RED); g.fillRect(lx, ly + 2, 3, 1); g.fillRect(lx + 6, ly + 2, 3, 1); drawText(g, 'TRAIL', lx + 11, ly, P.RUST); lx += 34;
    for (const [c, t] of [[P.AMBER, 'SNARE'], [P.RED, 'CATCH'], [P.VIOLET, 'LURE']] as Array<[number, string]>) {
      g.fillStyle = hex(P.VOID); g.fillRect(lx, ly, 5, 5); g.fillStyle = hex(c); g.fillRect(lx + 1, ly + 1, 3, 3);
      drawText(g, t, lx + 7, ly, P.RUST); lx += t.length * 4 + 12;
    }
  }

  private drawValley(game: Game, g: CanvasRenderingContext2D, R: Rect): void {
    const rects = this.nodeRects(R);
    const center = (r: Rect) => [r.x + r.w / 2, r.y + r.h / 2];
    // Park background: forested valley with a river
    g.fillStyle = hex(P.MOSS); g.fillRect(R.x, R.y, R.w, R.h - 10);
    for (let y = R.y; y < R.y + R.h - 10; y += 2) for (let x = R.x + ((y / 2) % 2) * 2; x < R.x + R.w; x += 4) { g.fillStyle = hex(P.FOREST); g.fillRect(x, y, 1, 1); }
    g.fillStyle = hex(P.TWILIGHT);
    for (let k = 0; k < R.h - 10; k++) g.fillRect(Math.round(R.x + R.w * 0.68 + Math.sin(k / 9) * 6), R.y + k, 3, 1);
    g.fillStyle = hex(P.MIST);
    for (let k = 0; k < R.h - 10; k++) g.fillRect(Math.round(R.x + R.w * 0.68 + Math.sin(k / 9) * 6) + 1, R.y + k, 1, 1);
    // Trails between regions (red dashes)
    for (const [a, b] of links()) {
      const ra = rects[NODES.findIndex((n) => n.id === a)], rb = rects[NODES.findIndex((n) => n.id === b)];
      if (!ra || !rb) continue;
      const [x0, y0] = center(ra), [x1, y1] = center(rb);
      const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
      for (let i = 0; i <= n; i++) if (i % 5 < 3) { g.fillStyle = hex(P.RED); g.fillRect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), 2, 2); }
    }
    // The C&O spur: railroad symbol (line with crossties) between handcar stops.
    for (const [a, b] of RAIL_LINKS) {
      const ia = NODES.findIndex((nd) => nd.id === a), ib = NODES.findIndex((nd) => nd.id === b);
      if (ia < 0 || ib < 0) continue;
      const known = game.progress.visited.has(a) && game.progress.visited.has(b);
      const [x0, y0] = center(rects[ia]), [x1, y1] = center(rects[ib]);
      // Offset the rail a little from the trail so both read.
      const nx = -(y1 - y0), ny = x1 - x0, nl = Math.hypot(nx, ny) || 1;
      const ox = (nx / nl) * 6, oy = (ny / nl) * 6;
      const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
      for (let i = 0; i <= n; i++) {
        if (!known && i % 4 > 1) continue; // faint where unexplored
        const px = Math.round(x0 + ox + ((x1 - x0) * i) / n), py = Math.round(y0 + oy + ((y1 - y0) * i) / n);
        g.fillStyle = hex(known ? P.VOID : P.SHADOW); g.fillRect(px, py, 1, 1);
        if (known && i % 4 === 0) { g.fillRect(Math.round(px - (nx / nl) * 2), Math.round(py - (ny / nl) * 2), 1, 1); g.fillRect(Math.round(px + (nx / nl) * 2), Math.round(py + (ny / nl) * 2), 1, 1); }
      }
    }
    {
      const [x0, y0] = center(rects[NODES.findIndex((nd) => nd.id === 'CABIN_YARD')]), [x1, y1] = center(rects[NODES.findIndex((nd) => nd.id === 'PINE_HOLLOW_TOWN')]);
      if (game.progress.visited.has('PINE_HOLLOW_TOWN')) drawText(g, 'C&O SPUR', Math.round((x0 + x1) / 2) - 14, Math.round((y0 + y1) / 2) + 6, P.VOID, P.FERN);
    }
    // The sealed coal mine, north-east of the Old Growth.
    const mx = rects[0].x + rects[0].w + 12, my = rects[0].y + 2;
    symbol(g, mx, my, 'mine');
    drawText(g, game.progress.has('grant') ? 'MINE' : 'MINE?', mx + 8, my, P.VOID, P.LANTERN);
    const here = outdoorOf(game.cur.id);
    NODES.forEach((n, i) => {
      const r = rects[i];
      const visited = game.progress.visited.has(n.id);
      const sel = i === this.pick;
      if (!visited) {
        // Fog cloud over unexplored country
        for (let k = 0; k < 7; k++) {
          const cx = r.x + r.w / 2 + Math.cos(k * 0.9) * (r.w / 2 - 2), cy = r.y + r.h / 2 + Math.sin(k * 1.7) * 4;
          g.fillStyle = hex(k % 2 ? P.FOG : P.MIST); g.beginPath(); g.arc(cx, cy, k % 2 ? 6 : 5, 0, Math.PI * 2); g.fill();
        }
        drawTextCentered(g, '???', r.x + r.w / 2, r.y + 3, P.TWILIGHT);
        if (sel) { g.fillStyle = hex(P.RED); g.fillRect(r.x - 2, r.y + r.h + 2, r.w + 4, 1); }
        return;
      }
      g.fillStyle = hex(sel ? P.LANTERN : P.VOID); g.fillRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4);
      g.fillStyle = hex(P.VOID); g.fillRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2);
      drawTextCentered(g, n.label, r.x + r.w / 2, r.y + 3, P.FOG);
      // Handcar stop badge: green = working, rust = needs repair.
      const fixed = game.stopRepaired(n.id);
      g.fillStyle = hex(P.VOID); g.fillRect(r.x + r.w - 3, r.y - 5, 9, 9);
      g.fillStyle = hex(fixed ? P.MOSS : P.RUST); g.fillRect(r.x + r.w - 2, r.y - 4, 7, 7);
      drawText(g, 'H', r.x + r.w, r.y - 3, fixed ? P.LANTERN : P.VOID);
      if (n.id === here) plate(g, 'YOU ARE HERE', r.x + r.w / 2, r.y + r.h + 7, P.LANTERN, Math.floor(game.time * 3) % 2 ? P.RED : P.CRAN);
    });
    compass(g, R.x + R.w - 9, R.y + 8);
    const n = NODES[this.pick];
    const total = CRYPTIDS.filter((c) => c.maps.includes(n.id)).length;
    const seen = CRYPTIDS.filter((c) => c.maps.includes(n.id) && game.dex[c.id]?.seen).length;
    const stopTxt = game.stopRepaired(n.id) ? 'STOP OK' : 'STOP BROKEN';
    const info = game.progress.visited.has(n.id) ? `${MAP_NAMES[n.id].toUpperCase()}: ${seen}/${total} SEEN, ${stopTxt}` : 'UNEXPLORED: FOLLOW THE TRAILS TO FIND IT';
    drawText(g, info, R.x + 1, R.y + R.h - 6, P.CRAN);
  }
}
