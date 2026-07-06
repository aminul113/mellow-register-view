export function NotConfiguredScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="max-w-xl w-full rounded-2xl border bg-card p-8 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          Setup required
        </div>
        <h1 className="mt-4 text-2xl font-bold text-foreground">
          One quick step before you launch
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Open the file{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">config.ts</code>{" "}
          in the project root and paste your Supabase Project URL and anon
          public key. Then save and refresh this page.
        </p>

        <pre className="mt-5 overflow-auto rounded-lg border bg-muted/40 p-3 text-xs font-mono text-foreground">
{`export const APP_CONFIG = {
  SUPABASE_URL: "https://your-project-ref.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOi...your-anon-public-key...",
};`}
        </pre>

        <div className="mt-6 space-y-2 text-sm text-foreground">
          <p className="font-semibold">Full instructions:</p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Read <code className="text-foreground">SETUP.md</code> for a step-by-step guide.</li>
            <li>Run <code className="text-foreground">database.sql</code> in Supabase → SQL Editor to create the tables.</li>
          </ul>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Update
        </button>
      </div>
    </div>
  );
}