/**
 * "Put it on your Home Screen": shown over the title when the game is running
 * in an ordinary browser tab (not installed as a web app). Installed, it opens
 * full-screen with no browser bars, runs smoother, and can't be lost by
 * closing a tab. Instructions are tailored to the browser we detect; where the
 * browser offers its own install prompt (Chrome, Edge, Samsung Internet), an
 * INSTALL button uses it.
 *
 * Shown on first open, then at each launch in a browser until the player picks
 * "Don't remind me". The title menu's HOME SCREEN APP option reopens it.
 */
import { loadSave } from '../engine/save';

const KEY = 'pbr_install_tip';

/** Chrome-style install prompt, captured when the browser offers one. */
interface InstallPrompt extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> }
let deferred: InstallPrompt | null = null;
let root: HTMLDivElement | null = null;

export function installTipOpen(): boolean { return root !== null; }

/** Running as an installed web app (Home Screen / Dock / desktop app window)? */
export function isInstalled(): boolean {
  try {
    if ((navigator as Navigator & { standalone?: boolean }).standalone) return true;
    return ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'].some((m) => matchMedia(`(display-mode: ${m})`).matches);
  } catch {
    return false;
  }
}

type Platform = 'ios' | 'android' | 'samsung' | 'firefox-android' | 'mac-safari' | 'desktop-chromium' | 'desktop-other';

function platform(): Platform {
  const ua = navigator.userAgent;
  const iOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (iOS) return 'ios';
  if (/Android/.test(ua)) {
    if (/SamsungBrowser/.test(ua)) return 'samsung';
    if (/Firefox/.test(ua)) return 'firefox-android';
    return 'android';
  }
  if (/Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg|Firefox/.test(ua)) return 'mac-safari';
  if (/Chrome|Chromium|Edg/.test(ua)) return 'desktop-chromium';
  return 'desktop-other';
}

/** A little drawing of the iOS Share icon (square with an arrow), inline with the text. */
const SHARE_ICON = '<svg class="it-ico" viewBox="0 0 20 22" aria-label="Share icon"><path d="M10 2v12M6 6l4-4 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 9H4v11h12V9h-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
const DOTS = '<b>&#8942;</b>';

function steps(p: Platform): string[] {
  switch (p) {
    case 'ios': return [
      `Tap the <b>Share</b> button ${SHARE_ICON} (Safari: in the bottom bar, or the top on iPad; on newer iPhones it may be under the <b>&bull;&bull;&bull;</b> button. Chrome: in the address bar).`,
      'Scroll down and tap <b>Add to Home Screen</b>. (Don\'t see it? Tap <b>Edit Actions</b> at the bottom of the list to add it.)',
      'Tap <b>Add</b>, then open <b>PH Ranger</b> from your Home Screen.',
    ];
    case 'android': return [
      `Tap the menu ${DOTS} at the top right of Chrome.`,
      'Tap <b>Add to Home screen</b> or <b>Install app</b>, then <b>Install</b>.',
      'Open <b>PH Ranger</b> from your Home Screen or app drawer.',
    ];
    case 'samsung': return [
      'Tap the menu <b>&#9776;</b> at the bottom right.',
      'Tap <b>Add page to</b>, then <b>Home screen</b> (or tap the install icon in the address bar).',
      'Open <b>PH Ranger</b> from your Home Screen.',
    ];
    case 'firefox-android': return [
      `Tap the menu ${DOTS}.`,
      'Tap <b>Add app to Home screen</b> (or <b>Install</b>), then confirm.',
      'Open <b>PH Ranger</b> from your Home Screen.',
    ];
    case 'mac-safari': return [
      'In the menu bar, choose <b>File &gt; Add to Dock</b> (or the Share button &gt; <b>Add to Dock</b>).',
      'Click <b>Add</b>, then open <b>PH Ranger</b> from your Dock.',
    ];
    case 'desktop-chromium': return [
      'Click the <b>install icon</b> at the right end of the address bar (a screen with a down arrow),',
      `or open the menu ${DOTS} and choose <b>Cast, save and share &gt; Install page as app</b> (Edge: <b>Apps &gt; Install this site as an app</b>).`,
      'Open <b>Pine Holler Ranger</b> from your desktop, Start menu or Applications.',
    ];
    default: return [
      'This browser can\'t install web apps. For the best experience, open the game in <b>Chrome</b>, <b>Edge</b> or <b>Safari</b> and install it from there.',
      'Playing here is fine too: just keep this tab open while you play.',
    ];
  }
}

type Tab = 'ios' | 'android' | 'computer';
const TABS: ReadonlyArray<[Tab, string]> = [['ios', 'iPHONE / iPAD'], ['android', 'ANDROID'], ['computer', 'COMPUTER']];

function tabFor(p: Platform): Tab {
  if (p === 'ios') return 'ios';
  if (p === 'android' || p === 'samsung' || p === 'firefox-android') return 'android';
  return 'computer';
}

