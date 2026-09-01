import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bell, Check, LogOut, Menu, Moon, PanelLeftClose, PanelLeftOpen, Search, Sun, UserPen, X } from "lucide-react";
import { Dropdown } from "@/components/ui/Dropdown";
import { Avatar } from "@/components/ui/Avatar";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useDashboardContext } from "@/context/DashboardContext";
import { timeAgo } from "@/utils/format";
import { cn } from "@/utils/cn";
import { ProfileMenu } from "./ProfileMenu";

const typeStyles: Record<string, string> = {
  info: "bg-secondary-400/15 text-secondary-600",
  success: "bg-emerald-500/10 text-emerald-500",
  warning: "bg-amber-500/10 text-amber-500",
  danger: "bg-rose-500/10 text-rose-500",
};

export function Topbar({
  onOpenMobile,
  collapsed,
  onToggleCollapse,
}: {
  onOpenMobile: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: dashboard } = useDashboardContext();
  const [read, setRead] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const notifications = useMemo(() => [
    ...(dashboard?.recentPayments ?? []).map((payment) => ({
      id: payment.paymentId,
      title: `Payment received from ${payment.customerName}`,
      description: `${payment.paymentNumber} · ${payment.amount.toLocaleString()}`,
      time: payment.paymentDate,
      type: "success" as const,
      link: "/payments",
    })),
    ...(dashboard?.recentExpenses ?? []).map((expense) => ({
      id: -expense.expenseId,
      title: `Expense: ${expense.categoryName}`,
      description: expense.description,
      time: expense.expenseDate,
      type: "warning" as const,
      link: "/expenses",
    })),
    ...(dashboard?.recentTransactions ?? []).map((transaction) => ({
      id: transaction.transactionId + 1_000_000,
      title: `${transaction.transactionType} transaction`,
      description: transaction.description ?? transaction.referenceType ?? "Ledger entry",
      time: transaction.transactionDate,
      type: transaction.transactionType === "Income" ? "success" as const : "info" as const,
      link: "/transactions",
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8), [dashboard]);

  const unread = notifications.filter((n) => !read.includes(n.id)).length;
  const dark = resolvedTheme === "dark";

  const markAllRead = () =>
    setRead(notifications.map((n) => n.id));

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };
  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const query = search.trim();
    if (query) navigate(`/customers?q=${encodeURIComponent(query)}`);
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 flex-col border-b border-line bg-panel sm:h-16">
      {mobileSearchOpen && (
        <form
          className="flex items-center gap-2 border-b border-line px-4 py-2 sm:hidden"
          onSubmit={(event) => {
            submitSearch(event);
            setMobileSearchOpen(false);
          }}
        >
          <input
            autoFocus
            placeholder="Search customers, invoices…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-10 flex-1 rounded-xl border-0 bg-muted px-3 text-sm text-ink ring-1 ring-inset ring-line focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            type="button"
            onClick={() => setMobileSearchOpen(false)}
            className="rounded-xl p-2 text-ink-muted hover:bg-muted"
            aria-label="Close search"
          >
            <X className="h-5 w-5" />
          </button>
        </form>
      )}
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
      {/* Mobile menu + collapse + search */}
      <div className="flex flex-1 items-center gap-2 sm:gap-3">
        <button
          onClick={onOpenMobile}
          className="rounded-xl p-2 text-ink-muted transition hover:bg-muted lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setMobileSearchOpen(true)}
          className="rounded-xl p-2 text-ink-muted transition hover:bg-muted sm:hidden"
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </button>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden rounded-xl p-2 text-ink-muted transition hover:bg-muted hover:text-ink lg:flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
        )}
        <form className="relative hidden w-full max-w-md sm:block" onSubmit={submitSearch}>
          <svg viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
          </svg>
          <input
            placeholder="Search customers, invoices, projects…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-10 w-full rounded-xl border-0 bg-muted pl-10 pr-4 text-sm text-ink ring-1 ring-inset ring-transparent transition placeholder:text-ink-muted focus:bg-card focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </form>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="relative rounded-xl p-2 text-ink-muted transition hover:bg-muted hover:text-ink"
          aria-label="Toggle dark mode"
        >
          <motion.span
            key={dark ? "moon" : "sun"}
            initial={{ rotate: -60, opacity: 0, scale: 0.6 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="block"
          >
            {dark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </motion.span>
        </button>

        {/* Notifications */}
        <Dropdown
          width="w-80 sm:w-96"
          trigger={
            <button
              className="relative rounded-xl p-2 text-ink-muted transition hover:bg-muted hover:text-ink"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-panel"
                >
                  {unread}
                </motion.span>
              )}
            </button>
          }
          items={[
            {
              label: (
                <div className="flex items-center justify-between px-1 py-1">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">Notifications</span>
                  <button
                    onClick={markAllRead}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
                  >
                    <Check className="h-3 w-3" /> Mark all read
                  </button>
                </div>
              ),
              onClick: () => undefined,
            },
            { divider: true },
            ...(notifications.length === 0 ? [{
              label: <p className="px-2 py-6 text-center text-sm text-slate-400">You're all caught up</p>,
              onClick: () => undefined,
            }] : notifications.map((n) => ({
              label: (
                <div className="flex items-start gap-3 py-0.5">
                  <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", typeStyles[n.type])}>
                    <Bell className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-sm", read.includes(n.id) ? "font-medium text-slate-500 dark:text-slate-400" : "font-semibold text-slate-900 dark:text-white")}>
                      {n.title}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-400 dark:text-slate-500">{n.description}</p>
                    <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">{timeAgo(n.time)}</p>
                  </div>
                  {!read.includes(n.id) && <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />}
                </div>
              ),
              onClick: () => {
                if (n.link) navigate(n.link);
                setRead((prev) => [...new Set([...prev, n.id])]);
              },
            }))),
          ]}
        />

        <div className="mx-1 hidden h-6 w-px bg-line sm:block" />

        {/* Profile */}
        <ProfileMenu
          user={user}
          onLogout={handleLogout}
          trigger={
            <button className="flex items-center gap-2.5 rounded-xl p-1.5 pr-2 transition hover:bg-muted">
              <Avatar name={user?.fullName ?? "User"} color={user?.avatarColor} />
              <span className="hidden text-left md:block">
                <span className="block max-w-[9rem] truncate text-sm font-semibold text-ink">
                  {user?.fullName}
                </span>
                <span className="block text-[11px] text-ink-muted">{user?.role}</span>
              </span>
            </button>
          }
        />
      </div>
      </div>
    </header>
  );
}
