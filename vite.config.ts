import { defineConfig, loadEnv } from 'vite';

/**
 * Supabase (accounts + cloud saves). Only the project URL and the PUBLIC key
 * (anon / publishable) are baked into the game; Row Level Security on the
 * `saves` table keeps every player to their own row. Names are accepted in the
 * forms set by hand (VITE_*) or by Vercel's Supabase integration.
 */
function supabaseConfig(env: Record<string, string>): { url: string; key: string } {
  const pick = (...names: string[]) => names.map((n) => env[n]).find((v) => v && v.trim()) ?? '';
  const url = pick('VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL');
  const key = pick(
    'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY',
  );
  // Never ship a secret key to the browser.
  let role = '';
  try { role = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role ?? ''; } catch { /* not a JWT */ }
  if (key.startsWith('sb_secret_') || role === 'service_role') {
    throw new Error('The Supabase key given to the game is a SECRET (service_role) key. Use the anon / publishable key instead.');
  }
  // Accept the project URL however it was copied (e.g. the ".../rest/v1/" API URL): keep only the origin.
  let origin = url.trim();
  try { if (origin) origin = new URL(origin).origin; } catch { origin = origin.replace(/\/(rest|auth)\/v1\/?.*$/, '').replace(/\/$/, ''); }
  return { url: origin, key };
}

export default defineConfig(({ mode }) => {
  const sb = supabaseConfig(loadEnv(mode, '.', ''));
  return {
    base: '/',
    define: {
      __SB_URL__: JSON.stringify(sb.url),
      __SB_KEY__: JSON.stringify(sb.key),
    },
    build: {
      outDir: 'dist',
      target: 'es2020',
      assetsInlineLimit: 0,
      sourcemap: false,
    },
    server: { host: true },
  };
});
