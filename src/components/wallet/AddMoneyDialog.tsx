import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, CreditCard, ShieldCheck, Zap } from "lucide-react";
import { APP_CONFIG } from "../../../config";
import { createPaymentOrder } from "@/lib/data-store";
import { swalError } from "@/lib/swal";

export function AddMoneyDialog({
  open,
  onOpenChange,
  balance,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  balance: number | null;
}) {
  const { MIN_AMOUNT, MAX_AMOUNT, QUICK_AMOUNTS } = APP_CONFIG.PAYMENT;
  const [amount, setAmount] = useState<string>("");
  const [paying, setPaying] = useState(false);

  const n = Number(amount);
  const valid = Number.isFinite(n) && n >= MIN_AMOUNT && n <= MAX_AMOUNT;

  async function pay() {
    if (!valid) return;
    setPaying(true);
    try {
      const r = await createPaymentOrder(n);
      window.location.href = r.payment_url;
    } catch (e) {
      setPaying(false);
      swalError("Payment failed", e instanceof Error ? e.message : "Could not start payment");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!paying) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0">
        <div className="[background:var(--grad-wallet,linear-gradient(135deg,hsl(var(--primary)),hsl(var(--primary))))] text-white px-6 pt-6 pb-8 relative">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-white text-xl flex items-center gap-2">
              <Zap className="h-5 w-5" /> Add Money
            </DialogTitle>
            <DialogDescription className="text-white/85">
              Instant top-up · UPI / Card / Netbanking
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
            Current balance: ₹ {balance == null ? "…" : balance.toFixed(2)}
          </div>
        </div>

        <div className="p-6 space-y-5 bg-card">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Quick select</div>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_AMOUNTS.map((v) => {
                const active = Number(amount) === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAmount(String(v))}
                    className={`rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/40 hover:bg-muted/40"
                    }`}
                  >
                    ₹{v}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
              Or enter custom amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">₹</span>
              <input
                type="number"
                inputMode="decimal"
                min={MIN_AMOUNT}
                max={MAX_AMOUNT}
                placeholder={`${MIN_AMOUNT} – ${MAX_AMOUNT}`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border-2 bg-background pl-10 pr-4 py-3 text-lg font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                autoFocus
              />
            </div>
            {amount && !valid && (
              <p className="mt-1.5 text-xs text-destructive">Amount must be between ₹{MIN_AMOUNT} and ₹{MAX_AMOUNT}</p>
            )}
          </div>

          <button
            type="button"
            disabled={!valid || paying}
            onClick={pay}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-6 py-3.5 text-base font-bold shadow-lg shadow-primary/20 hover:opacity-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {paying ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Redirecting to gateway…</>
            ) : (
              <><CreditCard className="h-5 w-5" /> Pay ₹{valid ? n : "—"} Now</>
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Secured payment · Wallet credited automatically on success
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}