/**
 * Pine Hollow townsfolk: bodies, outfits, daily schedules, chatter and
 * rotating cryptid rumors. Schedules are functions of the clock, festival /
 * foggy-night state and quest progress, so NPCs re-route themselves daily.
 */
import type { MapId } from './mapgen';
import type { Dir } from '../util';
import { hash2 } from '../util';
import type { Body, Look } from '../graphics/playerSprite';
import { P } from '../graphics/palette';
import { CRYPTIDS, CryptidDef } from './cryptids';
import { ITEMS } from './items';
import { HOME_SPOTS } from './homes';

export type NpcId = 'agnes' | 'barnaby' | 'mabel' | 'gideon' | 'clara' | 'pippa' | 'sam' | 'toby' | 'buster' | 'ruth' | 'ezri' | 'pike' | 'vance';

export interface Stop {
  map: MapId;
  x: number;
  y: number;
  dir: Dir;
  /** Idle wander radius around the stop (0 = stand still). */
  wander?: number;
  /** Asleep: walks to (x, y) beside the bed, then climbs into the bed tile. */
  sleep?: boolean;
  bed?: [number, number];
  /** What they're up to here (picks situational lines and little effects). */
  tag?: string;
}

export interface ScheduleCtx {
  minutes: number;
  weekday: string;
  festival: boolean;
  foggyNight: boolean;
  /** Raining or storming right now. */
  wet: boolean;
  questStage: (id: string) => number;
  questDone: (id: string) => boolean;
  /** Campaign finale complete (Elias Vance has come home). */
  campaignDone: boolean;
}

export interface NpcDef {
  id: NpcId;
  name: string;
  title: string;
  kind: 'person' | 'dog';
  body: Body;
  look: Look;
  where: (c: ScheduleCtx) => Stop | null;
  greet: string[];
  chat: string[];
  /** Phrase template for rumors; {c} cryptid, {place}, {time}, {lure}. */
  rumor: string;
  /** Greetings for particular situations, by stop tag ('home', 'bench', 'fishing'...) or 'rain'. */
  lines?: Partial<Record<string, string[]>>;
}

const body = (id: string, skin: number, skinSh: number, hair: number, hairSh: number, pants: number, hairStyle: Body['hairStyle']): Body => ({
  id, skin, skinSh, hair, hairSh, pants, pantsSh: P.SHADOW, boot: P.SHADOW, hairStyle,
});

const between = (m: number, a: number, b: number) => m >= a && m < b;
const H = (h: number, min = 0) => h * 60 + min;

/** Evenings at home (sitting room). */
const homeSit = (id: string): Stop => { const h = HOME_SPOTS[id]; return { map: h.map, x: h.sit[0], y: h.sit[1], dir: h.sit[2], wander: 1, tag: 'home' }; };
/** First thing in the morning, pottering around home. */
const homeAm = (id: string): Stop => { const h = HOME_SPOTS[id]; const [x, y, dir] = h.morning ?? h.sit; return { map: h.map, x, y, dir, wander: 1, tag: 'home' }; };
/** Tucked into bed. */
const asleep = (id: string): Stop => { const h = HOME_SPOTS[id]; return { map: h.map, x: h.bedSide[0], y: h.bedSide[1], dir: 'up', sleep: true, bed: h.bed }; };
const at = (map: MapId, x: number, y: number, dir: Dir, wander = 0, tag?: string): Stop => ({ map, x, y, dir, wander, tag });
const town = (x: number, y: number, dir: Dir, wander = 0, tag?: string) => at('PINE_HOLLOW_TOWN', x, y, dir, wander, tag);
const diner = (x: number, y: number, dir: Dir, tag = 'diner') => at('DINER_INT', x, y, dir, 0, tag);
/** Sunday breakfast at the Whistle-Stop, 8 to 11: most of the town turns up. */
const sundayBreakfast = (c: ScheduleCtx) => c.weekday === 'Sun' && between(c.minutes, H(8), H(11));

/** Festival-night gathering spots in the Town Square. */
const FEST: Record<string, Stop> = {
  agnes: { map: 'PINE_HOLLOW_TOWN', x: 34, y: 29, dir: 'right' },
  barnaby: { map: 'PINE_HOLLOW_TOWN', x: 42, y: 29, dir: 'left' },
  mabel: { map: 'PINE_HOLLOW_TOWN', x: 35, y: 31, dir: 'right' },
  gideon: { map: 'PINE_HOLLOW_TOWN', x: 41, y: 31, dir: 'left' },
  clara: { map: 'PINE_HOLLOW_TOWN', x: 39, y: 26, dir: 'down' },
  pippa: { map: 'PINE_HOLLOW_TOWN', x: 36, y: 34, dir: 'up', wander: 2 },
  sam: { map: 'PINE_HOLLOW_TOWN', x: 40, y: 34, dir: 'up', wander: 2 },
};

