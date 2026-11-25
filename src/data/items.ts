/** Items, lure crops and economy data. */

export type ItemKind = 'tool' | 'seed' | 'crop' | 'forage' | 'material';
export type ToolKind = 'hoe' | 'can' | 'machete';

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  /** Sell price at the Shipping Bin (0 = cannot ship). */
  price: number;
  desc: string;
  stack: number;
  tool?: ToolKind;
  /** For seeds: the crop id they grow. */
  crop?: string;
  /** Stamina restored when eaten. */
  edible?: number;
}

export interface CropDef {
  id: string;
  name: string;
  seed: string;
  produce: string;
  days: number;
  seedPrice: number;
  sellPrice: number;
  /** Days to re-fruit after harvest (bush crops). */
  regrow?: number;
  bogOnly?: boolean;
  yield: [number, number];
  lore: string;
}

export const CROPS: readonly CropDef[] = [
  { id: 'clover', name: 'Wild Clover', seed: 'seed_clover', produce: 'wild_clover', days: 2, seedPrice: 15, sellPrice: 28, yield: [1, 2], lore: 'Jackalopes cannot resist it.' },
  { id: 'catnip', name: 'Catnip Mint', seed: 'seed_catnip', produce: 'catnip_mint', days: 3, seedPrice: 25, sellPrice: 45, yield: [1, 1], lore: 'Calms the six-legged Wampus Cat.' },
  { id: 'moss', name: 'Swamp Moss', seed: 'seed_moss', produce: 'swamp_moss', days: 3, seedPrice: 30, sellPrice: 52, bogOnly: true, yield: [1, 2], lore: 'Only roots in damp bog soil.' },
  { id: 'corn', name: 'Sweet Corn', seed: 'seed_corn', produce: 'sweet_corn', days: 4, seedPrice: 35, sellPrice: 64, yield: [1, 1], lore: 'Bessie and the Pigman love it.' },
  { id: 'shroom', name: 'Glow-Shroom', seed: 'seed_shroom', produce: 'glow_shroom', days: 4, seedPrice: 45, sellPrice: 80, yield: [1, 2], lore: 'Glows faintly. The Dover Demon stares at it.' },
  { id: 'pepper', name: 'Ghost Pepper', seed: 'seed_pepper', produce: 'ghost_pepper', days: 5, seedPrice: 55, sellPrice: 98, yield: [1, 2], lore: 'Mothman is drawn to the heat.' },
  { id: 'cranberry', name: 'Cranberry Bush', seed: 'seed_cranberry', produce: 'cranberries', days: 5, seedPrice: 40, sellPrice: 26, regrow: 3, yield: [2, 4], lore: 'Regrows every 3 days.' },
  { id: 'moonberry', name: 'Moonberry', seed: 'seed_moonberry', produce: 'moonberry', days: 6, seedPrice: 80, sellPrice: 150, yield: [1, 1], lore: 'Ripens silver. Beloved by Nightcrawlers.' },
];

export const CROP_BY_ID: Record<string, CropDef> = Object.fromEntries(CROPS.map((c) => [c.id, c]));

