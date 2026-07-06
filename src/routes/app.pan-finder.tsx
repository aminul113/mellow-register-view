import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, CheckCircle2, XCircle, Loader2, CreditCard, Copy, Wallet, MessageCircle, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import { runPanSearch, getSettings, type PanSearchResult, type AppSettings } from "@/lib/data-store";

export const Route = createFileRoute("/app/pan-finder")({
  component: PanFinderPage,
});

function PanFinderPage() {
  const [aadhaar, setAadhaar] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PanSearchResult | null>(null);
  const [lowBalance, setLowBalance] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => { getSettings().then(setSettings).catch(() => {}); }, []);

  const clean = aadhaar.replace(/\D/g, "").slice(0, 12);
  const isValid = /^[0-9]{12}$/.test(clean);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) {
      toast.error("Enter a valid 12-digit Aadhaar number");
      return;
    }
    setResult(null);
    setLowBalance(false);
    setLoading(true);
    try {
      const r = await runPanSearch(clean);
      setResult(r);
      if (r.status === "success") toast.success("PAN found");
      else toast.info("Refunded to your wallet");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Search failed";
      if (msg === "INSUFFICIENT_BALANCE") {
        setLowBalance(true);
        toast.error("Insufficient wallet balance");
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function copyPan(pan: string) {
    try {
      await navigator.clipboard.writeText(pan);
      toast.success("PAN copied");
    } catch {
      toast.error("Copy failed");
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">PAN Finder</h1>
        <p className="text-sm text-muted-foreground">Enter a 12-digit Aadhaar number to fetch the linked PAN.</p>
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-emerald-800 text-primary-foreground p-8 shadow-lg">
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-emerald-300/20 blur-2xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
            <CreditCard className="h-3.5 w-3.5" /> Instant Aadhaar → PAN
          </div>
          <h2 className="mt-3 text-2xl font-bold">Search a PAN in seconds</h2>
          <p className="mt-1 text-sm opacity-90">Charged from your wallet. Auto-refund on failure.</p>

          <form onSubmit={onSubmit} className="mt-6 flex flex-col sm:flex-row gap-3">
            <input
              inputMode="numeric"
              autoComplete="off"
              placeholder="Enter 12-digit Aadhaar number"
              value={clean}
              onChange={(e) => setAadhaar(e.target.value)}
              className="flex-1 rounded-xl bg-white/95 text-foreground px-4 py-3 text-sm outline-none tracking-widest font-mono placeholder:text-muted-foreground focus:ring-4 focus:ring-white/30"
            />
            <button
              type="submit"
              disabled={!isValid || loading}
              className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl bg-white text-primary px-5 py-3 text-sm font-semibold shadow hover:bg-white/90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {loading ? "Searching…" : "Search"}
            </button>
          </form>
        </div>
      </div>

      {lowBalance && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 flex items-start gap-3">
          <Wallet className="h-5 w-5 text-amber-700 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-amber-900">Insufficient wallet balance</div>
            <p className="text-sm text-amber-800 mt-0.5">Your wallet balance is too low for this search. Contact admin below to top-up, or open your wallet.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {settings?.support_whatsapp && (
                <a href={`https://wa.me/${settings.support_whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("Hi, I want to add balance to my wallet.")}`}
                   target="_blank" rel="noreferrer"
                   className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-700">
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </a>
              )}
              {settings?.support_phone && (
                <a href={`tel:${settings.support_phone}`}
                   className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white text-amber-800 px-3 py-1.5 text-xs font-semibold hover:bg-amber-100">
                  <Phone className="h-3.5 w-3.5" /> Call
                </a>
              )}
              {settings?.support_email && (
                <a href={`mailto:${settings.support_email}?subject=Wallet%20top-up`}
                   className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white text-amber-800 px-3 py-1.5 text-xs font-semibold hover:bg-amber-100">
                  <Mail className="h-3.5 w-3.5" /> Email
                </a>
              )}
              <Link to="/app/wallet" className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-amber-700">
                Go to Wallet
              </Link>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className={`rounded-2xl border p-6 shadow-sm animate-fade-in ${result.status === "success" ? "border-emerald-300 bg-gradient-to-br from-emerald-50 to-white" : "border-destructive/30 bg-destructive/5"}`}>
          {result.status === "success" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">PAN Found</span>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5">Verified</span>
              </div>
              <div className="rounded-xl bg-white border border-emerald-200 p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">PAN Number</div>
                  <div className="text-2xl font-mono font-bold tracking-wider text-foreground mt-1">{result.pan}</div>
                </div>
                <button
                  type="button"
                  onClick={() => copyPan(result.pan)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy
                </button>
              </div>
              {(result.name || result.dob) && (
                <dl className="grid gap-3 sm:grid-cols-2">
                  {result.name ? <Field label="Name" value={result.name} /> : null}
                  {result.dob ? <Field label="DOB" value={result.dob} /> : null}
                </dl>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-destructive"><XCircle className="h-5 w-5" /><span className="font-semibold">{result.status === "not_found" ? "PAN not found" : "Something went wrong"}</span></div>
              <p className="text-sm text-muted-foreground">{result.message}</p>
              <p className="text-xs text-emerald-700">Wallet auto-refunded. <Link to="/app/wallet" className="underline">View wallet</Link></p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 font-medium ${mono ? "font-mono" : ""}`}>{value || "—"}</div>
    </div>
  );
}