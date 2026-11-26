/**
 * Where the townsfolk live: the homes behind the town's front doors (and the
 * rooms up the stairs over the store and diner), who lives in each, where they
 * sit of an evening and sleep at night, and the furnished interiors themselves.
 *
 * Every object in a home has a line of its own (in `signs`), so poking around
 * someone's house tells you about them. You're invited in once you reach 4
 * hearts with someone who lives there, while they're home and awake.
 */
import { T, O } from './tiles';
import { Builder } from './mapgen';
import type { MapDef, MapId } from './mapgen';
import { P } from '../graphics/palette';
import { shell, wrap } from './town';
import type { FriendId } from './friends';
import type { Dir } from '../util';

export type HomeId = 'HOUSE_VANCE' | 'HOUSE_FINCH' | 'HOUSE_MILLER' | 'HOUSE_CALLOWAY' | 'HOUSE_RUTH' | 'STORE_LOFT' | 'DINER_ROOM';

export interface HomeDef {
  id: HomeId;
  name: string;
  /** Townsfolk (NPC ids) who live here. */
  residents: string[];
  /** Friendship with any of these at 4 hearts gets you invited in. */
  friends: FriendId[];
  /** Heard through the door when you're not close enough yet. */
  knock: string;
  /** The first time you're welcomed in. */
  welcome: string[];
}

export const HOMES: Record<HomeId, HomeDef> = {
  HOUSE_VANCE: {
    id: 'HOUSE_VANCE', name: "Agnes Vance's Cottage", residents: ['agnes', 'vance'], friends: ['agnes'],
    knock: 'Agnes opens the door a crack. "Oh! Not today, dear, I\'m in my slippers. Find me at the Society."',
    welcome: ['Agnes: "Come in, come in. Shoes on is fine, I\'m not a monster. Tea\'s on the stove."', 'Agnes: "Mind Percival. He thinks every lap is his."'],
  },
  HOUSE_FINCH: {
    id: 'HOUSE_FINCH', name: "Barney Finch's House", residents: ['barnaby', 'buster'], friends: ['barnaby'],
    knock: 'Buster bays behind the door. Barney calls out: "Station\'s open seven to six, friend! I\'m off the clock!"',
    welcome: ['Barney: "Well, I\'ll be. Come in. Watch the track -- the 4:15 runs right through the parlor."', 'Buster flops at your feet like you\'ve lived here for years.'],
  },
  HOUSE_MILLER: {
    id: 'HOUSE_MILLER', name: 'The Miller-Thorne House', residents: ['mabel', 'gideon'], friends: ['mabel', 'gideon'],
    knock: 'Through the door: Mabel laughing, Gideon grumbling about a hinge. Nobody hears you knock.',
    welcome: ['Mabel: "Well, look who it is! Sit, sit. You\'re eating something before you leave this house."', 'Gideon nods at you from the corner. From Gideon, that\'s a parade.'],
  },
  HOUSE_CALLOWAY: {
    id: 'HOUSE_CALLOWAY', name: 'The Calloway House', residents: ['pippa'], friends: ['pippa'],
    knock: 'Pippa shouts through the mail slot: "PASSWORD?" ...You don\'t know it. "Club members only! Sorry!"',
    welcome: ['Pippa: "You\'re here! Official Club HQ tour! Wipe your feet -- Mom and Dad work nights at the hospital in Elkins, so I\'m in charge of floors."'],
  },
  HOUSE_RUTH: {
    id: 'HOUSE_RUTH', name: "Ruth Haddix's House", residents: ['ruth', 'sam'], friends: ['sam'],
    knock: 'Ruth calls from inside, kindly: "Bless you for stopping, honey, but I\'m not decent. Come back another time."',
    welcome: ['Ruth: "Samuel talks about you every night at supper. Every. Night. Come sit by the fire."', 'Sam goes very red and pretends to look for something.'],
  },
  STORE_LOFT: {
    id: 'STORE_LOFT', name: "Toby's Loft", residents: ['toby'], friends: ['toby'],
    knock: 'Toby\'s voice from up the stairs: "Uh, it\'s -- really messy up here. Like, really. Maybe another day?"',
    welcome: ['Toby: "Oh! Hey! Welcome to the loft. Gideon lets me stay up here. Don\'t step on the -- yeah, that\'s a hinge. Sorry."'],
  },
  DINER_ROOM: {
    id: 'DINER_ROOM', name: "Dr. Okafor's Room", residents: ['clara'], friends: ['clara'],
    knock: 'A sign on the door at the top of the stairs: "ON AIR -- DO NOT KNOCK -- (unless it\'s Mothman)."',
    welcome: ['Clara: "Welcome to the auxiliary studio! It\'s also my bedroom. And my office. Mabel gives me a deal on rent if I plug the pie on air."'],
  },
};

