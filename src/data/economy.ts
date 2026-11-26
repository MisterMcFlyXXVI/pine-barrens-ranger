/**
 * Phase 3 economy: Workbench recipes, Traveling Merchant blueprints,
 * Outfitter tool upgrades, shop stock, diner menu, and Historical Society
 * donation milestones.
 */

export interface Recipe {
  id: string;
  out: string;
  qty: number;
  inputs: Array<[string, number]>;
  /** Blueprint id required (merchant-exclusive). */
  blueprint?: string;
}

/** Standard Porch Workbench recipes (CLAUDE.md §6) + a couple of quality-of-life extras. */
export const RECIPES: readonly Recipe[] = [
  { id: 'r_venison', out: 'smoked_venison', qty: 1, inputs: [['foraged_meat', 1], ['pine_resin', 1], ['mineral_salt', 1]] },
  { id: 'r_mash', out: 'fermented_mash', qty: 1, inputs: [['cranberries', 1], ['wild_apple', 1]] },
  { id: 'r_egg', out: 'sulfur_egg', qty: 1, inputs: [['foraged_egg', 1], ['mineral_salt', 1]] },
  { id: 'r_battery', out: 'battery_pack', qty: 1, inputs: [['scrap_copper', 1], ['glow_shroom', 1], ['bog_slime', 1]] },
  { id: 'r_totem', out: 'lure_totem', qty: 1, inputs: [['charred_wood', 1], ['wild_honeycomb', 1], ['wild_acorn', 1]] },
  { id: 'r_rod', out: 'lightning_rod', qty: 1, inputs: [['scrap_copper', 3], ['iron_nail', 1]] },
  { id: 'r_chime', out: 'antler_chime', qty: 1, inputs: [['frost_rim_antler', 1], ['silver_silk', 1], ['pine_resin', 1]] },
  { id: 'r_mask', out: 'scent_mask', qty: 1, inputs: [['catnip_mint', 1], ['swamp_moss', 1], ['charred_wood', 1]] },
  { id: 'r_lens', out: 'thermal_lens', qty: 1, inputs: [['glow_shroom', 1], ['crushed_quartz', 1], ['scrap_copper', 1]] },
  { id: 'r_brass', out: 'brass_bell', qty: 1, inputs: [['scrap_copper', 1], ['silver_silk', 1], ['iron_nail', 1]] },
  { id: 'r_silver', out: 'silver_bell', qty: 1, inputs: [['silver_silk', 2], ['crushed_quartz', 1], ['iron_nail', 1]] },
  { id: 'r_radio', out: 'static_radio', qty: 1, inputs: [['scrap_copper', 1], ['battery_pack', 1]] },
  { id: 'r_cider', out: 'apple_cider', qty: 1, inputs: [['wild_apple', 2], ['sweet_sap', 1]] },
  // Merchant blueprints
  { id: 'bp_lunar', out: 'lunar_dew', qty: 1, inputs: [['moonberry', 2], ['silver_silk', 1], ['mineral_salt', 1]], blueprint: 'bp_lunar' },
  { id: 'bp_incense', out: 'brimstone_incense', qty: 1, inputs: [['pine_resin', 2], ['sulfur_crust', 1], ['catnip_mint', 1]], blueprint: 'bp_incense' },
  { id: 'bp_wisp', out: 'wisp_oil', qty: 1, inputs: [['glow_shroom', 1], ['bog_slime', 1], ['ghost_pepper', 1]], blueprint: 'bp_wisp' },
  { id: 'bp_tesla', out: 'tesla_pylon', qty: 1, inputs: [['scrap_copper', 3], ['battery_pack', 2], ['static_feather', 1]], blueprint: 'bp_tesla' },
  { id: 'bp_dish', out: 'parabolic_dish', qty: 1, inputs: [['scrap_copper', 2], ['crushed_quartz', 1], ['moth_scale', 1]], blueprint: 'bp_dish' },
  { id: 'bp_chronos', out: 'chronos_shutter', qty: 1, inputs: [['frost_rim_antler', 1], ['crushed_quartz', 2], ['silver_silk', 1]], blueprint: 'bp_chronos' },
];

