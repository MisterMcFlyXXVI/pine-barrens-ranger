/** Townsfolk friendship rules: daily chat, one gift a day, heart rewards. */
import type { Game } from './game';
import { FRIENDS, FriendId, MAX_HEARTS, POINTS_PER_HEART, isFriend } from '../data/friends';
import { ITEMS } from '../data/items';
import { friendMult } from './restoration';
import { isBirthday, birthdayLine } from './calendar';

export interface FriendState { pts: number; talk: number; gift: number; claimed: number[]; known: string[] }

export type Taste = 'love' | 'like' | 'neutral' | 'dislike';

const GAIN: Record<Taste, number> = { love: 60, like: 35, neutral: 15, dislike: -20 };
const DAILY_CHAT = 15;

export function friendState(game: Game, id: FriendId): FriendState {
  const f = game.progress.friends;
  return (f[id] ??= { pts: 0, talk: 0, gift: 0, claimed: [], known: [] });
}

export function hearts(game: Game, id: FriendId): number {
  return Math.min(MAX_HEARTS, Math.floor(friendState(game, id).pts / POINTS_PER_HEART));
}

export function taste(id: FriendId, item: string): Taste {
  const f = FRIENDS[id];
  if (f.loves.includes(item) || (f.lovesSpecimens && ITEMS[item]?.kind === 'specimen')) return 'love';
  if (f.likes.includes(item)) return 'like';
  if (f.dislikes.includes(item)) return 'dislike';
  return 'neutral';
}

/** Items that make sense as gifts (not tools or Field Kit gear). */
export function giftable(item: string): boolean {
  const k = ITEMS[item]?.kind;
  return !!k && k !== 'tool' && k !== 'gear' && k !== 'keepsake';
}

export function giftedToday(game: Game, id: FriendId): boolean { return friendState(game, id).gift === game.clock.day; }

/** Add points; returns any heart-reward scenes newly reached (rewards already handed out). */
function addPoints(game: Game, id: FriendId, n: number): string[][] {
  const st = friendState(game, id);
  st.pts = Math.max(0, Math.min(MAX_HEARTS * POINTS_PER_HEART, st.pts + n));
  const h = hearts(game, id);
  const scenes: string[][] = [];
  for (const r of FRIENDS[id].rewards) {
    if (r.hearts > h || st.claimed.includes(r.hearts)) continue;
    st.claimed.push(r.hearts);
    for (const [item, qty] of r.give ?? []) {
      const left = game.inv.add(item, qty);
      if (left) game.storage.add(item, left);
    }
    if (r.gold) game.gold += r.gold;
    if (r.flag) game.progress.flags.add(r.flag);
    scenes.push([`${'<3 '.repeat(r.hearts).trim()}  (${r.hearts} hearts)`, ...r.lines]);
  }
  return scenes;
}

/** Friendship from something you did together (a scene, a rescue). Returns any heart-reward scenes. */
export function befriend(game: Game, id: FriendId, n: number): string[][] { return addPoints(game, id, n); }

/** First chat of the day: a little friendship. */
export function dailyChat(game: Game, npcId: string): string[][] {
  if (!isFriend(npcId)) return [];
  const st = friendState(game, npcId);
  if (st.talk === game.clock.day) return [];
  st.talk = game.clock.day;
  return addPoints(game, npcId, DAILY_CHAT * friendMult(game));
}

const REACT: Record<Taste, string[]> = {
  love: ['"Oh! {item}? How did you know? This is my favorite!"', '"{item}! You remembered. Thank you, truly."'],
  like: ['"{item}? Well, thank you kindly."', '"Ooh, {item}. I\'ll put this to good use."'],
  neutral: ['"{item}? That\'s... thoughtful. Thanks."', '"Huh. {item}. Thank you, Ranger."'],
  dislike: ['"{item}? Oh. Um. Thanks, I suppose."', '"...{item}. You shouldn\'t have. Really."'],
};

/** Give the held item. Returns the reaction dialog pages and any heart scenes. */
export function giveGift(game: Game, npcId: FriendId, npcName: string, item: string): { pages: string[]; scenes: string[][] } {
  const st = friendState(game, npcId);
  const t = taste(npcId, item);
  st.gift = game.clock.day;
  if (!st.known.includes(item)) st.known.push(item);
  const before = hearts(game, npcId);
  // Birthdays: any gift counts two and a half times (even one they wouldn't normally pick).
  const bday = isBirthday(game, npcId);
  const gain = bday ? Math.round(Math.max(GAIN[t], GAIN.neutral) * 2.5) : GAIN[t] > 0 ? GAIN[t] * friendMult(game) : GAIN[t];
  const scenes = addPoints(game, npcId, gain);
  const line = bday ? `"${birthdayLine(npcId)}"` : REACT[t][game.clock.day % REACT[t].length].replace('{item}', ITEMS[item].name);
  const after = hearts(game, npcId);
  const meter = bday ? `(Birthday gift! Friendship x2.5: ${after}/${MAX_HEARTS} hearts.)` : after > before ? `(Friendship grew: ${after}/${MAX_HEARTS} hearts!)` : t === 'dislike' ? '(They didn\'t care for that.)' : `(Friendship: ${after}/${MAX_HEARTS} hearts)`;
  return { pages: [`${npcName.split(' ')[0].replace(/"/g, '')}: ${line}`, meter], scenes };
}
