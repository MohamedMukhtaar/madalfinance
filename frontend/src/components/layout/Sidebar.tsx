import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { NAV_ITEMS, type NavItem } from "@/utils/constants";
import { useAuth } from "@/context/AuthContext";
import { useDashboardContext } from "@/context/DashboardContext";
import { canAccessTrash, isSuperAdmin } from "@/utils/roles";
import { cn } from "@/utils/cn";
import type { DashboardData } from "@/types";

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const OPEN_KEY = "madal_sidebar_open_group";

/** Every navigable path in the sidebar (for precise active matching). */
const ALL_NAV_PATHS = NAV_ITEMS.flatMap((item) =>
  item.children?.length ? item.children.map((c) => c.path) : item.path ? [item.path] : []
).filter(Boolean) as string[];

function badgeFor(key: string | undefined, dash?: DashboardData): number | undefined {
  if (!key || !dash?.stats) return undefined;
  const map: Record<string, number> = {
    customers: dash.stats.totalCustomers,
    projects: dash.stats.activeProjects,
    rentals: dash.stats.activeRentals,
    invoices: dash.stats.openInvoices,
  };
  return map[key];
}

/**
 * Exact path match, or detail child (/customers/5) when no sibling nav path is more specific.
 * Prevents /expenses from lighting up while on /expenses/categories.
 */
function pathActive(pathname: string, path?: string) {
  if (!path) return false;
  if (path === "/") return pathname === "/";
  if (pathname === path) return true;
  if (!pathname.startsWith(`${path}/`)) return false;
  const moreSpecific = ALL_NAV_PATHS.some(
    (p) => p !== path && p.startsWith(`${path}/`) && (pathname === p || pathname.startsWith(`${p}/`))
  );
  return !moreSpecific;
}

function groupActive(pathname: string, item: NavItem) {
  if (item.path) return pathActive(pathname, item.path);
  return (item.children ?? []).some((c) => pathActive(pathname, c.path));
}

function activeGroupLabel(pathname: string): string | null {
  for (const item of NAV_ITEMS) {
    if (item.children?.length && groupActive(pathname, item)) return item.label;
  }
  return null;
}

function NavContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { data: dash } = useDashboardContext();
  const location = useLocation();

  const visibleNav = useMemo(
    () =>
      NAV_ITEMS.filter((item) => {
        if (item.superAdminOnly && !isSuperAdmin(user?.role)) return false;
        if (item.path === "/trash" && !canAccessTrash(user?.role)) return false;
        return true;
      }),
    [user?.role]
  );

  const initialOpen = useMemo(() => activeGroupLabel(location.pathname), []);
  const [openGroup, setOpenGroup] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(OPEN_KEY);
      return saved || initialOpen;
    } catch {
      return initialOpen;
    }
  });

  // Keep only the group for the current route open (accordion).
  useEffect(() => {
    const active = activeGroupLabel(location.pathname);
    if (active) {
      setOpenGroup(active);
      localStorage.setItem(OPEN_KEY, active);
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const toggleGroup = (label: string) => {
    setOpenGroup((prev) => {
      const next = prev === label ? null : label;
      if (next) localStorage.setItem(OPEN_KEY, next);
      else localStorage.removeItem(OPEN_KEY);
      return next;
    });
  };

  const linkClass = (active: boolean, nested = false) =>
    cn(
      "group relative flex items-center rounded-xl text-sm font-semibold transition-colors duration-150",
      collapsed ? "justify-center px-2.5 py-2.5" : nested ? "gap-3 px-3 py-2 pl-10" : "gap-3 px-3 py-2.5",
      active
        ? "bg-secondary-500/25 text-white shadow-sm ring-1 ring-inset ring-secondary-400/40"
        : "text-white/75 hover:bg-white/10 hover:text-white"
    );

  const groupClass = (active: boolean, open: boolean) =>
    cn(
      "group relative flex w-full items-center rounded-xl text-sm font-semibold transition-colors duration-150",
      collapsed ? "justify-center px-2.5 py-2.5" : "gap-3 px-3 py-2.5",
      active && !open
        ? "bg-secondary-500/25 text-white shadow-sm ring-1 ring-inset ring-secondary-400/40"
        : active && open
          ? "bg-white/10 text-white"
          : "text-white/75 hover:bg-white/10 hover:text-white"
    );

  const badgeClass = (active: boolean) =>
    cn(
      "relative z-10 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
      active ? "bg-white/25 text-white" : "bg-white/10 text-white/80"
    );

  return (
    <div className="flex h-full flex-col bg-navy text-white">
      <div className={cn("flex shrink-0 flex-col justify-center", collapsed ? "px-3 py-4" : "px-5 pb-5 pt-4")}>
        <Logo compact={collapsed} onDark />
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4">
        <ul className="space-y-0.5">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const hasChildren = Boolean(item.children?.length);
            const active = groupActive(location.pathname, item);
            const open = openGroup === item.label;
            const count = badgeFor(item.badgeKey, dash as DashboardData | undefined);
            const isDashboard = item.path === "/";

            if (!hasChildren && item.path) {
              return (
                <li key={item.label} className={isDashboard ? "mt-3" : undefined}>
                  <NavLink
                    to={item.path}
                    end={item.path === "/"}
                    onClick={() => {
                      setOpenGroup(null);
                      localStorage.removeItem(OPEN_KEY);
                      onNavigate?.();
                    }}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) => linkClass(isActive)}
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className="relative z-10 h-[18px] w-[18px] shrink-0" />
                        {!collapsed && <span className="relative z-10 flex-1 truncate">{item.label}</span>}
                        {!collapsed && count !== undefined && (
                          <span className={badgeClass(isActive)}>{count}</span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              );
            }

            return (
              <li key={item.label}>
                <button
                  type="button"
                  onClick={() => {
                    if (collapsed && item.children?.[0]) {
                      navigate(item.children[0].path);
                      onNavigate?.();
                      return;
                    }
                    toggleGroup(item.label);
                  }}
                  title={collapsed ? item.label : undefined}
                  className={groupClass(active, open)}
                  aria-expanded={open}
                >
                  <Icon className="relative z-10 h-[18px] w-[18px] shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="relative z-10 flex-1 truncate text-left">{item.label}</span>
                      {count !== undefined && (
                        <span className={badgeClass(active && !open)}>{count}</span>
                      )}
                      <ChevronDown
                        className={cn(
                          "relative z-10 h-4 w-4 shrink-0 text-white/60 transition-transform",
                          open && "rotate-180"
                        )}
                      />
                    </>
                  )}
                </button>

                <AnimatePresence initial={false}>
                  {!collapsed && open && item.children && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-0.5 space-y-0.5 overflow-hidden"
                    >
                      {item.children.map((child) => {
                        const ChildIcon = child.icon ?? Icon;
                        const childCount = badgeFor(child.badgeKey, dash as DashboardData | undefined);
                        const childActive = pathActive(location.pathname, child.path);
                        return (
                          <li key={child.path}>
                            <NavLink
                              to={child.path}
                              end
                              onClick={onNavigate}
                              className={() => linkClass(childActive, true)}
                            >
                              <ChildIcon className="relative z-10 h-4 w-4 shrink-0" />
                              <span className="relative z-10 flex-1 truncate">{child.label}</span>
                              {childCount !== undefined && (
                                <span className={badgeClass(childActive)}>{childCount}</span>
                              )}
                            </NavLink>
                          </li>
                        );
                      })}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-white/10 p-3">
        <button
          onClick={handleLogout}
          className={cn(
            "flex w-full items-center rounded-xl text-sm font-semibold text-white/75 transition-colors hover:bg-rose-500/20 hover:text-rose-200",
            collapsed ? "justify-center px-2.5 py-2.5" : "gap-3 px-3 py-2.5"
          )}
          title={collapsed ? "Logout" : undefined}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-[18px] w-[18px]"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {!collapsed && "Logout"}
        </button>
      </div>
    </div>
  );
}

export function Sidebar({ collapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  return (
    <>
      <aside
        className={cn(
          "sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r border-[#0a1030] bg-navy transition-[width] duration-300 lg:flex",
          collapsed ? "w-[76px]" : "w-[264px]"
        )}
      >
        <NavContent collapsed={collapsed} />
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 350, damping: 32 }}
              className="fixed inset-y-0 left-0 z-50 w-[280px] bg-navy text-white shadow-pop lg:hidden"
            >
              <button
                onClick={onCloseMobile}
                className="absolute right-3 top-4 rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
              <NavContent collapsed={false} onNavigate={onCloseMobile} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
