import { type ReactNode } from "react";
import { Dialog, DialogPanel, DialogTitle, Description } from "@headlessui/react";
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

/** DreamPOS-style dialog — soft radius, clear header / body / footer. */
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
    <Dialog
      open={open}
      onClose={closeOnBackdrop ? onClose : () => undefined}
      className="relative z-[100]"
    >
      <div className="fixed inset-0 bg-slate-950/45 transition data-closed:opacity-0" aria-hidden="true" />

      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-0 sm:items-center sm:p-4">
          <DialogPanel
            transition
            className={cn(
              "w-full transform overflow-hidden rounded-none bg-card shadow-pop ring-1 ring-line transition duration-200",
              "data-closed:translate-y-4 data-closed:opacity-0 sm:data-closed:translate-y-0 sm:data-closed:scale-[0.98]",
              sizes[size]
            )}
          >
            {(title || subtitle) && (
              <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-base font-bold text-ink">{title}</DialogTitle>
                  {subtitle && (
                    <Description className="mt-0.5 text-sm text-ink-muted">{subtitle}</Description>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {headerActions}
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-none p-1.5 text-ink-muted transition hover:bg-muted hover:text-ink"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
            <div className="max-h-[min(70vh,calc(100dvh-11rem))] overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
              {children}
            </div>
            {footer && (
              <div className="flex flex-col-reverse gap-2 border-t border-line bg-panel px-4 py-3.5 sm:flex-row sm:items-center sm:justify-end sm:px-5 [&_button]:w-full sm:[&_button]:w-auto">
                {footer}
              </div>
            )}
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
