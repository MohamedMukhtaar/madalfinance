import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, FileText, Moon, Sun, Users } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/utils/cn";
import { financeService } from "@/services/finance";
import logoDark from "@/assets/madal-logo-dark.png";
import growthIcon from "@/assets/finance-growth-icon.png";

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
    <div className="relative flex min-h-screen flex-col bg-app lg:flex-row">
      <button
        onClick={toggleTheme}
        className="absolute right-5 top-5 z-20 rounded-xl bg-panel p-2.5 text-ink-muted shadow-card ring-1 ring-line transition hover:text-ink"
        aria-label="Toggle theme"
      >
        {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      {/* LEFT — brand / marketing */}
      <div className="relative hidden w-1/2 overflow-hidden bg-navy lg:block">
        <div className="absolute inset-0 bg-navy-gradient" />
        <div className="absolute -right-24 top-10 h-80 w-80 rounded-full bg-accent-400 opacity-20 blur-3xl" />
        <div className="absolute -bottom-20 -left-16 h-72 w-72 rounded-full bg-accent-400 opacity-10 blur-3xl" />
        <div className="absolute inset-0 text-white/10">
          <GridPattern />
        </div>
        <div className="relative flex h-full flex-col justify-center px-14 xl:px-20">
          {/* Madal logo at the top of this brand panel */}
          <motion.img
            src={logoDark}
            alt="Madal ICT Solutions"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-8 h-12 w-auto max-w-[14rem] object-contain object-left drop-shadow-md xl:h-14 xl:max-w-[16rem]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <FinancePreviewCard />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-12 text-white"
          >
            <h2 className="text-3xl font-bold tracking-tight text-white xl:text-4xl">
              Manage your company finances with confidence
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300">
              Customers, projects, rentals, invoices, payments, member contributions and expenses — all in one clean,
              real-time dashboard built for Madal ICT Solutions.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <div className="flex -space-x-2">
                {team.length > 0
                  ? team.slice(0, 4).map((m) =>
                      m.avatarUrl ? (
                        <img
                          key={m.memberId}
                          src={m.avatarUrl}
                          alt={m.memberName}
                          title={m.memberName}
                          className="h-8 w-8 rounded-full object-cover ring-2 ring-navy"
                        />
                      ) : (
                        <span
                          key={m.memberId}
                          title={m.memberName}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/30 text-[10px] font-bold text-white ring-2 ring-navy"
                        >
                          {m.memberName
                            .split(" ")
                            .map((p) => p[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </span>
                      )
                    )
                  : ["#ffffff", "#b6ddfa", "#74bcf8", "#4aa6ef"].map((c, i) => (
                      <span
                        key={i}
                        className="h-8 w-8 rounded-full ring-2 ring-navy"
                        style={{ backgroundColor: c, opacity: 1 - i * 0.15 }}
                      />
                    ))}
              </div>
              <p className="text-sm text-slate-300">
                {team.length > 0
                  ? `Trusted by ${team.length} Madal ICT member${team.length === 1 ? "" : "s"}`
                  : "Trusted by the Madal ICT team"}
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* RIGHT — login */}
      <div className="flex w-full flex-col justify-center bg-app px-6 py-12 lg:w-1/2 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-14"
          >
            <Logo wide />
          </motion.div>
          {children}
        </div>
      </div>
    </div>
  );
}

function GridPattern() {
  return (
    <svg className="h-full w-full" aria-hidden>
      <defs>
        <pattern id="auth-grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M48 0H0V48" fill="none" stroke="currentColor" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#auth-grid)" />
    </svg>
  );
}

function FinancePreviewCard() {
  const circumference = 2 * Math.PI * 15.5;
  const paid = 0.72;
  const activities = [
    {
      icon: CheckCircle2,
      label: "Payment received",
      meta: "Amina Hassan · $40.00",
      tone: "text-emerald-400 bg-emerald-400/10",
    },
    {
      icon: FileText,
      label: "Invoice issued",
      meta: "INV-000003 · Web Hosting",
      tone: "text-accent bg-accent/10",
    },
    {
      icon: Users,
      label: "Member due collected",
      meta: "August batch · 18 paid",
      tone: "text-sky-300 bg-sky-300/10",
    },
  ];

  return (
    <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white/10 p-1 shadow-2xl ring-1 ring-white/25 backdrop-blur-xl">
      <div className="rounded-[1.35rem] bg-gradient-to-b from-white/15 to-transparent p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {/* Finance growth icon in the glance card */}
            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-black/20">
              <img src={growthIcon} alt="" className="h-8 w-8 object-contain" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Finance Hub</p>
              <p className="text-base font-bold text-white">Today at a glance</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-accent/20 px-2.5 py-1 text-[11px] font-bold text-accent ring-1 ring-accent/40">
            Live
          </span>
        </div>

        <div className="mt-6 flex items-center gap-5">
          <div className="relative h-[7.25rem] w-[7.25rem] shrink-0">
            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3.5" />
              <motion.circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="#74bcf8"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: circumference * (1 - paid) }}
                transition={{ duration: 1, delay: 0.25, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-xl font-bold text-white">72%</p>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-300">Collected</p>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <MetricBar label="Invoices paid" value="72%" width="72%" color="bg-accent" delay={0.3} />
            <MetricBar label="Member dues" value="88%" width="88%" color="bg-emerald-400" delay={0.4} />
            <div className="flex gap-4 pt-0.5">
              <Stat label="Open" value="2" />
              <Stat label="Overdue" value="0" valueClass="text-rose-300" />
              <Stat label="Rentals" value="2" />
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-2 border-t border-white/10 pt-4">
          {activities.map((a, i) => {
            const Icon = a.icon;
            return (
              <motion.div
                key={a.label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + i * 0.08 }}
                className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5 ring-1 ring-white/10"
              >
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", a.tone)}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{a.label}</p>
                  <p className="truncate text-[11px] text-slate-400">{a.meta}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MetricBar({
  label,
  value,
  width,
  color,
  delay,
}: {
  label: string;
  value: string;
  width: string;
  color: string;
  delay: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-300">{label}</span>
        <span className="font-bold text-white">{value}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className={cn("h-full rounded-full", color)}
          initial={{ width: 0 }}
          animate={{ width }}
          transition={{ duration: 0.75, delay }}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className={cn("text-base font-bold text-white", valueClass)}>{value}</p>
    </div>
  );
}
