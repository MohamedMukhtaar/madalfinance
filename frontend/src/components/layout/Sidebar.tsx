import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { NAV_ITEMS, type NavItem } from "@/utils/constants";
import { useDashboardContext } from "@/context/DashboardContext";
import { usePermission } from "@/hooks/usePermission";
import { cn } from "@/utils/cn";
import type { DashboardData } from "@/types";

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const OPEN_KEY = "madal_sidebar_open_group";

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

const shellStyle: CSSProperties = {
  backgroundColor: "var(--brand-sidebar, #101848)",
  color: "var(--brand-sidebar-ink, #C7CEDB)",
};

function NavContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermission();
  const { data: dash } = useDashboardContext();
  const location = useLocation();

  const visibleNav = useMemo(
    () =>
      NAV_ITEMS.map((item) => {
        if (item.permissions?.length && !hasAnyPermission(item.permissions)) return null;
        if (!item.children?.length) return item;
        const children = item.children.filter(
          (c) => !c.permissions?.length || hasAnyPermission(c.permissions)
        );
        if (!children.length) return null;
        return { ...item, children };
      }).filter((item): item is NavItem => item != null),
    [hasAnyPermission]
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

  useEffect(() => {
    const active = activeGroupLabel(location.pathname);
    if (active) {
      setOpenGroup(active);
      localStorage.setItem(OPEN_KEY, active);
    }
  }, [location.pathname]);

  const toggleGroup = (label: string) => {
    setOpenGroup((prev) => {
      const next = prev === label ? null : label;
      if (next) localStorage.setItem(OPEN_KEY, next);
      else localStorage.removeItem(OPEN_KEY);
      return next;
    });
  };

  /** Hover uses sidebar ink so it stays visible on both dark and light brand backgrounds. */
  const hoverIdle =
    "hover:bg-[color-mix(in_srgb,var(--brand-sidebar-ink,#C7CEDB)_14%,transparent)] hover:text-[var(--brand-sidebar-text,#FFFFFF)]";

  const linkClass = (active: boolean, nested = false) =>
    cn(
      "group relative flex items-center rounded-none text-sm font-semibold transition-colors duration-150",
      collapsed ? "justify-center px-2.5 py-2.5" : nested ? "gap-3 px-3 py-2 pl-10" : "gap-3 px-3 py-2.5",
      active ? "shadow-sm" : hoverIdle
    );

  const activeStyle = (active: boolean): CSSProperties | undefined =>
    active
      ? {
          backgroundColor: "var(--brand-sidebar-bg, var(--brand-primary, #1A255C))",
          color: "var(--brand-sidebar-text, #FFFFFF)",
        }
      : undefined;

  const groupClass = (active: boolean, open: boolean) =>
    cn(
      "group relative flex w-full items-center rounded-none text-sm font-semibold transition-colors duration-150",
      collapsed ? "justify-center px-2.5 py-2.5" : "gap-3 px-3 py-2.5",
      active && !open
        ? "shadow-sm"
        : active && open
          ? "bg-[color-mix(in_srgb,var(--brand-sidebar-ink,#C7CEDB)_14%,transparent)] text-[var(--brand-sidebar-text,#FFFFFF)]"
          : hoverIdle
    );

  const badgeClass = (active: boolean) =>
    cn(
      "relative z-10 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
      active
        ? "bg-[color-mix(in_srgb,var(--brand-sidebar-text,#fff)_25%,transparent)] text-[var(--brand-sidebar-text,#fff)]"
        : "bg-[color-mix(in_srgb,var(--brand-sidebar-ink,#C7CEDB)_14%,transparent)] opacity-80"
    );

  return (
    <div className="flex h-full flex-col" style={shellStyle}>
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
                    style={({ isActive }) => activeStyle(isActive)}
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
                  style={active && !open ? activeStyle(true) : undefined}
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
                          "relative z-10 h-4 w-4 shrink-0 opacity-60 transition-transform",
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
                              style={activeStyle(childActive)}
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
    </div>
  );
}

export function Sidebar({ collapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  return (
    <>
      <aside
        className={cn(
          "sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r border-black/20 transition-[width] duration-300 lg:flex",
          collapsed ? "w-[76px]" : "w-[264px]"
        )}
        style={shellStyle}
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
              className="fixed inset-y-0 left-0 z-50 w-[280px] shadow-pop lg:hidden"
              style={shellStyle}
            >
              <button
                onClick={onCloseMobile}
                className="absolute right-3 top-4 z-10 rounded-lg p-1.5 opacity-70 transition hover:bg-[color-mix(in_srgb,var(--brand-sidebar-ink)_14%,transparent)] hover:opacity-100"
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
