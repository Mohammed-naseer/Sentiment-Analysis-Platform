import { createFileRoute } from "@tanstack/react-router";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Users, CheckCircle2, XCircle, Eye, Loader2, Clock, Shield,
  AlertTriangle, Search, RefreshCw, ChevronDown
} from "lucide-react";

export const Route = createFileRoute("/dashboard/approval")({
  component: Page,
});

type UserStatus = "Pending" | "Approved" | "Rejected";
type UserRole = "Admin" | "Analyst" | "Viewer" | "Reader" | "Pending";

interface PendingUser {
  _id: string;
  name: string;
  email: string;
  status: UserStatus;
  role: UserRole;
  approved: boolean;
  rejectionReason?: string;
  createdAt: string;
}

const ROLES: UserRole[] = ["Admin", "Analyst", "Viewer", "Reader"];

const statusColors: Record<UserStatus, string> = {
  Pending: "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-900/20 dark:border-amber-800",
  Approved: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-900/20 dark:border-emerald-800",
  Rejected: "text-red-600 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-900/20 dark:border-red-800",
};

function Page() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Approve modal state
  const [approveTarget, setApproveTarget] = useState<PendingUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>("Analyst");
  const [approving, setApproving] = useState(false);

  // Reject modal state
  const [rejectTarget, setRejectTarget] = useState<PendingUser | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // Detail modal state
  const [detailUser, setDetailUser] = useState<PendingUser | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: { users: PendingUser[] } }>("/api/admin/users");
      setUsers(res.data.users);
    } catch {
      toast.error("Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.status.toLowerCase().includes(q);
  });

  const handleApprove = async () => {
    if (!approveTarget) return;
    setApproving(true);
    try {
      await api.post(`/api/admin/users/${approveTarget._id}/approve`, { role: selectedRole });
      toast.success(`${approveTarget.name} approved as ${selectedRole}!`);
      setApproveTarget(null);
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve user.");
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) {
      toast.error("A rejection reason is required.");
      return;
    }
    setRejecting(true);
    try {
      await api.post(`/api/admin/users/${rejectTarget._id}/reject`, { reason: rejectReason });
      toast.success(`${rejectTarget.name}'s request rejected.`);
      setRejectTarget(null);
      setRejectReason("");
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject user.");
    } finally {
      setRejecting(false);
    }
  };

  const pendingCount = users.filter((u) => u.status === "Pending").length;
  const approvedCount = users.filter((u) => u.status === "Approved").length;
  const rejectedCount = users.filter((u) => u.status === "Rejected").length;

  return (
    <>
      <DashboardTopbar title="User Approval" />
      <div className="p-6 space-y-6 max-w-[1600px] w-full mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Pending Requests", count: pendingCount, icon: Clock, color: "text-amber-500" },
            { label: "Approved Users", count: approvedCount, icon: CheckCircle2, color: "text-emerald-500" },
            { label: "Rejected Requests", count: rejectedCount, icon: XCircle, color: "text-red-500" },
          ].map(({ label, count, icon: Icon, color }) => (
            <div key={label} className="p-4 rounded-xl bg-card ring-1 ring-border flex items-center gap-4">
              <div className={`size-10 rounded-lg bg-muted grid place-items-center ${color}`}>
                <Icon className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Header & search */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, status…"
              className="input-field pl-9"
            />
          </div>
          <button onClick={fetchUsers} className="flex items-center gap-2 px-3 py-2 rounded-lg ring-1 ring-border bg-background hover:bg-muted text-sm transition-colors">
            <RefreshCw className="size-4" /> Refresh
          </button>
        </div>

        {/* Table */}
        <div className="rounded-xl ring-1 ring-border overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-left px-5 py-3">Email</th>
                <th className="text-left px-5 py-3">Registered</th>
                <th className="text-left px-5 py-3">Role</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-muted-foreground">
                    <Loader2 className="size-6 animate-spin mx-auto mb-2" />
                    Loading users…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-muted-foreground">
                    <Users className="size-8 mx-auto mb-2 opacity-40" />
                    No users found.
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <motion.tr
                    key={user._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-5 py-3 font-medium">{user.name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-5 py-3 text-muted-foreground">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-1.5">
                        <Shield className="size-3.5 text-brand" />
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[user.status]}`}>
                        {user.status === "Pending" && <Clock className="size-3" />}
                        {user.status === "Approved" && <CheckCircle2 className="size-3" />}
                        {user.status === "Rejected" && <XCircle className="size-3" />}
                        {user.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setDetailUser(user)}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="View Details"
                        >
                          <Eye className="size-4" />
                        </button>
                        {user.status === "Pending" && (
                          <>
                            <button
                              onClick={() => { setApproveTarget(user); setSelectedRole("Analyst"); }}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium transition-colors"
                            >
                              <CheckCircle2 className="size-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => { setRejectTarget(user); setRejectReason(""); }}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition-colors"
                            >
                              <XCircle className="size-3.5" /> Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approve Modal */}
      <AnimatePresence>
        {approveTarget && (
          <Modal onClose={() => !approving && setApproveTarget(null)}>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 grid place-items-center">
                  <CheckCircle2 className="size-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-base">Approve User Request</h2>
                  <p className="text-xs text-muted-foreground">Select a role to assign</p>
                </div>
              </div>
              <div className="rounded-lg bg-muted/50 border border-border p-3 text-sm space-y-1">
                <p><span className="text-muted-foreground">Name:</span> <strong>{approveTarget.name}</strong></p>
                <p><span className="text-muted-foreground">Email:</span> {approveTarget.email}</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assign Role</label>
                <div className="relative">
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                    className="input-field appearance-none pr-8"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <ChevronDown className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedRole === "Admin" && "Full access: user management, approvals, reports, AI models."}
                  {selectedRole === "Analyst" && "Can run sentiment analyses, view dashboard, export reports."}
                  {selectedRole === "Viewer" && "Read-only access to dashboard and reports. Cannot analyze."}
                  {selectedRole === "Reader" && "Can read reports and view public analytics only."}
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setApproveTarget(null)} disabled={approving} className="flex-1 py-2 rounded-lg ring-1 ring-border text-sm hover:bg-muted transition-colors disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={handleApprove} disabled={approving} className="flex-1 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {approving ? <><Loader2 className="size-4 animate-spin" /> Approving…</> : <><CheckCircle2 className="size-4" /> Confirm Approval</>}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectTarget && (
          <Modal onClose={() => !rejecting && setRejectTarget(null)}>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-red-100 dark:bg-red-900/30 grid place-items-center">
                  <AlertTriangle className="size-5 text-red-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-base">Reject User Request</h2>
                  <p className="text-xs text-muted-foreground">Provide a reason for rejection</p>
                </div>
              </div>
              <div className="rounded-lg bg-muted/50 border border-border p-3 text-sm space-y-1">
                <p><span className="text-muted-foreground">Name:</span> <strong>{rejectTarget.name}</strong></p>
                <p><span className="text-muted-foreground">Email:</span> {rejectTarget.email}</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rejection Reason <span className="text-red-500">*</span></label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. Incomplete information, unauthorized domain, duplicate account…"
                  className="input-field resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setRejectTarget(null)} disabled={rejecting} className="flex-1 py-2 rounded-lg ring-1 ring-border text-sm hover:bg-muted transition-colors disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={handleReject} disabled={rejecting || !rejectReason.trim()} className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {rejecting ? <><Loader2 className="size-4 animate-spin" /> Rejecting…</> : <><XCircle className="size-4" /> Confirm Rejection</>}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {detailUser && (
          <Modal onClose={() => setDetailUser(null)}>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-brand/10 grid place-items-center text-brand font-bold text-sm">
                  {detailUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-semibold text-base">{detailUser.name}</h2>
                  <p className="text-xs text-muted-foreground">{detailUser.email}</p>
                </div>
              </div>
              <div className="divide-y divide-border rounded-lg ring-1 ring-border overflow-hidden text-sm">
                {[
                  { label: "Status", value: detailUser.status },
                  { label: "Role", value: detailUser.role },
                  { label: "Approved", value: detailUser.approved ? "Yes" : "No" },
                  { label: "Registered", value: new Date(detailUser.createdAt).toLocaleString() },
                  ...(detailUser.rejectionReason ? [{ label: "Rejection Reason", value: detailUser.rejectionReason }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex px-4 py-2.5 gap-4">
                    <span className="w-36 text-muted-foreground shrink-0">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setDetailUser(null)} className="w-full py-2 rounded-lg ring-1 ring-border text-sm hover:bg-muted transition-colors">
                Close
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="bg-background rounded-2xl ring-1 ring-border shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
