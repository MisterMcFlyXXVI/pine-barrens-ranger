/** Map types and the deterministic layout Builder shared by every region. */
import { T, O } from './tiles';
import type { Dir } from '../util';
import type { Zone } from './cryptids';

export type MapId =
  | 'CABIN_YARD'
  | 'CABIN_INTERIOR'
  | 'PINE_TRAIL_AND_ORCHARD'
  | 'PINE_HOLLOW_TOWN'
  | 'CRANBERRY_BOG_AND_SPRINGS'
  | 'OLD_GROWTH_AND_SAWMILL'
  | 'RADIO_RIDGE_AND_CROSSROADS'
  | 'COAL_MINE'
  | 'DINER_INT'
  | 'STORE_INT'
  | 'MUSEUM_INT'
  | 'MUSEUM_BASEMENT'
  | 'HOUSE_VANCE'
  | 'HOUSE_FINCH'
  | 'HOUSE_MILLER'
  | 'HOUSE_CALLOWAY'
  | 'HOUSE_RUTH'
  | 'STORE_LOFT'
  | 'DINER_ROOM'
  | 'HOUSE_MEISSGEIER'
  | 'LAMP_HOUSE'
  | 'MINE_L1'
  | 'MINE_L2'
  | 'MINE_L3'
  | 'MINE_L4'
  | 'EXPANSION_RAIL';

export interface Portal {
  x: number; y: number; w: number; h: number;
  to: MapId;
  tx: number; ty: number;
  dir: Dir;
  /** Shown when the destination region isn't open yet. */
  closedMsg: string;
  /** Shown instead once the Town Restoration Grant is awarded. */
  grantMsg?: string;
  /** Progress gate (e.g. the Archive Basement needs 6 donations). */
  requires?: 'archive' | 'home';
}

export interface Structure {
  kind: 'cabin' | 'shed' | 'mine' | 'tower' | 'diner' | 'store' | 'museum' | 'house' | 'station';
  x: number; y: number; w: number; h: number;
  door: { x: number; y: number };
  /** Door leads somewhere via a portal (else it is locked). */
  open: boolean;
  lockedMsg?: string;
  /** Night light sources, pixel offsets from the footprint's top-left corner. */
  windows: Array<[number, number]>;
  chimney?: [number, number];
  /** House art variant (else chosen from position). */
  variant?: number;
}

export interface PlotDef {
  x: number;
  y: number;
  bog: boolean;
  /** Cleared at the start of a new game. */
  starter: boolean;
}

export interface ZoneRect {
  zone: Zone;
  x: number; y: number; w: number; h: number;
}

/** A daily forage roll: `count` items from `table` placed on free `spots`. */
export interface ForageGroup {
  spots: number[];
  table: string[];
  count: number;
  /** Keepsake that adds two more finds to this group (Opa Walter's herb satchel). */
  boost?: string;
  /** Only spawns while this is in the day's boosts (e.g. "event:osterhase"). */
  only?: string;
}

export interface MapDef {
  id: MapId;
  name: string;
  w: number;
  h: number;
  indoor: boolean;
  /** Wilderness regions host cryptid encounters and weather. */
  wild: boolean;
  ground: Uint8Array;
  objects: Uint8Array;
  /** Filler tile index -> anchor tile index for multi-tile objects. */
  anchors: Map<number, number>;
  /** Tile index -> structure index for building footprints. */
  structAt: Map<number, number>;
  structures: Structure[];
  portals: Portal[];
  plots: PlotDef[];
  signs: Map<number, string>;
  forage: ForageGroup[];
  zones: ZoneRect[];
  /** Battle backdrop palette: [sky/day, ground]. */
  battleColors: [number, number];
  /** Per-tile tags (museum case -> cryptid id, survey table -> ritual...). */
  meta?: Map<number, string>;
  /** Someone's home: every object with text in `signs` reads it when inspected. */
  home?: boolean;
}

export class Builder {
  ground: Uint8Array;
  objects: Uint8Array;
  anchors = new Map<number, number>();
  structAt = new Map<number, number>();
  structures: Structure[] = [];
  signs = new Map<number, string>();
  zones: ZoneRect[] = [];
  meta = new Map<number, string>();

  constructor(readonly w: number, readonly h: number, fill: number) {
    this.ground = new Uint8Array(w * h).fill(fill);
    this.objects = new Uint8Array(w * h);
  }

