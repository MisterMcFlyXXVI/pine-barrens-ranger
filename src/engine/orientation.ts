/** Ranger Orientation runtime: which errand you're on, taking it on from its giver, and checking it off. */
import type { Game } from './game';
import { ORIENTATION } from '../data/orientation';
import type { OriStep } from '../data/orientation';
import { ITEMS } from '../data/items';
import { sfx } from '../audio/sfx';

const NAME: Record<string, string> = { barnaby: 'Barney', gideon: 'Gideon', mabel: 'Mabel', agnes: 'Agnes' };

export function oriStep(game: Game): OriStep | null {
  const f = game.progress.flags;
  if (f.has('ori_done')) return null;
  return ORIENTATION.find((s) => !f.has(`ori_${s.id}`)) ?? null;
}

/** You've taken this step on (from its giver, or it needs no introduction). */
function met(game: Game, s: OriStep): boolean {
  return s.who === 'note' || !s.intro.length || game.progress.flags.has(`ori_${s.id}_met`);
}

function give(game: Game, items: Array<[string, number]>): void {
  for (const [it, n] of items) {
    if (ITEMS[it]?.kind === 'tool' && game.inv.count(it) + game.storage.count(it) > 0) { game.gold += 100; continue; }
    const left = game.inv.add(it, n);
    if (left) game.storage.add(it, left);
  }
}

/** Checked a couple of times a second: tick off the current errand when it's done. */
export function oriTick(game: Game): void {
  if (game.mode !== 'play' || game.overlays.length) return;
  const s = oriStep(game);
  if (!s || !met(game, s) || !s.check(game)) return;
  const p = game.progress;
  p.flags.add(`ori_${s.id}`);
  give(game, s.reward.items ?? []);
  if (s.reward.gold) game.gold += s.reward.gold;
  sfx.trustChime();
  const items = (s.reward.items ?? []).map(([it, n]) => `${n} ${ITEMS[it].name}`);
  const pay = [...(s.reward.gold ? [`${s.reward.gold}g`] : []), ...items].join(', ');
  game.toast(`ORIENTATION ${ORIENTATION.indexOf(s) + 1}/${ORIENTATION.length}: ${s.done}${pay ? ` (+${pay})` : ''}`);
  if (!oriStep(game)) { p.flags.add('ori_done'); sfx.fanfare(); }
}

/** Talking to the giver of the current errand hands it to you. Returns their lines, or null. */
export function oriTalk(game: Game, npcId: string): string[] | null {
  const s = oriStep(game);
  if (!s || s.who !== npcId || met(game, s)) return null;
  game.progress.flags.add(`ori_${s.id}_met`);
  if (s.gift) give(game, s.gift);
  const gifts = (s.gift ?? []).map(([it, n]) => `${n} ${ITEMS[it].name}`).join(', ');
  return [...s.intro, `(ORIENTATION: ${s.task}${gifts ? ` You got ${gifts}.` : ''})`];
}

/** One line for the Journal. */
export function oriSummary(game: Game): string | null {
  const s = oriStep(game);
  if (!s) return null;
  const n = ORIENTATION.indexOf(s) + 1;
  return met(game, s) ? `ORIENTATION ${n}/${ORIENTATION.length}: ${s.task}` : `ORIENTATION ${n}/${ORIENTATION.length}: Talk to ${NAME[s.who] ?? s.who}. ${s.where}.`;
}
