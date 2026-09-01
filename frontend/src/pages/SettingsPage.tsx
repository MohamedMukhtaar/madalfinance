import { useEffect, useRef, useState } from "react";
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Hash,
  User,
  Save,
  RotateCcw,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { Logo } from "@/components/ui/Logo";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSettings } from "@/context/SettingsContext";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useRemoveCompanyLogo, useUploadCompanyLogo } from "@/hooks/queries";
import type { AppSettings } from "@/types";
import { cn } from "@/utils/cn";
import { getErrorMessage } from "@/services/api";
import toast from "react-hot-toast";

const DEFAULT_FORM: AppSettings = {
  companyName: "Madal ICT Solutions",
  companyPhone: "+252 61 555 0123",
  companyEmail: "info@madalsolutions.com",
  companyAddress: "Hodan District, Industrial Road, Mogadishu",
  currency: "$",
  invoicePrefix: "INV-",
  paymentPrefix: "PAY-",
  contractPrefix: "CTR-",
  defaultMemberDue: 10,
  timezone: "Africa/Mogadishu",
};

const compactInput = "h-9 text-sm";

export default function SettingsPage() {
  const { settings, isLoading, updateSettings } = useSettings();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const uploadLogo = useUploadCompanyLogo();
  const removeLogo = useRemoveCompanyLogo();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<AppSettings>(DEFAULT_FORM);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm(settings);
      setDirty(false);
    }
  }, [settings]);

  const patch = (key: keyof AppSettings, value: string | number | boolean) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateSettings({
        companyName: form.companyName,
        companyPhone: form.companyPhone || undefined,
        companyEmail: form.companyEmail || undefined,
        companyAddress: form.companyAddress || undefined,
        currency: form.currency,
        invoicePrefix: form.invoicePrefix,
        paymentPrefix: form.paymentPrefix,
        contractPrefix: form.contractPrefix,
        defaultMemberDue: form.defaultMemberDue,
        timezone: form.timezone,
      });
      setDirty(false);
      toast.success("Settings saved");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to save settings"));
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    if (settings) {
      setForm(settings);
      setDirty(false);
    }
  };

  const handleLogoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file (PNG, JPG, or WebP)");
      return;
    }
    await uploadLogo.mutateAsync({ file });
  };

  const handleLogoRemove = async () => {
    if (!settings?.logo) return;
    await removeLogo.mutateAsync();
  };

  if (isLoading || !settings) {
    return (
      <div className="space-y-4">
        <PageHeader title="Settings" subtitle="Company profile and preferences" />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    );
  }

  const logoBusy = uploadLogo.isPending || removeLogo.isPending;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Settings"
        subtitle="Company profile, billing rules and preferences."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={reset} disabled={!dirty} leftIcon={<RotateCcw className="h-3.5 w-3.5" />}>
              Discard
            </Button>
            <Button size="sm" onClick={save} disabled={!dirty || saving} loading={saving} leftIcon={<Save className="h-3.5 w-3.5" />}>
              Save
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card animated={false}>
          <CardHeader title="Company" subtitle="Shown on invoices and reports" className="px-4 pt-3.5 pb-0" />
          <CardBody className="p-4 pt-3">
            <div className="flex flex-row flex-wrap items-start gap-3">
              <div className="flex shrink-0 items-center gap-2.5 rounded-xl bg-slate-50 p-2 ring-1 ring-slate-200 dark:bg-slate-800/50 dark:ring-slate-700">
                <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                  <Logo compact />
                </div>
                <div className="flex flex-col gap-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleLogoPick}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    loading={uploadLogo.isPending}
                    disabled={logoBusy}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload
                  </Button>
                  <button
                    type="button"
                    className="text-left text-[11px] text-slate-400 hover:text-rose-500 disabled:opacity-40"
                    disabled={!settings.logo || logoBusy}
                    onClick={handleLogoRemove}
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="grid min-w-[200px] flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                <Field label="Company name">
                  <Input className={compactInput} value={form.companyName} onChange={(e) => patch("companyName", e.target.value)} icon={<Building2 className="h-3.5 w-3.5" />} />
                </Field>
                <Field label="Phone">
                  <Input className={compactInput} value={form.companyPhone} onChange={(e) => patch("companyPhone", e.target.value)} icon={<Phone className="h-3.5 w-3.5" />} />
                </Field>
                <Field label="Email">
                  <Input className={compactInput} value={form.companyEmail} onChange={(e) => patch("companyEmail", e.target.value)} icon={<Mail className="h-3.5 w-3.5" />} />
                </Field>
                <Field label="Address">
                  <Input className={compactInput} value={form.companyAddress} onChange={(e) => patch("companyAddress", e.target.value)} icon={<MapPin className="h-3.5 w-3.5" />} />
                </Field>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card animated={false}>
          <CardHeader title="Billing & Documents" subtitle="Prefixes and defaults" className="px-4 pt-3.5 pb-0" />
          <CardBody className="p-4 pt-3">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <Field label="Currency">
                <Select className={compactInput} value={form.currency} onChange={(e) => patch("currency", e.target.value)} options={["$", "€", "£", "Sh", "R", "Ksh"].map((v) => ({ value: v, label: v }))} />
              </Field>
              <Field label="Invoice">
                <Input className={compactInput} value={form.invoicePrefix} onChange={(e) => patch("invoicePrefix", e.target.value)} icon={<Hash className="h-3.5 w-3.5" />} />
              </Field>
              <Field label="Payment">
                <Input className={compactInput} value={form.paymentPrefix} onChange={(e) => patch("paymentPrefix", e.target.value)} icon={<Hash className="h-3.5 w-3.5" />} />
              </Field>
              <Field label="Contract">
                <Input className={compactInput} value={form.contractPrefix} onChange={(e) => patch("contractPrefix", e.target.value)} icon={<Hash className="h-3.5 w-3.5" />} />
              </Field>
              <Field label="Member due" hint="Per month">
                <Input className={compactInput} type="number" min={0} value={form.defaultMemberDue} onChange={(e) => patch("defaultMemberDue", Number(e.target.value))} icon={<User className="h-3.5 w-3.5" />} />
              </Field>
              <Field label="Timezone">
                <Select
                  className={compactInput}
                  value={form.timezone}
                  onChange={(e) => patch("timezone", e.target.value)}
                  options={[
                    { value: "Africa/Mogadishu", label: "Mogadishu" },
                    { value: "Africa/Nairobi", label: "Nairobi" },
                    { value: "Europe/London", label: "London" },
                    { value: "UTC", label: "UTC" },
                  ]}
                />
              </Field>
            </div>
          </CardBody>
        </Card>

        <Card animated={false}>
          <CardHeader title="Appearance" className="px-4 pt-3.5 pb-0" />
          <CardBody className="flex flex-col justify-center gap-3 p-4 pt-3">
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: "light", label: "Light", icon: Sun },
                { key: "dark", label: "Dark", icon: Moon },
                { key: "system", label: "System", icon: Monitor },
              ].map((opt) => {
                const Icon = opt.icon;
                const active = theme === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      if (opt.key === "system") {
                        setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
                      } else {
                        setTheme(opt.key as "light" | "dark");
                      }
                      setDirty(true);
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition",
                      active
                        ? "bg-brand-50 text-brand-700 ring-1 ring-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/30"
                        : "text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50 dark:text-slate-400 dark:ring-slate-700"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Reduced motion</span>
              <Switch checked={false} onChange={() => toast("Not available in this build")} />
            </div>
          </CardBody>
        </Card>

        <Card animated={false}>
          <CardHeader title="Account" className="px-4 pt-3.5 pb-0" />
          <CardBody className="flex flex-col justify-center p-4 pt-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                <User className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{user?.fullName ?? "Administrator"}</p>
                <p className="truncate text-[11px] text-slate-400">{user?.role ?? "Admin"} · {user?.username ?? "admin"}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="rounded-xl border border-brand-200/80 bg-brand-50/50 px-4 py-2.5 dark:border-brand-500/20 dark:bg-brand-500/5">
        <p className="text-xs font-semibold text-brand-700 dark:text-brand-300">FinanceHub · Madal ICT Solutions</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-brand-600/70 dark:text-brand-400/60">
          Billing, rentals, contributions and reporting — all in one place.
        </p>
      </div>
    </div>
  );
}
