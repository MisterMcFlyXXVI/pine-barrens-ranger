/** Town Restoration Ledger: funding projects, and what each one changes about town life. */
import type { Game } from './game';
import { PROJECTS, PROJECT_BY_ID, GAZEBO } from '../data/restoration';
import type { Project, ProjectId } from '../data/restoration';
import { ITEMS } from '../data/items';
import { O } from '../data/tiles';
import { haveCount } from './materials';
import { Dialog } from '../ui/menus';
import { sfx } from '../audio/sfx';

export function funded(game: Game, id: ProjectId): boolean { return game.progress.flags.has(PROJECT_BY_ID[id].flag); }

/** Coins still needed (the County Grant matches the town, halving it). */
export function projectGold(game: Game, p: Project): number {
  return game.progress.has('grant') ? Math.ceil(p.gold / 2) : p.gold;
}

/** Why a project can't be started yet (null = it can). */
function lockedWhy(game: Game, p: Project): string | null {
  if (p.id !== 'mine') return null;
  if (!game.progress.flags.has('finale')) return 'Agnes: "Not yet, dear. Not until Elias is home. It\'s his brother down there."';
  if (!game.keepsake('lamphouse_key')) return 'The lamp house is padlocked, and nobody in town has the key. (Gideon might, if you\'re close enough to him.)';
  return null;
}

export function openLedger(game: Game, where: 'museum' | 'bench'): void {
  const n = PROJECTS.filter((p) => funded(game, p.id)).length;
  sfx.open();
  const intro = where === 'museum'
    ? `TOWN RESTORATION LEDGER. Agnes keeps it open on the lectern, every donation entered in her copperplate hand. (${n}/4 projects funded.)`
    : `Your copy of the Town Restoration Ledger, tacked up over the workbench. (${n}/4 projects funded.)`;
  const grant = game.progress.has('grant') ? ' The County Grant is matching the town: coin costs are halved.' : '';
  game.openOverlay(new Dialog([intro + grant], [
    ...PROJECTS.map((p) => ({ label: `${p.num} ${p.title}${funded(game, p.id) ? ' -- DONE' : ''}`, fn: () => showProject(game, p, where) })),
    { label: 'Close', fn: () => undefined },
  ]));
}

function showProject(game: Game, p: Project, where: 'museum' | 'bench'): void {
  const back = { label: 'Back', fn: () => openLedger(game, where) };
  if (funded(game, p.id)) { game.openOverlay(new Dialog([`${p.num} ${p.title.toUpperCase()}: FUNDED.`, p.done[p.done.length - 1]], [back])); return; }
  const gold = projectGold(game, p);
  const mats = p.mats.map(([it, n]) => `${n} ${ITEMS[it].name} (have ${haveCount(game, it)})`).join(', ');
  const locked = lockedWhy(game, p);
  const can = !locked && p.mats.every(([it, n]) => haveCount(game, it) >= n) && game.gold >= gold;
  const pages = [`${p.num} ${p.title.toUpperCase()}. ${p.pitch}`, `Needs: ${mats}, and ${gold}g (you have ${game.gold}g). Materials in your Storage Crate count.`];
  if (locked) pages.push(locked);
  game.openOverlay(new Dialog(pages, can ? [{ label: 'Fund it', fn: () => fund(game, p) }, back] : [back]));
}

function fund(game: Game, p: Project): void {
  for (const [it, n] of p.mats) {
    const fromBag = Math.min(n, game.inv.count(it));
    if (fromBag) game.inv.remove(it, fromBag);
    if (n - fromBag) game.storage.remove(it, n - fromBag);
  }
  game.gold -= projectGold(game, p);
  game.progress.flags.add(p.flag);
  applyRestoration(game);
  sfx.fanfare();
  game.openOverlay(new Dialog([...p.done]));
  game.saveGame();
}

