import { useLocation, useNavigate } from "react-router-dom";
import { Tabs } from "@/components/ui";

const TABS = [
  { label: "Employees", path: "/employees" },
  { label: "Departments", path: "/employees/departments" },
  { label: "Titles", path: "/employees/titles" },
  { label: "Branches", path: "/employees/branches" },
  { label: "Shifts", path: "/employees/shifts" },
  { label: "Salary Charges", path: "/employees/charges" },
  { label: "Salary Payments", path: "/employees/payments" },
];

export function HrTabs() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const active = TABS.some((t) => t.path === pathname) ? pathname : "/employees";
  return (
    <Tabs
      tabs={TABS.map((t) => ({ label: t.label, value: t.path }))}
      active={active}
      onChange={(value) => navigate(value)}
    />
  );
}