export const HOME_IDS = Object.keys(HOMES) as HomeId[];
export const isHome = (id: MapId): id is HomeId => id in HOMES;

/** Where each townsperson spends evenings at home and where they sleep. */
export interface HomeSpot { map: HomeId; sit: [number, number, Dir]; bedSide: [number, number]; bed: [number, number]; morning?: [number, number, Dir] }

export const HOME_SPOTS: Record<string, HomeSpot> = {
  agnes: { map: 'HOUSE_VANCE', sit: [6, 7, 'up'], bedSide: [2, 8], bed: [1, 8], morning: [4, 4, 'up'] },
  vance: { map: 'HOUSE_VANCE', sit: [8, 7, 'up'], bedSide: [13, 8], bed: [14, 8], morning: [12, 4, 'up'] },
  barnaby: { map: 'HOUSE_FINCH', sit: [3, 7, 'left'], bedSide: [13, 8], bed: [14, 8], morning: [6, 6, 'up'] },
  buster: { map: 'HOUSE_FINCH', sit: [5, 8, 'left'], bedSide: [12, 8], bed: [12, 8] },
  mabel: { map: 'HOUSE_MILLER', sit: [3, 7, 'up'], bedSide: [2, 9], bed: [1, 9], morning: [2, 4, 'up'] },
  gideon: { map: 'HOUSE_MILLER', sit: [9, 7, 'up'], bedSide: [15, 9], bed: [16, 9], morning: [14, 4, 'right'] },
  pippa: { map: 'HOUSE_CALLOWAY', sit: [11, 6, 'up'], bedSide: [13, 9], bed: [14, 9], morning: [4, 7, 'up'] },
  ruth: { map: 'HOUSE_RUTH', sit: [4, 6, 'left'], bedSide: [2, 9], bed: [1, 9], morning: [13, 4, 'up'] },
  sam: { map: 'HOUSE_RUTH', sit: [11, 7, 'up'], bedSide: [13, 9], bed: [14, 9], morning: [12, 7, 'up'] },
  toby: { map: 'STORE_LOFT', sit: [5, 5, 'up'], bedSide: [9, 6], bed: [10, 6], morning: [7, 4, 'up'] },
  clara: { map: 'DINER_ROOM', sit: [4, 4, 'up'], bedSide: [9, 6], bed: [10, 6], morning: [7, 5, 'up'] },
};

/* ------------------------------------------------------------------ */
/* Interiors                                                           */
/* ------------------------------------------------------------------ */

/** Furnish with a line of description. */
function put(b: Builder, x: number, y: number, o: number, text: string, fw = 1, fh = 1, tag?: string): void {
  if (fw > 1 || fh > 1) b.place(x, y, o, fw, fh); else b.setO(x, y, o);
  const ax = x, ay = y + fh - 1;
  b.signs.set(b.i(ax, ay), text);
  if (tag) b.meta.set(b.i(ax, ay), tag);
}

function frame(b: Builder, x: number, kind: string, text: string): void { put(b, x, 1, O.WALL_FRAME, text, 1, 1, kind); }

