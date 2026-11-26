/**
 * Campaign tracker for "The Signal on Radio Ridge". Objectives are derived
 * from existing game state (garden, Dex, donations, exploration) so free-roam
 * play is never blocked; only story beats (act cards, the decode scene, the
 * radio call and the finale) are scripted here.
 */
import type { Game } from './game';
import { ACT_TITLES, WARDENS, JOURNAL_PAGES, ACT4_CALL, DECODE_SCENE } from '../data/campaign';
import { CRYPTID_BY_ID } from '../data/cryptids';
import type { MapId } from '../data/mapgen';
import { dexTotals } from './dex';
import { Dialog } from '../ui/menus';
import { ActCard } from '../ui/intro';
import { sfx } from '../audio/sfx';

export interface Objective {
  text: string;
  done: boolean;
}

const WARDEN_HINT: Record<string, string> = {
  sasquatch: '3 Lure Totems in the Old Growth, visit one at dusk',
  wendigo: 'Bone & Antler Chime, Old Growth, foggy/snowy Witching Hour',
  thunderbird: 'Radio Ridge in a thunderstorm (a Lightning Rod helps)',
  awful: 'Radio Ridge High Cliffs at dawn, or in any storm',
};

export function pagesFound(game: Game): number {
  return [...game.progress.pages].filter((p) => p > 0).length;
}

export function objectives(game: Game, act: number): Objective[] {
  const p = game.progress;
  const yard = game.getMap('CABIN_YARD');
  const visited = (m: MapId) => p.visited.has(m);
  const tot = dexTotals(game.dex);
  switch (act) {
    case 1:
      return [
        { text: "Read Ranger Vance's Field Journal (cabin table)", done: p.flags.has('journal') },
        { text: `Clear the overgrown garden (${yard.plotsCleared()}/16 plots)`, done: yard.plotsCleared() >= 16 },
        { text: 'Grow and harvest your first lure crop', done: game.stats.harvested >= 1 },
        { text: 'Explore Pine Trail & Orchard', done: visited('PINE_TRAIL_AND_ORCHARD') },
        { text: 'Meet Agnes at the Historical Society in town', done: p.flags.has('agnes') },
        { text: `Log your first cryptid (${tot.logged}/1)`, done: tot.logged >= 1 },
      ];
    case 2: {
      const list: Objective[] = [
        { text: 'Explore the Cranberry Bog & Springs', done: visited('CRANBERRY_BOG_AND_SPRINGS') },
        { text: 'Explore the Old Growth & Sawmill', done: visited('OLD_GROWTH_AND_SAWMILL') },
        { text: `Find torn journal pages in the wilds (${Math.min(4, pagesFound(game))}/4)`, done: pagesFound(game) >= 4 },
        { text: `Reach 24 Historical Society donations (${p.donations}/24)`, done: p.donations >= 24 },
        { text: 'Attend the Folklore Festival (Sunday night, Town Square)', done: p.flags.has('festival') },
      ];
      if (list.every((o) => o.done)) list.push({ text: "Talk to Agnes: Clara has news about Elias's map", done: false });
      return list;
    }
    case 3:
      return WARDENS.map((id) => ({ text: `Log ${CRYPTID_BY_ID[id].name}: ${WARDEN_HINT[id]}`, done: game.dex[id].logged }));
    case 4:
      return [
        { text: 'Carry a Static Radio (craft it at your Porch Workbench)', done: game.inv.count('static_radio') > 0 },
        { text: 'Use the Static Radio at the Radio Ridge Crossroads in the Witching Hour', done: false },
      ];
    default:
      return [
        { text: `Reach 32 donations: Town Restoration Grant (${p.donations}/32)`, done: p.donations >= 32 },
        { text: 'Inspect the reopened Coal Mine gate', done: p.flags.has('mine') },
        { text: `Complete the Cryptid-Dex (${tot.entries}/72)`, done: tot.entries >= 72 },
        { text: `Recover every journal page (${pagesFound(game)}/${JOURNAL_PAGES.length - 1})`, done: pagesFound(game) >= JOURNAL_PAGES.length - 1 },
      ];
  }
}

export function setAct(game: Game, act: number): void {
  game.progress.act = act;
  const [num, title] = ACT_TITLES[act];
  sfx.fanfare();
  game.openOverlay(new ActCard(num, title));
}

/** Called a few times a second during free-roam: advances acts when goals are met. */
export function campaignTick(game: Game): void {
  const p = game.progress;
  if (game.overlays.length || game.fading) return;
  // Festival attendance: be in the Town Square on a festival night.
  if (!p.flags.has('festival') && game.isFestival() && game.cur.id === 'PINE_HOLLOW_TOWN') {
    const t = game.player;
    if (t.tx >= 30 && t.tx <= 46 && t.ty >= 24 && t.ty <= 35) {
      p.flags.add('festival');
      game.toast('You join the Folklore Festival! Ask Agnes about Elias soon.');
    }
  }
  if (p.act === 1 && objectives(game, 1).every((o) => o.done)) setAct(game, 2);
  else if (p.act === 3 && objectives(game, 3).every((o) => o.done)) {
    p.act = 4;
    sfx.alert();
    game.openOverlay(new Dialog([...ACT4_CALL]));
    game.openOverlay(new ActCard(...ACT_TITLES[4]));
  }
}

/** Agnes conversation hook: the Act II -> III decode scene. Returns true if it played. */
export function agnesStory(game: Game): boolean {
  const p = game.progress;
  p.flags.add('agnes');
  if (p.act !== 2) return false;
  const act2 = objectives(game, 2).filter((o) => !o.text.startsWith('Talk to Agnes'));
  if (!act2.every((o) => o.done)) return false;
  p.act = 3;
  sfx.open();
  game.openOverlay(new ActCard(...ACT_TITLES[3]));
  game.openOverlay(new Dialog([...DECODE_SCENE, 'Elias\'s final survey map is copied into your journal. ACT III: log the four Wardens.']));
  return true;
}
