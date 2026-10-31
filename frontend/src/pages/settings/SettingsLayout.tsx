import { NavLink, Outlet, Navigate, useLocation } from "react-router-dom";
import {
  Building2,
  Shield,
  Users,
  SlidersHorizontal,
  ClipboardList,
  Trash2,
  Mail,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { usePermission } from "@/hooks/usePermission";
import { PageHeader } from "@/components/ui/PageHeader";

const NAV = [
  {
    to: "/settings/organization",
    label: "Organization",
    icon: Building2,
    permissions: ["view organizations", "edit organizations", "manage settings"],
  },
  {
    to: "/settings/roles",
    label: "Roles & Permissions",
    icon: Shield,
    permissions: ["view roles", "create roles", "edit roles"],
  },
  {
    to: "/settings/users",
    label: "Users",
    icon: Users,
    permissions: ["view users", "create users", "edit users"],
  },
  {
    to: "/settings/finance",
    label: "Finance defaults",
    icon: SlidersHorizontal,
    permissions: ["manage settings", "view organizations", "view dashboard"],
  },
  {
    to: "/settings/logs",
    label: "Logs",
    icon: ClipboardList,
    permissions: ["view logs"],
  },
  {
    to: "/settings/trash",
    label: "Trash Items",
    icon: Trash2,
    permissions: ["view trash items", "restore trash items"],
  },
] as const;

const TITLES: Record<string, { title: string; subtitle: string }> = {
  "/settings/organization": {
    title: "Organization Settings",
    subtitle: "Manage company identity and contact information",
  },
  "/settings/roles": {
    title: "Roles & Permission",
    subtitle: "Manage your roles",
  },
  "/settings/users": {
    title: "Users",
    subtitle: "Manage your users",
  },
  "/settings/finance": {
    title: "Finance defaults",
    subtitle: "Currency, prefixes, member dues, and display preferences.",
  },
  "/settings/logs": {
    title: "Activity Logs",
    subtitle: "Audit trail of system actions.",
  },
  "/settings/trash": {
    title: "Trash Items",
    subtitle: "Restore or permanently review soft-deleted records.",
  },
};

export default function SettingsLayout() {
  const { hasAnyPermission } = usePermission();
  const location = useLocation();

  const visible = NAV.filter((item) => hasAnyPermission([...item.permissions]));
  if (!visible.length) return <Navigate to="/" replace />;

  if (location.pathname === "/settings" || location.pathname === "/settings/") {
    return <Navigate to={visible[0].to} replace />;
  }

  const meta = TITLES[location.pathname] ?? {
    title: "Settings",
    subtitle: "System configuration",
  };
  const ownHeader =
    location.pathname === "/settings/roles" || location.pathname === "/settings/users";

  const crumb =
    location.pathname === "/settings/organization"
      ? "Organization"
      : meta.title.replace(/ Settings$/, "").replace(/^Activity /, "");

  return (
    <div className="space-y-5">
      <div className="text-xs font-medium text-ink-muted">
        Dashboard <span className="mx-1.5 text-line">/</span> Settings
        <span className="mx-1.5 text-line">/</span>
        <span className="text-ink-soft">{crumb}</span>
      </div>

      <div className="overflow-hidden rounded-none bg-panel shadow-sm ring-1 ring-line">
        <div className="flex flex-col lg:flex-row">
          {/* Settings sub-sidebar — horizontal tabs on phone/tablet, stack on desktop */}
          <aside className="w-full shrink-0 border-b border-line bg-muted/60 lg:w-[240px] lg:border-b-0 lg:border-r">
            <div className="hidden px-4 pb-2 pt-4 lg:block">
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Settings</p>
            </div>
            <nav className="flex gap-1 overflow-x-auto px-2 py-2 [-ms-overflow-style:none] [scrollbar-width:none] lg:flex-col lg:space-y-0.5 lg:overflow-visible lg:pb-3 lg:pt-0 [&::-webkit-scrollbar]:hidden">
              {visible.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-none px-3 py-2.5 text-sm font-semibold transition-colors lg:gap-3",
                      isActive
                        ? "bg-[var(--brand-primary,#EE4062)] text-[var(--brand-sidebar-text,#fff)] shadow-sm"
                        : "text-ink-soft hover:bg-panel hover:text-ink"
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-90" />
                  <span className="max-lg:text-xs">{label}</span>
                </NavLink>
              ))}
              <div className="mt-2 hidden border-t border-line px-3 py-2.5 text-[11px] text-ink-muted lg:block">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  SMS &amp; Mail coming soon
                </span>
              </div>
            </nav>
          </aside>

          <div className="min-w-0 flex-1 space-y-5 p-3 sm:p-5 lg:p-6">
            {!ownHeader && <PageHeader title={meta.title} subtitle={meta.subtitle} />}
            <Outlet context={{ embedded: true }} />
          </div>
        </div>
      </div>
    </div>
  );
}
