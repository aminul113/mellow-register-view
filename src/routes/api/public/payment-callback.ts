// Public server route: POST/GET /api/public/payment-callback
// Optional server-to-server callback from the payment provider. It re-verifies
// the order via the provider's status API (double-check) and credits the wallet
// idempotently via the SECURITY DEFINER RPC.
//
// Public prefix bypasses auth (the provider has no user session). We still
// authenticate to Supabase using the SERVICE_ROLE key so the RPC can act as
// admin. Configure the callback URL in your provider dashboard to:
//   https://YOUR-DOMAIN/api/public/payment-callback
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { APP_CONFIG } from "../../../../config";

function ok(body: unknown = { ok: true }) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function getPath(obj: unknown, path: string): unknown {
  if (!path) return undefined;
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function matches(value: unknown, allowed: readonly unknown[]): boolean {
  if (value === undefined || value === null) return false;
  return allowed.some((v) => String(v).toLowerCase() === String(value).toLowerCase());
}

async function extractOrderId(request: Request): Promise<string> {
  const url = new URL(request.url);
  let id = url.searchParams.get("order_id") || url.searchParams.get("orderId") || "";
  if (id) return id;
  if (request.method === "POST") {
    const ct = request.headers.get("content-type") ?? "";
    try {
      if (ct.includes("application/json")) {
        const j = (await request.clone().json()) as Record<string, unknown>;
        id = String(j.order_id ?? j.orderId ?? "");
      } else {
        const fd = await request.clone().formData();
        id = String(fd.get("order_id") ?? fd.get("orderId") ?? "");
      }
    } catch { /* empty */ }
  }
  return id;
}

async function handle(request: Request) {
  const orderId = (await extractOrderId(request)).trim();
  if (!orderId) return ok({ ok: false, reason: "missing order_id" });

  const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    // Best-effort — cannot verify without service role. Return 200 so the
    // provider doesn't retry-storm; the return page will still verify.
    return ok({ ok: false, reason: "server not configured (SUPABASE_SERVICE_ROLE_KEY missing)" });
  }

  const PAYMENT_API_URL = (process.env.PAYMENT_API_URL || "").replace(/\/+$/, "");
  const PAYMENT_USER_TOKEN = process.env.PAYMENT_USER_TOKEN || "";
  const PAYMENT_API_SECRET = process.env.PAYMENT_API_SECRET || "";
  if (!PAYMENT_API_URL || !PAYMENT_USER_TOKEN) return ok({ ok: false, reason: "payment not configured" });

  const { FIELDS, STATUS_PATH, RESPONSE } = APP_CONFIG.PAYMENT;
  const form = new URLSearchParams();
  form.set(FIELDS.token, PAYMENT_USER_TOKEN);
  form.set(FIELDS.orderId, orderId);

  let providerRaw: unknown = null;
  try {
    const r = await fetch(`${PAYMENT_API_URL}${STATUS_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        ...(PAYMENT_API_SECRET ? { "x-api-secret": PAYMENT_API_SECRET } : {}),
      },
      body: form.toString(),
    });
    providerRaw = await r.json().catch(async () => ({ raw_text: await r.text().catch(() => "") }));
  } catch (e) {
    return ok({ ok: false, reason: "provider unreachable", detail: String(e) });
  }

  const txnStatus = getPath(providerRaw, RESPONSE.statusPath);
  const utr = getPath(providerRaw, RESPONSE.utrPath);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (matches(txnStatus, RESPONSE.successValues)) {
    await admin.rpc("credit_wallet_for_payment", {
      _order_id: orderId,
      _utr: typeof utr === "string" ? utr : null,
      _raw: (providerRaw ?? {}) as object,
    });
    return ok({ ok: true, status: "success" });
  }
  if (matches(txnStatus, RESPONSE.pendingValues)) {
    return ok({ ok: true, status: "pending" });
  }
  await admin.rpc("mark_payment_failed", {
    _order_id: orderId,
    _raw: (providerRaw ?? {}) as object,
  });
  return ok({ ok: true, status: "failed" });
}

export const Route = createFileRoute("/api/public/payment-callback")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});
