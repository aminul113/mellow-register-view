import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { getCurrentAccount, logout } from "@/lib/auth-store";
import { isCurrentUserAdmin } from "@/lib/data-store";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/app")({
  head: () => ({ meta: [{ title: "Dashboard — PANME SHOP" }] }),
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    (async () => {
      const a = await getCurrentAccount();
      if (!a) {
        navigate({ to: "/login" });
        return;
      }
      setName(a.name);
      setIsAdmin(await isCurrentUserAdmin());
      setReady(true);
    })();
  }, [navigate]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar
          isAdmin={isAdmin}
          onLogout={async () => {
            await logout();
            navigate({ to: "/login" });
          }}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b bg-card/80 backdrop-blur-md flex items-center justify-between gap-3 px-3 sm:px-5 sticky top-0 z-10">
            <div className="flex items-center gap-2 min-w-0">
              <SidebarTrigger />
              <div className="text-sm text-muted-foreground truncate">
                Welcome, <span className="text-foreground font-semibold">{name}</span>
              </div>
            </div>
            {isAdmin && (
              <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">Admin</span>
            )}
          </header>
          <main className="flex-1 p-4 sm:p-5 md:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
        <Toaster />
      </div>
    </SidebarProvider>
  );
}