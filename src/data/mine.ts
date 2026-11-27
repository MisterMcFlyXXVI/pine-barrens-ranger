/**
 * The Deep Seam (post-epilogue mine expansion): the twelve lost miners of the
 * 1914 sealed shift, Josef Meissgeier's ledger, and the maps of the Lamp House
 * and the three levels below it. Rules live in src/engine/mine.ts; the full
 * design is in MINE_EXPANSION.md.
 */
import { T, O } from './tiles';
import { Builder } from './mapgen';
import type { MapDef, MapId } from './mapgen';
import { P } from '../graphics/palette';
import { shell, wrap } from './town';

export type MinerId =
  | 'pettit' | 'rinaldi' | 'turner' | 'horvath' | 'bledsoe'
  | 'calloway' | 'pritchard' | 'wozniak' | 'haddix'
  | 'kessler' | 'vance' | 'lusk';

export type Puzzle = 'prop' | 'chewer' | 'crosscut';

export interface Miner {
  id: MinerId;
  check: number;
  name: string;
  age: number;
  job: string;
  puzzle: Puzzle;
  level: MapId;
  /** The peaceful memory when his tag goes on the OUT peg. */
  memory: string[];
}

export const MINERS: readonly Miner[] = [
  { id: 'pettit', check: 14, name: 'Ezra Pettit', age: 41, job: 'timberman', puzzle: 'prop', level: 'MINE_L1', memory: [
    'Check 14 goes on the OUT peg. For a moment the lamp house smells of fresh-cut oak.',
    'A man with sawdust in his beard sits on the bench outside, in a summer that ended long ago, whittling a toy horse for a girl who keeps asking if it\'s done yet. "Near enough," he says, and hands it over.',
  ] },
  { id: 'rinaldi', check: 27, name: 'Giuseppe "Joe" Rinaldi', age: 33, job: 'coal loader, from Calabria', puzzle: 'prop', level: 'MINE_L1', memory: [
    'Check 27 goes on the OUT peg. Somewhere, very faint, a mandolin.',
    'A kitchen in the coal camp, garlic in the pan, a letter from Calabria propped against the bread. Joe reads it out loud twice, the second time slower, so his boy can learn the words.',
  ] },
  { id: 'turner', check: 31, name: 'Moses Turner', age: 38, job: 'coal loader, from Alabama', puzzle: 'prop', level: 'MINE_L2', memory: [
    'Check 31 goes on the OUT peg. You hear a hymn, sung low, the way men sing when their hands are busy.',
    'A Sunday on the porch of the colored church at the camp. Moses in his good collar, his wife laughing at something he said, his tonnage book in his pocket where he always kept it, every ton his, every ton counted right.',
  ] },
  { id: 'horvath', check: 45, name: 'Lajos Horváth', age: 29, job: 'shot-firer, from Hungary', puzzle: 'prop', level: 'MINE_L2', memory: [
    'Check 45 goes on the OUT peg. A fiddle somewhere tunes up and starts a csárdás.',
    'A wedding in a rented hall, paper lanterns, everybody dancing. Lajos, who handled powder all day without a tremble, cannot get the hang of the step, and his bride does not care at all.',
  ] },
  { id: 'bledsoe', check: 52, name: 'Harlan Bledsoe', age: 52, job: 'track layer', puzzle: 'prop', level: 'MINE_L3', memory: [
    'Check 52 goes on the OUT peg. A spike maul rings, once, clean.',
    'Harlan on the grade at dawn, sighting down a new run of rail with one eye shut. "True as a fiddle string," he says, to nobody, and lights his pipe, and watches the mist come off the river.',
  ] },
  { id: 'calloway', check: 63, name: 'Dewey Calloway', age: 17, job: 'brakeman', puzzle: 'chewer', level: 'MINE_L1', memory: [
    'Check 63 goes on the OUT peg. A boy\'s whistle, two notes, the brakeman\'s all-clear.',
    'Dewey riding the back of a coal trip out of the drift mouth into sunlight, cap pushed back, grinning like it\'s the best job in the world. He looks a lot like Pippa. He has her chin.',
  ] },
  { id: 'pritchard', check: 71, name: 'Owen Pritchard', age: 46, job: 'motorman, from Wales', puzzle: 'chewer', level: 'MINE_L1', memory: [
    'Check 71 goes on the OUT peg. Four voices in harmony, a Welsh hymn, gently.',
    'The camp men\'s choir in the schoolhouse, Owen in the back row with the basses, eyes shut, feeling the chord settle in his chest. He always said underground was just the long rest between songs.',
  ] },
  { id: 'wozniak', check: 78, name: 'Tomasz Woźniak', age: 24, job: 'mule driver, from Poland', puzzle: 'chewer', level: 'MINE_L2', memory: [
    'Check 78 goes on the OUT peg. A mule snorts, and a harness jingles.',
    'Tomasz in the mule barn after shift, brushing down Kasia, the mule nobody else could handle. He feeds her a carrot he saved from his own dinner bucket and tells her about his mother\'s garden in Galicia.',
  ] },
  { id: 'haddix', check: 84, name: 'Silas Haddix', age: 35, job: 'pumpman', puzzle: 'chewer', level: 'MINE_L2', memory: [
    'Check 84 goes on the OUT peg. The steady thump of a pump, then quiet.',
    'Silas on his porch with a baby on his knee, his boy, who will be Earl Haddix\'s father. He is singing "Shady Grove" wrong on purpose to make the baby laugh, and it works every time.',
  ] },
  { id: 'kessler', check: 90, name: 'Anselm Kessler', age: 19, job: 'timber apprentice to Josef Meissgeier', puzzle: 'crosscut', level: 'MINE_L2', memory: [
    'Check 90 goes on the OUT peg. The smell of pine pitch and a carpenter\'s pencil.',
    'A workshop behind the company store. A tall, stern man with an Allgäu accent, Josef, is showing a skinny boy how to cut a dovetail. "Langsam. Slowly. The wood tells you." Anselm gets it right on the third try, and Josef claps him on the back so hard he nearly falls over.',
  ] },
  { id: 'vance', check: 97, name: 'Clement Vance', age: 44, job: 'fire boss', puzzle: 'crosscut', level: 'MINE_L3', memory: [
    'Check 97 goes on the OUT peg. A safety lamp flame steadies, blue at the root.',
    'Clement at the kitchen table with his niece on his lap, letting her chalk his initials and the date on a slate the way a fire boss chalks the face each morning. "C.V. -- all clear." She will grow up to be Agnes and Elias\'s mother. He told Garrity no. He went back in for his men anyway.',
  ] },
  { id: 'lusk', check: 103, name: 'Benjy Lusk', age: 11, job: 'trapper boy', puzzle: 'crosscut', level: 'MINE_L3', memory: [
    'Check 103 goes on the OUT peg, the last one. It is very quiet in the lamp house.',
    'A boy running barefoot down the haul road in June with a fishing pole, the whole afternoon ahead of him, no door to tend in the dark, nowhere he has to be. He doesn\'t look back. He doesn\'t need to.',
  ] },
];

