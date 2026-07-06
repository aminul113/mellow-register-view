import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { APP_CONFIG, isConfigured } from "../../config";

export type SupabaseConfig = { url: string; anonKey: string };
export { isConfigured };

let cachedClient: SupabaseClient | null = null;
let cachedKey = "";

export function getSupabaseConfig(): SupabaseConfig | null {
  if (!isConfigured()) return null;
  return {
    url: APP_CONFIG.SUPABASE_URL.replace(/\/$/, ""),
    anonKey: APP_CONFIG.SUPABASE_ANON_KEY,
  };
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
  if (!c) throw new Error("Supabase is not configured. Open config.ts and paste your Supabase URL and anon key.");
  return c;
}