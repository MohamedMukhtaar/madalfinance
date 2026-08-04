import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { AppSettings } from "@/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { financeService } from "@/services/finance";

interface SettingsContextValue {
  settings: AppSettings | undefined;
  isLoading: boolean;
  currency: string;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  refresh: () => void;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

const SETTINGS_KEY = ["settings"] as const;

/** Map ISO codes / aliases to the display symbol used in the UI. */
function displayCurrency(raw?: string | null): string {
  const value = (raw ?? "$").trim();
  if (!value || value.toUpperCase() === "USD" || value === "US$") return "$";
  return value;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: () => financeService.settings(),
    staleTime: Infinity,
  });

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings: data
        ? { ...data, currency: displayCurrency(data.currency) }
        : undefined,
      isLoading,
      currency: displayCurrency(data?.currency),
      async updateSettings(patch) {
        const next = { ...patch };
        if (next.currency) next.currency = displayCurrency(next.currency);
        await financeService.updateSettings(next);
        queryClient.invalidateQueries({ queryKey: ["settings"] });
      },
      refresh: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
    }),
    [data, isLoading, queryClient]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
