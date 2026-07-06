// Supabase Edge Function: pan-find
// Buyer deploys once: `supabase functions deploy pan-find --no-verify-jwt`
// Required secrets (Supabase → Edge Functions → Secrets):
//   PAN_API_KEY, PAN_API_SECRET
// Provider: https://panmanagerai.in/service-api/v1/instant-aadhaar-to-pan/find-pan
//
// This function:
//   1. Verifies the caller's Supabase JWT (never anonymous — protects buyer's quota).
//   2. Validates aadhaar_number is exactly 12 digits.
//   3. Calls the PAN provider with x-api-key / x-api-secret (never exposed to client).
//   4. Returns a normalized shape and strips provider wallet fields.
//
// Wallet debit / refund happens in Postgres RPCs (debit_wallet_for_search /
// finalize_search) called from the browser — this function is API-call-only.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function mask(a: string) {
  return a.length === 12 ? `${a.slice(0, 4)}XXXX${a.slice(-4)}` : "invalid";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ outcome: "error", message: "Method not allowed" }, 405);

  // --- 1. Auth: verify Supabase JWT ---
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ outcome: "error", message: "Unauthorized" }, 401);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return json({ outcome: "error", message: "Supabase env not set on function" }, 500);
  }
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userRes, error: userErr } = await sb.auth.getUser(token);
  if (userErr || !userRes?.user) return json({ outcome: "error", message: "Unauthorized" }, 401);

  // --- 2. Validate input ---
  let body: any;
  try { body = await req.json(); } catch { return json({ outcome: "error", message: "Invalid JSON body" }, 400); }
  const aadhaar = String(body?.aadhaar_number ?? "").trim();
  if (!/^[0-9]{12}$/.test(aadhaar)) {
    return json({ outcome: "error", message: "aadhaar_number must be a valid 12-digit number" }, 400);
  }

  // --- 3. Provider secrets ---
  const API_KEY = Deno.env.get("PAN_API_KEY");
  const API_SECRET = Deno.env.get("PAN_API_SECRET");
  if (!API_KEY || !API_SECRET) {
    return json({
      outcome: "error",
      message: "PAN API not configured. Set PAN_API_KEY and PAN_API_SECRET in Supabase → Edge Functions → Secrets.",
    }, 500);
  }

  // --- 4. Call provider ---
  const PROVIDER_URL = "https://panmanagerai.in/service-api/v1/instant-aadhaar-to-pan/find-pan";
  let providerRaw: any;
  let providerStatus = 0;
  try {
    const r = await fetch(PROVIDER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "x-api-secret": API_SECRET,
      },
      body: JSON.stringify({ aadhaar_number: aadhaar }),
    });
    providerStatus = r.status;
    providerRaw = await r.json().catch(() => ({ status: false, message: `Non-JSON provider response (HTTP ${r.status})` }));
  } catch (e) {
    console.error("pan-find provider network error", { aadhaar: mask(aadhaar), err: String(e) });
    return json({ outcome: "error", message: "Provider network error", pan: null, name: null, dob: null, tracking_id: null });
  }

  // Strip provider wallet fields so buyer's internal wallet numbers never leak client-side
  const data = providerRaw?.data ?? {};
  const trackingId: string | null = data?.tracking_id ?? null;
  const requestStatus: string | undefined = data?.request_status;
  const pan: string | undefined = data?.pan_number;

  console.log("pan-find", {
    aadhaar: mask(aadhaar),
    tracking_id: trackingId,
    http: providerStatus,
    provider_status: providerRaw?.status,
    request_status: requestStatus,
    has_pan: !!pan,
  });

  // --- 5. Outcome mapping (per API docs) ---
  let outcome: "success" | "not_found" | "error";
  let message: string = providerRaw?.message ?? "";
  if (providerRaw?.status === true && pan) {
    outcome = "success";
  } else if (providerRaw?.status === false && (requestStatus === "rejected" || /no record/i.test(message))) {
    outcome = "not_found";
  } else {
    outcome = "error";
  }

  // Redacted raw for storage — drop provider wallet balances
  const rawRedacted = {
    status: providerRaw?.status,
    message,
    data: {
      tracking_id: trackingId,
      aadhaar_number: data?.aadhaar_number ?? null, // provider already masks this
      request_id: data?.request_id ?? null,
      request_status: requestStatus ?? null,
      pan_number: pan ?? null,
      duration_ms: data?.duration_ms ?? null,
    },
    http_status: providerStatus,
  };

  return json({
    outcome,
    pan: pan ?? null,
    name: null, // provider does not return name/dob in this endpoint
    dob: null,
    tracking_id: trackingId,
    message: message || (outcome === "success" ? "PAN retrieved" : "No result"),
    raw: rawRedacted,
  });
});