/** NPC conversations: greetings, chat & rumors, quest offers / progress / hand-ins, role menus. */
import { O } from '../data/tiles';
import { oriTalk } from './orientation';
import { isBirthday, birthdayLine, eventOn } from './calendar';
import { barkFor } from './barks';
import type { Game } from './game';
import type { NpcRT } from './townsfolk';
import { kidsHiding, rescueKids } from './heartScenes';
import { Dialog, Choice } from '../ui/menus';
import { DonateMenu, MerchantMenu, ShopMenu, StoreMenu } from '../ui/shops';
import { QUESTS, QuestDef } from '../data/quests';
import { rumorFor } from '../data/npcs';
import { DINER_MENU, STORE_STOCK, UPGRADES, BAKERY_STOCK, HERB_STOCK } from '../data/economy';
import { ITEMS } from '../data/items';
import { stars } from './dex';
import { sfx } from '../audio/sfx';
import { hash2 } from '../util';
import { agnesStory } from './campaign';
import { INSPECTOR_OPEN, INSPECTOR_CHOICES, INSPECTOR_CLOSE, INSPECTOR_FESTIVAL } from '../data/campaign';
import { dailyChat, giftable, giftedToday, giveGift, hearts } from './friends';
import { isFriend } from '../data/friends';

/** Quest givers (Sam shares Pippa's club quests). */
function giverMatches(q: QuestDef, npcId: string): boolean {
  return q.giver === npcId || (q.giver === 'pippa' && npcId === 'sam');
}

/** Can the active quest be turned in right now? */
function readyToComplete(game: Game, q: QuestDef): boolean {
  const p = game.progress, inv = game.inv, dex = game.dex;
  const st = p.stage(q.id);
  switch (q.id) {
    case 'buster': return st === 2;
    case 'toby': return st === 2;
    case 'sketchbook': return st === 2;
    case 'telegraph': return inv.count('scrap_copper') >= 5 && inv.count('battery_pack') >= 1;
    case 'mabel_harvest': return inv.count('sweet_corn') >= 5 && inv.count('cranberries') >= 10;
    case 'nightcrawler_photo': return dex.nightcrawler.photo;
    case 'albatwitch': return dex.albatwitch.logged;
    case 'wampa_survey': return dex.wampahoofus.logged && dex.wampahoofus.cast;
    case 'howler_audio': return stars(dex.ozark_howler) >= 2;
    case 'indrid_photo': return dex.indrid_cold.photo;
    case 'ramp_run': return inv.count('wild_onion') >= 5;
    case 'gideon_slag': return inv.count('scrap_copper') >= 6 && inv.count('crushed_quartz') >= 3;
    case 'wisp_tape': return dex.wisp.logged;
    case 'antler_hunt': return inv.count('frost_rim_antler') >= 1;
    case 'storm_rod': return game.getMap('RADIO_RIDGE_AND_CROSSROADS').countPlaced(O.ROD) > 0;
    default: return false;
  }
}

