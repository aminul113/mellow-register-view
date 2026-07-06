import { requireSupabase } from "./supabase-config";
import { APP_CONFIG } from "../../config";

export type AppSettings = {
  search_price: number;
  support_phone: string;
  support_whatsapp: string;
  support_email: string;
  brand_name: string;
  brand_tagline: string;
  logo_url: string;
  favicon_url: string;
};

export type Wallet = { balance: number };

export type WalletTx = {
  id: string;
  type: "credit" | "debit" | "refund";
  amount: number;
  note: string | null;
  created_at: string;
};

export type PanSearch = {
  id: string;
  user_id: string;
  aadhaar_last4: string;
  status: "pending" | "success" | "not_found" | "error" | "refunded";
  pan_number: string | null;
  full_name: string | null;
  dob: string | null;
  cost: number;
  created_at: string;
};

export type AdminUser = {
  user_id: string;
  name: string;
  email: string;
  balance: number;
  created_at?: string;
};

// ---------- settings ----------
export async function getSettings(): Promise<AppSettings> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("app_settings")
    .select("search_price,support_phone,support_whatsapp,support_email,brand_name,brand_tagline,logo_url,favicon_url")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (
    data ?? {
      search_price: APP_CONFIG.DEFAULT_SEARCH_PRICE,
      support_phone: "",
      support_whatsapp: "",
      support_email: "",
      brand_name: "PANME SHOP",
      brand_tagline: "Find your PAN card instantly",
      logo_url: "",
      favicon_url: "",
    }
  ) as AppSettings;
}

// ---------- wallet ----------
export async function getMyWallet(): Promise<Wallet> {
  const sb = requireSupabase();
  const { data: userRes } = await sb.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) return { balance: 0 };
  const { data, error } = await sb
    .from("wallets")
    .select("balance")
    .eq("user_id", uid)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return { balance: Number(data?.balance ?? 0) };
}

export async function listMyTransactions(limit = 50): Promise<WalletTx[]> {
  const sb = requireSupabase();
  const { data: userRes } = await sb.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) return [];
  const { data, error } = await sb
    .from("wallet_transactions")
    .select("id,type,amount,note,created_at")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as WalletTx[];
}

// ---------- searches ----------
export async function listMySearches(limit = 200): Promise<PanSearch[]> {
  const sb = requireSupabase();
  const { data: userRes } = await sb.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) return [];
  const { data, error } = await sb
    .from("pan_searches")
    .select("id,user_id,aadhaar_last4,status,pan_number,full_name,dob,cost,created_at")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as PanSearch[];
}

export async function getDashboardStats() {
  const [wallet, searches] = await Promise.all([getMyWallet(), listMySearches(500)]);
  const total = searches.length;
  const rejected = searches.filter(
    (s) => s.status === "not_found" || s.status === "error" || s.status === "refunded",
  ).length;
  const recent = searches.slice(0, 5);
  return { balance: wallet.balance, total, rejected, recent };
}

// ---------- PAN search flow ----------
export type PanSearchResult =
  | { status: "success"; pan: string; name: string; dob: string; search_id: string }
  | { status: "not_found"; message: string; search_id: string }
  | { status: "error"; message: string; search_id: string };

export type PanServiceHealth = {
  status: "ready" | "missing_secrets" | "function_missing" | "unauthorized" | "error";
  message: string;
};

function getPanServiceErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const lower = raw.toLowerCase();

  if (lower.includes("function not found") || lower.includes("404") || lower.includes("not found")) {
    return "PAN service route `/api/pan-find` was not found. Redeploy the app on your hosting platform (Vercel / Netlify / Cloudflare). Wallet refunded.";
  }

  if (lower.includes("jwt") || lower.includes("unauthorized") || lower.includes("401")) {
    return "PAN service rejected your session. Logout and login again. Wallet refunded.";
  }

  if (lower.includes("failed to fetch") || lower.includes("network") || lower.includes("fetch")) {
    return "PAN service is unreachable. Redeploy the app on your hosting platform and confirm PAN_API_KEY / PAN_API_SECRET are set in hosting env vars (no VITE_ prefix). Wallet refunded.";
  }

  return "PAN service returned an error. Check your hosting logs (Vercel / Netlify / Cloudflare) and confirm PAN_API_KEY / PAN_API_SECRET are set in hosting env vars — WITHOUT the VITE_ prefix. Wallet refunded.";
}

