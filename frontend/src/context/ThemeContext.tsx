import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const THEME_KEY = "madal_theme";

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function applyThemeClass(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  root.dataset.theme = theme;
  // Keep sidebar in sync (brand light colors vs dark shell).
  if (theme === "dark") {
    root.style.setProperty("--brand-sidebar", "#070b22");
    root.style.setProperty("--brand-sidebar-ink", "#94a3b8");
    root.style.setProperty("--brand-sidebar-bg", "var(--brand-primary)");
    root.style.setProperty("--brand-sidebar-text", "#ffffff");
  } else {
    root.style.setProperty("--brand-sidebar", root.dataset.brandSidebar || "#101848");
    root.style.setProperty("--brand-sidebar-ink", root.dataset.brandSidebarInk || "#c7cedb");
    root.style.setProperty("--brand-sidebar-bg", root.dataset.brandSidebarBg || "#1a255c");
    root.style.setProperty("--brand-sidebar-text", root.dataset.brandSidebarText || "#ffffff");
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const initial = readStoredTheme();
    // Keep DOM in sync even during first render (SSR-safe check).
    if (typeof document !== "undefined") applyThemeClass(initial);
    return initial;
  });

  useLayoutEffect(() => {
    applyThemeClass(theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme: theme,
      toggleTheme,
      setTheme,
    }),
    [theme, toggleTheme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
