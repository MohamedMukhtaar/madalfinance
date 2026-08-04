import Swal from "sweetalert2";

export interface ConfirmOptions {
  title: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
  icon?: "warning" | "success" | "question" | "info";
}

export async function confirmDialog({
  title,
  text,
  confirmText = "Confirm",
  cancelText = "Cancel",
  icon = "question",
}: ConfirmOptions): Promise<boolean> {
  const isDark = document.documentElement.classList.contains("dark");

  const result = await Swal.fire({
    title,
    text,
    icon,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    showCancelButton: true,
    reverseButtons: true,
    background: isDark ? "#0f172a" : "#ffffff",
    color: isDark ? "#e2e8f0" : "#0f172a",
    iconColor: icon === "warning" ? "#f59e0b" : icon === "success" ? "#22c55e" : "#101848",
    confirmButtonColor: "#101848",
    cancelButtonColor: isDark ? "#334155" : "#e2e8f0",
    buttonsStyling: true,
    customClass: {
      popup: "rounded-2xl shadow-pop font-sans",
      title: "text-lg font-semibold",
      htmlContainer: "text-sm text-slate-500",
      confirmButton: "rounded-xl px-5 py-2 text-sm font-semibold",
      cancelButton: "rounded-xl px-5 py-2 text-sm font-semibold !text-slate-600 dark:!text-slate-300",
    },
    backdrop: "rgba(2, 6, 23, 0.45)",
    showClass: { popup: "swal2-popup-show-anim" },
    hideClass: { popup: "swal2-popup-hide-anim" },
  });

  return result.isConfirmed;
}

export async function toastSuccess(title: string, text?: string) {
  const isDark = document.documentElement.classList.contains("dark");
  return Swal.fire({
    title,
    text,
    icon: "success",
    timer: 2200,
    timerProgressBar: true,
    showConfirmButton: false,
    background: isDark ? "#0f172a" : "#ffffff",
    color: isDark ? "#e2e8f0" : "#0f172a",
    confirmButtonColor: "#22c55e",
    customClass: { popup: "rounded-2xl shadow-pop font-sans", title: "text-lg font-semibold" },
    backdrop: "rgba(2, 6, 23, 0.35)",
  });
}

const MIN_DELETE_REASON = 25;

export interface DeleteReasonOptions {
  title: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
}

function syncDeleteReasonUi(popup: HTMLElement, min: number) {
  const input = popup.querySelector("textarea.swal2-textarea") as HTMLTextAreaElement | null;
  const confirmBtn = Swal.getConfirmButton();
  const counter = popup.querySelector("[data-reason-counter]") as HTMLElement | null;
  if (!input || !confirmBtn || !counter) return;

  const len = String(input.value ?? "").trim().length;
  const remaining = Math.max(0, min - len);
  const ready = remaining === 0;

  if (ready) {
    counter.textContent = `${len} characters · ready to delete`;
    counter.className =
      "mt-2 text-center text-xs font-medium text-emerald-600 dark:text-emerald-400";
  } else {
    counter.textContent = `${remaining} character${remaining === 1 ? "" : "s"} remaining`;
    counter.className = "mt-2 text-center text-xs font-medium text-amber-600 dark:text-amber-400";
  }

  confirmBtn.disabled = !ready;
  confirmBtn.setAttribute("aria-disabled", ready ? "false" : "true");
  confirmBtn.style.opacity = ready ? "1" : "0.45";
  confirmBtn.style.pointerEvents = ready ? "auto" : "none";
  confirmBtn.style.cursor = ready ? "pointer" : "not-allowed";
}

/** Prompt for a delete reason (min 25 chars). Returns the reason or null if cancelled. */
export async function promptDeleteReason({
  title,
  text = "Please explain why this record is being deleted. This cannot be undone without restoring from Trash.",
  confirmText = "Move to trash",
  cancelText = "Cancel",
}: DeleteReasonOptions): Promise<string | null> {
  const isDark = document.documentElement.classList.contains("dark");

  const result = await Swal.fire({
    title,
    html: `<p class="text-sm text-slate-500 mb-3">${text}</p>
      <p class="text-xs text-slate-400 mb-2 text-left">Reason (minimum ${MIN_DELETE_REASON} characters)</p>
      <p data-reason-counter class="mt-2 text-center text-xs font-medium text-amber-600">${MIN_DELETE_REASON} characters remaining</p>`,
    input: "textarea",
    inputPlaceholder: "Describe why you are deleting this…",
    inputAttributes: {
      "aria-label": "Delete reason",
      maxlength: "500",
    },
    preConfirm: (value) => {
      const trimmed = String(value ?? "").trim();
      if (trimmed.length < MIN_DELETE_REASON) {
        Swal.showValidationMessage(
          `${Math.max(0, MIN_DELETE_REASON - trimmed.length)} character(s) remaining`
        );
        return false;
      }
      return trimmed;
    },
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    showCancelButton: true,
    reverseButtons: true,
    focusConfirm: false,
    allowEnterKey: false,
    background: isDark ? "#0f172a" : "#ffffff",
    color: isDark ? "#e2e8f0" : "#0f172a",
    icon: "warning",
    iconColor: "#f59e0b",
    confirmButtonColor: "#101848",
    cancelButtonColor: isDark ? "#334155" : "#e2e8f0",
    buttonsStyling: true,
    customClass: {
      popup: "rounded-2xl shadow-pop font-sans",
      title: "text-lg font-semibold",
      htmlContainer: "text-sm text-slate-500",
      confirmButton: "rounded-xl px-5 py-2 text-sm font-semibold swal-delete-confirm",
      cancelButton: "rounded-xl px-5 py-2 text-sm font-semibold !text-slate-600 dark:!text-slate-300",
      input: "rounded-xl text-sm !mt-0",
    },
    backdrop: "rgba(2, 6, 23, 0.45)",
    showClass: { popup: "swal2-popup-show-anim" },
    hideClass: { popup: "swal2-popup-hide-anim" },
    didOpen: () => {
      const popup = Swal.getPopup();
      if (!popup) return;

      // Move counter under the textarea (SweetAlert renders input after html)
      const counter = popup.querySelector("[data-reason-counter]");
      const input = popup.querySelector("textarea.swal2-textarea") as HTMLTextAreaElement | null;
      if (counter && input?.parentElement) {
        input.parentElement.appendChild(counter);
      }

      syncDeleteReasonUi(popup, MIN_DELETE_REASON);
      input?.addEventListener("input", () => syncDeleteReasonUi(popup, MIN_DELETE_REASON));
      input?.focus();
    },
  });

  if (!result.isConfirmed) return null;
  return String(result.value ?? "").trim();
}
