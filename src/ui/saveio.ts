/** Export / import the localStorage save as a JSON file (desktop & mobile friendly). */
import { SAVE_KEY, SAVE_VERSION, SaveData } from '../engine/save';

export function exportSave(): string {
  let raw: string | null = null;
  try { raw = localStorage.getItem(SAVE_KEY); } catch { /* blocked */ }
  if (!raw) return 'No save to export yet.';
  let day = 0;
  try { day = (JSON.parse(raw) as SaveData).day; } catch { /* ignore */ }
  const blob = new Blob([raw], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pine-holler-ranger-day${day}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  try { navigator.clipboard?.writeText(raw).catch(() => undefined); } catch { /* optional */ }
  return 'Save exported (file downloaded).';
}

/** Basic shape check so a bad file can never brick the title screen. */
export function validateSave(text: string): SaveData | null {
  try {
    const d = JSON.parse(text) as SaveData;
    if (!d || typeof d !== 'object' || d.v !== SAVE_VERSION) return null;
    if (typeof d.day !== 'number' || typeof d.minutes !== 'number' || !Array.isArray(d.inv) || typeof d.map !== 'string') return null;
    return d;
  } catch {
    return null;
  }
}

/** Opens a file picker; resolves with a status message. Must run during a user gesture. */
export function importSave(onDone: (msg: string, ok: boolean) => void): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json,text/plain';
  input.style.display = 'none';
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    input.remove();
    if (!file) { onDone('Import cancelled.', false); return; }
    file.text().then((text) => {
      const d = validateSave(text);
      if (!d) { onDone('That file is not a Pine Holler Ranger save.', false); return; }
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(d)); } catch { onDone('Could not write save (storage blocked).', false); return; }
      onDone(`Imported save: day ${d.day}. Choose CONTINUE.`, true);
    }).catch(() => onDone('Could not read that file.', false));
  });
  document.body.appendChild(input);
  input.click();
}
