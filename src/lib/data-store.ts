import { requireSupabase } from "./supabase-config";
import { APP_CONFIG } from "../../config";

export type AppSettings = {
  search_price: number;
  support_phone: string;
  support_whatsapp: string;
  support_email: string;
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

// ---------- settings ----------
export async function getSettings(): Promise<AppSettings> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("app_settings")
    .select("search_price,support_phone,support_whatsapp,support_email")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (
    data ?? {
      search_price: APP_CONFIG.DEFAULT_SEARCH_PRICE,
      support_phone: "",
      support_whatsapp: "",
      support_email: "",
    }
  );
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

// ---------- PAN search flow (stubbed API — Phase 2 replaces the fetch) ----------
export type PanSearchResult =
  | { status: "success"; pan: string; name: string; dob: string; search_id: string }
  | { status: "not_found"; message: string; search_id: string }
  | { status: "error"; message: string; search_id: string };

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
  if (debitErr) throw new Error(debitErr.message);
  const row = Array.isArray(debitData) ? debitData[0] : debitData;
  const searchId: string = row?.search_id;
  if (!searchId) throw new Error("Failed to start search");

  // 2) CALL EXTERNAL PAN API HERE (Phase 2 — replace the block below)
  //    Expected shape after mapping: { status, pan?, name?, dob?, raw }
  //    Right now we simulate an "error" so the auto-refund path is exercised.
  const apiResult: {
    status: "success" | "not_found" | "error";
    pan?: string;
    name?: string;
    dob?: string;
    raw: unknown;
    message?: string;
  } = {
    status: "error",
    raw: { stub: true, message: "PAN API not configured yet. Buyer will plug the provider here." },
    message: "PAN API not configured yet. See src/lib/data-store.ts → runPanSearch()",
  };

  // 3) finalize (auto-refund on non-success)
  const { error: finErr } = await sb.rpc("finalize_search", {
    _search_id: searchId,
    _status: apiResult.status,
    _pan: apiResult.pan ?? null,
    _name: apiResult.name ?? null,
    _dob: apiResult.dob ?? null,
    _raw: apiResult.raw as object,
  });
  if (finErr) throw new Error(finErr.message);

  if (apiResult.status === "success") {
    return {
      status: "success",
      pan: apiResult.pan!,
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
  return row as { user_id: string; name: string; email: string; balance: number } | null;
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
}) {
  const sb = requireSupabase();
  const { error } = await sb.rpc("admin_update_settings", {
    _price: s.search_price,
    _phone: s.support_phone,
    _whatsapp: s.support_whatsapp,
    _email: s.support_email,
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