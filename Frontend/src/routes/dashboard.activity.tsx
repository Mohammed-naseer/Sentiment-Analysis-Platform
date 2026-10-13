import { createFileRoute } from "@tanstack/react-router";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { CheckCircle2, XCircle, Loader2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/dashboard/activity")({
  component: Page,
});

interface AuditLog {
  _id: string;
  action: "Approve" | "Reject";
  adminId: { name: string; email: string };
  targetUserId: { name: string; email: string };
  assignedRole?: string;
  rejectionReason?: string;
  ipAddress: string;
  createdAt: string;
}

function Page() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    api.get<{ data: { logs: AuditLog[] } }>("/api/admin/audit-logs")
      .then((res) => setLogs(res.data.logs))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAdmin]);

  return (
    <>
      <DashboardTopbar title="Audit Log" />
      <div className="p-6 max-w-[1400px] w-full mx-auto space-y-6">
        {/* Local activity feed */}
        <div className="p-6 rounded-xl bg-card ring-1 ring-border">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-semibold tracking-tight">Session Activity</h3>
              <p className="text-xs text-muted-foreground">Analyses, exports, and actions from your session.</p>
            </div>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Live</span>
          </div>
          <div className="mt-4">
            <ActivityFeed searchable />
          </div>
        </div>

        {/* Admin Audit Log (DB) */}
        {isAdmin && (
          <div className="p-6 rounded-xl bg-card ring-1 ring-border">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="size-5 text-brand" />
              <div>
                <h3 className="font-semibold tracking-tight">Admin Approval Audit Trail</h3>
                <p className="text-xs text-muted-foreground">All administrator approval and rejection actions stored in the database.</p>
              </div>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="size-5 animate-spin mr-2" /> Loading audit logs…
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No audit events recorded yet.</div>
            ) : (
              <div className="overflow-hidden rounded-lg ring-1 ring-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
                      <th className="text-left px-4 py-3">Action</th>
                      <th className="text-left px-4 py-3">User</th>
                      <th className="text-left px-4 py-3">By Admin</th>
                      <th className="text-left px-4 py-3">Role / Reason</th>
                      <th className="text-left px-4 py-3">IP</th>
                      <th className="text-left px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log._id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${
                            log.action === "Approve"
                              ? "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-900/20 dark:border-emerald-800"
                              : "text-red-600 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-900/20 dark:border-red-800"
                          }`}>
                            {log.action === "Approve" ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{log.targetUserId?.name}</p>
                          <p className="text-xs text-muted-foreground">{log.targetUserId?.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{log.adminId?.name}</p>
                          <p className="text-xs text-muted-foreground">{log.adminId?.email}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs max-w-[180px] truncate" title={log.assignedRole || log.rejectionReason}>
                          {log.action === "Approve" ? (log.assignedRole || "—") : (log.rejectionReason || "—")}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{log.ipAddress}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}