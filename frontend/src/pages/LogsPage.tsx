import { useOutletContext } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import AuditLogsPage from "@/pages/AuditLogsPage";

/** Settings → Logs shows the audit trail only. Trash is its own sidebar item. */
export default function LogsPage() {
  const outlet = useOutletContext<{ embedded?: boolean } | null>();
  const embedded = Boolean(outlet?.embedded);

  return (
    <div className="space-y-6">
      {!embedded && (
        <PageHeader title="Logs" subtitle="Audit trail of system actions." />
      )}
      <AuditLogsPage />
    </div>
  );
}
