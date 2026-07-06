// =====================================================================
// config.ts — EDIT THIS FILE ONLY
// =====================================================================
// After you buy this code, this is the ONLY file you need to change.
// Replace the two placeholder values below with your own Supabase project
// details. See SETUP.md for step-by-step instructions.
// =====================================================================

export const APP_CONFIG = {
  // 1) Your Supabase Project URL
  //    Where to find it: https://supabase.com/dashboard  →  your project
  //                      →  Project Settings  →  API  →  "Project URL"
  //    Example: "https://abcdxyz12345.supabase.co"
  SUPABASE_URL: "https://gcaddharfmuagplvbjnp.supabase.co",

  // 2) Your Supabase "anon public" API key
  //    Where to find it: same page as above, under "Project API keys",
  //                      copy the value labeled  anon  public.
  //    It is a long string starting with "eyJ..."
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjYWRkaGFyZm11YWdwbHZiam5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMTk3OTAsImV4cCI6MjA5ODg5NTc5MH0.Fp_YN89HnLCye-Jg_CkL3AC8n5T127CPbJnia6CyVQ4",

  // 3) First admin email. The user who signs up with THIS email will be
  //    automatically granted the "admin" role. Change this before running
  //    database.sql on a fresh project.
  ADMIN_EMAIL: "admin@panme.shop",

  // 4) Default price (in ₹) charged per PAN search until the admin sets a
  //    price from the Admin panel. Only used as a fallback.
  DEFAULT_SEARCH_PRICE: 2,
};

// =====================================================================
// Do NOT edit anything below this line.
// =====================================================================

const PLACEHOLDER_URL = "https://YOUR-PROJECT-REF.supabase.co";
const PLACEHOLDER_KEY = "YOUR-ANON-PUBLIC-KEY-HERE";

export function isConfigured(): boolean {
  return (
    APP_CONFIG.SUPABASE_URL.trim() !== "" &&
    APP_CONFIG.SUPABASE_ANON_KEY.trim() !== "" &&
    APP_CONFIG.SUPABASE_URL !== PLACEHOLDER_URL &&
    APP_CONFIG.SUPABASE_ANON_KEY !== PLACEHOLDER_KEY
  );
}
