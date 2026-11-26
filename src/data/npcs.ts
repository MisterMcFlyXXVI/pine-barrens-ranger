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

export type NpcId = 'agnes' | 'barnaby' | 'mabel' | 'gideon' | 'clara' | 'pippa' | 'sam' | 'toby' | 'buster' | 'ezri' | 'pike' | 'vance';

export interface Stop {
  map: MapId;
  x: number;
  y: number;
  dir: Dir;
  /** Idle wander radius around the stop (0 = stand still). */
  wander?: number;
}

export interface ScheduleCtx {
  minutes: number;
  weekday: string;
  festival: boolean;
  foggyNight: boolean;
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
}

const body = (id: string, skin: number, skinSh: number, hair: number, hairSh: number, pants: number, hairStyle: Body['hairStyle']): Body => ({
  id, skin, skinSh, hair, hairSh, pants, pantsSh: P.SHADOW, boot: P.SHADOW, hairStyle,
});

const between = (m: number, a: number, b: number) => m >= a && m < b;
const H = (h: number, min = 0) => h * 60 + min;

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

export const NPCS: readonly NpcDef[] = [
  {
    id: 'agnes', name: 'Agnes Vance', title: 'Curator', kind: 'person',
    body: body('agnes', P.LANTERN, P.AMBER, P.FOG, P.MOON, P.CRAN, 'bun'),
    look: { outfit: 'npc_cardigan', hat: 'none' },
    where: (c) => {
      if (c.festival && c.minutes >= H(18)) return FEST.agnes;
      if (between(c.minutes, H(8), H(17))) return { map: 'MUSEUM_INT', x: 13, y: 14, dir: 'down' };
      if (between(c.minutes, H(17), H(20))) return { map: 'DINER_INT', x: 14, y: 8, dir: 'right' };
      return null;
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
      if (c.festival && c.minutes >= H(18)) return FEST.barnaby;
      if (between(c.minutes, H(7), H(18))) return { map: 'PINE_HOLLOW_TOWN', x: 67, y: 35, dir: 'down', wander: 1 };
      if (between(c.minutes, H(18), H(21))) return { map: 'DINER_INT', x: 5, y: 8, dir: 'up' };
      return null;
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
      if (c.festival && c.minutes >= H(18)) return FEST.mabel;
      if (between(c.minutes, H(6), H(21))) return { map: 'DINER_INT', x: 7, y: 4, dir: 'down', wander: 2 };
      return null;
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
      if (c.festival && c.minutes >= H(18)) return FEST.gideon;
      if (between(c.minutes, H(8), H(17))) return { map: 'STORE_INT', x: 11, y: 4, dir: 'down', wander: 1 };
      if (between(c.minutes, H(17), H(20))) return { map: 'PINE_HOLLOW_TOWN', x: 55, y: 8, dir: 'up' };
      if (between(c.minutes, H(20), H(22))) return { map: 'DINER_INT', x: 9, y: 8, dir: 'up' };
      return null;
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
      if (c.festival && c.minutes >= H(18)) return FEST.clara;
      if (between(c.minutes, H(9), H(15))) return { map: 'DINER_INT', x: 14, y: 5, dir: 'right' };
      if (between(c.minutes, H(15), H(17))) return { map: 'PINE_HOLLOW_TOWN', x: 44, y: 27, dir: 'left', wander: 2 };
      if (c.minutes >= H(17) || c.minutes < H(2)) return { map: 'RADIO_RIDGE_AND_CROSSROADS', x: 19, y: 9, dir: 'down', wander: 1 };
      return null;
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
    where: (c) => {
      if (c.festival && c.minutes >= H(18)) return FEST.pippa;
      if (between(c.minutes, H(8), H(12))) return { map: 'PINE_HOLLOW_TOWN', x: 35, y: 32, dir: 'down', wander: 3 };
      if (between(c.minutes, H(12), H(17))) return { map: 'PINE_TRAIL_AND_ORCHARD', x: 62, y: 24, dir: 'down', wander: 2 };
      if (between(c.minutes, H(17), H(19))) return { map: 'PINE_HOLLOW_TOWN', x: 36, y: 33, dir: 'down', wander: 2 };
      return null;
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
    where: (c) => {
      if (c.festival && c.minutes >= H(18)) return FEST.sam;
      if (between(c.minutes, H(8), H(12))) return { map: 'PINE_HOLLOW_TOWN', x: 38, y: 33, dir: 'down', wander: 3 };
      if (between(c.minutes, H(12), H(17))) return { map: 'PINE_TRAIL_AND_ORCHARD', x: 64, y: 25, dir: 'left', wander: 2 };
      if (between(c.minutes, H(17), H(19))) return { map: 'PINE_HOLLOW_TOWN', x: 37, y: 34, dir: 'down', wander: 2 };
      return null;
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
      if (s === 1) return { map: 'CRANBERRY_BOG_AND_SPRINGS', x: 32, y: 70, dir: 'down' };
      if (s === 2 || c.questDone('toby')) {
        if (c.festival && c.minutes >= H(18)) return { map: 'PINE_HOLLOW_TOWN', x: 44, y: 32, dir: 'left' };
        if (between(c.minutes, H(8), H(17))) return { map: 'STORE_INT', x: 15, y: 6, dir: 'left', wander: 1 };
      }
      return null;
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
        if (b && b.map === 'PINE_HOLLOW_TOWN') return { map: b.map, x: b.x + 1, y: b.y, dir: 'left', wander: 2 };
        if (c.minutes >= H(6) && c.minutes < H(22)) return { map: 'PINE_HOLLOW_TOWN', x: 68, y: 36, dir: 'left', wander: 2 };
      }
      return null;
    },
    greet: ['Woof!', 'Buster wags his whole body.', 'Buster sniffs your pockets for venison.'],
    chat: ['Buster rolls over for belly rubs.', 'Buster howls at the rail car.'],
    rumor: 'Buster sniffs the air toward {place}...',
  },
  {
    id: 'vance', name: 'Ranger Elias Vance', title: 'Former Fire-Watch Ranger', kind: 'person',
    body: body('vance', P.LANTERN, P.AMBER, P.MIST, P.TWILIGHT, P.TWILIGHT, 'beard'),
    look: { outfit: 'ranger_jacket', hat: 'ranger_cap' },
    where: (c) => {
      if (!c.campaignDone) return null;
      if (c.festival && c.minutes >= H(18)) return { map: 'PINE_HOLLOW_TOWN', x: 38, y: 31, dir: 'down' };
      if (between(c.minutes, H(8), H(17))) return { map: 'MUSEUM_INT', x: 9, y: 16, dir: 'right', wander: 1 };
      if (between(c.minutes, H(17), H(20))) return { map: 'DINER_INT', x: 13, y: 9, dir: 'right' };
      if (c.minutes >= H(20) || c.minutes < H(2)) return { map: 'RADIO_RIDGE_AND_CROSSROADS', x: 20, y: 10, dir: 'left', wander: 1 };
      return null;
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
