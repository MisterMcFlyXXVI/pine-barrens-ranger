/**
 * Campaign: "The Signal on Radio Ridge".
 *
 * Elias Vance was a C&O trackman for thirty-four years. His younger brother
 * Danny died in the Pine Hollow No. 3 cave-in. When the county started talking
 * about closing the town's school, post office and branch line, Elias took the
 * fire-watch job and set out to PROVE the folklore was real so people would come.
 * He chained an injured Sheepsquatch with iron traps and drove it up the ridge in
 * a storm. The Wardens turned him back. Ashamed, he holed up in the old
 * fire-warden cabin above the Quiet Zone, broadcasting into the static.
 *
 * This file holds the words: the opening drive, the player's reason for coming,
 * the ranger's own log, Elias's journal and its nine torn pages, Act II letters
 * and town scenes, the porch radio, the Midnight Broadcast and the dawn epilogue.
 * Progress itself lives in engine/campaign.ts.
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

/* ------------------------------------------------------------------ */
/* Why you came                                                        */
/* ------------------------------------------------------------------ */

export type Reason = 'loss' | 'burnout' | 'belong';
export const REASONS: readonly Reason[] = ['loss', 'burnout', 'belong'];

/** Barney's question on the drive up, and your three possible answers. */
export const BARNEY_ASKS: readonly string[] = [
  'Barney drives with one wrist on the wheel. The radio fades to static somewhere past the Quiet Zone sign.',
  'Barney: "{name}, right? Agnes read me your letter twice. Can I ask you something, {name}? Folks don\'t take a fire-watch post way up here for the pay. Why\'d you come?"',
];
export const REASON_CHOICE: Record<Reason, string> = {
  loss: 'I needed somewhere quiet after losing someone.',
  burnout: 'My old life burned out. I didn\'t know how to fix it.',
  belong: 'I stopped feeling like I belonged anywhere.',
};
/** Short button labels (phones are narrow); the full answer is spoken back. */
export const REASON_LABEL: Record<Reason, string> = {
  loss: 'I lost someone.',
  burnout: 'My old life burned out.',
  belong: 'I didn\'t belong anywhere.',
};
export const BARNEY_REPLY: Record<Reason, string[]> = {
  loss: ['Barney is quiet for a long mile.', 'Barney: "My Junie passed eleven years ago this spring. Quiet helps. Then one day it helps a little less, and that\'s how you know you\'re mending. You\'ll get there."'],
  burnout: ['Barney chuckles, not unkindly.', 'Barney: "My railroad burned out from under me in \'79. Took me a long while to figure a man is more\'n the job he lost. Mountains are good for figuring."'],
  belong: ['Barney nods slowly, like he\'s heard it before.', 'Barney: "Well. Pine Holler\'s a strange little place. Strange little places are real good at making room."'],
};

/* ------------------------------------------------------------------ */
/* Opening & epilogue panels                                           */
/* ------------------------------------------------------------------ */

/** Shown before Barney's question (ad, the legend, the drive). */
export const INTRO_TEXT: readonly string[] = [
  'You answered a classified nobody else would: "OVERNIGHT FIRE-WATCH RANGER, PINE HOLLOW, W.VA. Room & board. Solitude. No questions asked." Folks born here just call it Pine Holler.',
  'The last ranger, Elias Vance, walked out of his cabin one stormy night three autumns ago and never came back down. Folks say the Barrens took him. His sister Agnes says he\'s just stubborn.',
  'Barnaby Finch, the old stationmaster, picks you up at the depot in a truck older than you are. The road climbs into the Quiet Zone, where radios go silent and the tower on the ridge still blinks red.',
];
/** Shown after your answer. */
export const INTRO_CABIN: readonly string[] = [
  'The cabin is yours now: an overgrown garden, a cold stove, a field radio on the porch, and Elias\'s half-burned journal on the table. Something out in the tall grass watches you carry your bag inside.',
];

