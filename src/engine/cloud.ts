/**
 * Cloud save backup client. Talks to /api/save (see api/save.ts).
 * The recovery code is the only key: no accounts, no email.
 */
import { SAVE_KEY } from './save';

const CODE_KEY = 'pbr_cloud_code';
/** No I, O, 0 or 1, so a handwritten code can't be misread. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ENDPOINT = '/api/save';

export interface CloudResult { ok: boolean; msg: string; save?: string; day?: number }

export function cloudCode(): string | null {
  try { return localStorage.getItem(CODE_KEY); } catch { return null; }
}

function setCode(code: string | null): void {
  try { if (code) localStorage.setItem(CODE_KEY, code); else localStorage.removeItem(CODE_KEY); } catch { /* storage blocked */ }
}

/** HOLLER-ABCD-EFGH-JKLM */
export function formatCode(code: string): string {
  return `HOLLER-${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
}

/** Accepts the code however it was typed: any case, with or without HOLLER- and dashes. */
export function parseCode(input: string): string | null {
  let s = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s.startsWith('HOLLER')) s = s.slice(6);
  return s.length === 12 && [...s].every((ch) => ALPHABET.includes(ch)) ? s : null;
}

function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

async function call(body: object): Promise<CloudResult> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch {
    return { ok: false, msg: 'No internet connection. Your save is still safe on this device.' };
  }
  let data: { error?: string; save?: string; day?: number } = {};
  try { data = await res.json(); } catch {
    return { ok: false, msg: 'Cloud backup is not available on this site yet.' };
  }
  if (!res.ok) return { ok: false, msg: data.error ?? `Cloud error (${res.status}).` };
  return { ok: true, msg: '', save: data.save, day: data.day };
}

function localSave(): string | null {
  try { return localStorage.getItem(SAVE_KEY); } catch { return null; }
}

/** Upload the current save. Does nothing (ok) if cloud backup is off or there is no save yet. */
export async function cloudBackup(): Promise<CloudResult> {
  const code = cloudCode();
  const save = localSave();
  if (!code || !save) return { ok: true, msg: '' };
  const r = await call({ action: 'save', code, save });
  return r.ok ? { ok: true, msg: `Cloud backup saved (day ${r.day}).`, day: r.day } : r;
}

/** Create a code and make the first upload. */
export async function cloudEnable(): Promise<CloudResult> {
  const code = newCode();
  setCode(code);
  if (!localSave()) return { ok: true, msg: `Cloud backup ON. Your code: ${formatCode(code)}. Write it down!` };
  const r = await cloudBackup();
  if (!r.ok) { setCode(null); return r; }
  return { ok: true, msg: `Cloud backup ON. Your code: ${formatCode(code)}. Write it down!` };
}

export function cloudDisable(): void { setCode(null); }

/** Fetch the cloud save for a code (without touching the local save). */
export async function cloudFetch(code: string, prev = false): Promise<CloudResult> {
  return call({ action: 'load', code, prev });
}

/** Adopt a code (after a successful restore) so future backups continue under it. */
export function adoptCode(code: string): void { setCode(code); }