async function callPanApi(body: unknown): Promise<{ data: unknown; error: Error | null; status: number }> {
  const sb = requireSupabase();
  const { data: sessionRes } = await sb.auth.getSession();
  const token = sessionRes.session?.access_token;
  if (!token) {
    return { data: null, error: new Error("Unauthorized — please login again."), status: 401 };
  }
  try {
    const res = await fetch("/api/pan-find", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const status = res.status;
    let data: unknown = null;
    try { data = await res.json(); } catch { /* empty */ }
    if (!res.ok) {
      const msg =
        (data && typeof data === "object" && "message" in data && typeof (data as { message?: unknown }).message === "string"
          ? (data as { message: string }).message
          : `HTTP ${status}`);
      return { data, error: new Error(msg), status };
    }
    return { data, error: null, status };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)), status: 0 };
  }
}

export async function checkPanServiceHealth(): Promise<PanServiceHealth> {
  const { data, error, status } = await callPanApi({ health_check: true });

  if (error) {
    const raw = error.message || "";
    const lower = raw.toLowerCase();
    if (status === 404 || lower.includes("not found")) {
      return { status: "function_missing", message: "PAN service route `/api/pan-find` not found. Redeploy the app on your hosting platform." };
    }
    if (status === 401 || lower.includes("unauthorized") || lower.includes("jwt")) {
      return { status: "unauthorized", message: "Login session rejected. Logout/login and try again." };
    }
    return { status: "error", message: getPanServiceErrorMessage(error) };
  }

  const d = (data ?? {}) as { outcome?: string; message?: string };
  const outcome = d.outcome;
    if (outcome === "ready") {
    return { status: "ready", message: d.message ?? "PAN service is ready." };
    }
    if (outcome === "missing_secrets") {
      return {
        status: "missing_secrets",
      message: d.message ?? "PAN_API_KEY / PAN_API_SECRET are missing in hosting env vars.",
      };
    }
  return { status: "error", message: d.message ?? "Unexpected health check response." };
}

export async function runPanSearch(aadhaar: string): Promise<PanSearchResult> {
  const sb = requireSupabase();
  if (!/^[0-9]{12}$/.test(aadhaar)) {
    throw new Error("Aadhaar number must be exactly 12 digits");
  }
  const last4 = aadhaar.slice(-4);

  // 1) debit + create pending row (server-authoritative)
  const { data: debitData, error: debitErr } = await sb.rpc("debit_wallet_for_search", {
    _aadhaar_last4: last4,
  });
  if (debitErr) {
    const msg = debitErr.message || "";
    if (/insufficient balance/i.test(msg)) {
      throw new Error("INSUFFICIENT_BALANCE");
    }
    throw new Error(msg || "Failed to start search");
  }
  const row = Array.isArray(debitData) ? debitData[0] : debitData;
  const searchId: string = row?.search_id;
  if (!searchId) throw new Error("Failed to start search");

  // 2) Call the app server route `/api/pan-find` (keys never touch the browser).
  //    Any thrown error / network failure is caught → finalize as 'error' → auto-refund.
  let apiResult: {
    status: "success" | "not_found" | "error";
    pan?: string | null;
    name?: string | null;
    dob?: string | null;
    raw: unknown;
    message?: string;
  };
  {
    const { data, error } = await callPanApi({ aadhaar_number: aadhaar });
    if (error) {
      apiResult = {
        status: "error",
        raw: { error: error.message },
        message: getPanServiceErrorMessage(error),
      };
    } else {
      const d = (data ?? {}) as {
        outcome?: "success" | "not_found" | "error";
        pan?: string | null;
        name?: string | null;
        dob?: string | null;
        raw?: unknown;
        message?: string;
      };
      const outcome = (d.outcome ?? "error") as "success" | "not_found" | "error";
    apiResult = {
      status: outcome,
        pan: d.pan ?? null,
        name: d.name ?? null,
        dob: d.dob ?? null,
        raw: d.raw ?? { message: d.message ?? "no raw" },
        message: d.message,
      };
    }
  }

  // 3) finalize (idempotent — safe on retries; auto-refunds on non-success)
  const { error: finErr } = await sb.rpc("finalize_search", {
    _search_id: searchId,
    _status: apiResult.status,
    _pan: apiResult.pan ?? null,
    _name: apiResult.name ?? null,
    _dob: apiResult.dob ?? null,
    _raw: (apiResult.raw ?? {}) as object,
  });
  if (finErr) throw new Error(finErr.message);

  if (apiResult.status === "success") {
    return {
      status: "success",
      pan: apiResult.pan ?? "",
      name: apiResult.name ?? "",
      dob: apiResult.dob ?? "",
      search_id: searchId,
    };
  }
  return {
    status: apiResult.status,
    message: apiResult.message ?? "PAN not found — wallet refunded",
    search_id: searchId,
  };
}

