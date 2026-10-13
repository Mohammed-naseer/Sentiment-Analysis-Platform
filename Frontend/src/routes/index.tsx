import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Brain, Layers, LineChart, ShieldCheck, Sparkles, Zap, Star, Check } from "lucide-react";
import { MarketingNav } from "@/components/site/marketing-nav";
import { SiteFooter } from "@/components/site/site-footer";
import { HeroDashboard } from "@/components/site/hero-dashboard";
import { AnimatedCounter } from "@/components/site/animated-counter";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)] opacity-60" aria-hidden />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[820px] h-[820px] rounded-full bg-brand/10 blur-3xl -z-0" aria-hidden />

        <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-16 flex flex-col items-center text-center">
          <motion.span
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/5 text-brand text-xs font-medium ring-1 ring-brand/15 mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand" />
            </span>
            v2.4 Enterprise Model — now live
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05] text-balance max-w-4xl"
          >
            Transform customer reviews into{" "}
            <span className="bg-gradient-to-r from-brand to-accent-cyan bg-clip-text text-transparent">actionable business intelligence</span>{" "}
            with AI
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
            className="mt-6 text-lg text-muted-foreground max-w-2xl text-pretty"
          >
            Deep learning, NLP, and aspect-level analytics — process millions of reviews and surface the signals that move revenue.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-brand/25 hover:shadow-xl hover:shadow-brand/30 hover:-translate-y-0.5 transition-all"
            >
              Start free <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium ring-1 ring-border bg-card hover:bg-muted transition-colors"
            >
              Live demo
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.6 }}
            className="w-full max-w-6xl mt-16"
          >
            <HeroDashboard />
          </motion.div>
        </div>
      </section>

      {/* Trusted */}
      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6">
            Trusted by leading enterprise teams
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 opacity-60">
            {["Northwind", "Acme Labs", "Vercel Co.", "Contoso", "Globex", "Initech", "Umbrella"].map((n) => (
              <span key={n} className="font-semibold tracking-tight text-foreground/70">{n}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl mb-14">
            <div className="text-xs font-mono uppercase tracking-widest text-brand mb-3">Platform</div>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Enterprise-grade review intelligence</h2>
            <p className="mt-4 text-muted-foreground">Ten integrated modules — one API, one dashboard, zero glue code.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="p-6 rounded-2xl bg-card ring-1 ring-border hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <div className="size-10 rounded-xl bg-gradient-to-br from-brand/10 to-accent-cyan/10 grid place-items-center text-brand mb-4">
                  <f.icon className="size-5" />
                </div>
                <h3 className="font-semibold tracking-tight">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-muted/40 border-y border-border">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl mb-14">
            <div className="text-xs font-mono uppercase tracking-widest text-brand mb-3">How it works</div>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">From raw feedback to boardroom insight</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-5">
            {steps.map((s, i) => (
              <div key={s.title} className="p-5 rounded-xl bg-card ring-1 ring-border relative">
                <div className="text-xs font-mono text-muted-foreground">STEP {String(i + 1).padStart(2, "0")}</div>
                <div className="mt-3 font-semibold tracking-tight">{s.title}</div>
                <div className="mt-2 text-sm text-muted-foreground">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6 grid gap-8 md:grid-cols-4 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-4xl sm:text-5xl font-semibold tracking-tight">
                <AnimatedCounter value={s.value} suffix={s.suffix} />
              </div>
              <div className="mt-2 text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-muted/40 border-y border-border">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl mb-14">
            <div className="text-xs font-mono uppercase tracking-widest text-brand mb-3">Testimonials</div>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Teams shipping on Lumina</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <figure key={t.name} className="p-6 rounded-2xl bg-card ring-1 ring-border flex flex-col gap-4">
                <div className="flex gap-0.5 text-warning">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="size-4 fill-current" />)}
                </div>
                <blockquote className="text-sm text-foreground/90 leading-relaxed">"{t.quote}"</blockquote>
                <figcaption className="text-xs text-muted-foreground">
                  <div className="font-semibold text-foreground">{t.name}</div>
                  {t.role}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl mb-14 text-center mx-auto">
            <div className="text-xs font-mono uppercase tracking-widest text-brand mb-3">Pricing</div>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Predictable pricing that scales with signal</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
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
                <Link
                  to="/signup"
                  className={`mt-8 inline-flex justify-center px-4 py-2.5 rounded-lg text-sm font-medium ${p.featured ? "bg-brand text-white hover:opacity-90" : "ring-1 ring-border hover:bg-muted"}`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 bg-muted/40 border-y border-border">
        <div className="mx-auto max-w-3xl px-6">
          <div className="text-xs font-mono uppercase tracking-widest text-brand mb-3">FAQ</div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-10">Frequently asked</h2>
          <div className="divide-y divide-border rounded-2xl bg-card ring-1 ring-border overflow-hidden">
            {faqs.map((f) => (
              <details key={f.q} className="group px-6 py-5">
                <summary className="flex items-center justify-between cursor-pointer list-none font-medium">
                  {f.q}
                  <span className="text-muted-foreground group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="rounded-3xl bg-gradient-to-br from-brand to-accent-cyan p-12 text-white text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 grid-bg" aria-hidden />
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Ship review intelligence this week</h2>
            <p className="mt-3 text-white/80">14-day free trial. No credit card required.</p>
            <div className="mt-8 flex justify-center gap-3 relative">
              <Link to="/signup" className="bg-white text-brand px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity">Start free</Link>
              <Link to="/contact" className="ring-1 ring-white/40 px-6 py-3 rounded-xl font-medium hover:bg-white/10 transition-colors">Talk to sales</Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

const features = [
  { icon: Brain, title: "Deep learning sentiment", desc: "Beyond keyword matching — nuance, sarcasm, and professional context at 99.4% accuracy." },
  { icon: Sparkles, title: "AI review summarization", desc: "Instant TL;DR across thousands of reviews with cited excerpts." },
  { icon: Layers, title: "Aspect-based analysis", desc: "Automatic extraction of features, pricing, support, and shipping signals." },
  { icon: LineChart, title: "Real-time predictions", desc: "Streaming inference with sub-50ms latency at enterprise scale." },
  { icon: Zap, title: "Fast API integration", desc: "REST + webhooks + SDKs for Python, TypeScript, Go, and Java." },
  { icon: ShieldCheck, title: "Secure by default", desc: "SOC 2, GDPR, HIPAA-ready. Regional data residency and SSO/SAML." },
];

const steps = [
  { title: "Upload reviews", desc: "CSV, API, or connectors" },
  { title: "AI processing", desc: "Deep-learning pipeline" },
  { title: "Predictions", desc: "Sentiment + emotion + aspect" },
  { title: "Dashboard", desc: "Cross-team visibility" },
  { title: "Insights", desc: "Actionable executive summaries" },
];

const stats = [
  { value: 100, suffix: "K+", label: "Reviews analyzed" },
  { value: 98, suffix: "%", label: "Model accuracy" },
  { value: 500, suffix: "+", label: "Businesses" },
  { value: 50, suffix: "+", label: "Categories supported" },
];

const testimonials = [
  { name: "Sarah Jenkins, VP CX at Northwind", role: "Enterprise SaaS", quote: "Lumina replaced three vendors. Aspect-level dashboards are what our exec team actually reads." },
  { name: "Diego Ramos, Head of Insights at Contoso", role: "Retail", quote: "We caught a shipping regression two weeks before it hit our NPS. Payback in month one." },
  { name: "Priya Patel, Director of Product at Globex", role: "Fintech", quote: "The API is a joy. 42ms average latency and the emotion detection actually reads intent." },
];

const plans = [
  { name: "Starter", price: "₹3,999", period: "/mo", tag: "For small teams beginning to measure sentiment", cta: "Start free", featured: false,
    features: ["Up to 10K reviews / mo", "Sentiment + emotion", "3 team seats", "Email support"] },
  { name: "Professional", price: "₹19,999", period: "/mo", tag: "Everything in Starter, plus advanced analytics", cta: "Start free", featured: true,
    features: ["Up to 250K reviews / mo", "Aspect-level analytics", "10 team seats", "Priority support", "SSO/SAML"] },
  { name: "Enterprise", price: "Custom", period: "", tag: "For regulated and global teams", cta: "Contact sales", featured: false,
    features: ["Unlimited reviews", "Dedicated model tuning", "Unlimited seats", "24/7 support + SLA", "Data residency"] },
];

const faqs = [
  { q: "How accurate is the sentiment model?", a: "Our benchmark against GPT-4 and Claude 3.5 puts Lumina at 99.4% accuracy on domain-tuned datasets." },
  { q: "Do you support multiple languages?", a: "Yes — 50+ languages out of the box, with regional dialect handling." },
  { q: "Can I export reports?", a: "CSV, PDF, and Excel. You can also schedule email digests to any stakeholder." },
  { q: "Is there an API?", a: "REST + streaming + webhooks, with SDKs for Python, TypeScript, Go, and Java." },
  { q: "How is my data secured?", a: "SOC 2 Type II, GDPR, HIPAA-ready, with regional data residency options." },
];
