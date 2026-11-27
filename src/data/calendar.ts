/**
 * The Pine Holler year: four West Virginia community gatherings and everybody's
 * birthday. Seasons are 28 days: 0 Spring, 1 Summer, 2 Fall, 3 Winter.
 *
 * - Ramp Feed (spring): a church-basement and fire-hall tradition all over the
 *   state, every April when the wild ramps come up.
 * - Apple Butter Stir-Off (early fall): neighbors take turns stirring a copper
 *   kettle over a wood fire from morning until dark.
 * - Buckwheat Festival (late fall): after Preston County's buckwheat cake and
 *   sausage suppers in Kingwood.
 * - Old Christmas (January 6, Winter 6): the old-calendar Christmas still kept in
 *   corners of Appalachia, when they say the animals kneel at midnight.
 */
import type { FriendId } from './friends';

export type EventId = 'ramp_feed' | 'apple_butter' | 'buckwheat' | 'old_christmas';

export interface TownEvent {
  id: EventId;
  name: string;
  season: number;
  days: number[];
  /** Minutes: when the gathering is on. */
  start: number;
  end: number;
  /** Where it is (shown on the calendar). */
  place: string;
  /** Town tile where the kettle / skillets / griddle / lanterns stand. */
  spot: [number, number];
  /** Morning summary + bulletin text. */
  blurb: string;
  /** The once-a-day thing to do at the stall. */
  activity: { label: string; lines: string[]; give: [string, number] };
  /** What the stall sells. */
  stock: Array<{ id: string; cost: number }>;
  /** What townsfolk say at the gathering. */
  talk: Partial<Record<string, string[]>>;
}

const H = (h: number, m = 0) => h * 60 + m;