const OFFER: Record<string, string[]> = {
  buster: ['"Ranger! Buster slipped his collar chasing a rabbit -- one with ANTLERS -- down Pine Trail. He\'s never been gone this long."', '"Follow his pawprints from the east road. Please bring my boy home."'],
  telegraph: ['"Buster\'s home, so I\'ve got time to fix the old telegraph. If it worked, I could post sighting reports from all down the line."', '"Bring me 5 Scrap Copper and an Ionized Battery Pack. The sawmill and the mine slag have copper aplenty."'],
  toby: ['"My apprentice Toby went into the Cranberry Glades after a floating light. That was yesterday. He hasn\'t come back."', '"His boot tracks start at the west boardwalk. You\'ll want Bog Waders. I sell them. ...I\'ll owe you, Ranger."'],
  sketchbook: ['Pippa: "Ranger! Our club sketchbook is GONE. All our drawings! We were near the Hoop Snake meadow on Pine Trail."', 'Sam: "The wind took some pages too. Three of them. They\'re red. The book. Not the pages."'],
  nightcrawler_photo: ['Pippa: "The club needs proof. A GOLD photo of a Fresno Nightcrawler. They walk near your cabin at night!"', 'Sam: "Get its Trust up first or the flash scares it. That\'s what Dr. Okafor says."'],
  mabel_harvest: ['"Festival pie season, hon! I need 5 Sweet Corn and 10 Cranberries from that garden of yours."', '"You bring me the fixings, I\'ll pay you fair and save you a pie."'],
  albatwitch: ['"Something keeps stealing my orchard apples at dusk. Little hairy thing, quick as a cat."', '"Agnes calls it an Albatwitch. Log the little thief and I\'ll make it worth your while."'],
  wampa_survey: ['"The Society\'s Wampahoofus records are a scandal. Two sketches and a hoofprint that might be a cow."', '"Log one up on Radio Ridge and bring me a Plaster Cast of its tracks. Science, dear!"'],
  howler_audio: ['"My listeners keep calling about the howling on the ridge. I need AUDIO, Ranger. Real recordings."', '"Earn the Ozark Howler\'s behavior entry. A Static Radio or Parabolic Dish will cut through that roar."'],
  ramp_run: ['"Honey, the Ramp Feed\'s coming and my frying arm is out of practice. Bring me five bunches of ramps?"', '"They come up wild in the shade: your cabin nook, Pine Trail, the edges of the Glades. Smell for them."'],
  gideon_slag: ['"Toby\'s home and eating me out of house and forge. I need stock. Six scrap copper, three crushed quartz."', '"The old mine slag heaps are full of it. Sawmill rafters too. Bring it and I\'ll make you something worth having."'],
  wisp_tape: ['"For the night show I need the lights over the Glades. The real ones, not swamp gas. Log a Will-o\'-the-Wisp for me."', '"Clear or foggy nights. Don\'t follow them off the boardwalk. Ruth\'s rule, and a good one."'],
  antler_hunt: ['"Elias wrote about antlers rimed with frost that never melts. The Wendigo\'s chime needs one. I\'ve never seen one with my own eyes."', '"They turn up in the Old Growth leaf litter, he says. Find one and show me, dear? I\'ll trade you silk for the chime."'],
  storm_rod: ['"Elias rigged that tower to pull lightning down on purpose. Ridge has been storming wrong ever since. A proper Lightning Rod would bleed it off."', '"Three copper and a nail at your workbench. Plant it on the ridge, and you\'ll have the big bird\'s attention next storm, too."'],
  indrid_photo: ['"One last thing. The man in green at the Crossroads. Indrid Cold. Witching Hour, clear or foggy nights."', '"Get me a Gold Photo. Nobody has ever gotten one. Nobody has ever wanted to."'],
};

const DONE_TEXT: Record<string, string> = {
  buster: '"BUSTER! Who\'s a good boy! ...Thank you, Ranger. Truly. Take these, and this venison -- Buster won\'t miss it."',
  telegraph: '"Dot-dash-dot! She sings again! I\'ll wire sighting reports to the Bulletin Board every morning."',
  toby: '"Toby\'s home. Shaken, muddy, alive. Hand me that Machete -- I\'ll put a proper edge on it. No charge."',
  sketchbook: 'Pippa: "OUR SKETCHBOOK! You\'re an honorary club member now!" Sam: "That means you get seeds."',
  nightcrawler_photo: 'Sam: "It\'s PERFECT. Look at those LEGS." Pippa: "This is going on the clubhouse wall."',
  mabel_harvest: '"Look at this corn! You\'ve got a green thumb, hon. Here -- payment, and two slices of the good pie."',
  albatwitch: '"So THAT\'S my thief. Cute little bandit. Here, take some cider. Don\'t let it near the apples."',
  wampa_survey: '"A proper cast! Look at the asymmetry! The Society thanks you, Ranger. Here, quartz from the archive."',
  howler_audio: '"Listen to that roar on the playback! The station phones will melt tonight. Take these batteries."',
  ramp_run: '"Oh, these are beauties. Now get out of my kitchen before you smell like them too. Too late. Here, bread."',
  gideon_slag: '"Good haul. Here: a Brass Bell. I cast it myself. Ring it like you mean it."',
  wisp_tape: '"Look at it on the monitor. That\'s not marsh gas. That\'s a lantern with nobody holding it. Tonight\'s show is going to be something."',
  antler_hunt: '"Oh my. It\'s cold. Truly cold, in July. Keep it for the chime, dear, and take this silk. Elias would be... well. He\'d be glad."',
  storm_rod: '"Felt the static drop from down here. My knees stopped aching. That\'s science. Here, copper for the next one."',
  indrid_photo: '"...It\'s him. That grin. I\'ll frame it in the studio. Thank you. I think."',
};