// ---------- payment (wallet top-up) ----------
async function callServer(path: string, body: unknown): Promise<{ data: unknown; error: Error | null; status: number }> {
  const sb = requireSupabase();
  const { data: sessionRes } = await sb.auth.getSession();
  const accessToken = sessionRes.session?.access_token;
  if (!accessToken) return { data: null, error: new Error("Unauthorized — please login again."), status: 401 };
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
    let data: unknown = null;
    try { data = await res.json(); } catch { /* empty */ }
    if (!res.ok) {
      const msg =
        data && typeof data === "object" && "message" in data && typeof (data as { message?: unknown }).message === "string"
          ? (data as { message: string }).message
          : `HTTP ${res.status}`;
      return { data, error: new Error(msg), status: res.status };
    }
    return { data, error: null, status: res.status };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)), status: 0 };
  }
}

export type CreatePaymentResult = { order_id: string; payment_url: string };
export async function createPaymentOrder(amount: number): Promise<CreatePaymentResult> {
  const { data, error } = await callServer("/api/payment-create", { amount });
  if (error) throw error;
  const d = (data ?? {}) as { order_id?: string; payment_url?: string; message?: string };
  if (!d.order_id || !d.payment_url) throw new Error(d.message || "Failed to start payment");
  return { order_id: d.order_id, payment_url: d.payment_url };
}

export type VerifyPaymentResult = {
  status: "success" | "pending" | "failed";
  amount?: number;
  message?: string;
};
export async function verifyPayment(orderId: string): Promise<VerifyPaymentResult> {
  const { data, error } = await callServer("/api/payment-verify", { order_id: orderId });
  if (error) return { status: "failed", message: error.message };
  const d = (data ?? {}) as { status?: string; amount?: number; message?: string };
  if (d.status === "success") return { status: "success", amount: d.amount };
  if (d.status === "pending") return { status: "pending" };
  return { status: "failed", message: d.message };
}

export type PaymentHealth = { status: "ready" | "missing_secrets" | "error"; message: string };
export async function checkPaymentHealth(): Promise<PaymentHealth> {
  const { data, error } = await callServer("/api/payment-create", { health_check: true });
  if (error) return { status: "error", message: error.message };
  const d = (data ?? {}) as { outcome?: string; message?: string };
  if (d.outcome === "ready") return { status: "ready", message: d.message ?? "Payment service is ready." };
  if (d.outcome === "missing_secrets") return { status: "missing_secrets", message: d.message ?? "Missing PAYMENT_* env vars." };
  return { status: "error", message: d.message ?? "Unexpected response." };
}

export type PaymentOrderRow = {
  order_id: string;
  amount: number;
  status: "pending" | "success" | "failed";
  utr: string | null;
  created_at: string;
};
export async function listMyPayments(limit = 50): Promise<PaymentOrderRow[]> {
  const sb = requireSupabase();
  const { data: userRes } = await sb.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) return [];
  const { data, error } = await sb
    .from("payment_orders")
    .select("order_id,amount,status,utr,created_at")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as PaymentOrderRow[];
}

// ---------- role check ----------
export async function isCurrentUserAdmin(): Promise<boolean> {
  const sb = requireSupabase();
  const { data: userRes } = await sb.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) return false;
  const { data, error } = await sb
    .from("user_roles")
    .select("role")
    .eq("user_id", uid)
    .eq("role", "admin")
    .maybeSingle();
  if (error) return false;
  return !!data;
}

// ---------- admin ----------
export async function adminFindUser(email: string) {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("admin_find_user", { _email: email });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return row as AdminUser | null;
}

export async function adminListUsers(query = "", limit = 50): Promise<AdminUser[]> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("admin_list_users", {
    _query: query.trim(),
    _limit: limit,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminUser[];
}

export async function adminCreditWallet(userId: string, amount: number, note: string) {
  const sb = requireSupabase();
  const { error } = await sb.rpc("admin_credit_wallet", {
    _user_id: userId,
    _amount: amount,
    _note: note,
  });
  if (error) throw new Error(error.message);
}

export async function adminUpdateSettings(s: {
  search_price: number;
  support_phone: string;
  support_whatsapp: string;
  support_email: string;
  brand_name: string;
  brand_tagline: string;
  logo_url: string;
  favicon_url: string;
}) {
  const sb = requireSupabase();
  const { error } = await sb.rpc("admin_update_settings", {
    _price: s.search_price,
    _phone: s.support_phone,
    _whatsapp: s.support_whatsapp,
    _email: s.support_email,
    _brand_name: s.brand_name,
    _brand_tagline: s.brand_tagline,
    _logo_url: s.logo_url,
    _favicon_url: s.favicon_url,
  });
  if (error) throw new Error(error.message);
}

export async function adminListAllSearches(limit = 200): Promise<PanSearch[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("pan_searches")
    .select("id,user_id,aadhaar_last4,status,pan_number,full_name,dob,cost,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as PanSearch[];
}

export async function adminForceRefundSearch(searchId: string) {
  const sb = requireSupabase();
  const { error } = await sb.rpc("admin_force_refund_search", { _search_id: searchId });
  if (error) throw new Error(error.message);
}