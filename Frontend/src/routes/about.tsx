import { createFileRoute } from "@tanstack/react-router";
import { MarketingNav } from "@/components/site/marketing-nav";
import { SiteFooter } from "@/components/site/site-footer";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [
    { title: "About — Lumina AI" },
    { name: "description", content: "Building executive-grade review intelligence for teams that measure sentiment in millions." },
    { property: "og:title", content: "About — Lumina AI" },
    { property: "og:description", content: "The team and thesis behind Lumina AI." },
  ]}),
  component: Page,
});

function Page() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <section className="mx-auto max-w-3xl px-6 py-20 space-y-8">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-brand mb-3">About</div>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">Intelligence that respects your customers</h1>
        </div>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Lumina AI was founded by machine-learning engineers from CX and search infrastructure teams.
          We believe reviews are the highest-signal, lowest-cost dataset a business owns — and that turning them into
          decisions should not require a data-science team.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Our platform combines proprietary deep-learning models with a data pipeline built for regulated, cross-border
          workloads. We serve teams from Series B startups to Fortune 100 enterprises.
        </p>
        <div className="grid sm:grid-cols-3 gap-6 pt-6">
          {[{ k: "2022", l: "Founded" }, { k: "38", l: "Team members" }, { k: "12", l: "Countries served" }].map((v) => (
            <div key={v.l} className="p-6 rounded-2xl bg-card ring-1 ring-border">
              <div className="text-3xl font-semibold">{v.k}</div>
              <div className="text-sm text-muted-foreground mt-1">{v.l}</div>
            </div>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}