export const EPILOGUE_TEXT: readonly string[] = [
  'Dawn at the old C&O station. Mist sits on the rails like water. Out of it, walking the ties the way only a trackman can, comes Elias Vance: thinner, grayer, a wooden carving cradled in his arms.',
  'He sets it on the platform: a Sheepsquatch, hand-carved from ridge white oak, every curl of fleece cut by hand. "Three winters," he says. "For Agnes\'s case. It\'s the only way I knew to say sorry to it."',
  'Then he presses a brass key into your hand. "The fire-watch cabin\'s yours, {name}. For good. It always needed somebody who listens." Down the platform, Agnes is walking very fast for a woman who never runs.',
  'Barney blows the station whistle, once, for the first time since \'79. And under the north-east foothills, where Danny Vance went down and didn\'t come up, the old coal mine hums a little louder...',
];

/* ------------------------------------------------------------------ */
/* Elias's journal                                                     */
/* ------------------------------------------------------------------ */

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
    id: 0, title: 'Field Journal of Elias Vance',
    text: '"Day 1 on the fire-watch. Thirty-four years I walked C&O track from Elkins to Cass, and now I watch trees for a living. Agnes says I took this post to be closer to the mine, closer to Danny. She\'s not wrong. The cabin leaks. I like it here." The rest is burned or torn out. Loose pages may still be out in the valley.',
  },
  {
    id: 1, title: 'Torn Page: The Garden', map: 'CABIN_YARD', x: 9, y: 50,
    text: '"Cleared the nook behind the cabin. Ramps, resin, and a ring of rabbit prints with antler scrapes beside them. Danny used to swear the hollers kept their own books, and you only got to read them if you sat still. Planted clover. Something ate it. I planted more."',
  },
  {
    id: 2, title: 'Torn Page: The County Letter', map: 'PINE_TRAIL_AND_ORCHARD', x: 60, y: 28,
    text: '"Letter from the county today. School, post office and the branch line all \'under review.\' Consolidation, they call it. Two hundred and twelve people and a lot of stories, the man wrote. Stories. If I could PROVE one of them, folks would come. The town would have a reason to stay on the map."',
  },
  {
    id: 3, title: 'Torn Page: The Bog Hum', map: 'CRANBERRY_BOG_AND_SPRINGS', x: 15, y: 15,
    text: '"The springs HUM. Low, under everything, like a radio between stations. I tuned the field set to match it: 66.1. The wisps came out to listen. I sat in the cold till my boots froze and never once thought about the county."',
  },
  {
    id: 4, title: 'Torn Page: The White One', map: 'OLD_GROWTH_AND_SAWMILL', x: 40, y: 38,
    text: '"Saw it by the sawmill. Big as a bear, white fleece gone yellow with sulfur, ram\'s horns. It stood on the ridge path and LOOKED at the mine, the way I do. A Sheepsquatch. Proof, walking around on two legs. God help me, my first thought was: how do I bring it to town."',
  },
  {
    id: 5, title: 'Torn Page: The Irons', map: 'OLD_GROWTH_AND_SAWMILL', x: 20, y: 62,
    text: '"Pulled spikes and chain from the old C&O yard. Gideon asked what for and I lied to him. Set the irons along the bog path where its tracks run. I told myself nobody would get hurt. I told myself a lot of things that week."',
  },
  {
    id: 6, title: 'Torn Page: The Storm', map: 'RADIO_RIDGE_AND_CROSSROADS', x: 30, y: 40,
    text: '"It stepped in the irons. I heard it from the cabin. I went after it with a lantern and the chain and drove it up the ridge in the worst storm I ever saw. Then the woods closed. The Elder in the hemlocks. The Wendigo in the fog. The Thunderbird over the tower. The Awful on the cliffs. They let it pass and stood between us. Four Wardens. I have never been looked at like that."',
  },
  {
    id: 7, title: 'Torn Page: The Warden Cabin', map: 'RADIO_RIDGE_AND_CROSSROADS', x: 18, y: 10,
    text: '"Couldn\'t go home. Couldn\'t face Agnes, or the town I was supposed to be saving. Holed up in the old fire-warden cabin above the Quiet Zone and got the warden transmitter running. The wind through the tower girders whistles at 101.3. I talk to the static at night. Sometimes it seems to listen."',
  },
  {
    id: 8, title: 'Torn Page: The Man in Green', map: 'RADIO_RIDGE_AND_CROSSROADS', x: 36, y: 66,
    text: '"He was at the Crossroads at 3 AM. Green suit, no face to speak of, a smile like a cut. Called himself INDRID COLD. Said the white one is healing. Said the Wardens don\'t forget, but they do forgive, and that it can\'t be me who earns it back. Somebody new. Somebody they come to trust."',
  },
  {
    id: 9, title: 'Torn Page: The Last Entry', map: 'PINE_HOLLOW_TOWN', x: 33, y: 23,
    text: '"Agnes, if this reaches you: I am not lost. I am ashamed, which is worse. Tell the next ranger to earn the Wardens\' trust, bring a Static Radio to the Crossroads in the Witching Hour, and tune it the way I learned: start where the bog hums, climb to the ridge\'s whistle, and finish in the silence between: 0.0. I\'ll be listening. I don\'t know if I\'ll have the nerve to answer. -E.V."',
  },
];

