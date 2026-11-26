/**
 * Phase 4 campaign: "The Signal on Radio Ridge".
 * Narrative text, Ranger Elias Vance's journal pages, the finale script and
 * the Coal Mine expansion teaser. Progress itself lives in engine/campaign.ts.
 */
import type { MapId } from './mapgen';

export const ACT_TITLES: Record<number, [string, string]> = {
  1: ['ACT I', 'The Fire-Watch'],
  2: ['ACT II', 'Restoring Pine Hollow'],
  3: ['ACT III', 'The Four Wardens'],
  4: ['ACT IV', 'The Midnight Broadcast'],
  5: ['EPILOGUE', 'Keeper of the Barrens'],
};

/** The four Territorial Wardens of Act III. */
export const WARDENS = ['sasquatch', 'wendigo', 'thunderbird', 'awful'] as const;

export interface JournalPage {
  id: number;
  title: string;
  text: string;
  /** Where the torn page lies (resolved to the nearest walkable tile). Page 0 is the burned journal itself. */
  map?: MapId;
  x?: number;
  y?: number;
}

export const JOURNAL_PAGES: readonly JournalPage[] = [
  {
    id: 0, title: 'Field Journal of Ranger Elias Vance',
    text: 'Half the book is burned away. The first entry survives: "Day 1. Agnes says I\'m mad to take the fire-watch. The cabin leaks, the garden is brush, and the radio tower blinks at night though the station closed in \'79. I like it here." The rest is torn out. Loose pages might still be out in the wilds.',
  },
  {
    id: 1, title: 'Torn Page: The Garden', map: 'CABIN_YARD', x: 9, y: 50,
    text: '"Cleared the secret nook today. Wild onions, resin, and a ring of rabbit prints with ANTLER marks beside them. Planted clover by the fence. Something nibbled it by morning. I left more."',
  },
  {
    id: 2, title: 'Torn Page: The Orchard', map: 'PINE_TRAIL_AND_ORCHARD', x: 60, y: 28,
    text: '"The Albatwitch stole my apple core right out of my hand. Agnes laughed so hard she cried. The meadow creatures are curious, not cruel. You earn their trust slowly, like a town\'s."',
  },
  {
    id: 3, title: 'Torn Page: The Bog Hum', map: 'CRANBERRY_BOG_AND_SPRINGS', x: 15, y: 15,
    text: '"The springs HUM. Low, under everything, like a radio between stations. I tuned the field radio to match it: 66.1. The wisps came out to listen. I think the whole valley is broadcasting."',
  },
  {
    id: 4, title: 'Torn Page: The Sawmill', map: 'OLD_GROWTH_AND_SAWMILL', x: 40, y: 38,
    text: '"Red eyes in the sawmill rafters again. It never attacks. It WATCHES the ridge, the same way I do. Wrote down the frequency the tower blinks at. It changes when storms roll in."',
  },
  {
    id: 5, title: 'Torn Page: The Elder', map: 'OLD_GROWTH_AND_SAWMILL', x: 20, y: 62,
    text: '"Three carved totems, honey, apples. At dusk the Elder came and sat with me until dark. It is old. It is TIRED. It said, without words, that the valley needs four keepers and only has three."',
  },
  {
    id: 6, title: 'Torn Page: The Four Wardens', map: 'RADIO_RIDGE_AND_CROSSROADS', x: 30, y: 40,
    text: '"The Elder of the hemlocks. The Wendigo of the witching fog. The Thunderbird of the storms. The Awful on the high cliffs. FOUR WARDENS. They keep something below the foothills asleep. One of them is failing."',
  },
  {
    id: 7, title: 'Torn Page: The Ridge Whistle', map: 'RADIO_RIDGE_AND_CROSSROADS', x: 18, y: 10,
    text: '"Climbed to the tower. The wind through the girders whistles at 101.3, the same note the Thunderbird calls. Start where the bog hums, then climb to the ridge\'s whistle..."',
  },
  {
    id: 8, title: 'Torn Page: The Man in Green', map: 'RADIO_RIDGE_AND_CROSSROADS', x: 36, y: 66,
    text: '"He was waiting at the Crossroads at 3 AM. Green suit, no face, a smile like a cut. INDRID COLD. He said the Weaver needs a voice inside the fog, a human keeper, for a while. Only until someone new earns the Wardens\' trust."',
  },
  {
    id: 9, title: 'Torn Page: The Last Entry', map: 'PINE_HOLLOW_TOWN', x: 33, y: 23,
    text: '"...and finish in the silence between: 0.0. Agnes, if you find this: I am not lost. I am KEEPING something. Tell the next ranger to log the Wardens, bring a Static Radio to the Crossroads in the Witching Hour, and tune: bog hum, ridge whistle, silence. I\'ll hear it. -E.V."',
  },
];

