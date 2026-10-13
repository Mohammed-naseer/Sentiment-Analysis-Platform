import { createFileRoute } from "@tanstack/react-router";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Star, Search, Plus, Pencil, Trash2, RefreshCw, X, Package } from "lucide-react";
import { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useCan } from "@/lib/rbac";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/dashboard/products")({
  component: Page,
});

// ─── Types ────────────────────────────────────────────────────────────────────
interface Product {
  _id: string;
  name: string;
  category: string;
  description?: string;
  price: number;
  currency: string;
  rating: number;
  reviewsCount: number;
  positivePercentage: number;
  negativePercentage: number;
  neutralPercentage: number;
  createdBy?: { name: string; email: string };
  createdAt: string;
}

interface ProductsApiResponse {
  success: boolean;
  data: { products: Product[] };
}

const CATEGORIES = ["All", "SaaS", "Retail", "E-commerce", "Healthcare", "Finance", "Education", "Enterprise", "General", "Other"];

const gradients = [
  "from-brand/20 via-accent-cyan/10 to-transparent",
  "from-purple-500/20 via-pink-500/10 to-transparent",
  "from-emerald-500/20 via-teal-500/10 to-transparent",
  "from-orange-500/20 via-amber-500/10 to-transparent",
  "from-blue-500/20 via-indigo-500/10 to-transparent",
  "from-rose-500/20 via-red-500/10 to-transparent",
];

function getGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return gradients[Math.abs(hash) % gradients.length];
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 3).toUpperCase();
}

