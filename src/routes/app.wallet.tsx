import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wallet, MessageCircle, Mail, Phone } from "lucide-react";
import { getMyWallet, listMyTransactions, getSettings, type WalletTx, type AppSettings } from "@/lib/data-store";

export const Route = createFileRoute("/app/wallet")({
  component: WalletPage,
});

function WalletPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [txs, setTxs] = useState<WalletTx[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    Promise.all([getMyWallet(), listMyTransactions(100), getSettings()]).then(([w, t, s]) => {
      setBalance(w.balance);
      setTxs(t);
      setSettings(s);
    });
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Wallet</h1>
        <p className="text-sm text-muted-foreground">Your balance and transactions.</p>
      </div>

      <div className="rounded-2xl border bg-primary text-primary-foreground p-6 shadow-md">
        <div className="flex items-center gap-2 opacity-80 text-sm"><Wallet className="h-4 w-4" /> Current balance</div>
        <div className="mt-2 text-4xl font-bold">₹ {balance == null ? "…" : balance.toFixed(2)}</div>
        <button
          onClick={() => setOpen(true)}
          className="mt-4 cursor-pointer rounded-lg bg-white/15 hover:bg-white/25 px-4 py-2 text-sm font-medium"
        >
          Request top-up
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Request wallet top-up</h3>
            <p className="mt-1 text-sm text-muted-foreground">Contact the admin. They will credit your wallet after payment.</p>
            <div className="mt-4 space-y-2">
              {settings?.support_whatsapp && (
                <a href={`https://wa.me/${settings.support_whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("Hi, I want to add balance to my wallet.")}`}
                   target="_blank" rel="noreferrer"
                   className="flex items-center gap-2 rounded-lg border p-3 hover:bg-muted/40">
                  <MessageCircle className="h-4 w-4 text-emerald-600" /> WhatsApp: {settings.support_whatsapp}
                </a>
              )}
              {settings?.support_phone && (
                <a href={`tel:${settings.support_phone}`} className="flex items-center gap-2 rounded-lg border p-3 hover:bg-muted/40">
                  <Phone className="h-4 w-4 text-primary" /> Call: {settings.support_phone}
                </a>
              )}
              {settings?.support_email && (
                <a href={`mailto:${settings.support_email}?subject=Wallet%20top-up`} className="flex items-center gap-2 rounded-lg border p-3 hover:bg-muted/40">
                  <Mail className="h-4 w-4 text-primary" /> Email: {settings.support_email}
                </a>
              )}
              {!settings?.support_whatsapp && !settings?.support_phone && !settings?.support_email && (
                <div className="text-sm text-muted-foreground">Support contact is not set yet. Ask the admin to configure it.</div>
              )}
            </div>
            <button onClick={() => setOpen(false)} className="mt-5 w-full rounded-lg border px-4 py-2 text-sm hover:bg-muted/40">Close</button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border bg-card">
        <div className="px-5 py-4 border-b font-semibold">Transactions</div>
        {txs.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No transactions yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr><th className="px-5 py-2.5">Date</th><th className="px-5 py-2.5">Type</th><th className="px-5 py-2.5">Amount</th><th className="px-5 py-2.5">Note</th></tr>
              </thead>
              <tbody>
                {txs.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="px-5 py-2.5 whitespace-nowrap">{new Date(t.created_at).toLocaleString()}</td>
                    <td className="px-5 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        t.type === "credit" ? "bg-emerald-500/10 text-emerald-700"
                        : t.type === "refund" ? "bg-blue-500/10 text-blue-700"
                        : "bg-destructive/10 text-destructive"
                      }`}>{t.type}</span>
                    </td>
                    <td className={`px-5 py-2.5 font-medium ${t.type === "debit" ? "text-destructive" : "text-emerald-700"}`}>
                      {t.type === "debit" ? "−" : "+"} ₹ {Number(t.amount).toFixed(2)}
                    </td>
                    <td className="px-5 py-2.5 text-muted-foreground">{t.note ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}