import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { useAuth, logout, updateAuthUser } from "@/lib/auth-store";
import { api } from "@/lib/api";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, LogOut } from "lucide-react";

export const Route = createFileRoute("/dashboard/settings")({
  component: Page,
});

type ProfileForm = { name: string };

function Page() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<ProfileForm>({
    defaultValues: { name: user?.name ?? "" },
  });

  const onSave = async (data: ProfileForm) => {
    try {
      await api.put("/api/profile", { name: data.name });
      updateAuthUser({ name: data.name });
      toast.success("Profile updated!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  const onLogout = async () => {
    await logout();
    toast.success("Signed out");
    nav({ to: "/login" });
  };

  return (
    <>
      <DashboardTopbar title="Settings" />
      <div className="p-6 max-w-3xl w-full mx-auto space-y-6">

        <Card title="Profile" desc="Update your personal details visible across the workspace.">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-full bg-gradient-to-br from-brand to-accent-cyan grid place-items-center text-white text-lg font-semibold">
              {user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2) ?? "?"}
            </div>
          </div>
          <form onSubmit={handleSubmit(onSave)} className="grid sm:grid-cols-2 gap-3">
            <Field label="Full name">
              <input className="input-field" {...register("name", { required: true })} />
            </Field>
            <Field label="Email">
              <input className="input-field" defaultValue={user?.email ?? ""} readOnly disabled />
            </Field>
            <div className="sm:col-span-2">
              <button
                disabled={isSubmitting}
                className="bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-60 flex items-center gap-2"
              >
                {isSubmitting ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : "Save changes"}
              </button>
            </div>
          </form>
        </Card>

        <Card title="Preferences" desc="Personalize your Lumina experience.">
          <Field label="Language"><select className="input-field"><option>English (US)</option><option>Español</option></select></Field>
          <Field label="Theme"><select className="input-field"><option>System</option><option>Light</option><option>Dark</option></select></Field>
        </Card>

        <Card title="Notifications" desc="Choose what lands in your inbox.">
          <Toggle label="Weekly digest" defaultChecked />
          <Toggle label="Aspect drift alerts" defaultChecked />
          <Toggle label="Product update newsletter" />
        </Card>

        <Card title="Security" desc="Protect your account with additional layers.">
          <Field label="Change password"><input type="password" className="input-field" placeholder="New password" /></Field>
          <Toggle label="Two-factor authentication" defaultChecked />
        </Card>

        <div className="p-6 rounded-xl bg-danger/5 ring-1 ring-danger/30 space-y-3">
          <div className="font-semibold text-danger">Danger zone</div>
          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={onLogout}
              className="flex items-center gap-2 bg-muted border border-border px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted/80"
            >
              <LogOut className="size-4" /> Sign out
            </button>
            <button className="bg-danger text-white text-sm px-4 py-2 rounded-lg font-medium hover:opacity-90">
              Delete account
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Permanently removes your workspace and all data. Cannot be undone.</p>
        </div>
      </div>
    </>
  );
}

function Card({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="p-6 rounded-xl bg-card ring-1 ring-border space-y-4">
      <div>
        <h3 className="font-semibold tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function Toggle({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm">{label}</span>
      <input type="checkbox" defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="relative w-10 h-6 bg-muted rounded-full peer-checked:bg-brand transition-colors before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:size-5 before:bg-white before:rounded-full before:transition-transform peer-checked:before:translate-x-4 cursor-pointer" />
    </label>
  );
}