function completeQuest(game: Game, q: QuestDef): string[] {
  const p = game.progress;
  switch (q.id) {
    case 'telegraph': game.inv.remove('scrap_copper', 5); game.inv.remove('battery_pack', 1); break;
    case 'mabel_harvest': game.inv.remove('sweet_corn', 5); game.inv.remove('cranberries', 10); break;
    case 'ramp_run': game.inv.remove('wild_onion', 5); break;
    case 'gideon_slag': game.inv.remove('scrap_copper', 6); game.inv.remove('crushed_quartz', 3); break;
    case 'toby': {
      const lv = p.tools.machete;
      if (lv < UPGRADES.machete.length - 1) { p.tools.machete = lv + 1; }
      break;
    }
  }
  p.complete(q.id);
  game.gold += q.reward.gold;
  for (const [id, n] of q.reward.items ?? []) game.inv.add(id, n);
  sfx.fanfare();
  const items = (q.reward.items ?? []).map(([id, n]) => `${n} ${ITEMS[id].name}`).join(', ');
  const lines = [DONE_TEXT[q.id] ?? 'Thank you!', `QUEST COMPLETE: ${q.title}. +${q.reward.gold}g${items ? `, ${items}` : ''}.`];
  if (q.reward.note) lines.push(q.reward.note);
  if (q.id === 'toby') lines.push(`Your Machete is now a ${UPGRADES.machete[p.tools.machete].name}!`);
  return lines;
}

/** Matthias shows you how to carve a Fasnacht mask (Workbench BLUEPRINTS tab). */
function teachMasks(game: Game): void {
  game.progress.flags.add('taught_masks');
  sfx.trustChime();
  game.openOverlay(new Dialog([
    'Matthias: "You want to learn? Really? Okay. Okay! Sit."',
    'He puts a block of linden in your hands and a knife in the other. "Don\'t carve a face. Find the one that\'s already in there. Big cuts first. Eyes last. The eyes are where it wakes up."',
    'An hour later you have something with two eyes, a nose, and a great deal of attitude. Matthias holds it up to the light. "A goat. Definitely a goat. A good one!"',
    '(You can carve Goat, Owl and Bear Fasnacht masks at the Porch Workbench, on the BLUEPRINTS tab. They go straight to your wardrobe.)',
  ]));
}

/** Main entry: the player pressed A facing this NPC. */
/** How each friend says hello once they know you. */
const NAME_HELLO: Record<string, string> = {
  agnes: 'Good afternoon, {name}, dear.', barnaby: 'Well, if it isn\'t {name}!', mabel: '{name}! Sit down, hon, you look starved.',
  gideon: '{name}.', clara: 'This is WKPB, and that\'s {name} walking in!', pippa: '{name}! Club meeting! Sort of!',
  sam: 'Hi, {name}.', toby: 'Hey, {name}!', ruth: 'There\'s my {name}.',
  liesl: 'Ah, {name}! Come, come, the oven is hot.', matthias: 'Hey, {name}.', walter: 'Gruss Gott, {name}!',
};