export interface Blueprint {
  id: string;
  name: string;
  merchant: 'ezri' | 'pike';
  price: number;
  desc: string;
}

export const BLUEPRINTS: readonly Blueprint[] = [
  { id: 'bp_lunar', name: 'Lunar Dew Distillate', merchant: 'ezri', price: 450, desc: 'Universal Tier 3/4 lure (+45%) and 3x Rare Variants for the night.' },
  { id: 'bp_incense', name: 'Brimstone & Cedar Incense', merchant: 'ezri', price: 300, desc: 'Halves predator Startle spikes for 5 turns.' },
  { id: 'bp_wisp', name: 'Wisp-Light Lantern Oil', merchant: 'ezri', price: 350, desc: 'Reveals hidden encounters; stops spectral cryptids phasing out.' },
  { id: 'bp_tesla', name: 'Tesla Coil Pylon', merchant: 'pike', price: 600, desc: 'Forces Static-Charged variants; draws electric cryptids.' },
  { id: 'bp_dish', name: 'Parabolic Sound Dish', merchant: 'pike', price: 750, desc: 'Reveals stance on Turn 1; +30% Trust on vocal cryptids.' },
  { id: 'bp_chronos', name: 'Chronos Shutter Mod', merchant: 'pike', price: 900, desc: 'Flash Photo: 0 Startle and guaranteed Gold quality.' },
];

/** Rare goods the merchants also carry (breaks the Frost-Rim Antler chicken-and-egg). */
export const MERCHANT_GOODS: Readonly<Record<'ezri' | 'pike', ReadonlyArray<{ id: string; cost: number }>>> = {
  ezri: [{ id: 'silver_silk', cost: 140 }, { id: 'frost_rim_antler', cost: 420 }, { id: 'sulfur_crust', cost: 60 }],
  pike: [{ id: 'scrap_copper', cost: 55 }, { id: 'crushed_quartz', cost: 70 }, { id: 'battery_pack', cost: 190 }],
};

export type ToolLine = 'machete' | 'waders' | 'lantern' | 'camera' | 'pack';

export interface UpgradeTier {
  name: string;
  cost: number;
  mats: Array<[string, number]>;
  desc: string;
}

/** Index 0 = starting level; buying moves to the next tier. */
export const UPGRADES: Readonly<Record<ToolLine, UpgradeTier[]>> = {
  machete: [
    { name: 'Rusty Machete', cost: 0, mats: [], desc: 'Clears brush one hit at a time.' },
    { name: 'Steel Machete', cost: 500, mats: [['iron_nail', 5]], desc: 'Double damage. Briars fall in one swing.' },
    { name: 'Brush Hook', cost: 1500, mats: [['scrap_copper', 3], ['crushed_quartz', 2]], desc: 'Triple damage. Stumps & logs split fast.' },
  ],
  waders: [
    { name: 'No Waders', cost: 0, mats: [], desc: 'Shallow bog water blocks your way.' },
    { name: 'Bog Waders', cost: 800, mats: [], desc: 'Wade shallow bog water and spring pools.' },
    { name: 'Insulated Waders', cost: 1400, mats: [['bog_slime', 2]], desc: 'No slowdown in water or bog muck.' },
  ],
  lantern: [
    { name: 'Tin Lantern', cost: 0, mats: [], desc: 'A small pool of light at night.' },
    { name: 'Bright Lantern', cost: 600, mats: [['pine_resin', 3]], desc: 'Wider night light radius.' },
    { name: 'High-Beam Lantern', cost: 1500, mats: [['glow_shroom', 2], ['scrap_copper', 1]], desc: 'Widest beam. Mothman is drawn to it.' },
  ],
  camera: [
    { name: 'Box Camera', cost: 0, mats: [], desc: 'Gold photos need 75% Trust.' },
    { name: 'Field Camera', cost: 900, mats: [['crushed_quartz', 2]], desc: 'Gold photos at 65% Trust.' },
    { name: 'Telephoto Camera', cost: 2000, mats: [['silver_silk', 1], ['crushed_quartz', 2]], desc: 'Gold at 55%; flash Startle halved.' },
  ],
  pack: [
    { name: 'Field Pack', cost: 0, mats: [], desc: '27 slots.' },
    { name: 'Ranger Pack', cost: 1000, mats: [['plant_fiber', 5]], desc: '36 slots.' },
    { name: 'Expedition Pack', cost: 2500, mats: [['plant_fiber', 10], ['silver_silk', 2]], desc: '45 slots.' },
  ],
};

