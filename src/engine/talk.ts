/** NPC conversations: greetings, chat & rumors, quest offers / progress / hand-ins, role menus. */
import type { Game } from './game';
import type { NpcRT } from './townsfolk';
import { Dialog, Choice } from '../ui/menus';
import { DonateMenu, MerchantMenu, ShopMenu, StoreMenu } from '../ui/shops';
import { QUESTS, QuestDef } from '../data/quests';
import { rumorFor } from '../data/npcs';
import { DINER_MENU, STORE_STOCK, UPGRADES } from '../data/economy';
import { ITEMS } from '../data/items';
import { stars } from './dex';
import { sfx } from '../audio/sfx';
import { hash2 } from '../util';
import { agnesStory } from './campaign';

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
  indrid_photo: '"...It\'s him. That grin. I\'ll frame it in the studio. Thank you. I think."',
};

function completeQuest(game: Game, q: QuestDef): string[] {
  const p = game.progress;
  switch (q.id) {
    case 'telegraph': game.inv.remove('scrap_copper', 5); game.inv.remove('battery_pack', 1); break;
    case 'mabel_harvest': game.inv.remove('sweet_corn', 5); game.inv.remove('cranberries', 10); break;
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

/** Main entry: the player pressed A facing this NPC. */
export function talkTo(game: Game, npc: NpcRT): void {
  const d = npc.def;
  const p = game.progress;
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
  if (d.id === 'toby' && p.stage('toby') === 1) {
    if (!game.hasWaders()) { game.openOverlay(new Dialog(['Toby: "Help! I\'m stuck on this island!" (You need Bog Waders to reach him.)'])); return; }
    p.setStage('toby', 2);
    sfx.trustChime();
    game.openOverlay(new Dialog(['Toby: "Ranger! I followed a light out here and my boots got stuck. Thank you!"', 'You help Toby through the shallows. He limps toward town. Quest updated: report to Gideon.']));
    return;
  }

  if (d.id === 'agnes' && agnesStory(game)) return;

  // Quest turn-ins and offers
  for (const q of QUESTS) {
    if (!giverMatches(q, d.id) || p.done(q.id)) continue;
    if (p.active(q.id)) {
      if (readyToComplete(game, q)) { game.openOverlay(new Dialog(completeQuest(game, q))); return; }
      continue;
    }
    if (q.after && !p.done(q.after)) continue;
    // Don't stack offers while another quest from this giver is active.
    if (QUESTS.some((o) => giverMatches(o, d.id) && p.active(o.id))) continue;
    const pages = [...(OFFER[q.id] ?? [`${d.name} needs your help.`])];
    game.openOverlay(new Dialog(pages, [
      { label: 'Accept', fn: () => { p.setStage(q.id, 1); sfx.confirm(); game.toast(`New quest: ${q.title}`); } },
      { label: 'Not now', fn: () => undefined },
    ]));
    return;
  }

  const greet = d.greet[Math.floor(hash2(game.clock.day, d.name.length, 7) * d.greet.length)];
  const active = QUESTS.find((q) => giverMatches(q, d.id) && p.active(q.id));
  const pages = [`${d.name}: "${greet.replace(/^"|"$/g, '')}"`];
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
      choices.push({ label: 'Menu', fn: () => game.openOverlay(new ShopMenu('WHISTLE-STOP DINER', () => DINER_MENU)) });
      break;
    case 'gideon':
      choices.push({ label: 'Shop', fn: () => game.openOverlay(new StoreMenu(STORE_STOCK)) });
      break;
    case 'ezri':
    case 'pike':
      choices.push({ label: 'Wares', fn: () => game.openOverlay(new MerchantMenu(d.id as 'ezri' | 'pike')) });
      break;
  }
  choices.push({ label: 'Chat', fn: chat }, { label: 'Bye', fn: () => undefined });
  game.openOverlay(new Dialog(pages, choices));
}