export const MINER_BY_ID: Record<MinerId, Miner> = Object.fromEntries(MINERS.map((m) => [m.id, m])) as Record<MinerId, Miner>;

/** The Black-Edged Mine Ledger: what you find (old German script), and Walter's translation. */
export interface LedgerPage { id: number; found: string; text: string[] }

export const LEDGER: readonly LedgerPage[] = [
  { id: 1, found: 'A ledger page, black at the edges: tonnage columns in a clerk\'s hand, and in the margin, tight old German script.', text: [
    'NO. 3 TONNAGE, FEB. 1914. Room 9 -- 41 tons. Room 12 -- 38 tons.',
    'JOSEF (margin): "The cribs I built are made to hold. Not to be robbed. A pillar is not coal. A pillar is the roof\'s promise."',
  ] },
  { id: 2, found: 'A page torn at the binding. Kurrent script, pressed hard enough to dent the paper.', text: [
    'JOSEF: "Garrity wants the pillars in the old works. Twelve dollars a ton bonus to the foreman. He says the roof will hold till spring. The roof does not read the company\'s calendar."',
  ] },
  { id: 3, found: 'A page with a pencil sketch: a timber crib in cross-section, every joint labelled in German.', text: [
    'A TIMBER-WRIGHT\'S SKETCH: a Master Crib, notched log on log, labelled "Zimmermann J. Meissgeier, 1911".',
    'JOSEF: "Four master cribs hold the deep chamber. Take out any one and the others must hold more. Take out all four and the mountain closes its hand."',
  ] },
  { id: 4, found: 'A page water-stained into a map: the old works, the crosscuts marked with crosses.', text: [
    'JOSEF: "My grandmother said: Der Berg nimmt seinen Zehnten an Stille. The mountain takes its tithe of quiet. Take more than your share, and it takes back the noise. The picks. The whistles. The men."',
  ] },
  { id: 5, found: 'A page found in bad air. The ink has run, but the German is still legible.', text: [
    'JOSEF: "Today the canary in Room 20 stopped singing. Garrity said the bird was old. The bird was not old."',
    'FOREMAN\'S ORDER (clerk\'s hand): "Night shift to rob pillars 14 through 22. Full tonnage bonus. -- A. Garrity."',
  ] },
  { id: 6, found: 'A page with a column of names, and beside some of them, a cross.', text: [
    'NIGHT SHIFT, 11 MARCH 1914: Pettit, Rinaldi, Turner, Horvath, Bledsoe, Calloway, Pritchard, Wozniak, Haddix, Kessler, Vance (fire boss), Lusk (trapper).',
    'JOSEF: "Anselm is on the list. I told him not to go. He said if the fire boss goes, the apprentice goes. He is nineteen."',
  ] },
  { id: 7, found: 'A page found near the deep face, the paper gone stiff with coal dust.', text: [
    'JOSEF: "The roof began to work at two in the morning. You hear it before you see it, a sound like a ship. Clement Vance pulled his men back. Garrity blew his whistle and sent them in again. For the tonnage."',
  ] },
  { id: 8, found: 'A page in the Tally Chamber, pinned under a chunk of slag that is warm to the touch.', text: [
    'CLERK: "12 March 1914. Crosscuts 4, 9 and 11 sealed by order of the company to preserve the haulageway. No further entry."',
    'JOSEF: "They bricked them in. I heard Benjy\'s door-bell through the wall. I will hear it until I die."',
  ] },
  { id: 9, found: 'The last page, its edges burnt black. Josef\'s hand, shaking.', text: [
    'JOSEF: "I leave the timber trade. I will not go under the mountain again. If any of my family comes to this country, they must hear it from me: take only your share. Bring every man out. And when the debt is paid, close the hand."',
    'In different ink, later, younger: "Read this, Onkel. I came anyway. -- W.M., 1962."',
  ] },
];