/** Put built things into the world (on funding, and again after loading). */
export function applyRestoration(game: Game): void {
  if (!funded(game, 'gazebo')) return;
  const m = game.getMap('PINE_HOLLOW_TOWN');
  const ax = GAZEBO.x, ay = GAZEBO.y + GAZEBO.h - 1, anchor = m.idx(ax, ay);
  if (m.objects[anchor] === O.GAZEBO) return;
  for (let y = GAZEBO.y; y < GAZEBO.y + GAZEBO.h; y++) for (let x = GAZEBO.x; x < GAZEBO.x + GAZEBO.w; x++) {
    const i = m.idx(x, y);
    if (i === anchor) continue;
    m.objects[i] = O.BLOCK;
    m.def.anchors.set(i, anchor);
  }
  m.objects[anchor] = O.GAZEBO;
  m.def.signs.set(anchor, 'THE PINE HOLLOW GAZEBO. Raised by the whole town. A brass plate on the rail: "FOR WALTER, DANNY, AND EVERYBODY ELSE WHO WENT DOWN THE HILL. WE\'RE STILL PLAYING."');
}

/** Friday Night Story Hour at the diner (P1): friendship counts double. */
export function friendMult(game: Game): number {
  const c = game.clock;
  return funded(game, 'neon') && c.weekday === 'Fri' && c.minutes >= 18 * 60 && c.minutes < 21 * 60 && game.cur.id === 'DINER_INT' ? 2 : 1;
}

/** Sunday afternoon porch music in the park (P3). */
export function porchMusic(game: Game): boolean {
  const c = game.clock, w = game.weatherNow();
  return funded(game, 'gazebo') && c.weekday === 'Sun' && c.minutes >= 13 * 60 && c.minutes < 17 * 60 && w !== 'RAIN' && w !== 'STORM' && !game.isFestival();
}

/** Sit in the gazebo. */
export function gazeboRest(game: Game): void {
  const p = game.progress;
  sfx.blip();
  if (porchMusic(game) && p.days.porchMusic !== game.clock.day) {
    p.days.porchMusic = game.clock.day;
    game.stamina = game.maxStamina;
    sfx.trustChime();
    game.openOverlay(new Dialog([
      'You sit on the gazebo step. Barney has a fiddle under his chin, Gideon is thumping a washtub bass, and Ruth is singing harmony on a song older than the railroad.',
      'You don\'t notice the time going. When you stand up, you feel like you slept all night. (Stamina fully restored.)',
    ]));
    return;
  }
  game.openOverlay(new Dialog([porchMusic(game) ? 'The music keeps going. You\'ve rested here already today, but nobody minds if you stay and listen.'
    : game.clock.weekday === 'Sun' ? 'Sunday porch music is 1 to 5 in the afternoon, weather permitting.'
      : 'The gazebo is quiet. Somebody has left a harmonica on the rail, and a jar of lightning bugs with holes punched in the lid. (Sunday afternoons, the town plays here.)']));
}

/** When Barney runs the handcar. Elias's spare crank or Barney's whistle: any hour. */
export function handcarClosed(game: Game): string | null {
  if (game.keepsake('handcar_crank') || game.keepsake('conductor_whistle')) return null;
  const m = game.clock.minutes;
  const late = funded(game, 'station');
  if (m >= 6 * 60 && m < (late ? 24 : 19) * 60) return null;
  return m < 6 * 60 && m >= 3 * 60 ? 'The line is dark. Barney starts the first run at 6 AM.' : late
    ? 'Barney\'s gone home for the night. The first run is at 6 AM.'
    : 'Barney\'s gone home for supper. The handcar runs 6 AM to 7 PM. (Fund the Station Roof & Signal Lamp on the Restoration Ledger for late runs.)';
}

/** Merchants come in by rail on foggy weekend afternoons (P2). */
export function foggyWeekend(game: Game): boolean {
  const c = game.clock, d = game.dayWeather;
  return funded(game, 'station') && (c.weekday === 'Sat' || c.weekday === 'Sun') && (d.morning === 'FOG' || d.evening === 'FOG') && c.minutes >= 12 * 60 && c.minutes < 18 * 60;
}
