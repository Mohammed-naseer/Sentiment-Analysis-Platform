import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthShell } from "@/components/site/auth-shell";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Clock, CheckCircle2 } from "lucide-react";
import { register as registerUser } from "@/lib/auth-store";
import { useState } from "react";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [
    { title: "Create account — Lumina AI" },
    { name: "description", content: "Create your Lumina AI workspace in seconds." },
  ]}),
  component: Page,
});

type FormData = { name: string; email: string; password: string };

function Page() {
  const nav = useNavigate();
  const [pendingApproval, setPendingApproval] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    try {
      await registerUser(data.name, data.email, data.password);
      // First user auto-approved as Admin → go straight to dashboard
      toast.success("Admin workspace created! Welcome aboard 🎉");
      nav({ to: "/dashboard" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      // If the message indicates a pending approval state, show the pending screen
      if (msg.includes("Awaiting administrator approval") || msg.includes("Awaiting")) {
        setSubmittedEmail(data.email);
        setPendingApproval(true);
        return;
      }
      setError("root", { message: msg });
      toast.error(msg);
    }
  };

  if (pendingApproval) {
    return (
      <AuthShell
        title="Request Submitted"
        subtitle="Your registration request is pending review"
        footer={<>Already approved? <Link to="/login" className="text-brand font-medium">Sign in</Link></>}
      >
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="size-16 rounded-full bg-brand/10 border border-brand/20 grid place-items-center">
            <Clock className="size-8 text-brand animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold text-base">Awaiting Administrator Approval</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Your request for <span className="font-medium text-foreground">{submittedEmail}</span> has been received.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              An administrator will review your account and notify you via email once approved.
            </p>
          </div>
          <div className="w-full rounded-lg bg-muted/60 border border-border p-4 text-xs text-muted-foreground space-y-1.5 text-left">
            <div className="flex items-center gap-2"><CheckCircle2 className="size-3.5 text-brand shrink-0" /><span>Registration request received</span></div>
            <div className="flex items-center gap-2"><Clock className="size-3.5 text-muted-foreground shrink-0" /><span>Awaiting administrator approval</span></div>
            <div className="flex items-center gap-2"><Clock className="size-3.5 text-muted-foreground shrink-0" /><span>Email notification will be sent once approved</span></div>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your workspace"
      subtitle="Start analysing sentiment with AI in minutes"
      footer={<>Have an account? <Link to="/login" className="text-brand font-medium">Sign in</Link></>}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div>
          <input placeholder="Full name" {...register("name", { required: "Name is required" })} className="input-field" />
          {errors.name && <span className="text-xs text-danger">{errors.name.message}</span>}
        </div>
        <div>
          <input type="email" placeholder="Work email" {...register("email", { required: "Email is required" })} className="input-field" />
          {errors.email && <span className="text-xs text-danger">{errors.email.message}</span>}
        </div>
        <div>
          <input type="password" placeholder="Password (min 8 characters)" {...register("password", { required: "Password is required", minLength: { value: 8, message: "Minimum 8 characters" } })} className="input-field" />
          {errors.password && <span className="text-xs text-danger">{errors.password.message}</span>}
        </div>
        {errors.root && (
          <div className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
            {errors.root.message}
          </div>
        )}
        <button
          disabled={isSubmitting}
          className="w-full bg-brand text-white py-2.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isSubmitting ? <><Loader2 className="size-4 animate-spin" />Creating…</> : "Create account"}
        </button>
        <p className="text-[10px] text-muted-foreground text-center">By continuing you agree to our Terms and Privacy Policy.</p>
      </form>
    </AuthShell>
  );
}