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
 *
 * And the Meissgeiers' feast days, from the German settlers who came over the
 * Alleghenies (Pennsylvania Dutch and Swabian customs, kept in town since '62):
 * - New Year's Day (Winter 1): pork and sauerkraut for luck (the pig roots forward).
 * - Martinmas (Fall 11): St. Martin's lantern walk at dusk, led by the children.
 * - Belsnickel Night (Fall 26): the fur-clad Belsnickel asks the children if they've
 *   been good. Gideon goes along as Krampus, which is a costume, not a creature.
 * - Fasnacht (Winter 26): the night before Lent. Masks, fastnacht donuts, a lantern
 *   parade, and Old Man Winter burned in the park so spring comes early.
 * - Osterhase (Spring 20): the Easter Hare's egg hunt in the orchard.
 */
import type { FriendId } from './friends';

export type EventId = 'ramp_feed' | 'apple_butter' | 'buckwheat' | 'old_christmas' | 'new_year' | 'st_martin' | 'belsnickel' | 'fasnacht' | 'osterhase';

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
  /** Something extra the activity does (see engine/calendar.ts). */
  effect?: 'lanterns' | 'burn' | 'eggs';
  /** Townsfolk in costume for the night: npc id -> [outfit, hat] ('' keeps their own). */
  costumes?: Partial<Record<string, [string, string]>>;
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
      liesl: ['Ramps in the kraut, ramps in the bread, ramps in the eggs. In Germany we have Baerlauch, the bear\'s garlic. Same smell. Same happy people.'],
      walter: ['I dig ramps on the way down from the bald. One in five, the same as the herbs. Gideon digs them all. We have words about this.'],
      matthias: ['I carved the serving spoons. Opa says they\'re too nice for ramps. Nothing is too nice for ramps.'],
      mabel: ['Ramps, bacon grease, taters. If you can\'t smell us from the ridge, we\'re doing it wrong.', 'Ruth\'s been frying ramps since before I was born. I just hold the platter.'],
      ruth: ['Earl used to dig the ramps. Now Gideon does, and he digs them too deep. Don\'t tell him.', 'You\'ll stink for a week, honey. That\'s how you know it was a good Feed.'],
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
      liesl: ['Apple butter! In Pennsylvania we call it Lattwaerick. You stir it till your arms fall off, and then you stir it with somebody else\'s arms.'],
      walter: ['Figure eights, never stop, never scrape the bottom. The same as climbing a mountain. And the same as a marriage.'],
      matthias: ['I carved the paddle. It\'s got a little Wampus Cat on the handle. Six legs. Pippa checked.'],
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
      liesl: ['Buckwheat! Like the Buchweizen we ate in Pennsylvania. Molasses, never syrup. Ruth and I agree on exactly one thing.'],
      walter: ['Buckwheat grows up high where nothing else will. Like the people here. Like me.'],
      matthias: ['Third stack. Omi is watching me. Omi is always watching me.'],
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
      liesl: ['Old Christmas! In Pennsylvania my mother lit the tree candles one last time tonight, then they came down. So: last candles. Look at them a long time.'],
      walter: ['Twelfth Night. In the Allgaeu the boys go house to house dressed as the Three Kings and chalk the doors. Here we drink cider. Both are good.'],
      matthias: ['Opa says the animals kneel at midnight. I sat up with Ruth\'s chickens once to check. They did not kneel. They did judge me.'],
      vance: ['Three Old Christmases I watched these lanterns from the ridge. This one I\'m standing in the middle of them.'],
    },
  },
  {
    id: 'new_year', name: "New Year's Pork & Sauerkraut", season: 3, days: [1], start: H(11), end: H(16), place: 'Town Square, 11 AM-4 PM',
    spot: [35, 31],
    blurb: "New Year's Day! Omi Liesl and Mabel are serving pork and sauerkraut in the Town Square, 11 AM to 4 PM. Eat a plate for luck.",
    activity: {
      label: 'Eat a plate, for luck',
      lines: [
        'Omi Liesl ladles out a heap of sauerkraut and a slab of pork roast. "Eat it all. A chicken scratches backward, so you never eat chicken on New Year\'s. The pig roots forward. So: forward!"',
        'Mabel slips a second plate into your hands for later. "Pennsylvania Dutch luck and West Virginia portions, hon."',
      ],
      give: ['pork_sauerkraut', 2],
    },
    stock: [{ id: 'pork_sauerkraut', cost: 80 }, { id: 'lebkuchen', cost: 65 }, { id: 'black_coffee', cost: 40 }, { id: 'stollen', cost: 100 }],
    talk: {
      liesl: ['Pork and sauerkraut on the first day, every year since 1891. My grandmother would turn in her grave if I served chicken.', 'Eat, eat. It is good luck to be full.'],
      walter: ['Prost Neujahr! In my village we poured hot lead in cold water to read the year\'s fortune. Here we just eat. Better.'],
      matthias: ['Omi started the kraut in October. It\'s been in a crock in the cellar burping at us for three months.'],
      mabel: ['Liesl does the kraut, I do the cornbread. Forty years. We have never once agreed on salt.'],
      ruth: ['Earl and Walter ate at my New Year\'s table for twenty years. Earl\'s gone, but Walter\'s still eating for two. Pass the kraut, honey.'],
      gideon: ['Pork roots forward. Good. I\'m done going backward.'],
      barnaby: ['The C&O ran a special on New Year\'s Day for the miners\' families. Sauerkraut supper in the dining car. I was nine. Best day of my life.'],
      agnes: ['The Society has a menu from the 1904 New Year\'s supper. It is this. Exactly this. I find that very comforting.'],
      clara: ['Pork and sauerkraut is the most Pennsylvania thing I\'ve ever eaten, and I grew up in Pittsburgh.'],
      pippa: ['I ate three plates. I\'m going to be SO lucky this year.'], sam: ['I ate one plate. I\'m going to be regular lucky.'],
      toby: ['Is it more lucky if you eat more? Asking for me.'],
      vance: ['Liesl fed me sauerkraut every New Year\'s since \'62. Missed three. I\'m making them up today.'],
    },
  },
  {
    id: 'st_martin', name: "St. Martin's Lantern Walk", season: 2, days: [11], start: H(17), end: H(20), place: 'Town Square, dusk (5-8 PM)',
    spot: [35, 31],
    blurb: "Martinmas! The children lead St. Martin's lantern walk from the Town Square at dusk, 5 to 8 PM. Bring yourself; they'll bring the lanterns.",
    activity: {
      label: 'Walk with the lanterns',
      lines: [
        'Pippa hands you a paper lantern on a stick, a candle flickering inside. "You hold it like THIS. And you sing. You don\'t know the song? Nobody knows the song. Just go la la la."',
        'You walk the lane twice round the square in a ragged line of little lights, Omi Liesl singing the old words in German and everybody else going la la la.',
        'At the end, Omi hands out lebkuchen. Saint Martin cut his cloak in half for a beggar in the snow, she says. So tonight, you share. (Everybody walking with you likes you a little more.)',
      ],
      give: ['lebkuchen', 2],
    },
    effect: 'lanterns',
    stock: [{ id: 'lebkuchen', cost: 65 }, { id: 'hot_cider', cost: 45 }, { id: 'springerle', cost: 55 }],
    talk: {
      liesl: ['Laterne, Laterne, Sonne, Mond und Sterne! ...You see, nobody sings it right but me. That is how you know it is tradition.'],
      walter: ['Saint Martin gave half his cloak away. So I give away half my lebkuchen. The other half I hide.'],
      matthias: ['I cut the lantern frames. The kids paint them. Pippa\'s has six-legged cats on it. Of course it does.'],
      pippa: ['I\'m the LEADER. I go first. Sam goes second. You can go third if you sing.'], sam: ['I\'m second. Second is also important.'],
      ruth: ['Look at all those little lights. Earl would\'ve cried. He was soft like that.'],
      mabel: ['I brought cider for the walkers. And for the people watching the walkers. And for me.'],
      agnes: ['Lantern walks in November. The Society\'s records go back to 1903. There is a photograph. Nobody in it could sing either.'],
      barnaby: ['Reminds me of the old lantern men walking the track at night. Little lights going down the line.'],
      gideon: ['Toby\'s lantern caught fire. Twice. He\'s fine. Lantern isn\'t.'],
      toby: ['My lantern only caught fire a little.'],
      clara: ['I\'m recording the singing for the show. For posterity. And for comedy.'],
      vance: ['I watched these lanterns from the ridge, those years. Little lights going round the square. I didn\'t know I could just... come down and walk with them.'],
    },
  },
  {
    id: 'belsnickel', name: 'Belsnickel Night', season: 2, days: [26], start: H(18), end: H(21), place: 'Town Square, 6-9 PM',
    spot: [35, 31],
    blurb: 'Belsnickel Night! The Belsnickel comes to the Town Square at 6 PM with his sack. Have you been good? (Gideon is going as Krampus. Nobody asked him to.)',
    activity: {
      label: 'Face the Belsnickel',
      lines: [
        'A hunched figure in a ragged fur coat and a hood of matted fleece stamps out of the dark, ringing a cowbell. The Belsnickel! (It is Opa Walter. Everybody knows it is Opa Walter.)',
        'Behind him, rattling a length of chain, is something with black fur, curling horns and a long red tongue: Krampus. Krampus is wearing Gideon\'s boots. Pippa screams with joy.',
        'The Belsnickel peers at you with the Look. "And you, Ranger. You have been good? You have been kind to the creatures? You have been eating?" He fishes in his sack and presses springerle and an apple into your hands. "Ja. Good enough."',
      ],
      give: ['springerle', 3],
    },
    stock: [{ id: 'springerle', cost: 55 }, { id: 'lebkuchen', cost: 65 }, { id: 'hot_cider', cost: 45 }, { id: 'wild_apple', cost: 25 }],
    costumes: { walter: ['npc_furs', 'npc_fur_hood'], gideon: ['npc_krampus', 'npc_krampus_mask'] },
    talk: {
      walter: ['Hrrrm. HAVE YOU BEEN GOOD? ...Ach, of course you have. Here.', 'Fifty years in these furs. The fleece is older than Matthias.'],
      gideon: ['*rattles chain*', '...Don\'t. Don\'t say anything. The kids like it.'],
      liesl: ['Krampus is only a costume, Schatz. Belsnickel is the real one. Well. The real one is my husband. You understand.'],
      matthias: ['I carved Gideon\'s Krampus mask. He asked for "scarier." I made it scarier. He looked in the mirror and said "...good."'],
      pippa: ['KRAMPUS IS GIDEON. I KNOW IT\'S GIDEON. IT\'S STILL THE BEST NIGHT OF THE YEAR.'], sam: ['I hid behind Grandma Ruth for the chain part. Strategically.'],
      toby: ['I said I\'d been good and the Belsnickel looked at me for a really long time.'],
      mabel: ['Gideon practiced the chain rattle in my kitchen all week. All week, hon.'],
      ruth: ['The Belsnickel came to our door in \'63 and Sam\'s daddy hid in the coal bin. Some things are tradition.'],
      agnes: ['The Belsnickel predates Santa Claus in these hills by a century. And he is considerably more judgmental.'],
      barnaby: ['Walter does the Belsnickel, I do the cowbell. Forty years. I have rung that bell in my sleep.'],
      clara: ['Krampus is a costume. I have checked. I have checked twice.'],
      vance: ['Walter\'s Belsnickel scared me half to death in \'64. I was twenty-six.'],
    },
  },
  {
    id: 'fasnacht', name: 'Fasnacht', season: 3, days: [26], start: H(17), end: H(22), place: 'Town Square, 5-10 PM',
    spot: [35, 31],
    blurb: 'Fasnacht! Masks, fastnacht donuts and a lantern parade in the Town Square from 5 PM. At dark, the town burns Old Man Winter so spring comes early.',
    activity: {
      label: 'Burn Old Man Winter',
      lines: [
        'Old Man Winter stands on the woodpile: a straw man with a cotton beard, an old coat, and a sign round his neck that says "ENOUGH." The whole town in masks crowds round with lanterns.',
        'Omi Liesl puts a lit taper in your hand. "Go on. You are the newest. The newest always lights him." You touch the flame to the straw.',
        'He goes up in a roar of sparks. Masks cheer, goats and owls and bears. Matthias whoops behind a stag face. Somewhere a Wampus Cat yowls back from the hills.',
        'Opa Walter, in his bear mask: "There. Winter is beaten. You will see, the snow is finished now." (The rest of this winter will be mild.)',
      ],
      give: ['fastnacht_donut', 4],
    },
    effect: 'burn',
    stock: [{ id: 'fastnacht_donut', cost: 45 }, { id: 'hot_cider', cost: 45 }, { id: 'pork_sauerkraut', cost: 80 }, { id: 'apple_cider', cost: 60 }],
    costumes: {
      matthias: ['', 'npc_mask_stag'], walter: ['', 'npc_mask_bear'], liesl: ['', 'npc_mask_owl'], pippa: ['', 'npc_mask_goat'], sam: ['', 'npc_mask_owl'],
      toby: ['', 'npc_mask_bear'], barnaby: ['', 'npc_mask_goat'], mabel: ['', 'npc_mask_owl'], gideon: ['', 'npc_mask_bear'], agnes: ['', 'npc_mask_owl'],
      clara: ['', 'npc_mask_goat'], vance: ['', 'npc_mask_stag'],
    },
    talk: {
      liesl: ['Fastnacht donuts! Fried in lard, the last of the butter and sugar before Lent. Square, like my grandmother made them. Round ones are for Americans.', 'You came in a mask! Good. Tonight nobody is anybody.'],
      matthias: ['Every mask in the square tonight, I carved. Well. Except Toby\'s. Toby carved Toby\'s. It\'s a bear. We think.', 'In the old country the masks chase winter out of the village. Here they chase it off the ridge.'],
      walter: ['In the Allgaeu, the Narren run through the streets with bells and switches and nobody knows who is who. Here, everybody knows I am the bear. It is fine.'],
      pippa: ['I\'m a GOAT. Baaaaa. That\'s all I\'m saying all night.'], sam: ['I\'m an owl. Owls are wise. Also I can see in the dark. Pretend.'],
      gideon: ['Mask itches. Don\'t tell Matthias.'],
      mabel: ['I fried four hundred fastnachts with Liesl this morning. My arms are lard. My soul is sugar.'],
      ruth: ['No mask for me, honey. At my age, my face scares off winter by itself.'],
      agnes: ['An owl, of course. The Society\'s owl. I\'m keeping minutes.'],
      barnaby: ['Baa. ...Fifty years riding the line, I never once got to be a goat. Liesl, you\'re a genius.'],
      toby: ['I carved my own mask! Matthias says it\'s "very brave." I think that\'s good?'],
      clara: ['Masked revelry in the Quiet Zone. My listeners are going to love this.'],
      vance: ['Matthias carved me a stag. Says it suits me. I don\'t know about that. I like it, though.'],
    },
  },
  {
    id: 'osterhase', name: 'Osterhase Egg Hunt', season: 0, days: [20], start: H(9), end: H(16), place: 'Pine Trail Orchard (basket in the Town Square), 9 AM-4 PM',
    spot: [35, 31],
    blurb: 'The Osterhase has been! Painted eggs are hidden all through the Pine Trail orchard, 9 AM to 4 PM. Bring them back to the basket in the Town Square.',
    activity: {
      label: 'Turn in your painted eggs',
      lines: [],
      give: ['springerle', 1],
    },
    effect: 'eggs',
    stock: [{ id: 'springerle', cost: 55 }, { id: 'stollen', cost: 100 }, { id: 'hot_cider', cost: 45 }, { id: 'seed_clover', cost: 15 }],
    talk: {
      liesl: ['The Osterhase came in the night and hid them. Not me. I was asleep. With onion skins on my hands. For no reason.', 'Onion skins make the gold eggs. Beets make the red. The blue ones are a secret.'],
      walter: ['In the old country the hare brings the eggs. Here you have a hare with antlers. Perhaps it is time it did its share.'],
      matthias: ['I carved a wooden hare for the basket. Pippa says it needs antlers. I said no. It now has antlers.'],
      pippa: ['The Osterhase is OBVIOUSLY a Jackalope. Rabbits don\'t lay eggs. Jackalopes are mysterious. Case closed.'], sam: ['Rabbits also don\'t paint. I\'m just saying.'],
      ruth: ['My hens laid every one of those eggs, and nobody thanks the hens.'],
      mabel: ['Bring me the cracked ones, hon. Deviled eggs for a week.'],
      agnes: ['A Jackalope delivering eggs. I\'ll allow it. It\'s more plausible than half the files in the Archive.'],
      barnaby: ['Found one in my mailbox. The Osterhase knows where I live.'],
      gideon: ['There\'s one on top of the anvil. I didn\'t put it there. I\'m not moving it.'],
      toby: ['I found nine! Seven! Six. Some were rocks.'],
      clara: ['The Osterhase: a Germanic springtime folk figure. Also apparently Pippa\'s nemesis.'],
      vance: ['Liesl\'s been hiding eggs in that orchard since before the trees were grown. I used to help. She said I hid them too well.'],
    },
  },
];