export const TOOL_LINES: readonly ToolLine[] = ['machete', 'waders', 'lantern', 'camera', 'pack'];

export interface ShopEntry {
  id: string;
  cost: number;
}

/** General Store counter (Gideon). */
export const STORE_STOCK: readonly ShopEntry[] = [
  { id: 'seed_clover', cost: 15 }, { id: 'seed_catnip', cost: 25 }, { id: 'seed_moss', cost: 30 }, { id: 'seed_corn', cost: 35 },
  { id: 'seed_pepper', cost: 55 }, { id: 'seed_cranberry', cost: 40 },
  { id: 'mineral_salt', cost: 45 }, { id: 'iron_nail', cost: 18 }, { id: 'pine_resin', cost: 40 }, { id: 'smoked_fish', cost: 70 },
];

/** Historical Society Gift Shop (unlocks at 16 donations). */
export const GIFT_STOCK: readonly ShopEntry[] = [
  { id: 'seed_shroom', cost: 45 }, { id: 'seed_moonberry', cost: 80 }, { id: 'display_pedestal', cost: 500 },
];

/** Whistle-Stop Diner menu (Mabel). Food buffs last the rest of the day. */
export const DINER_MENU: readonly ShopEntry[] = [
  { id: 'black_coffee', cost: 40 }, { id: 'pancakes', cost: 90 }, { id: 'cranberry_pie', cost: 120 },
  { id: 'ghost_chili', cost: 150 }, { id: 'smoked_fish', cost: 70 }, { id: 'apple_cider', cost: 60 },
];

export interface Milestone {
  count: number;
  title: string;
  desc: string;
  /** Wardrobe ids unlocked. */
  wear?: string[];
  flag?: 'archive' | 'giftshop' | 'festival' | 'grant';
}

export const MILESTONES: readonly Milestone[] = [
  { count: 5, title: 'Jackalope Antler Cap', desc: '+15% trail speed; skittish meadow Startle lowered.', wear: ['jackalope_cap'] },
  { count: 8, title: 'Archive Basement', desc: 'Survey maps revealing the exact Mythic summoning rules.', flag: 'archive' },
  { count: 10, title: 'Loveland Frog Slicker', desc: 'Immune to rain/bog slowdowns; +20% water cryptid spawns.', wear: ['frog_slicker'] },
  { count: 15, title: 'Snarly Yow Shadow Cloak', desc: 'Cuts initial Night/Witching Hour Startle by 50%.', wear: ['yow_cloak'] },
  { count: 16, title: 'Museum Gift Shop', desc: 'Moonberry & Glow-Shroom seeds and Cabin Display Pedestals.', flag: 'giftshop' },
  { count: 20, title: 'Mothman Goggles', desc: 'Permanent thermal vision in fog and darkness.', wear: ['mothman_goggles'] },
  { count: 24, title: 'Pine Hollow Folklore Festival', desc: 'Sunday-night festival: Traveling Merchants & surging Rare Variants.', flag: 'festival' },
  { count: 28, title: 'Wendigo Antler Mantle', desc: 'Apex Presence: predators never force you to retreat.', wear: ['wendigo_mantle', 'antler_crown'] },
  { count: 32, title: 'Town Restoration Grant', desc: 'Repairs the Train Station and unseals the Coal Mine.', flag: 'grant' },
  { count: 36, title: "Indrid Cold's Shimmer Suit", desc: '2x Rare Variant spawns everywhere; 25% shop discount.', wear: ['shimmer_suit'] },
];