/** The Junior Cryptid Club's day: town in the morning, the orchard after lunch, home by dark (with rain, Sunday and Saturday versions). */
function kidDay(c: ScheduleCtx, id: 'pippa' | 'sam', k: number): Stop {
  const m = c.minutes, o = k * 15;
  if (c.festival && m >= H(18)) return FEST[id];
  if (m < H(7, 30 + o)) return asleep(id);
  if (sundayBreakfast(c)) return diner(7 + k * 4, 8, 'up', 'sunday');
  if (m < H(8, 15 + o)) return homeAm(id);
  // Saturday mornings: Club field trip to the Ranger's cabin.
  if (c.weekday === 'Sat' && between(m, H(9), H(12)) && !c.wet) return at('CABIN_YARD', 25 + k, 21, 'down', 1, 'visit');
  if (m < H(12)) return c.wet ? at('MUSEUM_INT', 10 + k * 5, 10, 'up', 1, 'museum') : town(35 + k * 3, 32 + k, 'down', 3);
  if (m < H(17)) return c.wet ? homeSit(id) : at('PINE_TRAIL_AND_ORCHARD', 62 + k * 2, 24 + k, k ? 'left' : 'down', 2, 'orchard');
  if (m < H(19)) return c.wet ? diner(7 + k * 4, 8, 'up', 'rain') : town(36 + k, 33 + k, 'down', 2);
  if (m < H(20, 30 + o)) return homeSit(id);
  return asleep(id);
}

