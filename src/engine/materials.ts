/**
 * Materials list: recipes the player wants to craft, with live have/need
 * counts across the bag AND the cabin Storage Crate.
 */
import type { Game } from './game';
import { RECIPES, Recipe } from '../data/economy';
import { ITEMS } from '../data/items';
import { sfx } from '../audio/sfx';

export interface Need { recipe: string; qty: number }

export interface NeedPart { id: string; name: string; need: number; bag: number; crate: number; have: number }
export interface NeedStatus { need: Need; recipe: Recipe; name: string; parts: NeedPart[]; ready: boolean; missing: number }

export const RECIPE_BY_ID: Record<string, Recipe> = Object.fromEntries(RECIPES.map((r) => [r.id, r]));

/** Total of an item the workbench can use: bag + Storage Crate. */
export function haveCount(game: Game, id: string): number {
  return game.inv.count(id) + game.storage.count(id);
}

export function needStatus(game: Game, need: Need): NeedStatus | null {
  const recipe = RECIPE_BY_ID[need.recipe];
  if (!recipe) return null;
  const parts = recipe.inputs.map(([id, n]) => {
    const bag = game.inv.count(id), crate = game.storage.count(id);
    return { id, name: ITEMS[id]?.name ?? id, need: n * need.qty, bag, crate, have: bag + crate };
  });
  const missing = parts.reduce((a, p) => a + Math.max(0, p.need - p.have), 0);
  return { need, recipe, name: ITEMS[recipe.out]?.name ?? recipe.out, parts, ready: missing === 0, missing };
}

export function listStatus(game: Game): NeedStatus[] {
  return game.needs.map((n) => needStatus(game, n)).filter((s): s is NeedStatus => s !== null);
}

/** Add one more of a recipe to the list; returns the new quantity. */
export function addNeed(game: Game, recipeId: string): number {
  const cur = game.needs.find((n) => n.recipe === recipeId);
  if (cur) cur.qty = Math.min(99, cur.qty + 1);
  else game.needs.push({ recipe: recipeId, qty: 1 });
  needsWatch.reset(game);
  return game.needs.find((n) => n.recipe === recipeId)!.qty;
}

export function removeNeed(game: Game, recipeId: string): void {
  game.needs = game.needs.filter((n) => n.recipe !== recipeId);
  needsWatch.reset(game);
}

/** After crafting a listed recipe, count it off. Returns how many are still wanted (or -1 if it wasn't listed). */
export function craftedNeed(game: Game, recipeId: string): number {
  const cur = game.needs.find((n) => n.recipe === recipeId);
  if (!cur) return -1;
  cur.qty -= 1;
  if (cur.qty <= 0) game.needs = game.needs.filter((n) => n !== cur);
  needsWatch.reset(game);
  return Math.max(0, cur.qty);
}

/**
 * Watches the list while you play: when a listed material goes up (picked up,
 * harvested, bought, moved into the crate) it toasts your progress, and when a
 * whole entry becomes craftable it says so.
 */
class NeedsWatcher {
  private last = new Map<string, number>();
  private ready = new Set<string>();
  private primed = false;

  reset(game: Game): void {
    this.last.clear();
    this.ready.clear();
    for (const s of listStatus(game)) {
      for (const p of s.parts) this.last.set(`${s.recipe.id}:${p.id}`, p.have);
      if (s.ready) this.ready.add(s.recipe.id);
    }
    this.primed = true;
  }

  tick(game: Game): void {
    if (!this.primed) { this.reset(game); return; }
    for (const s of listStatus(game)) {
      for (const p of s.parts) {
        const key = `${s.recipe.id}:${p.id}`;
        const before = this.last.get(key) ?? p.have;
        if (p.have > before && before < p.need) game.toast(`LIST: ${p.name} ${Math.min(p.have, p.need)}/${p.need}`);
        this.last.set(key, p.have);
      }
      if (s.ready && !this.ready.has(s.recipe.id)) {
        this.ready.add(s.recipe.id);
        sfx.trustChime();
        game.toast(`LIST: ${s.name}${s.need.qty > 1 ? ` x${s.need.qty}` : ''} is ready to craft!`);
      } else if (!s.ready) this.ready.delete(s.recipe.id);
    }
  }

  /** Forget everything (new game / load): the next tick re-primes silently. */
  clear(): void { this.primed = false; this.last.clear(); this.ready.clear(); }
}

export const needsWatch = new NeedsWatcher();
