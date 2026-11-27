/** Ground tile and world-object identifiers + their gameplay properties. */
import type { ToolKind } from './items';

export const T = {
  VOID: 0,
  GRASS: 1,
  FOREST: 2,
  PATH: 3,
  SOIL: 4,
  WATER: 5,
  BRIDGE: 6,
  PORCH: 7,
  FLOOR: 8,
  WALL_TOP: 9,
  WALL_FACE: 10,
  WALL_BASE: 11,
  WALL_SIDE: 12,
  RUG: 13,
  DOORMAT: 14,
  DOOR: 15,
  HEARTH: 16,
  // ---- Phase 2 wilderness biomes ----
  BOG: 17,
  SHALLOW: 18,
  SPRING: 19,
  BOARDWALK: 20,
  HEMLOCK: 21,
  ROCKY: 22,
  SLOPE: 23,
  CLIFF: 24,
  RUIN_FLOOR: 25,
  CLOVER: 26,
  // ---- Phase 3 town ----
  PLAZA: 27,
  PLATFORM: 28,
  RAIL: 29,
  CHECKER: 30,
  MARBLE: 31,
  STAIRS: 32,
  // ---- The Deep Seam (mine expansion) ----
  COAL_FLOOR: 33,
  /** Solid coal rib (tunnel wall). */
  COAL_RIB: 34,
  MINE_RAIL: 35,
  /** Man-trip safety alcove cut into the rib: the Foreman walks past anyone in one. */
  ALCOVE: 36,
  /** Waste-rock gob pile (solid). */
  GOB: 37,
  /** Lamp House plank floor. */
  LAMP_FLOOR: 38,
} as const;

/** Wadeable water: blocked unless the player owns Bog Waders. */
export const WADE_GROUND: ReadonlySet<number> = new Set<number>([T.SHALLOW, T.SPRING]);

/** Natural ground where fog can hide an encounter. */
export const WILD_GROUND: ReadonlySet<number> = new Set<number>([
  T.GRASS, T.FOREST, T.BOG, T.HEMLOCK, T.ROCKY, T.SLOPE, T.CLOVER, T.RUIN_FLOOR,
]);

/** Step-time multiplier for heavy terrain. */
export const SLOW_GROUND: Readonly<Record<number, number>> = {
  [T.SLOPE]: 1.55,
  [T.SHALLOW]: 1.4,
  [T.SPRING]: 1.4,
  [T.BOG]: 1.15,
};

export const SOLID_GROUND: ReadonlySet<number> = new Set<number>([
  T.VOID, T.WATER, T.WALL_TOP, T.WALL_FACE, T.WALL_BASE, T.WALL_SIDE, T.CLIFF, T.COAL_RIB, T.GOB,
]);

