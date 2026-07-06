// =====================================================================
// config.ts — EDIT THIS FILE ONLY
// =====================================================================
// After you buy this code, this is the ONLY file you need to change.
// Replace the two placeholder values below with your own Supabase project
// details. See SETUP.md for step-by-step instructions.
// =====================================================================

// Env vars (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_ADMIN_EMAIL) take
// priority over the values below — useful for Vercel / Netlify / Cloudflare
// where you don't want to edit files. If env vars are absent, the values
// pasted here are used (works for Codespaces / Hostinger static builds).
//
// IMPORTANT for source-code selling: never paste PAN_API_KEY or PAN_API_SECRET
// in this file, and never prefix them with VITE_ anywhere. Those keys belong
// ONLY in the hosting platform's Environment Variables (Vercel / Netlify /
// Cloudflare Pages) as plain `PAN_API_KEY` and `PAN_API_SECRET` — server-side
// only. A VITE_ prefix would leak them into the browser bundle.
const ENV = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

export const APP_CONFIG = {
  // 1) Your Supabase Project URL
  //    Where to find it: https://supabase.com/dashboard  →  your project
  //                      →  Project Settings  →  API  →  "Project URL"
  //    Example: "https://abcdxyz12345.supabase.co"
  SUPABASE_URL: ENV.VITE_SUPABASE_URL || "https://gcaddharfmuagplvbjnp.supabase.co",

  // 2) Your Supabase "anon public" API key
  //    Where to find it: same page as above, under "Project API keys",
  //                      copy the value labeled  anon  public.
  //    It is a long string starting with "eyJ..."
  SUPABASE_ANON_KEY:
    ENV.VITE_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjYWRkaGFyZm11YWdwbHZiam5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMTk3OTAsImV4cCI6MjA5ODg5NTc5MH0.Fp_YN89HnLCye-Jg_CkL3AC8n5T127CPbJnia6CyVQ4",

  // 3) First admin email. The user who signs up with THIS email will be
  //    automatically granted the "admin" role. Change this before running
  //    database.sql on a fresh project.
  ADMIN_EMAIL: ENV.VITE_ADMIN_EMAIL || "admin@panme.shop",

  // 4) Default price (in ₹) charged per PAN search until the admin sets a
  //    price from the Admin panel. Only used as a fallback.
  DEFAULT_SEARCH_PRICE: 2,

  // 5) Payment gateway (wallet top-up) — pluggable adapter.
  //    Keys go in HOSTING env vars (Vercel/Netlify/Cloudflare):
  //        PAYMENT_API_URL      = https://your-provider.com   (base URL, no trailing slash)
  //        PAYMENT_USER_TOKEN   = <your provider token / api key>
  //        PAYMENT_API_SECRET   = <optional — only if provider needs a secret too>
  //    ⚠️ NEVER add a VITE_ prefix to the above — it would leak keys into the browser.
  //
  //    Different provider? Just edit the field/response mappings below. No code change.
  //    Default shape targets RapidX-style form-encoded UPI PSPs
  //    (create-order returns result.payment_url, status API returns result.txnStatus).
  PAYMENT: {
    ENABLED: true,
    MIN_AMOUNT: 10,
    MAX_AMOUNT: 50000,
    QUICK_AMOUNTS: [100, 500, 1000, 2000],
    // Endpoint paths (appended to PAYMENT_API_URL)
    CREATE_ORDER_PATH: "/api/create-order",
    STATUS_PATH: "/api/check-order-status",
    // What field name the provider expects in the form-encoded body
    FIELDS: {
      token: "user_token",        // your token/api-key field name
      amount: "amount",
      orderId: "order_id",
      mobile: "customer_mobile",
      redirect: "redirect_url",
      remark1: "remark1",
      remark2: "remark2",
    },
    // Where inside the JSON response to read things (dot-path)
    RESPONSE: {
      // Create-order response
      okFlagPath: "status",                 // "SUCCESS" | true when order created
      okFlagValues: ["SUCCESS", "success", true, "true", 1, "1"],
      paymentUrlPath: "result.payment_url", // where the checkout URL lives
      providerOrderIdPath: "result.orderId",
      messagePath: "message",
      // Status-check response
      statusPath: "result.txnStatus",       // "SUCCESS" | "PENDING" | "FAILURE"
      utrPath: "result.utr",
      amountPath: "result.amount",
      // Fallback paths tried in order if the primary statusPath is undefined.
      statusFallbackPaths: [
        "status", "data.status", "result.status", "txnStatus",
        "payment_status", "result.payment_status", "data.txnStatus",
      ],
      successValues: [
        "SUCCESS", "success", "COMPLETED", "completed",
        "PAID", "paid", "CAPTURED", "captured",
        1, "1", true, "true",
      ],
      pendingValues: [
        "PENDING", "pending", "INITIATED", "initiated",
        "PROCESSING", "processing", "IN_PROGRESS", "in_progress",
      ],
      failureValues: [
        "FAILURE", "failure", "FAILED", "failed",
        "CANCELLED", "cancelled", "CANCELED", "canceled",
        "EXPIRED", "expired", "DECLINED", "declined", "REJECTED", "rejected",
      ],
    },
  },
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