/* ------------------------------------------------------------------ */
/* The ranger's own log (reflects why you came)                        */
/* ------------------------------------------------------------------ */

export interface LogEntry { title: string; text: string }

/** Your cabin journal: entries unlock as the story moves. `has` reads story progress. */
export function rangerLog(reason: Reason | null, has: (k: string) => boolean): LogEntry[] {
  const r = reason ?? 'belong';
  const out: LogEntry[] = [];
  out.push({ title: 'Day One', text: {
    loss: 'First night at the cabin. It is so quiet I can hear my own heartbeat, and for once that doesn\'t scare me. I came up here to be somewhere nobody knew what I\'d lost. Something outside answered the porch creak. I answered back.',
    burnout: 'First night at the cabin. No email, no signal, no anyone. I keep reaching for a phone that has nothing to tell me. The stove smokes. The garden is brush. For the first time in a long time, the work in front of me makes sense.',
    belong: 'First night at the cabin. Barney said strange little places make room. The cabin creaks like it\'s deciding about me. Somewhere in the tall grass, something is deciding too.',
  }[r] });
  if (has('logged')) out.push({ title: 'First Footage', text: {
    loss: 'Caught my first one on tape tonight. I sat so still I forgot to grieve for a whole minute. Then I remembered, and it didn\'t run away. Neither did I.',
    burnout: 'First cryptid on tape. Patience, bait, a little nerve. It is the most useful thing I\'ve done in years and nobody will ever pay me for it.',
    belong: 'First cryptid on tape. It looked at me like I was the strange one. Fair.',
  }[r] });
  if (has('inspector')) out.push({ title: 'The County Man', text: 'A man from the county walked the rails today with a clipboard. Barney says Elias heard the same speech, word for word, the year he disappeared. I understand Elias a little better tonight. I understand the town a lot better.' });
  if (has('festival')) out.push({ title: 'The Festival', text: {
    loss: 'Bonfire, fiddles, pepperoni rolls hot off the coals. I laughed at something Mabel said and didn\'t feel guilty about it. Agnes gave me her brother\'s map. She is not done losing people, and neither am I, but tonight we both pretended.',
    burnout: 'The whole town turned out for a festival I helped happen. Nobody filed a report. Agnes handed me her brother\'s map like it was the most important job in the world. Maybe it is.',
    belong: 'Mabel saved me a seat. Toby saved me a pepperoni roll. Pippa saved me a spot in the Club photo. I don\'t know when this became my town. Agnes gave me Elias\'s map.',
  }[r] });
  if (has('wardens')) out.push({ title: 'Four Wardens', text: 'All four Wardens logged. The Elder sat with me till dark. The Wendigo let me breathe. The Thunderbird lit the whole ridge, and The Awful looked at me the way Elias wrote about, except it didn\'t look away. Clara says the tower is answering. Tonight, the Crossroads.' });
  if (has('finale')) out.push({ title: 'Keeper', text: {
    loss: 'He came home. I didn\'t bring anyone back for myself, but I brought someone back for Agnes, and it turns out that counts. The cabin is mine now. So, I think, is the quiet.',
    burnout: 'He came home. The cabin is mine for good. I came up here to stop burning and somewhere along the way I started building instead.',
    belong: 'He came home, and he gave me the key. I belong somewhere. It took a whole town and four monsters to prove it, but I belong somewhere.',
  }[r] });
  return out;
}

