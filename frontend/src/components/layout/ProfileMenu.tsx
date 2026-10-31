import { Fragment, type ReactNode } from "react";
import { Menu, Transition } from "@headlessui/react";
import { useNavigate } from "react-router-dom";
import { Lock, LogOut, Settings, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/utils/cn";
import type { User } from "@/types";

export function ProfileMenu({
  user,
  trigger,
  onLogout,
}: {
  user: User | null;
  trigger: ReactNode;
  onLogout: () => void;
}) {
  const navigate = useNavigate();
  const { lock } = useAuth();

  return (
    <Menu as="div" className="relative">
      <Menu.Button className="outline-none">{trigger}</Menu.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-150"
        enterFrom="opacity-0 translate-y-1 scale-95"
        enterTo="opacity-100 translate-y-0 scale-100"
        leave="transition ease-in duration-100"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 translate-y-1 scale-95"
      >
        <Menu.Items className="absolute right-0 z-50 mt-2 w-[min(15rem,calc(100vw-1rem))] origin-top-right overflow-hidden rounded-none bg-card shadow-pop ring-1 ring-line focus:outline-none sm:w-60">
          <div className="flex items-center gap-3 bg-muted/70 px-4 py-3.5">
            <Avatar
              name={user?.fullName ?? "User"}
              src={user?.avatarUrl}
              color={user?.avatarColor}
              size="md"
              shape="rounded"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink">{user?.fullName ?? "User"}</p>
              <p className="truncate text-xs text-ink-muted">{user?.role ?? "—"}</p>
            </div>
          </div>

          <div className="p-1.5">
            <MenuItem
              icon={<UserRound className="h-4 w-4" />}
              label="Profile"
              onClick={() => navigate("/profile")}
            />
            <MenuItem
              icon={<Settings className="h-4 w-4" />}
              label="Settings"
              onClick={() => navigate("/settings")}
            />
            <MenuItem
              icon={<Lock className="h-4 w-4" />}
              label="Lock Screen"
              onClick={() => lock()}
            />
          </div>

          <div className="border-t border-line p-1.5">
            <MenuItem
              icon={<LogOut className="h-4 w-4" />}
              label="Logout"
              danger
              onClick={onLogout}
            />
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <Menu.Item>
      {({ active }) => (
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "flex w-full items-center gap-2.5 px-3 py-2.5 text-sm font-medium transition",
            danger
              ? active
                ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10"
                : "text-rose-600"
              : active
                ? "bg-muted text-ink"
                : "text-ink-soft"
          )}
        >
          {icon}
          {label}
        </button>
      )}
    </Menu.Item>
  );
}
