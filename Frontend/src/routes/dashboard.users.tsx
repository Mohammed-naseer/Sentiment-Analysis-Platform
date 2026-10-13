import { createFileRoute } from "@tanstack/react-router";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Ban, Check, Search, Trash2, UserPlus, Lock, Mail, RefreshCw, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useCan, useRole } from "@/lib/rbac";
import { pushActivity } from "@/lib/activity-store";
import { api } from "@/lib/api";

export const Route = createFileRoute("/dashboard/users")({
  component: Page,
});

// ─── Types ───────────────────────────────────────────────────────────────────
type UserRole = "Admin" | "Analyst" | "Viewer" | "Reader";
type UserStatus = "Approved" | "Pending" | "Rejected";

interface BackendUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  approved: boolean;
  createdAt: string;
}

interface UsersApiResponse {
  success: boolean;
  data: { users: BackendUser[] };
}

const ROLES: UserRole[] = ["Admin", "Analyst", "Viewer", "Reader"];

const statusDisplay: Record<UserStatus, { label: string; className: string }> = {
  Approved: { label: "Active", className: "bg-success/10 text-success" },
  Pending: { label: "Pending", className: "bg-warning/10 text-warning" },
  Rejected: { label: "Blocked", className: "bg-danger/10 text-danger" },
};

