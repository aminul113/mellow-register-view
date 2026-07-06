import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getSettings, type AppSettings } from "./data-store";
import { getSupabase } from "./supabase-config";

export type Branding = {
  name: string;
  tagline: string;
  logoUrl: string;
  faviconUrl: string;
};

const DEFAULT: Branding = {
  name: "PANME SHOP",
  tagline: "Find your PAN card instantly",
  logoUrl: "",
  faviconUrl: "",
};

const Ctx = createContext<{ branding: Branding; refresh: () => void }>({
  branding: DEFAULT,
  refresh: () => {},
});

function applyToDocument(b: Branding) {
  if (typeof document === "undefined") return;
  document.title = b.tagline ? `${b.name} — ${b.tagline}` : b.name;
  if (b.faviconUrl) {
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = b.faviconUrl;
  }
}

function fromSettings(s: AppSettings | null): Branding {
  if (!s) return DEFAULT;
  return {
    name: s.brand_name?.trim() || DEFAULT.name,
    tagline: s.brand_tagline ?? DEFAULT.tagline,
    logoUrl: s.logo_url ?? "",
    faviconUrl: s.favicon_url ?? "",
  };
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<Branding>(DEFAULT);

  const refresh = () => {
    getSettings()
      .then((s) => {
        const b = fromSettings(s);
        setBranding(b);
        applyToDocument(b);
      })
      .catch(() => {});
  };

  useEffect(() => {
    refresh();
    const sb = getSupabase();
    if (!sb) return;
    const ch = sb
      .channel("branding:app_settings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        () => refresh(),
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, []);

  return <Ctx.Provider value={{ branding, refresh }}>{children}</Ctx.Provider>;
}

export function useBranding() {
  return useContext(Ctx).branding;
}

export function useRefreshBranding() {
  return useContext(Ctx).refresh;
}