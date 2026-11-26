import { ITEMS } from '../data/items';

export interface Stack {
  id: string;
  n: number;
}

export const HOTBAR_SIZE = 9;
export const BAG_SIZE = 27;

export class Inventory {
  slots: Array<Stack | null> = Array.from({ length: BAG_SIZE }, () => null);

  /** Adds items, stacking first. Returns the number that did not fit. */
  add(id: string, n: number): number {
    const max = ITEMS[id]?.stack ?? 99;
    for (const s of this.slots) {
      if (n <= 0) break;
      if (s && s.id === id && s.n < max) {
        const k = Math.min(n, max - s.n);
        s.n += k; n -= k;
      }
    }
    for (let i = 0; i < this.slots.length && n > 0; i++) {
      if (!this.slots[i]) {
        const k = Math.min(n, max);
        this.slots[i] = { id, n: k };
        n -= k;
      }
    }
    return n;
  }

  count(id: string): number {
    return this.slots.reduce((a, s) => a + (s && s.id === id ? s.n : 0), 0);
  }

  removeAt(i: number, n: number): void {
    const s = this.slots[i];
    if (!s) return;
    s.n -= n;
    if (s.n <= 0) this.slots[i] = null;
  }

  remove(id: string, n: number): boolean {
    if (this.count(id) < n) return false;
    for (let i = this.slots.length - 1; i >= 0 && n > 0; i--) {
      const s = this.slots[i];
      if (s && s.id === id) { const k = Math.min(n, s.n); this.removeAt(i, k); n -= k; }
    }
    return true;
  }

  canFit(id: string): boolean {
    const max = ITEMS[id]?.stack ?? 99;
    return this.slots.some((s) => !s || (s.id === id && s.n < max));
  }

  /** Grow the bag (Outfitter pack upgrades). Never shrinks below existing items. */
  resize(n: number): void {
    while (this.slots.length < n) this.slots.push(null);
  }

  swap(a: number, b: number): void {
    const t = this.slots[a];
    this.slots[a] = this.slots[b];
    this.slots[b] = t;
  }
}