// ─── Page Component ───────────────────────────────────────────────────────────
function Page() {
  const [users, setUsers] = useState<BackendUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [toDelete, setToDelete] = useState<BackendUser | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("Analyst");
  const [inviteLoading, setInviteLoading] = useState(false);

  const role = useRole();
  const canAssignRole = useCan("users:assign_role");
  const canBlock = useCan("users:block");
  const canDelete = useCan("users:delete");
  const canInvite = useCan("users:invite");
  const anyAdmin = canAssignRole || canBlock || canDelete || canInvite;

  // ── Fetch Users ─────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<UsersApiResponse>("/api/admin/users");
      setUsers(res.data?.users || []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ── Filtered List ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.role.toLowerCase().includes(term)
    );
  }, [users, q]);

  // ── Change Role ─────────────────────────────────────────────────────────────
  const handleChangeRole = async (user: BackendUser, newRole: UserRole) => {
    if (!canAssignRole) { toast.error("You don't have permission to change roles"); return; }
    try {
      await api.put(`/api/admin/users/${user._id}/role`, { role: newRole });
      setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, role: newRole } : u)));
      pushActivity({ kind: "admin", title: `Role changed to ${newRole}`, detail: user.email });
      toast.success(`${user.name}'s role updated to ${newRole}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update role");
    }
  };

  // ── Toggle Block/Unblock ────────────────────────────────────────────────────
  const handleToggleBlock = async (user: BackendUser) => {
    if (!canBlock) { toast.error("You don't have permission to block users"); return; }
    const newStatus: UserStatus = user.status === "Rejected" ? "Approved" : "Rejected";
    try {
      await api.put(`/api/admin/users/${user._id}/status`, { status: newStatus });
      setUsers((prev) =>
        prev.map((u) =>
          u._id === user._id ? { ...u, status: newStatus, approved: newStatus === "Approved" } : u
        )
      );
      pushActivity({
        kind: "admin",
        title: newStatus === "Rejected" ? `Blocked ${user.name}` : `Unblocked ${user.name}`,
        detail: user.email,
      });
      toast.success(newStatus === "Rejected" ? `${user.name} blocked` : `${user.name} unblocked`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status");
    }
  };

  // ── Confirm Delete ──────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!toDelete) return;
    if (!canDelete) { toast.error("You don't have permission to delete users"); setToDelete(null); return; }
    try {
      await api.delete(`/api/admin/users/${toDelete._id}`);
      setUsers((prev) => prev.filter((u) => u._id !== toDelete._id));
      pushActivity({ kind: "admin", title: `Deleted ${toDelete.name}`, detail: toDelete.email });
      toast.success(`${toDelete.name} deleted`);
      setToDelete(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete user");
      setToDelete(null);
    }
  };

  // ── Invite User ─────────────────────────────────────────────────────────────
  const handleInviteSubmit = async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    setInviteLoading(true);
    try {
      await api.post("/api/admin/users/invite", { email: inviteEmail.trim(), role: inviteRole });
      pushActivity({ kind: "admin", title: `Invited ${inviteEmail} as ${inviteRole}` });
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("Analyst");
      fetchUsers(); // Refresh list
    } catch (err: any) {
      toast.error(err?.message || "Failed to send invitation");
    } finally {
      setInviteLoading(false);
    }
  };

  // ── Unauthorized View ───────────────────────────────────────────────────────
  if (!anyAdmin) {
    return (
      <>
        <DashboardTopbar title="Users" />
        <div className="p-6 max-w-2xl w-full mx-auto">
          <div className="p-10 rounded-xl bg-card ring-1 ring-border text-center">
            <div className="mx-auto size-12 rounded-full bg-danger/10 grid place-items-center mb-4">
              <Lock className="size-6 text-danger" />
            </div>
            <h2 className="text-lg font-semibold">Unauthorized</h2>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-md mx-auto">
              Your current role (<span className="font-medium text-foreground">{role}</span>) doesn't grant access to user
              administration.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardTopbar title="Users" />
      <div className="p-6 space-y-6 max-w-[1600px] w-full mx-auto">
        {/* Header bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, email, or role…"
              className="input-field pl-9"
            />
          </div>
          <button
            onClick={fetchUsers}
            className="p-2 rounded-lg ring-1 ring-border hover:bg-muted transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          {canInvite && (
            <button
              onClick={() => setInviteOpen(true)}
              className="bg-brand text-white text-sm px-4 py-2 rounded-lg font-medium hover:opacity-90 inline-flex items-center gap-1.5"
            >
              <UserPlus className="size-4" /> Invite user
            </button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-xl bg-card ring-1 ring-border overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              <div className="size-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin mx-auto mb-3" />
              Loading users…
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">User</th>
                  <th className="text-left px-4 py-3 font-medium">Role</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((u) => (
                  <tr key={u._id} className="hover:bg-muted/30 transition-colors">
                    {/* User info */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-gradient-to-br from-brand to-accent-cyan grid place-items-center text-white text-xs font-semibold shrink-0">
                          {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{u.name}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role selector */}
                    <td className="px-4 py-3">
                      <div className="relative inline-flex items-center">
                        <select
                          value={u.role}
                          disabled={!canAssignRole}
                          onChange={(e) => handleChangeRole(u, e.target.value as UserRole)}
                          className="input-field h-8 py-0 text-xs pr-7 disabled:opacity-60 disabled:cursor-not-allowed appearance-none"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                        <ChevronDown className="size-3 absolute right-2 pointer-events-none text-muted-foreground" />
                      </div>
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3">
                      <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded ${statusDisplay[u.status]?.className || "bg-muted text-muted-foreground"}`}>
                        {statusDisplay[u.status]?.label || u.status}
                      </span>
                    </td>

                    {/* Joined date */}
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {canBlock && (
                          <button
                            onClick={() => handleToggleBlock(u)}
                            className={`text-xs px-2 py-1 rounded ring-1 inline-flex items-center gap-1 transition-colors ${
                              u.status === "Rejected"
                                ? "ring-success/40 text-success hover:bg-success/10"
                                : "ring-border hover:bg-muted"
                            }`}
                            title={u.status === "Rejected" ? "Unblock user" : "Block user"}
                          >
                            {u.status === "Rejected" ? (
                              <><Check className="size-3" /> Unblock</>
                            ) : (
                              <><Ban className="size-3" /> Block</>
                            )}
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setToDelete(u)}
                            className="text-xs px-2 py-1 rounded ring-1 ring-border hover:bg-danger/10 hover:text-danger inline-flex items-center gap-1 transition-colors"
                            title="Delete user"
                          >
                            <Trash2 className="size-3" /> Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      {q ? `No users match "${q}".` : "No users found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {toDelete?.name}?</DialogTitle>
            <DialogDescription>
              This permanently removes{" "}
              <span className="font-medium">{toDelete?.email}</span> and revokes all access. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setToDelete(null)}
              className="ring-1 ring-border px-4 py-2 rounded-lg text-sm hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="bg-danger text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90"
            >
              Delete user
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Invite User Dialog ── */}
      <Dialog open={inviteOpen} onOpenChange={(o) => { if (!o) { setInviteOpen(false); setInviteEmail(""); setInviteRole("Analyst"); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="size-4" /> Invite User
            </DialogTitle>
            <DialogDescription>
              Send a workspace invitation email. The recipient will receive a secure link to complete registration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Email Address *</span>
              <input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="input-field mt-1.5"
                onKeyDown={(e) => e.key === "Enter" && handleInviteSubmit()}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Assign Role</span>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as UserRole)}
                className="input-field mt-1.5"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              <strong>Role permissions:</strong> Admin = full access · Analyst = analysis + products · Viewer = read-only · Reader = reports only
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => { setInviteOpen(false); setInviteEmail(""); setInviteRole("Analyst"); }}
              className="ring-1 ring-border px-4 py-2 rounded-lg text-sm hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleInviteSubmit}
              disabled={inviteLoading}
              className="bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-60 inline-flex items-center gap-2"
            >
              {inviteLoading ? (
                <><div className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending…</>
              ) : (
                <><Mail className="size-3.5" /> Send invitation</>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}