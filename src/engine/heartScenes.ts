/**
 * Plays heart scenes (src/data/heartScenes.ts) when you walk into the right
 * place at the right time, and runs the kids' little rescue at the sawmill.
 * At most one heart scene a day, so they land as moments rather than a queue.
 */
import type { Game } from './game';
import type { HeartScene, SceneTime } from '../data/heartScenes';
import { HEART_SCENES, SCENE_CAST, RESCUE } from '../data/heartScenes';
import type { MapId } from '../data/mapgen';
import type { Track } from './progress';
import { layTrail } from './progress';
import { friendState, befriend } from './friends';
import { POINTS_PER_HEART } from '../data/friends';
import { CRYPTID_BY_ID } from '../data/cryptids';
import { eventStop, eveningEventToday } from './calendar';
import { ITEMS } from '../data/items';
import { Dialog } from '../ui/menus';
import { sfx } from '../audio/sfx';

const SCENE_HOLD = 5;

export function sceneTime(game: Game): SceneTime {
  const w = game.weatherNow();
  return { minutes: game.clock.minutes, weekday: game.clock.weekday, wet: w === 'RAIN' || w === 'STORM', fog: w === 'FOG', storm: w === 'STORM' };
}

function pts(game: Game, who: HeartScene['who']): number {
  if (who === 'kids') return Math.max(friendState(game, 'pippa').pts, friendState(game, 'sam').pts);
  return friendState(game, who).pts;
}

/** Earlier scenes for the same person come first. */
function ready(game: Game, s: HeartScene): boolean {
  const f = game.progress.flags;
  if (f.has(`heart_${s.id}`)) return false;
  if (pts(game, s.who) < s.hearts * POINTS_PER_HEART) return false;
  return HEART_SCENES.every((o) => o.who !== s.who || o.hearts >= s.hearts || f.has(`heart_${o.id}`));
}

/** A scene that would play in this home right now (so you're let in for it). */
export function sceneWaitingIn(game: Game, map: MapId): HeartScene | null {
  if (game.progress.days.scene === game.clock.day) return null;
  const t = sceneTime(game);
  // Only if they're actually home (or on their way in).
  const home = (s: HeartScene) => SCENE_CAST[s.who].some((id) => game.townsfolk.npcs.find((n) => n.def.id === id)?.stop?.map === map);
  return HEART_SCENES.find((s) => s.map === map && !s.special && ready(game, s) && s.when(t) && home(s)) ?? null;
}

export function heartTick(game: Game): void {
  if (game.mode !== 'play' || game.overlays.length || game.fading) return;
  const p = game.progress;
  if (p.flags.has('kids_lost')) { rescueTick(game); return; }
  if (game.townsfolk.summoning()) return; // someone's already on their way over
  if (p.days.scene === game.clock.day) return;
  const m = game.cur.id, pl = game.player;
  const t = sceneTime(game);
  // Nobody gets pulled out of a town gathering, and the kids don't sneak off on a gathering night.
  const busy = (s: HeartScene) => SCENE_CAST[s.who].some((id) => eventStop(game, id)) || (s.special === 'rescue' && eveningEventToday(game));
  const s = HEART_SCENES.find((s) => s.map === m && ready(game, s) && s.when(t) && !busy(s)
    && (!s.near || Math.hypot(pl.tx - s.near[0], pl.ty - s.near[1]) <= s.near[2]));
  if (s) play(game, s);
}

/** Done heart scenes, for the Journal. */
export function scenesSeen(game: Game): HeartScene[] {
  return HEART_SCENES.filter((s) => game.progress.flags.has(`heart_${s.id}`));
}

function header(s: HeartScene): string {
  const name = s.who === 'kids' ? 'Pippa & Sam' : FRIEND_NAMES[s.who];
  const full = Math.floor(s.hearts), half = s.hearts % 1 ? ' 1/2' : '';
  return `${'<3 '.repeat(full).trim()}${half}   ${name.toUpperCase()}: "${s.title.toUpperCase()}"`;
}

const FRIEND_NAMES: Record<string, string> = {
  agnes: 'Agnes', barnaby: 'Barney', mabel: 'Mabel', gideon: 'Gideon', clara: 'Clara', pippa: 'Pippa', sam: 'Sam', toby: 'Toby', ruth: 'Ruth',
  liesl: 'Omi Liesl', matthias: 'Matthias', walter: 'Opa Walter',
};

