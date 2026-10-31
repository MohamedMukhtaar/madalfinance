import { useCallback, useEffect, useState } from "react";
import { Description, Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "./Button";
import { Textarea } from "./FormField";
import { cn } from "@/utils/cn";

export interface ConfirmOptions {
  title: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
  icon?: "warning" | "success" | "question" | "info";
}

export interface DeleteReasonOptions {
  title: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
}

const MIN_DELETE_REASON = 25;

type ConfirmRequest = {
  kind: "confirm";
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
};

type DeleteRequest = {
  kind: "delete";
  options: DeleteReasonOptions;
  resolve: (value: string | null) => void;
};

type PendingRequest = ConfirmRequest | DeleteRequest;

let dispatchRequest: ((request: PendingRequest) => void) | null = null;

/** DreamPOS delete/confirm shell — centered icon, title, text, square action buttons. */
function ConfirmShell({
  open,
  onCancel,
  title,
  text,
  icon,
  children,
  footer,
}: {
  open: boolean;
  onCancel: () => void;
  title: string;
  text?: string;
  icon?: "warning" | "success" | "question" | "info";
  children?: React.ReactNode;
  footer: React.ReactNode;
}) {
  const danger = icon === "warning" || !icon;
  return (
    <Dialog open={open} onClose={onCancel} className="relative z-[110]">
      <div className="fixed inset-0 bg-slate-950/45" aria-hidden="true" />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPanel
            transition
            className="w-full max-w-md transform overflow-hidden rounded-none bg-card p-8 text-center shadow-pop ring-1 ring-line transition duration-200 data-closed:scale-[0.98] data-closed:opacity-0"
          >
            <div
              className={cn(
                "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full",
                danger
                  ? "bg-rose-50 text-rose-500"
                  : "bg-[color-mix(in_srgb,var(--brand-primary)_12%,white)] text-[var(--brand-primary)]"
              )}
            >
              <Trash2 className="h-7 w-7" strokeWidth={1.75} />
            </div>
            <DialogTitle className="text-xl font-bold text-ink">{title}</DialogTitle>
            {text && <Description className="mt-2 text-sm text-ink-muted">{text}</Description>}
            {children && <div className="mt-5 text-left">{children}</div>}
            <div className="mt-7 flex items-center justify-center gap-3">{footer}</div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}

export function ConfirmHost() {
  const [request, setRequest] = useState<PendingRequest | null>(null);
  const [deleteReason, setDeleteReason] = useState("");

  useEffect(() => {
    dispatchRequest = setRequest;
    return () => {
      dispatchRequest = null;
    };
  }, []);

  const close = useCallback(() => {
    setRequest(null);
    setDeleteReason("");
  }, []);

  if (!request) return null;

  if (request.kind === "confirm") {
    const {
      title,
      text,
      confirmText = "Yes Delete",
      cancelText = "Cancel",
      icon = "warning",
    } = request.options;

    return (
      <ConfirmShell
        open
        title={title}
        text={text ?? "Are you sure you want to delete this?"}
        icon={icon}
        onCancel={() => {
          request.resolve(false);
          close();
        }}
        footer={
          <>
            <Button
              variant="primary"
              className="min-w-[7.5rem]"
              onClick={() => {
                request.resolve(false);
                close();
              }}
            >
              {cancelText}
            </Button>
            <Button
              variant="danger"
              className="min-w-[7.5rem] bg-orange-500 hover:bg-orange-600 focus-visible:ring-orange-500"
              onClick={() => {
                request.resolve(true);
                close();
              }}
            >
              {confirmText}
            </Button>
          </>
        }
      />
    );
  }

  const { title, text, confirmText = "Yes Delete", cancelText = "Cancel" } = request.options;
  const trimmed = deleteReason.trim();
  const remaining = Math.max(0, MIN_DELETE_REASON - trimmed.length);
  const ready = remaining === 0;

  return (
    <ConfirmShell
      open
      title={title}
      text={
        text ??
        "Please explain why this record is being deleted. This cannot be undone without restoring from Trash."
      }
      icon="warning"
      onCancel={() => {
        request.resolve(null);
        close();
      }}
      footer={
        <>
          <Button
            variant="primary"
            className="min-w-[7.5rem]"
            onClick={() => {
              request.resolve(null);
              close();
            }}
          >
            {cancelText}
          </Button>
          <Button
            variant="danger"
            className="min-w-[7.5rem] bg-orange-500 hover:bg-orange-600 focus-visible:ring-orange-500"
            disabled={!ready}
            onClick={() => {
              request.resolve(trimmed);
              close();
            }}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <p className="text-xs text-ink-muted">Reason (minimum {MIN_DELETE_REASON} characters)</p>
        <Textarea
          value={deleteReason}
          onChange={(e) => setDeleteReason(e.target.value)}
          rows={4}
          maxLength={500}
          placeholder="Describe why you are deleting this…"
          autoFocus
        />
        <p
          className={
            ready
              ? "text-xs font-medium text-emerald-600"
              : "text-xs font-medium text-amber-600"
          }
        >
          {ready
            ? `${trimmed.length} characters · ready to delete`
            : `${remaining} character${remaining === 1 ? "" : "s"} remaining`}
        </p>
      </div>
    </ConfirmShell>
  );
}

function enqueue<T>(build: (resolve: (value: T) => void) => PendingRequest): Promise<T> {
  return new Promise((resolve) => {
    if (!dispatchRequest) {
      resolve(false as T);
      return;
    }
    dispatchRequest(build(resolve));
  });
}

export async function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  if (!dispatchRequest) {
    return window.confirm([options.title, options.text].filter(Boolean).join("\n\n"));
  }
  return enqueue((resolve) => ({ kind: "confirm", options, resolve }));
}

export function toastSuccess(title: string, text?: string) {
  toast.success(text ? `${title} — ${text}` : title);
}

export async function promptDeleteReason(options: DeleteReasonOptions): Promise<string | null> {
  if (!dispatchRequest) {
    const reason = window.prompt(`${options.title}\n\n${options.text ?? ""}`);
    if (!reason || reason.trim().length < MIN_DELETE_REASON) return null;
    return reason.trim();
  }
  return enqueue((resolve) => ({ kind: "delete", options, resolve }));
}
