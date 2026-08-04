import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { FileText, Image as ImageIcon, Trash2, UploadCloud } from "lucide-react";
import { cn } from "@/utils/cn";

export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  url: string;
  file?: File;
  attachmentId?: number;
}

export function FileUpload({
  value,
  onChange,
  accept = "application/pdf,image/png,image/jpeg,image/jpg",
  multiple = false,
  label = "Drag & drop a file here, or click to browse",
  className,
  onUpload,
}: {
  value: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  accept?: string;
  multiple?: boolean;
  label?: string;
  className?: string;
  onUpload?: (file: File, onProgress: (n: number) => void) => Promise<{
    name: string;
    url?: string;
    size?: number;
    type?: string;
    attachmentId?: number;
  }>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});

  const handleFiles = useCallback(
    async (list: FileList | null) => {
      if (!list) return;
      for (const file of Array.from(list)) {
        setProgress((p) => ({ ...p, [file.name]: 0 }));
        try {
          const uploaded = onUpload
            ? await onUpload(file, (percent) => setProgress((p) => ({ ...p, [file.name]: percent })))
            : undefined;
          onChange([
            ...value,
            {
              name: uploaded?.name ?? file.name,
              size: uploaded?.size ?? file.size,
              type: uploaded?.type ?? file.type,
              url: uploaded?.url ?? URL.createObjectURL(file),
              file,
              attachmentId: uploaded?.attachmentId,
            },
          ]);
          setProgress((p) => ({ ...p, [file.name]: 100 }));
        } catch {
          setProgress((p) => {
            const next = { ...p };
            delete next[file.name];
            return next;
          });
        }
      }
    },
    [onChange, onUpload, value]
  );

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const onSelect = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = "";
  };

  const remove = (name: string) => {
    const removed = value.find((f) => f.name === name);
    if (removed?.file && removed.url.startsWith("blob:")) URL.revokeObjectURL(removed.url);
    onChange(value.filter((f) => f.name !== name));
    setProgress((p) => {
      const next = { ...p };
      delete next[name];
      return next;
    });
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-all",
          dragging
            ? "border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-500/10"
            : "border-slate-300 bg-slate-50 hover:border-brand-400 hover:bg-brand-50/50 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-brand-500 dark:hover:bg-slate-800"
        )}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-brand-400 dark:ring-slate-700">
          <UploadCloud className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</p>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Images or PDF up to 10MB</p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={onSelect}
      />

      {value.map((file) => {
        const isImage = file.type.startsWith("image/");
        const prog = progress[file.name] ?? 100;
        return (
          <div
            key={file.name}
            className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200 dark:bg-slate-800/60 dark:ring-slate-700"
          >
            {isImage ? (
              <img
                src={file.url}
                alt={file.name}
                className="h-12 w-12 shrink-0 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-500 dark:bg-rose-500/10 dark:text-rose-400">
                <FileText className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{file.name}</p>
              <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
              {prog < 100 && (
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${prog}%` }} />
                </div>
              )}
            </div>
            {isImage && (
              <ImageIcon className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
            )}
            <button
              onClick={() => remove(file.name)}
              className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
              aria-label="Remove file"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
