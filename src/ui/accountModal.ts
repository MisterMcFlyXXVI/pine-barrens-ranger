/**
 * Account panel: an HTML form over the canvas (real text fields for email and
 * password, which a canvas can't provide). Sign in with Google or email,
 * create an account, reset a password, and keep the device and cloud saves in step.
 */
import {
  accountEmail, accountProvider, accountsConfigured, createAccount, describeSave, fetchCloudSave, initAccounts,
  localSaveText, onAccountChange, passwordRecovery, sendPasswordReset, setNewPassword, signInWithEmail,
  signInWithGoogle, signOut, uploadSave,
} from '../engine/account';
import { SAVE_KEY } from '../engine/save';
import { validateSave } from './saveio';

type View = 'main' | 'choose' | 'busy';

let root: HTMLDivElement | null = null;
let view: View = 'main';
let note = '';
let noteBad = false;
let pending: { local: string; cloud: string } | null = null;
let onLocalChanged: () => void = () => undefined;
let lastEmail: string | null = null;
/** What the player has typed, kept across re-renders (e.g. after a wrong-password message). */
const typed = { email: '', password: '' };
/** The page was opened by a Google sign-in or an email link: confirm the result on screen. */
let fromLink = false;

export function accountModalOpen(): boolean { return root !== null; }

/** Call once at startup. Restores a session (e.g. returning from Google) and syncs saves. */
export function startAccounts(localChanged: () => void): void {
  onLocalChanged = localChanged;
  if (!accountsConfigured()) return;
  onAccountChange(() => {
    const email = accountEmail();
    const justSignedIn = email !== null && lastEmail === null;
    lastEmail = email;
    if (passwordRecovery()) { openAccount(); return; }
    if (justSignedIn) void reconcile(true);
    else render();
  });
  // Only load the account library at startup for players who use accounts:
  // a stored session, or a return from Google / an email link.
  let stored = false;
  try { stored = Object.keys(localStorage).some((k) => k.startsWith('sb-') && k.endsWith('-auth-token')); } catch { /* storage blocked */ }
  fromLink = /[?&#](code|access_token|error_description|token_hash)=/.test(location.search + location.hash);
  if (/error_description=/.test(location.search + location.hash)) { openAccount(); say('Sign-in was cancelled or failed. Please try again.', true); }
  if (stored || fromLink) void initAccounts();
}

export function openAccount(): void {
  if (!root) {
    root = document.createElement('div');
    root.className = 'acct-backdrop';
    root.addEventListener('pointerdown', (e) => { if (e.target === root) closeAccount(); });
    document.body.appendChild(root);
    document.addEventListener('keydown', escClose);
  }
  if (view !== 'choose') view = 'main';
  note = ''; noteBad = false;
  render();
  if (accountsConfigured()) void initAccounts().then(() => render());
}

export function closeAccount(): void {
  if (view === 'choose' || passwordRecovery()) return; // must answer first
  typed.password = '';
  root?.remove();
  root = null;
  document.removeEventListener('keydown', escClose);
}

function escClose(e: KeyboardEvent): void { if (e.key === 'Escape') closeAccount(); }

function say(msg: string, bad = false): void { note = msg; noteBad = bad; render(); }

/** Compare saves regardless of key order (the database stores JSON with sorted keys). */
function same(a: string, b: string): boolean {
  const norm = (v: unknown): unknown => Array.isArray(v) ? v.map(norm)
    : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, norm((v as Record<string, unknown>)[k])])) : v;
  try { return JSON.stringify(norm(JSON.parse(a))) === JSON.stringify(norm(JSON.parse(b))); } catch { return false; }
}

function writeLocal(raw: string): boolean {
  const d = validateSave(raw);
  if (!d) return false;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(d)); } catch { return false; }
  onLocalChanged();
  return true;
}

/** After signing in: pull the cloud save down, push this device's up, or ask which to keep. */
async function reconcile(auto: boolean): Promise<void> {
  const local = localSaveText();
  let cloud: string | null = null;
  try { cloud = (await fetchCloudSave())?.data ?? null; } catch (e) {
    if (!auto) say((e as Error).message, true);
    return;
  }
  const link = fromLink && auto;
  fromLink = false;
  if (cloud && !local) {
    if (writeLocal(cloud)) { if (!root) openAccount(); say(`Welcome back! Loaded your cloud save: ${describeSave(cloud)}.`); }
    else say('Your cloud save could not be read.', true);
  } else if (local && !cloud) {
    const r = await uploadSave(local);
    if (root || link || !r.ok) { if (!root) openAccount(); say(r.ok ? 'Signed in. This device\'s save is now backed up to your account.' : r.msg, !r.ok); }
  } else if (local && cloud && !same(local, cloud)) {
    pending = { local, cloud };
    view = 'choose';
    if (!root) openAccount(); else render();
  } else if (root || link) {
    if (!root) openAccount();
    say(local ? 'Signed in. Your save is in sync.' : 'Signed in. Your progress will back up each time you sleep.');
  }
}

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> & { cls?: string } = {}, ...kids: Array<Node | string>): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  const { cls, ...rest } = props;
  if (cls) el.className = cls;
  Object.assign(el, rest);
  for (const k of kids) el.append(k);
  return el;
}

function button(label: string, cls: string, fn: () => void | Promise<void>): HTMLButtonElement {
  const b = h('button', { type: 'button', cls: `acct-btn ${cls}` }, label);
  b.addEventListener('click', () => { void fn(); });
  return b;
}