/** The Miner's Almanac: what you learn about the Deep Seam as you meet it (Journal page). */
export const ALMANAC: Readonly<Record<string, { title: string; text: string }>> = {
  headlamp: { title: 'CARBIDE HEADLAMP', text: 'Water drips on calcium carbide and makes acetylene; the flame burns at the reflector. Shutter it and they cannot see you. Refill: 1 pellet, 1 water (R).' },
  canary: { title: 'THE CANARY', text: 'Sings in good air. Goes quiet and rattles the cage in gas or haze. Feed it seed once a day, or it sulks, and a sulking canary lies.' },
  bar: { title: 'SOUNDING BAR', text: 'Tap the roof and the rib. RING is sound slate. HOLLOW THUD is a kettle-bottom, a false support, or a keystone. Loud.' },
  safety: { title: 'DAVY LAMP', text: 'A flame behind wire gauze that cannot ignite gas. Burns blue-green near firedamp. Picks out props that are holding the roof.' },
  choke: { title: 'CHOKEDAMP', text: 'Blackdamp: air with the life taken out of it. Heavy, sweet, pools in low places and sealed crosscuts. The wet-wool respirator slows it.' },
  fire: { title: 'FIREDAMP', text: 'Methane. Invisible, and an open flame sets it off. Shutter the carbide and never set a torch in it.' },
  haze: { title: "THE FOREMAN'S HAZE", text: 'Coal dust that rolls through the drifts on its own. Shrinks your light and thins your air. Weaker every three tags you bring out.' },
  kettle: { title: 'KETTLE-BOTTOM', text: 'A fossil tree stump in the roof slate, smooth-sided, that drops without warning. Tap ahead: a thud means stand back and knock it down.' },
  alcove: { title: 'MAN-TRIP ALCOVE', text: 'A refuge notch cut into the rib so men could step clear of the coal trips. The Foreman walks past anyone in one. But hide in the same one too often and he learns it.' },
  crawl: { title: 'CRAWLWAY', text: 'A low hole between workings. Too low for your lit cap lamp: shutter it and crawl. Far too low for the Foreman.' },
  flood: { title: 'FLOODED DRIFT', text: 'Old workings full of seep water. Bog Waders get you through.' },
  chewer: { title: 'COAL-CHEWER', text: 'What hunger made of a man. Drawn to light. In the dark, offer water or something warm and the trance breaks.' },
  foreman: { title: 'THE FOREMAN', text: 'Amos Garrity, or what is left of him. Sees your light, hears your bar, follows the clink of tags. Hide, go dark, or crawl.' },
  calcified: { title: 'CALCIFIED PROP', text: 'A man turned to anthracite holding the roof. Shore him with hemlock first, then pry his tag.' },
  crosscut: { title: 'SEALED CROSSCUT', text: 'Bricked up by the company in 1914. One stone is the keystone. Chokedamp waits behind it.' },
  torch: { title: 'PITCH TORCH', text: 'Lights a wide circle for good. In its light they can see you, shutter or no.' },
  decoy: { title: 'COAL DECOY', text: 'Throw a lump (select it, press A). The clatter pulls them to look. Seams in the rib give more.' },
  cart: { title: 'THE ORE CAR', text: 'Level 1 haulage. Ride it end to end, fast and very loud.' },
  oldworks: { title: 'THE OLD WORKS', text: 'An 1888 drift under Level 2, opened by the blast. A black lake, pale fish, fungus that glows. Nothing hunts here.' },
};

/* ------------------------------------------------------------------ */
/* Level layouts                                                       */
/* ------------------------------------------------------------------ */

export type Pt = [number, number];
export interface GasZone { x: number; y: number; w: number; h: number; kind: 'choke' | 'fire' }
export interface Crosscut { tag: MinerId; rubble: Pt[]; keystone: Pt; bucket: Pt; spirit: Pt }

export interface MineLevel {
  id: MapId;
  name: string;
  /** Where the lift cage drops you. */
  arrive: Pt;
  lift: Pt;
  props: Array<{ tag: MinerId; at: Pt }>;
  /** Coal-Chewer patrols: waypoints, walked there and back. */
  chewers: Array<{ tag: MinerId; path: Pt[] }>;
  crosscuts: Crosscut[];
  gas: GasZone[];
  /** Unstable "kettle-bottom" roof slabs. */
  kettles: Pt[];
  /** The Foreman's patrol loop (Level 3 always; Level 2 while you carry tags). */
  foreman?: Pt[];
  cribs?: Pt[];
  /** Coal seams in the rib (lumps for decoys). */
  seams?: Pt[];
  /** The rideable ore car's two ends on the haulage rail (Level 1). */
  cart?: [Pt, Pt];
}

