/** Side quests: givers, journal steps, prerequisites and rewards. */
import type { NpcId } from './npcs';
import type { MapId } from './mapgen';

export interface QuestDef {
  id: string;
  title: string;
  giver: NpcId;
  /** Journal text for stages 1..n. */
  steps: string[];
  /** Quest that must be completed before this one is offered. */
  after?: string;
  reward: { gold: number; items?: Array<[string, number]>; note?: string };
  /** Bulletin-board notice while not yet completed. */
  notice?: string;
}

export const QUESTS: readonly QuestDef[] = [
  {
    id: 'buster', title: 'Lost Pet: Buster', giver: 'barnaby',
    steps: ["Follow Buster's pawprints along Pine Trail.", 'Buster bolted home! Tell Barnaby at the station.'],
    reward: { gold: 400, items: [['smoked_venison', 2]] },
    notice: 'LOST DOG: BUSTER. Bloodhound, answers to "Buster" or "biscuit". Last seen on Pine Trail. See Barnaby at the station.',
  },
  {
    id: 'telegraph', title: 'Telegraph Repair', giver: 'barnaby', after: 'buster',
    steps: ['Bring Barnaby 5 Scrap Copper and 1 Ionized Battery Pack.'],
    reward: { gold: 600, note: 'Daily sighting reports now post to the Bulletin Board.' },
  },
  {
    id: 'toby', title: 'Missing Person: Toby', giver: 'gideon',
    steps: ["Follow Toby's boot tracks into the Cranberry Glades (Bog Waders help).", 'Toby limped home! Report to Gideon at the Outfitter.'],
    reward: { gold: 300, note: 'Gideon upgrades your Machete for free.' },
    notice: 'MISSING: TOBY, apprentice smith. Went into the Cranberry Glades chasing a light. Contact Gideon Thorne at the Outfitter.',
  },
  {
    id: 'sketchbook', title: 'The Lost Sketchbook', giver: 'pippa',
    steps: ["Find Pippa's 3 sketch pages and her sketchbook in the Pine Trail meadows.", 'Return the sketchbook to Pippa & Sam.'],
    reward: { gold: 250, items: [['seed_moonberry', 3]] },
    notice: 'LOST: Junior Cryptid Club sketchbook (red cover). Probably near the Hoop Snake meadow. -Pippa & Sam',
  },
  {
    id: 'nightcrawler_photo', title: 'Club Photo Request', giver: 'pippa', after: 'sketchbook',
    steps: ['Take a Gold Photo of a Fresno Nightcrawler for the Junior Cryptid Club.'],
    reward: { gold: 300, items: [['seed_moonberry', 5]] },
  },
  {
    id: 'mabel_harvest', title: 'Festival Pie Fixings', giver: 'mabel',
    steps: ['Bring Mabel 5 Sweet Corn and 10 Cranberries.'],
    reward: { gold: 500, items: [['cranberry_pie', 2]] },
  },
  {
    id: 'albatwitch', title: 'The Orchard Thief', giver: 'mabel', after: 'mabel_harvest',
    steps: ['Log the Albatwitch raiding the Apple Grove at dusk (reach 100% Trust).'],
    reward: { gold: 300, items: [['apple_cider', 5]] },
  },
  {
    id: 'wampa_survey', title: 'Wampahoofus Survey', giver: 'agnes',
    steps: ['Log a Wampahoofus on Radio Ridge and take a Plaster Cast of its tracks.'],
    reward: { gold: 400, items: [['crushed_quartz', 3]] },
  },
  {
    id: 'howler_audio', title: 'Audio Proof: Ozark Howler', giver: 'clara',
    steps: ["Earn the Ozark Howler's 2-Star Behavior entry (a Static Radio or Parabolic Dish helps)."],
    reward: { gold: 500, items: [['battery_pack', 2]] },
  },
  {
    id: 'indrid_photo', title: 'Photo Proof: Indrid Cold', giver: 'clara', after: 'howler_audio',
    steps: ['Get a Gold Photo of Indrid Cold at the Crossroads in the Witching Hour.'],
    reward: { gold: 800 },
  },
];

export const QUEST_BY_ID: Record<string, QuestDef> = Object.fromEntries(QUESTS.map((q) => [q.id, q]));

/** Track trails laid out by BFS between `from` and `to` when the quest is active. */
export interface TrailSpec {
  quest: string;
  stage: number;
  map: MapId;
  from: [number, number];
  to: [number, number];
  kind: 'paw' | 'boot' | 'page';
  waders: boolean;
}

export const TRAILS: readonly TrailSpec[] = [
  { quest: 'buster', stage: 1, map: 'PINE_TRAIL_AND_ORCHARD', from: [77, 64], to: [14, 24], kind: 'paw', waders: false },
  { quest: 'toby', stage: 1, map: 'CRANBERRY_BOG_AND_SPRINGS', from: [2, 40], to: [32, 70], kind: 'boot', waders: true },
  { quest: 'sketchbook', stage: 1, map: 'PINE_TRAIL_AND_ORCHARD', from: [40, 44], to: [16, 58], kind: 'page', waders: false },
];