export const O = {
  NONE: 0,
  PINE: 1,
  OAK: 2,
  BRUSH: 3,
  ROCK: 4,
  STUMP: 5,
  LOG: 6,
  BOULDER: 7,
  FENCE: 8,
  TALLGRASS: 9,
  FERN: 10,
  FLOWERS: 11,
  BRIAR: 12,
  REEDS: 13,
  LILYPAD: 14,
  MUSHROOMS: 15,
  SIGN: 16,
  MAILBOX: 17,
  WORKBENCH: 18,
  SHIP_BIN: 19,
  RAIN_BARREL: 20,
  LAMP: 21,
  BLOCK: 22,
  BED: 23,
  DESK: 24,
  DRESSER: 25,
  FIREPLACE: 26,
  PEDESTAL: 27,
  TABLE: 28,
  CHAIR: 29,
  BOOKSHELF: 30,
  STOVE: 31,
  PLANT: 32,
  CRATE: 33,
  WINDOW: 34,
  WOODPILE: 35,
  // ---- Phase 2 wilderness ----
  APPLE_TREE: 36,
  STONE_WALL: 37,
  WILLOW: 38,
  HEMLOCK_TREE: 39,
  HOLLOW_LOG: 40,
  RUIN_WALL: 41,
  LUMBER: 42,
  SAW_BLADE: 43,
  SLAG: 44,
  DEAD_TREE: 45,
  CRAN_BUSH: 46,
  // placeable lure mounts
  TOTEM: 47,
  ROD: 48,
  CHIME: 49,
  PYLON: 50,
  ROD_BASE: 51,
  // ---- Phase 3 town & interiors ----
  FOUNTAIN: 52,
  BOARD: 53,
  BENCH: 54,
  FLOWERBED: 55,
  COUNTER: 56,
  STOOL: 57,
  GRILL: 58,
  JUKEBOX: 59,
  SHELF: 60,
  ANVIL: 61,
  FORGE: 62,
  CASE: 63,
  KIOSK: 64,
  MAP_TABLE: 65,
  RAILCAR: 66,
  TICKET_BOOTH: 67,
  SIGNAL_LANTERN: 68,
  REGISTER: 69,
  POSTER: 70,
  HEDGE: 71,
  BOOTH_SEAT: 72,
  // ---- West Virginia glades ----
  RED_SPRUCE: 73,
  SKUNK_CABBAGE: 74,
  // ---- Trapping ----
  SNARE: 75,
  // ---- Barney's handcar stops ----
  HANDCAR: 76,
  STOP_SIGN: 77,
  // ---- Wildflowers & plants (seasonal looks) ----
  FORGET_ME_NOT: 78,
  THISTLE: 79,
  RHODODENDRON: 80,
  TRILLIUM: 81,
  MAYAPPLE: 82,
  INDIAN_PIPE: 83,
  PITCHER_PLANT: 84,
  CHICORY: 85,
  QUEEN_ANNE: 86,
  RAMP_PATCH: 87,
  ASTER: 88,
  // ---- Railroad, trail & homestead props ----
  CROSSBUCK: 89,
  MILEPOST: 90,
  WHISTLE_POST: 91,
  TRAILHEAD: 92,
  ROCKER: 93,
  CHIMES: 94,
  CLOTHESLINE: 95,
  CREEK_STONE: 96,
  // ---- Lived-in town props ----
  TRASH_CAN: 97,
  BIKE: 98,
  CAT: 99,
  NEWS_BOX: 100,
  FLOWER_POT: 101,
  MILK_CANS: 102,
  STATUE: 103,
  FLAGPOLE: 104,
  GUMBALL: 105,
  WATER_TOWER: 106,
  TIPPLE: 107,
  MINE_CART: 108,
  LAMP_HOUSE: 109,
  DOG: 110,
  // ---- Home interiors ----
  WALL_FRAME: 111,
  MODEL_TRAIN: 112,
  RADIO_RIG: 113,
  // ---- Story ----
  PORCH_RADIO: 114,
  /** Elias's rusted leg-hold traps in the Old Growth (the Sasquatch arc). */
  OLD_TRAP: 115,
  // ---- Town Restoration Ledger ----
  GAZEBO: 116,
  LEDGER: 117,
  // ---- The Meissgeiers ----
  /** A painted barn star on a post in your yard (the Snallygaster ward). */
  BARN_STAR: 118,
  // ---- The Deep Seam (mine expansion) ----
  /** A 1914 miner turned to anthracite, holding up the roof. */
  CALCIFIED: 119,
  /** A fresh hemlock prop you wedged in. */
  HEMLOCK_PROP: 120,
  /** An old timber post (taps RING). */
  MINE_POST: 121,
  /** Sealed crosscut rubble wall. */
  RUBBLE: 122,
  /** A tin dinner bucket (a spirit's, or just lore). */
  BUCKET: 123,
  /** Chalk tally marks on the rib. */
  CHALK: 124,
  /** A loose page of the Black-Edged Mine Ledger. */
  LEDGER_PAGE: 125,
  /** Drip-seep water. */
  SEEP: 126,
  /** A tin of carbide pellets. */
  CARBIDE: 127,
  /** Master Timber Crib (Level 3). */
  CRIB: 128,
  /** Lift cage / ore-cart lift between levels. */
  LIFT: 129,
  /** The 1914 In-and-Out Board. */
  INOUT_BOARD: 130,
  /** The Lamp House locker (the Mine Kit). */
  LOCKER: 131,
  /** Timber rack: fresh hemlock props. */
  TIMBER_RACK: 132,
  ORE_CART: 133,
  /** Brattice cloth curtain (decor, walkable-looking but solid). */
  BRATTICE: 134,
  /** First-aid box (the respirator). */
  FIRST_AID: 135,
  /** Biscuit cupboard. */
  CUPBOARD: 136,
  /** A pitch torch you set down in the mine. */
  TORCH: 137,
} as const;

