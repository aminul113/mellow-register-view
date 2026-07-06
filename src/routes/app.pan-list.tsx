import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download, Search, ListChecks, CheckCircle2, XCircle } from "lucide-react";
import { listMySearches, type PanSearch } from "@/lib/data-store";
import { StatusPill } from "./app.index";

export const Route = createFileRoute("/app/pan-list")({
  component: PanListPage,
});

function PanListPage() {
  const [rows, setRows] = useState<PanSearch[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");

  useEffect(() => { listMySearches(500).then(setRows); }, []);

  const total = rows.length;
  const successCount = rows.filter((r) => r.status === "success").length;
  const failedCount = rows.filter((r) => r.status !== "success").length;

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (q) {
        const s = q.toLowerCase();
        const hay = `${r.pan_number ?? ""} ${r.full_name ?? ""} ${r.aadhaar_last4}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [rows, q, status]);

  function exportCsv() {
    const header = ["Date", "Aadhaar (last4)", "PAN", "Name", "DOB", "Status", "Cost"];
    const lines = [header.join(",")];
    for (const r of filtered) {
      lines.push([
        new Date(r.created_at).toISOString(),
        r.aadhaar_last4,
        r.pan_number ?? "",
        (r.full_name ?? "").replace(/,/g, " "),
        r.dob ?? "",
        r.status,
        String(r.cost),
      ].map((v) => `"${v}"`).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `pan-searches-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">PAN List</h1>
          <p className="text-sm text-muted-foreground">All your past PAN searches.</p>
        </div>
        <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium hover:bg-muted/40">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MiniStat label="Total searches" value={total} icon={ListChecks} tone="bg-primary/10 text-primary" />
        <MiniStat label="Success" value={successCount} icon={CheckCircle2} tone="bg-emerald-500/10 text-emerald-700" />
        <MiniStat label="Failed / refunded" value={failedCount} icon={XCircle} tone="bg-rose-500/10 text-rose-700" />
      </div>

      <div className="rounded-2xl border bg-card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input placeholder="Search PAN, name or last 4"
            value={q} onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border bg-background px-3 py-2 text-sm">
          <option value="all">All statuses</option>
          <option value="success">Success</option>
          <option value="not_found">Not found</option>
          <option value="error">Error</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <div className="rounded-2xl border bg-card overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-5 py-2.5">Date</th>
              <th className="px-5 py-2.5">Aadhaar</th>
              <th className="px-5 py-2.5">PAN</th>
              <th className="px-5 py-2.5">Name</th>
              <th className="px-5 py-2.5">DOB</th>
              <th className="px-5 py-2.5">Status</th>
              <th className="px-5 py-2.5">Cost</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No results.</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-5 py-2.5 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-5 py-2.5">••••••••{r.aadhaar_last4}</td>
                <td className="px-5 py-2.5 font-mono">{r.pan_number ?? "—"}</td>
                <td className="px-5 py-2.5">{r.full_name ?? "—"}</td>
                <td className="px-5 py-2.5">{r.dob ?? "—"}</td>
                <td className="px-5 py-2.5"><StatusPill status={r.status} /></td>
                <td className="px-5 py-2.5">₹ {Number(r.cost).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon: Icon, tone }: { label: string; value: number | string; icon: React.ComponentType<{ className?: string }>; tone: string }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
        <div className={`grid h-9 w-9 place-items-center rounded-xl ${tone}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}