const L1: MineLevel = {
  id: 'MINE_L1', name: 'Level 1: Drift Mouth & Main Haulageway', arrive: [5, 34], lift: [3, 31],
  props: [{ tag: 'pettit', at: [13, 4] }, { tag: 'rinaldi', at: [26, 32] }],
  chewers: [
    { tag: 'calloway', path: [[8, 18], [58, 18]] },
    { tag: 'pritchard', path: [[45, 21], [45, 31], [42, 31], [52, 31]] },
  ],
  crosscuts: [],
  gas: [{ x: 48, y: 29, w: 5, h: 6, kind: 'choke' }],
  kettles: [[20, 18], [33, 17], [47, 19]],
  seams: [[22, 20], [12, 2], [44, 4], [19, 32]],
  cart: [[5, 18], [60, 18]],
};

const L2: MineLevel = {
  id: 'MINE_L2', name: 'Level 2: Gob Piles & Room-and-Pillar Workings', arrive: [4, 5], lift: [3, 8],
  props: [{ tag: 'turner', at: [28, 21] }, { tag: 'horvath', at: [42, 35] }],
  chewers: [
    { tag: 'wozniak', path: [[5, 25], [55, 25]] },
    { tag: 'haddix', path: [[32, 3], [32, 44]] },
  ],
  crosscuts: [{ tag: 'kessler', rubble: [[56, 20], [56, 21], [56, 22], [57, 20], [57, 21], [57, 22]], keystone: [56, 21], bucket: [60, 21], spirit: [60, 20] }],
  gas: [{ x: 58, y: 18, w: 4, h: 7, kind: 'choke' }, { x: 15, y: 38, w: 7, h: 3, kind: 'fire' }],
  kettles: [[11, 18], [39, 31], [31, 11]],
  foreman: [[53, 44], [53, 39], [32, 39], [32, 11], [10, 11], [32, 11], [32, 39], [53, 39]],
  seams: [[9, 15], [30, 29], [48, 22], [20, 42]],
};

const L3: MineLevel = {
  id: 'MINE_L3', name: "Level 3: The Deep Face & Foreman's Tally Chamber", arrive: [4, 5], lift: [6, 2],
  props: [{ tag: 'bledsoe', at: [52, 6] }],
  chewers: [],
  crosscuts: [
    { tag: 'vance', rubble: [[7, 20], [7, 21], [7, 22]], keystone: [7, 22], bucket: [11, 21], spirit: [11, 20] },
    { tag: 'lusk', rubble: [[30, 41], [31, 41], [32, 41]], keystone: [31, 41], bucket: [31, 44], spirit: [32, 44] },
  ],
  gas: [{ x: 8, y: 18, w: 5, h: 7, kind: 'choke' }, { x: 28, y: 42, w: 7, h: 4, kind: 'choke' }, { x: 43, y: 3, w: 3, h: 3, kind: 'fire' }],
  kettles: [[35, 4], [5, 15], [45, 39], [52, 30]],
  foreman: [[29, 4], [50, 4], [52, 4], [52, 21], [52, 39], [29, 39], [29, 30], [29, 13]],
  cribs: [[21, 15], [38, 15], [21, 28], [38, 28]],
  seams: [[30, 2], [50, 14], [17, 20]],
};

/** The Old Works: the 1880s drift under Level 2 that the blast shook open. Quiet, black water, and pale things living in it. */
const L4: MineLevel = {
  id: 'MINE_L4', name: 'The Old Works (1888)', arrive: [5, 4], lift: [4, 3],
  props: [], chewers: [], crosscuts: [], gas: [], kettles: [],
  seams: [[9, 1], [20, 8], [42, 14]],
};

export const MINE_LEVELS: Readonly<Record<string, MineLevel>> = { MINE_L1: L1, MINE_L2: L2, MINE_L3: L3, MINE_L4: L4 };
export const MINE_MAPS: ReadonlySet<MapId> = new Set<MapId>(['MINE_L1', 'MINE_L2', 'MINE_L3', 'MINE_L4']);
/** The Lamp House and everything below it use the mine palette and rules. */
export const isMineMap = (id: MapId): boolean => MINE_MAPS.has(id);
export const isDeepSeam = (id: MapId): boolean => MINE_MAPS.has(id) || id === 'LAMP_HOUSE';

/** Lamp House interior spots. */
export const LAMP_HOUSE = { arrive: [6, 7] as Pt, wake: [6, 5] as Pt, board: [4, 3] as Pt, locker: [1, 3] as Pt, lift: [11, 3] as Pt };

/* ------------------------------------------------------------------ */
/* Builders                                                            */
/* ------------------------------------------------------------------ */

