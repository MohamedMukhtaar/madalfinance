import { useLocation, useNavigate } from "react-router-dom";
import { Tabs } from "@/components/ui";

const TABS = [
  { label: "Categories", path: "/expenses/categories" },
  { label: "Charges", path: "/expenses/charges" },
  { label: "Payments", path: "/expenses" },
];

export function ExpenseTabs() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const active = TABS.some((t) => t.path === pathname) ? pathname : "/expenses";
  return (
    <Tabs
      tabs={TABS.map((t) => ({ label: t.label, value: t.path }))}
      active={active}
      onChange={(value) => navigate(value)}
    />
  );
}
