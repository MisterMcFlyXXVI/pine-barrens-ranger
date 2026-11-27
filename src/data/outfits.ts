/** Wearable outfits & hats for the modular player renderer. */

export type OutfitStyle = 'jacket' | 'flannel' | 'slicker' | 'cloak' | 'mantle' | 'suit' | 'apron';
export type HatStyle = 'none' | 'cap' | 'bucket' | 'antlers' | 'goggles' | 'crown' | 'headphones' | 'mask' | 'alpine' | 'kerchief' | 'minercap' | 'respirator';
/** Which face a carved Fasnacht mask has. */
export type MaskFace = 'goat' | 'owl' | 'bear' | 'stag' | 'krampus';

export interface OutfitDef {
  id: string;
  name: string;
  style: OutfitStyle;
  main: number;
  shade: number;
  trim: number;
  accent: number;
  starter: boolean;
  source: string;
}

export interface HatDef {
  id: string;
  name: string;
  style: HatStyle;
  main: number;
  shade: number;
  accent: number;
  starter: boolean;
  source: string;
  mask?: MaskFace;
}

export const OUTFITS: readonly OutfitDef[] = [
  { id: 'ranger_jacket', name: 'Ranger Jacket', style: 'jacket', main: 3, shade: 2, trim: 8, accent: 6, starter: true, source: 'Standard issue.' },
  { id: 'chore_coat', name: 'Chore Coat & Jeans', style: 'jacket', main: 8, shade: 9, trim: 1, accent: 7, starter: true, source: 'Your own clothes: duck canvas, brass buttons, a corduroy collar.' },
  { id: 'red_flannel', name: 'Red Flannel', style: 'flannel', main: 11, shade: 10, trim: 0, accent: 7, starter: true, source: 'Comfy and warm.' },
  { id: 'elias_coat', name: "Elias's Wool Coat", style: 'jacket', main: 9, shade: 10, trim: 6, accent: 8, starter: false, source: 'From Mabel, at 4 hearts. Patched at both elbows.' },
  { id: 'frog_slicker', name: 'Loveland Frog Slicker', style: 'slicker', main: 4, shade: 3, trim: 8, accent: 7, starter: false, source: 'Historical Society: 10 donations.' },
  { id: 'yow_cloak', name: 'Snarly Yow Shadow Cloak', style: 'cloak', main: 0, shade: 1, trim: 12, accent: 11, starter: false, source: 'Historical Society: 15 donations.' },
  { id: 'wendigo_mantle', name: 'Wendigo Antler Mantle', style: 'mantle', main: 1, shade: 2, trim: 6, accent: 7, starter: false, source: 'Historical Society: 28 donations.' },
  { id: 'shimmer_suit', name: "Indrid Cold's Shimmer Suit", style: 'suit', main: 3, shade: 2, trim: 5, accent: 5, starter: false, source: 'Historical Society: 36 donations.' },
  { id: 'miner_coveralls', name: "Canvas Miner's Coveralls", style: 'apron', main: 12, shade: 1, trim: 8, accent: 7, starter: false, source: 'The Lamp House locker.' },
  { id: 'fireboss_slicker', name: 'Fire-Boss Oilskin Slicker', style: 'slicker', main: 1, shade: 0, trim: 8, accent: 7, starter: false, source: 'The Deep Seam: 6 tags banked.' },
  { id: 'lapel_tag', name: "Walter's Brass Lapel Tag", style: 'jacket', main: 2, shade: 1, trim: 8, accent: 7, starter: false, source: 'From Opa Walter, after the Deep Seam is sealed.' },
];

