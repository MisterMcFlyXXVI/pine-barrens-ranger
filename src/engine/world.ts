/** Runtime (mutable) state layered over a generated MapDef. */
import { getMapDef, MapDef, MapId, Portal, Structure } from '../data/maps';
import { O, T, SOLID_GROUND, WADE_GROUND, objProps } from '../data/tiles';
import type { Zone } from '../data/cryptids';

export interface PlotState {
  tilled: boolean;
  watered: boolean;
  crop: string | null;
  /** Watered days of growth so far. */
  days: number;
}

export class MapRuntime {
  readonly def: MapDef;
  readonly objects: Uint8Array;
  readonly removed = new Set<number>();
  readonly hp = new Map<number, number>();
  readonly forage = new Map<number, string>();
  readonly plots: PlotState[];
  readonly plotAt = new Map<number, number>();
  /** Visual-only timers (shake on hit, grass rustle). */
  readonly shake = new Map<number, number>();
  /** Player-placed lure mounts: tile index -> object id. */
  readonly placed = new Map<number, number>();
  /** Snare traps: tile index -> caught item id ('' = empty). */
  readonly snares = new Map<number, string>();
  /** Apple trees already shaken today. */
  readonly shaken = new Set<number>();
  /** Fog of war for the Pocket Map: 1 = explored tile. */
  readonly seen: Uint8Array;

  constructor(id: MapId) {
    this.def = getMapDef(id);
    this.objects = this.def.objects.slice();
    this.seen = new Uint8Array(this.def.w * this.def.h);
    this.plots = this.def.plots.map(() => ({ tilled: false, watered: false, crop: null, days: 0 }));
    this.def.plots.forEach((p, i) => this.plotAt.set(this.idx(p.x, p.y), i));
  }

  get id(): MapId { return this.def.id; }
  get w(): number { return this.def.w; }
  get h(): number { return this.def.h; }

  /** Clear the map fog in a circle around (x, y). */
  reveal(cx: number, cy: number, r: number): void {
    for (let y = Math.max(0, cy - r); y <= Math.min(this.h - 1, cy + r); y++) {
      for (let x = Math.max(0, cx - r); x <= Math.min(this.w - 1, cx + r); x++) {
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r + r) this.seen[y * this.w + x] = 1;
      }
    }
  }

  /** Older saves had no fog data: reveal the trails (and a little around them) of a region already visited. */
  revealTrails(): void {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const g = this.ground(x, y);
      if (g === T.PATH || g === T.BOARDWALK || g === T.BRIDGE) this.reveal(x, y, 3);
    }
  }

  /** Bit-packed, base64 fog for the save file. */
  seenToString(): string {
    const bytes = new Uint8Array(Math.ceil(this.seen.length / 8));
    this.seen.forEach((v, i) => { if (v) bytes[i >> 3] |= 1 << (i & 7); });
    let s = '';
    bytes.forEach((b) => { s += String.fromCharCode(b); });
    return btoa(s);
  }

  seenFromString(str: string): void {
    try {
      const raw = atob(str);
      for (let i = 0; i < this.seen.length; i++) this.seen[i] = (raw.charCodeAt(i >> 3) >> (i & 7)) & 1;
    } catch { /* corrupt: keep fog */ }
  }

  inBounds(x: number, y: number): boolean { return x >= 0 && y >= 0 && x < this.def.w && y < this.def.h; }
  idx(x: number, y: number): number { return y * this.def.w + x; }

  ground(x: number, y: number): number { return this.inBounds(x, y) ? this.def.ground[this.idx(x, y)] : T.VOID; }
  obj(x: number, y: number): number { return this.inBounds(x, y) ? this.objects[this.idx(x, y)] : O.NONE; }

  /** Resolve a BLOCK filler to its anchor tile index. */
  anchorIdx(i: number): number { return this.def.anchors.get(i) ?? i; }

  structureAt(x: number, y: number): Structure | null {
    const s = this.def.structAt.get(this.idx(x, y));
    return s === undefined ? null : this.def.structures[s];
  }

  portalAt(x: number, y: number): Portal | null {
    for (const p of this.def.portals) if (x >= p.x && y >= p.y && x < p.x + p.w && y < p.y + p.h) return p;
    return null;
  }

  plotIndex(x: number, y: number): number {
    return this.inBounds(x, y) ? this.plotAt.get(this.idx(x, y)) ?? -1 : -1;
  }

  /** Sub-zones (orchard, sawmill, crossroads...) covering a tile; slope tiles add 'slope'. */
  zonesAt(x: number, y: number): Zone[] {
    const out: Zone[] = [];
    for (const z of this.def.zones) if (x >= z.x && y >= z.y && x < z.x + z.w && y < z.y + z.h) out.push(z.zone);
    if (this.ground(x, y) === T.SLOPE) out.push('slope');
    return out;
  }

  blocked(x: number, y: number, waders = false): boolean {
    if (!this.inBounds(x, y)) return true;
    const g = this.ground(x, y);
    if (SOLID_GROUND.has(g)) return true;
    if (!waders && WADE_GROUND.has(g)) return true;
    if (objProps(this.obj(x, y)).solid) return true;
    return false;
  }

  removeObject(i: number): void {
    this.objects[i] = O.NONE;
    if (this.placed.has(i)) this.placed.delete(i);
    else this.removed.add(i);
    this.hp.delete(i);
  }

  placeObject(i: number, o: number): void {
    this.objects[i] = o;
    this.placed.set(i, o);
  }

  countPlaced(o: number): number {
    let n = 0;
    for (const v of this.placed.values()) if (v === o) n++;
    return n;
  }

  plotsCleared(): number {
    let n = 0;
    for (const p of this.def.plots) if (this.obj(p.x, p.y) === O.NONE) n++;
    return n;
  }

  /** Re-apply saved removals after load. */
  applyRemoved(list: number[]): void {
    for (const i of list) { this.objects[i] = O.NONE; this.removed.add(i); }
  }

  /** New-day forage spawn from each forage group (deterministic per day & map). */
  spawnForage(day: number): void {
    this.forage.clear();
    this.shaken.clear();
    let seed = (Math.imul(day, 2654435761) ^ (this.def.w * 977 + this.def.h)) >>> 0;
    const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (const grp of this.def.forage) {
      const spots = grp.spots.filter((i) => this.objects[i] === O.NONE && !this.forage.has(i));
      for (let k = 0; k < grp.count && spots.length; k++) {
        const j = Math.floor(rnd() * spots.length);
        this.forage.set(spots[j], grp.table[Math.floor(rnd() * grp.table.length)]);
        spots.splice(j, 1);
      }
    }
  }
}