async function busy(fn: () => Promise<void>): Promise<void> {
  const prev = view;
  view = 'busy'; render();
  try { await fn(); } finally { if (view === 'busy') view = prev; render(); }
}

function render(): void {
  if (!root) return;
  const card = h('div', { cls: 'acct' });
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Pine Holler account');
  card.append(h('h2', {}, 'PINE HOLLER ACCOUNT'));

  if (!accountsConfigured()) {
    card.append(h('p', {}, 'Accounts aren\'t set up on this site yet. Your game still saves on this device, and EXPORT SAVE makes a backup file.'));
    card.append(button('Close', 'ghost', closeAccount));
  } else if (view === 'busy') {
    card.append(h('p', { cls: 'acct-center' }, 'One moment...'));
  } else if (passwordRecovery()) {
    card.append(h('p', {}, 'Choose a new password for your account.'));
    const pw = h('input', { type: 'password', placeholder: 'New password (8+ characters)', autocomplete: 'new-password' });
    card.append(pw, button('Save new password', 'primary', () => busy(async () => {
      const r = await setNewPassword(pw.value);
      say(r.msg, !r.ok);
      if (r.ok) void reconcile(false);
    })));
  } else if (view === 'choose' && pending) {
    const p = pending;
    card.append(h('p', {}, 'This device and your account have different saves. Which one do you want to keep playing?'));
    card.append(button(`Keep this device's save\n${describeSave(p.local)}`, 'primary tall', () => busy(async () => {
      const r = await uploadSave(p.local);
      if (r.ok) { pending = null; view = 'main'; say('Kept this device\'s save and backed it up. (The old cloud save is kept as a spare.)'); }
      else say(r.msg, true);
    })));
    card.append(button(`Use the cloud save\n${describeSave(p.cloud)}`, 'primary tall', () => {
      if (writeLocal(p.cloud)) { pending = null; view = 'main'; say('Loaded your cloud save. Choose CONTINUE to play.'); }
      else say('The cloud save could not be read.', true);
    }));
  } else if (accountEmail()) {
    card.append(h('p', {}, 'Signed in as ', h('b', {}, accountEmail() ?? ''), ` (${accountProvider()}).`));
    card.append(h('p', { cls: 'acct-small' }, 'Your progress backs up to your account every time you sleep. Sign in on any device to pick up where you left off.'));
    card.append(button('Back up now', 'primary', () => busy(async () => { const r = await uploadSave(); say(r.msg, !r.ok); })));
    card.append(button('Restore the previous cloud save', 'ghost', () => busy(async () => {
      try {
        const c = await fetchCloudSave();
        if (!c?.prev) { say('There is no earlier cloud save yet.'); return; }
        if (!window.confirm(`Replace the save on this device with the earlier cloud save from ${describeSave(c.prev)}?`)) return;
        if (writeLocal(c.prev)) say('Restored the earlier save. Choose CONTINUE to play.');
        else say('That save could not be read.', true);
      } catch (e) { say((e as Error).message, true); }
    })));
    card.append(button('Sign out', 'ghost', () => busy(async () => { const r = await signOut(); say(r.msg, !r.ok); })));
    card.append(button('Close', 'ghost', closeAccount));
  } else {
    card.append(h('p', { cls: 'acct-small' }, 'Sign in to back up your progress and play on any device.'));
    card.append(button('Continue with Google', 'google', () => busy(async () => { const r = await signInWithGoogle(); if (!r.ok) say(r.msg, true); })));
    card.append(h('div', { cls: 'acct-or' }, 'or use email'));
    const form = h('form', { cls: 'acct-form' });
    const email = h('input', { type: 'email', placeholder: 'Email', autocomplete: 'email', required: true, value: typed.email });
    email.setAttribute('autocapitalize', 'off');
    const pw = h('input', { type: 'password', placeholder: 'Password (8+ characters)', autocomplete: 'current-password', required: true, value: typed.password });
    email.addEventListener('input', () => { typed.email = email.value; });
    pw.addEventListener('input', () => { typed.password = pw.value; });
    form.append(email, pw);
    const go = (fn: (e: string, p: string) => Promise<{ ok: boolean; msg: string }>) => () => busy(async () => {
      if (!email.value.includes('@')) { say('Enter your email address.', true); return; }
      if (pw.value.length < 8) { say('Passwords need at least 8 characters.', true); return; }
      const r = await fn(email.value.trim(), pw.value);
      if (r.ok) typed.password = '';
      say(r.msg, !r.ok);
    });
    form.addEventListener('submit', (e) => { e.preventDefault(); void go(signInWithEmail)(); });
    form.append(button('Sign in', 'primary', go(signInWithEmail)));
    form.append(button('Create account', 'ghost', go(createAccount)));
    card.append(form);
    const forgot = h('button', { type: 'button', cls: 'acct-link' }, 'Forgot password?');
    forgot.addEventListener('click', () => {
      if (!email.value.includes('@')) { say('Type your email above, then tap "Forgot password?" again.', true); return; }
      void busy(async () => { const r = await sendPasswordReset(email.value.trim()); say(r.msg, !r.ok); });
    });
    card.append(forgot, button('Close', 'ghost', closeAccount));
  }
  if (note && (noteBad || view !== 'choose')) card.append(h('p', { cls: noteBad ? 'acct-note bad' : 'acct-note' }, note));
  root.replaceChildren(card);
}
