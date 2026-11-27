/**
 * Heart scenes: as you become friends with the townsfolk, each of them shows you
 * a piece of Elias Vance's story. A scene plays when you walk into the right
 * place at the right time with enough hearts (half hearts count: 3.5 = 350
 * friendship points). The townsperson steps in beside you for it, wherever their
 * day had them; afterwards they go back to their routine.
 *
 * Scenes for each person play in order. Some hand you a keepsake, a flag or a
 * coat for your wardrobe. The kids' 2.5-heart scene is a small rescue (see
 * engine/heartScenes.ts).
 */
import type { MapId } from './mapgen';
import type { FriendId } from './friends';

export interface SceneTime { minutes: number; weekday: string; wet: boolean; fog: boolean; storm: boolean }

export interface HeartScene {
  id: string;
  /** Whose friendship unlocks it ('kids' = Pippa or Sam, whichever you're closer to). */
  who: FriendId | 'kids';
  /** Hearts needed (half hearts allowed). */
  hearts: number;
  map: MapId;
  /** Where on the map (centre + radius in tiles); omitted = anywhere on that map. */
  near?: [number, number, number];
  when: (t: SceneTime) => boolean;
  /** Where and when, for the Journal. */
  hint: string;
  /** Short label for the Journal. */
  title: string;
  lines: string[];
  /** Played instead once Elias is home (after the finale), where the original would talk as if he's still missing. */
  post?: string[];
  give?: [string, number];
  flag?: string;
  wear?: string;
  /** A scene with gameplay instead of only words. */
  special?: 'rescue';
}

const h = (hh: number, mm = 0) => hh * 60 + mm;
const between = (t: SceneTime, a: number, b: number) => t.minutes >= a && t.minutes < b;
const MORNING = (t: SceneTime) => between(t, h(6), h(12));
const AFTERNOON = (t: SceneTime) => between(t, h(12), h(17));
const DUSK = (t: SceneTime) => between(t, h(17), h(20, 30));
const NIGHT = (t: SceneTime) => between(t, h(20), h(26));

/** Townsfolk who step into each scene. */
export const SCENE_CAST: Record<HeartScene['who'], string[]> = {
  agnes: ['agnes'], barnaby: ['barnaby'], mabel: ['mabel'], gideon: ['gideon'], clara: ['clara'],
  pippa: ['pippa'], sam: ['sam'], toby: ['toby'], ruth: ['ruth'], kids: ['pippa', 'sam'],
};

