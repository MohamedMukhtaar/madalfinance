import { useEffect, useState } from "react";
import { ImagePlus, Save, Trash2, UploadCloud } from "lucide-react";
import {
  useOrganization,
  useRemoveOrganizationImage,
  useUpdateOrganization,
  useUpdateOrganizationColors,
  useUploadOrganizationImage,
} from "@/hooks/queries";
import { usePermission } from "@/hooks/usePermission";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/FormField"; // Field used for color pickers
import { Skeleton } from "@/components/ui/Skeleton";
import { financeService } from "@/services/finance";
import { cn } from "@/utils/cn";
import type { Organization } from "@/types";

type ImageKind = "light" | "dark" | "icon" | "signature";

const IMAGE_FIELDS: Array<{ kind: ImageKind; label: string; key: keyof Organization }> = [
  { kind: "light", label: "Light Logo", key: "logoUrl" },
  { kind: "dark", label: "Dark Logo", key: "logoDarkUrl" },
  { kind: "icon", label: "Icon / Favicon", key: "iconUrl" },
  { kind: "signature", label: "Signature", key: "signatureUrl" },
];

function useLogoPreview(filename?: string | null) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!filename) {
      setSrc(null);
      return;
    }
    let active = true;
    let objectUrl: string | null = null;
    financeService
      .fetchFileBlob("logos", filename, { inline: true })
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (active) setSrc(null);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [filename]);
  return src;
}

function BrandImageSlot({
  label,
  filename,
  canEdit,
  onUpload,
  onRemove,
  uploading,
}: {
  label: string;
  filename?: string | null;
  canEdit: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
  uploading?: boolean;
}) {
  const preview = useLogoPreview(filename);
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-ink-soft">{label}</p>
      <label
        className={cn(
          "relative flex h-36 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-none border border-dashed border-line bg-muted/40 transition hover:border-[var(--brand-primary)] hover:bg-muted/70",
          !canEdit && "pointer-events-none opacity-70"
        )}
      >
        {preview ? (
          <img src={preview} alt={label} className="max-h-full max-w-full object-contain p-3" />
        ) : (
          <>
            <UploadCloud className="mb-2 h-7 w-7 text-ink-muted" />
            <span className="text-xs font-medium text-ink-muted">Upload</span>
          </>
        )}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          disabled={!canEdit || uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = "";
          }}
        />
      </label>
      {filename && canEdit && (
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:underline"
        >
          <Trash2 className="h-3 w-3" /> Remove
        </button>
      )}
    </div>
  );
}