function cave(W: number, H: number): Builder { return new Builder(W, H, T.COAL_RIB); }
function carve(b: Builder, x: number, y: number, w: number, h: number): void {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (xx > 0 && yy > 0 && xx < b.w - 1 && yy < b.h - 1) b.setG(xx, yy, T.COAL_FLOOR);
}
function rail(b: Builder, pts: Pt[]): void {
  for (let k = 0; k + 1 < pts.length; k++) {
    const [ax, ay] = pts[k], [bx, by] = pts[k + 1];
    for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) if (b.g(x, y) === T.COAL_FLOOR) b.setG(x, y, T.MINE_RAIL);
  }
}
function put(b: Builder, x: number, y: number, o: number, text?: string): void {
  b.setO(x, y, o);
  if (text) b.signs.set(b.i(x, y), text);
}
/** Alcoves: notches cut into the rib beside a tunnel. */
function alcoves(b: Builder, pts: Pt[]): void { for (const [x, y] of pts) if (b.g(x, y) === T.COAL_RIB) b.setG(x, y, T.ALCOVE); }
/** Timber sets along a rib (decor posts on the rib tiles). */
function posts(b: Builder, y: number, x0: number, x1: number, step: number): void {
  for (let x = x0; x <= x1; x += step) if (b.g(x, y) === T.COAL_RIB && b.o(x, y) === O.NONE) b.setO(x, y, O.MINE_POST);
}
/** A low crawlway through the coal (shutter your lamp to fit; too low for the Foreman). */
function crawl(b: Builder, x: number, y: number, w: number, h: number): void { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) b.setG(xx, yy, T.CRAWL); }
/** A drift flooded knee-deep (Bog Waders to wade it). */
function flood(b: Builder, x: number, y: number, w: number, h: number): void { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) { b.setG(xx, yy, T.SHALLOW); b.setO(xx, yy, O.NONE); } }
function level(b: Builder, L: MineLevel, portals: MapDef['portals']): MapDef {
  for (const p of L.props) put(b, p.at[0], p.at[1], O.CALCIFIED);
  for (const c of L.crosscuts) {
    for (const [x, y] of c.rubble) { b.setG(x, y, T.COAL_FLOOR); put(b, x, y, O.RUBBLE); }
    put(b, c.bucket[0], c.bucket[1], O.BUCKET);
  }
  for (const [x, y] of L.cribs ?? []) put(b, x, y, O.CRIB);
  for (const [x, y] of L.seams ?? []) put(b, x, y, O.COAL_SEAM);
  if (L.cart) put(b, L.cart[0][0], L.cart[0][1], O.RIDE_CART);
  put(b, L.lift[0], L.lift[1], O.LIFT);
  return wrap(b, L.id, L.name, { indoor: true, wild: false, portals, battleColors: [P.SHADOW, P.VOID] });
}

export function buildLampHouse(front: Pt): MapDef {
  // One tight room: the locker and the carbide tin, the In-and-Out Board, the biscuit cupboard and the
  // timber rack along the back wall, the bench, and the lift cage in the corner.
  const b = shell(13, 9, T.LAMP_FLOOR, 6);
  put(b, LAMP_HOUSE.locker[0], LAMP_HOUSE.locker[1], O.LOCKER);
  put(b, 2, 3, O.CARBIDE, 'The lamp-house carbide tin, dented, half full of grey pellets. It smells of garlic and pennies.');
  b.place(LAMP_HOUSE.board[0], LAMP_HOUSE.board[1], O.INOUT_BOARD, 2, 1);
  put(b, 7, 3, O.SHELF, 'The 1978 board, the checks all taken down now. Over the pegs somebody has chalked, small: "312 -- OUT. -- W." Above it, a hand-lettered sign: "NO MAN GOES DOWN WITHOUT A CANARY, A FIRE BOSS, AND HIS SUPPER."');
  put(b, 8, 3, O.CUPBOARD);
  put(b, 9, 3, O.TIMBER_RACK);
  put(b, LAMP_HOUSE.lift[0], LAMP_HOUSE.lift[1], O.LIFT);
  put(b, 5, 6, O.BENCH, 'The lamp-house bench, worn smooth. Men laced their boots here for sixty years.');
  put(b, 1, 6, O.SHELF, 'Hard hats from 1978 on one shelf, leather caps from 1914 on the shelf below. Somebody has dusted them.');
  put(b, 11, 6, O.ORE_CART, 'An ore car on a stub of rail, loaded with fresh-cut hemlock and a coil of shot-firer\'s wire.');
  b.setO(3, 1, O.WINDOW); b.setO(9, 1, O.WINDOW);
  return wrap(b, 'LAMP_HOUSE', 'The No. 3 Lamp House', {
    indoor: true, battleColors: [P.SHADOW, P.AMBER],
    portals: [{ x: 6, y: 8, w: 1, h: 1, to: 'PINE_HOLLOW_TOWN', tx: front[0], ty: front[1], dir: 'down', closedMsg: '' }],
  });
}

