import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Log in — ClassPilot AI" },
      { name: "description", content: "Log in to ClassPilot AI to open your classes, notes and study tools." },
      { property: "og:title", content: "Log in — ClassPilot AI" },
      { property: "og:description", content: "Log in to your ClassPilot AI student account." },
    ],
  }),
  component: LoginPage,
});

function safeRedirect(path: string | undefined) {
  return path && path.startsWith("/") && !path.startsWith("//") ? path : "/dashboard";
}

function LoginPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      setError(
        /confirm/i.test(error.message)
          ? "Please verify your email first — check your inbox for the link we sent."
          : "That email and password don't match. Try again or reset your password.",
      );
      return;
    }
    toast.success("Welcome back!");
    navigate({ to: safeRedirect(redirect) });
  };

  return (
    <AuthLayout>
      <h1 className="text-3xl font-bold text-navy">Welcome back</h1>
      <p className="mt-2 text-muted-foreground">Log in with your school email to continue learning.</p>
      <form onSubmit={submit} className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">School email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@wdmcs.org" className="h-11" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-sm font-medium text-electric hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
        </div>
        {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <Button type="submit" variant="hero" size="xl" className="w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />} Log in
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to ClassPilot AI?{" "}
        <Link to="/signup" className="font-semibold text-electric hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
