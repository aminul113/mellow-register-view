import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  adminCreditWallet,
  adminFindUser,
  adminListUsers,
  adminListAllSearches,
  adminUpdateSettings,
  adminForceRefundSearch,
  getSettings,
  isCurrentUserAdmin,
  type AdminUser,
  type AppSettings,
  type PanSearch,
} from "@/lib/data-store";
import { StatusPill } from "./app.index";
import { useRefreshBranding } from "@/lib/branding";

export const Route = createFileRoute("/app/admin")({
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const [ok, setOk] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"users" | "settings" | "all">("users");

  useEffect(() => {
    isCurrentUserAdmin().then((v) => {
      setOk(v);
      if (!v) navigate({ to: "/app" });
    });
  }, [navigate]);

  if (ok === null) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!ok) return null;

  return (
    <div className="max-w-6xl mx-auto w-full space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Admin Panel</h1>
        <p className="text-sm text-muted-foreground">Manage users, settings and all searches.</p>
      </div>

      <div className="flex gap-2 border-b">
        {(["users", "settings", "all"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px ${
              tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            {t === "all" ? "All Searches" : t === "users" ? "Users & Wallets" : "Settings"}
          </button>
        ))}
      </div>

      {tab === "users" && <UsersTab />}
      {tab === "settings" && <SettingsTab />}
      {tab === "all" && <AllSearchesTab />}
    </div>
  );
}

function UsersTab() {
  const [email, setEmail] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [found, setFound] = useState<AdminUser | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  async function loadUsers(q = email) {
    setSearching(true);
    try {
      const rows = await adminListUsers(q, 50);
      setUsers(rows);
      if (rows.length === 0) toast.error("User not found");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Users load failed"); }
    finally { setSearching(false); }
  }

  useEffect(() => {
    loadUsers("");
    const iv = setInterval(() => { loadUsers(email); }, 10000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  async function find() {
    setFound(null);
    if (!email.trim()) return;
    setSearching(true);
    try {
      const r = await adminFindUser(email.trim());
      if (!r) {
        await loadUsers(email);
        return;
      }
      setFound(r);
      setUsers([r]);
    } catch {
      await loadUsers(email);
    } finally { setSearching(false); }
  }

  async function credit() {
    if (!found) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    setLoading(true);
    try {
      await adminCreditWallet(found.user_id, amt, note || "Admin credit");
      toast.success(`Credited ₹${amt} to ${found.email}`);
      setAmount(""); setNote("");
      const r = await adminFindUser(found.email); setFound(r);
      await loadUsers(email);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-5 space-y-3">
        <div className="font-semibold">Find user / wallet load</div>
        <div className="flex gap-2">
          <input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") find(); }} placeholder="Search email or name"
            className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm" />
          <button onClick={find} disabled={searching} className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm hover:bg-primary/90 disabled:opacity-60">
            {searching ? "Searching…" : "Search"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-5 py-2.5">User</th>
              <th className="px-5 py-2.5">Email</th>
              <th className="px-5 py-2.5">Balance</th>
              <th className="px-5 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Search karo ya latest users yaha show honge.</td></tr>
            ) : users.map((u) => (
              <tr key={u.user_id} className="border-t">
                <td className="px-5 py-2.5 font-medium">{u.name || "User"}</td>
                <td className="px-5 py-2.5">{u.email}</td>
                <td className="px-5 py-2.5 font-semibold text-emerald-700">₹ {Number(u.balance).toFixed(2)}</td>
                <td className="px-5 py-2.5 text-right">
                  <button onClick={() => setFound(u)} className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted">
                    Select
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {found && (
        <div className="rounded-2xl border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">User</div>
              <div className="font-semibold">{found.name} <span className="text-muted-foreground font-normal">({found.email})</span></div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Balance</div>
              <div className="font-semibold text-emerald-700">₹ {Number(found.balance).toFixed(2)}</div>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount ₹" inputMode="decimal"
              className="rounded-lg border bg-background px-3 py-2 text-sm" />
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)"
              className="rounded-lg border bg-background px-3 py-2 text-sm" />
            <button onClick={credit} disabled={loading} className="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm hover:bg-emerald-700 disabled:opacity-60">
              {loading ? "Crediting…" : "Credit wallet"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsTab() {
  const [s, setS] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const refreshBranding = useRefreshBranding();
  useEffect(() => { getSettings().then(setS); }, []);

  async function save() {
    if (!s) return;
    setSaving(true);
    try {
      await adminUpdateSettings(s);
      toast.success("Settings saved");
      refreshBranding();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  }

  async function pickImage(kind: "logo" | "favicon") {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = kind === "favicon" ? "image/png,image/x-icon,image/svg+xml,image/jpeg" : "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !s) return;
      const maxKb = kind === "favicon" ? 100 : 400;
      if (file.size > maxKb * 1024) {
        toast.error(`Image too large. Keep under ${maxKb} KB.`);
        return;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(r.error);
        r.readAsDataURL(file);
      });
      setS(kind === "logo" ? { ...s, logo_url: dataUrl } : { ...s, favicon_url: dataUrl });
      toast.success(`${kind === "logo" ? "Logo" : "Favicon"} loaded — click Save settings.`);
    };
    input.click();
  }

  if (!s) return <div className="text-sm text-muted-foreground">Loading…</div>;
  return (
    <div className="space-y-4 max-w-3xl mx-auto w-full">
      <div className="rounded-2xl border bg-card p-5 space-y-4">
        <div>
          <div className="font-semibold">Branding</div>
          <p className="text-xs text-muted-foreground">Website name, logo aur favicon yahan se set karein — sab pages par apne aap update ho jayega.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SField label="Website name" value={s.brand_name} onChange={(v) => setS({ ...s, brand_name: v })} />
          <SField label="Tagline (short)" value={s.brand_tagline} onChange={(v) => setS({ ...s, brand_tagline: v })} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <BrandAsset
            label="Logo"
            hint="Square PNG/SVG, under 400 KB."
            url={s.logo_url}
            onPick={() => pickImage("logo")}
            onClear={() => setS({ ...s, logo_url: "" })}
          />
          <BrandAsset
            label="Favicon"
            hint="Square PNG/ICO/SVG, under 100 KB."
            url={s.favicon_url}
            onPick={() => pickImage("favicon")}
            onClear={() => setS({ ...s, favicon_url: "" })}
          />
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 space-y-4">
        <div className="font-semibold">Pricing & Support</div>
        <SField label="Search price (₹)"
          value={String(s.search_price)}
          onChange={(v) => setS({ ...s, search_price: Number(v) || 0 })}
          type="number" />
        <SField label="Support phone" value={s.support_phone} onChange={(v) => setS({ ...s, support_phone: v })} />
        <SField label="Support WhatsApp (with country code, e.g. 919999999999)"
          value={s.support_whatsapp} onChange={(v) => setS({ ...s, support_whatsapp: v })} />
        <SField label="Support email" value={s.support_email} onChange={(v) => setS({ ...s, support_email: v })} type="email" />
      </div>

      <button onClick={save} disabled={saving}
        className="rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 shadow">
        {saving ? "Saving…" : "Save settings"}
      </button>
    </div>
  );
}

function BrandAsset({ label, hint, url, onPick, onClear }: { label: string; hint: string; url: string; onPick: () => void; onClear: () => void }) {
  return (
    <div className="rounded-xl border bg-background p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">{label}</div>
          <div className="text-[11px] text-muted-foreground">{hint}</div>
        </div>
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted">
          {url ? <img src={url} alt={label} className="h-full w-full object-cover" /> : <span className="text-[10px] text-muted-foreground">None</span>}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onPick} className="rounded-lg border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted/40">
          {url ? "Change" : "Upload"}
        </button>
        {url && (
          <button type="button" onClick={onClear} className="rounded-lg border border-destructive/30 bg-destructive/5 text-destructive px-3 py-1.5 text-xs font-semibold hover:bg-destructive/10">
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

function SField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" />
    </div>
  );
}

function AllSearchesTab() {
  const [rows, setRows] = useState<PanSearch[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const refresh = () => adminListAllSearches(500).then(setRows);
  useEffect(() => { refresh(); }, []);

  async function forceRefund(id: string) {
    if (!confirm("Force-refund this pending search? This is safe to run — it's a no-op if already finalized.")) return;
    setBusy(id);
    try {
      await adminForceRefundSearch(id);
      toast.success("Refunded");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  const isStuck = (r: PanSearch) =>
    r.status === "pending" && Date.now() - new Date(r.created_at).getTime() > 10 * 60 * 1000;

  return (
    <div className="rounded-2xl border bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-5 py-2.5">Date</th>
            <th className="px-5 py-2.5">User</th>
            <th className="px-5 py-2.5">Aadhaar</th>
            <th className="px-5 py-2.5">PAN</th>
            <th className="px-5 py-2.5">Status</th>
            <th className="px-5 py-2.5">Cost</th>
            <th className="px-5 py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No searches yet.</td></tr>
          ) : rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="px-5 py-2.5 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
              <td className="px-5 py-2.5 font-mono text-xs">{r.user_id.slice(0, 8)}…</td>
              <td className="px-5 py-2.5">••••••••{r.aadhaar_last4}</td>
              <td className="px-5 py-2.5 font-mono">{r.pan_number ?? "—"}</td>
              <td className="px-5 py-2.5"><StatusPill status={r.status} /></td>
              <td className="px-5 py-2.5">₹ {Number(r.cost).toFixed(2)}</td>
              <td className="px-5 py-2.5 text-right">
                {isStuck(r) && (
                  <button
                    onClick={() => forceRefund(r.id)}
                    disabled={busy === r.id}
                    className="rounded-md border border-amber-300 bg-amber-50 text-amber-800 px-2.5 py-1 text-xs font-semibold hover:bg-amber-100 disabled:opacity-60"
                  >
                    {busy === r.id ? "…" : "Force refund"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}