export const INTRO_TEXT: readonly string[] = [
  'Last spring you answered a classified ad nobody else would: "OVERNIGHT FIRE-WATCH RANGER, PINE HOLLOW, N.J. Room & board. Solitude. No questions asked."',
  'Three autumns ago the last ranger, Elias Vance, walked out of his cabin into the fog on Radio Ridge... and never walked back. Folks in town say the Barrens took him.',
  'The old radio tower still blinks red above the ridge. Some nights it broadcasts a voice, though the station has been dark since 1979.',
  'Now the cabin is yours: an overgrown garden, a half-burned field journal on the table, and a valley full of things watching from the tall grass. Welcome to the Pine Barrens, Ranger.',
];

export const EPILOGUE_TEXT: readonly string[] = [
  'The static broke like a fever. Out of the fog at the Crossroads stepped Elias Vance: thinner, grayer, still wearing his ranger jacket, holding a radio that had never stopped broadcasting.',
  'For three years he had been the Weaver\'s human voice, keeping the four Wardens in balance from inside the fog. Your field logs proved the Barrens had found a new keeper. The Weaver let him go.',
  'Agnes cried for an hour, then scolded her little brother for two. The festival bonfire burned until sunrise, and Dr. Okafor\'s broadcast that night was the most-listened-to in WKPB history.',
  'But beneath the north-east foothills, the old coal mine hums louder now that the Wardens rest easy... THANK YOU FOR PLAYING. The valley stays open: finish your Dex, and wait for THE UNDERGROUND.',
];

export interface FinaleBeat {
  speaker?: 'indrid' | 'weaver' | 'vance' | 'clara';
  text: string;
  /** A radio-tuning choice: options, correct index, and the line on success. */
  tune?: { options: [string, string, string]; correct: number; ok: string };
}

export const FINALE_BEATS: readonly FinaleBeat[] = [
  { text: 'The needle drifts on its own. Fog pours across the Crossroads, and the four roads vanish one by one.' },
  { speaker: 'indrid', text: 'INDRID COLD: "Good evening, Ranger. You have been keeping the Wardens\' confidences very well. The Weaver would like a word."' },
  { text: 'Silk ribbons unspool from the fog. Behind him rises THE WEAVER, taller than the dead tree, robed in moonlight.' },
  { speaker: 'weaver', text: 'THE WEAVER: "Three autumns ago a ranger answered my signal. He has kept the balance ever since. Tune to us, and he may come home."' },
  { text: 'Tune the dial. Vance\'s journal: "Start where the bog hums..."', tune: { options: ['66.1  BOG HUM', '88.7  STATIC', '104.5  TRAIN'], correct: 0, ok: 'A low hum fills the Crossroads. The ribbons sway.' } },
  { text: '"...then climb to the ridge\'s whistle..."', tune: { options: ['13.0  CRICKETS', '77.7  STATIC', '101.3  RIDGE WHISTLE'], correct: 2, ok: 'The tower on the ridge flashes, once, in answer.' } },
  { text: '"...and finish in the silence between."', tune: { options: ['50.0  STATIC', '0.0  THE SILENCE', '120.9  HOWLING'], correct: 1, ok: 'Every sound in the Barrens stops at once.' } },
  { speaker: 'vance', text: 'A VOICE ON THE RADIO: "...hello? Is that... a new ranger? Did you keep the garden? Tell Agnes I kept the journal. Tell her I\'m coming home."' },
  { speaker: 'weaver', text: 'THE WEAVER: "The Wardens trust you. The Barrens have a keeper again." The fog parts, and a lantern bobs toward you down the north road.' },
];

export const MINE_TEASE: readonly string[] = [
  'The iron gate swings open on its own, groaning. Cold air breathes out of the dark, smelling of coal dust and wet stone.',
  'Far below, a lantern flickers where no one should be. Something down there knocks on the rails, three times, slow and patient.',
  'Painted on the first timber in fresh white letters: "THE WARDENS SLEEP. WE DO NOT."',
  'THE UNDERGROUND: a new horror campaign beneath Pine Hollow. Coming in a future expansion.',
];

export const DECODE_SCENE: readonly string[] = [
  'Agnes spreads a water-stained survey map across the front desk. Dr. Clara Okafor leans over it with a magnifier, headphones still around her neck.',
  'CLARA: "These aren\'t contour lines. They\'re frequencies. Elias was charting the four Wardens of the valley: the Elder in the Old Growth, the Wendigo of the witching fog, the Thunderbird of the ridge storms, and The Awful on the high cliffs."',
  'AGNES: "His notes say the signal only answers someone the Wardens trust. Ranger... please. Log all four of them. Then we\'ll know what happened to my brother."',
];

export const ACT4_CALL: readonly string[] = [
  'Your Static Radio crackles to life. Dr. Clara Okafor, breathless: "Ranger! All four Wardens are logged, and the tower is picking up a PATTERN."',
  'CLARA: "The Crossroads on Radio Ridge. Witching Hour, midnight to 2 AM. Bring the Static Radio, select it, and use it there. Elias\'s pages say: bog hum, ridge whistle, the silence between."',
];
