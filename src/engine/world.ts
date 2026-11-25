/** Runtime (mutable) state layered over a generated MapDef. */
import { getMapDef, MapDef, MapId, Portal, Structure } from '../data/maps';
import { O, T, SOLID_GROUND, objProps } from '../data/tiles';

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

  constructor(id: MapId) {
    this.def = getMapDef(id);
    this.objects = this.def.objects.slice();
    this.plots = this.def.plots.map(() => ({ tilled: false, watered: false, crop: null, days: 0 }));
    this.def.plots.forEach((p, i) => this.plotAt.set(this.idx(p.x, p.y), i));
  }

  get id(): MapId { return this.def.id; }
  get w(): number { return this.def.w; }
  get h(): number { return this.def.h; }

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

  blocked(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) return true;
    if (SOLID_GROUND.has(this.ground(x, y))) return true;
    if (objProps(this.obj(x, y)).solid) return true;
    return false;
  }

  removeObject(i: number): void {
    this.objects[i] = O.NONE;
    this.removed.add(i);
    this.hp.delete(i);
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

  /** New-day forage spawn: guaranteed nook finds + a few scattered ones. */
  spawnForage(day: number): void {
    const d = this.def;
    if (!d.forageTable.length) return;
    this.forage.clear();
    let seed = (day * 2654435761) >>> 0;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const pick = () => d.forageTable[Math.floor(rnd() * d.forageTable.length)];
    const free = (i: number) => this.objects[i] === O.NONE && !this.forage.has(i);
    const nook = d.nookSpots.filter(free);
    for (let k = 0; k < 3 && nook.length; k++) {
      const j = Math.floor(rnd() * nook.length);
      this.forage.set(nook[j], pick());
      nook.splice(j, 1);
    }
    const spots = d.forageSpots.filter(free);
    for (let k = 0; k < 6 && spots.length; k++) {
      const j = Math.floor(rnd() * spots.length);
      this.forage.set(spots[j], pick());
      spots.splice(j, 1);
    }
  }
}
