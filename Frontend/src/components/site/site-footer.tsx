import { Link } from "@tanstack/react-router";
import { Github, Twitter, Linkedin } from "lucide-react";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-7xl px-6 py-14 grid gap-10 md:grid-cols-4">
        <div className="space-y-4">
          <Logo />
          <p className="text-sm text-muted-foreground max-w-xs">
            Executive-grade review intelligence for teams that measure sentiment in millions.
          </p>
          <div className="flex gap-3 text-muted-foreground">
            <a aria-label="Twitter" href="#" className="hover:text-foreground transition-colors"><Twitter className="size-4" /></a>
            <a aria-label="GitHub" href="#" className="hover:text-foreground transition-colors"><Github className="size-4" /></a>
            <a aria-label="LinkedIn" href="#" className="hover:text-foreground transition-colors"><Linkedin className="size-4" /></a>
          </div>
        </div>
        <FooterCol title="Product" links={[["Features","/features"],["Pricing","/pricing"],["Dashboard","/dashboard"]]} />
        <FooterCol title="Company" links={[["About","/about"],["Contact","/contact"]]} />
        <FooterCol title="Legal" links={[["Privacy","/contact"],["Terms","/contact"],["Security","/contact"]]} />
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-6 flex flex-wrap justify-between items-center gap-3 text-xs text-muted-foreground">
          <span>© 2026 Lumina Systems Inc. All rights reserved.</span>
          <span className="font-mono">Uptime 99.99% · Latency 42ms</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</div>
      <ul className="space-y-2 text-sm">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link to={href} className="text-foreground/80 hover:text-foreground transition-colors">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}