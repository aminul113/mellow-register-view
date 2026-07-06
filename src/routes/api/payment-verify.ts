// Server route: POST /api/payment-verify
// Called by the return page (or admin retry) to check an order's status
// with the provider and credit the wallet on success (idempotent RPC).
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

function matches(value: unknown, allowed: readonly unknown[]): boolean {
  if (value === undefined || value === null) return false;
  return allowed.some((v) => String(v).toLowerCase() === String(value).toLowerCase());
}

export const Route = createFileRoute("/api/payment-verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { order_id?: string };
        try {
          body = await request.json();
        } catch {
          return json({ outcome: "error", message: "Invalid JSON body" }, 400);
        }

        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.replace(/^Bearer\s+/i, "");
        if (!token) return json({ outcome: "error", message: "Unauthorized" }, 401);

        const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
        const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
          return json({ outcome: "error", message: "Supabase env vars missing on server." }, 500);
        }

        const sbUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data: userRes, error: userErr } = await sbUser.auth.getUser(token);
        if (userErr || !userRes?.user) return json({ outcome: "error", message: "Unauthorized" }, 401);

        const orderId = String(body?.order_id ?? "").trim();
        if (!orderId) return json({ outcome: "error", message: "order_id required" }, 400);

        // Fetch order row (RLS scopes to user)
        const { data: orderRow, error: orderErr } = await sbUser
          .from("payment_orders")
          .select("order_id,amount,status,credited_at")
          .eq("order_id", orderId)
          .maybeSingle();
        if (orderErr || !orderRow) {
          return json({ outcome: "error", message: "Order not found" }, 404);
        }

        // Short-circuit if already terminal
        if (orderRow.status === "success") {
          return json({ outcome: "success", status: "success", amount: Number(orderRow.amount), order_id: orderId, already_credited: true });
        }
        if (orderRow.status === "failed") {
          return json({ outcome: "success", status: "failed", order_id: orderId });
        }

        // --- Call provider status API ---
        const PAYMENT_API_URL = (process.env.PAYMENT_API_URL || "").replace(/\/+$/, "");
        const PAYMENT_USER_TOKEN = process.env.PAYMENT_USER_TOKEN || "";
        const PAYMENT_API_SECRET = process.env.PAYMENT_API_SECRET || "";
        if (!PAYMENT_API_URL || !PAYMENT_USER_TOKEN) {
          return json({ outcome: "error", message: "Payment not configured on server." }, 500);
        }

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
          return json({ outcome: "error", message: "Provider unreachable", detail: String(e) }, 502);
        }

        const txnStatus = getPath(providerRaw, RESPONSE.statusPath);
        const utr = getPath(providerRaw, RESPONSE.utrPath);

        console.log("payment-verify", { order_id: orderId, txnStatus, has_utr: !!utr });

        if (matches(txnStatus, RESPONSE.successValues)) {
          const { error: credErr } = await sbUser.rpc("credit_wallet_for_payment", {
            _order_id: orderId,
            _utr: typeof utr === "string" ? utr : null,
            _raw: (providerRaw ?? {}) as object,
          });
          if (credErr) {
            return json({ outcome: "error", message: credErr.message || "Credit failed" }, 500);
          }
          return json({ outcome: "success", status: "success", amount: Number(orderRow.amount), order_id: orderId });
        }

        if (matches(txnStatus, RESPONSE.pendingValues)) {
          return json({ outcome: "success", status: "pending", order_id: orderId });
        }

        // Anything else → failed
        await sbUser.rpc("mark_payment_failed", {
          _order_id: orderId,
          _raw: (providerRaw ?? {}) as object,
        });
        return json({ outcome: "success", status: "failed", order_id: orderId, raw: providerRaw });
      },
    },
  },
});
