import { useNavigate, useParams } from "react-router-dom";
import { ClipboardList, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui";
import AuditLogsPage from "@/pages/AuditLogsPage";
import TrashPage from "@/pages/TrashPage";

type Tab = "audit" | "trash";

export default function LogsPage() {
  const { tab: tabParam } = useParams();
  const navigate = useNavigate();
  const tab: Tab = tabParam === "trash" ? "trash" : "audit";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logs"
        subtitle="Audit trail of every change, plus records sitting in trash."
      />
      <Tabs
        tabs={[
          { label: "Audit", value: "audit", icon: <ClipboardList className="h-4 w-4" /> },
          { label: "Trash", value: "trash", icon: <Trash2 className="h-4 w-4" /> },
        ]}
        active={tab}
        onChange={(v) => navigate(v === "trash" ? "/logs/trash" : "/logs")}
      />
      {tab === "audit" ? <AuditLogsPage /> : <TrashPage />}
    </div>
  );
}
