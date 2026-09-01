import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Textarea } from "./FormField";

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
    const { title, text, confirmText = "Confirm", cancelText = "Cancel", icon } = request.options;
    const danger = icon === "warning";

    return (
      <Modal
        open
        onClose={() => {
          request.resolve(false);
          close();
        }}
        title={title}
        subtitle={text}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { request.resolve(false); close(); }}>
              {cancelText}
            </Button>
            <Button variant={danger ? "danger" : "primary"} onClick={() => { request.resolve(true); close(); }}>
              {confirmText}
            </Button>
          </>
        }
      >
        <span className="sr-only">Confirm dialog</span>
      </Modal>
    );
  }

  const { title, text, confirmText = "Move to trash", cancelText = "Cancel" } = request.options;
  const trimmed = deleteReason.trim();
  const remaining = Math.max(0, MIN_DELETE_REASON - trimmed.length);
  const ready = remaining === 0;

  return (
    <Modal
      open
      onClose={() => {
        request.resolve(null);
        close();
      }}
      title={title}
      subtitle={text ?? "Please explain why this record is being deleted. This cannot be undone without restoring from Trash."}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={() => { request.resolve(null); close(); }}>
            {cancelText}
          </Button>
          <Button variant="danger" disabled={!ready} onClick={() => { request.resolve(trimmed); close(); }}>
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <p className="text-xs text-slate-400">Reason (minimum {MIN_DELETE_REASON} characters)</p>
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
              ? "text-xs font-medium text-emerald-600 dark:text-emerald-400"
              : "text-xs font-medium text-amber-600 dark:text-amber-400"
          }
        >
          {ready
            ? `${trimmed.length} characters · ready to delete`
            : `${remaining} character${remaining === 1 ? "" : "s"} remaining`}
        </p>
      </div>
    </Modal>
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
