/** Items, lure crops and economy data. */
import { CRYPTIDS } from './cryptids';

export type ItemKind = 'tool' | 'seed' | 'crop' | 'forage' | 'material' | 'bait' | 'gear' | 'placeable' | 'specimen' | 'food' | 'keepsake';
export type Buff = 'stealth' | 'calm' | 'haul' | 'lucky';
export type ToolKind = 'hoe' | 'can' | 'machete' | 'rod' | 'bow' | 'rifle';

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
  /** Day-long buff granted when eaten. */
  buff?: Buff;
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
  // ---- Fishing, trapping & hunting ----
  { id: 'fishing_rod', name: 'Fishing Rod', kind: 'tool', tool: 'rod', price: 0, stack: 1, desc: 'Face a creek, the bog lake or the old canal and press A to cast. Different water, different fish.' },
  { id: 'hunting_bow', name: 'Hunting Bow', kind: 'tool', tool: 'bow', price: 0, stack: 1, desc: 'Quiet: cryptids never hear it. Short range (3 tiles) and a tighter shot, so sneak in close. Uses Arrows, which you can often recover.' },
  { id: 'deer_rifle', name: 'Deer Rifle', kind: 'tool', tool: 'rifle', price: 0, stack: 1, desc: 'Long range (6 tiles) and an easier shot, but the report scares cryptids away from this area for the rest of the day. Uses Cartridges.' },
  { id: 'arrow', name: 'Arrow', kind: 'material', price: 4, stack: 99, desc: 'Cedar shaft, iron point. Often recovered after a shot.' },
  { id: 'rifle_cartridge', name: 'Rifle Cartridge', kind: 'material', price: 5, stack: 99, desc: 'One shot each. Loud.' },
  { id: 'snare', name: 'Snare Trap', kind: 'placeable', price: 10, stack: 20, desc: 'Set it on open ground in the wild (or your yard). Check it each morning for rabbit, squirrel or grouse.' },
  { id: 'raw_venison', name: 'Raw Venison', kind: 'material', price: 45, stack: 99, desc: 'Fresh deer meat. Cook it at the cabin stove, or smoke it into bait.' },
  { id: 'deer_hide', name: 'Deer Hide', kind: 'material', price: 60, stack: 99, desc: 'Sells well in town.' },
  { id: 'whitetail_antler', name: 'Whitetail Antler', kind: 'material', price: 90, stack: 99, desc: 'From a buck. Collectors pay well.' },
  { id: 'cottontail', name: 'Raw Rabbit', kind: 'material', price: 30, stack: 99, desc: 'A cottontail from your snare. Pot pie, or bait.' },
  { id: 'squirrel', name: 'Raw Squirrel', kind: 'material', price: 20, stack: 99, desc: 'Mountain staple. Squirrel and dumplings, anyone?' },
  { id: 'grouse', name: 'Ruffed Grouse', kind: 'material', price: 55, stack: 99, desc: 'The drummer of the hardwoods. A rare catch.' },
  { id: 'brook_trout', name: 'Brook Trout', kind: 'forage', price: 40, stack: 99, desc: "West Virginia's state fish. Cold, clear creeks." },
  { id: 'creek_chub', name: 'Creek Chub', kind: 'forage', price: 12, stack: 99, desc: 'Bony little fish. Better smoked into bait.' },
  { id: 'smallmouth_bass', name: 'Smallmouth Bass', kind: 'forage', price: 45, stack: 99, desc: 'Bronze fighter of the lake and canal.' },
  { id: 'channel_catfish', name: 'Channel Catfish', kind: 'forage', price: 50, stack: 99, desc: 'Bites after dark in the bog lake.' },
  { id: 'muskie', name: 'Muskie', kind: 'forage', price: 160, stack: 99, desc: 'The fish of ten thousand casts. Lurks in the deep pool.' },

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
  { id: 'wild_onion', name: 'Ramps', kind: 'forage', price: 15, stack: 99, edible: 12, desc: 'Wild mountain leeks. Lure: Squonk. Edible, if pungent -- folks will smell you coming.' },
  { id: 'pawpaw', name: 'Pawpaw', kind: 'forage', price: 30, stack: 99, edible: 18, desc: 'The hill-country banana: custardy, sweet, gone in a week. Sells well in town.' },
  { id: 'wild_honeycomb', name: 'Wild Honeycomb', kind: 'forage', price: 40, stack: 99, edible: 18, desc: 'Dripping comb. Lure: Pukwudgie, Sasquatch.' },
  { id: 'plant_fiber', name: 'Plant Fiber', kind: 'material', price: 3, stack: 99, desc: 'Tough grass fiber from cutting tall grass.' },
  { id: 'timber', name: 'Timber', kind: 'material', price: 12, stack: 99, desc: 'Sawn planks for building. Salvaged from fallen logs, stumps and old lumber, or bought at the General Store.' },
  { id: 'lucky_clover', name: 'Lucky Clover', kind: 'food', price: 40, stack: 20, edible: 25, buff: 'lucky', desc: 'Four leaves, left by a Jackalope. +25 energy. Lucky: double Rare Variant odds today.' },
  // ---- Keepsakes from the townsfolk (can't be shipped or gifted) ----
  { id: 'radio_key', name: "Elias's Brass Radio Key", kind: 'keepsake', price: 0, stack: 1, desc: 'The Morse key from the warden cabin set. Agnes kept it in the Archive. Your porch radio reaches the ridge with it.' },
  { id: 'conductor_whistle', name: "Barney's Conductor Whistle", kind: 'keepsake', price: 0, stack: 1, desc: 'Brass, worn smooth. Blow it at any repaired handcar stop and Barney comes running, any hour.' },
  { id: 'lamphouse_key', name: 'Lamp-House Key', kind: 'keepsake', price: 0, stack: 1, desc: 'The key to the old Pine Hollow No. 3 lamp house. Gideon kept it 19 years. (Town Restoration: the Mine.)' },
  { id: 'binocular_strap', name: "Elias's Binocular Strap", kind: 'keepsake', price: 0, stack: 1, desc: 'Leather, initialed E.V. With it slung round your neck you spot one more cryptid clue at a time.' },
  { id: 'handcar_crank', name: 'Spare Handcar Crank', kind: 'keepsake', price: 0, stack: 1, desc: 'Elias\'s spare, with a relay note in his hand. Pump the handcar yourself, any hour of the day or night.' },
  { id: 'charred_wood', name: 'Charred Wood', kind: 'material', price: 10, stack: 99, desc: 'Lightning-scorched timber. Lure: Hodag.' },
  { id: 'crushed_quartz', name: 'Crushed Quartz', kind: 'material', price: 30, stack: 99, desc: 'Glittering crystal grit from broken rocks.' },
  { id: 'mineral_salt', name: 'Mineral Salt', kind: 'material', price: 25, stack: 99, desc: 'Coarse salt crust. Lure: Slide-Rock Bolter.' },

  // ---- Phase 2 wilderness forage & salvage ----
  { id: 'wild_apple', name: 'Golden Delicious', kind: 'forage', price: 20, stack: 99, edible: 10, desc: 'Heirloom apple from the grove -- the variety was born in these hills. Lure: Albatwitch.' },
  { id: 'sweet_sap', name: 'Sweet Sap', kind: 'forage', price: 22, stack: 99, desc: 'Sugary pine sap. Lure: Hoop Snake.' },
  { id: 'foraged_meat', name: 'Foraged Meat', kind: 'forage', price: 30, stack: 99, desc: 'Game left by something bigger. Lure: Thunderbird.' },
  { id: 'foraged_egg', name: 'Foraged Egg', kind: 'forage', price: 18, stack: 99, edible: 8, desc: 'A speckled wild egg.' },
  { id: 'sulfur_crust', name: 'Sulfur Crust', kind: 'material', price: 28, stack: 99, desc: 'Yellow crust from the Sulphur Springs.' },
  { id: 'scrap_copper', name: 'Scrap Copper', kind: 'material', price: 25, stack: 99, desc: 'Salvaged copper wire and fittings.' },
  { id: 'iron_nail', name: 'Iron Nail', kind: 'material', price: 8, stack: 99, desc: 'Square-cut sawmill nail. Lure: Snarly Yow.' },

  // ---- Crafted lures (mail-order until the Phase 3 workbench) ----
  { id: 'smoked_venison', name: 'Smoked Venison', kind: 'bait', price: 60, stack: 99, desc: 'Predator lure. Favored by the Snarly Yow, Ozark Howler, Jersey Devil, Dwayyo, Beast of Bray Road, Wendigo and The Awful.' },
  { id: 'fermented_mash', name: 'Fermented Berry Mash', kind: 'bait', price: 45, stack: 99, desc: 'Lure: Skunk Ape, Snallygaster, Pigman.' },
  { id: 'sulfur_egg', name: 'Sulfur Rotten Egg', kind: 'bait', price: 40, stack: 99, desc: 'Lure: Ole Slippery Skin. Pinch your nose.' },
  { id: 'battery_pack', name: 'Ionized Battery Pack', kind: 'bait', price: 80, stack: 99, desc: 'Lure: Goblins, Flatwoods Monster, Indrid Cold.' },
  { id: 'smoked_fish', name: 'Smoked Fish', kind: 'bait', price: 35, stack: 99, desc: 'Lure: Altamaha-ha, Thunderbird.' },
  { id: 'apple_cider', name: 'Apple Cider', kind: 'bait', price: 30, stack: 99, desc: 'Lure: Albatwitch.' },
  { id: 'wisp_oil', name: 'Wisp-Light Lantern Oil', kind: 'bait', price: 175, stack: 99, desc: 'Lures spectral cryptids and stops them phasing out tonight.' },
  { id: 'brimstone_incense', name: 'Brimstone & Cedar Incense', kind: 'bait', price: 150, stack: 99, desc: 'Halves Startle spikes from predators for 5 turns.' },
  { id: 'lunar_dew', name: 'Lunar Dew Distillate', kind: 'bait', price: 225, stack: 99, desc: 'Universal Tier 3/4 lure (+45%) and 3x Rare Variants tonight.' },

  // ---- Field Kit gear (owning it unlocks the kit move) ----
  { id: 'bog_waders', name: 'Bog Waders', kind: 'gear', price: 0, stack: 1, desc: 'Lets you wade through shallow bog water and spring pools.' },
  { id: 'scent_mask', name: 'Scent Mask', kind: 'gear', price: 0, stack: 1, desc: 'Blocks odor Startle (Skunk Ape, Slippery Skin).' },
  { id: 'thermal_lens', name: 'Thermal Lens', kind: 'gear', price: 0, stack: 1, desc: 'Pierces the Flatwoods mist shield.' },
  { id: 'brass_bell', name: 'Brass Bell', kind: 'gear', price: 0, stack: 1, desc: 'Signal: counters AGITATED and PRIDEFUL stances.' },
  { id: 'silver_bell', name: 'Silver Bell', kind: 'gear', price: 0, stack: 1, desc: 'Signal: counters SPECTRAL and AGITATED stances.' },
  { id: 'static_radio', name: 'Static Radio', kind: 'gear', price: 0, stack: 1, desc: 'Signal: counters AGITATED/SPECTRAL. Tunes Indrid Cold.' },
  { id: 'parabolic_dish', name: 'Parabolic Sound Dish', kind: 'gear', price: 0, stack: 1, desc: 'Reveals stance on Turn 1; +30% Trust on vocal cryptids.' },
  { id: 'chronos_shutter', name: 'Chronos Shutter Mod', kind: 'gear', price: 0, stack: 1, desc: 'Flash Photo causes no Startle and always yields Gold.' },

  // ---- Placeable lure mounts ----
  { id: 'lure_totem', name: 'Wooden Lure Totem', kind: 'placeable', price: 0, stack: 9, desc: 'Place 3 in the Old Growth, then visit at dusk. Something very large answers.' },
  { id: 'lightning_rod', name: 'Copper Lightning Rod', kind: 'placeable', price: 0, stack: 9, desc: 'Place on Radio Ridge. Calls down storms\' guardian.' },
  { id: 'antler_chime', name: 'Bone & Antler Chime', kind: 'placeable', price: 0, stack: 9, desc: 'Place in the Old Growth. Rings in the witching fog.' },
  { id: 'tesla_pylon', name: 'Tesla Coil Pylon', kind: 'placeable', price: 0, stack: 9, desc: 'Forces Static-Charged variants and draws electric cryptids nearby.' },
  { id: 'display_pedestal', name: 'Cabin Display Pedestal', kind: 'placeable', price: 0, stack: 9, desc: 'Place inside your cabin to show off a specimen.' },

  // ---- Whistle-Stop Diner food buffs ----
  { id: 'black_coffee', name: 'Black Coffee', kind: 'food', price: 10, stack: 20, edible: 30, desc: '+30 energy. Mabel brews it strong.' },
  { id: 'pancakes', name: 'Buckwheat Pancakes', kind: 'food', price: 25, stack: 20, edible: 60, desc: '+60 energy. Buckwheat & maple syrup.' },
  { id: 'cranberry_pie', name: 'Cranberry Pie', kind: 'food', price: 30, stack: 20, edible: 40, buff: 'stealth', desc: '+40 energy. Stealth: -25% Startle gains today.' },
  // ---- Cabin stove cooking ----
  { id: 'venison_stew', name: 'Venison Stew', kind: 'food', price: 80, stack: 20, edible: 90, buff: 'haul', desc: '+90 energy. Long Haul: tools cost 1 energy today.' },
  { id: 'fried_trout', name: 'Fried Brook Trout', kind: 'food', price: 70, stack: 20, edible: 55, buff: 'calm', desc: '+55 energy. Steady Nerves: +20% Trust gains today.' },
  { id: 'rabbit_pot_pie', name: 'Rabbit Pot Pie', kind: 'food', price: 75, stack: 20, edible: 70, buff: 'stealth', desc: '+70 energy. Stealth: -25% Startle gains today.' },
  { id: 'squirrel_dumplings', name: 'Squirrel & Dumplings', kind: 'food', price: 50, stack: 20, edible: 85, desc: '+85 energy. Stick-to-your-ribs mountain cooking.' },
  { id: 'catfish_hushpuppies', name: 'Catfish & Hushpuppies', kind: 'food', price: 85, stack: 20, edible: 65, buff: 'calm', desc: '+65 energy. Steady Nerves: +20% Trust gains today.' },
  { id: 'grouse_apples', name: 'Grouse & Golden Apples', kind: 'food', price: 120, stack: 20, edible: 60, buff: 'lucky', desc: '+60 energy. Lucky: double Rare Variant odds today.' },
  { id: 'pawpaw_bread', name: 'Pawpaw Bread', kind: 'food', price: 60, stack: 20, edible: 45, buff: 'stealth', desc: '+45 energy. Stealth: -25% Startle gains today.' },
  { id: 'rabbit_haunch', name: 'Rabbit Haunch', kind: 'bait', price: 40, stack: 99, desc: 'Resin-smoked rabbit. Lure: Wampus Cat, Hodag, Dwayyo.' },
  { id: 'pepperoni_roll', name: 'Pepperoni Roll', kind: 'food', price: 20, stack: 20, edible: 45, buff: 'haul', desc: '+45 energy. Long Haul: tools cost 1 energy today. The coal-camp lunch.' },
  { id: 'soup_beans', name: 'Soup Beans & Cornbread', kind: 'food', price: 35, stack: 20, edible: 90, desc: '+90 energy. Pintos, ham hock, a skillet of cornbread.' },
  { id: 'ghost_chili', name: 'Ghost Pepper Chili', kind: 'food', price: 40, stack: 20, edible: 50, buff: 'calm', desc: '+50 energy. Steady Nerves: +20% Trust gains today.' },
];

