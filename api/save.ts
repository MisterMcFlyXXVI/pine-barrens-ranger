/**
 * Cloud save backup (Vercel Function, Web-standard handler).
 *
 * Storage: an Upstash Redis database connected to the Vercel project
 * (Vercel dashboard -> Storage -> Upstash for Redis). The integration injects
 * KV_REST_API_URL / KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL / _TOKEN).
 *
 * There are no accounts: each player holds a random recovery code. Saves are
 * stored under a SHA-256 hash of that code, so the database never sees the
 * code itself. Every upload also keeps the previous upload as a spare.
 *
 *   GET  /api/save                               -> { cloud: boolean }
 *   POST /api/save { action: 'save', code, save } -> { ok: true, day }
 *   POST /api/save { action: 'load', code }       -> { save, day }
 *   POST /api/save { action: 'load', code, prev: true } -> the spare copy
 */

declare const process: { env: Record<string, string | undefined> };

const MAX_BYTES = 300_000;
const TTL_SECONDS = 60 * 60 * 24 * 400; // refreshed on every upload
const CODE_RE = /^[A-HJ-NP-Z2-9]{12}$/;

interface Redis { url: string; token: string }

function redis(): Redis | null {
  const env = process.env;
  let url = env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL;
  let token = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    // The integration lets you pick a custom prefix (e.g. STORAGE_KV_REST_API_URL); find any matching pair.
    for (const [k, v] of Object.entries(env)) {
      if (!v) continue;
      const m = /^(.*)(KV_REST_API_URL|REDIS_REST_URL)$/.exec(k);
      if (!m) continue;
      const tok = env[m[1] + m[2].replace('URL', 'TOKEN')];
      if (tok) { url = v; token = tok; break; }
    }
  }
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

async function cmd(r: Redis, args: Array<string | number>): Promise<unknown> {
  const res = await fetch(r.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${r.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const body = (await res.json()) as { result?: unknown; error?: string };
  if (!res.ok || body.error) throw new Error(body.error ?? `redis ${res.status}`);
  return body.result;
}

async function keyFor(code: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`pine-holler:${code}`));
  return 'save:' + Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export function GET(): Response {
  return json({ cloud: redis() !== null });
}

export async function POST(request: Request): Promise<Response> {
  const r = redis();
  if (!r) return json({ error: 'Cloud backup is not set up on this site yet.' }, 503);

  const text = await request.text();
  if (text.length > MAX_BYTES) return json({ error: 'Save is too large.' }, 413);
  let body: { action?: string; code?: string; save?: string; prev?: boolean };
  try { body = JSON.parse(text); } catch { return json({ error: 'Bad request.' }, 400); }
  const code = String(body.code ?? '');
  if (!CODE_RE.test(code)) return json({ error: 'That is not a valid cloud code.' }, 400);
  const key = await keyFor(code);

  try {
    if (body.action === 'save') {
      const save = String(body.save ?? '');
      let day: unknown;
      try { const d = JSON.parse(save) as { v?: unknown; day?: unknown }; if (d.v !== 1) throw 0; day = d.day; } catch { return json({ error: 'That is not a valid save.' }, 400); }
      if (typeof day !== 'number') return json({ error: 'That is not a valid save.' }, 400);
      const old = await cmd(r, ['GET', key]);
      if (typeof old === 'string' && old !== save) await cmd(r, ['SET', `${key}:prev`, old, 'EX', TTL_SECONDS]);
      await cmd(r, ['SET', key, save, 'EX', TTL_SECONDS]);
      return json({ ok: true, day });
    }
    if (body.action === 'load') {
      const save = await cmd(r, ['GET', body.prev ? `${key}:prev` : key]);
      if (typeof save !== 'string') return json({ error: 'No cloud save found for that code.' }, 404);
      let day = 0;
      try { day = (JSON.parse(save) as { day: number }).day; } catch { /* stored saves are validated on upload */ }
      return json({ save, day });
    }
    return json({ error: 'Unknown action.' }, 400);
  } catch {
    return json({ error: 'The cloud database did not answer. Try again later.' }, 502);
  }
}