/* ------------------------------------------------------------------ */
/* Porch radio check-ins                                               */
/* ------------------------------------------------------------------ */

/** Evening calls on the porch radio, by story stage. Early: neighbours. Later: a faint unknown voice. */
export const RADIO_EARLY: readonly string[][] = [
  ['Agnes: "Historical Society to fire-watch cabin, do you read?... Good. Is your stove drawing? Elias always forgot the damper. Goodnight, dear."'],
  ['Barney: "Finch here. Just making sure the new ranger didn\'t get carried off. Lock your shed. Raccoons. ...Probably raccoons."'],
  ['Agnes: "Checking in. Mabel says you skipped supper. I said you\'re a grown adult. She said that\'s not an answer. Eat something."'],
  ['Barney: "Evenin\'. Buster\'s howling at your ridge again. He only does that when something\'s walking up there. Sleep with the lamp on, maybe."'],
  ['Agnes: "Nothing to report. I just like to hear the radio work. Elias and I used to do this every night, you know. Goodnight."'],
];
export const RADIO_STATIC: readonly string[][] = [
  ['Under the static, very faint, a man\'s voice is counting trains: "...the 4:15... the 6:40 out of Cass..." Then nothing.'],
  ['A carrier wave hums at the edge of the dial, the way the bog springs hum. For a moment someone breathes into a microphone. They don\'t speak.'],
  ['"...fire-watch, fire-watch, this is... is the garden still..." The voice breaks up. Agnes would know that voice. You suspect you do too.'],
  ['Static, and under it, someone humming a hymn your grandmother might have known. It stops when you key the mic.'],
];
/** After Act III: the unknown station is clearer, and it's talking to you. */
export const RADIO_ELIAS: Record<Reason, string[]> = {
  loss: ['The faint voice again, clearer: "...whoever you are down there... quiet isn\'t the same as alone. Took me too long to learn that. Goodnight, fire-watch."'],
  burnout: ['The faint voice again, clearer: "...you\'re fixing that garden, I can see the cleared rows from up here. Good. Work that grows back is the only kind worth doing. Goodnight, fire-watch."'],
  belong: ['The faint voice again, clearer: "...they\'ve taken to you down there. I can tell by how many porch lights stay on. Don\'t waste it. Goodnight, fire-watch."'],
};
export const RADIO_HOME: readonly string[][] = [
  ['Elias: "Warden cabin to fire-watch. Old habits. Agnes says goodnight, {name}, and that you\'re to bank the stove properly. I taught you nothing, apparently."'],
  ['Elias: "Fire-watch, the white one came by the warden cabin tonight. Limp\'s nearly gone. It ate my whole supper. Seemed fair."'],
  ['Barney: "Finch here. Elias and me are arguing about the 1962 timetable. Settle it for us tomorrow. Goodnight, {name}."'],
];

/* ------------------------------------------------------------------ */
/* Act II: letters, the County Inspector, the festival                 */
/* ------------------------------------------------------------------ */

export interface Letter { id: string; donations: number; pages: string[]; gift?: [string, number] }