/** Objects that count as encounter cover when stepped through. */
export const COVER_OBJECTS: ReadonlySet<number> = new Set<number>([O.TALLGRASS, O.REEDS, O.FERN, O.CRAN_BUSH, O.SKUNK_CABBAGE]);

/** Placeable lure-mount item id -> object id. */
export const MOUNT_OBJECT: Readonly<Record<string, number>> = {
  lure_totem: O.TOTEM,
  lightning_rod: O.ROD,
  antler_chime: O.CHIME,
  tesla_pylon: O.PYLON,
};

export type Interact =
  | 'bed' | 'desk' | 'dresser' | 'fireplace' | 'pedestal' | 'workbench' | 'ship' | 'barrel'
  | 'snare' | 'handcar' | 'rocker' | 'radio' | 'cat' | 'dog' | 'gumball' | 'sign' | 'mailbox' | 'bookshelf' | 'stove' | 'crate' | 'lamp' | 'table' | 'woodpile' | 'plant'
  | 'apple' | 'hollow' | 'mount' | 'sawblade' | 'rodbase'
  | 'board' | 'counter' | 'case' | 'kiosk' | 'maptable' | 'railcar' | 'booth' | 'signal' | 'jukebox'
  | 'grill' | 'shelf' | 'anvil' | 'fountain' | 'poster' | 'trap' | 'gazebo' | 'ledger' | 'barnstar' | 'mine';

export interface Drop {
  item: string;
  chance: number;
  min: number;
  max: number;
}

export interface ObjProps {
  name: string;
  solid: boolean;
  /** Tool that damages / clears this object. */
  tool?: ToolKind;
  hp?: number;
  drops?: Drop[];
  interact?: Interact;
  /** Footprint width in tiles (anchor = bottom-left). */
  fw?: number;
  /** Footprint height in tiles. */
  fh?: number;
}

