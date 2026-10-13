import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingNav } from "@/components/site/marketing-nav";
import { SiteFooter } from "@/components/site/site-footer";
import { Check } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({ meta: [
    { title: "Pricing — Lumina AI" },
    { name: "description", content: "Predictable pricing that scales with signal. Starter, Professional, and Enterprise tiers." },
    { property: "og:title", content: "Pricing — Lumina AI" },
    { property: "og:description", content: "Simple, scalable pricing for review intelligence." },
  ]}),
  component: Page,
});

const plans = [
  { name: "Starter", price: "₹3,999", period: "/mo", tag: "For small teams", cta: "Start free", featured: false,
    features: ["Up to 10K reviews / mo", "Sentiment + emotion", "3 team seats", "Email support"] },
  { name: "Professional", price: "₹19,999", period: "/mo", tag: "Best for growth teams", cta: "Start free", featured: true,
    features: ["Up to 250K reviews / mo", "Aspect-level analytics", "10 team seats", "Priority support", "SSO/SAML"] },
  { name: "Enterprise", price: "Custom", period: "", tag: "For regulated & global teams", cta: "Contact sales", featured: false,
    features: ["Unlimited reviews", "Dedicated model tuning", "Unlimited seats", "24/7 support + SLA", "Data residency"] },
];

function Page() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-xs font-mono uppercase tracking-widest text-brand mb-3">Pricing</div>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">Simple pricing. Enterprise-ready.</h1>
          <p className="mt-4 text-muted-foreground">Start free. Upgrade when you need scale, seats, or SLAs.</p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          {plans.map((p) => (
            <div key={p.name} className={`p-8 rounded-2xl ring-1 flex flex-col ${p.featured ? "ring-brand bg-card shadow-xl shadow-brand/10" : "ring-border bg-card"}`}>
              {p.featured && <div className="text-[10px] font-mono uppercase tracking-widest text-brand mb-2">Most popular</div>}
              <div className="font-semibold tracking-tight">{p.name}</div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight">{p.price}</span>
                <span className="text-sm text-muted-foreground">{p.period}</span>
              </div>
              <div className="text-sm text-muted-foreground mt-2">{p.tag}</div>
              <ul className="mt-6 space-y-2 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="size-4 text-brand shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
              <Link to="/signup" className={`mt-8 inline-flex justify-center px-4 py-2.5 rounded-lg text-sm font-medium ${p.featured ? "bg-brand text-white hover:opacity-90" : "ring-1 ring-border hover:bg-muted"}`}>
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}