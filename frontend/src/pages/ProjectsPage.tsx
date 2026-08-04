import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, FolderKanban, Paperclip, Plus, ScrollText } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Badge,
  Avatar,
  DateRangeFilter,
  type DateFilterMode,
  Tabs,
  Skeleton,
  EmptyState,
  ErrorState,
  FileUpload,
  type UploadedFile,
} from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { ProjectFormModal } from "@/features/projects/ProjectFormModal";
import { GenerateInvoiceModal } from "@/features/invoices/GenerateInvoiceModal";
import { RecordPaymentModal } from "@/features/payments/RecordPaymentModal";
import {
  useCustomers,
  useProjects,
  useInvoices,
  useContracts,
  useCreateContract,
  useUploadContractSigned,
} from "@/hooks/queries";
import { useSettings } from "@/context/SettingsContext";
import { financeService } from "@/services/finance";
import { PROJECT_STATUS_STYLES } from "@/utils/constants";
import { formatCurrency, formatDate, todayISO } from "@/utils/format";
import { matchesDateFilter } from "@/utils/dateFilter";
import { cn } from "@/utils/cn";
import type { Project } from "@/types";

export default function ProjectsPage() {
  const { data: projectsData, isLoading, error, refetch } = useProjects();
  const { data: customersData } = useCustomers();
  const { data: invoicesData } = useInvoices();
  const { data: contractsData } = useContracts();
  const projects = useMemo(() => {
    const rows = projectsData?.rows ?? [];
    // One-time projects page: exclude rental-type projects (shown under Rental Projects).
    return rows.filter((p) => !String(p.projectType || "").toLowerCase().includes("rental"));
  }, [projectsData]);
  const customers = customersData?.rows ?? [];
  const invoices = invoicesData?.rows ?? [];
  const contracts = contractsData?.rows ?? [];
  const { currency } = useSettings();

  const [tab, setTab] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | undefined>();
  const [detail, setDetail] = useState<Project | undefined>();
  const [invoiceFor, setInvoiceFor] = useState<Project | undefined>();
  const [paymentFor, setPaymentFor] = useState<Project | undefined>();
  const [contractFor, setContractFor] = useState<Project | undefined>();
  const [attachmentFiles, setAttachmentFiles] = useState<UploadedFile[]>([]);
  const [dateMode, setDateMode] = useState<DateFilterMode>("all");
  const [day, setDay] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const createContract = useCreateContract();
  const uploadSigned = useUploadContractSigned();

  const filtered = useMemo(
    () =>
      projects.filter((p) => {
        if (tab === "one-time" && p.projectType !== "One Time") return false;
        if (tab === "rental" && p.projectType !== "Rental") return false;
        return matchesDateFilter(p.startDate ?? p.createdAt, { mode: dateMode, date: day, from, to });
      }),
    [projects, tab, dateMode, day, from, to]
  );

  const counts = useMemo(
    () => ({
      all: projects.length,
      "one-time": projects.filter((p) => p.projectType === "One Time").length,
      rental: projects.filter((p) => p.projectType === "Rental").length,
    }),
    [projects]
  );

  const detailInvoices = useMemo(
    () => invoices.filter((i) => detail && i.projectId === detail.projectId),
    [invoices, detail]
  );
  const detailContract = useMemo(
    () => contracts.find((c) => detail && c.projectId === detail.projectId),
    [contracts, detail]
  );
  const activeContract = contractFor
    ? contracts.find((c) => c.projectId === contractFor.projectId)
    : undefined;

  const customerName = (id: number) => customers.find((c) => c.customerId === id)?.customerName ?? "Unknown";

  if (error) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        subtitle="Track one-time and rental projects for your clients."
        actions={
          <Button
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            New Project
          </Button>
        }
      />

      <Tabs
        tabs={[
          { label: "All Projects", value: "all", count: counts.all },
          { label: "One Time", value: "one-time", count: counts["one-time"] },
          { label: "Rental", value: "rental", count: counts.rental },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="flex flex-wrap items-center gap-2">
        <DateRangeFilter
          mode={dateMode}
          onModeChange={setDateMode}
          date={day}
          from={from}
          to={to}
          onDateChange={setDay}
          onFromChange={setFrom}
          onToChange={setTo}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            title="No projects found"
            description="Create a new project to get started."
            action={
              <Button onClick={() => setFormOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
                New Project
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p, i) => (
            <motion.div
              key={p.projectId}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.4) }}
            >
              <Card hover className="flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                      <FolderKanban className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{p.projectName}</p>
                      <p className="flex items-center gap-1 truncate text-xs text-slate-400">
                        <Avatar name={customerName(p.customerId)} size="xs" /> {customerName(p.customerId)}
                      </p>
                    </div>
                  </div>
                  <Badge className={PROJECT_STATUS_STYLES[p.status].badge} dot>
                    {p.status}
                  </Badge>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/50">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Amount</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(p.projectPrice, currency)}</p>
                  </div>
                  <div className="rounded-xl bg-emerald-50/70 px-3 py-2.5 dark:bg-emerald-500/10">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600/70 dark:text-emerald-400/70">Paid</p>
                    <p className="mt-0.5 text-sm font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(p.projectPrice - p.outstanding, currency)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/50">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Type</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-700 dark:text-slate-200">{p.projectType}</p>
                  </div>
                </div>


                <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" /> {formatDate(p.startDate)}
                  </span>
                  <span>→</span>
                  <span>{formatDate(p.expectedFinish ?? undefined)}</span>
                </div>

                <div className="mt-5 grid grid-cols-4 gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <CardAction label="View" onClick={() => setDetail(p)} />
                  <CardAction label="Invoice" onClick={() => setInvoiceFor(p)} />
                  <CardAction label="Payment" onClick={() => setPaymentFor(p)} />
                  <CardAction
                    label="Attach"
                    onClick={() => {
                      setAttachmentFiles([]);
                      setContractFor(p);
                    }}
                  />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Project detail modal */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(undefined)}
        size="lg"
        title={detail?.projectName}
        subtitle={detail ? `${detail.projectType} project · ${customerName(detail.customerId)}` : undefined}
      >
        {detail && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <DetailCell label="Amount" value={formatCurrency(detail.projectPrice, currency)} />
              <DetailCell label="Paid" value={formatCurrency(detail.projectPrice - detail.outstanding, currency)} accent="text-emerald-600 dark:text-emerald-400" />
              <DetailCell label="Balance" value={formatCurrency(detail.outstanding, currency)} accent="text-rose-600 dark:text-rose-400" />
              <DetailCell label="Status" value={detail.status} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <DetailCell label="Start Date" value={formatDate(detail.startDate)} />
              <DetailCell label="Expected Finish" value={formatDate(detail.expectedFinish ?? undefined)} />
            </div>
            {detail.description && (
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
                {detail.description}
              </p>
            )}
            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Invoices ({detailInvoices.length})</h4>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {detailInvoices.map((inv) => (
                  <div key={inv.invoiceId} className="flex items-center justify-between py-2 text-sm">
                    <span className="font-mono text-slate-600 dark:text-slate-300">{inv.invoiceNumber}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(inv.totalAmount, currency)}</span>
                  </div>
                ))}
                {detailInvoices.length === 0 && <p className="py-2 text-sm text-slate-400">No invoices yet.</p>}
              </div>
            </div>
            {detailContract && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Contract</h4>
                <p className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:bg-brand-500/10 dark:text-brand-200">
                  <span className="font-mono font-semibold">{detailContract.contractNumber}</span> · {formatCurrency(detailContract.contractAmount, currency)}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Contract / attachment modal */}
      <Modal
        open={!!contractFor}
        onClose={() => {
          setContractFor(undefined);
          setAttachmentFiles([]);
        }}
        size="md"
        title="Project Attachment"
        subtitle={contractFor?.projectName}
        footer={
          !activeContract ? (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setContractFor(undefined);
                  setAttachmentFiles([]);
                }}
              >
                Cancel
              </Button>
              <Button
                loading={createContract.isPending}
                onClick={() => {
                  if (!contractFor) return;
                  createContract.mutate(
                    {
                      customerId: contractFor.customerId,
                      projectId: contractFor.projectId,
                      contractDate: todayISO(),
                      startDate: contractFor.startDate,
                      endDate: contractFor.expectedFinish || undefined,
                      contractAmount: contractFor.projectPrice,
                      remarks: `Agreement for ${contractFor.projectName}`,
                      status: "active",
                    },
                    {
                      onSuccess: () => {
                        /* leave modal open so user can upload after create */
                      },
                    }
                  );
                }}
              >
                Create contract record
              </Button>
            </>
          ) : undefined
        }
      >
        {activeContract ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl bg-brand-50 p-4 dark:bg-brand-500/10">
              <ScrollText className="h-6 w-6 text-brand-600 dark:text-brand-400" />
              <div>
                <p className="font-mono text-sm font-bold text-brand-800 dark:text-brand-200">
                  {activeContract.contractNumber}
                </p>
                <p className="text-xs text-brand-600/70 dark:text-brand-300/70">
                  Signed {formatDate(activeContract.contractDate)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <DetailCell label="Contract Amount" value={formatCurrency(activeContract.contractAmount, currency)} />
              <DetailCell label="Status" value={activeContract.status} />
              <DetailCell label="Start Date" value={formatDate(activeContract.startDate ?? undefined)} />
              <DetailCell label="End Date" value={formatDate(activeContract.endDate ?? undefined)} />
            </div>
            {activeContract.remarks && (
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
                {activeContract.remarks}
              </p>
            )}

            {activeContract.signedFileName ? (
              <a
                href={financeService.contractFileUrl(activeContract.contractId)}
                className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200 transition hover:bg-white dark:bg-slate-800/50 dark:ring-slate-700"
                target="_blank"
                rel="noreferrer"
              >
                <Paperclip className="h-4 w-4 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {activeContract.signedFileName}
                  </p>
                  <p className="text-xs text-slate-400">Download signed agreement</p>
                </div>
              </a>
            ) : (
              <p className="text-xs text-slate-400">No file uploaded yet — add a PDF or image below.</p>
            )}

            <FileUpload
              label="Upload signed agreement / attachment"
              value={attachmentFiles}
              onChange={setAttachmentFiles}
              onUpload={async (file, onProgress) => {
                const updated = await uploadSigned.mutateAsync({
                  id: activeContract.contractId,
                  file,
                  onProgress,
                });
                return {
                  name: updated.signedFileName || file.name,
                  size: file.size,
                  type: file.type,
                  url: financeService.contractFileUrl(updated.contractId),
                };
              }}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <ScrollText className="h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No contract yet</p>
            <p className="max-w-sm text-sm text-slate-400">
              Create a contract record for this one-time project, then upload the signed agreement or supporting
              attachment.
            </p>
          </div>
        )}
      </Modal>

      {/* Modals */}
      <ProjectFormModal open={formOpen} onClose={() => setFormOpen(false)} project={editing} customers={customers} />
      <GenerateInvoiceModal
        open={!!invoiceFor}
        onClose={() => setInvoiceFor(undefined)}
        defaultCustomerId={invoiceFor?.customerId}
        defaultProjectId={invoiceFor?.projectId}
        customers={customers}
        projects={projects}
      />
      <RecordPaymentModal
        open={!!paymentFor}
        onClose={() => setPaymentFor(undefined)}
        defaultCustomerId={paymentFor?.customerId}
        defaultInvoiceId={undefined}
        customers={customers}
        invoices={invoices}
      />
    </div>
  );
}

function CardAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center gap-1 rounded-xl bg-slate-100/80 px-2 py-2 text-xs font-semibold text-slate-600 transition hover:bg-brand-50 hover:text-brand-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
    >
      {label}
    </button>
  );
}

function DetailCell({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3.5 py-3 dark:bg-slate-800/50">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={cn("mt-0.5 text-sm font-bold text-slate-900 dark:text-white", accent)}>{value}</p>
    </div>
  );
}
