import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useOrganization } from "@/hooks/queries";
import type { Organization } from "@/types";
import { useAuth } from "@/context/AuthContext";

interface OrganizationContextValue {
  organization: Organization | undefined;
  isLoading: boolean;
}

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined);

/** Light-mode brand colors; dark mode overrides the sidebar so it matches the app shell. */
export function applyBrandColors(org?: Organization | null) {
  if (!org || typeof document === "undefined") return;
  const root = document.documentElement;
  const primary = org.primaryColor || "#101848";
  const secondary = org.secondaryColor || "#74BCF8";
  const sidebarBg = org.sidebarBg || primary;
  const sidebarText = org.sidebarText || "#C7CEDB";
  const sidebarActiveBg = org.sidebarActiveBg || "#1A255C";
  const sidebarActiveText = org.sidebarActiveText || "#FFFFFF";

  root.dataset.brandSidebar = sidebarBg;
  root.dataset.brandSidebarInk = sidebarText;
  root.dataset.brandSidebarBg = sidebarActiveBg;
  root.dataset.brandSidebarText = sidebarActiveText;

  root.style.setProperty("--brand-primary", primary);
  root.style.setProperty("--brand-secondary", secondary);
  root.style.setProperty("--color-active", primary);
  root.style.setProperty("--color-accent", secondary);
  applySidebarTheme(root.classList.contains("dark"));
}

/** Sidebar follows light/dark: brand colors in light, dark panel in dark. */
export function applySidebarTheme(dark: boolean) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (dark) {
    root.style.setProperty("--brand-sidebar", "#070b22");
    root.style.setProperty("--brand-sidebar-ink", "#94a3b8");
    root.style.setProperty("--brand-sidebar-bg", "var(--brand-primary)");
    root.style.setProperty("--brand-sidebar-text", "#ffffff");
    return;
  }
  root.style.setProperty("--brand-sidebar", root.dataset.brandSidebar || "#101848");
  root.style.setProperty("--brand-sidebar-ink", root.dataset.brandSidebarInk || "#c7cedb");
  root.style.setProperty("--brand-sidebar-bg", root.dataset.brandSidebarBg || "#1a255c");
  root.style.setProperty("--brand-sidebar-text", root.dataset.brandSidebarText || "#ffffff");
}

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { data, isLoading } = useOrganization(isAuthenticated);

  useEffect(() => {
    applyBrandColors(data);
  }, [data]);

  const value = useMemo(
    () => ({ organization: data, isLoading }),
    [data, isLoading]
  );

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export function useOrganizationContext(): OrganizationContextValue {
  const ctx = useContext(OrganizationContext);
  if (!ctx) throw new Error("useOrganizationContext must be used within OrganizationProvider");
  return ctx;
}
