/**
 * Who's talking in a line of dialogue: their portrait and their voice.
 *
 * A page that starts "AGNES:", "Barney:", "Barnaby "Barney" Finch:", "You:" or a
 * heart-scene header ("<3 <3   MABEL: ...") gets that speaker's face beside the
 * text and their own typing blip. Narration keeps the plain blip and no portrait.
 */
import type { Game } from '../engine/game';
import { NPCS_BY_ID } from '../data/npcs';
import type { NpcId } from '../data/npcs';
import { personFrame, playerFrame } from '../graphics/playerSprite';
import { cryptidFrame } from '../graphics/cryptidSprites';
import type { Canv } from '../graphics/canvas';
import { nameOrRanger } from '../data/appearance';
import type { Wave } from '../audio/sfx';

export type SpeakerId = NpcId | 'player' | 'indrid';

/** Words in a speaker label -> who it is (first match wins, so "Agnes Vance" is Agnes). */
const ALIASES: Record<string, SpeakerId> = {
  agnes: 'agnes', barney: 'barnaby', barnaby: 'barnaby', mabel: 'mabel', gideon: 'gideon', clara: 'clara', okafor: 'clara',
  pippa: 'pippa', sam: 'sam', toby: 'toby', ruth: 'ruth', elias: 'vance', pruitt: 'inspector', harlan: 'inspector',
  ezri: 'ezri', pike: 'pike', indrid: 'indrid', you: 'player',
};

const LABEL = /^(?:(?:<3\s*)+(?:1\/2)?\s*)?([A-Za-z][A-Za-z ."'-]{0,30}?):\s/;

export function speakerOf(page: string): SpeakerId | null {
  const m = LABEL.exec(page);
  if (!m) return null;
  for (const word of m[1].toLowerCase().replace(/"/g, ' ').split(/[\s.]+/)) {
    const id = ALIASES[word];
    if (id) return id;
  }
  return null;
}

/** The line without its "NAME: " label (the portrait's name plate says who it is). Heart-scene titles keep theirs. */
export function stripLabel(page: string): string {
  if (page.startsWith('<3')) return page;
  const m = LABEL.exec(page);
  return m ? page.slice(m[0].length) : page;
}

/** Name shown on the plate over the portrait. */
export function speakerName(id: SpeakerId): string {
  if (id === 'player') return nameOrRanger().toUpperCase();
  if (id === 'indrid') return 'INDRID COLD';
  if (id === 'vance') return 'ELIAS';
  if (id === 'barnaby') return 'BARNEY';
  if (id === 'clara') return 'DR. OKAFOR';
  if (id === 'inspector') return 'PRUITT';
  return NPCS_BY_ID[id].name.split(' ')[0].replace(/"/g, '').toUpperCase();
}

/** Their full sprite, facing you (the portrait is cropped from it). */
export function speakerSprite(game: Game, id: SpeakerId, frame: number): Canv | null {
  if (id === 'player') return playerFrame(game.look, 'down', 0, 'walk');
  if (id === 'indrid') return cryptidFrame('indrid_cold', 'normal', frame);
  const d = NPCS_BY_ID[id];
  if (!d || d.kind !== 'person') return null;
  return personFrame(d.body, d.look, 'down', 0, 'walk');
}

/** Each voice: waveform, base pitch (Hz, kept well above ~98 Hz for phone speakers), and a little lilt. */
const VOICES: Partial<Record<SpeakerId, [Wave, number, number]>> = {
  agnes: ['triangle', 880, 0.06], barnaby: ['square', 330, 0.05], mabel: ['square', 660, 0.1], gideon: ['triangle', 220, 0.03],
  clara: ['square', 990, 0.08], pippa: ['square', 1480, 0.14], sam: ['triangle', 1320, 0.06], toby: ['square', 1100, 0.1],
  ruth: ['triangle', 620, 0.05], vance: ['square', 260, 0.04], inspector: ['square', 470, 0.02], ezri: ['triangle', 520, 0.12],
  pike: ['square', 1240, 0.09], indrid: ['sine', 700, 0.0], player: ['triangle', 760, 0.07],
};

export function voiceOf(id: SpeakerId | null): [Wave, number, number] | null {
  return id ? VOICES[id] ?? null : null;
}
