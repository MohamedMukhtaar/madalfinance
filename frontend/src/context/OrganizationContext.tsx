import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useOrganization } from "@/hooks/queries";
import type { Organization } from "@/types";
import { useAuth } from "@/context/AuthContext";

interface OrganizationContextValue {
  organization: Organization | undefined;
  isLoading: boolean;
}

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined);

export function applyBrandColors(org?: Organization | null) {
  if (!org || typeof document === "undefined") return;
  const root = document.documentElement;
  const primary = org.primaryColor || "#101848";
  const secondary = org.secondaryColor || "#74BCF8";
  const sidebarBg = org.sidebarBg || primary;
  const sidebarText = org.sidebarText || "#C7CEDB";
  const sidebarActiveBg = org.sidebarActiveBg || "#1A255C";
  const sidebarActiveText = org.sidebarActiveText || "#FFFFFF";

  root.style.setProperty("--brand-primary", primary);
  root.style.setProperty("--brand-secondary", secondary);
  root.style.setProperty("--brand-sidebar", sidebarBg);
  root.style.setProperty("--brand-sidebar-ink", sidebarText);
  root.style.setProperty("--brand-sidebar-bg", sidebarActiveBg);
  root.style.setProperty("--brand-sidebar-text", sidebarActiveText);
  root.style.setProperty("--color-active", primary);
  root.style.setProperty("--color-accent", secondary);
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