export const NPCS: readonly NpcDef[] = [
  {
    id: 'agnes', name: 'Agnes Vance', title: 'Curator', kind: 'person',
    body: body('agnes', P.LANTERN, P.AMBER, P.FOG, P.MOON, P.CRAN, 'bun'),
    look: { outfit: 'npc_cardigan', hat: 'none' },
    where: (c) => {
      const m = c.minutes;
      if (c.festival && m >= H(18)) return FEST.agnes;
      if (m < H(7)) return asleep('agnes');
      if (sundayBreakfast(c)) return diner(14, 8, 'right', 'sunday');
      if (m < H(8) || (c.weekday === 'Sun' && m < H(12))) return homeAm('agnes');
      if (between(m, H(12), H(12, 45)) && !c.wet) return town(33, 30, 'left', 0, 'bench');
      if (m < H(17)) return at('MUSEUM_INT', 13, 14, 'down', 0, 'work');
      if (m < H(20)) return diner(14, 8, 'right');
      if (m < H(22)) return homeSit('agnes');
      return asleep('agnes');
    },
    lines: {
      home: ['Make yourself at home, dear. Percival will make himself at home on you.', 'I do my best thinking in this chair. My best napping, too.'],
      bench: ['Lunch in the square. Pimento cheese, and the best people-watching in the county.', 'Sit, dear. The pigeons here are the only creatures in town who don\'t want me to catalogue them.'],
      sunday: ['Sunday breakfast is sacred. So is Mabel\'s sausage gravy.', 'I open late on Sundays. Even history needs a lie-in.'],
      rain: ['Rain\'s good for the museum. Nobody minds old bones when it\'s pouring.', 'Wipe your feet, dear. The marble remembers everything.'],
    },
    greet: ['Ah, our Ranger! Mind the glass.', 'Good day. Any specimens for the collection?', 'History is just folklore with paperwork, dear.'],
    chat: [
      'The Society was founded in 1889, after the first Jersey Devil panic. We have been cataloguing ever since.',
      'Every specimen you donate fills a case. Fill enough of them and the town council finally listens to me.',
      'My grandmother swore the Fresno Nightcrawlers walked right past her porch. Two legs, no arms, all elegance.',
      'The Archive Basement holds survey maps older than the railroad. I only open it for proven researchers.',
      'Mabel thinks I spend too much time with dead things. I think the dead things are better listeners.',
    ],
    rumor: 'Agnes taps an old ledger: "The {c} was recorded {time} near {place}. Records say it favored {lure}."',
  },
  {
    id: 'barnaby', name: 'Barnaby "Barney" Finch', title: 'Retired Stationmaster', kind: 'person',
    body: body('barnaby', P.LANTERN, P.AMBER, P.FOG, P.MOON, P.TWILIGHT, 'bald'),
    look: { outfit: 'npc_conductor', hat: 'npc_conductor_cap' },
    where: (c) => {
      const m = c.minutes;
      if (c.festival && m >= H(18)) return FEST.barnaby;
      if (m < H(6, 30)) return asleep('barnaby');
      if (sundayBreakfast(c)) return diner(5, 8, 'up', 'sunday');
      if (m < H(7)) return homeAm('barnaby');
      // Sunday afternoons he fishes your pond (with Gideon), weather permitting.
      if (c.weekday === 'Sun' && between(m, H(13), H(17)) && !c.wet) return at('CABIN_YARD', 34, 43, 'down', 0, 'fishing');
      if (m < H(18)) return c.wet && between(m, H(9), H(17)) ? diner(5, 8, 'up', 'rain') : town(67, 35, 'down', 1, 'station');
      if (m < H(21)) return diner(5, 8, 'up');
      if (m < H(22, 30)) return homeSit('barnaby');
      return asleep('barnaby');
    },
    lines: {
      home: ['Sit anywhere but Buster\'s chair. He\'ll know.', 'The 4:15 is running late tonight. It\'s always running late. It\'s a model.'],
      fishing: ['Hope you don\'t mind, Ranger. Best bluegill in the county\'s in your pond.', 'Shh. They can hear you thinking.', 'Gideon\'s caught two. I\'ve caught a cold.'],
      sunday: ['Sunday\'s the only day Mabel lets Buster in. He knows it, too.'],
      rain: ['Station roof leaks like a sieve. I\'ll read the paper here till it lets up.', 'Rain on the rails. Sounds like a train coming, if you close your eyes.'],
      station: ['Mornin\'. Track\'s still rusty, sky\'s still blue.'],
    },
    greet: ['Tickets? Ha! Habit. No trains since \'79.', 'Mornin\', Ranger. Track\'s still rusty.', 'This was a C&O branch line once. Coal out, mail in.', 'Hear that whistle? ...No. Me neither. Not anymore.'],
    chat: [
      'Forty-one years I ran this station. The last train out carried the mail, a piano, and something in a crate that growled.',
      'The Snarly Yow used to pace the platform at dusk. Never bothered the passengers. Only the dogs.',
      'If the town ever gets that Restoration Grant, I\'d have the old car rolling in a week.',
      'Buster\'s a good boy. Nose like a bloodhound, which, well, he is.',
      'The signal lantern still flickers some nights. Nobody\'s wired it in decades.',
    ],
    rumor: 'Barnaby lowers his voice: "Fellow on the last train saw the {c} {time}, out by {place}. Swore by {lure}."',
  },
  {
    id: 'mabel', name: 'Mabel Miller', title: 'Diner Cook', kind: 'person',
    body: body('mabel', P.AMBER, P.RUST, P.RUST, P.CRAN, P.TWILIGHT, 'bun'),
    look: { outfit: 'npc_diner_apron', hat: 'none' },
    where: (c) => {
      const m = c.minutes;
      if (c.festival && m >= H(18)) return FEST.mabel;
      if (m < H(6, 15)) return homeAm('mabel');
      if (between(m, H(14), H(14, 30)) && !c.wet) return town(22, 35, 'down', 0, 'break');
      if (m < H(21)) return at('DINER_INT', 7, 4, 'down', 2, sundayBreakfast(c) ? 'sunday' : 'work');
      if (m < H(22)) return homeSit('mabel');
      return asleep('mabel');
    },
    lines: {
      home: ['You\'re in my house now, hon, so you\'re eating. That\'s the rule.', 'Gideon fixed that hinge four times. It still squeaks. I think he likes the excuse.'],
      break: ['Five minutes off my feet and a sweet tea. Don\'t tell anybody you saw me sit down.', 'Best part of the day: the lunch rush is over and the supper rush ain\'t started.'],
      sunday: ['Sunday breakfast! Whole town in one room. Somebody\'s always crying, usually over the biscuits.', 'Grab a plate. Agnes took the last of the gravy, but I\'ve got more hid.'],
      rain: ['Rainy days bring \'em in for soup. Soup beans and cornbread, hon?'],
    },
    greet: ['Sit anywhere, hon. Coffee\'s hot.', 'Pepperoni rolls are fresh out the oven, y\'all.', 'You look starved. What\'ll it be?', 'Wipe your boots! ...Oh, it\'s you. Come in, come in.'],
    chat: [
      'My cranberry pie wins the Folklore Festival bake-off every year. Every. Year.',
      'Something keeps stealing apples from the grove at dusk. Little hairy thing. Agnes calls it an Albatwitch.',
      'Gideon and I have shared that house since the flood. He hammers, I bake. It works.',
      'Truckers used to stop here before the highway moved. Now it\'s just us, and whatever howls on the ridge.',
      'Eat something before you go chasing monsters. Nobody earns Trust on an empty stomach.',
    ],
    rumor: 'Mabel refills your mug: "Trucker swore he saw the {c} {time} near {place}. I told him, try {lure}."',
  },
  {
    id: 'gideon', name: 'Gideon Thorne', title: 'Blacksmith & Outfitter', kind: 'person',
    body: body('gideon', P.AMBER, P.RUST, P.SHADOW, P.VOID, P.SHADOW, 'beard'),
    look: { outfit: 'npc_smith_apron', hat: 'none' },
    where: (c) => {
      const m = c.minutes;
      const sun = c.weekday === 'Sun';
      if (c.festival && m >= H(18)) return FEST.gideon;
      if (m < H(6)) return asleep('gideon');
      if (sundayBreakfast(c)) return diner(9, 8, 'up', 'sunday');
      if (m < H(7, 45)) return homeAm('gideon');
      if (sun && between(m, H(13), H(17)) && !c.wet) return at('CABIN_YARD', 40, 43, 'down', 0, 'fishing');
      if (between(m, H(12), H(13))) return diner(9, 8, 'up', 'lunch');
      if (m < H(15) || (m < H(17) && (c.wet || sun))) return at('STORE_INT', 11, 4, 'down', 1, 'work');
      if (m < H(17)) return town(48, 31, 'up', 0, 'anvil');
      if (m < H(19)) return c.wet ? diner(9, 8, 'up') : town(55, 8, 'up', 0, 'mine');
      if (m < H(21)) return diner(9, 8, 'up');
      if (m < H(22)) return homeSit('gideon');
      return asleep('gideon');
    },
    lines: {
      home: ['House rules: shoes off, no talking about the mine, and Mabel\'s right about everything.', 'Sit. The chair\'s rated for a mule.'],
      anvil: ['Mind the sparks.', 'Store\'s stuffy. Steel likes fresh air. So do I.', 'Bring that blade here. ...Hm. You\'ve been using it. Good.'],
      mine: ['Come up here most evenings. Somebody ought to.', 'Nineteen years. You don\'t just walk away from a hole like that. It walks with you.'],
      fishing: ['Barney talks to the fish. I just catch them.', 'Store\'s closed Sunday afternoons. Even steel needs a day off.'],
      lunch: ['Lunch. Back at one. Store\'s not going anywhere.'],
      sunday: ['Mabel\'s biscuits. Only reason I come to church -- I mean breakfast.'],
    },
    greet: ['Steel\'s hot. What do you need?', 'Twenty years down the mine on pepperoni rolls. Best lunch there is.', 'Bring me nails and I\'ll bring you an edge.', 'Ranger.'],
    chat: [
      'I worked that coal mine nineteen years. Sealed it myself after the cave-in. Something down there hums.',
      'A Machete\'s only as good as the steel. Bring me Iron Nails and I\'ll make it sing.',
      'Bog Waders. Don\'t go into that marsh without them. Ask Toby.',
      'The Hopkinsville Goblins came up out of the mine the year it closed. Silver, like they were made of it.',
      'Mabel says I talk to the anvil more than people. The anvil doesn\'t argue.',
    ],
    rumor: 'Gideon wipes his hands: "Miners used to see the {c} {time}, round {place}. Old-timers left {lure} out for it."',
  },
  {
    id: 'clara', name: 'Dr. Clara Okafor', title: 'Folklorist & Radio Host', kind: 'person',
    body: body('clara', P.RUST, P.CRAN, P.VOID, P.SHADOW, P.TWILIGHT, 'long'),
    look: { outfit: 'npc_labcoat', hat: 'npc_headphones' },
    where: (c) => {
      const m = c.minutes;
      if (c.festival && m >= H(18)) return FEST.clara;
      // She broadcasts till the small hours, so mornings start late.
      if (m < H(8)) return asleep('clara');
      if (m < H(9)) return homeAm('clara');
      if (c.weekday === 'Mon' && m < H(12)) return at('MUSEUM_INT', 8, 12, 'up', 1, 'research');
      if (m < H(15)) return diner(14, 5, 'right', 'work');
      if (m < H(17)) return c.wet ? diner(14, 5, 'right', 'rain') : town(44, 27, 'left', 2);
      // Storms knock out the tower link, so she broadcasts from her room over the diner.
      if (c.wet) return m < H(23) ? homeSit('clara') : asleep('clara');
      return at('RADIO_RIDGE_AND_CROSSROADS', 19, 9, 'down', 1, 'tower');
    },
    lines: {
      home: ['You\'re on the air! ...Kidding. Mostly. Sit, sit.', 'Storm knocked the tower link out, so tonight\'s show is coming to you live from above the pie case.'],
      research: ['Monday mornings, Agnes lets me into the ledgers. 1889 to now. The patterns are... unsettling.', 'Shh. Agnes is a librarian at heart.'],
      tower: ['WKPB, broadcasting from the edge of the Quiet Zone. Which is to say: from the edge.'],
      rain: ['Rain\'s great for static. Not for my hair.'],
    },
    greet: ['This is WKPB, the voice of the hollers... oh, hello!', 'We broadcast from inside the Quiet Zone. Technically, we shouldn\'t exist.', 'I need evidence, Ranger. Real, peer-reviewable evidence.', 'Listeners called in three sightings last night!'],
    chat: [
      'I broadcast from the tower every night. You\'d be amazed who calls in at 3 AM.',
      'Folklore is data that nobody bothered to graph. I\'m graphing it.',
      'A Parabolic Dish would let us record their calls cleanly. Pike sells the plans on foggy nights.',
      'The man in the green suit at the Crossroads asked me for the time. I checked. My watch had stopped.',
      'My doctorate is in ethnography. My hobby is getting chased by things with too many teeth.',
    ],
    rumor: 'Clara checks her call log: "A listener reported the {c} {time} near {place}. Bait of choice: {lure}."',
  },
  {
    id: 'pippa', name: 'Pippa', title: 'Junior Cryptid Club', kind: 'person',
    body: body('pippa', P.LANTERN, P.AMBER, P.AMBER, P.RUST, P.TWILIGHT, 'pigtails'),
    look: { outfit: 'npc_kid_green', hat: 'npc_red_cap' },
    where: (c) => kidDay(c, 'pippa', 0),
    lines: {
      home: ['Welcome to Club HQ! Don\'t touch the evidence box. Okay, you can touch it a little.', 'Mom and Dad sleep days. I\'m VERY quiet. (She is not quiet.)'],
      visit: ['Field trip! The Club is inspecting your garden for cryptid activity!', 'Can we pet the chickens? You don\'t have chickens. Can you GET chickens?'],
      museum: ['Rainy day = museum day! Mrs. Vance says if we don\'t breathe on the glass we can stay ALL day.'],
      sunday: ['Pancakes! The Club runs on pancakes.'],
      rain: ['Rain means the Squonk is out crying somewhere. Poor Squonk.'],
    },
    greet: ['Junior Cryptid Club, Field Agent Pippa reporting!', 'Did you see one?! Did you?!', 'Sam says Bigfoot is real. I KNOW Bigfoot is real.'],
    chat: [
      'Our club has two members, a sketchbook, and a secret handshake. Want to learn it? ...It\'s secret.',
      'I drew the Hoop Snake once! It rolled right past me. Mom says it was a bike tire.',
      'When I grow up I\'m going to be a Ranger. Or a Mothman. Whichever has better hours.',
      'Mrs. Vance lets us look at the cases if we don\'t breathe on the glass.',
    ],
    rumor: 'Pippa whispers: "Club intel! The {c} comes out {time} near {place}. You need {lure}!"',
  },
  {
    id: 'sam', name: 'Sam', title: 'Junior Cryptid Club', kind: 'person',
    body: body('sam', P.RUST, P.CRAN, P.VOID, P.SHADOW, P.FOREST, 'short'),
    look: { outfit: 'npc_kid_amber', hat: 'npc_explorer' },
    where: (c) => kidDay(c, 'sam', 1),
    lines: {
      home: ['This is my room. That\'s my bed. The glowing box under it is... nothing. It\'s nothing.', 'Grandma says you can stay for supper. It\'s soup beans. It\'s always soup beans.'],
      visit: ['We\'re documenting your garden. For science. Pippa\'s idea. My notebook.'],
      museum: ['I\'m drawing every case. I\'m on case nine. It\'s going to take till I\'m old.'],
      sunday: ['Grandma lets me have coffee on Sundays. Half a cup. It\'s mostly milk.'],
    },
    greet: ['I\'m the club\'s official photographer. I don\'t have a camera yet.', 'Pippa\'s in charge. Technically.', 'Shh! I\'m listening for the Jackalope.'],
    chat: [
      'If we get a gold photo of a Nightcrawler, the club gets famous. Pippa says.',
      'My uncle saw the Wampus Cat. It had six legs! He had five drinks.',
      'Dr. Okafor read my letter on the radio once. Best day ever.',
    ],
    rumor: 'Sam flips through a notebook: "Field note: the {c}, {time}, at {place}. Likes {lure}."',
  },
  {
    id: 'toby', name: 'Toby', title: "Gideon's Apprentice", kind: 'person',
    body: body('toby', P.LANTERN, P.AMBER, P.RUST, P.CRAN, P.SHADOW, 'short'),
    look: { outfit: 'npc_apprentice', hat: 'none' },
    where: (c) => {
      const s = c.questStage('toby');
      const m = c.minutes;
      if (s === 1) return { map: 'CRANBERRY_BOG_AND_SPRINGS', x: 32, y: 70, dir: 'down' };
      if (!(s === 2 || c.questDone('toby'))) return null;
      if (c.festival && m >= H(18)) return town(44, 32, 'left');
      if (m < H(7)) return asleep('toby');
      if (sundayBreakfast(c)) return diner(3, 8, 'up', 'sunday');
      if (m < H(8)) return homeAm('toby');
      // Mid-morning errand: hauling a crate of hinges over to the museum.
      if (between(m, H(11), H(11, 40)) && !c.wet) return town(36, 23, 'up', 0, 'errand');
      if (m < H(17)) return at('STORE_INT', 15, 6, 'left', 1, 'work');
      if (m < H(19)) return c.wet ? diner(11, 8, 'up') : town(34, 34, 'left', 0, 'bench');
      if (m < H(21)) return diner(11, 8, 'up');
      if (m < H(22)) return homeSit('toby');
      return asleep('toby');
    },
    lines: {
      home: ['It\'s small, but it\'s mine. Well, it\'s Gideon\'s. But he says it\'s mine.', 'You can see the whole street from the little window. I count the lamplights.'],
      errand: ['Hinges for Mrs. Vance\'s new cases! Gideon says if I drop them I\'m sleeping in the bog.', 'Heavy crate. Good for the arms. Gideon says.'],
      bench: ['I whittle out here after work. This one\'s a jackalope. Or a dog. It\'s going great.'],
      sunday: ['Mabel\'s pancakes are the size of hubcaps. I can eat four.'],
    },
    greet: ['Thanks again for pulling me out of that bog.', 'Gideon\'s got me sweeping. Again.'],
    chat: [
      'I was chasing a light over the marsh. It kept moving away. Then my boots kept sinking.',
      'Something big and pink swam under me in the shallows. I think it just wanted to look.',
      'Gideon pretends he wasn\'t worried. He was worried.',
    ],
    rumor: 'Toby shudders: "Out in the bog I heard about the {c}: {time}, near {place}. Bring {lure}."',
  },
  {
    id: 'buster', name: 'Buster', title: 'Bloodhound', kind: 'dog',
    body: body('buster', P.AMBER, P.RUST, P.AMBER, P.RUST, P.AMBER, 'short'),
    look: { outfit: 'ranger_jacket', hat: 'none' },
    where: (c) => {
      const s = c.questStage('buster');
      if (s === 1) return null; // placed by the quest system at the end of the pawprints
      if (s === 2 || c.questDone('buster')) {
        const b = NPCS_BY_ID.barnaby.where(c);
        if (!b) return town(68, 36, 'left', 2);
        if (b.sleep) return asleep('buster');
        // Mabel only lets him in on Sundays; otherwise he waits outside the door.
        if (b.map === 'DINER_INT' && b.tag !== 'sunday') return town(18, 36, 'up', 1, 'waiting');
        if (b.map === 'DINER_INT') return diner(b.x - 1, b.y, 'right', 'sunday');
        if (b.map === 'HOUSE_FINCH') return { ...homeSit('buster'), wander: 2 };
        return { map: b.map, x: b.x + 1, y: b.y, dir: 'left', wander: 2, tag: b.tag };
      }
      return null;
    },
    greet: ['Woof!', 'Buster wags his whole body.', 'Buster sniffs your pockets for venison.'],
    chat: ['Buster rolls over for belly rubs.', 'Buster howls at the rail car.'],
    rumor: 'Buster sniffs the air toward {place}...',
  },
  {
    id: 'ruth', name: 'Ruth Haddix', title: "Sam's Grandma", kind: 'person',
    body: body('ruth', P.LANTERN, P.AMBER, P.FOG, P.MOON, P.CRAN, 'bun'),
    look: { outfit: 'npc_housecoat', hat: 'none' },
    where: (c) => {
      const m = c.minutes;
      if (c.festival && m >= H(18)) return town(40, 31, 'left');
      if (m < H(6, 30)) return asleep('ruth');
      if (sundayBreakfast(c)) return diner(14, 11, 'right', 'sunday');
      if (m < H(9) || (c.wet && m < H(17))) return homeAm('ruth');
      if (m < H(12)) return town(35, 57, 'down', 0, 'porch');
      if (m < H(14)) return homeSit('ruth');
      if (m < H(15, 30)) return town(40, 54, 'down', 2, 'chickens');
      if (m < H(17)) return town(35, 57, 'down', 0, 'porch');
      if ((c.weekday === 'Wed' || c.weekday === 'Fri') && m < H(19)) return diner(14, 11, 'right');
      if (m < H(21)) return homeSit('ruth');
      return asleep('ruth');
    },
    greet: ['Well, hey there, honey.', 'You\'re the Ranger! Samuel\'s told me all about you. All about you.', 'Mind the chickens. They don\'t mind you.'],
    chat: [
      'My Walter went down No. 3 every morning for thirty-one years. I packed his lunch every one of them. Pepperoni roll and an apple.',
      'Those hens lay better when there\'s fog. Don\'t ask me why. Don\'t ask the hens, either.',
      'Samuel thinks I don\'t know about the glowing box under his bed. I know about everything under that bed.',
      'Back in my day we called it "the thing on the ridge" and we didn\'t go up there. Now there\'s a radio show. Times change.',
      'You eat enough? You don\'t look like you eat enough.',
    ],
    rumor: 'Ruth leans in: "My Walter saw the {c} once, {time}, out by {place}. He swore it came for {lure}."',
    lines: {
      home: ['Sit by the fire, honey. Soup beans are on.', 'That quilt\'s older than me. Don\'t tell it I said so.'],
      porch: ['Best seat in Pine Hollow is a porch rocker and a cup of coffee.', 'I count the trucks go by. Used to be forty a day. Now I count chickens.'],
      chickens: ['Come on, girls! Come on! ...They\'re ignoring me. They know I\'ll feed them anyway.', 'That one\'s Pip. She lays the little ones. She tries her best.'],
      sunday: ['Sunday breakfast. Samuel gets half a coffee and acts like he\'s forty.'],
    },
  },
  {
    id: 'vance', name: 'Ranger Elias Vance', title: 'Former Fire-Watch Ranger', kind: 'person',
    body: body('vance', P.LANTERN, P.AMBER, P.MIST, P.TWILIGHT, P.TWILIGHT, 'beard'),
    look: { outfit: 'ranger_jacket', hat: 'ranger_cap' },
    where: (c) => {
      if (!c.campaignDone) return null;
      const m = c.minutes;
      if (c.festival && m >= H(18)) return town(38, 31, 'down');
      if (m < H(7)) return asleep('vance');
      if (sundayBreakfast(c)) return diner(13, 9, 'right', 'sunday');
      if (m < H(8)) return homeAm('vance');
      if (m < H(17)) return at('MUSEUM_INT', 9, 16, 'right', 1);
      if (m < H(20)) return diner(13, 9, 'right');
      if (c.wet) return m < H(23) ? homeSit('vance') : asleep('vance');
      return at('RADIO_RIDGE_AND_CROSSROADS', 20, 10, 'left', 1);
    },
    lines: {
      home: ['My sister kept my room exactly as I left it. Down to the dust, I think.', 'Percival still doesn\'t trust me. Three years is a long time to a cat.'],
    },
    greet: ['Ranger. You kept the garden. Good.', 'Three years in the fog. I still dream in static.', 'Agnes won\'t let me out of her sight. Can\'t blame her.'],
    chat: [
      'The Weaver isn\'t cruel. It\'s a caretaker. It needed someone to listen while the Wardens were restless.',
      'You logged all four Wardens. Do you understand what that means? They trust you. The valley picked you.',
      'Something under the foothills was waking up. The Wardens kept it down. Now that they rest easy... the mine hums. Keep your lantern lit.',
      'I owe Clara a dozen interviews. I\'ve done two. She records everything. Even my snoring.',
      'My old journal? Keep it. You\'ve earned the pages more than I have.',
    ],
    rumor: 'Elias taps his radio: "From inside the fog I watched the {c}, {time}, near {place}. It always came for {lure}."',
  },
  {
    id: 'ezri', name: 'Old Ezri Vance-Kerr', title: 'Traveling Apothecary', kind: 'person',
    body: body('ezri', P.LANTERN, P.AMBER, P.MOON, P.FOG, P.SHADOW, 'long'),
    look: { outfit: 'npc_ezri', hat: 'none' },
    where: (c) => ((c.festival || c.foggyNight) && c.minutes >= H(18) ? { map: 'PINE_HOLLOW_TOWN', x: 33, y: 33, dir: 'down' } : null),
    greet: ['Mist and moonlight, Ranger. I have just the thing.', 'My cousin Agnes keeps the dead things. I keep the living secrets.'],
    chat: ['Lunar Dew draws the elder spirits. A drop on the tongue of the night.', 'The wisps flee from lies. Bring them oil that does not lie.'],
    rumor: 'Ezri stirs a vial: "The {c} walks {time} near {place}. It drinks of {lure}."',
  },
  {
    id: 'pike', name: 'Professor Sterling Pike', title: 'Anomaly Machinist', kind: 'person',
    body: body('pike', P.LANTERN, P.AMBER, P.MIST, P.TWILIGHT, P.SHADOW, 'short'),
    look: { outfit: 'npc_pike', hat: 'npc_pike_goggles' },
    where: (c) => ((c.festival || c.foggyNight) && c.minutes >= H(18) ? { map: 'PINE_HOLLOW_TOWN', x: 43, y: 33, dir: 'down' } : null),
    greet: ['Ah! A field operative! Have you any Static Feathers? No? Pity.', 'Fog is excellent for conductivity. Also for business.'],
    chat: ['My Tesla Pylon is perfectly safe. Mostly safe. Stand back.', 'The Chronos Shutter freezes a fraction of a second. Long enough.'],
    rumor: 'Pike adjusts his goggles: "Electromagnetic spikes: the {c}, {time}, at {place}. Attracted to {lure}."',
  },
];

