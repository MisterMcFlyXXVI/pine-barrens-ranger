/**
 * Homestead decorations: craftable things for the cabin yard and the cabin
 * itself, made at the Porch Workbench (HOME tab), set down with the
 * hotbar like any placeable, and taken back up by pressing A on them.
 *
 * Yard pieces go on open ground in the Cabin Yard (off the path and the
 * garden); wall pieces hang on the cabin's back wall (stand under it, face it);
 * floor pieces go on open floor inside the cabin. A few of them do something:
 * the fire pit (rest by it, better with a bench beside it), the chicken coop
 * (eggs every morning), the lantern post and floor lamp (light), the park map
 * (opens the pocket map), the birdhouse (songbirds).
 */
import { O } from './tiles';
import type { ItemDef } from './items';
import type { Recipe } from './economy';

export type DecoWhere = 'yard' | 'wall' | 'floor';

export interface DecoDef {
  item: string;
  obj: number;
  name: string;
  where: DecoWhere;
  inputs: Array<[string, number]>;
  /** Item description (bag / workbench). */
  desc: string;
  /** What you see when you press A on it. */
  look: string;
  /** How many you can set out (default: as many as you like). */
  max?: number;
  solid?: boolean;
}

export const DECOS: readonly DecoDef[] = [
  // ---- Cabin yard ----
  { item: 'deco_fire_pit', obj: O.FIRE_PIT, name: 'Fieldstone Fire Pit', where: 'yard', max: 2,
    inputs: [['field_stone', 6], ['charred_wood', 2]],
    desc: 'A ring of fieldstone for the yard. Lit from dusk on. Sit by it to rest (once a day); a log bench beside it makes it better.',
    look: 'Fieldstone, stacked dry, blackened inside. It smells like every good night you ever had outdoors.' },
  { item: 'deco_log_bench', obj: O.LOG_BENCH, name: 'Split-Log Bench', where: 'yard',
    inputs: [['timber', 3], ['iron_nail', 2]],
    desc: 'Half a log on two stumps. Put one next to the fire pit.',
    look: 'A split-log bench, worn smooth already. Splinter-free, mostly.' },
  { item: 'deco_coop', obj: O.CHICKEN_COOP, name: 'Chicken Coop', where: 'yard', max: 2,
    inputs: [['timber', 8], ['iron_nail', 6], ['plant_fiber', 10]],
    desc: 'A little board-and-batten henhouse with a ramp. Somebody in town will see that it gets hens. Collect the eggs each morning.',
    look: 'The hens mutter at you from the roost. Straw, feathers, and that warm hen smell.' },
  { item: 'deco_picnic', obj: O.PICNIC_TABLE, name: 'Picnic Table', where: 'yard',
    inputs: [['timber', 6], ['iron_nail', 4]],
    desc: 'A plank picnic table for the yard.',
    look: 'Somebody already carved initials in it. You don\'t remember doing that.' },
  { item: 'deco_lantern_post', obj: O.LANTERN_POST, name: 'Lantern Post', where: 'yard',
    inputs: [['timber', 2], ['scrap_copper', 2], ['pine_resin', 1]],
    desc: 'A cedar post with a hanging copper lantern. Lights the yard at night.',
    look: 'A copper lantern on a cedar post. Moths come to visit it. Ordinary moths. Probably.' },
  { item: 'deco_birdhouse', obj: O.BIRDHOUSE, name: 'Birdhouse', where: 'yard',
    inputs: [['timber', 2], ['iron_nail', 1], ['wild_acorn', 1]],
    desc: 'A gourd-roofed birdhouse on a pole. Songbirds move in.',
    look: 'A pair of chickadees has moved in. They watch you like landlords.' },
  { item: 'deco_scarecrow', obj: O.SCARECROW, name: 'Scarecrow', where: 'yard',
    inputs: [['timber', 2], ['plant_fiber', 8]],
    desc: 'Straw in an old flannel shirt, for the garden\'s edge.',
    look: 'Straw stuffed in an old flannel. At night it looks a little too much like someone standing very still.' },
  { item: 'deco_planter', obj: O.PLANTER, name: 'Flower Planter', where: 'yard',
    inputs: [['timber', 2], ['field_stone', 2], ['wild_clover', 2]],
    desc: 'A plank box of flowers that change with the seasons.',
    look: 'Whatever the season, something in it is blooming or trying to.' },
  // ---- Cabin wall ----
  { item: 'deco_painting', obj: O.WALL_PAINTING, name: 'Landscape Painting', where: 'wall',
    inputs: [['timber', 1], ['plant_fiber', 2], ['cranberries', 1], ['pine_resin', 1]],
    desc: 'Hang it on the cabin wall: a little oil painting of the high Barrens at sunset.',
    look: 'The high Barrens at sunset, red spruce black against the sky. Not bad, for cranberry and pine pitch.' },
  { item: 'deco_family_photo', obj: O.WALL_PHOTO, name: 'Family Photo', where: 'wall',
    inputs: [['timber', 1], ['crushed_quartz', 1], ['scrap_copper', 1]],
    desc: 'Hang it on the cabin wall: a framed photo of your people.',
    look: '' },
  { item: 'deco_park_map', obj: O.WALL_MAP, name: 'Map of the Park', where: 'wall',
    inputs: [['plant_fiber', 3], ['timber', 1], ['pine_resin', 1]],
    desc: 'Hang it on the cabin wall: a big brochure map of Pine Hollow and the Barrens. Press A on it to study the pocket map.',
    look: 'PINE HOLLOW & THE BARRENS -- A Visitor\'s Guide. Someone has inked little question marks all over the high ground.' },
  { item: 'deco_sampler', obj: O.WALL_SAMPLER, name: '"Almost Heaven" Sampler', where: 'wall',
    inputs: [['plant_fiber', 4], ['cranberries', 1], ['timber', 1]],
    desc: 'Hang it on the cabin wall: a cross-stitch sampler.',
    look: '"ALMOST HEAVEN" in cranberry thread, a little mountain underneath, and a mistake in the second E you\'ll never stop seeing.' },
  { item: 'deco_quilt', obj: O.WALL_QUILT, name: 'Wall Quilt', where: 'wall',
    inputs: [['plant_fiber', 6], ['cranberries', 1], ['wild_clover', 1]],
    desc: 'Hang it on the cabin wall: a Mountain Star quilt square.',
    look: 'A Mountain Star pattern, red and blue on cream. It makes the whole room warmer, somehow.' },
  { item: 'deco_banjo', obj: O.WALL_BANJO, name: 'Old Banjo', where: 'wall',
    inputs: [['timber', 2], ['deer_hide', 1], ['iron_nail', 1]],
    desc: 'Hang it on the cabin wall. Five strings, a hide head. Press A to pick a tune.',
    look: 'Five strings and a deer-hide head. You know about three chords.' },
  { item: 'deco_antlers', obj: O.WALL_ANTLERS, name: 'Mounted Antlers', where: 'wall',
    inputs: [['whitetail_antler', 1], ['timber', 1]],
    desc: 'Hang it on the cabin wall: a whitetail rack on a walnut plaque.',
    look: 'An eight-point whitetail rack on a plaque. Handy for hanging your hat.' },
  { item: 'deco_clock', obj: O.WALL_CLOCK, name: 'Cuckoo Clock', where: 'wall',
    inputs: [['timber', 2], ['scrap_copper', 2], ['iron_nail', 1]],
    desc: 'Hang it on the cabin wall. It tells you the time, loudly, on the hour.',
    look: '' },
  // ---- Cabin floor ----
  { item: 'deco_armchair', obj: O.ARMCHAIR, name: 'Wingback Armchair', where: 'floor',
    inputs: [['timber', 3], ['deer_hide', 1], ['plant_fiber', 4]],
    desc: 'A big comfortable chair for inside the cabin.',
    look: 'Deep, saggy and perfect. You could lose an afternoon in it.' },
  { item: 'deco_floor_lamp', obj: O.FLOOR_LAMP, name: 'Floor Lamp', where: 'floor',
    inputs: [['scrap_copper', 2], ['timber', 1], ['glow_shroom', 1]],
    desc: 'A tall lamp for inside the cabin, shaded in parchment. Glow-shroom bulb.',
    look: 'A parchment shade over a glow-shroom. It hums, very faintly.' },
  { item: 'deco_fern', obj: O.POTTED_FERN, name: 'Potted Fern', where: 'floor',
    inputs: [['field_stone', 1], ['plant_fiber', 2]],
    desc: 'A crock of maidenhair fern for inside the cabin.',
    look: 'A maidenhair fern in a stoneware crock. It likes it here.' },
];

export const DECO_BY_ITEM: Readonly<Record<string, DecoDef>> = Object.fromEntries(DECOS.map((d) => [d.item, d]));
export const DECO_BY_OBJ: Readonly<Record<number, DecoDef>> = Object.fromEntries(DECOS.map((d) => [d.obj, d]));
/** Wall pieces lie flat against the wall (drawn with the ground layer). */
export const WALL_DECOS: ReadonlySet<number> = new Set(DECOS.filter((d) => d.where === 'wall').map((d) => d.obj));

export const DECO_ITEMS: readonly ItemDef[] = DECOS.map((d) => ({ id: d.item, name: d.name, kind: 'placeable', price: 0, stack: 9, desc: d.desc }));
export const DECO_RECIPES: readonly Recipe[] = DECOS.map((d) => ({ id: `h_${d.item.slice(5)}`, out: d.item, qty: 1, inputs: d.inputs, homestead: true }));

/** The hens' names (Ruth sends three). */
export const HENS = ['Dolly', 'Loretta', 'Patsy'];
