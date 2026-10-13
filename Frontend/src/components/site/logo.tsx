import { Link } from "@tanstack/react-router";

interface LogoProps {
  to?: string;
  compact?: boolean;
  showSubtitle?: boolean;
  className?: string;
}

export function Logo({ to = "/", compact = false, showSubtitle = true, className = "" }: LogoProps) {
  if (compact) {
    return (
      <Link to={to} className={`inline-flex items-center gap-2 group ${className}`}>
        <img
          src="/lumina-icon.png"
          alt="Lumina AI Icon"
          className="size-9 object-contain drop-shadow-sm transition-transform group-hover:scale-105"
        />
      </Link>
    );
  }

  return (
    <Link to={to} className={`inline-flex items-center gap-3 group ${className}`}>
      <img
        src="/lumina-logo.png"
        alt="Lumina AI Logo"
        className="h-10 w-auto max-w-[170px] object-contain drop-shadow-sm transition-transform group-hover:scale-[1.02]"
      />
      {showSubtitle && (
        <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider text-muted-foreground border-l border-border pl-2 leading-tight">
          Sentiment<br />Intelligence
        </span>
      )}
    </Link>
  );
}