import type { ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useTheme } from "@/context/ThemeContext";

export function AuthLayout({ children }: { children: ReactNode }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-app px-4 py-10 sm:px-6 sm:py-12">
      <button
        onClick={toggleTheme}
        className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-20 rounded-none bg-panel p-2.5 text-ink-muted shadow-card ring-1 ring-line transition hover:text-ink sm:right-5"
        aria-label="Toggle theme"
      >
        {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      <div className="flex w-full max-w-md flex-col items-center">
        <div className="mb-6 flex justify-center sm:mb-8">
          <Logo wide />
        </div>

        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}
