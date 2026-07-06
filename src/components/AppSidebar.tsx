import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Wallet,
  Search,
  ListChecks,
  LifeBuoy,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useBranding } from "@/lib/branding";

type Item = { title: string; url: string; icon: React.ComponentType<{ className?: string }> };

const items: Item[] = [
  { title: "Home", url: "/app", icon: Home },
  { title: "Wallet", url: "/app/wallet", icon: Wallet },
  { title: "PAN Finder", url: "/app/pan-finder", icon: Search },
  { title: "PAN List", url: "/app/pan-list", icon: ListChecks },
  { title: "Support", url: "/app/support", icon: LifeBuoy },
];

export function AppSidebar({ isAdmin, onLogout }: { isAdmin: boolean; onLogout: () => void }) {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (p: string) => (p === "/app" ? currentPath === "/app" : currentPath.startsWith(p));
  const brand = useBranding();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border/40">
        <div className="flex items-center gap-2 px-2 py-3 font-bold tracking-wide text-sidebar-foreground">
          <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
            {brand.logoUrl ? (
              <img src={brand.logoUrl} alt={brand.name} className="h-full w-full object-cover" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
          </span>
          <span className="truncate group-data-[collapsible=icon]:hidden">{brand.name}</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-1.5 py-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {items.map((it) => (
                <SidebarMenuItem key={it.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(it.url)}
                    tooltip={it.title}
                    className="h-10 rounded-lg text-sidebar-foreground/80 transition-all duration-200 hover:translate-x-0.5 hover:bg-sidebar-accent hover:text-sidebar-foreground data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:shadow-md data-[active=true]:font-semibold"
                  >
                    <Link to={it.url} className="flex items-center gap-3">
                      <it.icon className="h-[18px] w-[18px] shrink-0" />
                      <span className="truncate">{it.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive("/app/admin")}
                    tooltip="Admin Panel"
                    className="h-10 rounded-lg text-sidebar-foreground/80 transition-all duration-200 hover:translate-x-0.5 hover:bg-sidebar-accent hover:text-sidebar-foreground data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:shadow-md data-[active=true]:font-semibold"
                  >
                    <Link to="/app/admin" className="flex items-center gap-3">
                      <ShieldCheck className="h-[18px] w-[18px] shrink-0" />
                      <span className="truncate">Admin Panel</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/40 px-1.5 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={onLogout}
              tooltip="Log out"
              className="h-10 rounded-lg text-sidebar-foreground/80 transition-all duration-200 hover:bg-red-500/90 hover:text-white"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" />
              <span className="truncate">Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}