export const HEART_SCENES: readonly HeartScene[] = [
  /* ---------------- Agnes Vance ---------------- */
  {
    id: 'agnes1', hint: 'Museum, afternoons', who: 'agnes', hearts: 1, map: 'MUSEUM_INT', when: AFTERNOON, title: 'The badge in the drawer',
    post: [
      "Agnes beckons you behind the front desk and opens a drawer she keeps locked.",
      "Inside, on green felt: a brass C&O badge. TRACK FOREMAN -- E. VANCE -- 34 YEARS.",
      "AGNES: \"I was going to put it in a case. I could never decide which wing a brother goes in.\" She smiles. \"He's home now. Sunday, at breakfast, in front of the whole diner, I'm pinning it on him myself. He'll hate it. Come watch.\"",
    ],
    lines: [
      'Agnes beckons you behind the front desk and opens a drawer she keeps locked.',
      'Inside, on green felt: a brass C&O badge. TRACK FOREMAN -- E. VANCE -- 34 YEARS.',
      'AGNES: "Thirty-four years of service and they gave him a badge and a cake. I was going to put it in a case. I could never decide which wing a brother goes in."',
      'She closes the drawer gently. "Not yet, I think. Not until he can see it."',
    ],
  },
  {
    id: 'agnes2', hint: 'Her cottage, 8-10 PM', who: 'agnes', hearts: 2, map: 'HOUSE_VANCE', when: (t) => between(t, h(20), h(22)), title: 'The letters on her desk',
    post: [
      "Agnes's writing desk is stacked with envelopes, three autumns' worth, every one addressed \"To Elias, wherever he's gotten to.\" None of them stamped.",
      "AGNES: \"I gave him the whole stack his first night home. He read every one at the kitchen table till the lamp ran dry.\"",
      "AGNES: \"Now he writes back. One a week. We live in the same house, dear. It's ridiculous.\" She straightens the stack. \"I love it.\"",
    ],
    lines: [
      'Agnes\'s writing desk is stacked with envelopes. Every one is addressed "To Elias, wherever he\'s gotten to." None of them are stamped.',
      'AGNES: "One a week. Three autumns. Folks say the Barrens took him. I say he\'s stubborn. So I write, and there\'s nowhere to send them."',
      'AGNES: "Clara thinks she hears him on the radio some nights. I\'m afraid to believe her. If I believe her and I\'m wrong..." She doesn\'t finish.',
      'She straightens the stack. "Don\'t tell Mabel. She\'d march them up there herself."',
    ],
  },
  {
    id: 'agnes3', hint: 'Miners\' Memorial, dusk', who: 'agnes', hearts: 3.5, map: 'PINE_HOLLOW_TOWN', near: [38, 26, 3], when: DUSK, title: 'At the Miners\' Memorial',
    lines: [
      'Agnes is standing at the Miners\' Memorial, a hand on the cold bronze. She doesn\'t look round.',
      'AGNES: "Daniel. Danny. Our little brother. He went down No. 3 the morning of the collapse, March of \'78. They brought up fourteen men. They never brought up Danny."',
      'AGNES: "Elias was out walking track that morning. He\'s never forgiven himself for being somewhere else. I think that\'s why he needed so badly to save something. The town. Anything."',
      'She touches a name on the newer bronze strip below the 1927 names: D. VANCE, 1978. "Somebody keeps putting ramps here. I think it\'s Ruth. I\'ve never asked."',
    ],
  },
  {
    id: 'agnes4', hint: 'Archive Basement, night', who: 'agnes', hearts: 5, map: 'MUSEUM_BASEMENT', when: NIGHT, give: ['radio_key', 1], title: 'The brass radio key',
    post: [
      "Agnes is in the Archive by lamplight, a box open on the map table. She holds up a small brass Morse key.",
      "AGNES: \"From the warden cabin's old set. Elias left it with me the night before the storm. He said, 'If I don't come back, give it to somebody who'll keep listening.'\"",
      "AGNES: \"He came back. And he says it's yours all the same.\" She closes your fingers around it. \"It was always going to be you, {name}.\"",
      "(You received Elias's Brass Radio Key.)",
    ],
    lines: [
      'Agnes is in the Archive by lamplight, a box open on the map table. She holds up a small brass Morse key.',
      'AGNES: "From the warden cabin\'s old set. Elias brought it down the night before the storm and left it with me. He said, \'If I don\'t come back, give it to somebody who\'ll keep listening.\'"',
      'AGNES: "I\'ve been waiting three years to decide who that is." She closes your fingers around it. "It\'s you, {name}. It was always going to be you."',
      '(You received Elias\'s Brass Radio Key. Your porch radio can reach the ridge.)',
    ],
  },
  /* ---------------- Barnaby "Barney" Finch ---------------- */
  {
    id: 'barney1', hint: 'Station, Friday late afternoon', who: 'barnaby', hearts: 1, map: 'PINE_HOLLOW_TOWN', near: [66, 34, 5], when: (t) => t.weekday === 'Fri' && between(t, h(16, 30), h(18)), title: 'Friday checkers',
    lines: [
      'Barney has a checkerboard set up on an upturned crate by the ticket booth. Only one chair is pulled up to it.',
      'BARNEY: "Fridays, Elias and me played checkers on this crate, every week for twenty-two years. He cheated. Badly. On purpose, so I\'d catch him and feel clever."',
      'BARNEY: "I still set it up Fridays. Habit. ...Care for a game? I\'ll go easy. I won\'t, but I\'ll say I will."',
    ],
  },
  {
    id: 'barney2', hint: 'Behind the station, night', who: 'barnaby', hearts: 2, map: 'PINE_HOLLOW_TOWN', near: [64, 30, 5], when: NIGHT, title: 'The 1978 shipping ledger',
    lines: [
      'In the dark of the old freight shed behind the station, Barney thumbs open a mildewed ledger by lantern light.',
      'BARNEY: "The growling crate. Everybody thinks I made it up. October 1978. Look -- consigned from the No. 3 mine office, routed QUIET ZONE, RADIO RIDGE SIDING. Contents: \'live specimen.\'"',
      'BARNEY: "The mine sent something up to the ridge on my train, the fall after the collapse. Elias read this same page the week before he went up there for good. Went white as a sheet."',
      'He shuts the ledger. "I don\'t know what was in that crate. I know it was scratching."',
    ],
  },
  {
    id: 'barney3', hint: 'Your pond, Sunday afternoon', who: 'barnaby', hearts: 3.5, map: 'CABIN_YARD', near: [36, 43, 6], when: (t) => t.weekday === 'Sun' && AFTERNOON(t), title: 'The lantern on the firebreak',
    post: [
      "Barney reels in, doesn't cast again, and sets the rod across his knees.",
      "BARNEY: \"Got a confession, and your pond's as good a priest as any. The night of the storm, I saw a lantern cross the firebreak up on the ridge. Going up. Fast. I could've gone after him. I was scared of what I'd find.\"",
      "BARNEY: \"Told him so, finally, last Sunday on the porch.\" He watches the bobber a long while. \"Took me three years to say sorry. Took him three seconds to say it didn't matter.\"",
    ],
    lines: [
      'Barney reels in, doesn\'t cast again, and sets the rod across his knees.',
      'BARNEY: "I\'ve got a confession, and your pond\'s as good a priest as any. The night of the storm, I saw a lantern cross the firebreak up on the ridge. Going up. Fast."',
      'BARNEY: "I knew it was him. I could\'ve gone after him. I told myself it was the weather. It wasn\'t the weather. I was scared of what I\'d find."',
      'He watches the bobber a long while. "Three years. You\'d think a man would stop being scared."',
    ],
  },
  {
    id: 'barney4', hint: 'Station platform, early morning', who: 'barnaby', hearts: 5, map: 'PINE_HOLLOW_TOWN', near: [66, 34, 5], when: (t) => between(t, h(7), h(9)), give: ['conductor_whistle', 1], title: 'The conductor\'s whistle',
    lines: [
      'Early morning on the platform. Barney is polishing something brass on his sleeve.',
      'BARNEY: "My conductor\'s whistle. Blew it on the last train out in \'79 and never since." He holds it out. "You blow this at any stop on the line, and I\'ll come. Any hour. Buster too."',
      'BARNEY: "Don\'t argue, {name}. A railroad\'s only a railroad if somebody\'s waiting at the other end."',
      '(You received Barney\'s Conductor Whistle.)',
    ],
  },
  /* ---------------- Gideon Thorne ---------------- */
  {
    id: 'gideon1', hint: 'The open-air anvil, afternoon', who: 'gideon', hearts: 1, map: 'PINE_HOLLOW_TOWN', near: [48, 31, 4], when: AFTERNOON, title: 'The melted irons',
    lines: [
      'Gideon tips a crucible at the open-air anvil. In the scrap pile beside him: three rusted leg-hold traps, jaws twisted.',
      'GIDEON: "Elias asked me to forge these. Said it was for bears. I knew it wasn\'t bears. I made them anyway."',
      'GIDEON: "The morning after the storm, there they were on my anvil. Chained together, blood on one that wasn\'t his, and a note in his hand: MELT THEM. He must\'ve come down in the dark before he went up for good. I never did melt them. Couldn\'t decide if it was mine to do." He feeds a trap into the fire. "Decided."',
    ],
  },
  {
    id: 'gideon2', hint: 'The mine adit, dusk', who: 'gideon', hearts: 2, map: 'PINE_HOLLOW_TOWN', near: [54, 8, 4], when: DUSK, title: 'The cave-in',
    lines: [
      'Gideon stands at the boarded mine adit, hands in his apron.',
      'GIDEON: "March \'78. I was second shift. The roof came down on the first. We dug thirty-one hours. Got fourteen out. Danny Vance was the fifteenth, and we never reached him."',
      'GIDEON: "Here\'s the part I don\'t tell. When we sealed it, there was a hum down there. Not machinery. Not water. It\'s still there some nights, if you put your hand flat on the boards."',
      'He doesn\'t put his hand on the boards. Neither do you.',
    ],
  },
  {
    id: 'gideon3', hint: 'His house, 9-10 PM', who: 'gideon', hearts: 4, map: 'HOUSE_MILLER', when: (t) => between(t, h(21), h(22)), give: ['lamphouse_key', 1], title: 'The first carving',
    lines: [
      'Gideon pulls a sack off something in the corner: a half-carved block of white oak. Ram horns, a shaggy shoulder. Then nothing but wood.',
      'GIDEON: "Elias started this in my shop the winter before the storm. A Sheepsquatch. Said he\'d carve it till his hands stopped shaking. They didn\'t stop. Then the storm came, and he never came back for it."',
      'GIDEON: "And this, {name}." A heavy iron key. "The lamp house at No. 3. I\'ve kept it since \'78. When the town\'s ready to open that hill back up, you\'re the one I\'d trust to turn it."',
      '(You received the Lamp-House Key.)',
    ],
  },
  /* ---------------- Ruth Haddix ---------------- */
  {
    id: 'ruth1', hint: 'Her porch, morning', who: 'ruth', hearts: 1, map: 'PINE_HOLLOW_TOWN', near: [35, 57, 4], when: MORNING, title: 'The Tuesday tin',
    post: [
      "There's a dented lunch tin on Ruth's porch rail. She sees you looking.",
      "RUTH: \"Every Tuesday for three years, somebody left two pepperoni rolls in that tin, wrapped in wax paper. Folded the way the C&O men folded them. And every Tuesday I filled it back up.\"",
      "RUTH: \"I always knew whose hands folded that paper, honey. Now he brings them to the door himself and stays for coffee. I kept the tin anyway.\"",
    ],
    lines: [
      'There\'s a dented lunch tin on Ruth\'s porch rail. She sees you looking.',
      'RUTH: "Every Tuesday for three years, somebody leaves two pepperoni rolls in that tin, wrapped in wax paper. Folded the way the C&O men folded them."',
      'RUTH: "And every Tuesday I fill it back up with whatever I baked, and by morning it\'s gone." She smiles. "I know whose hands fold paper like that, honey. I just haven\'t told Agnes."',
    ],
  },
  {
    id: 'ruth2', hint: 'Her parlor, a rainy afternoon', who: 'ruth', hearts: 2, map: 'HOUSE_RUTH', when: (t) => t.wet && AFTERNOON(t), title: 'Walter\'s lamp tag',
    lines: [
      'Rain on the windows. Ruth opens a cedar box on the table and turns it toward you.',
      'Inside: a brass tag, stamped 312. PINE HOLLOW No. 3.',
      'RUTH: "Each miner hung his tag on the lamp-house board going in and took it back coming out. If your tag was still on the board at the end of shift, they knew to come looking."',
      'RUTH: "Walter came out every day for thirty-one years. The morning of the collapse, he was home sick. Danny Vance took his shift." She closes the box. "Elias knows. He\'s never once held it against me. That\'s the kind of man he is."',
    ],
  },
  {
    id: 'ruth3', hint: 'Town Park, dusk', who: 'ruth', hearts: 4, map: 'PINE_HOLLOW_TOWN', near: [38, 30, 6], when: DUSK, title: 'Music across the hollow',
    post: [
      "Ruth settles onto a bench in the Town Park and listens. Faint, from the direction of Agnes's porch, a harmonica.",
      "RUTH: \"Sound carries in a hollow. Walter used to say that's why folks here sing so much -- so the dead can hear us.\"",
      "RUTH: \"Three years that harmonica played from the ridge, honey. Danny's songs. Now it plays from Agnes's porch.\" She pats your hand. \"The dead can hear it just the same. So can we.\"",
    ],
    lines: [
      'Ruth settles onto a bench in the Town Park and listens. Faint, from somewhere up the ridge, a harmonica.',
      'RUTH: "Sound carries in a hollow. You can hear a man whistling three ridges over if the air\'s still. Walter used to say that\'s why folks here sing so much -- so the dead can hear us."',
      'RUTH: "That harmonica\'s been playing evenings for three years now. Same four songs. Danny\'s songs." She pats your hand. "Somebody up there misses this town something terrible, {name}, honey."',
    ],
  },
  /* ---------------- Mabel Miller ---------------- */
  {
    id: 'mabel1', hint: 'Diner, afternoon', who: 'mabel', hearts: 1, map: 'DINER_INT', when: AFTERNOON, title: 'The recipe card',
    lines: [
      'Mabel waves you behind the counter and slides a grease-spotted index card from the recipe box.',
      'PEPPERONI ROLLS -- E.V. In a careful railroad hand: "Stick pepperoni, NOT sliced. Like the miners took down. Fold the dough twice. Don\'t tell Mabel about the extra cheese."',
      'MABEL: "He wrote this for me the year I took over the diner, when I couldn\'t get them right. I still make them his way. Every single one that\'s ever left this kitchen."',
    ],
  },
  {
    id: 'mabel2', hint: 'Diner, 7-9 PM', who: 'mabel', hearts: 2, map: 'DINER_INT', when: (t) => between(t, h(19), h(21)), title: 'The empty booth',
    lines: [
      'Mabel sits down across from you in the back booth, which she never does, and wipes the table that\'s already clean.',
      'MABEL: "That last fall, Elias stopped eating. Wouldn\'t take a plate. Said every dollar he saved went to the cause -- film, traps, a camera from Charleston. He was going to save this town by himself."',
      'MABEL: "Lost twenty pounds. I started leaving plates on his porch. Then he started leaving them on Ruth\'s." She almost laughs. "Stubborn old fool. Eat your supper, hon. That\'s an order."',
    ],
  },
  {
    id: 'mabel3', hint: 'Her house, 9-10 PM', who: 'mabel', hearts: 4, map: 'HOUSE_MILLER', when: (t) => between(t, h(21), h(22)), wear: 'elias_coat', title: 'The wool coat',
    post: [
      "Mabel lifts a heavy wool coat off a hook by the stove. Both elbows are patched in different plaids.",
      "MABEL: \"Elias's ranger coat. He left it on my porch the night of the storm. I offered it back when he came home and he wouldn't take it.\"",
      "MABEL: \"'A ranger coat belongs on the ranger,' he says.\" She holds it up against your shoulders. \"There. You'll do, {name}.\"",
      "(Elias's Wool Coat is in your cabin wardrobe.)",
    ],
    lines: [
      'Mabel lifts a heavy wool coat off a hook by the stove. Both elbows are patched in different plaids.',
      'MABEL: "Elias\'s ranger coat. He left it on my porch the night of the storm. Ran out without it. I\'ve patched it twice and washed it more than that."',
      'MABEL: "It\'s been waiting on somebody to fill it out again." She holds it up against your shoulders and sniffs. "There. You\'ll do, {name}."',
      '(Elias\'s Wool Coat is in your cabin wardrobe.)',
    ],
  },
  /* ---------------- Dr. Clara Okafor ---------------- */
  {
    id: 'clara1', hint: 'Museum, Monday morning', who: 'clara', hearts: 1, map: 'MUSEUM_INT', when: (t) => t.weekday === 'Mon' && between(t, h(9), h(12)), title: 'The modulation charts',
    post: [
      "Dr. Okafor has long strips of chart paper spread across two benches, covered in a jittery ink line.",
      "CLARA: \"Want my theory? Everywhere else, the sky is static snow: towers, cell signals, satellites. This valley sits in a radio shadow of limestone and hemlock. One of the last quiet places left. I think the stories come here the way animals come to the last clean spring. To sleep.\"",
      "CLARA: \"Three years of Quiet Zone logs. Every night, something on Radio Ridge keyed up for four minutes at 2 AM. A railroad hand on the key.\" She taps the last strip, where the line goes flat. \"It stopped the night you talked him down. Best flatline I've ever recorded.\"",
    ],
    lines: [
      'Dr. Okafor has long strips of chart paper spread across two benches, covered in a jittery ink line.',
      'CLARA: "Want my theory? Everywhere else, the sky is static snow: towers, cell signals, satellites. This valley sits in a radio shadow of limestone and hemlock. One of the last quiet places left. I think the stories come here the way animals come to the last clean spring. To sleep."',
      'CLARA: "Which is why these keep me up. Quiet Zone signal logs. Nothing should broadcast in here. But every night since the storm, something on Radio Ridge keys up for exactly four minutes at 2 AM. Low power. Old equipment."',
      'CLARA: "The modulation is an amateur hand. A careful one. Somebody who learned Morse on a railroad." She taps the chart. "I think Agnes\'s brother is the most faithful radio host in West Virginia, Ranger. He just doesn\'t have a listener."',
    ],
  },
  {
    id: 'clara2', hint: 'Her room over the diner, a rainy night', who: 'clara', hearts: 2, map: 'DINER_ROOM', when: (t) => t.wet && between(t, h(20), h(23)), title: 'The 2 AM recording',
    post: [
      "Clara threads a reel onto the tape machine and turns the volume down low.",
      "A man's voice, tired and patient: \"...warden cabin weather, two A.M. Wind northwest, ten. Fog in the low hollows. Garden at the fire-watch cabin... cleared. Somebody's been working it.\"",
      "CLARA: \"From his last month up there. He mentioned your garden then, too.\" She grins. \"He's agreed to read the weather live on WKPB, Tuesday nights. From my studio. With a cup of coffee and no wind in the mic.\"",
    ],
    lines: [
      'Clara threads a reel onto the tape machine and turns the volume down low, as if it might wake someone.',
      'A man\'s voice, tired and patient: "...warden cabin weather, two A.M. Wind northwest, ten. Fog in the low hollows. Bog springs humming. Fire danger low. Garden at the fire-watch cabin... cleared. Somebody\'s been working it."',
      'CLARA: "That\'s from last week. He reads the weather every night like somebody\'s depending on it." She stops the tape. "He mentioned your garden, {name}. He\'s watching."',
    ],
  },
  {
    id: 'clara3', hint: 'Radio Ridge, in fog or a storm', who: 'clara', hearts: 4, map: 'RADIO_RIDGE_AND_CROSSROADS', when: (t) => t.fog || t.storm, flag: 'radio_calibrated', title: 'Calibrating the dial',
    lines: [
      'Up on the ridge in the murk, Clara holds out her hand for your Static Radio. She opens the back with a pocket screwdriver.',
      'CLARA: "Fog and storm are the only times the Quiet Zone gets loud enough to calibrate against. Hold still... there." The needle settles, steady as a heartbeat.',
      'CLARA: "Now it\'ll find a voice between stations instead of just noise. Wherever you take it."',
      '(Your Static Radio is calibrated: it calms cryptids more reliably in encounters.)',
    ],
  },
  /* ---------------- Pippa Calloway & Sam Haddix ---------------- */
  {
    id: 'kids1', hint: 'Your cabin, Saturday morning', who: 'kids', hearts: 1, map: 'CABIN_YARD', when: (t) => t.weekday === 'Sat' && !t.wet && between(t, h(9), h(12)), title: 'The crayon patrol map',
    post: [
      "Pippa and Sam spread a huge crayon map across your porch boards, weighing the corners with rocks.",
      "PIPPA: \"Official Junior Cryptid Club patrol map! Red X's are sightings. Blue X's are 'maybe.' Green X's are Sam being scared of a stump.\"",
      "SAM: \"It moved.\" He points at a little house on the ridge, crossed out in red. \"That was the haunted cabin. There used to be a light every night. Now Mr. Vance lives at Mrs. Vance's and the light's gone.\" PIPPA: \"We demoted it to a Blue X.\"",
    ],
    lines: [
      'Pippa and Sam spread a huge crayon map across your porch boards, weighing the corners with rocks.',
      'PIPPA: "Official Junior Cryptid Club patrol map! Red X\'s are sightings. Blue X\'s are \'maybe.\' Green X\'s are Sam being scared of a stump."',
      'SAM: "It moved." He points at a little drawing on the ridge: a house with a lit window. "That\'s the haunted cabin. There\'s a light every night. Grandma says don\'t go up there. So we haven\'t." A pause. "Much."',
    ],
  },
  {
    id: 'kids2', hint: 'Old Growth, dusk', who: 'kids', hearts: 2.5, map: 'OLD_GROWTH_AND_SAWMILL', when: DUSK, special: 'rescue', title: 'Past curfew at the sawmill',
    lines: [
      'Three short whistle blasts, far off through the hemlocks. The Junior Cryptid Club distress signal.',
      'Two sets of small boot prints head off the trail toward the old sawmill. Somewhere between here and there, something big is breathing.',
      '(Follow the kids\' prints to the sawmill and walk them home. Move quietly: don\'t run near what\'s watching.)',
    ],
  },
  {
    id: 'kids3', hint: 'Calloway house, 7-8:30 PM', who: 'kids', hearts: 4, map: 'HOUSE_CALLOWAY', when: (t) => between(t, h(19), h(20, 30)), give: ['binocular_strap', 1], title: 'The binocular strap',
    lines: [
      'Pippa digs in the Club HQ crate and comes out holding a leather strap, initialed E.V.',
      'PIPPA: "We found it at the sawmill last summer. Snagged on a nail. It\'s the haunted cabin man\'s. We think. Sam did a handwriting analysis on the initials."',
      'SAM: "It was very scientific." PIPPA: "We voted. Club property goes to the Club\'s best ranger. That\'s you. Unanimous."',
      '(You received Elias\'s Binocular Strap.)',
    ],
  },
  /* ---------------- Toby ---------------- */
  {
    id: 'toby1', hint: 'General Store, morning', who: 'toby', hearts: 1, map: 'STORE_INT', when: (t) => between(t, h(8), h(11)), title: 'Copper wire up the ridge',
    post: [
      "Toby is coiling copper wire behind the counter, a lot of it.",
      "TOBY: \"Somebody used to order copper wire every month. I'd haul it to a stump below Radio Ridge and the next day there'd be exact change in an envelope that smelled like woodsmoke.\"",
      "TOBY: \"Turns out it was Mr. Vance keeping his transmitter alive. Now he picks it up himself and tips me a pepperoni roll. Best customer we've got.\"",
    ],
    lines: [
      'Toby is coiling copper wire behind the counter, a lot of it.',
      'TOBY: "Somebody orders copper wire every month. Gideon packs it and I haul it to the trailhead below Radio Ridge and leave it on a stump. Next day the stump\'s got an envelope with exact change."',
      'TOBY: "Gideon says not to ask. So I don\'t ask. But I DID notice the envelope smells like woodsmoke and pepperoni rolls."',
    ],
  },
  {
    id: 'toby2', hint: 'His loft, 9-10 PM', who: 'toby', hearts: 2, map: 'STORE_LOFT', when: (t) => between(t, h(21), h(22)), title: 'The map in the rafters',
    post: [
      "Toby points up. Pinned to the rafters over his cot is an old forestry service map, curled at the edges.",
      "TOBY: \"FIRE-WARDEN CABIN, ABANDONED 1961. Not on any trail map. I used to look at it before I fell asleep and like knowing somebody was up there keeping watch.\"",
      "TOBY: \"He's back in town now. I kept the map up anyway. Feels like the cabin's still keeping watch. Just for nobody in particular.\"",
    ],
    lines: [
      'Toby points up. Pinned to the rafters over his cot is an old forestry service map, curled at the edges.',
      'TOBY: "Found it in a crate of Gideon\'s. See this little square? FIRE-WARDEN CABIN, ABANDONED 1961. It\'s not on any of the trail maps. That\'s where the copper wire goes."',
      'TOBY: "I look at it before I go to sleep. I don\'t know why. I guess I like knowing somebody\'s up there keeping watch. Even if it\'s weird."',
    ],
  },
  {
    id: 'toby3', hint: 'Cinder yard by the water tower, dusk', who: 'toby', hearts: 4, map: 'PINE_HOLLOW_TOWN', near: [58, 24, 4], when: DUSK, give: ['handcar_crank', 1], title: 'The spare crank',
    lines: [
      'Toby is poking through the cinder yard under the old water tower and holds something up, triumphant: a handcar crank, oiled and wrapped in oilcloth.',
      'Tied to it, a note in a railroad hand: "SPARE CRANK. RELAY CHECKED TO RIDGE SIDING. IF BARNEY\'S ASLEEP, PUMP IT YOURSELF. -E.V."',
      'TOBY: "He left it where a trackman would look! You should have it, {name}. You\'re out on the line more than anybody."',
      '(You received the Spare Handcar Crank.)',
    ],
  },
];

/** The kids' rescue: where they're hiding, and the territorial cryptid between you and them. */
export const RESCUE = {
  map: 'OLD_GROWTH_AND_SAWMILL' as MapId,
  kids: [[40, 40], [41, 40]] as Array<[number, number]>,
  watcher: 'sheepsquatch',
  found: [
    'Pippa and Sam are huddled behind a stack of rotten lumber, flashlight dying. Pippa\'s chin is up. Sam\'s eyes are huge.',
    'PIPPA: "We were TRACKING. For science. And then something big started breathing and we did the distress whistle like the handbook says."',
    'SAM: "It\'s handbook page three." You walk them home through the dark, one hand each. Neither of them lets go until the porch lights of town.',
    '(The Junior Cryptid Club is very, very grateful. +friendship with Pippa and Sam.)',
  ],
};