/** Birthdays: [season 0-3, day 1-28]. Elias's counts once he's home. */
export const BIRTHDAYS: Record<FriendId | 'vance', [number, number]> = {
  pippa: [0, 5], mabel: [0, 22], barnaby: [1, 9], toby: [1, 17], clara: [1, 25],
  gideon: [2, 3], sam: [2, 15], vance: [2, 27], agnes: [3, 11], ruth: [3, 21],
  liesl: [3, 17], matthias: [1, 12], walter: [0, 9],
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
  liesl: 'For me? Ach, Schatz. Eighty-four years and still somebody brings the baker a present. Sit. You are getting cake whether you like it or not.',
  matthias: 'Oh. You -- nobody outside the family does that. Thanks. I mean it. I\'ll carve you something. Don\'t argue.',
  walter: 'A present, on my birthday! In the old country we would drink to this. Here we drink tea. Prost, my friend. Prost.',
  vance: 'A birthday present. I spent three of these alone in a warden cabin, talking to the weather. ...Thank you. Agnes put you up to this, didn\'t she? Don\'t answer that.',
};

/** Candlelit Christmas trees (the old German way), Fall 22 through Old Christmas: where they stand. */
export const CANDLE_TREES: Partial<Record<string, Array<[number, number]>>> = {
  PINE_HOLLOW_TOWN: [[40, 27]], CABIN_INTERIOR: [[18, 4]], HOUSE_MEISSGEIER: [[16, 4]], DINER_INT: [[18, 4]], MUSEUM_INT: [[24, 3]],
  HOUSE_VANCE: [[14, 4]], HOUSE_RUTH: [[14, 4]], HOUSE_MILLER: [[16, 4]], HOUSE_FINCH: [[1, 4]], HOUSE_CALLOWAY: [[14, 4]],
};
export function candleSeason(season: number, day: number): boolean { return (season === 2 && day >= 22) || (season === 3 && day <= 6); }

export const SEASON_SHORT = ['SPR', 'SUM', 'FAL', 'WIN'];