export const LETTERS: readonly Letter[] = [
  {
    id: 'clara3', donations: 3, gift: ['mineral_salt', 3],
    pages: [
      'A letter on WKPB station paper, the call letters stamped in red:',
      '"Ranger! Dr. Clara Okafor, WKPB, the voice of the hollers. Agnes tells me you\'ve logged three already. My listeners are beside themselves."',
      '"Field tip from the studio: the Glades are busiest at dusk and after dark, the ridge in the rain, and fog brings out everything. Mineral salt enclosed: half the valley will walk a mile for it. -C.O."',
    ],
  },
  {
    id: 'agnes6', donations: 6,
    pages: [
      'A letter from Agnes, on Historical Society stationery:',
      '"Six specimens! Dear, I have decided you are a proper researcher, and proper researchers get keys. The Archive Basement is open to you."',
      '"The old county survey maps are down there, and some of Elias\'s notes in the margins. He drew the four Wardens\' ranges like a trackman draws switches. I can\'t bear to read them. Perhaps you can. -A.V."',
    ],
  },
  {
    id: 'kids9', donations: 9, gift: ['wild_clover', 5],
    pages: [
      'A crayon envelope, sealed with a sticker of a jackalope. Inside, the Junior Cryptid Club Newsletter, Issue 1:',
      '"CLUB RULES: 1. No running near cryptids (they get scared). 2. Bait goes FIRST. 3. Snacks are for members. HOT TIPS: Hoop Snakes like SUNNY days. Albatwitches are in the APPLE TREES at DUSK. Sam saw a Wampahoofus but it was a cow."',
      '"You are now an HONORARY MEMBER. Your dues are clover. We have enclosed clover so you can pay your dues. -Pippa (President) and Sam (Also President)"',
    ],
  },
  {
    id: 'barney12', donations: 12,
    pages: [
      'A letter from Barney, written in careful block capitals:',
      '"RANGER. A FELLOW FROM THE COUNTY IS COMING TO LOOK AT THE STATION. HARLAN PRUITT. HE IS DECIDING WHETHER PINE HOLLOW STAYS FUNDED. BRANCH LINE, SCHOOL BUS, POST OFFICE. ALL OF IT."',
      '"WOULD YOU COME DOWN TO THE PLATFORM BETWEEN 9 AND 5 AND TALK TO HIM. I AM NO GOOD WITH COUNTY MEN. ELIAS WASN\'T EITHER. -B. FINCH"',
    ],
  },
  {
    id: 'gideon15', donations: 15, gift: ['scrap_copper', 4],
    pages: [
      'A short note in a heavy hand, folded around a bundle of copper wire:',
      '"Ranger. You\'re going deeper in now. The sawmill rafters and the mine slag both give copper; a Lightning Rod wants three and a nail. Frost-Rim Antlers turn up in the Old Growth leaf litter, and Ezri sells them dear on foggy nights."',
      '"Copper enclosed. Don\'t thank me. Come by the anvil some afternoon. -G.T."',
    ],
  },
  {
    id: 'mabel18', donations: 18, gift: ['pepperoni_roll', 1],
    pages: [
      'A grease-spotted letter from Mabel, wrapped around something warm:',
      '"Hon! Agnes says we are THIS close to a Folklore Festival, first one since Elias went up the ridge. The whole town\'s hanging garlands in the park and Gideon\'s building the stalls. Come see!"',
      '"Here\'s a pepperoni roll for the walk. Don\'t you dare share it with a cryptid. -Mabel"',
      '(You got a Pepperoni Roll.)',
    ],
  },
  {
    id: 'ruth21', donations: 21, gift: ['pawpaw_bread', 2],
    pages: [
      'A letter in old-fashioned looping cursive, smelling faintly of cinnamon:',
      '"Dear Ranger, Sam reads me your Dex out loud at supper. Twenty-one! Earl would have walked you to every one of those creatures himself, and told you lies about the other twenty."',
      '"Pawpaw bread for your pack. My mother\'s recipe. Eat it when you\'re out somewhere quiet and want to feel watched over. -Ruth Haddix"',
    ],
  },
  {
    id: 'agnes24', donations: 24,
    pages: [
      'A letter from Agnes. The envelope smells faintly of woodsmoke:',
      '"Twenty-four. Twenty-four specimens, and every one of them came to us by trust, not by iron. Elias never managed that. You did, {name}."',
      '"The Pine Hollow Folklore Festival is TONIGHT, six o\'clock, in the Town Park. Bonfire, fiddles, Mabel\'s pepperoni rolls, and two very odd merchants. Come find me by the fire. I have something of my brother\'s that belongs with you now. -A.V."',
    ],
  },
];

