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
} as const;

export const SOLID_GROUND: ReadonlySet<number> = new Set<number>([
  T.VOID, T.WATER, T.WALL_TOP, T.WALL_FACE, T.WALL_BASE, T.WALL_SIDE,
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
} as const;

export type Interact =
  | 'bed' | 'desk' | 'dresser' | 'fireplace' | 'pedestal' | 'workbench' | 'ship' | 'barrel'
  | 'sign' | 'mailbox' | 'bookshelf' | 'stove' | 'crate' | 'lamp' | 'table' | 'woodpile' | 'plant';

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
  [O.STUMP]: { name: 'Stump', solid: true, tool: 'machete', hp: 4, drops: [{ item: 'pine_resin', chance: 0.8, min: 1, max: 2 }, { item: 'charred_wood', chance: 0.25, min: 1, max: 1 }] },
  [O.LOG]: { name: 'Fallen Log', solid: true, tool: 'machete', hp: 5, drops: [{ item: 'charred_wood', chance: 0.5, min: 1, max: 2 }, { item: 'pine_resin', chance: 0.4, min: 1, max: 1 }] },
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
};

export function objProps(o: number): ObjProps {
  return OBJ_PROPS[o] ?? OBJ_PROPS[O.NONE];
}