function house(b: Builder, id: HomeId, doorX: number, back: [number, number]): MapDef {
  return wrap(b, id, HOMES[id].name, {
    indoor: true, home: true, battleColors: [P.AMBER, P.RUST],
    portals: [{ x: doorX, y: b.h - 1, w: 1, h: 1, to: 'PINE_HOLLOW_TOWN', tx: back[0], ty: back[1], dir: 'down', closedMsg: '' }],
  });
}

/** A room up a flight of stairs (no front door). */
function upstairs(W: number, H: number): Builder {
  const b = shell(W, H, T.FLOOR, 6);
  b.setG(6, H - 2, T.FLOOR); b.setG(6, H - 1, T.WALL_SIDE);
  b.setG(1, H - 2, T.STAIRS);
  return b;
}

export function buildVance(): MapDef {
  const b = shell(16, 11, T.FLOOR, 8);
  b.rectG(5, 5, 6, 3, T.RUG);
  for (const x of [1, 2, 3]) put(b, x, 3, O.BOOKSHELF, ['Leather ledgers labeled "SIGHTINGS 1889-1923", "1924-1961", "1962-". The last one is still being filled in.', 'Folklore, county histories, and one very worn copy of "Pride and Prejudice" with a pressed rhododendron in it.', 'A shelf of nothing but bird guides. Agnes has written corrections in every one.'][x - 1]);
  put(b, 7, 3, O.FIREPLACE, 'A low fire. Above the mantel, a framed survey map of the valley drawn by her grandfather in 1902.', 2, 1);
  put(b, 12, 3, O.CASE, 'Agnes\'s private case: a child\'s drawing of a two-legged white figure, labeled "NITECRAWLR -- by Agnes, age 7."');
  put(b, 14, 3, O.PLANT, 'An African violet in a teacup. Thriving, somehow.');
  put(b, 7, 6, O.TABLE, 'Two teacups. One is always set for Elias -- even before he came home.');
  put(b, 5, 6, O.CHAIR, 'Agnes\'s reading chair, with a crocheted cushion in moth-wing colors.');
  put(b, 9, 6, O.CHAIR, 'A straight-backed chair nobody sits in except company. Sit up straight.');
  put(b, 1, 7, O.BED, 'Agnes\'s bed, made with hospital corners. A field guide on the nightstand, bookmarked at "Moths of the Alleghenies."', 1, 2);
  put(b, 14, 7, O.BED, 'Elias\'s old room, kept ready for years. The quilt is the one their mother made from his ranger shirts.', 1, 2);
  put(b, 3, 9, O.CAT, 'Percival, a very large, very orange cat. He regards you as a minor historical curiosity.');
  frame(b, 5, 'photo', 'A photograph: two kids on the fire tower steps, 1961. The girl is holding a notebook. The boy is pointing at the sky.');
  frame(b, 11, 'clock', 'A mantel clock that runs exactly four minutes fast. "So I\'m never late," says Agnes. She is never late.');
  return house(b, 'HOUSE_VANCE', 8, [14, 47]);
}

