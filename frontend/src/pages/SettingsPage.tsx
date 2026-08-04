import { useEffect, useState } from "react";
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Hash,
  User,
  Save,
  RotateCcw,
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
import type { AppSettings } from "@/types";
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

export default function SettingsPage() {
  const { settings, isLoading, updateSettings } = useSettings();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
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
      await updateSettings(form);
      setDirty(false);
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
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

  if (isLoading || !settings) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" subtitle="Company profile and preferences" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-3">
            <Card><CardBody><Skeleton className="h-72 w-full" /></CardBody></Card>
          </div>
          <div className="space-y-4 lg:col-span-2">
            <Card><CardBody><Skeleton className="h-40 w-full" /></CardBody></Card>
            <Card><CardBody><Skeleton className="h-40 w-full" /></CardBody></Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Company profile, preferences and billing rules."
        actions={
          <>
            <Button variant="secondary" onClick={reset} disabled={!dirty} leftIcon={<RotateCcw className="h-4 w-4" />}>
              Discard
            </Button>
            <Button onClick={save} disabled={!dirty || saving} loading={saving} leftIcon={<Save className="h-4 w-4" />}>
              Save Changes
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Left: company */}
        <div className="space-y-4 lg:col-span-3">
          <Card>
            <CardHeader
              title="Company Profile"
              subtitle="This information appears on invoices, receipts and reports."
            />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Company name">
                  <Input
                    value={form.companyName}
                    onChange={(e) => patch("companyName", e.target.value)}
                    icon={<Building2 className="h-4 w-4" />}
                    placeholder="Company name"
                  />
                </Field>
                <Field label="Phone">
                  <Input
                    value={form.companyPhone}
                    onChange={(e) => patch("companyPhone", e.target.value)}
                    icon={<Phone className="h-4 w-4" />}
                    placeholder="+252 ..."
                  />
                </Field>
              </div>
              <Field label="Email">
                <Input
                  value={form.companyEmail}
                  onChange={(e) => patch("companyEmail", e.target.value)}
                  icon={<Mail className="h-4 w-4" />}
                  placeholder="info@company.com"
                />
              </Field>
              <Field label="Address">
                <Input
                  value={form.companyAddress}
                  onChange={(e) => patch("companyAddress", e.target.value)}
                  icon={<MapPin className="h-4 w-4" />}
                  placeholder="Street, District, City"
                />
              </Field>
              <Field label="Logo" hint="PNG or JPG, square preferred. Displayed on the sidebar and invoices.">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                    <Logo compact />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => toast("Logo upload coming with the backend")}>
                      Upload logo
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toast("Logo removed (placeholder)")}>
                      Remove
                    </Button>
                  </div>
                </div>
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Billing & Documents"
              subtitle="Prefixes and defaults used when generating documents."
            />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Currency symbol">
                  <Select
                    value={form.currency}
                    onChange={(e) => patch("currency", e.target.value)}
                    options={[
                      { value: "$", label: "$" },
                      { value: "€", label: "€" },
                      { value: "£", label: "£" },
                      { value: "Sh", label: "Sh" },
                      { value: "R", label: "R" },
                      { value: "Ksh", label: "Ksh" },
                    ]}
                  />
                </Field>
                <Field label="Invoice prefix">
                  <Input
                    value={form.invoicePrefix}
                    onChange={(e) => patch("invoicePrefix", e.target.value)}
                    icon={<Hash className="h-4 w-4" />}
                    placeholder="INV-"
                  />
                </Field>
                <Field label="Payment prefix">
                  <Input
                    value={form.paymentPrefix}
                    onChange={(e) => patch("paymentPrefix", e.target.value)}
                    icon={<Hash className="h-4 w-4" />}
                    placeholder="PAY-"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Contract prefix">
                  <Input
                    value={form.contractPrefix}
                    onChange={(e) => patch("contractPrefix", e.target.value)}
                    icon={<Hash className="h-4 w-4" />}
                    placeholder="CTR-"
                  />
                </Field>
                <Field label="Default member due" hint="Amount charged to each member per month">
                  <Input
                    type="number"
                    min={0}
                    value={form.defaultMemberDue}
                    onChange={(e) => patch("defaultMemberDue", Number(e.target.value))}
                    icon={<User className="h-4 w-4" />}
                  />
                </Field>
                <Field label="Timezone">
                  <Select
                    value={form.timezone}
                    onChange={(e) => patch("timezone", e.target.value)}
                    options={[
                      { value: "Africa/Mogadishu", label: "Africa/Mogadishu (UTC+3)" },
                      { value: "Africa/Nairobi", label: "Africa/Nairobi (UTC+3)" },
                      { value: "Europe/London", label: "Europe/London (UTC±0)" },
                      { value: "UTC", label: "UTC" },
                    ]}
                  />
                </Field>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right: preferences + security */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Appearance" subtitle="Theme preference for this device." />
            <CardBody className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "light", label: "Light" },
                  { key: "dark", label: "Dark" },
                  { key: "system", label: "System" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => {
                      if (opt.key === "system") {
                        setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
                      } else {
                        setTheme(opt.key as "light" | "dark");
                      }
                      setDirty(true);
                    }}
                    className={[
                      "rounded-xl border-2 px-3 py-3 text-sm font-semibold transition-all",
                      theme === opt.key
                        ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                        : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600",
                    ].join(" ")}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200 dark:bg-slate-800/60 dark:ring-slate-700">
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Reduced motion</p>
                  <p className="text-xs text-slate-400">Minimize animations across the app</p>
                </div>
                <Switch checked={false} onChange={() => toast("Not available in this build")} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Security" subtitle="Your signed-in account." />
            <CardBody className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200 dark:bg-slate-800/60 dark:ring-slate-700">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{user?.fullName ?? "Administrator"}</p>
                  <p className="truncate text-xs text-slate-400">{user?.role ?? "Admin"} · {user?.username ?? "admin"}</p>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Change your username or password from the profile menu in the top-right corner.
              </p>
            </CardBody>
          </Card>

          <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-5 dark:border-brand-500/30 dark:bg-brand-500/5">
            <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">About Madal ICT Solutions</p>
            <p className="mt-1 text-xs leading-relaxed text-brand-600/80 dark:text-brand-400/70">
              FinanceHub by Madal ICT Solutions — a complete finance management platform for billing, rentals,
              contributions and reporting. Backend API integration is on the way.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