function play(game: Game, s: HeartScene): void {
  const p = game.progress;
  if (s.special === 'rescue') {
    p.days.scene = game.clock.day;
    sfx.trustChime();
    p.flags.add('kids_lost');
    p.days.rescue = game.clock.day;
    watcherPlaced = -1;
    // They've been out here a while already.
    for (const id of ['pippa', 'sam']) {
      const npc = game.townsfolk.npcs.find((n) => n.def.id === id);
      const at = kidsHiding(game, id);
      if (npc && at) { npc.inBed = false; npc.place(RESCUE.map, at[0], at[1], 'down'); }
    }
    game.openOverlay(new Dialog([header(s), ...s.lines]));
    return;
  }
  // They walk over to you (in through the door or up the trail if they're elsewhere), then the scene.
  game.townsfolk.summon(game, SCENE_CAST[s.who], () => begin(game, s), SCENE_HOLD);
}

function begin(game: Game, s: HeartScene): void {
  const p = game.progress;
  p.days.scene = game.clock.day;
  sfx.trustChime();
  p.flags.add(`heart_${s.id}`);
  if (s.give) {
    const [it, n] = s.give;
    const left = game.inv.add(it, n);
    if (left) { game.storage.add(it, left); game.toast(`${ITEMS[it].name} went to your Storage Crate (bag full).`); }
  }
  if (s.flag) p.flags.add(s.flag);
  if (s.wear) game.wardrobe.add(s.wear);
  // Once Elias is home, scenes that would talk as if he's missing use their after-version.
  const lines = s.post && p.flags.has('finale') ? s.post : s.lines;
  game.openOverlay(new Dialog([header(s), ...lines]));
}

/* ---------------- The kids at the sawmill ---------------- */

let rescueTrail: Track[] | null = null;
/** Day the watcher was set out (so it isn't put back after you've dealt with it). */
let watcherPlaced = -1;

export function rescueTracks(game: Game): Track[] {
  if (!game.progress.flags.has('kids_lost') || game.cur.id !== RESCUE.map) return [];
  rescueTrail ??= layTrail({ quest: 'kids', stage: 1, map: RESCUE.map, from: [45, 82], to: [RESCUE.kids[0][0], RESCUE.kids[0][1] + 1], kind: 'boot', waders: false });
  return rescueTrail;
}

/** Where the kids are while they're lost (null = not lost). */
export function kidsHiding(game: Game, id: string): [number, number] | null {
  if (!game.progress.flags.has('kids_lost')) return null;
  if (id === 'pippa') return RESCUE.kids[0];
  if (id === 'sam') return RESCUE.kids[1];
  return null;
}

function rescueTick(game: Game): void {
  if (game.cur.id !== RESCUE.map || watcherPlaced === game.clock.day) return;
  const tr = rescueTracks(game);
  if (tr.length < 8) return;
  // Something big, a few steps off the trail about two-thirds of the way in.
  const mid = tr[Math.floor(tr.length * 0.66)];
  const m = game.cur;
  for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2], [3, 1], [-3, 1]]) {
    const x = mid.x + dx, y = mid.y + dy;
    if (!m.inBounds(x, y) || m.blocked(x, y, true)) continue;
    game.sightings.pin(game, CRYPTID_BY_ID[RESCUE.watcher], x, y);
    watcherPlaced = game.clock.day;
    return;
  }
}

/** Find the kids: walk them home. */
export function rescueKids(game: Game): void {
  const p = game.progress;
  p.flags.delete('kids_lost');
  p.flags.add('heart_kids2');
  rescueTrail = null;
  const scenes = [...befriend(game, 'pippa', 60), ...befriend(game, 'sam', 60)];
  sfx.trustChime();
  game.openOverlay(new Dialog(RESCUE.found));
  game.afterOverlays(() => game.transition(() => {
    game.clock.minutes = Math.max(game.clock.minutes, 20 * 60 + 30);
    game.enterMap('PINE_HOLLOW_TOWN', 51, 47, 'down');
    for (const s of scenes.reverse()) game.openOverlay(new Dialog(s));
  }));
}

/** Overnight: kids who weren't found made it home on their own (sheepishly). */
export function rescueOvernight(game: Game): string | null {
  const p = game.progress;
  if (!p.flags.has('kids_lost')) return null;
  p.flags.delete('kids_lost');
  p.days.scene = 0;
  rescueTrail = null;
  return 'Ruth phoned: Pippa and Sam crept home by themselves after dark. They\'re grounded. They\'ll try again some dusk.';
}
