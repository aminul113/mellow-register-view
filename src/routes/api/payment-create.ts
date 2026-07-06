// Server route: POST /api/payment-create
// Creates a wallet top-up order with the configured payment provider and
// returns { payment_url, order_id } for the client to redirect to.
//
// Provider keys (PAYMENT_API_URL / PAYMENT_USER_TOKEN / PAYMENT_API_SECRET)
// live in hosting env vars — never in the browser bundle.
//
// Buyer swapping providers? Edit config.ts → APP_CONFIG.PAYMENT — no code
// change needed here.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { APP_CONFIG } from "../../../config";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
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

function isOk(value: unknown, allowed: readonly unknown[]): boolean {
  if (value === undefined || value === null) return false;
  return allowed.some((v) => v === value || String(v).toLowerCase() === String(value).toLowerCase());
}

export const Route = createFileRoute("/api/payment-create")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { amount?: number; health_check?: boolean };
        try {
          body = await request.json();
        } catch {
          return json({ outcome: "error", message: "Invalid JSON body" }, 400);
        }

        // --- Auth: verify Supabase JWT ---
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.replace(/^Bearer\s+/i, "");
        if (!token) return json({ outcome: "error", message: "Unauthorized — please login again." }, 401);

        const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
        const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
          return json({ outcome: "error", message: "Supabase env vars missing on the server." }, 500);
        }
        const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: userRes, error: userErr } = await sb.auth.getUser(token);
        if (userErr || !userRes?.user) {
          return json({ outcome: "error", message: "Unauthorized — please login again." }, 401);
        }

        // --- Provider secrets ---
        const PAYMENT_API_URL = (process.env.PAYMENT_API_URL || "").replace(/\/+$/, "");
        const PAYMENT_USER_TOKEN = process.env.PAYMENT_USER_TOKEN || "";
        const PAYMENT_API_SECRET = process.env.PAYMENT_API_SECRET || "";

        // --- Health check (Admin panel diagnostics) ---
        if (body?.health_check === true) {
          const hasUrl = !!PAYMENT_API_URL;
          const hasToken = !!PAYMENT_USER_TOKEN;
          return json({
            outcome: hasUrl && hasToken ? "ready" : "missing_secrets",
            secrets: {
              PAYMENT_API_URL: hasUrl,
              PAYMENT_USER_TOKEN: hasToken,
              PAYMENT_API_SECRET: !!PAYMENT_API_SECRET,
            },
            message:
              hasUrl && hasToken
                ? "Payment service is deployed and provider secrets are present."
                : "PAYMENT_API_URL / PAYMENT_USER_TOKEN missing. Add them in your hosting dashboard (Vercel/Netlify/Cloudflare) → Environment Variables — WITHOUT the VITE_ prefix — then redeploy.",
          });
        }

        if (!APP_CONFIG.PAYMENT.ENABLED) {
          return json({ outcome: "error", message: "Payment is currently disabled." }, 400);
        }
        if (!PAYMENT_API_URL || !PAYMENT_USER_TOKEN) {
          return json(
            {
              outcome: "error",
              code: "missing_secrets",
              message:
                "Payment API not configured. Add PAYMENT_API_URL and PAYMENT_USER_TOKEN in hosting env vars (no VITE_ prefix), then redeploy.",
            },
            500,
          );
        }

        // --- Validate amount ---
        const amount = Number(body?.amount);
        const { MIN_AMOUNT, MAX_AMOUNT } = APP_CONFIG.PAYMENT;
        if (!Number.isFinite(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
          return json(
            { outcome: "error", message: `Amount must be between ₹${MIN_AMOUNT} and ₹${MAX_AMOUNT}` },
            400,
          );
        }
        const roundedAmount = Math.round(amount * 100) / 100;

        // --- Create pending order in DB (server-generated order_id) ---
        // Use a user-scoped client so auth.uid() works inside the RPC.
        const sbUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data: created, error: createErr } = await sbUser.rpc("create_payment_order", {
          _amount: roundedAmount,
        });
        if (createErr) {
          return json({ outcome: "error", message: createErr.message || "Failed to create order" }, 500);
        }
        const row = Array.isArray(created) ? created[0] : created;
        const orderId: string | undefined = row?.order_id;
        if (!orderId) return json({ outcome: "error", message: "Failed to create order" }, 500);

        // --- Build redirect URL back to our app ---
        const originHeader =
          request.headers.get("origin") ||
          `${new URL(request.url).protocol}//${request.headers.get("host") ?? new URL(request.url).host}`;
        const redirectUrl = `${originHeader}/app/payment-return?order_id=${encodeURIComponent(orderId)}`;

        // --- Provider call (form-encoded) ---
        const { FIELDS, CREATE_ORDER_PATH, RESPONSE } = APP_CONFIG.PAYMENT;
        const form = new URLSearchParams();
        form.set(FIELDS.token, PAYMENT_USER_TOKEN);
        form.set(FIELDS.amount, String(roundedAmount));
        form.set(FIELDS.orderId, orderId);
        form.set(FIELDS.redirect, redirectUrl);
        // Optional fields — send only if configured
        const email = userRes.user.email ?? "";
        const phone = (userRes.user.phone as string | undefined) ?? "";
        if (FIELDS.mobile) form.set(FIELDS.mobile, phone || "9999999999");
        if (FIELDS.remark1) form.set(FIELDS.remark1, `wallet-topup-${userRes.user.id.slice(0, 8)}`);
        if (FIELDS.remark2 && email) form.set(FIELDS.remark2, email);

        let providerRaw: unknown = null;
        let providerHttp = 0;
        try {
          const r = await fetch(`${PAYMENT_API_URL}${CREATE_ORDER_PATH}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Accept: "application/json",
              ...(PAYMENT_API_SECRET ? { "x-api-secret": PAYMENT_API_SECRET } : {}),
            },
            body: form.toString(),
          });
          providerHttp = r.status;
          providerRaw = await r.json().catch(async () => ({ raw_text: await r.text().catch(() => "") }));
        } catch (e) {
          await sbUser.rpc("mark_payment_failed", {
            _order_id: orderId,
            _raw: { network_error: String(e) },
          });
          return json({ outcome: "error", message: "Payment provider unreachable. Try again." }, 502);
        }

        const okFlag = getPath(providerRaw, RESPONSE.okFlagPath);
        const paymentUrl = getPath(providerRaw, RESPONSE.paymentUrlPath);
        const providerOrderId = getPath(providerRaw, RESPONSE.providerOrderIdPath);
        const providerMessage = getPath(providerRaw, RESPONSE.messagePath);

        console.log("payment-create", {
          order_id: orderId,
          http: providerHttp,
          ok: okFlag,
          has_url: !!paymentUrl,
        });

        if (!isOk(okFlag, RESPONSE.okFlagValues) || typeof paymentUrl !== "string" || !paymentUrl) {
          await sbUser.rpc("mark_payment_failed", {
            _order_id: orderId,
            _raw: { http: providerHttp, response: providerRaw },
          });
          return json(
            {
              outcome: "error",
              message:
                (typeof providerMessage === "string" && providerMessage) ||
                "Provider rejected the order. Check PAYMENT_USER_TOKEN and PAYMENT_API_URL in hosting env vars.",
              raw: providerRaw,
            },
            502,
          );
        }

        // Save provider order id if present (best-effort, non-critical)
        if (typeof providerOrderId === "string" && providerOrderId) {
          await sbUser
            .from("payment_orders")
            .update({ provider_order_id: providerOrderId })
            .eq("order_id", orderId);
        }

        return json({
          outcome: "success",
          order_id: orderId,
          payment_url: paymentUrl,
        });
      },
    },
  },
});