export const INSPECTOR_OPEN: readonly string[] = [
  'A man in a gray county windbreaker is photographing the rusted rails. He has a clipboard, and the look of a man who has said no to a lot of small towns.',
  'HARLAN PRUITT: "Pruitt, County Office of Consolidation. Board meets in the fall to decide which line items keep breathing. Your branch line. The school bus. The post office. Two hundred and twelve people and a whole lot of stories."',
  'Barney: "Stories are what this town is made of, Harlan."',
  'PRUITT: "Stories don\'t fill a ledger, Mr. Finch. Ranger? Give me one reason to write KEEP."',
];
export const INSPECTOR_CHOICES: (reason: Reason | null) => Array<{ label: string; reply: string[] }> = (reason) => [
  { label: 'The museum is drawing visitors.', reply: ['PRUITT: "Twelve specimens. Huh. ...Get it to twenty-four and throw that festival Agnes Vance keeps writing me about. I\'ll come see for myself."'] },
  { label: 'People here look after each other.', reply: ['PRUITT: "They do. It\'s also not a line item." He writes something anyway. "Twenty-four specimens and that festival, and I can make it one."'] },
  { label: reason === 'loss' ? 'This town took me in when I had nothing.' : reason === 'burnout' ? 'I came here burned out. This place fixes things.' : 'I never belonged anywhere until here.', reply: ['Pruitt stops writing. "...My mother was from Cass." He clears his throat. "Twenty-four specimens and that festival, Ranger. Show me."'] },
];
export const INSPECTOR_CLOSE: readonly string[] = [
  'Pruitt tips his cap and walks back down the platform to his county truck.',
  'Barney, once he\'s gone: "Last fella from the county gave Elias that same speech, nearly word for word. Elias took it hard. Real hard. That\'s when he started going up the ridge at night."',
  '(A Festival in the Town Park at 24 donations could change the county\'s mind.)',
];
export const INSPECTOR_FESTIVAL: readonly string[] = [
  'Harlan Pruitt has a paper plate of pie and a pepperoni roll in his coat pocket. He is trying very hard to look official.',
  'PRUITT: "Funded. The branch line, the bus, the post office. All of it. ...Don\'t tell the board I had seconds."',
];

/** Agnes hands over Elias's decoded map by the festival bonfire (Act II -> III). */
export const DECODE_SCENE: readonly string[] = [
  'By the bonfire, Agnes unfolds a water-stained survey map. Dr. Clara Okafor leans over it with a flashlight, headphones around her neck.',
  'CLARA: "These aren\'t contour lines, they\'re frequencies. Elias charted the four Wardens: the Elder in the Old Growth, the Wendigo of the witching fog, the Thunderbird of the ridge storms, The Awful on the high cliffs."',
  'AGNES: "And this. Clara traced that voice on your porch radio. It\'s coming from the old fire-warden cabin on Radio Ridge. It\'s him. Half this town has wondered for three years, and none of us dared climb up and knock. Now we know. He\'s alive, and he will not come down."',
  'AGNES: "His notes say the Wardens drove him off. He won\'t believe he\'s forgiven until someone they trust tells him so. {name}... please. Earn their trust. Then talk my brother home."',
];

export const ACT4_CALL: readonly string[] = [
  'Every radio in the valley crackles at once, the porch set included. Dr. Clara Okafor, breathless: "Ranger! All four Wardens are logged, and the warden cabin transmitter just switched itself on."',
  'CLARA: "The Crossroads on Radio Ridge. Witching Hour, midnight to 2 AM. Select the Static Radio and use it there. His pages: bog hum, ridge whistle, the silence between."',
];

/* ------------------------------------------------------------------ */
/* Act IV: the Midnight Broadcast                                      */
/* ------------------------------------------------------------------ */

export interface FinaleBeat {
  speaker?: 'indrid' | 'weaver' | 'vance' | 'clara';
  text: string;
  /** A radio-tuning choice: options, correct index, and the line on success. */
  tune?: { options: [string, string, string]; correct: number; ok: string };
  /** A conversation choice: every answer moves on, each with its own reply. */
  talk?: { options: [string, string, string]; replies: [string, string, string] };
}

const HEART: Record<Reason, { option: string; reply: string }> = {
  loss: { option: 'I lost someone too. Don\'t make her lose you.', reply: 'A long silence. "...Danny would\'ve liked you. He never let me hide from anything either."' },
  burnout: { option: 'My life burned down too. You can come back from it.', reply: 'A rough laugh. "Coming from somebody who\'s rebuilding my garden, I suppose I have to believe you."' },
  belong: { option: 'I didn\'t belong anywhere either. They made room for me.', reply: '"They do that," he says softly. "I forgot. Up here, you forget."' },
};

