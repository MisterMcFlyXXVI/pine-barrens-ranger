/** Export / import the localStorage save as a JSON file (desktop & mobile friendly). */
import { SAVE_KEY, SaveData, clearResume, isPlayableSave } from '../engine/save';

/**
 * Export the save as a JSON file. Where the browser has a Share sheet that accepts
 * files (iPhone, iPad, Android) it opens that, so the file can go to iCloud Drive,
 * Files, AirDrop or email; otherwise it downloads. Also copies the save to the clipboard.
 */
export function exportSave(onDone: (msg: string) => void): void {
  let raw: string | null = null;
  try { raw = localStorage.getItem(SAVE_KEY); } catch { /* blocked */ }
  if (!raw) { onDone('No save to export yet.'); return; }
  let day = 0;
  try { day = (JSON.parse(raw) as SaveData).day; } catch { /* ignore */ }
  const name = `pine-holler-ranger-day${day}.json`;
  try { navigator.clipboard?.writeText(raw).catch(() => undefined); } catch { /* optional */ }

  const file = new File([raw], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    navigator.share({ files: [file], title: 'Pine Holler Ranger save' })
      .then(() => onDone('Save exported. Keep it somewhere safe, like iCloud Drive.'))
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') onDone('Export cancelled.');
        else { download(raw!, name); onDone('Save exported (file downloaded).'); }
      });
    return;
  }
  download(raw, name);
  onDone('Save exported (file downloaded).');
}

function download(raw: string, name: string): void {
  const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Basic shape check so a bad file can never brick the title screen. */
export function validateSave(text: string): SaveData | null {
  try {
    const d: unknown = JSON.parse(text);
    return isPlayableSave(d) ? d : null;
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
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(d)); clearResume(); } catch { onDone('Could not write save (storage blocked).', false); return; }
      onDone(`Imported save: day ${d.day}. Choose CONTINUE.`, true);
    }).catch(() => onDone('Could not read that file.', false));
  });
  document.body.appendChild(input);
  input.click();
}
