import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthShell } from "@/components/site/auth-shell";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Github, Loader2 } from "lucide-react";
import { login, googleLogin } from "@/lib/auth-store";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup } from "firebase/auth";

import { useState } from "react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [
    { title: "Sign in — Lumina AI" },
    { name: "description", content: "Sign in to your Lumina AI workspace." },
  ]}),
  component: Page,
});

type FormData = { email: string; password: string; remember: boolean };

function Page() {
  const nav = useNavigate();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.email, data.password);
      toast.success("Welcome back!");
      nav({ to: "/dashboard" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setError("root", { message: msg });
      toast.error(msg);
    }
  };

  const onGoogle = async () => {
    if (isGoogleLoading) return;
    setIsGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      await googleLogin(idToken);
      toast.success("Signed in with Google!");
      nav({ to: "/dashboard" });
    } catch (err: any) {
      const errorCode = err?.code || "";
      const errorMessage = err?.message || "";

      if (errorCode === "auth/popup-closed-by-user") {
        toast.info("Google sign-in popup was closed.");
      } else if (errorCode === "auth/popup-blocked") {
        toast.error("Sign-in popup was blocked by your browser. Please allow popups for this site and try again.");
      } else if (errorCode === "auth/cancelled-popup-request") {
        // Ignored: another popup request was already pending
      } else if (
        errorMessage.includes("ERR_QUIC_PROTOCOL_ERROR") ||
        errorMessage.includes("QUIC_NETWORK_IDLE_TIMEOUT") ||
        errorCode === "auth/network-request-failed"
      ) {
        toast.error("Network timeout over QUIC. Please check your internet connection or disable QUIC in browser (chrome://flags/#enable-quic).");
      } else if (errorMessage.includes("INTERNAL ASSERTION FAILED")) {
        toast.error("Sign-in process was interrupted by a network timeout. Please try again.");
      } else {
        const msg = err instanceof Error ? err.message : "Google sign-in failed";
        toast.error(msg);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your Lumina workspace"
      footer={<>Don't have an account? <Link to="/signup" className="text-brand font-medium">Sign up</Link></>}
    >
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onGoogle}
          disabled={isGoogleLoading || isSubmitting}
          className="ring-1 ring-border py-2 rounded-lg text-sm font-medium hover:bg-muted disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isGoogleLoading ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />} Google
        </button>
        <button
          type="button"
          className="ring-1 ring-border py-2 rounded-lg text-sm font-medium hover:bg-muted flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
          disabled
        >
          <Github className="size-4" /> GitHub
        </button>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-px bg-border flex-1" /><span className="text-xs text-muted-foreground">OR</span><div className="h-px bg-border flex-1" />
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div>
          <input type="email" placeholder="Work email" {...register("email", { required: "Email is required" })} className="input-field" />
          {errors.email && <span className="text-xs text-danger">{errors.email.message}</span>}
        </div>
        <div>
          <input type="password" placeholder="Password" {...register("password", { required: "Password is required" })} className="input-field" />
          {errors.password && <span className="text-xs text-danger">{errors.password.message}</span>}
        </div>
        {errors.root && (() => {
          const msg = errors.root.message || "";
          const isPending = msg.toLowerCase().includes("awaiting") || msg.toLowerCase().includes("pending");
          const isRejected = msg.toLowerCase().includes("rejected");
          return (
            <div className={`text-xs rounded-lg px-3 py-2.5 border flex items-start gap-2 ${
              isPending
                ? "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-900/20 dark:border-amber-800"
                : isRejected
                ? "text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-900/20 dark:border-red-800"
                : "text-danger bg-danger/10 border-danger/20"
            }`}>
              <span className="text-base leading-none mt-0.5">{isPending ? "⏳" : isRejected ? "🚫" : "⚠️"}</span>
              <div>
                <p className="font-medium">{isPending ? "Account Pending Approval" : isRejected ? "Account Request Rejected" : "Login Failed"}</p>
                <p className="mt-0.5 opacity-80">{msg}</p>
              </div>
            </div>
          );
        })()}
        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-2"><input type="checkbox" {...register("remember")} /> Remember me</label>
          <span className="text-brand cursor-pointer">Forgot password?</span>
        </div>
        <button
          disabled={isSubmitting}
          className="w-full bg-brand text-white py-2.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isSubmitting ? <><Loader2 className="size-4 animate-spin" /> Signing in…</> : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.6c-.2 1.3-1 2.4-2.1 3.2v2.6h3.4c2-1.8 3.1-4.5 3.1-7.8z" fill="#4285F4"/><path d="M12 22c2.8 0 5.2-.9 6.9-2.5l-3.4-2.6c-.9.6-2.1 1-3.5 1-2.7 0-5-1.8-5.8-4.3H2.7v2.7A10 10 0 0012 22z" fill="#34A853"/><path d="M6.2 13.6c-.2-.6-.3-1.2-.3-1.9 0-.7.1-1.3.3-1.9V7.1H2.7A10 10 0 002 12c0 1.6.4 3.1 1 4.4l3.2-2.8z" fill="#FBBC05"/><path d="M12 5.8c1.5 0 2.9.5 3.9 1.5l3-3C17.2 2.6 14.8 2 12 2A10 10 0 002.7 7.1L6.2 9.8C7 7.6 9.3 5.8 12 5.8z" fill="#EA4335"/></svg>
  );
}