export const NPCS_BY_ID: Record<NpcId, NpcDef> = Object.fromEntries(NPCS.map((n) => [n.id, n])) as Record<NpcId, NpcDef>;

const PLACE: Record<string, string> = {
  CABIN_YARD: 'your cabin', PINE_TRAIL_AND_ORCHARD: 'Pine Trail', CRANBERRY_BOG_AND_SPRINGS: 'the Cranberry Glades',
  OLD_GROWTH_AND_SAWMILL: 'the Old Growth', RADIO_RIDGE_AND_CROSSROADS: 'Radio Ridge',
};

function timeText(c: CryptidDef): string {
  if (c.times === 'ANY') return 'at all hours';
  const t = c.times[0];
  return t === 'DAWN' ? 'at dawn' : t === 'DAY' ? 'by day' : t === 'DUSK' ? 'at dusk' : t === 'NIGHT' ? 'at night' : 'in the Witching Hour';
}

/** The rumor an NPC shares today (rotates daily, different per NPC). */
export function rumorFor(npc: NpcDef, day: number): { text: string; cryptid: string } {
  const idx = NPCS.indexOf(npc);
  const c = CRYPTIDS[Math.floor(hash2(day, idx, 909) * CRYPTIDS.length)];
  const place = c.zones ? `${PLACE[c.maps[0]] ?? 'the wilds'} (${c.zones[0]})` : PLACE[c.maps[0]] ?? 'the wilds';
  const lure = ITEMS[c.lures[0]]?.name ?? c.lures[0];
  const text = npc.rumor.replace('{c}', c.name).replace('{place}', place).replace('{time}', timeText(c)).replace('{lure}', lure);
  return { text, cryptid: c.id };
}
