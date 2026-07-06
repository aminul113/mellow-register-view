import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock, XCircle, Loader2, ArrowRight } from "lucide-react";
import { verifyPayment } from "@/lib/data-store";

type VerifyState =
  | { kind: "loading" }
  | { kind: "success"; amount: number }
  | { kind: "pending" }
  | { kind: "failed"; message?: string };

export const Route = createFileRoute("/app/payment-return")({
  validateSearch: (search: Record<string, unknown>) => ({
    order_id: typeof search.order_id === "string" ? search.order_id : "",
  }),
  component: PaymentReturnPage,
});

function PaymentReturnPage() {
  const { order_id } = Route.useSearch();
  const navigate = useNavigate();
  const [state, setState] = useState<VerifyState>({ kind: "loading" });
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (!order_id) {
      setState({ kind: "failed", message: "Missing order id" });
      return;
    }
    let cancelled = false;
    async function check() {
      try {
        const r = await verifyPayment(order_id);
        if (cancelled) return;
        if (r.status === "success") setState({ kind: "success", amount: r.amount ?? 0 });
        else if (r.status === "pending") setState({ kind: "pending" });
        else setState({ kind: "failed", message: r.message });
      } catch (e) {
        if (cancelled) return;
        setState({ kind: "failed", message: e instanceof Error ? e.message : "Verification failed" });
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [order_id, tries]);

  // Auto re-poll every 5s while pending, up to ~1 min
  useEffect(() => {
    if (state.kind !== "pending" || tries > 12) return;
    const t = setTimeout(() => setTries((n) => n + 1), 5000);
    return () => clearTimeout(t);
  }, [state, tries]);

  return (
    <div className="max-w-lg mx-auto mt-8">
      <div className="rounded-3xl border bg-card p-8 shadow-sm text-center">
        {state.kind === "loading" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <h1 className="mt-4 text-xl font-bold">Verifying your payment…</h1>
            <p className="text-sm text-muted-foreground mt-1">Please don't close this page.</p>
          </>
        )}
        {state.kind === "success" && (
          <>
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-emerald-700">Payment successful</h1>
            <p className="text-sm text-muted-foreground mt-1">
              ₹{state.amount.toFixed(2)} added to your wallet.
            </p>
            <button
              onClick={() => navigate({ to: "/app/wallet" })}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:opacity-90"
            >
              Go to Wallet <ArrowRight className="h-4 w-4" />
            </button>
          </>
        )}
        {state.kind === "pending" && (
          <>
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-500/10">
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-amber-700">Payment pending</h1>
            <p className="text-sm text-muted-foreground mt-1">
              We're waiting for confirmation from the gateway. Auto-checking every 5s…
            </p>
            <button
              onClick={() => setTries((n) => n + 1)}
              className="mt-6 inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-muted/40"
            >
              <Loader2 className="h-4 w-4" /> Check again
            </button>
          </>
        )}
        {state.kind === "failed" && (
          <>
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-destructive/10">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-destructive">Payment failed</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {state.message ?? "The gateway did not confirm your payment. No amount was deducted from your wallet."}
            </p>
            <Link
              to="/app/wallet"
              className="mt-6 inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-muted/40"
            >
              Back to Wallet
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
