import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wallet, MessageCircle, Mail, Phone, ArrowDownLeft, ArrowUpRight, RefreshCw, CreditCard, Loader2 } from "lucide-react";
import { listMyTransactions, getSettings, createPaymentOrder, type WalletTx, type AppSettings } from "@/lib/data-store";
import { APP_CONFIG } from "../../config";
import { useRealtimeWallet } from "@/hooks/use-realtime-wallet";
import { Skeleton } from "@/components/ui/skeleton";
import { swalError } from "@/lib/swal";

export const Route = createFileRoute("/app/wallet")({
  component: WalletPage,
});

function WalletPage() {
  const balance = useRealtimeWallet();
  const [txs, setTxs] = useState<WalletTx[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [paying, setPaying] = useState(false);
  const paymentEnabled = APP_CONFIG.PAYMENT.ENABLED;
  const { MIN_AMOUNT, MAX_AMOUNT, QUICK_AMOUNTS } = APP_CONFIG.PAYMENT;

  async function startPayment() {
    const n = Number(amount);
    if (!Number.isFinite(n) || n < MIN_AMOUNT || n > MAX_AMOUNT) {
      swalError("Invalid amount", `Enter an amount between ₹${MIN_AMOUNT} and ₹${MAX_AMOUNT}`);
      return;
    }
    setPaying(true);
    try {
      const r = await createPaymentOrder(n);
      window.location.href = r.payment_url;
    } catch (e) {
      setPaying(false);
      swalError("Payment failed", e instanceof Error ? e.message : "Could not start payment");
    }
  }

  useEffect(() => {
    Promise.all([listMyTransactions(100), getSettings()]).then(([t, s]) => {
      setTxs(t);
      setSettings(s);
    });
    const iv = setInterval(() => {
      listMyTransactions(100).then(setTxs).catch(() => {});
    }, 15000);
    return () => clearInterval(iv);
  }, []);

  const credited = txs.filter((t) => t.type !== "debit").reduce((a, b) => a + Number(b.amount), 0);
  const spent = txs.filter((t) => t.type === "debit").reduce((a, b) => a + Number(b.amount), 0);
  const loadingList = settings === null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Wallet</h1>
        <p className="text-sm text-muted-foreground">Your balance and transactions.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-3 relative overflow-hidden rounded-2xl [background:var(--grad-wallet)] text-white p-6 shadow-lg">
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 opacity-90 text-sm"><Wallet className="h-4 w-4" /> Current balance <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" /> Live</span></div>
              <div className="mt-2 text-4xl sm:text-5xl font-extrabold tracking-tight">₹ {balance == null ? "…" : balance.toFixed(2)}</div>
            </div>
            <button
              onClick={() => setOpen(true)}
              className="cursor-pointer rounded-lg bg-white text-emerald-800 hover:bg-white/90 px-4 py-2 text-sm font-semibold shadow"
            >
              Contact admin
            </button>
          </div>
        </div>
        <StatCard label="Total credited" value={`₹ ${credited.toFixed(2)}`} icon={ArrowDownLeft} tone="emerald" />
        <StatCard label="Total spent" value={`₹ ${spent.toFixed(2)}`} icon={ArrowUpRight} tone="rose" />
        <StatCard label="Transactions" value={String(txs.length)} icon={RefreshCw} tone="blue" />
      </div>

      {paymentEnabled && (
        <div className="rounded-2xl border bg-card shadow-sm p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold">Add money to wallet</div>
              <div className="text-xs text-muted-foreground">Instant top-up via UPI / Cards / Netbanking.</div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount(String(v))}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
                  Number(amount) === v ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted/40"
                }`}
              >
                ₹{v}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">₹</span>
              <input
                type="number"
                inputMode="decimal"
                min={MIN_AMOUNT}
                max={MAX_AMOUNT}
                placeholder={`Enter amount (min ${MIN_AMOUNT}, max ${MAX_AMOUNT})`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border bg-background pl-8 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <button
              type="button"
              disabled={paying || !amount}
              onClick={startPayment}
              className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold shadow hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              {paying ? "Redirecting…" : "Pay Now"}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">You'll be redirected to a secure gateway. Wallet is credited automatically after payment.</p>
        </div>
      )}

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

      <div className="rounded-2xl border bg-card shadow-sm">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="font-semibold">Transactions</div>
          <span className="text-xs text-muted-foreground">{txs.length} entries</span>
        </div>
        {txs.length === 0 ? (
          loadingList ? (
            <div className="p-5 space-y-3">
              {[0,1,2,3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : (
            <div className="p-6 text-sm text-muted-foreground">No transactions yet.</div>
          )
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

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; tone: "emerald" | "rose" | "blue" }) {
  const tones = {
    emerald: "bg-emerald-500/10 text-emerald-700",
    rose: "bg-rose-500/10 text-rose-700",
    blue: "bg-blue-500/10 text-blue-700",
  } as const;
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
        <div className={`grid h-9 w-9 place-items-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}