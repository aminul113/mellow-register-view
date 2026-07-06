import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testConnection,
  verifySchema,
  type SupabaseConfig,
} from "@/lib/supabase-config";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "Setup — Connect your Supabase" },
      { name: "description", content: "Configure your own Supabase project to run this app." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SetupPage,
});

const SQL_PATH = "/setup.sql";

function SetupPage() {
  const navigate = useNavigate();
  const existing = useMemo(() => (typeof window !== "undefined" ? getSupabaseConfig() : null), []);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [url, setUrl] = useState(existing?.url ?? "");
  const [anonKey, setAnonKey] = useState(existing?.anonKey ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [sql, setSql] = useState<string>("");

  useEffect(() => {
    fetch(SQL_PATH)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error("SQL not found"))))
      .then(setSql)
      .catch(() => setSql("-- Could not load /setup.sql. See supabase/setup.sql in the repo."));
  }, []);

  const cfg: SupabaseConfig = { url: url.trim(), anonKey: anonKey.trim() };
  const looksValid = /^https:\/\/.+\.supabase\.co\/?$/.test(cfg.url) && cfg.anonKey.length > 20;

  async function handleTest() {
    setBusy(true);
    setMsg(null);
    const res = await testConnection(cfg);
    setBusy(false);
    if (res.ok) {
      saveSupabaseConfig({ url: cfg.url.replace(/\/$/, ""), anonKey: cfg.anonKey });
      setMsg({ type: "ok", text: "Connected. Now run the SQL below." });
      setStep(2);
    } else {
      setMsg({ type: "err", text: res.error ?? "Connection failed" });
    }
  }

  async function handleVerify() {
    setBusy(true);
    setMsg(null);
    const res = await verifySchema(cfg);
    setBusy(false);
    if (res.ok) {
      setMsg({ type: "ok", text: "Schema detected. You're all set." });
      setStep(3);
    } else {
      setMsg({
        type: "err",
        text:
          "Could not find the 'profiles' table. Paste the SQL into Supabase → SQL Editor → Run, then click Verify again. (" +
          (res.error ?? "") +
          ")",
      });
    }
  }

  async function copySql() {
    await navigator.clipboard.writeText(sql);
    setMsg({ type: "ok", text: "SQL copied to clipboard." });
  }

  const sqlEditorUrl = cfg.url
    ? cfg.url.replace(/^https:\/\/([^.]+)\.supabase\.co.*$/, "https://supabase.com/dashboard/project/$1/sql/new")
    : "https://supabase.com/dashboard";

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Connect your Supabase</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This app is self-hosted. Point it at your own Supabase project — all users you create will be stored there.
          </p>
        </div>

        <ol className="mb-6 flex gap-2 text-xs">
          {[1, 2, 3].map((n) => (
            <li
              key={n}
              className={`rounded-full border px-3 py-1 ${
                step >= n ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground"
              }`}
            >
              {n}. {n === 1 ? "Credentials" : n === 2 ? "Database" : "Done"}
            </li>
          ))}
        </ol>

        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                In Supabase → Project Settings → API, copy the <b>Project URL</b> and the <b>anon public</b> key.
              </p>
              <label className="block">
                <span className="text-sm font-medium">Project URL</span>
                <input
                  className="mt-1 w-full rounded-lg border bg-input/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  placeholder="https://xxxxx.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Anon public key</span>
                <textarea
                  className="mt-1 w-full rounded-lg border bg-input/60 px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                  placeholder="eyJhbGciOi..."
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                />
              </label>
              <div className="flex gap-2">
                <button
                  disabled={!looksValid || busy}
                  onClick={handleTest}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 hover:bg-primary/90"
                >
                  {busy ? "Testing…" : "Test & save connection"}
                </button>
                {existing && (
                  <button
                    onClick={() => {
                      clearSupabaseConfig();
                      setUrl("");
                      setAnonKey("");
                      setMsg({ type: "ok", text: "Config cleared." });
                      setStep(1);
                    }}
                    className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Open the SQL Editor in your Supabase project and run the script below.{" "}
                <a href={sqlEditorUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                  Open SQL Editor →
                </a>
              </p>
              <div className="relative">
                <pre className="max-h-80 overflow-auto rounded-lg border bg-muted/40 p-3 text-xs font-mono text-foreground">
                  {sql}
                </pre>
                <button
                  onClick={copySql}
                  className="absolute right-2 top-2 rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary/90"
                >
                  Copy SQL
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleVerify}
                  disabled={busy}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 hover:bg-primary/90"
                >
                  {busy ? "Checking…" : "Verify schema"}
                </button>
                <button
                  onClick={() => setStep(1)}
                  className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-foreground">
                🎉 Setup complete. Your Supabase is connected and the schema is ready.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate({ to: "/register" })}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Create first account
                </button>
                <button
                  onClick={() => navigate({ to: "/login" })}
                  className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
                >
                  Go to login
                </button>
              </div>
            </div>
          )}

          {msg && (
            <div
              className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
                msg.type === "ok"
                  ? "border-primary/30 bg-primary/5 text-primary"
                  : "border-destructive/30 bg-destructive/5 text-destructive"
              }`}
            >
              {msg.text}
            </div>
          )}
        </section>

        <p className="mt-6 text-xs text-muted-foreground">
          Config is stored locally in your browser. Buyers who prefer <code>.env</code>: set{" "}
          <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> at build time.
        </p>
      </div>
    </div>
  );
}