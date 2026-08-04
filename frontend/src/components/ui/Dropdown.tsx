import { Fragment, type ReactNode } from "react";
import { Menu, Transition } from "@headlessui/react";
import { cn } from "@/utils/cn";

export interface DropdownItem {
  label?: ReactNode;
  onClick?: () => void;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
}

export function Dropdown({
  trigger,
  items,
  align = "right",
  width = "w-56",
  className,
}: {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
  width?: string;
  className?: string;
}) {
  return (
    <Menu as="div" className={cn("relative", className)}>
      <Menu.Button className="outline-none">{trigger}</Menu.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-150"
        enterFrom="opacity-0 translate-y-1 scale-95"
        enterTo="opacity-100 translate-y-0 scale-100"
        leave="transition ease-in duration-100"
        leaveFrom="opacity-100"
        leaveTo="opacity-0 scale-95"
      >
        <Menu.Items
          className={cn(
            "absolute z-40 mt-2 origin-top-right overflow-hidden rounded-2xl bg-panel p-1.5 shadow-pop ring-1 ring-line focus:outline-none",
            align === "right" ? "right-0" : "left-0",
            width
          )}
        >
          {items.map((item, i) =>
            item.divider ? (
              <div key={i} className="my-1 h-px bg-line" />
            ) : (
              <Menu.Item key={i} disabled={item.disabled}>
                {({ active }) => (
                  <button
                    onClick={item.onClick}
                    disabled={item.disabled}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition",
                      active
                        ? item.danger
                          ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
                          : "bg-muted text-ink"
                        : item.danger
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-ink-soft",
                      item.disabled && "cursor-not-allowed opacity-50"
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                )}
              </Menu.Item>
            )
          )}
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
