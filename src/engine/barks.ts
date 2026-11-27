/**
 * Reactive one-liners: before their usual greeting, townsfolk remark on what's
 * been happening. Your first Mothman, a rare variant, a Warden at peace, the coat
 * you're wearing, new gear, a restoration, last night's storm, or you wandering
 * about past midnight.
 *
 * Each remark is remembered per person in the save (`progress.barks`): milestone
 * and outfit remarks are said once, weather ones at most once a day, so nobody
 * repeats themselves.
 */
import type { Game } from './game';
import { CRYPTID_BY_ID } from '../data/cryptids';
import { ITEMS } from '../data/items';
import { eventLine, isBirthday } from './calendar';

type Lines = Partial<Record<string, string>> & { _: string };

const MOTHMAN: Lines = {
  _: 'Heard you logged the Mothman. In Point Pleasant they\'d throw you a parade.',
  agnes: 'The Mothman! Logged! I had to sit down when Clara told me. Sixty years of reports and you just... asked it nicely.',
  clara: 'You got the Mothman on tape. I\'ve listened to your field notes four times. I may cry on air tonight.',
  barnaby: 'Saw your Mothman entry. My cousin saw it in \'66 and never drove that bridge again. You went toward it.',
  pippa: 'THE MOTHMAN. Sam fainted. A little.',
  sam: 'I didn\'t faint. I sat down very fast.',
  mabel: 'Mothman! I\'m naming a pie after you. Red-eye cherry. It\'s going to be terrible and everyone will order it.',
};
const RARE: Lines = {
  _: 'Word is you logged a rare {cryptid}. The whole diner was talking about it.',
  agnes: 'A rare {cryptid}! Do you know how many of those the Society has records of? None. Now one.',
  clara: 'A {variant} {cryptid}. The odds on that are absurd. I ran them twice.',
  pike: 'A {variant} specimen! Splendid! Did it hum? Tell me it hummed.',
  pippa: 'A {variant} {cryptid}!! The Club logbook needs a new page. And glitter.',
  gideon: 'Rare one, I hear. {cryptid}. Good eye.',
};
const WARDEN: Lines = {
  _: 'They\'re saying the {cryptid} let you near it. The woods feel different. Quieter, in a good way.',
  agnes: 'The {cryptid}. Elias spent years trying to get close to it, and you did it by being kind. I don\'t know whether to laugh or cry, dear.',
  gideon: '{cryptid}, settled. I can sleep without the forge lit, maybe.',
  barnaby: 'The {cryptid}, at peace with us. Elias would want to know. ...I\'ll tell him on the radio.',
  ruth: 'Ruth heard you made peace with the {cryptid}. My Walter always said the old ones just wanted manners.',
  clara: 'The static on the ridge dropped twelve decibels the night you logged the {cryptid}. I\'m not saying that\'s connected. I\'m saying it\'s data.',
};
const COAT: Lines = {
  _: 'That coat... that\'s Elias\'s, isn\'t it? It suits you.',
  mabel: 'Well, look at you in that coat. I patched those elbows twice. Wear it in good health, hon. He\'d want somebody to.',
  agnes: 'Oh. Elias\'s coat. For a second, from the back, I... never mind me. It suits you, dear. It always did want a ranger in it.',
  barnaby: 'Elias\'s old coat! Thought I saw him coming up the street. Gave me a turn.',
  gideon: 'That coat. Left elbow\'s my patch. The ugly one.',
};
const GEAR: Record<string, string> = {
  parabolic_dish: 'That\'s a Parabolic Dish on your pack. Pike\'s design, but the welds are sloppy. Bring it by and I\'ll true it up for free.',
  chronos_shutter: 'Chronos Shutter on your camera? Pike\'s fancy work. Quiet as a held breath, that thing.',
  static_radio: 'Static Radio. Good build. Keep the battery dry and it\'ll outlive both of us.',
  thermal_lens: 'Thermal Lens. Fog won\'t hide much from you now.',
  silver_bell: 'Silver Bell, eh? Clearer ring than the brass. The old ones respect a true note.',
  brass_bell: 'You\'ve got a Brass Bell. Ring it like you mean it. Half-hearted ringing just annoys things.',
  scent_mask: 'Scent Mask. Smart. The Skunk Ape will still find you, but you won\'t mind as much.',
};
const PROJECT: Record<string, Lines> = {
  proj_neon: {
    _: 'Did you see the diner sign last night? E-A-T, all three letters. I about drove into the ditch.',
    mabel: 'Hon, I stood in the street last night and just looked at it. All three letters. Story Hour this Friday, and you\'re coming.',
    ruth: 'The EAT sign\'s lit. Walter proposed to me under that sign. The A was out then, too.',
    toby: 'The neon\'s on! I can see it from my loft window. I counted the buzzes. There are a lot.',
  },
  proj_station: {
    _: 'The station roof\'s patched and the signal lamp\'s burning. Feels like the town remembered something.',
    barnaby: 'Signal lamp\'s lit. Red on the line all night. I stood on that platform till two in the morning, Ranger, and I\'m not ashamed of it.',
    agnes: 'The station has a roof again. Barney hasn\'t stopped smiling. It\'s unnerving.',
    gideon: 'Five nails I\'d have put different. Otherwise, sound work.',
  },
  proj_gazebo: {
    _: 'The gazebo! Come Sunday afternoon, the whole town\'s playing. Bring your feet.',
    ruth: 'Sundays we play. I\'ve got my mandolin restrung for the first time in eleven years.',
    pippa: 'The gazebo is the new Club HQ. Grandma Ruth says no. We\'re appealing.',
    gideon: 'Ridgepole\'s true to a sixteenth. Toby helped. Don\'t tell him I said so.',
  },
  mine_open: {
    _: 'The lamp house is lit. First time since \'78. People keep walking up the hill just to look at it.',
    gideon: 'I put my hand on the boards last night. The hum\'s still there. But it doesn\'t sound lonely anymore.',
    ruth: 'They brought Walter\'s tag down off the board. It\'s in my cedar box now, where it belongs.',
    agnes: 'Danny\'s check came down off the lamp-house board. Elias held it all night. Thank you, dear.',
  },
};
const STORM: Lines = {
  _: 'Some storm last night, eh? Thought the roof was coming off.',
  barnaby: 'Storm took a limb off the big oak by the station. Missed the platform by a hair. Old girl\'s lucky.',
  mabel: 'Power flickered three times last night. I baked by lantern. The biscuits came out better, honestly.',
  gideon: 'Lightning hit the ridge four times. I counted. Clara\'s tower took one of them.',
  clara: 'Did you hear the ridge last night? The static was singing. I got forty minutes of it on tape.',
  ruth: 'My hens are all accounted for after that storm. I went out in my nightgown to check. Don\'t tell anybody.',
  pippa: 'The storm was SO loud. Sam slept under the table.', sam: 'It was a strategic location.',
};
const FOG: Lines = {
  _: 'That fog last night was thick enough to stand a spoon in.',
  agnes: 'Foggy night like that, my grandmother would say the hollow was dreaming. I believe her more every year.',
  barnaby: 'Couldn\'t see the signal post from the platform last night. Fog that thick, the old engineers rang the bell every hundred yards.',
  clara: 'Fog nights, the Quiet Zone gets even quieter. You can hear your own heartbeat in the static.',
  toby: 'I saw lights in the fog last night. Floating. I\'m pretty sure. I didn\'t follow them this time!',
};
const LATE: Lines = {
  _: 'Out past midnight, Ranger? The woods are more awake than the town at this hour.',
  clara: 'Burning the midnight oil too? Welcome to the night shift. The good calls come in after one.',
  gideon: 'Can\'t sleep either? Forge is banked. Hum\'s quiet tonight.',
  barnaby: 'You should be in bed. So should I. Neither of us is, so.',
};
const BIRTHDAY: Lines = {
  _: 'Big day today, you know. Just saying.',
  agnes: 'Today\'s my birthday, dear. I don\'t make a fuss. I just mention it, quietly, to everyone.',
  barnaby: 'Birthday today. Buster got me a stick. Best present I\'ve had in years.',
  mabel: 'It\'s my birthday, hon, and I\'m still flipping pancakes. Story of my life.',
  gideon: 'Birthday. Toby forgot again. I\'m not hurt. I\'m a little hurt.',
  clara: 'Guess whose birthday it is! I\'m playing my own request line all night.',
  pippa: 'IT\'S MY BIRTHDAY. I am nine and three-quarters today. Well, ten. TEN.',
  sam: 'It\'s my birthday. You don\'t have to do anything. But you could.',
  toby: 'It\'s my birthday! Nobody ever remembers. That\'s fine. It\'s fine!',
  ruth: 'Eighty-one years today, honey. Every one of them earned.',
  vance: 'Birthday. Agnes threatened me with a cake. I\'m hiding out here.',
};

