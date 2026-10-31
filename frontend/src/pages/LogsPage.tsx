import { useLocation, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { ClipboardList, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui";
import AuditLogsPage from "@/pages/AuditLogsPage";
import TrashPage from "@/pages/TrashPage";

type Tab = "audit" | "trash";

export default function LogsPage() {
  const outlet = useOutletContext<{ embedded?: boolean } | null>();
  const embedded = Boolean(outlet?.embedded);
  const { tab: tabParam } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const tab: Tab =
    tabParam === "trash" || location.pathname.endsWith("/trash") ? "trash" : "audit";

  const go = (next: Tab) => {
    if (embedded) {
      navigate(next === "trash" ? "/settings/trash" : "/settings/logs");
      return;
    }
    navigate(next === "trash" ? "/logs/trash" : "/logs");
  };

  return (
    <div className="space-y-6">
      {!embedded && (
        <PageHeader
          title="Logs"
          subtitle="Audit trail of every change, plus records sitting in trash."
        />
      )}
      <Tabs
        tabs={[
          { label: "Audit", value: "audit", icon: <ClipboardList className="h-4 w-4" /> },
          { label: "Trash", value: "trash", icon: <Trash2 className="h-4 w-4" /> },
        ]}
        active={tab}
        onChange={(v) => go(v as Tab)}
      />
      {tab === "audit" ? <AuditLogsPage /> : <TrashPage />}
    </div>
  );
}
