import type { ReactNode } from "react";
import {
  Banknote,
  Briefcase,
  Building2,
  Calendar,
  CircleDot,
  Hash,
  Mail,
  MapPin,
  Phone,
  StickyNote,
  User,
  type LucideIcon,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/utils/format";
import type { Employee } from "@/types";

function ProfileCard({
  title,
  icon: Icon,
  fields,
}: {
  title: string;
  icon: LucideIcon;
  fields: Array<{ label: string; value: ReactNode; icon: LucideIcon }>;
}) {
  return (
    <div className="stat-hover group flex h-full min-h-[16rem] flex-col rounded-2xl bg-card p-4 ring-1 ring-line transition-colors duration-200">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <span className="stat-hover-icon inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="grid flex-1 grid-cols-2 content-start gap-4">
        {fields.map((field) => {
          const FieldIcon = field.icon;
          return (
            <div key={field.label} className="min-w-0">
              <div className="mb-1 flex items-center gap-1.5">
                <FieldIcon className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-colors group-hover:!text-white/70" />
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 transition-colors group-hover:!text-white/70">
                  {field.label}
                </p>
              </div>
              <p className="truncate text-sm font-semibold text-ink transition-colors group-hover:!text-white">
                {field.value ?? "—"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function EmployeeReportCards({ employee, currency }: { employee: Employee; currency: string }) {
  return (
    <div className="grid auto-rows-fr grid-cols-1 gap-3 lg:grid-cols-3">
      <ProfileCard
        title="Profile"
        icon={User}
        fields={[
          { label: "Name", icon: User, value: employee.fullName },
          { label: "Code", icon: Hash, value: employee.employeeCode },
          { label: "Phone", icon: Phone, value: employee.phone || "—" },
          { label: "Email", icon: Mail, value: employee.email || "—" },
        ]}
      />
      <ProfileCard
        title="Job"
        icon={Briefcase}
        fields={[
          { label: "Job title", icon: Briefcase, value: employee.jobTitle || "—" },
          { label: "Department", icon: Building2, value: employee.department || "—" },
          { label: "Branch", icon: MapPin, value: employee.branch || "—" },
          { label: "Shift", icon: Calendar, value: employee.shift || "—" },
        ]}
      />
      <ProfileCard
        title="Salary"
        icon={Banknote}
        fields={[
          { label: "Basic salary", icon: Banknote, value: formatCurrency(Number(employee.basicSalary), currency) },
          { label: "Hire date", icon: Calendar, value: formatDate(employee.hireDate) },
          { label: "Status", icon: CircleDot, value: employee.status },
          { label: "Notes", icon: StickyNote, value: employee.notes || "—" },
        ]}
      />
    </div>
  );
}
