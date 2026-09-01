import { useEffect, useState, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useTheme } from "@/context/ThemeContext";
import { financeService } from "@/services/finance";

type TeamMember = {
  memberId: number;
  memberName: string;
  position?: string;
  avatarUrl?: string | null;
};

export function AuthLayout({ children }: { children: ReactNode }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const [team, setTeam] = useState<TeamMember[]>([]);

  useEffect(() => {
    let alive = true;
    financeService
      .publicTeam()
      .then((rows) => {
        if (alive) setTeam(rows);
      })
      .catch(() => {
        if (alive) setTeam([]);
      });
    return () => {
      alive = false;
    };
  }, []);

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

        {team.length > 0 && (
          <div className="mt-10 flex flex-col items-center gap-3">
            <div className="flex flex-wrap items-center justify-center gap-4">
              {team.map((m) =>
                m.avatarUrl ? (
                  <img
                    key={m.memberId}
                    src={m.avatarUrl}
                    alt={m.memberName}
                    title={m.memberName}
                    className="h-14 w-14 rounded-full object-cover ring-2 ring-line shadow-sm"
                  />
                ) : (
                  <span
                    key={m.memberId}
                    title={m.memberName}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-navy/10 text-sm font-bold text-navy ring-2 ring-line dark:bg-brand-500/20 dark:text-brand-300"
                  >
                    {m.memberName
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