export default function OrganizationSettingsPage() {
  const { hasPermission } = usePermission();
  const canEdit = hasPermission("edit organizations");
  const { data: org, isLoading } = useOrganization();
  const updateOrg = useUpdateOrganization();
  const updateColors = useUpdateOrganizationColors();
  const uploadImage = useUploadOrganizationImage();
  const removeImage = useRemoveOrganizationImage();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    foundedDate: "",
    websiteUrl: "",
    country: "",
    facebookUrl: "",
    tiktokUrl: "",
    instagramUrl: "",
    city: "",
    address: "",
    postalCode: "",
  });
  const [colors, setColors] = useState({
    primaryColor: "#101848",
    secondaryColor: "#74BCF8",
    sidebarBg: "#101848",
    sidebarText: "#C7CEDB",
    sidebarActiveBg: "#1A255C",
    sidebarActiveText: "#FFFFFF",
  });

  useEffect(() => {
    if (!org) return;
    setForm({
      name: org.name ?? "",
      phone: org.phone ?? "",
      email: org.email ?? "",
      foundedDate: org.foundedDate ? String(org.foundedDate).slice(0, 10) : "",
      websiteUrl: org.websiteUrl ?? "",
      country: org.country ?? "",
      facebookUrl: org.facebookUrl ?? "",
      tiktokUrl: org.tiktokUrl ?? "",
      instagramUrl: org.instagramUrl ?? "",
      city: org.city ?? "",
      address: org.address ?? "",
      postalCode: org.postalCode ?? "",
    });
    setColors({
      primaryColor: org.primaryColor || "#101848",
      secondaryColor: org.secondaryColor || "#74BCF8",
      sidebarBg: org.sidebarBg || org.primaryColor || "#101848",
      sidebarText: org.sidebarText || "#C7CEDB",
      sidebarActiveBg: org.sidebarActiveBg || "#1A255C",
      sidebarActiveText: org.sidebarActiveText || "#FFFFFF",
    });
  }, [org]);

  // Apply brand colors live while editing / after load
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", colors.primaryColor);
    root.style.setProperty("--brand-secondary", colors.secondaryColor);
    root.style.setProperty("--brand-sidebar", colors.sidebarBg);
    root.style.setProperty("--brand-sidebar-ink", colors.sidebarText);
    root.style.setProperty("--brand-sidebar-bg", colors.sidebarActiveBg);
    root.style.setProperty("--brand-sidebar-text", colors.sidebarActiveText);
    root.style.setProperty("--color-active", colors.primaryColor);
    root.style.setProperty("--color-accent", colors.secondaryColor);
  }, [colors]);

  if (isLoading || !org) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-none" />
        <Skeleton className="h-64 w-full rounded-none" />
      </div>
    );
  }

  const patch = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Organization Profile"
          subtitle="Logos and identity assets used across invoices, receipts, and the app shell."
        />
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {IMAGE_FIELDS.map(({ kind, label, key }) => (
              <BrandImageSlot
                key={kind}
                label={label}
                filename={org[key] as string | null | undefined}
                canEdit={canEdit}
                uploading={uploadImage.isPending}
                onUpload={(file) => uploadImage.mutate({ kind, file })}
                onRemove={() => removeImage.mutate(kind)}
              />
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="General information" subtitle="Contact and location details." />
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input
              label="Organization Name"
              required
              value={form.name}
              disabled={!canEdit}
              onChange={(e) => patch("name", e.target.value)}
            />
            <Input label="Phone" value={form.phone} disabled={!canEdit} onChange={(e) => patch("phone", e.target.value)} />
            <Input
              label="Email"
              type="email"
              value={form.email}
              disabled={!canEdit}
              onChange={(e) => patch("email", e.target.value)}
            />
            <Input
              label="Founded Date"
              type="date"
              value={form.foundedDate}
              disabled={!canEdit}
              onChange={(e) => patch("foundedDate", e.target.value)}
            />
            <Input
              label="Website"
              value={form.websiteUrl}
              disabled={!canEdit}
              onChange={(e) => patch("websiteUrl", e.target.value)}
            />
            <Input
              label="Country"
              value={form.country}
              disabled={!canEdit}
              onChange={(e) => patch("country", e.target.value)}
            />
            <Input
              label="Facebook URL"
              value={form.facebookUrl}
              disabled={!canEdit}
              onChange={(e) => patch("facebookUrl", e.target.value)}
            />
            <Input
              label="TikTok URL"
              value={form.tiktokUrl}
              disabled={!canEdit}
              onChange={(e) => patch("tiktokUrl", e.target.value)}
            />
            <Input
              label="Instagram URL"
              value={form.instagramUrl}
              disabled={!canEdit}
              onChange={(e) => patch("instagramUrl", e.target.value)}
            />
            <Input label="City" value={form.city} disabled={!canEdit} onChange={(e) => patch("city", e.target.value)} />
            <Input
              label="Address"
              value={form.address}
              disabled={!canEdit}
              onChange={(e) => patch("address", e.target.value)}
            />
            <Input
              label="Postal Code"
              value={form.postalCode}
              disabled={!canEdit}
              onChange={(e) => patch("postalCode", e.target.value)}
            />
          </div>

          {canEdit && (
            <div className="mt-6 flex justify-end">
              <Button
                leftIcon={<Save className="h-4 w-4" />}
                loading={updateOrg.isPending}
                onClick={() =>
                  updateOrg.mutate({
                    name: form.name.trim(),
                    phone: form.phone.trim() || null,
                    email: form.email.trim() || null,
                    foundedDate: form.foundedDate || null,
                    websiteUrl: form.websiteUrl.trim() || null,
                    country: form.country.trim() || null,
                    facebookUrl: form.facebookUrl.trim() || null,
                    tiktokUrl: form.tiktokUrl.trim() || null,
                    instagramUrl: form.instagramUrl.trim() || null,
                    city: form.city.trim() || null,
                    address: form.address.trim() || null,
                    postalCode: form.postalCode.trim() || null,
                  })
                }
              >
                Save Changes
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Brand colors"
          subtitle="Primary drives buttons, checks, and accents. Sidebar colors style the navigation shell."
        />
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ["primaryColor", "Primary (buttons / checks)"],
                ["secondaryColor", "Secondary accent"],
                ["sidebarBg", "Sidebar background"],
                ["sidebarText", "Sidebar text"],
                ["sidebarActiveBg", "Sidebar active background"],
                ["sidebarActiveText", "Sidebar active text"],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={label}>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    disabled={!canEdit}
                    value={colors[key]}
                    onChange={(e) => setColors((c) => ({ ...c, [key]: e.target.value.toUpperCase() }))}
                    className="h-10 w-12 cursor-pointer rounded-lg border border-line bg-panel p-1"
                  />
                  <Input
                    value={colors[key]}
                    disabled={!canEdit}
                    onChange={(e) => setColors((c) => ({ ...c, [key]: e.target.value }))}
                    className="font-mono uppercase"
                  />
                </div>
              </Field>
            ))}
          </div>
          {canEdit && (
            <div className="mt-6 flex justify-end">
              <Button
                leftIcon={<ImagePlus className="h-4 w-4" />}
                loading={updateColors.isPending}
                onClick={() => updateColors.mutate(colors)}
              >
                Save colors
              </Button>
            </div>
          )}
          <p className="mt-4 text-xs text-ink-muted">
            Currency, invoice prefixes, and member dues live under{" "}
            <span className="font-semibold text-ink-soft">Finance defaults</span>.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
