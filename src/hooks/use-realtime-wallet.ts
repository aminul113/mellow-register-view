import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-config";
import { getMyWallet } from "@/lib/data-store";

export function useRealtimeWallet() {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const sb = getSupabase();
    if (!sb) return;

    const refresh = () => {
      getMyWallet().then((w) => {
        if (alive) setBalance(w.balance);
      }).catch(() => {});
    };
    refresh();

    let channel: ReturnType<typeof sb.channel> | null = null;
    (async () => {
      const { data } = await sb.auth.getUser();
      const uid = data.user?.id;
      if (!uid || !alive) return;
      channel = sb
        .channel(`wallet:${uid}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${uid}` }, refresh)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "wallet_transactions", filter: `user_id=eq.${uid}` }, refresh)
        .subscribe();
    })();

    const iv = setInterval(refresh, 15000);
    return () => {
      alive = false;
      clearInterval(iv);
      if (channel) sb.removeChannel(channel);
    };
  }, []);

  return balance;
}