function formatINR(amount: number) {
  if (amount === 0) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

// ─── Empty Form State ─────────────────────────────────────────────────────────
const emptyForm = { name: "", category: "General", description: "", price: "", currency: "INR" };

// ─── Page ─────────────────────────────────────────────────────────────────────
function Page() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("newest");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formLoading, setFormLoading] = useState(false);
  const [toDelete, setToDelete] = useState<Product | null>(null);

  const canWrite = useCan("analysis:run"); // Analyst+ can create/edit products
  const canDelete = useCan("users:delete"); // Admin only can delete

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (category !== "All") params.set("category", category);
      if (sort) params.set("sort", sort);

      const res = await api.get<ProductsApiResponse>(`/api/products?${params.toString()}`);
      setProducts(res.data?.products || []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [q, category, sort]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Client-side filter (for instant response on existing data)
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term && category === "All") return products;
    return products.filter((p) => {
      const matchQ = !term || p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term);
      const matchCat = category === "All" || p.category === category;
      return matchQ && matchCat;
    });
  }, [products, q, category]);

  // ── Open modal ────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditTarget(p);
    setForm({ name: p.name, category: p.category, description: p.description || "", price: String(p.price), currency: p.currency || "INR" });
    setModalOpen(true);
  };

  // ── Save (create or update) ───────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Product name is required"); return; }
    if (!form.category.trim()) { toast.error("Category is required"); return; }
    setFormLoading(true);
    try {
      if (editTarget) {
        await api.put(`/api/products/${editTarget._id}`, { ...form, price: Number(form.price) || 0 });
        toast.success("Product updated");
      } else {
        await api.post("/api/products", { ...form, price: Number(form.price) || 0 });
        toast.success("Product created");
      }
      setModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save product");
    } finally {
      setFormLoading(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await api.delete(`/api/products/${toDelete._id}`);
      setProducts((prev) => prev.filter((p) => p._id !== toDelete._id));
      toast.success(`"${toDelete.name}" deleted`);
      setToDelete(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete product");
      setToDelete(null);
    }
  };

  return (
    <>
      <DashboardTopbar title="Products" />
      <div className="p-6 space-y-6 max-w-[1600px] w-full mx-auto">
        {/* Header bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48 max-w-md">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products…"
              className="input-field pl-9"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input-field max-w-40"
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c === "All" ? "All categories" : c}</option>)}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="input-field max-w-40"
          >
            <option value="newest">Sort: Newest</option>
            <option value="reviews">Sort: Reviews</option>
            <option value="rating">Sort: Rating</option>
            <option value="positive">Sort: Positive %</option>
          </select>
          <button
            onClick={fetchProducts}
            className="p-2 rounded-lg ring-1 ring-border hover:bg-muted transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          {canWrite && (
            <button
              onClick={openCreate}
              className="bg-brand text-white text-sm px-4 py-2 rounded-lg font-medium hover:opacity-90 inline-flex items-center gap-1.5"
            >
              <Plus className="size-4" /> Add product
            </button>
          )}
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="p-20 text-center text-muted-foreground text-sm">
            <div className="size-10 border-2 border-brand/30 border-t-brand rounded-full animate-spin mx-auto mb-3" />
            Loading products…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-20 text-center">
            <Package className="size-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              {q || category !== "All" ? "No products match your filters." : "No products yet. Create your first product!"}
            </p>
            {canWrite && (
              <button onClick={openCreate} className="mt-4 bg-brand text-white px-6 py-2 rounded-lg text-sm font-medium hover:opacity-90 inline-flex items-center gap-2">
                <Plus className="size-4" /> Add product
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((p) => (
              <div
                key={p._id}
                className="p-5 rounded-xl bg-card ring-1 ring-border hover:shadow-lg hover:-translate-y-0.5 transition-all group"
              >
                {/* Product Banner */}
                <div className={`h-28 rounded-lg bg-gradient-to-br ${getGradient(p.name)} mb-4 grid place-items-center relative`}>
                  <span className="text-2xl font-bold text-foreground/30 font-mono tracking-wide">
                    {initials(p.name)}
                  </span>
                  <span className="absolute top-2 right-2 text-[10px] font-mono bg-background/70 backdrop-blur-sm px-2 py-0.5 rounded-full text-muted-foreground">
                    {p.category}
                  </span>
                </div>

                {/* Name + Rating */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold tracking-tight truncate">{p.name}</h3>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Star className="size-3 fill-warning text-warning shrink-0" />
                      <span>{p.rating.toFixed(1)}</span>
                      <span className="text-muted-foreground/50">·</span>
                      <span>{p.reviewsCount.toLocaleString("en-IN")} reviews</span>
                    </div>
                  </div>
                  {p.price > 0 && (
                    <div className="text-sm font-semibold text-brand shrink-0">{formatINR(p.price)}</div>
                  )}
                </div>

                {/* Description */}
                {p.description && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{p.description}</p>
                )}

                {/* Sentiment Bars */}
                <div className="mt-4 space-y-2">
                  <Bar label="Positive" value={p.positivePercentage} color="bg-success" />
                  <Bar label="Negative" value={p.negativePercentage} color="bg-danger" />
                  <Bar label="Neutral" value={p.neutralPercentage} color="bg-warning" />
                </div>

                {/* Action buttons */}
                <div className="mt-4 flex gap-2">
                  <button className="flex-1 bg-brand/10 text-brand py-2 rounded-lg text-sm font-medium hover:bg-brand hover:text-white transition-colors">
                    View details
                  </button>
                  {canWrite && (
                    <button
                      onClick={() => openEdit(p)}
                      className="ring-1 ring-border px-3 rounded-lg hover:bg-muted transition-colors"
                      title="Edit product"
                    >
                      <Pencil className="size-4" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => setToDelete(p)}
                      className="ring-1 ring-border px-3 rounded-lg hover:bg-danger/10 hover:text-danger hover:ring-danger/40 transition-colors"
                      title="Delete product"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create / Edit Product Modal ── */}
      <Dialog open={modalOpen} onOpenChange={(o) => !o && setModalOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Product" : "Add New Product"}</DialogTitle>
            <DialogDescription>
              {editTarget ? `Editing "${editTarget.name}"` : "Create a new product to track sentiment and reviews."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Product Name *</span>
              <input
                id="product-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Lumina Analytics Pro"
                className="input-field mt-1.5"
              />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Category *</span>
                <select
                  id="product-category"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="input-field mt-1.5"
                >
                  {CATEGORIES.filter((c) => c !== "All").map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Price (₹)</span>
                <input
                  id="product-price"
                  type="number"
                  min="0"
                  step="100"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="0"
                  className="input-field mt-1.5"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Description</span>
              <textarea
                id="product-description"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of the product…"
                className="input-field mt-1.5 resize-none"
              />
            </label>
          </div>
          <DialogFooter>
            <button onClick={() => setModalOpen(false)} className="ring-1 ring-border px-4 py-2 rounded-lg text-sm hover:bg-muted">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={formLoading}
              className="bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-60 inline-flex items-center gap-2"
            >
              {formLoading ? <><div className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</> : editTarget ? "Save changes" : "Create product"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete "{toDelete?.name}"?</DialogTitle>
            <DialogDescription>
              This will permanently remove the product and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={() => setToDelete(null)} className="ring-1 ring-border px-4 py-2 rounded-lg text-sm hover:bg-muted">Cancel</button>
            <button onClick={confirmDelete} className="bg-danger text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">Delete</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{value}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}