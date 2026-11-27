/**
 * Ranger Orientation: the first-week errands that teach the game and send you
 * around town. Each step is handed out by a townsperson (go and talk to them to
 * take it on), checks itself off as you play, pays a small reward, and points you
 * to the next person. It runs alongside Act I and never blocks the story.
 */
import type { Game } from '../engine/game';

export interface OriStep {
  id: string;
  /** Who gives it (talk to them to take it on). 'note' = Barney's note, already in hand. */
  who: 'note' | 'barnaby' | 'gideon' | 'mabel' | 'agnes';
  /** Where to find them, for the journal. */
  where: string;
  /** What they say when they hand you the task. */
  intro: string[];
  /** Handed over with the intro (so you can do the task straight away). */
  gift?: Array<[string, number]>;
  task: string;
  check: (game: Game) => boolean;
  reward: { gold?: number; items?: Array<[string, number]> };
  /** Said (as a toast) when it's done. */
  done: string;
}

const yardPlantedAndWatered = (game: Game) => game.getMap('CABIN_YARD').plots.some((p) => p.crop && p.watered) || game.stats.harvested > 0;

export const ORIENTATION: readonly OriStep[] = [
  {
    id: 'plant', who: 'note', where: 'Your garden',
    intro: [],
    task: 'Barney\'s note: till a plot with the Hoe, plant a seed, and water it with the Watering Can.',
    check: yardPlantedAndWatered,
    reward: { items: [['plant_fiber', 3]] },
    done: 'Planted and watered! Something will come up in a couple of days. Next: Gideon wants you at the Outfitter in town.',
  },
  {
    id: 'outfitter', who: 'gideon', where: 'The General Store & Outfitter, in town (8 AM-5 PM)',
    intro: [
      'GIDEON: "You\'re the new fire-watch. Barney said you\'d come by." He looks you over. "Seeds, salt, nails, tools. I sharpen what you break and sell you what you need."',
      'GIDEON: "Buy something. Anything. A man should know where the counter is."',
    ],
    task: 'Buy something at Gideon\'s counter in the General Store.',
    check: (g) => g.progress.flags.has('did_buy_store'),
    reward: { items: [['iron_nail', 2]] },
    done: 'Gideon tosses in two iron nails, "for a snare." Talk to him again to learn the Workbench.',
  },
  {
    id: 'craft', who: 'gideon', where: 'The General Store & Outfitter',
    intro: [
      'GIDEON: "That Porch Workbench of yours. Three handfuls of plant fiber and one nail makes a pair of snares. Fiber comes off tall grass and brush when you swing the Machete."',
      'GIDEON: "The bench pulls from your bag and your storage crate both. Go make something with your hands."',
    ],
    task: 'Craft a pair of Snares at your Porch Workbench (3 Plant Fiber + 1 Iron Nail).',
    check: (g) => g.progress.flags.has('did_craft'),
    reward: { gold: 25 },
    done: 'Your first craft! Now set one of those snares out in the yard or the wilds.',
  },
  {
    id: 'snare', who: 'gideon', where: 'Anywhere outdoors',
    intro: [],
    task: 'Hold a Snare and press A on open ground in your yard or the wilds. Check it each morning.',
    check: (g) => g.progress.flags.has('did_snare'),
    reward: { gold: 25 },
    done: 'Snare set. Check it in the morning. Next: Mabel says come by the Whistle-Stop Diner.',
  },
  {
    id: 'diner', who: 'mabel', where: 'The Whistle-Stop Diner, in town',
    intro: [
      'MABEL: "There you are! Barney said the new ranger looked peaky. Sit. Eat. Hold a food in your hand and press A any time you\'re running low on energy."',
      'MABEL: "Here, two pepperoni rolls, on the house. Coal-camp lunch. Keeps you swinging that Machete all afternoon."',
    ],
    gift: [['pepperoni_roll', 2]],
    task: 'Eat something (hold any food and press A) to get your energy back.',
    check: (g) => g.progress.flags.has('did_eat'),
    reward: { gold: 25 },
    done: 'Full and back on your feet. Talk to Mabel again about making a little money.',
  },
  {
    id: 'ship', who: 'mabel', where: 'The Whistle-Stop Diner',
    intro: [
      'MABEL: "Hon, that Shipping Bin by your porch? Anything you drop in there, the morning freight pays you for. Crops, forage, fish, all of it."',
      'MABEL: "Grow it, ship it, buy seeds, grow more. That\'s how we all got by."',
    ],
    task: 'Hold something you can sell and put it in your Shipping Bin (payment arrives at dawn).',
    check: (g) => g.progress.flags.has('did_ship'),
    reward: { gold: 50 },
    done: 'Shipped! You\'ll be paid at dawn. Next: Agnes is waiting at the Historical Society.',
  },
  {
    id: 'board', who: 'agnes', where: 'The Pine Hollow Historical Society, on the Town Square',
    intro: [
      'AGNES: "So you\'re the one with Elias\'s garden. Welcome, dear. The Society collects the valley\'s stranger residents. Not the creatures themselves, mind. The evidence."',
      'AGNES: "First things first. The Bulletin Board in the square: bounties, lost pets, sighting rumors. Everyone in Pine Hollow reads it with their coffee."',
    ],
    task: 'Read the Bulletin Board in the Town Square.',
    check: (g) => g.progress.flags.has('did_board'),
    reward: { items: [['black_coffee', 1]] },
    done: 'Rumors noted. Talk to Agnes again: she has a camera for you to use.',
  },
  {
    id: 'camcorder', who: 'agnes', where: 'The Historical Society',
    intro: [
      'AGNES: "Out in the wilds you\'ll see signs: glowing eyes, shaking brush, rings on the water, fresh prints. Walk up quietly. Running scares the shy ones off."',
      'AGNES: "Face the sign and press A to raise your camcorder. Toss bait, try a signal, keep it calm, and when it trusts you, it\'s logged. Here, some clover. Jackalopes are fools for it."',
    ],
    gift: [['wild_clover', 3]],
    task: 'Find a cryptid clue in the wilds (Pine Trail is a good start) and raise your camcorder at it.',
    check: (g) => Object.values(g.dex).some((e) => e.seen),
    reward: { gold: 50 },
    done: 'Your first sighting! Earn its trust to log it, then bring the specimen to Agnes.',
  },
  {
    id: 'donate', who: 'agnes', where: 'The Historical Society',
    intro: [],
    task: 'Log a cryptid (fill its Trust) and donate its specimen to Agnes at the Historical Society.',
    check: (g) => g.progress.donations >= 1,
    reward: { gold: 100 },
    done: 'Your first specimen is in a case! Barney wants to see you at the station: he has something for you.',
  },
  {
    id: 'fish', who: 'barnaby', where: 'The C&O station, east end of town',
    intro: [
      'BARNEY: "Heard you put your first one in Agnes\'s cases! Proud of you, Ranger. Here. My old fishing rod. It\'s caught more stories than fish, but it\'ll do."',
      'BARNEY: "Your pond, the creek, the glades. Cast, wait for the bob, then press A when the fish is in the zone. Smoked fish makes good bait, too."',
    ],
    gift: [['fishing_rod', 1]],
    task: 'Catch a fish (hold the Fishing Rod and press A facing water).',
    check: (g) => g.progress.flags.has('did_fish'),
    reward: { gold: 150 },
    done: 'ORIENTATION COMPLETE! You know your way around Pine Holler now, Ranger. (+150g)',
  },
];
