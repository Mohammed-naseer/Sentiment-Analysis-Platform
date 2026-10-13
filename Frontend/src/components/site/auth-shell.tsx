import { Link } from "@tanstack/react-router";
import { Logo } from "./logo";

export function AuthShell({ title, subtitle, children, footer }: {
  title: string; subtitle: string; children: React.ReactNode; footer: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2" suppressHydrationWarning>
      <aside className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-brand via-brand to-accent-cyan text-white relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-20" suppressHydrationWarning />
        <div className="relative" suppressHydrationWarning><Logo /></div>
        <div className="relative space-y-4" suppressHydrationWarning>
          <div className="text-3xl font-semibold tracking-tight leading-tight max-w-md" suppressHydrationWarning>
            &quot;Lumina replaced three vendors. Aspect dashboards are what our exec team actually reads.&quot;
          </div>
          <div className="text-sm text-white/70" suppressHydrationWarning>Sarah Jenkins — VP of CX, Northwind</div>
        </div>
        <div className="relative text-xs text-white/60 font-mono" suppressHydrationWarning>SOC 2 · GDPR · HIPAA-ready</div>
      </aside>
      <main className="flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-6" suppressHydrationWarning>
          <div className="lg:hidden" suppressHydrationWarning><Logo /></div>
          <div suppressHydrationWarning>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>
          {children}
          <div className="text-sm text-muted-foreground text-center" suppressHydrationWarning>{footer}</div>
          <div className="text-center" suppressHydrationWarning>
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">← Back home</Link>
          </div>
        </div>
      </main>
    </div>
  );
}