/**
 * Player accounts (Supabase Auth: Google + email/password) and cloud saves.
 *
 * The save lives in the `pine_holler_saves` table (see supabase/schema.sql); Row Level
 * Security limits each player to their own row and a trigger keeps the previous
 * upload in `prev`. Supabase's library is loaded lazily, the first time
 * accounts are used, so it never slows the game's start.
 */
import type { SupabaseClient, Session } from '@supabase/supabase-js';
import { SAVE_KEY } from './save';

declare const __SB_URL__: string;
declare const __SB_KEY__: string;

export interface CloudSave { data: string; prev: string | null; day: number; updatedAt: string }
export interface Result { ok: boolean; msg: string }

type Listener = () => void;

let client: SupabaseClient | null = null;
let loading: Promise<SupabaseClient | null> | null = null;
let session: Session | null = null;
let recovering = false;
const listeners = new Set<Listener>();

export function accountsConfigured(): boolean {
  return !!__SB_URL__ && !!__SB_KEY__;
}

/** Signed-in email, or null. */
export function accountEmail(): string | null {
  return session?.user.email ?? null;
}

export function accountProvider(): string {
  const p = session?.user.app_metadata?.provider;
  return p === 'google' ? 'Google' : 'email';
}

/** True after the player followed a password-reset link and must choose a new password. */
export function passwordRecovery(): boolean { return recovering; }

export function onAccountChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(): void { for (const fn of listeners) fn(); }

/** Load the Supabase client and restore any existing session (including an OAuth / email-link return). */
export function initAccounts(): Promise<SupabaseClient | null> {
  if (!accountsConfigured()) return Promise.resolve(null);
  loading ??= import('@supabase/supabase-js').then(async ({ createClient }) => {
    client = createClient(__SB_URL__, __SB_KEY__, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
    });
    client.auth.onAuthStateChange((event, s) => {
      session = s;
      if (event === 'PASSWORD_RECOVERY') recovering = true;
      if (event === 'SIGNED_OUT') recovering = false;
      emit();
    });
    const { data } = await client.auth.getSession();
    session = data.session;
    emit();
    return client;
  }).catch(() => { loading = null; return null; });
  return loading;
}

async function ready(): Promise<SupabaseClient> {
  const c = await initAccounts();
  if (!c) throw new Error(accountsConfigured() ? 'Could not reach the account service. Check your connection.' : 'Accounts are not set up on this site yet.');
  return c;
}

function friendly(e: unknown): string {
  const m = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
  if (/invalid login credentials/i.test(m)) return 'Wrong email or password.';
  if (/email not confirmed/i.test(m)) return 'Please confirm your email first. Check your inbox for the link.';
  if (/already registered|already exists/i.test(m)) return 'That email already has an account. Sign in instead.';
  if (/password should be at least|weak password/i.test(m)) return 'Password is too short. Use at least 8 characters.';
  if (/rate limit|too many/i.test(m)) return 'Too many tries. Wait a minute and try again.';
  if (/failed to fetch|network|load failed/i.test(m)) return 'No internet connection.';
  return m || 'Something went wrong.';
}

async function attempt(fn: (c: SupabaseClient) => Promise<{ error: unknown }>, okMsg: string): Promise<Result> {
  try {
    const c = await ready();
    const { error } = await fn(c);
    if (error) return { ok: false, msg: friendly(error) };
    return { ok: true, msg: okMsg };
  } catch (e) {
    return { ok: false, msg: friendly(e) };
  }
}

/** Where Supabase sends the player back after Google or an email link. */
function returnUrl(): string { return location.origin + location.pathname; }

export function signInWithGoogle(): Promise<Result> {
  // Full-page redirect (not a popup) so it also works in a home-screen web app.
  return attempt((c) => c.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: returnUrl() } }), 'Opening Google...');
}

export function signInWithEmail(email: string, password: string): Promise<Result> {
  return attempt((c) => c.auth.signInWithPassword({ email, password }), 'Signed in.');
}

export async function createAccount(email: string, password: string): Promise<Result> {
  try {
    const c = await ready();
    const { data, error } = await c.auth.signUp({ email, password, options: { emailRedirectTo: returnUrl() } });
    if (error) return { ok: false, msg: friendly(error) };
    if (!data.session) return { ok: true, msg: `Almost done! We sent a link to ${email}. Open it on this device to finish.` };
    return { ok: true, msg: 'Account created. You are signed in.' };
  } catch (e) {
    return { ok: false, msg: friendly(e) };
  }
}

export function sendPasswordReset(email: string): Promise<Result> {
  return attempt((c) => c.auth.resetPasswordForEmail(email, { redirectTo: returnUrl() }), `If ${email} has an account, a reset link is on its way.`);
}

export async function setNewPassword(password: string): Promise<Result> {
  const r = await attempt((c) => c.auth.updateUser({ password }), 'Password updated. You are signed in.');
  if (r.ok) { recovering = false; emit(); }
  return r;
}

export function signOut(): Promise<Result> {
  return attempt((c) => c.auth.signOut(), 'Signed out. Your save stays on this device.');
}

/* ------------------------------------------------------------------ */
/* Cloud saves                                                         */
/* ------------------------------------------------------------------ */

export function localSaveText(): string | null {
  try { return localStorage.getItem(SAVE_KEY); } catch { return null; }
}

export async function fetchCloudSave(): Promise<CloudSave | null> {
  const c = await ready();
  const uid = session?.user.id;
  if (!uid) throw new Error('Not signed in.');
  const { data, error } = await c.from('pine_holler_saves').select('data, prev, day, updated_at').eq('user_id', uid).maybeSingle();
  if (error) throw new Error(friendly(error));
  if (!data) return null;
  const row = data as { data: unknown; prev: unknown; day: number; updated_at: string };
  return {
    data: JSON.stringify(row.data),
    prev: row.prev == null ? null : JSON.stringify(row.prev),
    day: row.day,
    updatedAt: row.updated_at,
  };
}

/** Upload a save (defaults to this device's). The database keeps the one it replaces as `prev`. */
export async function uploadSave(raw: string | null = localSaveText()): Promise<Result> {
  if (!session) return { ok: true, msg: '' };
  if (!raw) return { ok: true, msg: 'Nothing to back up yet. Sleep in your bed first.' };
  try {
    const c = await ready();
    const parsed = JSON.parse(raw) as { day?: number };
    const { error } = await c.from('pine_holler_saves').upsert({ user_id: session.user.id, data: parsed, day: parsed.day ?? 0 });
    if (error) return { ok: false, msg: friendly(error) };
    return { ok: true, msg: `Cloud save updated (day ${parsed.day ?? 0}).` };
  } catch (e) {
    return { ok: false, msg: friendly(e) };
  }
}

/** Short summary for "which save do you want to keep?" prompts. */
export function describeSave(raw: string): string {
  try {
    const d = JSON.parse(raw) as { day: number; gold: number };
    const season = ['Spring', 'Summer', 'Fall', 'Winter'][Math.floor((d.day - 1) / 28) % 4];
    return `${season} ${((d.day - 1) % 28) + 1} (day ${d.day}), ${d.gold}g`;
  } catch {
    return 'unknown save';
  }
}
