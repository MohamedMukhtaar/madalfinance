import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, ImageOff, Pencil, Paperclip, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Badge,
  Avatar,
  DateRangeFilter,
  type DateFilterMode,
  Skeleton,
  EmptyState,
  ErrorState,
  FileUpload,
  type UploadedFile,
} from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { ProjectFormModal } from "@/features/projects/ProjectFormModal";
import {
  useCustomers,
  useProjects,
  useUploadProjectAttachment,
} from "@/hooks/queries";
import { useSettings } from "@/context/SettingsContext";
import { financeService } from "@/services/finance";
import { PROJECT_STATUS_STYLES } from "@/utils/constants";
import { formatCurrency, formatDate } from "@/utils/format";
import { matchesDateFilter } from "@/utils/dateFilter";
import { cn } from "@/utils/cn";
import type { Project } from "@/types";

export default function ProjectsPage() {
  const { data: projectsData, isLoading, error, refetch } = useProjects();
  const { data: customersData } = useCustomers();
  const projects = projectsData?.rows ?? [];
  const customers = customersData?.rows ?? [];
  const { currency } = useSettings();
  const uploadAttachment = useUploadProjectAttachment();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | undefined>();
  const [attachFor, setAttachFor] = useState<Project | undefined>();
  const [attachmentFiles, setAttachmentFiles] = useState<UploadedFile[]>([]);
  const [dateMode, setDateMode] = useState<DateFilterMode>("all");
  const [day, setDay] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [attachmentBlobUrl, setAttachmentBlobUrl] = useState<string | undefined>();
  const attachmentBlobUrlRef = useRef<string | undefined>();

  const attachmentFileName = attachFor?.attachmentFileName ?? "";
  const isPdfAttachment = attachmentFileName.toLowerCase().endsWith(".pdf");
  const isImageAttachment = /\.(png|jpe?g|webp)$/i.test(attachmentFileName);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!attachFor?.attachmentPath) {
        if (attachmentBlobUrlRef.current) URL.revokeObjectURL(attachmentBlobUrlRef.current);
        attachmentBlobUrlRef.current = undefined;
        setAttachmentBlobUrl(undefined);
        return;
      }

      try {
        const blob = await financeService.fetchFileBlob("projects", attachFor.attachmentPath, { inline: true });
        if (cancelled) return;

        const url = URL.createObjectURL(blob);
        if (attachmentBlobUrlRef.current) URL.revokeObjectURL(attachmentBlobUrlRef.current);
        attachmentBlobUrlRef.current = url;
        setAttachmentBlobUrl(url);
      } catch {
        // Preview is optional; user can still download from the backend if needed.
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [attachFor?.attachmentPath]);

  useEffect(() => {
    return () => {
      if (attachmentBlobUrlRef.current) URL.revokeObjectURL(attachmentBlobUrlRef.current);
    };
  }, []);

  const filtered = useMemo(
    () =>
      projects.filter((p) =>
        matchesDateFilter(p.startDate ?? p.createdAt, { mode: dateMode, date: day, from, to })
      ),
    [projects, dateMode, day, from, to]
  );

  const customerName = (id: number) => customers.find((c) => c.customerId === id)?.customerName ?? "Unknown";

  if (error) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        subtitle="Register one-time and rental projects for each customer. Charges and payments are managed from Project Charges and Invoices."
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
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,280px))] justify-center gap-4">
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
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,280px))] justify-center gap-4">
          {filtered.map((p, i) => {
            const isRental = String(p.projectType).toLowerCase() === "rental";
            const hasAttachment = Boolean(p.attachmentPath);
            const statusStyle = PROJECT_STATUS_STYLES[p.status] ?? PROJECT_STATUS_STYLES.Pending;

            return (
              <motion.div
                key={p.projectId}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.4) }}
              >
                <Card hover className="flex h-full w-full max-w-[280px] flex-col overflow-hidden p-0">
                  {isRental ? (
                    <div className="relative h-28 w-full bg-slate-100 dark:bg-slate-800">
                      {p.logoPath ? (
                        <ProjectLogo logoPath={p.logoPath} projectName={p.projectName} />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                          <ImageOff className="h-8 w-8" />
                          <span className="text-xs font-medium">No image</span>
                        </div>
                      )}
                    </div>
                  ) : null}

                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{p.projectName}</p>
                        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-400">
                          <Avatar name={customerName(p.customerId)} size="xs" /> {customerName(p.customerId)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className="bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/30">
                          {p.projectType}
                        </Badge>
                        <Badge className={statusStyle.badge} dot>
                          {p.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-1.5">
                      <div className="rounded-lg bg-slate-50 px-2 py-2 dark:bg-slate-800/50">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          {isRental ? "Monthly" : "Price"}
                        </p>
                        <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
                          {formatCurrency(p.projectPrice, currency)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-emerald-50/70 px-2 py-2 dark:bg-emerald-500/10">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600/70 dark:text-emerald-400/70">
                          Paid
                        </p>
                        <p className="mt-0.5 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(p.projectPrice - p.outstanding, currency)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-2 py-2 dark:bg-slate-800/50">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Balance</p>
                        <p className="mt-0.5 text-sm font-bold text-rose-600 dark:text-rose-400">
                          {formatCurrency(p.outstanding, currency)}
                        </p>
                      </div>
                    </div>

                    {p.startDate && (
                      <div className="mt-3 flex items-center gap-1 text-xs text-slate-400">
                        <CalendarDays className="h-3.5 w-3.5" />
                        <span>Started {formatDate(p.startDate)}</span>
                      </div>
                    )}

                    <div className="mt-4 grid grid-cols-2 gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
                      <CardAction
                        label="Edit"
                        icon={<Pencil className="h-3.5 w-3.5" />}
                        onClick={() => {
                          setEditing(p);
                          setFormOpen(true);
                        }}
                      />
                      <CardAction
                        label={hasAttachment ? "View" : "Attach"}
                        icon={<Paperclip className="h-3.5 w-3.5" />}
                        disabled={false}
                        onClick={() => {
                          setAttachmentFiles([]);
                          setAttachFor(p);
                        }}
                      />
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal
        open={!!attachFor}
        onClose={() => {
          setAttachFor(undefined);
          setAttachmentFiles([]);
        }}
        size="md"
        title="Project attachment"
        subtitle={attachFor?.projectName}
      >
        {attachFor?.attachmentPath ? (
          <div className="space-y-3">
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              Attachment uploaded — project is marked <span className="font-semibold">Completed</span>.
            </p>

            {isPdfAttachment && attachmentBlobUrl && (
              <div className="rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                <iframe
                  src={attachmentBlobUrl}
                  title="Project attachment preview"
                  className="h-96 w-full rounded-lg"
                />
              </div>
            )}

            {isImageAttachment && attachmentBlobUrl && (
              <img
                src={attachmentBlobUrl}
                alt={attachmentFileName || "Project attachment"}
                className="max-h-96 w-full rounded-xl border border-slate-200 object-contain dark:border-slate-700"
              />
            )}

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={attachmentBlobUrl}
                download={attachmentFileName}
                className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200 dark:bg-slate-800/50 dark:ring-slate-700"
              >
                <Paperclip className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Download</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Upload the signed agreement or delivery file. Once attached, the project status becomes{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">Completed</span> and this button
              is disabled.
            </p>
            <FileUpload
              label="Upload attachment (PDF or image)"
              value={attachmentFiles}
              onChange={setAttachmentFiles}
              onUpload={async (file, onProgress) => {
                if (!attachFor) throw new Error("No project selected");
                const updated = await uploadAttachment.mutateAsync({
                  id: attachFor.projectId,
                  file,
                  onProgress,
                });
                setAttachFor(undefined);
                setAttachmentFiles([]);
                return {
                  name: updated.attachmentFileName || file.name,
                  url: updated.attachmentPath
                    ? financeService.projectAttachmentUrl(updated.projectId, updated.attachmentPath)
                    : undefined,
                };
              }}
            />
          </div>
        )}
      </Modal>

      <ProjectFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(undefined);
          refetch();
        }}
        project={editing}
        customers={customers}
      />
    </div>
  );
}

function ProjectLogo({ logoPath, projectName }: { logoPath: string; projectName: string }) {
  const [src, setSrc] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | undefined;

    const run = async () => {
      try {
        const blob = await financeService.fetchFileBlob("projects", logoPath, { inline: true });
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch {
        // If preview fails, keep placeholder.
      }
    };

    run();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [logoPath]);

  if (!src) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
        <ImageOff className="h-8 w-8" />
        <span className="text-xs font-medium">No image</span>
      </div>
    );
  }

  return <img src={src} alt={projectName} className="h-full w-full object-cover" />;
}

function CardAction({
  label,
  onClick,
  disabled,
  icon,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold transition",
        disabled
          ? "cursor-not-allowed bg-slate-50 text-slate-300 dark:bg-slate-800/50 dark:text-slate-600"
          : "bg-slate-100/80 text-slate-600 hover:bg-brand-50 hover:text-brand-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