export function buildFinch(): MapDef {
  const b = shell(16, 11, T.FLOOR, 8);
  b.rectG(3, 7, 5, 3, T.RUG);
  put(b, 1, 3, O.SIGNAL_LANTERN, 'The signal lantern from the old Cass junction, rewired as a reading lamp. It still clicks red-green when Barney is thinking.');
  put(b, 5, 5, O.MODEL_TRAIN, 'An HO-scale model of the Pine Hollow branch, accurate down to the water tower. A tiny Barney waves from the platform. A tiny Buster too.', 2, 1);
  put(b, 12, 3, O.SHELF, 'Coffee cans of rail spikes, sorted by railroad: C&O, B&O, Western Maryland, and one labeled "???".');
  put(b, 13, 3, O.STOVE, 'A potbelly stove with a dented percolator. The coffee could strip paint, and has.');
  put(b, 9, 3, O.PLANT, 'A spider plant in a lantern globe. Barney named it "Engine Nine."');
  put(b, 12, 6, O.TABLE, 'A stack of old timetables and a half-done crossword. 7-across: "Mothman\'s town" (11). He wrote "PTPLEASANT" in pen.');
  put(b, 11, 6, O.CHAIR, 'A kitchen chair, one leg shimmed with a folded 1979 schedule.');
  put(b, 13, 6, O.CHAIR, 'Buster\'s chair. Do not sit in Buster\'s chair.');
  put(b, 2, 7, O.ROCKER, 'Barney\'s rocker. Worn smooth where his hands go.');
  put(b, 14, 7, O.BED, 'A narrow bed with an army blanket, made tight enough to bounce a quarter.', 1, 2);
  frame(b, 4, 'map', 'A framed C&O system map, 1952. Barney has drawn the Pine Hollow branch in red pencil, a little thicker than the main line.');
  frame(b, 11, 'rods', 'Two fishing rods on pegs, and a hand-lettered sign: "GONE FISHIN\' (SUNDAYS)."');
  return house(b, 'HOUSE_FINCH', 8, [26, 49]);
}

export function buildMiller(): MapDef {
  const b = shell(18, 11, T.FLOOR, 9);
  b.rectG(7, 5, 5, 3, T.RUG);
  put(b, 1, 3, O.STOVE, 'Mabel\'s home stove. Smaller than the diner\'s, but this is where she tests the pie recipes. There\'s always one cooling.');
  for (const x of [2, 3, 4]) put(b, x, 3, O.COUNTER, ['A crock of buckwheat batter "feeding" for tomorrow.', 'Canning jars: chow-chow, apple butter, and something red labeled "DO NOT (Gideon)."', 'A recipe box. The card for pepperoni rolls is stained beyond reading. She doesn\'t need it.'][x - 2]);
  put(b, 5, 3, O.SHELF, 'Pie tins, stacked to the ceiling. Blue ribbons from forty-one Folklore Festivals tacked along the edge.');
  put(b, 9, 3, O.FIREPLACE, 'A stone fireplace Gideon rebuilt after the flood. Every stone is level. Every single one.', 2, 1);
  put(b, 12, 3, O.PLANT, 'A pot of rosemary the size of a small dog.');
  put(b, 15, 3, O.ANVIL, 'Gideon\'s house anvil, for "small jobs." There is no such thing as a small job, according to Gideon.');
  put(b, 16, 3, O.CRATE, 'A crate of hand-forged hooks, trivets and door hinges. Half the town\'s doors hang on Gideon\'s hinges.');
  put(b, 3, 6, O.TABLE, 'A cranberry pie, cooling. Two forks already in it. Neither of them will admit to it.');
  put(b, 2, 6, O.CHAIR, 'Mabel\'s chair, with a cushion that says "KISS THE COOK (AND THEN GET OUT OF MY KITCHEN)."');
  put(b, 4, 6, O.CHAIR, 'Gideon\'s chair. Reinforced. Twice.');
  put(b, 1, 8, O.BED, 'Mabel\'s room: a patchwork quilt and a stack of seed catalogs.', 1, 2);
  put(b, 16, 8, O.BED, 'Gideon\'s cot, by the window. A miner\'s brass check tag hangs on a nail above it.', 1, 2);
  frame(b, 7, 'sampler', 'A cross-stitch sampler: "BLESS THIS HOLLER. WIPE YOUR FEET."');
  frame(b, 13, 'photo', 'A flood photo, 1985: the diner up to its windows in water, Mabel on the roof holding a pie. Gideon is rowing toward her.');
  return house(b, 'HOUSE_MILLER', 9, [40, 49]);
}

