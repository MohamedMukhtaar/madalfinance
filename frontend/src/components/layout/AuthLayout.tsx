import type { ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useTheme } from "@/context/ThemeContext";

export function AuthLayout({ children }: { children: ReactNode }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-app px-6 py-12">
      <button
        onClick={toggleTheme}
        className="absolute right-5 top-5 z-20 rounded-xl bg-panel p-2.5 text-ink-muted shadow-card ring-1 ring-line transition hover:text-ink"
        aria-label="Toggle theme"
      >
        {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      <div className="flex w-full max-w-md flex-col items-center">
        <div className="mb-8 flex justify-center">
          <Logo wide />
        </div>

        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}