export function buildMineL1(): MapDef {
  const b = cave(64, 40);
  carve(b, 2, 30, 8, 8);                 // drift-mouth landing (the lift)
  carve(b, 4, 20, 3, 10);                // up to the haulage
  carve(b, 2, 17, 61, 3);                // main haulageway
  rail(b, [[3, 18], [62, 18]]);
  carve(b, 12, 6, 3, 11); carve(b, 8, 3, 11, 4);     // north heading 1 + room
  carve(b, 36, 7, 3, 10); carve(b, 32, 3, 12, 4);    // north heading 2 + room
  carve(b, 24, 20, 3, 10); carve(b, 20, 30, 12, 6);  // south heading 1 + room
  carve(b, 44, 20, 3, 8); carve(b, 40, 28, 14, 8);   // south heading 2 + gas room
  rail(b, [[45, 20], [45, 31]]);
  alcoves(b, [[10, 16], [18, 16], [26, 16], [34, 16], [42, 16], [50, 16], [58, 16], [16, 20], [32, 20], [52, 20], [3, 24]]);
  posts(b, 16, 7, 60, 4); posts(b, 20, 9, 60, 4);
  crawl(b, 19, 4, 13, 1);                // a crawlway between the two north rooms
  flood(b, 32, 33, 8, 1);                // a flooded drift between the two south rooms
  put(b, 9, 3, O.TIMBER_RACK);
  put(b, 18, 3, O.CHALK, 'CHALK ON THE RIB, a fire boss\'s morning mark: "C.V. 3-11-14 -- GAS IN 20 -- ALL CLEAR HERE." Under it, tally marks: one crew\'s cars, shift by shift. The last row of strokes trails off.');
  put(b, 33, 3, O.SEEP); put(b, 34, 3, O.CARBIDE);
  put(b, 43, 3, O.BUCKET, 'A dented dinner bucket. Top tier: cold coffee gone to tar. Middle: a heel of cornbread. Bottom: a child\'s drawing of a mule, folded small.');
  put(b, 21, 30, O.TIMBER_RACK);
  put(b, 31, 30, O.CHALK, 'Tally marks in sets of five, row after row, and beside them in a careful hand: "ROOM 12 -- RINALDI & TURNER -- 38 T." Someone has rubbed out the 38 and chalked 41.');
  put(b, 41, 29, O.BUCKET, 'A dinner bucket with a name scratched in the lid: O. PRITCHARD. Inside, a hymnbook in Welsh, the pages swollen with damp.');
  put(b, 53, 28, O.SEEP);
  put(b, 7, 31, O.ORE_CART, 'A man-trip car, the kind the shift rode in on, rusted to the rails. Twelve seats. Somebody has left a lamp on each one.');
  put(b, 2, 18, O.BRATTICE, 'A brattice curtain, heavy canvas soaked in tar, hung to steer the air. It moves gently, as if something on the other side is breathing.');
  const pages: Array<[number, Pt]> = [[1, [17, 5]], [2, [40, 5]], [3, [29, 34]], [4, [51, 33]]];
  for (const [n, [x, y]] of pages) { put(b, x, y, O.LEDGER_PAGE); b.meta.set(b.i(x, y), `page:${n}`); }
  return level(b, L1, [{ x: 62, y: 17, w: 1, h: 3, to: 'MINE_L2', tx: 4, ty: 5, dir: 'right', closedMsg: '' }]);
}

export function buildMineL2(): MapDef {
  const b = cave(64, 48);
  carve(b, 2, 2, 54, 44);
  // Room-and-pillar: coal pillars left standing to hold the roof.
  for (const px of [6, 13, 20, 27, 34, 41, 48]) for (const py of [6, 13, 20, 27, 34, 41]) b.rectG(px, py, 4, 4, T.COAL_RIB);
  // Robbed pillars: where the shift cut them out, a man is holding the roof now.
  carve(b, 27, 20, 4, 4); carve(b, 41, 34, 4, 4);
  for (const [x, y, w, h] of [[10, 23, 3, 2], [24, 38, 3, 2], [45, 10, 2, 3], [53, 27, 3, 2], [17, 3, 3, 2]] as Array<[number, number, number, number]>) b.rectG(x, y, w, h, T.GOB);
  crawl(b, 13, 28, 4, 1); crawl(b, 35, 13, 1, 4); // crawlways bored through two pillars
  flood(b, 24, 38, 7, 3);                // a flooded room (it used to be a gob pile)
  carve(b, 58, 18, 4, 7);                // Anselm's sealed crosscut
  carve(b, 56, 20, 2, 3);
  rail(b, [[3, 25], [55, 25]]); rail(b, [[32, 3], [32, 44]]);
  alcoves(b, [[1, 11], [1, 25], [1, 39], [24, 1], [40, 1], [56, 11], [56, 39], [20, 46], [44, 46]]);
  put(b, 7, 2, O.FIRST_AID, 'FIRST-AID STATION, NO. 3 DEEP. A tin box with a red cross: rolled bandages, a bottle of iodine, and a wet-wool brattice respirator with round goggles, still damp.');
  put(b, 9, 2, O.CARBIDE); put(b, 40, 2, O.CARBIDE);
  put(b, 22, 2, O.SEEP); put(b, 45, 44, O.SEEP);
  put(b, 24, 24, O.TIMBER_RACK); put(b, 52, 44, O.TIMBER_RACK);
  put(b, 2, 10, O.CHALK, 'A row of chalked names on the rib, a crew\'s roll: "TURNER. HORVATH. WOZNIAK + KASIA (MULE)." Kasia has been underlined twice.');
  put(b, 45, 2, O.BUCKET, 'A dinner bucket with a carrot, dried to a twist, saved in the top tier. W. scratched on the lid.');
  put(b, 38, 26, O.CHALK, 'Chalk on a pillar, big and angry, in a different hand: "ROB 14-22 TONIGHT. FULL BONUS. -- G." Somebody has scrawled under it: "THE ROOF IS WORKING. -- C.V."');
  put(b, 3, 44, O.ORE_CART, 'A coal car, still loaded, the coal in it worn smooth as if many hands have rested on it.');
  const pages: Array<[number, Pt]> = [[5, [18, 39]], [6, [44, 38]]];
  for (const [n, [x, y]] of pages) { put(b, x, y, O.LEDGER_PAGE); b.meta.set(b.i(x, y), `page:${n}`); }
  return level(b, L2, [
    { x: 2, y: 4, w: 1, h: 1, to: 'MINE_L1', tx: 60, ty: 18, dir: 'left', closedMsg: '' },
    { x: 53, y: 45, w: 1, h: 1, to: 'MINE_L3', tx: 4, ty: 5, dir: 'down', closedMsg: '' },
  ]);
}