export function buildCalloway(): MapDef {
  const b = shell(16, 11, T.FLOOR, 8);
  b.rectG(9, 6, 5, 2, T.RUG);
  put(b, 1, 3, O.STOVE, 'A stove with a note taped on: "PIPPA -- soup in the fridge, heat it on 4, NOT 9. Love, Mom."');
  put(b, 2, 3, O.SHELF, 'Cereal boxes, a cookie jar shaped like a Sasquatch, and a shoebox labeled "EVIDENCE."');
  put(b, 6, 3, O.PLANT, 'A bean plant in a cup. A label says "Experiment 4: Does Bigfoot Like Beans?" The data is inconclusive.');
  put(b, 4, 6, O.TABLE, 'Homework, half-done. The margins are full of very good drawings of the Hoop Snake.');
  put(b, 3, 6, O.CHAIR, 'A kitchen chair with a booster cushion Pippa insists she does not need.');
  put(b, 5, 6, O.CHAIR, 'Dad\'s chair. A hospital ID badge on a lanyard hangs off the back: "R. CALLOWAY, R.N. -- NIGHTS."');
  put(b, 1, 8, O.BED, 'Mr. and Mrs. Calloway\'s bed, neatly made. They sleep days, between shifts.', 1, 2);
  put(b, 13, 3, O.BOOKSHELF, 'Field guides, comics, and "The Junior Cryptid Club Official Handbook," handwritten, 3 pages. Page 3 is just the secret handshake, drawn as diagrams.');
  put(b, 14, 8, O.BED, 'Pippa\'s bed: glow-in-the-dark stars on the ceiling above it, arranged as the Mothman constellation (she made it up).', 1, 2);
  put(b, 11, 9, O.CRATE, 'JUNIOR CRYPTID CLUB HQ. Contents: two flashlights, a jar of "Jackalope fur" (dryer lint), and a membership roster with your name on it.');
  frame(b, 10, 'drawing', 'A crayon drawing of you, the Ranger, shaking hands with a Wampus Cat. All six of its legs are waving.');
  frame(b, 12, 'poster', 'A poster: "THE TRUTH IS OUT THERE (IN WEST VIRGINIA)."');
  frame(b, 4, 'photo', 'A school photo of Pippa with her red cap on. She was asked to take it off. She did not.');
  return house(b, 'HOUSE_CALLOWAY', 8, [51, 47]);
}

export function buildRuth(): MapDef {
  const b = shell(16, 11, T.FLOOR, 8);
  b.rectG(4, 5, 6, 3, T.RUG);
  put(b, 3, 5, O.ROCKER, 'Ruth\'s rocker, with a basket of yarn. Half a sweater in Club green. You suspect it\'s for Sam. You suspect correctly.');
  put(b, 6, 3, O.FIREPLACE, 'A fire with a pot of soup beans on the crane. It has been simmering since 1974, more or less.', 2, 1);
  put(b, 13, 3, O.STOVE, 'A wood cookstove. A pan of pawpaw bread on the warming shelf smells like heaven and bananas.');
  put(b, 14, 3, O.SHELF, 'Preserves: blackberry, ramp pickles, apple butter, and a jar of "chicken money" with forty-one dollars in it.');
  put(b, 12, 6, O.TABLE, 'An egg basket, today\'s haul. One egg is very small. Ruth has named the hen responsible "Pip."');
  put(b, 11, 6, O.CHAIR, 'Sam\'s chair, with a sketch pad left on the seat. He\'s been drawing the chickens with cryptid features.');
  put(b, 13, 6, O.CHAIR, 'Ruth\'s chair at the table. The cushion is a flour sack that says "PRIDE OF THE ALLEGHENIES."');
  put(b, 1, 8, O.BED, 'Ruth\'s bed, under a wedding-ring quilt. A photo on the nightstand: a young miner in a hardhat, grinning.', 1, 2);
  put(b, 14, 8, O.BED, 'Sam\'s bed. Under it: the famous shoebox of Glow-Shrooms. Mom doesn\'t know. Grandma absolutely knows.', 1, 2);
  put(b, 12, 9, O.PLANT, 'The Glow-Shroom shoebox, pulled out a little from under the bed. It hums with a faint green light.');
  frame(b, 3, 'quilt', 'A framed quilt square in the Bear\'s Paw pattern. "My mother\'s," says Ruth. "She said the bears in these hills had better manners back then."');
  frame(b, 11, 'photo', 'A photo of the Pine Hollow No. 3 crew, 1958. Ruth points at one face without saying anything. Sam has his ears.');
  return house(b, 'HOUSE_RUTH', 8, [33, 56]);
}

