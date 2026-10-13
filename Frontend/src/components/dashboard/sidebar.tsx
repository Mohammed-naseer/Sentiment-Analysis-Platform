import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, MessageSquare, LineChart, Boxes, FileText, Users, Settings, LogOut, Activity, History, UserCheck, Brain, Mic } from "lucide-react";
import { Logo } from "@/components/site/logo";
import { logout, useAuth } from "@/lib/auth-store";
import type { Role } from "@/lib/rbac";
import { toast } from "sonner";
import { useState, useEffect } from "react";

const allNavItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: null },
  { to: "/dashboard/analysis", label: "Review Analysis", icon: MessageSquare, roles: ["Admin", "Analyst"] },
  { to: "/dashboard/multimodal", label: "Voice Intelligence", icon: Mic, roles: ["Admin", "Analyst"], badge: "NEW" },
  { to: "/dashboard/intelligence", label: "AI Data Intelligence", icon: Brain, roles: ["Admin", "Analyst"], badge: "NEW" },
  { to: "/dashboard/history", label: "History", icon: History, roles: ["Admin", "Analyst", "Viewer"] },
  { to: "/dashboard/analytics", label: "Analytics", icon: LineChart, roles: ["Admin", "Analyst", "Viewer", "Reader"] },
  { to: "/dashboard/products", label: "Products", icon: Boxes, roles: ["Admin", "Analyst", "Viewer"] },
  { to: "/dashboard/reports", label: "Reports", icon: FileText, roles: ["Admin", "Analyst", "Viewer", "Reader"] },
  { to: "/dashboard/activity", label: "Audit Log", icon: Activity, roles: ["Admin"] },
  { to: "/dashboard/users", label: "Users", icon: Users, roles: ["Admin"] },
  { to: "/dashboard/approval", label: "User Approval", icon: UserCheck, roles: ["Admin"] },
  { to: "/dashboard/settings", label: "Settings", icon: Settings, roles: null },
] as const;


export function DashboardSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const nav2 = useNavigate();
  const { user } = useAuth();

  // ── Hydration-safe role filtering ───────────────────────────────────────────
  // PROBLEM: During SSR, user=null → userRole="Viewer" → role-restricted items
  //          (Analysis, Intelligence) are filtered out.
  //          On the client, the stored user (Admin/Analyst) causes those items
  //          to appear, changing the Link element count → React hydration panic.
  //
  // FIX: Track whether the component has mounted on the client. During SSR and
  //      the initial client render (mounted=false), render ALL nav items so the
  //      server and client markup are byte-for-byte identical.
  //      After hydration completes (mounted=true via useEffect), re-render with
  //      role-filtered items — which happens invisibly post-hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const userRole = (user?.role || "Viewer") as Role;

  // Pre-hydration: show every item (matches SSR output exactly).
  // Post-hydration: filter by role as normal.
  const visibleNav = mounted
    ? allNavItems.filter((n) => !n.roles || (n.roles as readonly string[]).includes(userRole))
    : allNavItems;

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out");
    nav2({ to: "/login" });
  };

  return (
    <aside className="w-60 shrink-0 border-r border-border bg-sidebar hidden lg:flex flex-col" suppressHydrationWarning>
      <div className="p-4 border-b border-border" suppressHydrationWarning>
        <Logo />
      </div>
      <nav className="flex-1 p-3 space-y-0.5" suppressHydrationWarning>
        {visibleNav.map((n) => {
          const active = path === n.to || (n.to !== "/dashboard" && path.startsWith(n.to));
          return (
            <Link
              key={n.to}
              to={n.to}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
            >
              <n.icon className="size-4" /> {n.label}
              {n.to === "/dashboard/intelligence" && (
                <span className="ml-auto text-[9px] bg-gradient-to-r from-brand to-cyan-500 text-white rounded-full px-1.5 py-0.5 font-bold tracking-wide">NEW</span>
              )}
              {n.to === "/dashboard/approval" && mounted && userRole === "Admin" && (
                <span className="ml-auto text-[10px] bg-brand text-white rounded-full px-1.5 py-0.5 font-medium">Admin</span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border" suppressHydrationWarning>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
        >
          <LogOut className="size-4" /> Sign out
        </button>
      </div>
    </aside>
  );
}