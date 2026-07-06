import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const STORAGE_KEY = "panme_supabase_config";

export type SupabaseConfig = { url: string; anonKey: string };

let cachedClient: SupabaseClient | null = null;
let cachedKey = "";

export function getSupabaseConfig(): SupabaseConfig | null {
  if (typeof window === "undefined") return null;
  // 1. localStorage (set by /setup wizard)
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SupabaseConfig;
      if (parsed?.url && parsed?.anonKey) return parsed;
    }
  } catch {
    /* ignore */
  }
  // 2. build-time env (for buyers who prefer .env)
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey =
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);
  if (url && anonKey) return { url, anonKey };
  return null;
}

export function saveSupabaseConfig(cfg: SupabaseConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  cachedClient = null;
  cachedKey = "";
}

export function clearSupabaseConfig() {
  localStorage.removeItem(STORAGE_KEY);
  cachedClient = null;
  cachedKey = "";
}

export function getSupabase(): SupabaseClient | null {
  const cfg = getSupabaseConfig();
  if (!cfg) return null;
  const key = `${cfg.url}::${cfg.anonKey}`;
  if (cachedClient && cachedKey === key) return cachedClient;
  cachedClient = createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: "panme_auth" },
  });
  cachedKey = key;
  return cachedClient;
}

export function requireSupabase(): SupabaseClient {
  const c = getSupabase();
  if (!c) throw new Error("Supabase is not configured. Visit /setup.");
  return c;
}

/** Try a harmless request to verify the URL + anon key work. */
export async function testConnection(cfg: SupabaseConfig): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = createClient(cfg.url, cfg.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await client.auth.getSession();
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

/** Verify the SQL script has been applied (checks for `profiles` table). */
export async function verifySchema(cfg: SupabaseConfig): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = createClient(cfg.url, cfg.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await client.from("profiles").select("id").limit(1);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}