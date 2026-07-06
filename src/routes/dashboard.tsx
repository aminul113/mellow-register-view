import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getCurrentAccount, logout } from "@/lib/auth-store";
import { getSupabaseConfig } from "@/lib/supabase-config";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — PANME SHOP" },
      { name: "description", content: "Your PANME SHOP dashboard." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const [name, setName] = useState<string>("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getSupabaseConfig()) {
      navigate({ to: "/setup" });
      return;
    }
    getCurrentAccount().then((a) => {
      if (!a) {
        navigate({ to: "/login" });
        return;
      }
      setName(a.name);
      setReady(true);
    });
  }, [navigate]);

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="font-bold tracking-wide">PANME SHOP</div>
          <button
            onClick={async () => {
              await logout();
              navigate({ to: "/login" });
            }}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20 transition-colors"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12 animate-fade-in">
        <h1 className="text-3xl font-bold text-foreground">Welcome back, {name}</h1>
        <p className="mt-2 text-muted-foreground">You are signed in to PANME SHOP.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {["Find PAN", "My Requests", "Support"].map((t) => (
            <div
              key={t}
              className="rounded-2xl border bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="text-sm text-muted-foreground">Quick action</div>
              <div className="mt-1 text-lg font-semibold">{t}</div>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <Link to="/login" className="text-sm text-primary hover:underline">
            Back to login
          </Link>
        </div>
      </main>
    </div>
  );
}