export function finaleBeats(reason: Reason | null): FinaleBeat[] {
  const heart = HEART[reason ?? 'belong'];
  return [
    { text: 'The needle drifts on its own. Fog pours across the Crossroads, and the four roads vanish one by one.' },
    { speaker: 'indrid', text: 'INDRID COLD: "Good evening, {name}. He is listening. He has listened every night since the storm. I can carry your voice up to his transmitter, if you can find his frequency."' },
    { text: 'Silk ribbons unspool from the fog. Behind Indrid rises THE WEAVER, taller than the dead tree, the ribbons humming like wire in wind.' },
    { text: 'Tune the dial. Elias\'s last page: "Start where the bog hums..."', tune: { options: ['66.1  BOG HUM', '88.7  STATIC', '104.5  TRAIN'], correct: 0, ok: 'A low hum fills the Crossroads. The ribbons sway toward the ridge.' } },
    { text: '"...climb to the ridge\'s whistle..."', tune: { options: ['13.0  CRICKETS', '77.7  STATIC', '101.3  RIDGE WHISTLE'], correct: 2, ok: 'Up on the ridge, a lit window in the old warden cabin flickers, once, in answer.' } },
    { text: '"...and finish in the silence between."', tune: { options: ['50.0  STATIC', '0.0  THE SILENCE', '120.9  HOWLING'], correct: 1, ok: 'Every sound in the Barrens stops at once.' } },
    { speaker: 'vance', text: 'A MAN\'S VOICE: "...who is this? You\'re -- you\'re the one at my cabin. The new fire-watch." A shaky breath. "You shouldn\'t be at the Crossroads this late."' },
    {
      speaker: 'vance', text: 'ELIAS: "Did Agnes send you? Tell her I\'m fine. Tell her I\'m -- I can\'t come down. You don\'t know what I did to that animal."',
      talk: {
        options: ['The white one is healing. Indrid told me.', 'I read your pages. All nine.', 'The Wardens trust me now. I asked them.'],
        replies: ['"Healing." He says the word like he hasn\'t let himself think it. "Its leg... I still hear the chain."', '"Then you know I put it in irons to save a town that the county was going to cut loose anyway."', '"They let you close?" Static. "They stood between me and it like a wall. They let YOU close."'],
      },
    },
    {
      speaker: 'vance', text: 'ELIAS: "I lost Danny in that mine, and I lost my head over a ledger, and I hurt something that never did a thing to me. Agnes shouldn\'t have to look at that."',
      talk: {
        options: ['She sets a teacup out for you every day.', 'The town is funded. The festival saved it.', heart.option],
        replies: ['A sound that might be a laugh or might be crying. "Still? The blue one with the chip?"', '"Funded." He breathes out. "Without a single chain. Huh."', heart.reply],
      },
    },
    { speaker: 'weaver', text: 'THE WEAVER: "The Wardens remember the storm. They also remember the ranger who came after, with bait instead of iron. They forgive. Come down from the ridge, trackman."' },
    { speaker: 'vance', text: 'ELIAS: "...Dawn, {name}. The C&O station. If the mist lifts, I\'ll be on the platform." The fog parts, and far up the ridge the warden cabin\'s window goes dark.' },
  ];
}

export const MINE_TEASE: readonly string[] = [
  'The iron gate swings open on its own, groaning. Cold air breathes out of the dark, smelling of coal dust and wet stone.',
  'Far below, a lantern flickers where no one should be. Something down there knocks on the rails, three times, slow and patient.',
  'Chalked on the first timber, in a careful railroad hand: "WHAT WENT UP THE RIDGE ON THE \'78 TRAIN CAME BACK DOWN HERE. -E.V."',
  'Whatever was in Barney\'s growling crate, it\'s down there still, and it\'s been listening to the town above it for a long time.',
  'BELOW PINE HOLLOW: THE DEEP SEAM. The Lamp House up the hill is open now, and the lift goes down. (Face the Lamp House and press A.)',
];
