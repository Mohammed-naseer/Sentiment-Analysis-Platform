import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Command } from "cmdk";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Boxes, MessageSquare, Tag, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { products, recentReviews } from "@/lib/mock-data";

const categories = [
  { id: "c-saas", name: "SaaS" },
  { id: "c-retail", name: "Retail" },
  { id: "c-fintech", name: "Fintech" },
  { id: "c-hardware", name: "Hardware" },
  { id: "c-support", name: "Customer Support" },
  { id: "c-mobile", name: "Mobile Apps" },
  { id: "c-ecom", name: "E-commerce" },
  { id: "c-devtools", name: "Developer Tools" },
];

type Props = { open: boolean; onOpenChange: (v: boolean) => void };
type Filter = "all" | "reviews" | "products" | "categories";

const PAGE_SIZE = 5;

export function GlobalSearch({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!open) {
      setQ("");
      setFilter("all");
      setPage(0);
    }
  }, [open]);

  useEffect(() => {
    setPage(0);
  }, [q, filter]);

  const items = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filter = <T extends { name?: string; text?: string; author?: string; product?: string }>(arr: T[]) =>
      term
        ? arr.filter((x) =>
            [x.name, x.text, x.author, x.product].filter(Boolean).some((v) => v!.toLowerCase().includes(term)),
          )
        : arr;
    return {
      reviews: filter(recentReviews),
      products: filter(products),
      categories: term ? categories.filter((c) => c.name.toLowerCase().includes(term)) : categories,
    };
  }, [q]);

  const scoped = {
    reviews: filter === "all" || filter === "reviews" ? items.reviews : [],
    products: filter === "all" || filter === "products" ? items.products : [],
    categories: filter === "all" || filter === "categories" ? items.categories : [],
  };

  const paged = {
    reviews: filter === "reviews" ? scoped.reviews.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) : scoped.reviews.slice(0, 5),
    products: filter === "products" ? scoped.products.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) : scoped.products.slice(0, 5),
    categories: filter === "categories" ? scoped.categories.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) : scoped.categories.slice(0, 5),
  };

  const totalForFilter =
    filter === "reviews" ? scoped.reviews.length
      : filter === "products" ? scoped.products.length
      : filter === "categories" ? scoped.categories.length
      : scoped.reviews.length + scoped.products.length + scoped.categories.length;
  const pageCount = filter === "all" ? 1 : Math.max(1, Math.ceil(totalForFilter / PAGE_SIZE));

  const go = (to: string) => {
    onOpenChange(false);
    navigate({ to });
  };

  const empty = !paged.reviews.length && !paged.products.length && !paged.categories.length;

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "All", count: items.reviews.length + items.products.length + items.categories.length },
    { id: "reviews", label: "Reviews", count: items.reviews.length },
    { id: "products", label: "Products", count: items.products.length },
    { id: "categories", label: "Categories", count: items.categories.length },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-2xl overflow-hidden gap-0">
        <DialogTitle className="sr-only">Global search</DialogTitle>
        <Command loop shouldFilter={false} className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-muted-foreground">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Search className="size-4 text-muted-foreground" />
            <Command.Input
              value={q}
              onValueChange={setQ}
              placeholder="Search reviews, products, categories…"
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              autoFocus
            />
            <kbd className="hidden md:inline-flex text-[10px] font-mono text-muted-foreground border border-border rounded px-1.5 py-0.5">ESC</kbd>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border overflow-x-auto">
            {filters.map((f) => {
              const on = filter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`text-xs px-2.5 py-1 rounded-full ring-1 transition-colors whitespace-nowrap ${on ? "ring-brand/40 bg-brand/10 text-brand" : "ring-border text-muted-foreground hover:bg-muted"}`}
                >
                  {f.label}
                  <span className="ml-1 font-mono text-[10px] opacity-70">{f.count}</span>
                </button>
              );
            })}
            <div className="ml-auto text-[10px] font-mono text-muted-foreground hidden md:flex items-center gap-2">
              <span>↑↓ navigate</span>
              <span>↵ open</span>
            </div>
          </div>
          <Command.List className="max-h-96 overflow-y-auto p-2">
            {empty && <div className="p-8 text-center text-sm text-muted-foreground">No results for "{q}"</div>}
            {paged.reviews.length > 0 && (
              <Command.Group heading="Reviews">
                {paged.reviews.map((r) => (
                  <Command.Item key={r.id} value={r.id} onSelect={() => go("/dashboard/analysis")} className="flex items-start gap-3 px-3 py-2 rounded-md cursor-pointer data-[selected=true]:bg-muted">
                    <MessageSquare className="size-4 mt-0.5 text-brand" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{r.author} · {r.product}</div>
                      <div className="text-xs text-muted-foreground truncate">{r.text}</div>
                    </div>
                    <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${r.sentiment === "positive" ? "bg-success/10 text-success" : r.sentiment === "negative" ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"}`}>{r.sentiment}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
            {paged.products.length > 0 && (
              <Command.Group heading="Products">
                {paged.products.map((p) => (
                  <Command.Item key={p.id} value={p.id} onSelect={() => go("/dashboard/products")} className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer data-[selected=true]:bg-muted">
                    <Boxes className="size-4 text-accent-cyan" />
                    <div className="flex-1 text-sm font-medium">{p.name}</div>
                    <div className="text-xs font-mono text-muted-foreground">{p.rating.toFixed(1)} · {p.reviews.toLocaleString()} reviews</div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
            {paged.categories.length > 0 && (
              <Command.Group heading="Categories">
                {paged.categories.map((c) => (
                  <Command.Item key={c.id} value={c.id} onSelect={() => go("/dashboard/analytics")} className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer data-[selected=true]:bg-muted">
                    <Tag className="size-4 text-muted-foreground" />
                    <div className="text-sm">{c.name}</div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
          {filter !== "all" && totalForFilter > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs">
              <span className="text-muted-foreground font-mono">
                Page {page + 1} of {pageCount} · {totalForFilter} results
              </span>
              <div className="flex gap-1">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="size-7 grid place-items-center rounded ring-1 ring-border disabled:opacity-40 hover:bg-muted"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                <button
                  disabled={page >= pageCount - 1}
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  className="size-7 grid place-items-center rounded ring-1 ring-border disabled:opacity-40 hover:bg-muted"
                  aria-label="Next page"
                >
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>
          )}
        </Command>
      </DialogContent>
    </Dialog>
  );
}