const base: ItemDef[] = [
  { id: 'hoe', name: 'Hoe', kind: 'tool', tool: 'hoe', price: 0, stack: 1, desc: 'Tills garden plots and breaks small rocks.' },
  { id: 'watering_can', name: 'Watering Can', kind: 'tool', tool: 'can', price: 0, stack: 1, desc: 'Waters crops. Refill at the creek or Rain Barrel.' },
  { id: 'machete', name: 'Brush Machete', kind: 'tool', tool: 'machete', price: 0, stack: 1, desc: 'Clears brush, briars, stumps and tall grass.' },

  { id: 'wild_clover', name: 'Wild Clover', kind: 'crop', price: 28, stack: 99, edible: 6, desc: 'Sweet three-leaf clover. Lure: Jackalope.' },
  { id: 'catnip_mint', name: 'Catnip Mint', kind: 'crop', price: 45, stack: 99, edible: 8, desc: 'Pungent mint. Lure: Wampus Cat.' },
  { id: 'swamp_moss', name: 'Swamp Moss', kind: 'crop', price: 52, stack: 99, desc: 'Spongy bog moss. Lure: Loveland Frog, Chessie.' },
  { id: 'sweet_corn', name: 'Sweet Corn', kind: 'crop', price: 64, stack: 99, edible: 15, desc: 'Golden ears. Lure: Bessie, Pigman.' },
  { id: 'glow_shroom', name: 'Glow-Shroom', kind: 'crop', price: 80, stack: 99, desc: 'Faintly luminous cap. Lure: Dover Demon.' },
  { id: 'ghost_pepper', name: 'Ghost Pepper', kind: 'crop', price: 98, stack: 99, edible: 2, desc: 'Brutally hot. Lure: Mothman.' },
  { id: 'cranberries', name: 'Cranberries', kind: 'crop', price: 26, stack: 99, edible: 8, desc: 'Tart bog berries. Lure: Bog Polliwog.' },
  { id: 'moonberry', name: 'Moonberry', kind: 'crop', price: 150, stack: 99, edible: 25, desc: 'Silver berry. Lure: Fresno Nightcrawler.' },

  { id: 'pine_resin', name: 'Pine Resin', kind: 'forage', price: 18, stack: 99, desc: 'Sticky amber sap. Used in smoking & incense.' },
  { id: 'wild_acorn', name: 'Wild Acorn', kind: 'forage', price: 12, stack: 99, desc: 'Lure: Wampahoofus. Totem ingredient.' },
  { id: 'wild_onion', name: 'Wild Onion', kind: 'forage', price: 15, stack: 99, edible: 12, desc: 'Lure: Squonk. Edible, if pungent.' },
  { id: 'wild_honeycomb', name: 'Wild Honeycomb', kind: 'forage', price: 40, stack: 99, edible: 18, desc: 'Dripping comb. Lure: Pukwudgie, Sasquatch.' },
  { id: 'plant_fiber', name: 'Plant Fiber', kind: 'material', price: 3, stack: 99, desc: 'Tough grass fiber from cutting tall grass.' },
  { id: 'charred_wood', name: 'Charred Wood', kind: 'material', price: 10, stack: 99, desc: 'Lightning-scorched timber. Lure: Hodag.' },
  { id: 'crushed_quartz', name: 'Crushed Quartz', kind: 'material', price: 30, stack: 99, desc: 'Glittering crystal grit from broken rocks.' },
  { id: 'mineral_salt', name: 'Mineral Salt', kind: 'material', price: 25, stack: 99, desc: 'Coarse salt crust. Lure: Slide-Rock Bolter.' },
];

for (const c of CROPS) {
  base.push({
    id: c.seed,
    name: `${c.name} Seeds`,
    kind: 'seed',
    crop: c.id,
    price: Math.floor(c.seedPrice / 2),
    stack: 99,
    desc: `${c.days} days${c.regrow ? `, regrows every ${c.regrow}` : ''}${c.bogOnly ? '. Bog soil only' : ''}. ${c.lore}`,
  });
}

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(base.map((i) => [i.id, i]));

export function item(id: string): ItemDef {
  const d = ITEMS[id];
  if (!d) throw new Error(`Unknown item ${id}`);
  return d;
}

/** Mail-order seeds available from the Porch Workbench catalog (Phase 1). */
export const CATALOG_SEEDS: readonly string[] = [
  'seed_clover', 'seed_catnip', 'seed_moss', 'seed_corn', 'seed_pepper', 'seed_cranberry',
];

export const STARTING_ITEMS: ReadonlyArray<[string, number]> = [
  ['hoe', 1], ['watering_can', 1], ['machete', 1],
  ['seed_clover', 10], ['seed_catnip', 5], ['seed_moss', 3], ['seed_corn', 3],
  ['seed_shroom', 2], ['seed_pepper', 2], ['seed_cranberry', 2], ['seed_moonberry', 1],
];