export function buildMineL3(): MapDef {
  const b = cave(60, 48);
  carve(b, 2, 2, 8, 6);                  // landing at the ore-cart lift
  carve(b, 10, 3, 40, 3);                // A: east to the deep face
  carve(b, 46, 2, 12, 10);               // the deep face
  carve(b, 4, 8, 3, 33);                 // B: south along the west rib
  carve(b, 4, 38, 50, 3);                // C: the bottom drift
  carve(b, 51, 12, 3, 29);               // D: east drift
  carve(b, 18, 12, 24, 20);              // the Foreman's Tally Chamber
  carve(b, 28, 6, 3, 6); carve(b, 28, 32, 3, 6); carve(b, 7, 26, 11, 3); carve(b, 42, 20, 9, 3);
  carve(b, 8, 18, 5, 7);                 // Clement Vance's sealed crosscut
  carve(b, 28, 42, 7, 4);                // Benjy Lusk's sealed crosscut
  crawl(b, 7, 16, 11, 1);                // a crawlway from the west drift into the Tally Chamber (he can't follow)
  flood(b, 10, 38, 11, 3);               // the bottom drift, flooded
  rail(b, [[8, 4], [49, 4]]); rail(b, [[5, 39], [52, 39]]); rail(b, [[29, 13], [29, 30]]);
  alcoves(b, [[15, 2], [25, 2], [38, 2], [10, 41], [20, 41], [44, 41], [54, 16], [54, 26], [54, 34], [3, 12], [3, 30], [20, 11], [40, 11], [20, 32], [40, 32]]);
  posts(b, 2, 12, 48, 5); posts(b, 41, 6, 52, 5);
  put(b, 9, 3, O.SEEP); put(b, 8, 6, O.CARBIDE); put(b, 40, 40, O.SEEP); put(b, 47, 2, O.TIMBER_RACK); put(b, 19, 30, O.TIMBER_RACK);
  put(b, 26, 12, O.CHALK, 'THE FOREMAN\'S TALLY. Floor to roof, the rib is covered in chalk strokes, thousands of them, in sets of five. The newest ones are fresh. They are still being made.');
  put(b, 40, 12, O.BUCKET, 'A foreman\'s dinner bucket, nickel-plated, too good for down here. Inside: a gold watch stopped at 2:14, and a company bonus slip for $144.00.');
  put(b, 24, 22, O.ORE_CART, 'A coal car heaped with lumps of slag, each one shaped a little like a fist.');
  put(b, 35, 22, O.ORE_CART, 'A coal car full of brass checks, hundreds of them, from every year the mine ran. None of the numbers you are looking for. He collects them.');
  const pages: Array<[number, Pt]> = [[7, [56, 10]], [8, [33, 24]], [9, [33, 45]]];
  for (const [n, [x, y]] of pages) { put(b, x, y, O.LEDGER_PAGE); b.meta.set(b.i(x, y), `page:${n}`); }
  return level(b, L3, [{ x: 2, y: 4, w: 1, h: 1, to: 'MINE_L2', tx: 53, ty: 44, dir: 'up', closedMsg: '' }]);
}

