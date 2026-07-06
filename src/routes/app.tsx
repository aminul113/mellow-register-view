import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { getCurrentAccount, logout } from "@/lib/auth-store";
import { isCurrentUserAdmin } from "@/lib/data-store";
import { Toaster } from "@/components/ui/sonner";
import { swalConfirm, swalOk } from "@/lib/swal";

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
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar isAdmin={false} onLogout={() => {}} />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-14 border-b bg-card/80 backdrop-blur-md flex items-center justify-between gap-3 px-3 sm:px-5 sticky top-0 z-10">
              <div className="flex items-center gap-2 min-w-0">
                <SidebarTrigger />
              </div>
              <div className="h-8 w-32 rounded-full bg-primary/10 animate-pulse" />
            </header>
            <main className="flex-1 p-4 sm:p-5 md:p-6 lg:p-8">
              <div className="max-w-7xl mx-auto w-full space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="h-32 rounded-2xl bg-primary/10 animate-pulse" />
                  <div className="h-32 rounded-2xl bg-primary/10 animate-pulse" />
                  <div className="h-32 rounded-2xl bg-primary/10 animate-pulse" />
                </div>
                <div className="h-64 rounded-2xl bg-primary/10 animate-pulse" />
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar
          isAdmin={isAdmin}
          onLogout={async () => {
            const ok = await swalConfirm("Logout?", "You will need to sign in again.");
            if (!ok) return;
            await logout();
            await swalOk("Logged out", "See you soon!");
            navigate({ to: "/login" });
          }}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b bg-card/80 backdrop-blur-md flex items-center justify-between gap-3 px-3 sm:px-5 sticky top-0 z-10">
            <div className="flex items-center gap-2 min-w-0">
              <SidebarTrigger />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              {isAdmin && (
                <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">Admin</span>
              )}
              <div className="hidden sm:flex items-center gap-2 min-w-0">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {(name || "U").slice(0, 1).toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-foreground truncate max-w-[160px]">{name}</span>
              </div>
            </div>
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