export const EVENTS: readonly TownEvent[] = [
  {
    id: 'ramp_feed', name: 'Pine Holler Ramp Feed', season: 0, days: [14], start: H(11), end: H(15), place: 'Town Park, 11 AM-3 PM',
    spot: [35, 31],
    blurb: 'The Pine Holler Ramp Feed! Mabel and Ruth are frying ramps in the Town Park, 11 AM to 3 PM.',
    activity: {
      label: 'Help at the skillets',
      lines: [
        'Mabel hands you a spatula without a word. Ruth points at a bushel of ramps: "Leaves in last, honey, or they go to slime."',
        'An hour of bacon grease, sliced potatoes and the strongest-smelling green on God\'s earth. Ruth tastes, considers, and nods once. Mabel says that\'s the highest honor in the county.',
        '(You got 2 Ramps & Taters Skillets. You will smell of ramps for a week.)',
      ],
      give: ['ramp_skillet', 2],
    },
    stock: [{ id: 'ramp_skillet', cost: 70 }, { id: 'wild_onion', cost: 25 }, { id: 'soup_beans', cost: 110 }, { id: 'seed_clover', cost: 15 }, { id: 'seed_corn', cost: 35 }],
    talk: {
      mabel: ['Ramps, bacon grease, taters. If you can\'t smell us from the ridge, we\'re doing it wrong.', 'Ruth\'s been frying ramps since before I was born. I just hold the platter.'],
      ruth: ['Walter used to dig the ramps. Now Gideon does, and he digs them too deep. Don\'t tell him.', 'You\'ll stink for a week, honey. That\'s how you know it was a good Feed.'],
      gideon: ['Dug six bushels this morning. Up on the north slope, where the hemlocks keep it cool.'],
      barnaby: ['Spring isn\'t spring till you\'ve had ramps. The C&O used to run a Ramp Special up from Charleston.'],
      agnes: ['The Society has records of a Ramp Feed in this park in 1911. Nobody has ever been able to smell the difference.'],
      clara: ['Folk tradition, fieldwork, and lunch. Best kind of Saturday.'],
      pippa: ['Sam ate a raw one on a dare. He cried for ten minutes.'], sam: ['It wasn\'t ten minutes.'],
      toby: ['I helped dig! Gideon says I dig too shallow.'],
      vance: ['Danny and I used to sell ramps door to door for a nickel a bunch. Best summer job we ever had.'],
    },
  },
  {
    id: 'apple_butter', name: 'Apple Butter Stir-Off', season: 2, days: [6], start: H(9), end: H(17), place: 'Town Square, 9 AM-5 PM',
    spot: [35, 31],
    blurb: 'The Apple Butter Stir-Off is on in the Town Square, 9 AM to 5 PM. Everybody takes a turn at the kettle!',
    activity: {
      label: 'Take a turn stirring',
      lines: [
        'Gideon passes you the long wooden paddle. "Figure eights. Never stop. If it sticks, it scorches, and if it scorches, Ruth finds out."',
        'You stir. And stir. The Golden Delicious cook down dark and glossy, and somebody drops in a fistful of cinnamon. By the time your arms give out, the whole square smells like October.',
        '(You got 2 jars of Spiced Apple Butter.)',
      ],
      give: ['apple_butter', 2],
    },
    stock: [{ id: 'apple_butter', cost: 60 }, { id: 'apple_cider', cost: 60 }, { id: 'wild_apple', cost: 20 }, { id: 'seed_cranberry', cost: 40 }, { id: 'seed_pepper', cost: 55 }],
    talk: {
      gideon: ['Copper kettle\'s older than me. My grandmother\'s. Don\'t knock the paddle on the rim.'],
      ruth: ['You stir in figure eights, and you don\'t stop till dark. That\'s the whole recipe. That and forty pounds of apples.'],
      mabel: ['Half these jars go to the diner. The other half go missing. I have suspicions.'],
      agnes: ['Golden Delicious were found in Clay County, you know. 1905. One tree. Every one of these apples is its grandchild.'],
      barnaby: ['My Junie\'s recipe had a pinch of black pepper. Nobody believes me. Taste it and tell me I\'m wrong.'],
      clara: ['I\'m recording the stirring songs. Ruth knows four I can\'t find in any archive.'],
      pippa: ['If you stir backward you get a wish. Sam made that up.'], sam: ['I didn\'t make it up. It\'s an old tradition. From me.'],
      toby: ['My arms have never hurt this much. I love it.'],
      vance: ['Agnes and I stirred this kettle when we were smaller than the paddle. She bossed me then, too.'],
    },
  },
  {
    id: 'buckwheat', name: 'Buckwheat Festival Weekend', season: 2, days: [24, 25], start: H(17), end: H(21), place: 'Town Square & Diner, 5-9 PM',
    spot: [35, 31],
    blurb: 'Buckwheat Festival Weekend: buckwheat cake and sausage suppers in the Square and the Diner, 5 to 9 PM.',
    activity: {
      label: 'Sit down to supper',
      lines: [
        'Mabel slides a plate down the long table: a stack of buckwheat cakes, sour and lacy at the edges, and a coil of sausage still spitting from the griddle.',
        'Barney passes the molasses. Gideon passes the apple butter. Somebody passes you a second plate before you\'ve asked. That\'s the Buckwheat Festival.',
        '(You got 2 plates of Buckwheat Cakes & Sausage to take home.)',
      ],
      give: ['buckwheat_cakes', 2],
    },
    stock: [{ id: 'buckwheat_cakes', cost: 75 }, { id: 'pancakes', cost: 90 }, { id: 'black_coffee', cost: 40 }],
    talk: {
      mabel: ['The batter sat out overnight. That\'s the sour. That\'s the secret. That\'s not a secret, everybody knows.'],
      barnaby: ['Kingwood throws the big one, up in Preston County. Ours is smaller and the sausage is better.'],
      gideon: ['Third plate. Don\'t look at me like that.'],
      agnes: ['The buckwheat fields used to run all along the bottomland. You can still see the old terraces from the ridge.'],
      ruth: ['Molasses on buckwheat, honey. Syrup is for people who don\'t know any better.'],
      clara: ['Two hundred people used to come in by rail for this. Barney has the ticket stubs.'],
      pippa: ['I ate nine. Sam ate seven. It\'s a competition and I\'m winning.'], sam: ['It\'s not a competition. I\'m pacing myself.'],
      toby: ['Gideon let me work the griddle! I only burned the first forty.'],
      vance: ['Mabel won\'t let me pay. I\'ve stopped trying. I just wash the dishes after.'],
    },
  },
  {
    id: 'old_christmas', name: 'Old Christmas Gathering', season: 3, days: [6], start: H(18), end: H(22), place: 'Park Gazebo (or the Memorial), 6-10 PM',
    spot: [38, 28],
    blurb: 'Old Christmas tonight! A quiet lantern gathering in the Town Park, 6 to 10 PM: hot cider and the old stories.',
    activity: {
      label: 'Share hot cider and a story',
      lines: [
        'Ruth ladles hot cider into a tin cup and wraps your hands around it. The lanterns hiss. Somebody\'s breath fogs. Nobody is in a hurry.',
        'Agnes tells the old one, the way her grandmother told it: on Old Christmas Eve, at midnight, the cattle kneel in their stalls, the bees hum a hymn in the hive, and the elder bushes bloom in the snow for one hour. "But you mustn\'t go and look," she says. "That\'s the rule. You have to believe it from here."',
        '(You got 2 cups of Old Christmas Hot Cider.)',
      ],
      give: ['hot_cider', 2],
    },
    stock: [{ id: 'hot_cider', cost: 45 }, { id: 'pawpaw_bread', cost: 90 }, { id: 'apple_cider', cost: 60 }],
    talk: {
      agnes: ['January sixth was Christmas before the calendar changed, and up here some folks never changed with it. I\'m one of them.'],
      ruth: ['Old Christmas is for being quiet together. Drink your cider, honey.'],
      barnaby: ['My dad would go out to the barn at midnight to see the cows kneel. Came back every year and said, "Missed it again."'],
      mabel: ['No cooking tonight. Tonight somebody else pours. That\'s my Old Christmas.'],
      gideon: ['Elder bushes bloom at midnight, they say. I\'ve never gone to look. Some things you leave be.'],
      clara: ['The Quiet Zone on Old Christmas night. Listen. You can hear the creek under the ice from here.'],
      pippa: ['We\'re going to stay up and check on the cows. Grandma Ruth says we\'re not. We are.'], sam: ['We\'re not.'],
      toby: ['I\'ve never been anywhere this quiet on purpose.'],
      vance: ['Three Old Christmases I watched these lanterns from the ridge. This one I\'m standing in the middle of them.'],
    },
  },
];