  in(x: number, y: number): boolean { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  i(x: number, y: number): number { return y * this.w + x; }
  g(x: number, y: number): number { return this.in(x, y) ? this.ground[this.i(x, y)] : T.VOID; }
  o(x: number, y: number): number { return this.in(x, y) ? this.objects[this.i(x, y)] : O.NONE; }
  setG(x: number, y: number, t: number): void { if (this.in(x, y)) this.ground[this.i(x, y)] = t; }
  setO(x: number, y: number, o: number): void { if (this.in(x, y)) this.objects[this.i(x, y)] = o; }

  rectG(x: number, y: number, w: number, h: number, t: number): void {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.setG(xx, yy, t);
  }

  ellipseG(cx: number, cy: number, rx: number, ry: number, t: number, clearObj = true): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny <= 1) { this.setG(x, y, t); if (clearObj) this.setO(x, y, O.NONE); }
      }
    }
  }

  zone(zone: Zone, x: number, y: number, w: number, h: number): void {
    this.zones.push({ zone, x, y, w, h });
  }

  /** Multi-tile object: anchor at bottom-left, fillers become solid BLOCKs. */
  place(x: number, y: number, o: number, fw = 1, fh = 1): void {
    const ax = x, ay = y + fh - 1;
    for (let yy = y; yy < y + fh; yy++) {
      for (let xx = x; xx < x + fw; xx++) {
        if (xx === ax && yy === ay) continue;
        this.setO(xx, yy, O.BLOCK);
        this.anchors.set(this.i(xx, yy), this.i(ax, ay));
      }
    }
    this.setO(ax, ay, o);
  }

  structure(s: Structure): void {
    const idx = this.structures.length;
    this.structures.push(s);
    for (let yy = s.y; yy < s.y + s.h; yy++) {
      for (let xx = s.x; xx < s.x + s.w; xx++) {
        this.structAt.set(this.i(xx, yy), idx);
        if (s.open && xx === s.door.x && yy === s.door.y) { this.setO(xx, yy, O.NONE); continue; }
        this.setO(xx, yy, O.BLOCK);
      }
    }
  }

  sign(x: number, y: number, text: string): void {
    this.setO(x, y, O.SIGN);
    this.signs.set(this.i(x, y), text);
  }

  /**
   * Catmull-Rom spline trail through waypoints. `tile` is laid on land;
   * deep/shallow water becomes `waterTile`, cliffs become climbable slope.
   */
  trail(pts: Array<[number, number]>, width = 2, tile: number = T.PATH, waterTile: number = T.BRIDGE): void {
    const P = [pts[0], ...pts, pts[pts.length - 1]];
    for (let s = 1; s < P.length - 2; s++) {
      const [p0, p1, p2, p3] = [P[s - 1], P[s], P[s + 1], P[s + 2]];
      const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      const steps = Math.max(2, Math.ceil(len * 3));
      for (let k = 0; k <= steps; k++) {
        const t = k / steps, t2 = t * t, t3 = t2 * t;
        const cr = (a: number, b: number, c: number, d: number) =>
          0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        const x = cr(p0[0], p1[0], p2[0], p3[0]);
        const y = cr(p0[1], p1[1], p2[1], p3[1]);
        for (let oy = 0; oy < width; oy++) {
          for (let ox = 0; ox < width; ox++) {
            const tx = Math.floor(x) + ox, ty = Math.floor(y) + oy;
            if (!this.in(tx, ty) || this.structAt.has(this.i(tx, ty))) continue;
            const cur = this.g(tx, ty);
            if (cur === T.WATER || cur === T.BRIDGE || cur === T.SHALLOW || cur === T.SPRING) this.setG(tx, ty, waterTile);
            else if (cur === T.CLIFF || cur === T.SLOPE) this.setG(tx, ty, T.SLOPE);
            else if (cur !== T.PORCH && cur !== T.RUIN_FLOOR && cur !== T.BOARDWALK) this.setG(tx, ty, tile);
            const o = this.o(tx, ty);
            if (o !== O.BLOCK) this.setO(tx, ty, O.NONE);
          }
        }
      }
    }
  }

  /** Thick tree border; `skip` leaves exit corridors open. */
  border(seed: number, minTh: number, ground: number, tree: (x: number, y: number) => number, skip: (x: number, y: number) => boolean, noise: (x: number, y: number) => number): void {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const d = Math.min(x, y, this.w - 1 - x, this.h - 1 - y);
        const th = minTh + Math.floor(noise(x / 5 + seed, y / 5) * 4);
        if (d >= th || skip(x, y)) continue;
        this.setG(x, y, ground);
        if (d < 2 || noise(x * 1.7, y * 1.3 + seed) < 0.8) this.setO(x, y, tree(x, y));
      }
    }
  }

  /** Every tile index where `pred` holds. */
  collect(pred: (x: number, y: number) => boolean): number[] {
    const out: number[] = [];
    for (let y = 1; y < this.h - 1; y++) for (let x = 1; x < this.w - 1; x++) if (pred(x, y)) out.push(this.i(x, y));
    return out;
  }

  free(x: number, y: number): boolean {
    return this.in(x, y) && this.o(x, y) === O.NONE && !this.structAt.has(this.i(x, y));
  }

  neighbors4(x: number, y: number, pred: (g: number, o: number) => boolean): boolean {
    return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => pred(this.g(x + dx, y + dy), this.o(x + dx, y + dy)));
  }
}