export function buildMineL4(): MapDef {
  const b = cave(48, 36);
  carve(b, 2, 2, 8, 5);                  // the landing
  carve(b, 10, 4, 6, 3);                 // the old drift
  carve(b, 15, 6, 3, 7);                 // and down into the cavern
  // The cavern: an open chamber in the slate, and the black lake in the middle of it.
  for (let y = 1; y < 35; y++) for (let x = 1; x < 47; x++) {
    const e = ((x - 29) / 16) ** 2 + ((y - 19) / 13) ** 2;
    if (e <= 1) b.setG(x, y, T.COAL_FLOOR);
    const lake = ((x - 31) / 10) ** 2 + ((y - 21) / 6.5) ** 2;
    if (lake <= 1) b.setG(x, y, T.WATER);
  }
  for (const [x, y] of [[17, 12], [40, 9], [43, 26], [20, 29], [26, 10]] as Pt[]) b.setG(x, y, T.GOB);
  for (const [x, y] of [[16, 16], [19, 26], [24, 30], [36, 30], [42, 22], [41, 12], [33, 8], [22, 13], [13, 5], [7, 6]] as Pt[]) if (b.g(x, y) === T.COAL_FLOOR) put(b, x, y, O.GLOW_FUNGUS);
  put(b, 15, 4, O.CHALK, 'Chalk on the slate, so old it has gone into the stone: "1888. NO. 1 DRIFT. WATER HIGH. -- O.P." Beside it someone has drawn a fish with no eyes.');
  put(b, 8, 2, O.SEEP);
  put(b, 24, 9, O.BUCKET, 'A rusted lard pail with a wire bail. Inside, a fishing line wound on a stick, and a hook made from a bent horseshoe nail. Somebody fished this lake on their dinner break, a hundred years ago.');
  return level(b, L4, []);
}

/* ------------------------------------------------------------------ */
/* Save state                                                          */
/* ------------------------------------------------------------------ */

/** A tag absent from `tags` is still down in the dark ("IN" on the board). */
export type TagState = 'carried' | 'dropped' | 'out';

export interface MineSave {
  /** Geared up from the Lamp House locker (headlamp, canary, sounding bar, safety lamp). */
  kit: boolean;
  /** Carbide left in the headlamp, 0-100. */
  fuel: number;
  /** Shutter hood closed. */
  shut: boolean;
  tags: Partial<Record<MinerId, TagState>>;
  /** Tags you dropped when you passed out, where they fell. */
  dropped: Array<{ id: MinerId; map: MapId; x: number; y: number }>;
  /** Ledger pages found, and the ones Walter has read to you. */
  pages: number[];
  translated: number[];
  /** Master cribs wired (indices into Level 3's `cribs`). */
  wired: number[];
  /** The Deep Seam is closed for good. */
  sealed: boolean;
  /** "MAP:x,y" keys: keystones you've sounded out, kettle-bottoms already down. */
  keystones: string[];
  kettles: string[];
  /** Once-a-day supply markers ("MAP:x,y" -> day). */
  stock: Record<string, number>;
  /** How often you've hidden in each alcove while he was looking ("MAP:x,y" -> times). He learns. */
  alcoves: Record<string, number>;
  /** Your canary: its name (once you've named it) and the last day it was fed. */
  canary: { name: string; fed: number };
  /** Miner's Almanac entries you've come across. */
  seen: string[];
  /** Miners Clara has read out on the radio. */
  aired: MinerId[];
}

export function freshMine(): MineSave {
  return { kit: false, fuel: 100, shut: false, tags: {}, dropped: [], pages: [], translated: [], wired: [], sealed: false, keystones: [], kettles: [], stock: {}, alcoves: {}, canary: { name: '', fed: 0 }, seen: [], aired: [] };
}

export function loadMine(d: Partial<MineSave> | undefined): MineSave {
  const m = freshMine();
  if (!d) return m;
  const ids = new Set<string>(MINERS.map((x) => x.id));
  m.kit = !!d.kit;
  m.fuel = Math.max(0, Math.min(100, Number(d.fuel ?? 100)));
  m.shut = !!d.shut;
  for (const [k, v] of Object.entries(d.tags ?? {})) if (ids.has(k) && (v === 'carried' || v === 'dropped' || v === 'out')) m.tags[k as MinerId] = v;
  m.dropped = (d.dropped ?? []).filter((x) => ids.has(x.id) && MINE_MAPS.has(x.map) && m.tags[x.id] === 'dropped');
  // A tag marked dropped with nowhere to be found goes back to its puzzle's level, by the lift.
  for (const mm of MINERS) if (m.tags[mm.id] === 'dropped' && !m.dropped.some((x) => x.id === mm.id)) {
    const L = MINE_LEVELS[mm.level];
    m.dropped.push({ id: mm.id, map: mm.level, x: L.lift[0] + 1, y: L.lift[1] + 1 });
  }
  m.pages = (d.pages ?? []).filter((n) => LEDGER.some((p) => p.id === n));
  m.translated = (d.translated ?? []).filter((n) => m.pages.includes(n));
  m.wired = (d.wired ?? []).filter((n) => n >= 0 && n < 4);
  m.sealed = !!d.sealed;
  m.keystones = [...(d.keystones ?? [])];
  m.kettles = [...(d.kettles ?? [])];
  m.stock = { ...(d.stock ?? {}) };
  m.alcoves = { ...(d.alcoves ?? {}) };
  m.canary = { name: typeof d.canary?.name === 'string' ? d.canary.name : '', fed: Number(d.canary?.fed ?? 0) || 0 };
  m.seen = (d.seen ?? []).filter((k) => k in ALMANAC);
  m.aired = (d.aired ?? []).filter((k) => ids.has(k));
  return m;
}