/** Birthdays: [season 0-3, day 1-28]. Elias's counts once he's home. */
export const BIRTHDAYS: Record<FriendId | 'vance', [number, number]> = {
  pippa: [0, 5], mabel: [0, 22], barnaby: [1, 9], toby: [1, 17], clara: [1, 25],
  gideon: [2, 3], sam: [2, 15], vance: [2, 27], agnes: [3, 11], ruth: [3, 21],
};

/** What they say when you remember. */
export const BIRTHDAY_LINES: Record<FriendId | 'vance', string> = {
  agnes: 'Oh! You remembered. Seventy-... well. Never you mind which. Nobody\'s brought me a birthday present since Elias went up the ridge. Thank you, dear.',
  barnaby: 'For me? On my birthday? Well, I\'ll be. Buster, look, the Ranger remembered. Now I owe you a train ride, and I always pay up.',
  mabel: 'Hon, you didn\'t have to! ...No, I\'m not crying, there\'s onion in the air. Happy birthday to me. Now sit down and let me feed you.',
  gideon: '...You remembered my birthday. Toby forgot. Toby\'s been forgetting for four years. Thank you. I mean it.',
  clara: 'A birthday present! WKPB is announcing it on the air tonight, and you can\'t stop me.',
  pippa: 'IT\'S MY BIRTHDAY AND YOU BROUGHT A PRESENT. Sam! SAM! The Ranger is now an honorary lifetime member of the Club!',
  sam: 'You remembered. Pippa didn\'t. I\'m going to tell her that very calmly.',
  toby: 'Nobody ever remembers my birthday! I mean Gideon makes a cake. But nobody REMEMBERS. Thank you!',
  ruth: 'Well, aren\'t you the sweetest thing. Eighty-one years and I still love a present. Come here, honey.',
  vance: 'A birthday present. I spent three of these alone in a warden cabin, talking to the weather. ...Thank you. Agnes put you up to this, didn\'t she? Don\'t answer that.',
};

export const SEASON_SHORT = ['SPR', 'SUM', 'FAL', 'WIN'];