/** Steps for a tab: the detected browser's own steps when it's that tab, else every browser's. */
function tabSteps(tab: Tab, p: Platform): string[] {
  if (tabFor(p) === tab && p !== 'desktop-other') return steps(p);
  if (tab === 'ios') return steps('ios');
  if (tab === 'android') return [
    `<b>Chrome:</b> tap the menu ${DOTS} at the top right, then <b>Add to Home screen</b> or <b>Install app</b>, then <b>Install</b>.`,
    '<b>Samsung Internet:</b> tap the menu <b>&#9776;</b> at the bottom right, then <b>Add page to</b> &gt; <b>Home screen</b>.',
    `<b>Firefox:</b> tap the menu ${DOTS}, then <b>Add app to Home screen</b> (or <b>Install</b>).`,
    'Open <b>PH Ranger</b> from your Home Screen or app drawer.',
  ];
  return [
    `<b>Chrome / Edge:</b> click the <b>install icon</b> at the right end of the address bar, or the menu ${DOTS} &gt; <b>Install</b>.`,
    '<b>Safari on a Mac:</b> <b>File &gt; Add to Dock</b>.',
    'Open <b>Pine Holler Ranger</b> from your desktop, Start menu, Dock or Applications.',
  ];
}

function close(never: boolean): void {
  if (never) { try { localStorage.setItem(KEY, 'never'); } catch { /* storage blocked */ } }
  root?.remove();
  root = null;
  document.removeEventListener('keydown', onKey, true);
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); close(false); }
  else e.stopImmediatePropagation(); // keep the title menu still underneath
}

/** Open the instructions. `auto`: the startup check (respects "don't remind me"). */
export function openInstallTip(auto = false): void {
  if (root || isInstalled()) return;
  const p = platform();
  const hasSave = !!loadSave();
  root = document.createElement('div');
  root.className = 'acct-backdrop';
  root.addEventListener('pointerdown', (e) => { if (e.target === root) close(false); });
  let tab = tabFor(p);
  const list = () => tabSteps(tab, p).map((s) => `<li>${s}</li>`).join('');
  const tabs = () => TABS.map(([id, label]) => `<button type="button" class="it-tab${id === tab ? ' on' : ''}" data-tab="${id}" aria-pressed="${id === tab}">${label}</button>`).join('');
  const separate = p === 'ios' || p === 'mac-safari'
    ? 'On Apple devices the Home Screen app keeps its <b>own</b> save, separate from this browser tab.'
    : 'The installed app may keep its own save, separate from this browser tab.';
  root.innerHTML = `
    <div class="acct it" role="dialog" aria-modal="true" aria-labelledby="it-h">
      <h2 id="it-h">PLAY IT AS AN APP</h2>
      <p>Add <b>Pine Holler Ranger</b> to your ${p.startsWith('desktop') || p === 'mac-safari' ? 'computer' : 'Home Screen'}. It opens full-screen with no browser bars, runs smoother, and your progress can't be lost to a closed tab.</p>
      ${deferred ? '<button type="button" class="acct-btn primary tall" data-act="install">INSTALL NOW</button><p class="acct-or">or do it by hand:</p>' : ''}
      <div class="it-tabs" role="group" aria-label="Device">${tabs()}</div>
      <ol class="it-steps">${list()}</ol>
      <p class="acct-small">${separate} ${hasSave
        ? 'You already have a save here: before switching, use <b>EXPORT SAVE</b> on the title screen, then <b>IMPORT SAVE</b> in the app (or sign in to an <b>ACCOUNT</b> in both).'
        : 'Starting fresh? Install first, then begin your game in the app.'}</p>
      <p class="acct-small">Your journal saves each time you sleep in your cabin bed.</p>
      <div class="it-row">
        <button type="button" class="acct-btn primary" data-act="ok">GOT IT</button>
        ${auto ? '<button type="button" class="acct-btn ghost" data-act="never">DON\'T REMIND ME</button>' : ''}
      </div>
    </div>`;
  root.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest('[data-tab]')?.getAttribute('data-tab') as Tab | null;
    if (t && root) {
      tab = t;
      root.querySelector('.it-tabs')!.innerHTML = tabs();
      root.querySelector('.it-steps')!.innerHTML = list();
      return;
    }
    const act = (e.target as HTMLElement).closest('[data-act]')?.getAttribute('data-act');
    if (act === 'ok') close(false);
    else if (act === 'never') close(true);
    else if (act === 'install' && deferred) {
      const ev = deferred;
      deferred = null;
      void ev.prompt().then(() => ev.userChoice).then((r) => { if (r.outcome === 'accepted') close(false); }).catch(() => undefined);
    }
  });
  document.body.appendChild(root);
  document.addEventListener('keydown', onKey, true);
  (root.querySelector('[data-act="ok"]') as HTMLButtonElement | null)?.focus();
}

/** Call once at startup: listen for the browser's install prompt and show the tip on launch in a browser tab. */
export function startInstallTip(canShow: () => boolean): void {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as InstallPrompt; });
  window.addEventListener('appinstalled', () => { deferred = null; close(false); });
  if (isInstalled()) return;
  let never = false;
  try { never = localStorage.getItem(KEY) === 'never'; } catch { /* storage blocked */ }
  const forced = /[?&]installtip=1/.test(location.search);
  if (never && !forced) return;
  if (navigator.webdriver && !forced) return; // automated test runs
  // Wait a beat so the title is up (and Chrome has had a chance to offer its install prompt).
  setTimeout(() => { if (canShow()) openInstallTip(true); }, 900);
}