/** Townsfolk clothing (never in the player's wardrobe). */
export const NPC_OUTFITS: readonly OutfitDef[] = [
  { id: 'npc_cardigan', name: 'Cardigan', style: 'jacket', main: 14, shade: 10, trim: 6, accent: 15, starter: false, source: 'npc' },
  { id: 'npc_conductor', name: 'Conductor Vest', style: 'jacket', main: 12, shade: 1, trim: 8, accent: 6, starter: false, source: 'npc' },
  { id: 'npc_diner_apron', name: 'Diner Apron', style: 'apron', main: 11, shade: 10, trim: 6, accent: 6, starter: false, source: 'npc' },
  { id: 'npc_smith_apron', name: 'Leather Apron', style: 'apron', main: 1, shade: 0, trim: 8, accent: 9, starter: false, source: 'npc' },
  { id: 'npc_labcoat', name: 'Field Lab Coat', style: 'slicker', main: 6, shade: 13, trim: 12, accent: 12, starter: false, source: 'npc' },
  { id: 'npc_kid_green', name: 'Club Jacket', style: 'jacket', main: 4, shade: 3, trim: 7, accent: 11, starter: false, source: 'npc' },
  { id: 'npc_kid_amber', name: 'Club Jacket', style: 'jacket', main: 8, shade: 9, trim: 7, accent: 6, starter: false, source: 'npc' },
  { id: 'npc_apprentice', name: 'Work Shirt', style: 'flannel', main: 12, shade: 1, trim: 0, accent: 6, starter: false, source: 'npc' },
  { id: 'npc_ezri', name: 'Apothecary Robe', style: 'cloak', main: 14, shade: 2, trim: 15, accent: 7, starter: false, source: 'npc' },
  { id: 'npc_housecoat', name: 'Housecoat', style: 'apron', main: 13, shade: 12, trim: 7, accent: 11, starter: false, source: 'npc' },
  { id: 'npc_county', name: 'County Windbreaker', style: 'jacket', main: 13, shade: 12, trim: 6, accent: 1, starter: false, source: 'npc' },
  { id: 'npc_dirndl', name: 'Baker\'s Apron', style: 'apron', main: 6, shade: 13, trim: 10, accent: 11, starter: false, source: 'npc' },
  { id: 'npc_carver', name: 'Carver\'s Smock', style: 'flannel', main: 3, shade: 2, trim: 8, accent: 7, starter: false, source: 'npc' },
  { id: 'npc_loden', name: 'Loden Jacket', style: 'jacket', main: 2, shade: 1, trim: 8, accent: 11, starter: false, source: 'npc' },
  { id: 'npc_furs', name: 'Belsnickel Furs', style: 'cloak', main: 9, shade: 10, trim: 1, accent: 8, starter: false, source: 'npc' },
  { id: 'npc_krampus', name: 'Krampus Furs', style: 'cloak', main: 0, shade: 1, trim: 10, accent: 11, starter: false, source: 'npc' },
  { id: 'npc_pike', name: 'Machinist Coat', style: 'slicker', main: 12, shade: 1, trim: 8, accent: 7, starter: false, source: 'npc' },
];

export const NPC_HATS: readonly HatDef[] = [
  { id: 'npc_conductor_cap', name: 'Conductor Cap', style: 'cap', main: 12, shade: 1, accent: 8, starter: false, source: 'npc' },
  { id: 'npc_red_cap', name: 'Red Cap', style: 'cap', main: 11, shade: 10, accent: 7, starter: false, source: 'npc' },
  { id: 'npc_explorer', name: 'Explorer Hat', style: 'bucket', main: 8, shade: 9, accent: 3, starter: false, source: 'npc' },
  { id: 'npc_headphones', name: 'Headphones', style: 'headphones', main: 1, shade: 1, accent: 11, starter: false, source: 'npc' },
  { id: 'npc_county_cap', name: 'County Cap', style: 'cap', main: 12, shade: 1, accent: 6, starter: false, source: 'npc' },
  { id: 'npc_alpine', name: 'Alpine Hat', style: 'alpine', main: 2, shade: 1, accent: 11, starter: false, source: 'npc' },
  { id: 'npc_kerchief', name: 'Head Kerchief', style: 'kerchief', main: 11, shade: 10, accent: 6, starter: false, source: 'npc' },
  { id: 'npc_fur_hood', name: 'Fur Hood', style: 'bucket', main: 10, shade: 1, accent: 9, starter: false, source: 'npc' },
  { id: 'npc_krampus_mask', name: 'Krampus Mask', style: 'mask', mask: 'krampus', main: 0, shade: 1, accent: 7, starter: false, source: 'npc' },
  { id: 'npc_mask_goat', name: 'Goat Mask', style: 'mask', mask: 'goat', main: 6, shade: 13, accent: 8, starter: false, source: 'npc' },
  { id: 'npc_mask_owl', name: 'Owl Mask', style: 'mask', mask: 'owl', main: 9, shade: 10, accent: 7, starter: false, source: 'npc' },
  { id: 'npc_mask_bear', name: 'Bear Mask', style: 'mask', mask: 'bear', main: 1, shade: 0, accent: 9, starter: false, source: 'npc' },
  { id: 'npc_mask_stag', name: 'Stag Mask', style: 'mask', mask: 'stag', main: 8, shade: 9, accent: 7, starter: false, source: 'npc' },
  { id: 'npc_pike_goggles', name: 'Brass Goggles', style: 'goggles', main: 0, shade: 1, accent: 8, starter: false, source: 'npc' },
];

