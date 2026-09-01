import { Fragment, type ReactNode } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  headerActions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  closeOnBackdrop?: boolean;
}

const sizes = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  headerActions,
  children,
  footer,
  size = "md",
  closeOnBackdrop = true,
}: ModalProps) {
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={closeOnBackdrop ? onClose : () => undefined}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-0 sm:items-center sm:p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-250"
              enterFrom="opacity-0 translate-y-4 scale-[0.98] sm:translate-y-0 sm:scale-[0.97]"
              enterTo="opacity-100 translate-y-0 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 translate-y-4 scale-[0.98] sm:translate-y-0"
            >
              <Dialog.Panel
                className={cn(
                  "w-full transform overflow-hidden rounded-t-3xl bg-card shadow-pop ring-1 ring-line transition-all sm:rounded-3xl",
                  sizes[size]
                )}
              >
                {(title || subtitle) && (
                  <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
                    <div className="min-w-0 flex-1">
                      <Dialog.Title className="text-sm font-semibold text-ink sm:text-base">{title}</Dialog.Title>
                      {subtitle && (
                        <Dialog.Description className="mt-0.5 text-xs text-ink-muted sm:text-sm">
                          {subtitle}
                        </Dialog.Description>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {headerActions}
                      <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-ink-muted transition hover:bg-muted hover:text-ink"
                        aria-label="Close"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
                <div className="max-h-[70vh] overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">{children}</div>
                {footer && (
                  <div className="flex items-center justify-end gap-2 border-t border-line bg-muted px-4 py-3 sm:px-5">
                    {footer}
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
