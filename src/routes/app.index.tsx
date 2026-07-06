import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wallet, Search, XCircle, ArrowRight } from "lucide-react";
import { getDashboardStats, type PanSearch } from "@/lib/data-store";

export const Route = createFileRoute("/app/")({
  component: HomePage,
});

function HomePage() {
  const [stats, setStats] = useState<{ balance: number; total: number; rejected: number; recent: PanSearch[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getDashboardStats().then(setStats).catch((e) => setErr(e.message));
  }, []);

  if (err) return <div className="text-destructive text-sm">{err}</div>;
  if (!stats) return <div className="text-muted-foreground text-sm">Loading…</div>;

  const cards = [
    { label: "Total PAN Searches", value: stats.total, icon: Search, color: "bg-primary/10 text-primary" },
    { label: "Rejected / Not found", value: stats.rejected, icon: XCircle, color: "bg-destructive/10 text-destructive" },
    { label: "Wallet Balance", value: `₹ ${stats.balance.toFixed(2)}`, icon: Wallet, color: "bg-emerald-500/10 text-emerald-700" },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your PAN searches and wallet.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${c.color}`}>
              <c.icon className="h-5 w-5" />
            </div>
            <div className="mt-4 text-sm text-muted-foreground">{c.label}</div>
            <div className="text-2xl font-bold text-foreground">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border bg-card">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold">Recent searches</h2>
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