export const HATS: readonly HatDef[] = [
  { id: 'none', name: 'No Hat', style: 'none', main: 0, shade: 0, accent: 0, starter: true, source: '' },
  { id: 'ranger_cap', name: 'Ranger Cap', style: 'cap', main: 3, shade: 2, accent: 8, starter: true, source: 'Standard issue.' },
  { id: 'bucket_hat', name: 'Bucket Hat', style: 'bucket', main: 8, shade: 9, accent: 10, starter: true, source: 'Keeps the sun off.' },
  { id: 'jackalope_cap', name: 'Jackalope Antler Cap', style: 'antlers', main: 9, shade: 10, accent: 7, starter: false, source: 'Historical Society: 5 donations.' },
  { id: 'mothman_goggles', name: 'Mothman Goggles', style: 'goggles', main: 0, shade: 1, accent: 11, starter: false, source: 'Historical Society: 20 donations.' },
  { id: 'antler_crown', name: 'Wendigo Antler Crown', style: 'crown', main: 1, shade: 6, accent: 7, starter: false, source: 'Historical Society: 28 donations.' },
  { id: 'mask_goat', name: 'Goat Mask', style: 'mask', mask: 'goat', main: 6, shade: 13, accent: 8, starter: false, source: 'Carved at the Workbench (Matthias taught you).' },
  { id: 'mask_owl', name: 'Owl Mask', style: 'mask', mask: 'owl', main: 9, shade: 10, accent: 7, starter: false, source: 'Carved at the Workbench (Matthias taught you).' },
  { id: 'mask_bear', name: 'Bear Mask', style: 'mask', mask: 'bear', main: 1, shade: 0, accent: 9, starter: false, source: 'Carved at the Workbench (Matthias taught you).' },
  { id: 'miner_cap', name: 'Hard-Boiled Leather Cap', style: 'minercap', main: 9, shade: 10, accent: 8, starter: false, source: 'The Lamp House locker.' },
  { id: 'brattice_respirator', name: 'Wet-Wool Respirator & Goggles', style: 'respirator', main: 13, shade: 12, accent: 8, starter: false, source: 'The Deep Seam: Level 2 first-aid box.' },
  { id: 'ranger_mask', name: "Ranger's Mask", style: 'mask', mask: 'stag', main: 3, shade: 2, accent: 7, starter: false, source: 'Carved for you by Matthias, at 4 hearts.' },
];

export function outfitById(id: string): OutfitDef {
  return OUTFITS.find((o) => o.id === id) ?? NPC_OUTFITS.find((o) => o.id === id) ?? OUTFITS[0];
}

export function hatById(id: string): HatDef {
  return HATS.find((h) => h.id === id) ?? NPC_HATS.find((h) => h.id === id) ?? HATS[0];
}

/** Gameplay perks granted while a Historical Society reward is worn. */
export const OUTFIT_PERKS: Readonly<Record<string, string>> = {
  jackalope_cap: '+15% trail speed; skittish meadow cryptids startle less.',
  frog_slicker: 'Immune to rain & bog slowdowns; +20% water cryptid spawns.',
  yow_cloak: 'Halves initial Startle at Night & in the Witching Hour.',
  mothman_goggles: 'Thermal vision: pierces mist shields; brighter lantern in fog & dark.',
  wendigo_mantle: 'Apex Presence: predators never force you to retreat.',
  antler_crown: 'Apex Presence (pairs with the Wendigo Mantle).',
  shimmer_suit: '2x Rare Variant spawns everywhere; 25% off in every shop.',
  mask_goat: 'Fasnacht: wear it to the parade and folks will play along.',
  mask_owl: 'Fasnacht: wear it to the parade and folks will play along.',
  mask_bear: 'Fasnacht: wear it to the parade and folks will play along.',
  miner_coveralls: 'Canvas and rivets. Pairs with the leather cap.',
  miner_cap: 'A hard-boiled leather cap with a lamp bracket.',
  brattice_respirator: 'Breath lasts far longer in chokedamp and haze; lets you reach the crosscut buckets.',
  fireboss_slicker: 'Underground: seep drips roll off; tools cost less energy below.',
  lapel_tag: 'Calm breathing: slowly restores energy while worn. Walter, Gideon, Ruth and Elias notice it.',
  ranger_mask: 'Carved by Matthias. Shy cryptids find a still, masked face less alarming (-5 starting Startle).',
};
