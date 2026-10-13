import { createFileRoute } from "@tanstack/react-router";
import { MarketingNav } from "@/components/site/marketing-nav";
import { SiteFooter } from "@/components/site/site-footer";
import { Brain, Sparkles, Layers, Heart, LineChart, GitCompare, Lightbulb, Zap, Plug, Lock } from "lucide-react";

export const Route = createFileRoute("/features")({
  head: () => ({ meta: [
    { title: "Features — Lumina AI" },
    { name: "description", content: "Deep learning sentiment, aspect-based analysis, emotion detection, and real-time predictions." },
    { property: "og:title", content: "Features — Lumina AI" },
    { property: "og:description", content: "Every capability you need for enterprise review intelligence." },
  ]}),
  component: Page,
});

const features = [
  { icon: Brain, title: "Deep learning sentiment", desc: "Nuance, sarcasm, and context — 99.4% domain-tuned accuracy." },
  { icon: Sparkles, title: "AI review summarization", desc: "Instant TL;DR of thousands of reviews with cited excerpts." },
  { icon: Layers, title: "Aspect-based analysis", desc: "Automatic extraction of features, pricing, support, and shipping signals." },
  { icon: Heart, title: "Emotion detection", desc: "Delight, trust, frustration — go beyond binary sentiment." },
  { icon: LineChart, title: "Interactive analytics", desc: "Drill from executive overview to a single reviewer in three clicks." },
  { icon: GitCompare, title: "Product comparison", desc: "Cross-product and cross-competitor benchmarking dashboards." },
  { icon: Lightbulb, title: "Business insights", desc: "AI-generated recommendations tied to revenue and churn signals." },
  { icon: Zap, title: "Real-time predictions", desc: "Sub-50ms streaming inference at enterprise scale." },
  { icon: Plug, title: "Fast API integration", desc: "REST, webhooks, and SDKs for every major stack." },
  { icon: Lock, title: "Secure authentication", desc: "SSO/SAML, MFA, role-based access, and audit logs." },
];

function Page() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-xs font-mono uppercase tracking-widest text-brand mb-3">Features</div>
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight max-w-2xl">Every capability, one platform</h1>
        <p className="mt-4 text-muted-foreground max-w-2xl">Ten integrated modules that turn feedback into intelligence.</p>
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="p-6 rounded-2xl bg-card ring-1 ring-border hover:shadow-lg transition-shadow">
              <div className="size-10 rounded-xl bg-gradient-to-br from-brand/10 to-accent-cyan/10 grid place-items-center text-brand mb-4">
                <f.icon className="size-5" />
              </div>
              <h3 className="font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}