export const OBJ_PROPS: Record<number, ObjProps> = {
  [O.NONE]: { name: '', solid: false },
  [O.PINE]: { name: 'Pitch Pine', solid: true },
  [O.OAK]: { name: 'Scrub Oak', solid: true },
  [O.BRUSH]: { name: 'Brush', solid: true, tool: 'machete', hp: 1, drops: [{ item: 'plant_fiber', chance: 0.7, min: 1, max: 2 }, { item: 'wild_acorn', chance: 0.12, min: 1, max: 1 }] },
  [O.ROCK]: { name: 'Rock', solid: true, tool: 'hoe', hp: 3, drops: [{ item: 'crushed_quartz', chance: 0.3, min: 1, max: 1 }, { item: 'mineral_salt', chance: 0.12, min: 1, max: 1 }] },
  [O.STUMP]: { name: 'Stump', solid: true, tool: 'machete', hp: 4, drops: [{ item: 'timber', chance: 0.5, min: 1, max: 2 }, { item: 'pine_resin', chance: 0.8, min: 1, max: 2 }, { item: 'charred_wood', chance: 0.25, min: 1, max: 1 }] },
  [O.LOG]: { name: 'Fallen Log', solid: true, tool: 'machete', hp: 5, drops: [{ item: 'timber', chance: 0.5, min: 1, max: 2 }, { item: 'charred_wood', chance: 0.5, min: 1, max: 2 }, { item: 'pine_resin', chance: 0.4, min: 1, max: 1 }] },
  [O.BOULDER]: { name: 'Boulder', solid: true },
  [O.FENCE]: { name: 'Fence', solid: true },
  [O.TALLGRASS]: { name: 'Tall Grass', solid: false, tool: 'machete', hp: 1, drops: [{ item: 'plant_fiber', chance: 0.45, min: 1, max: 1 }] },
  [O.FERN]: { name: 'Fern', solid: false, tool: 'machete', hp: 1, drops: [{ item: 'plant_fiber', chance: 0.3, min: 1, max: 1 }] },
  [O.FLOWERS]: { name: 'Wildflowers', solid: false },
  [O.BRIAR]: { name: 'Shortcut Briar', solid: true, tool: 'machete', hp: 2, drops: [{ item: 'plant_fiber', chance: 0.6, min: 1, max: 2 }] },
  [O.REEDS]: { name: 'Cattails', solid: false },
  [O.LILYPAD]: { name: 'Lily Pad', solid: true },
  [O.MUSHROOMS]: { name: 'Toadstools', solid: false },
  [O.SIGN]: { name: 'Sign', solid: true, interact: 'sign' },
  [O.MAILBOX]: { name: 'Mailbox', solid: true, interact: 'mailbox' },
  [O.WORKBENCH]: { name: 'Porch Workbench', solid: true, interact: 'workbench' },
  [O.SHIP_BIN]: { name: 'Shipping Bin', solid: true, interact: 'ship' },
  [O.RAIN_BARREL]: { name: 'Rain Barrel', solid: true, interact: 'barrel' },
  [O.LAMP]: { name: 'Lamp Post', solid: true, interact: 'lamp' },
  [O.BLOCK]: { name: '', solid: true },
  [O.BED]: { name: 'Bed', solid: true, interact: 'bed', fh: 2 },
  [O.DESK]: { name: 'Save Journal', solid: true, interact: 'desk' },
  [O.DRESSER]: { name: 'Wardrobe', solid: true, interact: 'dresser' },
  [O.FIREPLACE]: { name: 'Fireplace', solid: true, interact: 'fireplace', fw: 2 },
  [O.PEDESTAL]: { name: 'Trophy Pedestal', solid: true, interact: 'pedestal' },
  [O.TABLE]: { name: 'Table', solid: true, interact: 'table' },
  [O.CHAIR]: { name: 'Chair', solid: true },
  [O.BOOKSHELF]: { name: 'Bookshelf', solid: true, interact: 'bookshelf' },
  [O.STOVE]: { name: 'Stove', solid: true, interact: 'stove' },
  [O.PLANT]: { name: 'Houseplant', solid: true, interact: 'plant' },
  [O.CRATE]: { name: 'Crate', solid: true, interact: 'crate' },
  [O.WINDOW]: { name: 'Window', solid: true },
  [O.WOODPILE]: { name: 'Woodpile', solid: true, interact: 'woodpile' },
  [O.APPLE_TREE]: { name: 'Heirloom Apple Tree', solid: true, interact: 'apple' },
  [O.STONE_WALL]: { name: 'Stone Wall', solid: true },
  [O.WILLOW]: { name: 'Weeping Willow', solid: true },
  [O.HEMLOCK_TREE]: { name: 'Ancient Hemlock', solid: true },
  [O.HOLLOW_LOG]: { name: 'Hollow Log', solid: true, interact: 'hollow' },
  [O.RUIN_WALL]: { name: 'Sawmill Ruin', solid: true },
  [O.LUMBER]: { name: 'Rotting Lumber', solid: true, tool: 'machete', hp: 3, drops: [{ item: 'timber', chance: 0.5, min: 1, max: 2 }, { item: 'iron_nail', chance: 0.6, min: 1, max: 2 }, { item: 'charred_wood', chance: 0.3, min: 1, max: 1 }] },
  [O.SAW_BLADE]: { name: 'Rusted Saw Blade', solid: true, interact: 'sawblade' },
  [O.SLAG]: { name: 'Slag Heap', solid: true, tool: 'hoe', hp: 4, drops: [{ item: 'scrap_copper', chance: 0.7, min: 1, max: 2 }, { item: 'crushed_quartz', chance: 0.3, min: 1, max: 1 }] },
  [O.DEAD_TREE]: { name: 'Lightning-Struck Snag', solid: true },
  [O.CRAN_BUSH]: { name: 'Wild Cranberry', solid: false },
  [O.RED_SPRUCE]: { name: 'Red Spruce', solid: true },
  [O.SKUNK_CABBAGE]: { name: 'Skunk Cabbage', solid: false },
  [O.SNARE]: { name: 'Snare Trap', solid: true, interact: 'snare' },
  [O.CALCIFIED]: { name: 'Calcified Prop', solid: true, interact: 'mine' },
  [O.HEMLOCK_PROP]: { name: 'Hemlock Prop', solid: true, interact: 'mine' },
  [O.MINE_POST]: { name: 'Timber Post', solid: true, interact: 'mine' },
  [O.RUBBLE]: { name: 'Sealed Crosscut', solid: true, interact: 'mine' },
  [O.BUCKET]: { name: 'Dinner Bucket', solid: true, interact: 'mine' },
  [O.CHALK]: { name: 'Chalk Marks', solid: true, interact: 'mine' },
  [O.LEDGER_PAGE]: { name: 'Ledger Page', solid: false, interact: 'mine' },
  [O.SEEP]: { name: 'Drip-Seep', solid: true, interact: 'mine' },
  [O.CARBIDE]: { name: 'Carbide Tin', solid: true, interact: 'mine' },
  [O.CRIB]: { name: 'Master Timber Crib', solid: true, interact: 'mine' },
  [O.LIFT]: { name: 'Lift Cage', solid: true, interact: 'mine' },
  [O.INOUT_BOARD]: { name: 'In-and-Out Board', solid: true, interact: 'mine', fw: 2 },
  [O.LOCKER]: { name: 'Lamp-House Locker', solid: true, interact: 'mine' },
  [O.TIMBER_RACK]: { name: 'Timber Rack', solid: true, interact: 'mine' },
  [O.ORE_CART]: { name: 'Ore Car', solid: true, interact: 'mine' },
  [O.BRATTICE]: { name: 'Brattice Curtain', solid: true, interact: 'mine' },
  [O.FIRST_AID]: { name: 'First-Aid Box', solid: true, interact: 'mine' },
  [O.CUPBOARD]: { name: 'Biscuit Cupboard', solid: true, interact: 'mine' },
  [O.TORCH]: { name: 'Pitch Torch', solid: false, interact: 'mine' },
  [O.HANDCAR]: { name: 'Handcar', solid: true, interact: 'handcar' },
  [O.FORGET_ME_NOT]: { name: 'Forget-me-nots', solid: false },
  [O.THISTLE]: { name: 'Thistle', solid: false },
  [O.RHODODENDRON]: { name: 'Rhododendron', solid: true, tool: 'machete', hp: 3, drops: [{ item: 'plant_fiber', chance: 0.6, min: 1, max: 2 }] },
  [O.TRILLIUM]: { name: 'Trillium', solid: false },
  [O.MAYAPPLE]: { name: 'Mayapple', solid: false },
  [O.INDIAN_PIPE]: { name: 'Indian Pipe', solid: false },
  [O.PITCHER_PLANT]: { name: 'Pitcher Plant', solid: false },
  [O.CHICORY]: { name: 'Chicory', solid: false },
  [O.QUEEN_ANNE]: { name: "Queen Anne's Lace", solid: false },
  [O.RAMP_PATCH]: { name: 'Ramp Patch', solid: false },
  [O.ASTER]: { name: 'Asters', solid: false },
  [O.CROSSBUCK]: { name: 'Railroad Crossing', solid: true, interact: 'sign' },
  [O.MILEPOST]: { name: 'Milepost', solid: true, interact: 'sign' },
  [O.WHISTLE_POST]: { name: 'Whistle Post', solid: true, interact: 'sign' },
  [O.TRAILHEAD]: { name: 'Trailhead Board', solid: true, interact: 'sign' },
  [O.ROCKER]: { name: 'Rocking Chair', solid: true, interact: 'rocker' },
  [O.CHIMES]: { name: 'Wind Chimes', solid: false },
  [O.CLOTHESLINE]: { name: 'Clothesline', solid: true, fw: 3 },
  [O.CREEK_STONE]: { name: 'Creek Stones', solid: false },
  [O.TRASH_CAN]: { name: 'Trash Can', solid: true },
  [O.BIKE]: { name: 'Bicycle', solid: true },
  [O.CAT]: { name: 'Porch Cat', solid: true, interact: 'cat' },
  [O.NEWS_BOX]: { name: 'Newspaper Box', solid: true, interact: 'sign' },
  [O.FLOWER_POT]: { name: 'Flower Pot', solid: false },
  [O.MILK_CANS]: { name: 'Milk Cans', solid: true },
  [O.STATUE]: { name: "Miners' Memorial", solid: true, interact: 'sign' },
  [O.FLAGPOLE]: { name: 'Flagpole', solid: true },
  [O.GUMBALL]: { name: 'Gumball Machine', solid: true, interact: 'gumball' },
  [O.WATER_TOWER]: { name: 'Water Tower', solid: true, interact: 'sign', fw: 2, fh: 2 },
  [O.TIPPLE]: { name: 'Coal Tipple', solid: true, interact: 'sign', fw: 3, fh: 2 },
  [O.MINE_CART]: { name: 'Mine Cart', solid: true, interact: 'sign' },
  [O.LAMP_HOUSE]: { name: 'Lamp House', solid: true, interact: 'mine', fw: 2, fh: 2 },
  [O.DOG]: { name: 'Old Hound', solid: true, interact: 'dog' },
  [O.WALL_FRAME]: { name: 'Picture', solid: true },
  [O.MODEL_TRAIN]: { name: 'Model Railroad', solid: true, interact: 'sign', fw: 2 },
  [O.RADIO_RIG]: { name: 'Radio Rig', solid: true, interact: 'sign', fw: 2 },
  [O.PORCH_RADIO]: { name: 'Porch Radio', solid: true, interact: 'radio' },
  [O.OLD_TRAP]: { name: 'Rusted Trap', solid: true, interact: 'trap' },
  [O.GAZEBO]: { name: 'Gazebo', solid: true, interact: 'gazebo', fw: 3, fh: 2 },
  [O.LEDGER]: { name: 'Restoration Ledger', solid: true, interact: 'ledger' },
  [O.BARN_STAR]: { name: 'Painted Barn Star', solid: true, interact: 'barnstar' },
  [O.STOP_SIGN]: { name: 'Handcar Stop', solid: true, interact: 'handcar' },
  [O.TOTEM]: { name: 'Wooden Lure Totem', solid: true, interact: 'mount' },
  [O.ROD]: { name: 'Copper Lightning Rod', solid: true, interact: 'mount' },
  [O.CHIME]: { name: 'Bone & Antler Chime', solid: true, interact: 'mount' },
  [O.PYLON]: { name: 'Tesla Coil Pylon', solid: true, interact: 'mount' },
  [O.ROD_BASE]: { name: 'Lightning-Rod Mount', solid: true, interact: 'rodbase' },
  [O.FOUNTAIN]: { name: 'Founders Fountain', solid: true, interact: 'fountain', fw: 2, fh: 2 },
  [O.BOARD]: { name: 'Bulletin Board', solid: true, interact: 'board' },
  [O.BENCH]: { name: 'Bench', solid: true },
  [O.FLOWERBED]: { name: 'Flowerbed', solid: true },
  [O.COUNTER]: { name: 'Counter', solid: true, interact: 'counter' },
  [O.STOOL]: { name: 'Stool', solid: true },
  [O.GRILL]: { name: 'Griddle', solid: true, interact: 'grill' },
  [O.JUKEBOX]: { name: 'Jukebox', solid: true, interact: 'jukebox' },
  [O.SHELF]: { name: 'Shelf', solid: true, interact: 'shelf' },
  [O.ANVIL]: { name: 'Anvil', solid: true, interact: 'anvil' },
  [O.FORGE]: { name: 'Forge', solid: true, interact: 'anvil' },
  [O.CASE]: { name: 'Display Case', solid: true, interact: 'case' },
  [O.KIOSK]: { name: 'Gift Shop Kiosk', solid: true, interact: 'kiosk' },
  [O.MAP_TABLE]: { name: 'Survey Map Table', solid: true, interact: 'maptable' },
  [O.RAILCAR]: { name: 'Rusted Rail Car', solid: true, interact: 'railcar', fw: 2, fh: 3 },
  [O.TICKET_BOOTH]: { name: 'Ticket Booth', solid: true, interact: 'booth' },
  [O.SIGNAL_LANTERN]: { name: 'Signal Lantern', solid: true, interact: 'signal' },
  [O.REGISTER]: { name: 'Register', solid: true, interact: 'counter' },
  [O.POSTER]: { name: 'Poster', solid: true, interact: 'poster' },
  [O.HEDGE]: { name: 'Hedge', solid: true },
  [O.BOOTH_SEAT]: { name: 'Booth Seat', solid: true },
};

export function objProps(o: number): ObjProps {
  return OBJ_PROPS[o] ?? OBJ_PROPS[O.NONE];
}
