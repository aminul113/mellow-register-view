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
    return "PAN function `pan-find` is not deployed in this Supabase project. Deploy it from SETUP.md Step 6.5, then test again. Wallet refunded.";
  }

  if (lower.includes("jwt") || lower.includes("unauthorized") || lower.includes("401")) {
    return "PAN function rejected the session. Logout/login again. If it continues, deploy `pan-find` with JWT verification enabled for this same Supabase project. Wallet refunded.";
  }

  if (lower.includes("failed to fetch") || lower.includes("network") || lower.includes("fetch")) {
    return "PAN service is unreachable. Check that `pan-find` is deployed to the same Supabase project used in config.ts / Vercel env vars, then redeploy it. Wallet refunded.";
  }

  return "PAN service returned an error. Check Supabase → Edge Functions → pan-find logs and confirm PAN_API_KEY / PAN_API_SECRET are set in Edge Function Secrets. Wallet refunded.";
}

export async function checkPanServiceHealth(): Promise<PanServiceHealth> {
  const sb = requireSupabase();
  try {
    const { data, error } = await sb.functions.invoke("pan-find", {
      body: { health_check: true },
    });

    if (error) {
      const raw = error.message || "";
      const lower = raw.toLowerCase();
      if (lower.includes("function not found") || lower.includes("404") || lower.includes("not found")) {
        return { status: "function_missing", message: "pan-find function is not deployed in this Supabase project." };
      }
      if (lower.includes("unauthorized") || lower.includes("jwt") || lower.includes("401")) {
        return { status: "unauthorized", message: "Login session rejected. Logout/login and try again." };
      }
      return { status: "error", message: raw || "Health check failed." };
    }

    const outcome = data?.outcome;
    if (outcome === "ready") {
      return { status: "ready", message: data?.message ?? "PAN function is ready." };
    }
    if (outcome === "missing_secrets") {
      return {
        status: "missing_secrets",
        message: data?.message ?? "PAN_API_KEY / PAN_API_SECRET are missing in Edge Function Secrets.",
      };
    }
    return { status: "error", message: data?.message ?? "Unexpected health check response." };
  } catch (error) {
    return { status: "error", message: getPanServiceErrorMessage(error) };
  }
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

  // 2) Call the Supabase Edge Function `pan-find` (keys never touch the browser).
  //    Any thrown error / network failure is caught → finalize as 'error' → auto-refund.
  let apiResult: {
    status: "success" | "not_found" | "error";
    pan?: string | null;
    name?: string | null;
    dob?: string | null;
    raw: unknown;
    message?: string;
  };
  try {
    const { data, error } = await sb.functions.invoke("pan-find", {
      body: { aadhaar_number: aadhaar },
    });
    if (error) throw error;
    const outcome = (data?.outcome ?? "error") as "success" | "not_found" | "error";
    apiResult = {
      status: outcome,
      pan: data?.pan ?? null,
      name: data?.name ?? null,
      dob: data?.dob ?? null,
      raw: data?.raw ?? { message: data?.message ?? "no raw" },
      message: data?.message,
    };
  } catch (e) {
    apiResult = {
      status: "error",
      raw: { error: e instanceof Error ? e.message : String(e) },
      message: getPanServiceErrorMessage(e),
    };
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