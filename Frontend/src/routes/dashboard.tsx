import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { DashboardSidebar } from "@/components/dashboard/sidebar";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [
    { title: "Dashboard — Lumina AI" },
    { name: "description", content: "Enterprise review intelligence dashboard." },
  ]}),
  beforeLoad: () => {
    // Guard: localStorage is not available during SSR — skip auth check on server
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem("ai_sentiment_token");
    if (!token) {
      throw redirect({ to: "/login" });
    }
  },
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <div className="min-h-dvh flex bg-background" suppressHydrationWarning>
      <DashboardSidebar />
      <div className="flex-1 min-w-0 flex flex-col" suppressHydrationWarning>
        <Outlet />
      </div>
    </div>
  );
}