export function talkTo(game: Game, npc: NpcRT): void {
  const d = npc.def;
  const p = game.progress;
  if (npc.inBed) {
    sfx.blip();
    const first = d.name.split(' ')[0].replace(/"/g, '');
    game.openOverlay(new Dialog([d.kind === 'dog'
      ? 'Buster is curled up asleep, paws twitching. He\'s chasing something in his dreams.'
      : [`${first} is fast asleep. Better let them be.`, `${first} snores softly and mumbles something about ${d.id === 'mabel' ? 'biscuits' : d.id === 'gideon' ? 'hinges' : d.id === 'barnaby' ? 'the 4:15' : d.id === 'agnes' ? 'accession numbers' : 'Mothman'}.`][game.clock.day % 2]]));
    return;
  }
  // face the player
  const dx = game.player.tx - npc.tx, dy = game.player.ty - npc.ty;
  npc.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
  npc.talkT = 4;
  sfx.blip();

  if (d.id === 'buster') {
    if (p.stage('buster') === 1) {
      p.setStage('buster', 2);
      sfx.trustChime();
      game.openOverlay(new Dialog(['Buster! The bloodhound licks your hand, howls once, and bolts east toward town.', 'Quest updated: tell Barnaby at the station.']));
      return;
    }
    game.openOverlay(new Dialog([d.greet[Math.floor(hash2(game.clock.day, 3, 1) * d.greet.length)]]));
    return;
  }
  if (d.id === 'inspector') { inspectorTalk(game); return; }
  if (d.id === 'toby' && p.stage('toby') === 1) {
    if (!game.hasWaders()) { game.openOverlay(new Dialog(['Toby: "Help! I\'m stuck on this island!" (You need Bog Waders to reach him.)'])); return; }
    p.setStage('toby', 2);
    sfx.trustChime();
    game.openOverlay(new Dialog(['Toby: "Ranger! I followed a light out here and my boots got stuck. Thank you!"', 'You help Toby through the shallows. He limps toward town. Quest updated: report to Gideon.']));
    return;
  }

  // The kids, lost at the sawmill past curfew.
  if ((d.id === 'pippa' || d.id === 'sam') && kidsHiding(game, d.id)) { rescueKids(game); return; }

  // Ranger Orientation: the giver of your current errand hands it over.
  const ori = oriTalk(game, d.id);
  if (ori) { dailyChat(game, d.id); game.openOverlay(new Dialog(ori)); return; }

  // Friendship: the first chat each day counts; reaching a heart level plays its scene on top.
  const scenes = dailyChat(game, d.id);
  const showScenes = () => { for (const s of [...scenes].reverse()) { sfx.trustChime(); game.openOverlay(new Dialog(s)); } };

  if (d.id === 'agnes' && agnesStory(game)) { showScenes(); return; }

  // Quest turn-ins and offers
  for (const q of QUESTS) {
    if (!giverMatches(q, d.id) || p.done(q.id)) continue;
    if (p.active(q.id)) {
      if (readyToComplete(game, q)) { game.openOverlay(new Dialog(completeQuest(game, q))); showScenes(); return; }
      continue;
    }
    if (q.after && !p.done(q.after)) continue;
    if (q.minAct && p.act < q.minAct) continue;
    // Don't stack offers while another quest from this giver is active.
    if (QUESTS.some((o) => giverMatches(o, d.id) && p.active(o.id))) continue;
    const pages = [...(OFFER[q.id] ?? [`${d.name} needs your help.`])];
    game.openOverlay(new Dialog(pages, [
      { label: 'Accept', fn: () => { p.setStage(q.id, 1); sfx.confirm(); game.toast(`New quest: ${q.title}`); } },
      { label: 'Not now', fn: () => undefined },
    ]));
    showScenes();
    return;
  }

  // What they say first depends on what they're up to (at home, on a break, fishing your pond, rain...).
  const w = game.weatherNow();
  const tag = npc.map === npc.stop?.map ? npc.stop?.tag : undefined;
  const pool = (tag && d.lines?.[tag]) || ((w === 'RAIN' || w === 'STORM') && d.lines?.rain) || d.greet;
  // Something on their mind (a gathering, your news, last night's storm) comes before the usual hello.
  const greet = barkFor(game, d.id) ?? pool[Math.floor(hash2(game.clock.day, d.name.length + game.talkCount(d.id), 7) * pool.length)];
  const active = QUESTS.find((q) => giverMatches(q, d.id) && p.active(q.id));
  const pages = [`${d.name}: "${greet.replace(/^"|"$/g, '')}"`];
  // Friends greet you by name now and then.
  if (isFriend(d.id) && hearts(game, d.id) >= 3 && game.appearance.name && hash2(game.clock.day, d.name.length, 13) < 0.5) {
    pages.unshift(`${d.name.split(' ')[0].replace(/"/g, '')}: "${NAME_HELLO[d.id] ?? 'Hey there, {name}.'}"`);
  }
  if (active) pages.push(`(Quest: ${active.steps[Math.max(0, p.stage(active.id) - 1)]})`);

  const chat = (): void => {
    const line = d.chat[Math.floor(hash2(game.clock.day, game.talkCount(d.id), 5) * d.chat.length)];
    const r = rumorFor(d, game.clock.day);
    game.markRumor(r.cryptid);
    game.openOverlay(new Dialog([line, r.text, '(Rumor noted in your Cryptid-Dex.)']));
  };
  const choices: Choice[] = [];
  switch (d.id) {
    case 'agnes':
      choices.push({ label: 'Donate', fn: () => game.openOverlay(new DonateMenu()) });
      break;
    case 'mabel':
      // 4 hearts with Mabel: family prices. The kitchen's only open while she's in it.
      if (npc.map === 'DINER_INT') choices.push({ label: 'Menu', fn: () => game.openOverlay(new ShopMenu('WHISTLE-STOP DINER', () => p.flags.has('diner_discount') ? DINER_MENU.map((e) => ({ ...e, cost: Math.round(e.cost * 0.75) })) : DINER_MENU)) });
      else pages.push(tag === 'break' ? '(Mabel\'s on her break. The kitchen opens back up at 2:30.)' : '(The diner\'s closed. Mabel cooks from 6:15 in the morning till 9 at night.)');
      break;
    case 'gideon':
      // Shop at the counter, or while he's working the anvil out by the store.
      if (npc.map === 'STORE_INT' || tag === 'anvil') choices.push({ label: 'Shop', fn: () => game.openOverlay(new StoreMenu(STORE_STOCK)) });
      else pages.push(tag === 'lunch' ? '(The Outfitter\'s closed for lunch till 1.)' : tag === 'fishing' ? '(The Outfitter closes Sunday afternoons.)' : '(The Outfitter is open 8 to 5, lunch 12 to 1. Late afternoons, Gideon works his anvil outside the store.)');
      break;
    case 'liesl':
      if (tag === 'bakery' || npc.map === 'HOUSE_MEISSGEIER') choices.push({ label: 'Bakery', fn: () => game.openOverlay(new ShopMenu("OMI LIESL'S BAKERY", () => BAKERY_STOCK)) });
      else pages.push('(Omi\'s bakery: Saturdays 9 to 1 in the Town Square, and weekday mornings at the diner till 11. Or knock, once she knows you.)');
      break;
    case 'walter':
      if (tag === 'drying' || tag === 'herbs' || npc.map === 'HOUSE_MEISSGEIER') choices.push({ label: 'Herbs', fn: () => game.openOverlay(new ShopMenu("OPA WALTER'S HERBS", () => HERB_STOCK)) });
      break;
    case 'matthias':
      // He'll show you how to carve a Fasnacht mask once he knows you a little (or any time on Fasnacht).
      if (!p.flags.has('taught_masks') && (hearts(game, 'matthias') >= 1 || eventOn(game.clock.day)?.id === 'fasnacht')) choices.push({ label: 'Carve a mask?', fn: () => teachMasks(game) });
      break;
    case 'ezri':
    case 'pike':
      choices.push({ label: 'Wares', fn: () => game.openOverlay(new MerchantMenu(d.id as 'ezri' | 'pike')) });
      break;
  }
  // Gift whatever you're holding (one gift per person per day).
  const held = game.selected;
  if (isFriend(d.id) && held && giftable(held.id) && !giftedToday(game, d.id)) {
    const fid = d.id;
    choices.unshift({ label: 'Gift', fn: () => {
      const cur = game.selected;
      if (!cur || cur.id !== held.id) return;
      game.inv.removeAt(game.sel, 1);
      const r = giveGift(game, fid, d.name, held.id);
      sfx.confirm();
      // Scenes go underneath so the reaction shows first.
      for (const s of [...r.scenes].reverse()) game.openOverlay(new Dialog(s));
      if (r.scenes.length) sfx.trustChime();
      game.openOverlay(new Dialog(r.pages));
    } });
  }
  // Elias isn't one for gifts, except on his birthday.
  if (d.id === 'vance' && held && giftable(held.id) && isBirthday(game, 'vance') && p.days.eliasBday !== game.clock.day) {
    choices.unshift({ label: 'Birthday gift', fn: () => {
      const cur = game.selected;
      if (!cur || cur.id !== held.id) return;
      game.inv.removeAt(game.sel, 1);
      p.days.eliasBday = game.clock.day;
      sfx.trustChime();
      game.openOverlay(new Dialog([`ELIAS: "${birthdayLine('vance')}"`]));
    } });
  }
  choices.push({ label: 'Chat', fn: chat }, { label: 'Bye', fn: () => undefined });
  game.openOverlay(new Dialog(pages, choices));
  showScenes();
}

/** Harlan Pruitt, County Office of Consolidation: the town's future rides on what you tell him. */
function inspectorTalk(game: Game): void {
  const p = game.progress;
  if (!p.flags.has('inspector_done')) {
    game.openOverlay(new Dialog([...INSPECTOR_OPEN], INSPECTOR_CHOICES(p.reason).map((c) => ({
      label: c.label,
      fn: () => {
        p.flags.add('inspector_done');
        sfx.confirm();
        game.openOverlay(new Dialog([...c.reply, ...INSPECTOR_CLOSE]));
      },
    }))));
    return;
  }
  if (game.isFestival() && !p.flags.has('funded')) {
    p.flags.add('funded');
    sfx.trustChime();
    game.openOverlay(new Dialog([...INSPECTOR_FESTIVAL, '(Pine Hollow keeps its branch line, its school bus and its post office.)']));
    return;
  }
  game.openOverlay(new Dialog(['Pruitt: "Don\'t mind me. Just counting things."']));
}
