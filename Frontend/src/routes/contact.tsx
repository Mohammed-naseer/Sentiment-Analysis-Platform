import { createFileRoute } from "@tanstack/react-router";
import { MarketingNav } from "@/components/site/marketing-nav";
import { SiteFooter } from "@/components/site/site-footer";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Mail, Phone, MapPin, Send, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [
    { title: "Contact — Lumina AI" },
    { name: "description", content: "Talk to our team about enterprise review intelligence." },
    { property: "og:title", content: "Contact — Lumina AI" },
    { property: "og:description", content: "Get in touch with sales, support, or partnerships." },
  ]}),
  component: Page,
});

type FormData = {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  product?: string;
  message: string;
};

const PRODUCTS = ["General", "Lumina AI Platform", "Sentiment Analytics", "Enterprise Suite", "API Integration", "Other"];

function Page() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    try {
      const res = await fetch("http://localhost:5001/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Submission failed");
      setSubmitted(true);
      reset();
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <section className="mx-auto max-w-6xl px-6 py-20 grid md:grid-cols-2 gap-14">
        {/* Left — Contact Info */}
        <div className="space-y-6">
          <div className="text-xs font-mono uppercase tracking-widest text-brand">Contact</div>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">Let's talk intelligence</h1>
          <p className="text-muted-foreground">
            Sales, integrations, or enterprise procurement — reach us directly and we'll get back to you within one business day.
          </p>
          <ul className="space-y-4 pt-4 text-sm">
            <li className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-brand/10 grid place-items-center shrink-0">
                <Mail className="size-4 text-brand" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-0.5">Email</div>
                <a href="mailto:mohammednaseer22022@gmail.com" className="hover:text-brand transition-colors">
                  mohammednaseer22022@gmail.com
                </a>
              </div>
            </li>
            <li className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-brand/10 grid place-items-center shrink-0">
                <Phone className="size-4 text-brand" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-0.5">Phone</div>
                <a href="tel:+917013722022" className="hover:text-brand transition-colors">
                  +91 70137 22022
                </a>
              </div>
            </li>
            <li className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-brand/10 grid place-items-center shrink-0">
                <MapPin className="size-4 text-brand" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-0.5">Director</div>
                <span>Mohammed Naseeruddin</span>
              </div>
            </li>
          </ul>

          {/* Response time badge */}
          <div className="mt-6 p-4 rounded-xl bg-brand/5 border border-brand/20 text-sm">
            <div className="font-semibold text-brand mb-1">⚡ Fast Response</div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Typical response time is within 4–8 business hours. Enterprise inquiries are prioritized.
            </p>
          </div>
        </div>

        {/* Right — Contact Form */}
        {submitted ? (
          <div className="p-8 rounded-2xl bg-card ring-1 ring-border flex flex-col items-center justify-center text-center gap-4 min-h-[400px]">
            <div className="size-16 rounded-full bg-success/10 grid place-items-center">
              <CheckCircle2 className="size-8 text-success" />
            </div>
            <h2 className="text-xl font-semibold">Message Received!</h2>
            <p className="text-muted-foreground text-sm max-w-xs">
              Thank you for reaching out. We'll get back to you at <strong className="text-foreground">mohammednaseer22022@gmail.com</strong> within one business day.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="mt-2 ring-1 ring-border px-6 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
            >
              Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="p-8 rounded-2xl bg-card ring-1 ring-border space-y-4">
            <h2 className="text-lg font-semibold mb-2">Send us a message</h2>

            {/* Row: Name + Email */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Full Name *" error={errors.name?.message}>
                <input
                  id="contact-name"
                  {...register("name", { required: "Name is required" })}
                  placeholder="Mohammed Naseer"
                  className="input-field"
                />
              </Field>
              <Field label="Work Email *" error={errors.email?.message}>
                <input
                  id="contact-email"
                  type="email"
                  {...register("email", {
                    required: "Email is required",
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email" },
                  })}
                  placeholder="you@company.com"
                  className="input-field"
                />
              </Field>
            </div>

            {/* Row: Phone + Company */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Phone Number">
                <input
                  id="contact-phone"
                  type="tel"
                  {...register("phone")}
                  placeholder="+91 98765 43210"
                  className="input-field"
                />
              </Field>
              <Field label="Company / Organization">
                <input
                  id="contact-company"
                  {...register("company")}
                  placeholder="Acme Inc."
                  className="input-field"
                />
              </Field>
            </div>

            {/* Product Interest */}
            <Field label="Product / Area of Interest">
              <select id="contact-product" {...register("product")} className="input-field">
                {PRODUCTS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </Field>

            {/* Message */}
            <Field label="Message *" error={errors.message?.message}>
              <textarea
                id="contact-message"
                rows={4}
                {...register("message", {
                  required: "Message is required",
                  minLength: { value: 10, message: "Message must be at least 10 characters" },
                })}
                placeholder="Tell us about your use case, team size, or any specific requirements…"
                className="input-field resize-none"
              />
            </Field>

            <button
              id="contact-submit"
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-brand text-white py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  Send message
                </>
              )}
            </button>

            <p className="text-xs text-muted-foreground text-center">
              By submitting, you agree to our{" "}
              <a href="/privacy" className="underline hover:text-brand">Privacy Policy</a>.
            </p>
          </form>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
      {error && <span className="text-xs text-danger mt-1 block">{error}</span>}
    </label>
  );
}