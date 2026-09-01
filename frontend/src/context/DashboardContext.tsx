import { createContext, useContext, type ReactNode } from "react";
import { useDashboard } from "@/hooks/queries";
import type { DashboardData } from "@/types";

type DashboardContextValue = {
  data?: DashboardData;
  isLoading: boolean;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useDashboard();
  return <DashboardContext.Provider value={{ data, isLoading }}>{children}</DashboardContext.Provider>;
}

export function useDashboardContext() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboardContext must be used within DashboardProvider");
  return ctx;
}
