import type { Invoice, InvoiceItem } from "@/types";

export type InvoiceKindId = "setup" | "rent" | "other";

const SETUP_RE = /setup\s*\/?\s*installation/i;
const RENT_RE = /monthly\s+rental/i;
const PERIOD_RE = /\(([^)]+)\)\s*$/;

export function invoiceKindFromText(text?: string | null): InvoiceKindId {
  const t = text ?? "";
  if (SETUP_RE.test(t)) return "setup";
  if (RENT_RE.test(t)) return "rent";
  return "other";
}

function firstLine(invoice: {
  items?: InvoiceItem[];
  firstItemDescription?: string | null;
}): string {
  return invoice.items?.[0]?.description ?? invoice.firstItemDescription ?? "";
}

function projectFromLine(text: string): string {
  const em = text.split("—")[1] ?? text.split("–")[1];
  if (!em) return "";
  return em.replace(PERIOD_RE, "").trim();
}

export function describeInvoice(invoice: Pick<Invoice, "status" | "balance" | "projectName"> & {
  items?: InvoiceItem[];
  firstItemDescription?: string | null;
}) {
  const line = firstLine(invoice);
  const kind = invoiceKindFromText(line);
  const project =
    invoice.projectName?.trim() || projectFromLine(line) || "";
  const period = line.match(PERIOD_RE)?.[1]?.trim() ?? "";
  const unpaid = Number(invoice.balance) > 0;

  const kindLabel =
    kind === "setup" ? "Rental setup" : kind === "rent" ? "Monthly rent" : "Invoice";

  const kindHint =
    kind === "setup"
      ? project
        ? `One-time installation charge for ${project}. This is not monthly rent.`
        : "One-time installation charge to start the rental. This is not monthly rent."
      : kind === "rent"
        ? project
          ? `Rent for ${project}${period ? ` · ${period}` : ""}.`
          : period
            ? `Monthly rent for ${period}.`
            : "Monthly rental charge."
        : project
          ? `Charge linked to ${project}.`
          : "Customer invoice.";

  const statusHint = (() => {
    const s = invoice.status;
    if (s === "Cancelled") return "Void — this charge was cancelled.";
    if (s === "Draft") return "Draft — not billed yet.";
    if (s === "Paid" || !unpaid) return "Collected in full.";
    if (s === "Overdue") return "Past due — still outstanding.";
    if (s === "Partial") return "Partly collected.";
    return "Billed — waiting for payment.";
  })();

  const itemTitle =
    kind === "setup" ? "Setup / installation" : kind === "rent" ? "Monthly rent" : line || "Charge";

  const itemHint =
    kind === "setup"
      ? project
        ? `To start the ${project} rental`
        : "To start this rental"
      : kind === "rent"
        ? [project, period].filter(Boolean).join(" · ")
        : "";

  return { kind, kindLabel, kindHint, statusHint, project, period, itemTitle, itemHint, unpaid };
}

export function lineItemDisplay(description: string, projectName?: string | null) {
  const kind = invoiceKindFromText(description);
  if (kind === "setup") {
    return {
      title: "Setup / installation",
      hint: projectName ? `One-time fee to start ${projectName}` : "One-time fee to start the rental",
    };
  }
  if (kind === "rent") {
    const period = description.match(PERIOD_RE)?.[1]?.trim() ?? "";
    return {
      title: "Monthly rent",
      hint: [projectName, period].filter(Boolean).join(" · "),
    };
  }
  return { title: description, hint: "" };
}

export const INVOICE_KIND_STYLES: Record<InvoiceKindId, string> = {
  setup:
    "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30",
  rent: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30",
  other:
    "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/30",
};
