import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wallet, CheckCircle2, XCircle, ArrowRight, Search } from "lucide-react";
import { getDashboardStats, type PanSearch } from "@/lib/data-store";
import { useRealtimeWallet } from "@/hooks/use-realtime-wallet";

export const Route = createFileRoute("/app/")({
  component: HomePage,
});

function HomePage() {
  const [stats, setStats] = useState<{ balance: number; total: number; rejected: number; recent: PanSearch[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const liveBalance = useRealtimeWallet();

  useEffect(() => {
    const load = () => getDashboardStats().then(setStats).catch((e) => setErr(e.message));
    load();
    const iv = setInterval(load, 20000);
    return () => clearInterval(iv);
  }, []);

  if (err) return <div className="text-destructive text-sm">{err}</div>;
  if (!stats) return <div className="text-muted-foreground text-sm">Loading…</div>;

  const success = stats.total - stats.rejected;
  const shownBalance = liveBalance ?? stats.balance;
  const cards = [
    { label: "Total Success PAN", value: success, icon: CheckCircle2, style: "[background:var(--grad-success)]" },
    { label: "Rejected PAN", value: stats.rejected, icon: XCircle, style: "[background:var(--grad-danger)]" },
    { label: "Wallet Balance", value: `₹ ${shownBalance.toFixed(2)}`, icon: Wallet, style: "[background:var(--grad-wallet)]" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your PAN searches and wallet.</p>
        </div>
        <Link to="/app/pan-finder" className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold shadow hover:bg-primary/90">
          <Search className="h-4 w-4" /> New PAN search
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`relative overflow-hidden rounded-2xl p-5 sm:p-6 text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${c.style}`}
          >
            <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute right-6 bottom-2 h-24 w-24 rounded-full bg-white/5" />
            <div className="relative flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/15 backdrop-blur-sm">
                <c.icon className="h-5 w-5" />
              </div>
              <div className="text-sm sm:text-base font-medium opacity-95 truncate">{c.label}</div>
            </div>
            <div className="relative mt-6 text-3xl sm:text-4xl font-extrabold tracking-tight">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border bg-card">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold">Today Activity</h2>
          <Link to="/app/pan-list" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {stats.recent.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No searches yet. Try the PAN Finder.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-2.5">Date</th>
                  <th className="px-5 py-2.5">Aadhaar</th>
                  <th className="px-5 py-2.5">PAN</th>
                  <th className="px-5 py-2.5">Status</th>
                  <th className="px-5 py-2.5">Cost</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="px-5 py-2.5 whitespace-nowrap">{new Date(s.created_at).toLocaleString()}</td>
                    <td className="px-5 py-2.5">••••••••{s.aadhaar_last4}</td>
                    <td className="px-5 py-2.5 font-mono">{s.pan_number ?? "—"}</td>
                    <td className="px-5 py-2.5"><StatusPill status={s.status} /></td>
                    <td className="px-5 py-2.5">₹ {Number(s.cost).toFixed(2)}</td>
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

export function StatusPill({ status }: { status: PanSearch["status"] }) {
  const map: Record<string, string> = {
    success: "bg-emerald-500/10 text-emerald-700",
    pending: "bg-amber-500/10 text-amber-700",
    not_found: "bg-destructive/10 text-destructive",
    error: "bg-destructive/10 text-destructive",
    refunded: "bg-blue-500/10 text-blue-700",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? "bg-muted"}`}>
      {status}
    </span>
  );
}