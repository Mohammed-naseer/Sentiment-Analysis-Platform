import { Search, Bell, Sun, Moon, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { GlobalSearch } from "@/components/dashboard/global-search";
import { ROLES, setRole, useRole, type Role } from "@/lib/rbac";
import { pushActivity } from "@/lib/activity-store";
import { useAuth } from "@/lib/auth-store";

export function DashboardTopbar({ title }: { title: string }) {
  const { user } = useAuth();
  const activeRole = useRole();

  // ── Hydration-safe role resolution ─────────────────────────────────────────
  // During SSR, user=null → isAdmin=false → renders non-admin badge.
  // On the client first render (mounted=false) we also render the non-admin
  // badge so the markup is byte-for-byte identical to the server output.
  // After hydration (mounted=true via useEffect) we re-render with the real
  // role — React applies this as a normal client update, no hydration panic.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const actualRole = (mounted ? (user?.role || "Viewer") : "Viewer") as Role;
  const isAdmin = mounted && actualRole === "Admin";

  const [dark, setDark] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);

  // Initialize theme from localStorage post-hydration
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved) {
      setDark(saved === "dark");
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setDark(true);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark, mounted]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const initials = mounted && user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40" suppressHydrationWarning>
      <div className="h-full px-6 flex items-center gap-4" suppressHydrationWarning>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        <div className="ml-auto flex items-center gap-2" suppressHydrationWarning>
          {/* Admin-only Role Switcher vs Non-Admin Role Badge */}
          {isAdmin ? (
            <div className="hidden md:flex items-center gap-1.5 h-9 pl-2 pr-1 rounded-lg ring-1 ring-border bg-background text-xs">
              <ShieldCheck className="size-3.5 text-brand" />
              <span className="text-muted-foreground font-medium">Role:</span>
              <select
                value={activeRole}
                onChange={(e) => {
                  const next = e.target.value as Role;
                  setRole(next);
                  pushActivity({ kind: "admin", title: `Admin switched active role context to ${next}` });
                }}
                className="bg-transparent outline-none font-semibold pr-1 cursor-pointer text-foreground"
                aria-label="Switch active role context"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r} className="bg-popover text-popover-foreground">
                    {r}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-1.5 h-9 px-3 rounded-lg ring-1 ring-border bg-muted/40 text-xs font-semibold text-foreground">
              <ShieldCheck className="size-3.5 text-brand" />
              <span>{actualRole}</span>
            </div>
          )}

          {/* Search trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden md:flex items-center gap-2 h-9 w-80 px-3 rounded-lg ring-1 ring-border bg-background hover:bg-muted/50 text-left text-sm text-muted-foreground transition-colors"
          >
            <Search className="size-4" />
            <span className="flex-1">Search reviews, products, categories…</span>
            <kbd className="text-[10px] font-mono border border-border rounded px-1.5 py-0.5">⌘K</kbd>
          </button>
          <button
            onClick={() => setSearchOpen(true)}
            className="md:hidden size-9 grid place-items-center rounded-lg hover:bg-muted"
            aria-label="Search"
          >
            <Search className="size-4" />
          </button>

          {/* Persistent Theme Toggle */}
          <button
            onClick={() => setDark((d) => !d)}
            className="size-9 grid place-items-center rounded-lg hover:bg-muted transition-colors text-foreground"
            aria-label="Toggle theme"
            title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {dark ? <Sun className="size-4 text-warning" /> : <Moon className="size-4 text-foreground" />}
          </button>

          {/* Notifications */}
          <button className="size-9 grid place-items-center rounded-lg hover:bg-muted transition-colors relative" aria-label="Notifications">
            <Bell className="size-4 text-foreground" />
            <span className="absolute top-2 right-2 size-1.5 rounded-full bg-danger" />
          </button>

          {/* User Avatar */}
          <div className="size-9 rounded-full bg-gradient-to-br from-brand to-accent-cyan grid place-items-center text-white text-xs font-semibold shadow-sm" title={mounted ? `${user?.name || "User"} (${actualRole})` : "User"} suppressHydrationWarning>
            {initials}
          </div>
        </div>
      </div>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}