/**
 * Townsfolk friendships: gift tastes and heart rewards (2 and 4 hearts give a
 * gift or a lasting perk; 5 hearts is a closing scene). Perks are progress flags
 * read elsewhere: skillet, diner_discount, gideon_discount, agnes_brooch,
 * handcar, barney_fishing.
 */

export type FriendId = 'agnes' | 'barnaby' | 'mabel' | 'gideon' | 'clara' | 'pippa' | 'sam' | 'toby' | 'ruth' | 'liesl' | 'matthias' | 'walter';

export interface HeartReward {
  hearts: number;
  lines: string[];
  give?: Array<[string, number]>;
  gold?: number;
  flag?: string;
  /** One-line summary for the Journal. */
  note: string;
}

export interface FriendDef {
  loves: string[];
  likes: string[];
  dislikes: string[];
  /** Agnes treasures every cryptid specimen. */
  lovesSpecimens?: boolean;
  rewards: HeartReward[];
}

export const POINTS_PER_HEART = 100;
export const MAX_HEARTS = 5;

export const FRIENDS: Record<FriendId, FriendDef> = {
  mabel: {
    loves: ['cranberries', 'sweet_corn', 'pawpaw', 'wild_apple', 'brook_trout'],
    likes: ['wild_onion', 'foraged_egg', 'wild_honeycomb', 'catfish_hushpuppies', 'venison_stew', 'moonberry'],
    dislikes: ['bog_slime', 'sulfur_crust', 'sulfur_egg', 'creek_chub'],
    rewards: [
      { hearts: 2, flag: 'skillet', note: "Mabel's skillet: stove meals make double.", lines: ['Mabel presses a heavy cast-iron skillet into your hands.', 'Mabel: "My mama\'s. Seasoned forty years. You cook for one up there? Not anymore -- that thing makes enough for two."', '(Stove meals now make two servings.)'] },
      { hearts: 4, flag: 'diner_discount', note: 'Diner meals 25% off.', lines: ['Mabel: "You\'re family now, hon. Family eats at family prices."', '(25% off everything on the Diner menu.)'] },
      { hearts: 5, note: 'Best friends.', lines: ['Mabel slides a slice of cranberry pie across the counter, then a second one. "One for you. One for whatever\'s out there keeping you company."'] },
    ],
  },
  gideon: {
    loves: ['scrap_copper', 'crushed_quartz', 'whitetail_antler', 'smoked_venison'],
    likes: ['iron_nail', 'raw_venison', 'deer_hide', 'black_coffee', 'pepperoni_roll', 'venison_stew'],
    dislikes: ['wild_clover', 'cranberries', 'moonberry'],
    rewards: [
      { hearts: 2, give: [['arrow', 10], ['rifle_cartridge', 10]], note: '10 arrows & 10 cartridges.', lines: ['Gideon drops a canvas sack on the counter. It clanks.', 'Gideon: "Arrows I fletched, and a box of shells. Don\'t waste \'em on shadows."'] },
      { hearts: 4, flag: 'gideon_discount', note: 'Outfitter upgrades 25% off.', lines: ['Gideon: "Twenty years down the mine, you learn who to trust. You\'re on the list."', '(Outfitter upgrades now cost 25% less.)'] },
      { hearts: 5, note: 'Best friends.', lines: ['Gideon shows you a miner\'s brass check tag, worn smooth. "My granddad\'s. Mine\'s next to it now -- and a blank one. For you, if you\'ll have it."'] },
    ],
  },
  agnes: {
    loves: ['muskie', 'frost_rim_antler', 'silver_silk'],
    likes: ['pawpaw_bread', 'grouse_apples', 'whitetail_antler', 'black_coffee', 'wild_honeycomb', 'chaga'],
    dislikes: ['creek_chub', 'bog_slime', 'squirrel'],
    lovesSpecimens: true,
    rewards: [
      { hearts: 2, give: [['lunar_dew', 1]], note: 'A vial of Lunar Dew Distillate.', lines: ['Agnes unlocks a drawer and lifts out a little blue vial.', 'Agnes: "Elias left this with me years ago. He\'d want it used, not catalogued."'] },
      { hearts: 4, flag: 'agnes_brooch', note: 'Lucky brooch: +50% rare variant odds.', lines: ['Agnes pins a moth-shaped silver brooch to your collar.', 'Agnes: "Odd things are drawn to it. Odder things than usual, I mean."', '(Rare Variants appear 50% more often.)'] },
      { hearts: 5, note: 'Best friends.', lines: ['Agnes: "My brother came home because of you. I don\'t say it enough, dear. Thank you."'] },
    ],
  },
  barnaby: {
    loves: ['smoked_fish', 'channel_catfish', 'black_coffee'],
    likes: ['brook_trout', 'pancakes', 'pepperoni_roll', 'iron_nail', 'smallmouth_bass'],
    dislikes: ['ghost_pepper', 'ghost_chili'],
    rewards: [
      { hearts: 2, flag: 'handcar', note: 'Handcar service at repaired stops.', lines: ['Barney: "Got the old C&O handcar greased up. There\'s a little stop on the spur in every part of the valley."', 'Barney: "Most of \'em are falling apart. Patch one up and I\'ll be waiting there whenever you come through."', '(Handcar service started: repair a region\'s stop, then ride from stop to stop.)'] },
      { hearts: 4, flag: 'barney_fishing', note: 'Fish bite twice as fast.', lines: ['Barney: "Secret to catfish? Patience and a little cornmeal. Trout? Shade. Stand where your shadow won\'t touch the water."', '(Fish now bite about twice as fast.)'] },
      { hearts: 5, note: 'Best friends.', lines: ['Barney blows the station whistle once, just for you. Buster howls along.'] },
    ],
  },
  clara: {
    loves: ['battery_pack', 'glow_shroom', 'moth_scale'],
    likes: ['crushed_quartz', 'ghost_chili', 'moonberry', 'scrap_copper', 'fried_trout'],
    dislikes: ['squirrel', 'cottontail', 'raw_venison'],
    rewards: [
      { hearts: 2, give: [['battery_pack', 2]], note: '2 Ionized Battery Packs.', lines: ['Dr. Okafor: "Spares from the station. The Quiet Zone eats batteries -- don\'t ask me how."'] },
      { hearts: 4, gold: 600, note: 'A 600g research grant.', lines: ['Dr. Okafor waves an envelope. "The university finally funded my \'Appalachian Anomalies\' project. Half of it is yours -- you did the fieldwork."', '(+600g)'] },
      { hearts: 5, note: 'Best friends.', lines: ['Dr. Okafor: "Tonight\'s broadcast is dedicated to the ranger who believed me. Tune in."'] },
    ],
  },
  pippa: {
    loves: ['wild_honeycomb', 'moonberry', 'jackalope_antler'],
    likes: ['wild_clover', 'wild_apple', 'pawpaw', 'cranberry_pie'],
    dislikes: ['raw_venison', 'squirrel', 'sulfur_egg', 'bog_slime'],
    rewards: [
      { hearts: 2, give: [['seed_moonberry', 3]], note: '3 Moonberry seeds.', lines: ['Pippa: "Official Junior Cryptid Club supplies! Nightcrawlers LOVE these. Plant them!"'] },
      { hearts: 4, give: [['lure_totem', 1]], note: 'A hand-carved Lure Totem.', lines: ['Pippa: "I carved you a totem! Sam helped. Mostly with the bandages."'] },
      { hearts: 5, note: 'Best friends.', lines: ['Pippa: "You\'re an honorary Club member. Forever. It\'s in the bylaws now."'] },
    ],
  },
  sam: {
    loves: ['glow_shroom', 'creek_chub', 'pawpaw_bread'],
    likes: ['wild_apple', 'pawpaw', 'foraged_egg', 'pepperoni_roll'],
    dislikes: ['ghost_pepper', 'sulfur_crust'],
    rewards: [
      { hearts: 2, give: [['seed_shroom', 3]], note: '3 Glow-Shroom seeds.', lines: ['Sam: "I grew these in a shoebox under my bed. Mom doesn\'t know. They glow!"'] },
      { hearts: 4, give: [['pawpaw_bread', 2]], note: '2 Pawpaw Bread.', lines: ['Sam: "Grandma baked these. I told her you\'re the bravest person in Pine Holler."'] },
      { hearts: 5, note: 'Best friends.', lines: ['Sam shows you his sketchbook: page after page of you, mid-encounter, drawn with great care.'] },
    ],
  },
  ruth: {
    loves: ['foraged_egg', 'wild_honeycomb', 'pawpaw', 'pepperoni_roll', 'winterberry'],
    likes: ['wild_onion', 'cranberries', 'wild_apple', 'black_coffee', 'soup_beans'],
    dislikes: ['bog_slime', 'sulfur_egg', 'ghost_pepper'],
    rewards: [
      { hearts: 2, give: [['foraged_egg', 6]], note: 'Half a dozen eggs from Pip and the girls.', lines: ['Ruth presses a basket into your hands. "From the girls. Pip laid the little one. She tries her best."'] },
      { hearts: 4, give: [['pawpaw_bread', 3]], note: '3 loaves of Pawpaw Bread.', lines: ['Ruth: "Pawpaw bread, honey. Earl\'s mother\'s recipe. You\'re family now, so you get the good pan."'] },
      { hearts: 5, note: 'Best friends.', lines: ['Ruth: "Earl would\'ve put you to work and fed you twice. I\'m doing my best to keep up the tradition."'] },
    ],
  },
  liesl: {
    loves: ['cranberries', 'wild_honeycomb', 'moonberry', 'wild_apple'],
    likes: ['foraged_egg', 'sweet_corn', 'black_coffee', 'apple_butter', 'pawpaw', 'winterberry'],
    dislikes: ['bog_slime', 'sulfur_egg', 'ghost_pepper', 'creek_chub'],
    rewards: [
      { hearts: 2, give: [['stollen', 2]], note: '2 Christmas Stollen.', lines: ['Omi Liesl wraps a loaf in a tea towel and tucks it under your arm. "Stollen. It keeps a month. It will not last a week. Nobody\'s ever does."'] },
      { hearts: 4, give: [['springerle', 5], ['lebkuchen', 3]], note: 'Springerle and Lebkuchen from the good tin.', lines: ['Omi: "From the good tin. The one I hide from Matthias. Now you know where it is, so now you are family. Don\'t tell him."'] },
      { hearts: 5, note: 'Best friends.', lines: ['Omi: "When I first came here I baked for a town that didn\'t know my name. Now I bake for you. That is the whole story of a good life, Schatz."'] },
    ],
  },
  matthias: {
    loves: ['timber', 'charred_wood', 'whitetail_antler', 'frost_rim_antler'],
    likes: ['pine_resin', 'wild_acorn', 'pepperoni_roll', 'apple_cider', 'black_coffee'],
    dislikes: ['bog_slime', 'swamp_moss', 'sulfur_egg'],
    rewards: [
      { hearts: 2, give: [['timber', 10]], note: '10 Timber, seasoned linden and cherry.', lines: ['Matthias: "Offcuts. Linden, cherry, a bit of walnut. Too good to burn, too small for me. Make something."'] },
      { hearts: 4, give: [['lure_totem', 1]], note: 'A Wooden Lure Totem, carved properly.', lines: ['Matthias sets down a totem, the face so finely cut it seems to watch you. "Elias showed me how these go. I just made it better looking. Don\'t tell him that."'] },
      { hearts: 5, note: 'Best friends.', lines: ['Matthias: "My hands know wood. They didn\'t know people, till Elias. Then you. That\'s two. Omi says that\'s a good start."'] },
    ],
  },
  walter: {
    loves: ['wild_ginseng', 'chaga', 'bee_balm', 'turks_cap'],
    likes: ['mountain_mint', 'wild_honeycomb', 'pine_resin', 'black_coffee', 'wild_onion', 'alpine_tea'],
    dislikes: ['ghost_pepper', 'battery_pack', 'sulfur_egg', 'bog_slime'],
    rewards: [
      { hearts: 2, flag: 'taught_tea', give: [['mountain_mint', 3], ['bee_balm', 3]], note: 'Opa\'s Mountain Tea recipe (cabin stove).', lines: ['Opa Walter shakes out a paper twist of dried leaves. "Mountain mint. Bee balm. One and one, in the pot, never boiled. Now you know it. Now you are a little bit Swabian."', '(You can brew Opa\'s Mountain Tea at the cabin stove.)'] },
      { hearts: 4, give: [['wild_ginseng', 1], ['alpine_tea', 3]], note: 'A ginseng root he dug twenty years ago and never sold.', lines: ['Opa lays a forked root in your palm, wrapped in moss. "Twenty years I kept this one. A man in Elkins offered me a truck for it. A truck! What do I want with a truck? I want to give it to somebody who will plant the berries."'] },
      { hearts: 5, note: 'Best friends.', lines: ['Opa Walter: "In the old country we say: a friend is somebody who walks up the mountain with you even when there is nothing to pick. We should go up, you and I. Even when there is nothing to pick."'] },
    ],
  },
  toby: {
    loves: ['iron_nail', 'pepperoni_roll'],
    likes: ['scrap_copper', 'black_coffee', 'soup_beans'],
    dislikes: ['bog_slime', 'swamp_moss'],
    rewards: [
      { hearts: 2, give: [['iron_nail', 10]], note: '10 Iron Nails.', lines: ['Toby: "Gideon says I made too many. I say there\'s no such thing. Here!"'] },
      { hearts: 4, give: [['snare', 4]], note: '4 Snare Traps.', lines: ['Toby: "Made these myself. Uh, maybe check them before you trust them."'] },
      { hearts: 5, note: 'Best friends.', lines: ['Toby: "When I\'m a real smith, the first thing I forge is for you."'] },
    ],
  },
};

export function isFriend(id: string): id is FriendId { return id in FRIENDS; }