export function buildLoft(): MapDef {
  const b = upstairs(12, 8);
  put(b, 10, 5, O.BED, 'A cot with an army surplus blanket and one very flat pillow. Toby says he sleeps great. Toby is nineteen.', 1, 2);
  put(b, 10, 3, O.CRATE, 'Toby\'s toolbox. Every tool is labeled "TOBY" in nail-scratched letters, including the ones that are definitely Gideon\'s.');
  put(b, 5, 4, O.TABLE, 'A workbench with a half-finished hinge and a drawing of a much better hinge.');
  put(b, 4, 4, O.CHAIR, 'An upturned bucket. It\'s a chair if you believe in it.');
  put(b, 2, 3, O.PLANT, 'A cutting from Mabel\'s rosemary, in a coffee can. Toby waters it every morning like it might leave.');
  frame(b, 5, 'drawing', 'A sketch of an anvil, signed "G.T." in the corner. It\'s the first thing Gideon ever gave him.');
  frame(b, 8, 'window', 'A little round window over the storefront. You can see the whole Main Street from up here.');
  return wrap(b, 'STORE_LOFT', HOMES.STORE_LOFT.name, {
    indoor: true, home: true, battleColors: [P.AMBER, P.RUST],
    portals: [{ x: 1, y: 6, w: 1, h: 1, to: 'STORE_INT', tx: 17, ty: 11, dir: 'left', closedMsg: '' }],
  });
}

export function buildDinerRoom(): MapDef {
  const b = upstairs(12, 8);
  put(b, 4, 3, O.RADIO_RIG, 'The auxiliary studio: a ham rig, a reel-to-reel, and a microphone wrapped in a sock "for warmth." A sticky note: "WKPB -- 3 AM Call-In -- Mothman Monday."', 2, 1);
  put(b, 3, 4, O.CHAIR, 'A swivel chair, mended with duct tape in a pattern that might be deliberate.');
  for (const x of [7, 8]) put(b, x, 3, O.BOOKSHELF, ['Ethnography texts, Appalachian folklore, and a binder: "CALLER LOG -- UNEXPLAINED -- VOL. 9."', 'A shelf of cassette tapes, labeled by date and cryptid. One just says "THE GREEN MAN -- DO NOT PLAY AT NIGHT."'][x - 7]);
  put(b, 6, 5, O.TABLE, 'A map of the valley under glass, covered in colored pins. Red: sightings. Blue: calls. Yellow: "vibes."');
  put(b, 10, 5, O.BED, 'A bed piled with blankets. Headphones on the pillow. She falls asleep to static.', 1, 2);
  put(b, 10, 3, O.PLANT, 'A cactus named "Dr. Prickles, PhD." Clara swears it has opinions.');
  frame(b, 6, 'map', 'A framed map of the National Radio Quiet Zone, with Pine Hollow circled and "WHY IS IT SO LOUD HERE?" written beside it.');
  frame(b, 9, 'photo', 'Clara\'s doctoral graduation photo. She is wearing the cap, the gown, and the headphones.');
  return wrap(b, 'DINER_ROOM', HOMES.DINER_ROOM.name, {
    indoor: true, home: true, battleColors: [P.AMBER, P.RUST],
    portals: [{ x: 1, y: 6, w: 1, h: 1, to: 'DINER_INT', tx: 17, ty: 12, dir: 'left', closedMsg: '' }],
  });
}