function pick(lines: Lines, id: string): string { return lines[id] ?? lines._; }

/** Most recent day marked under a prefix (e.g. "m_rare_"), with the key's suffix. */
function latest(game: Game, prefix: string): [string, number] | null {
  let best: [string, number] | null = null;
  for (const [k, d] of Object.entries(game.progress.days)) if (k.startsWith(prefix) && (!best || d > best[1])) best = [k.slice(prefix.length), d];
  return best;
}

/**
 * The line a townsperson opens with, or null for their usual greeting.
 * Marks it said, so it doesn't come round again.
 */
export function barkFor(game: Game, id: string): string | null {
  const day = game.clock.day, p = game.progress;
  const said = (key: string) => p.barks[`${id}:${key}`] !== undefined;
  const saidToday = (key: string) => p.barks[`${id}:${key}`] === day;
  const say = (key: string, line: string) => { p.barks[`${id}:${key}`] = day; return line; };
  const recent = (d: number | undefined, span = 3) => d !== undefined && day - d >= 0 && day - d <= span;

  // A gathering in progress: talk about that.
  const ev = eventLine(game, id);
  if (ev && !saidToday('event')) return say('event', ev);
  // Their birthday.
  if (isBirthday(game, id) && !saidToday('bday')) return say('bday', pick(BIRTHDAY, id));
  // Milestones (for a few days after).
  if (recent(p.days.m_mothman, 5) && !said('mothman')) return say('mothman', pick(MOTHMAN, id));
  const w = latest(game, 'm_warden_');
  if (w && recent(w[1], 5) && !said(`warden_${w[0]}`)) return say(`warden_${w[0]}`, pick(WARDEN, id).replace(/\{cryptid\}/g, CRYPTID_BY_ID[w[0]]?.name ?? 'Warden'));
  const r = latest(game, 'm_rare_');
  if (r && recent(r[1], 3) && !said(`rare_${r[0]}`)) {
    const [cid, variant] = r[0].split(':');
    return say(`rare_${r[0]}`, pick(RARE, id).replace(/\{cryptid\}/g, CRYPTID_BY_ID[cid]?.name ?? 'cryptid').replace(/\{variant\}/g, variant === 'albino' ? 'Albino' : 'Static-Charged'));
  }
  // The day after a restoration (and a couple of days on).
  for (const [flag, lines] of Object.entries(PROJECT)) {
    const d = p.days[`m_${flag}`];
    if (d !== undefined && day > d && day - d <= 3 && !said(flag)) return say(flag, pick(lines, id));
  }
  // What you're wearing / carrying.
  if (game.look.outfit === 'elias_coat' && !said('coat')) return say('coat', pick(COAT, id));
  if (id === 'gideon') for (const [item, line] of Object.entries(GEAR)) if (ITEMS[item] && game.keepsake(item) && !said(`gear_${item}`)) return say(`gear_${item}`, line);
  // Weather and the hour.
  const morning = game.clock.minutes < 12 * 60;
  if (morning && p.days.m_storm === day - 1 && !saidToday('storm')) return say('storm', pick(STORM, id));
  if (morning && p.days.m_fog === day - 1 && !saidToday('fog')) return say('fog', pick(FOG, id));
  if (game.clock.minutes >= 24 * 60 && !saidToday('late')) return say('late', pick(LATE, id).replace('Ranger', '{name}'));
  return null;
}

/** Remember a milestone so townsfolk can react to it. */
export function markMilestone(game: Game, key: string): void { game.progress.days[`m_${key}`] = game.clock.day; }