for (const c of CRYPTIDS) {
  if (base.some((b) => b.id === c.drop.id)) continue;
  base.push({ id: c.drop.id, name: c.drop.name, kind: 'specimen', price: c.drop.price, stack: 99, desc: `${c.drop.desc} (Specimen: ${c.name})` });
}

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

export interface CatalogTab {
  name: string;
  entries: ReadonlyArray<{ id: string; cost: number }>;
}

/** Mail-order seed catalog (Porch Workbench). Gear, bait & mounts are crafted or bought in town from Phase 3. */
export const CATALOG: readonly CatalogTab[] = [
  { name: 'SEEDS', entries: CATALOG_SEEDS.map((id) => ({ id, cost: CROPS.find((c) => c.seed === id)?.seedPrice ?? 0 })) },
];

/** Inventory kinds that can be thrown as bait in an encounter. */
export const BAIT_KINDS: ReadonlySet<ItemKind> = new Set<ItemKind>(['crop', 'forage', 'bait', 'material']);

export const STARTING_ITEMS: ReadonlyArray<[string, number]> = [
  ['hoe', 1], ['watering_can', 1], ['machete', 1],
  ['seed_clover', 10], ['seed_catnip', 5], ['seed_moss', 3], ['seed_corn', 3],
  ['seed_shroom', 2], ['seed_pepper', 2], ['seed_cranberry', 2], ['seed_moonberry', 1],
];
