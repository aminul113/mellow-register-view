// Server route: POST /api/pan-find
// Runs on the host (Vercel / Netlify / Cloudflare / any TanStack Start
// deployment). Reads PAN_API_KEY / PAN_API_SECRET from hosting env vars —
// never exposed to the browser bundle.
//
// Also handles { health_check: true } for the Admin Panel setup check.
//
// Security:
//   1. Verifies caller's Supabase JWT (rejects anonymous — protects buyer's
//      PanManager quota).
//   2. Validates aadhaar_number = 12 digits.
//   3. Calls PanManager server-side; keys never touch the client.
//   4. Strips provider wallet fields before returning.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mask(a: string) {
  return a.length === 12 ? `${a.slice(0, 4)}XXXX${a.slice(-4)}` : "invalid";
}

export const Route = createFileRoute("/api/pan-find")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // --- Parse body ---
        let body: {
          aadhaar_number?: string;
          health_check?: boolean;
        };
        try {
          body = await request.json();
        } catch {
          return json({ outcome: "error", message: "Invalid JSON body" }, 400);
        }

        // --- Auth: verify Supabase JWT ---
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.replace(/^Bearer\s+/i, "");
        if (!token) {
          return json({ outcome: "error", message: "Unauthorized — please login again." }, 401);
        }

        const SUPABASE_URL =
          process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
        const SUPABASE_ANON_KEY =
          process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
          return json(
            {
              outcome: "error",
              code: "missing_supabase_env",
              message:
                "Supabase env vars missing on the server. Set SUPABASE_URL and SUPABASE_ANON_KEY (or the VITE_ variants) in your hosting dashboard, then redeploy.",
            },
            500,
          );
        }

        const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: userRes, error: userErr } = await sb.auth.getUser(token);
        if (userErr || !userRes?.user) {
          return json({ outcome: "error", message: "Unauthorized — please login again." }, 401);
        }

        // --- Safe health check (Admin Panel diagnostics) ---
        if (body?.health_check === true) {
          const hasApiKey = !!process.env.PAN_API_KEY;
          const hasApiSecret = !!process.env.PAN_API_SECRET;
          return json({
            outcome: hasApiKey && hasApiSecret ? "ready" : "missing_secrets",
            deployed: true,
            secrets: { PAN_API_KEY: hasApiKey, PAN_API_SECRET: hasApiSecret },
            message:
              hasApiKey && hasApiSecret
                ? "PAN service is deployed and provider secrets are present."
                : "PAN_API_KEY / PAN_API_SECRET are missing. Add them in your hosting dashboard (Vercel / Netlify / Cloudflare) → Environment Variables — WITHOUT the VITE_ prefix — then redeploy.",
          });
        }

        // --- Validate input ---
        const aadhaar = String(body?.aadhaar_number ?? "").trim();
        if (!/^[0-9]{12}$/.test(aadhaar)) {
          return json({ outcome: "error", message: "aadhaar_number must be a valid 12-digit number" }, 400);
        }

        // --- Provider secrets ---
        const API_KEY = process.env.PAN_API_KEY;
        const API_SECRET = process.env.PAN_API_SECRET;
        if (!API_KEY || !API_SECRET) {
          return json(
            {
              outcome: "error",
              code: "missing_secrets",
              message:
                "PAN API not configured. Add PAN_API_KEY and PAN_API_SECRET in your hosting dashboard (Vercel/Netlify/Cloudflare) → Environment Variables — WITHOUT the VITE_ prefix — then redeploy.",
            },
            500,
          );
        }

        // --- Call PanManager ---
        const PROVIDER_URL =
          "https://panmanagerai.in/service-api/v1/instant-aadhaar-to-pan/find-pan";
        let providerRaw: {
          status?: boolean;
          message?: string;
          data?: {
            tracking_id?: string | null;
            aadhaar_number?: string | null;
            request_id?: string | null;
            request_status?: string;
            pan_number?: string;
            duration_ms?: number | null;
          };
        };
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
          providerRaw = await r.json().catch(() => ({
            status: false,
            message: `Non-JSON provider response (HTTP ${r.status})`,
          }));
        } catch (e) {
          console.error("pan-find provider network error", {
            aadhaar: mask(aadhaar),
            err: String(e),
          });
          return json({
            outcome: "error",
            message: "Provider network error",
            pan: null,
            name: null,
            dob: null,
            tracking_id: null,
          });
        }

        const data = providerRaw?.data ?? {};
        const trackingId: string | null = data.tracking_id ?? null;
        const requestStatus: string | undefined = data.request_status;
        const pan: string | undefined = data.pan_number;

        console.log("pan-find", {
          aadhaar: mask(aadhaar),
          tracking_id: trackingId,
          http: providerStatus,
          provider_status: providerRaw?.status,
          request_status: requestStatus,
          has_pan: !!pan,
        });

        let outcome: "success" | "not_found" | "error";
        const message: string = providerRaw?.message ?? "";
        if (providerRaw?.status === true && pan) {
          outcome = "success";
        } else if (
          providerRaw?.status === false &&
          (requestStatus === "rejected" || /no record/i.test(message))
        ) {
          outcome = "not_found";
        } else {
          outcome = "error";
        }

        const rawRedacted = {
          status: providerRaw?.status,
          message,
          data: {
            tracking_id: trackingId,
            aadhaar_number: data.aadhaar_number ?? null,
            request_id: data.request_id ?? null,
            request_status: requestStatus ?? null,
            pan_number: pan ?? null,
            duration_ms: data.duration_ms ?? null,
          },
          http_status: providerStatus,
        };

        return json({
          outcome,
          pan: pan ?? null,
          name: null,
          dob: null,
          tracking_id: trackingId,
          message: message || (outcome === "success" ? "PAN retrieved" : "No result"),
          raw: rawRedacted,
        });
      },
    },
  },
});