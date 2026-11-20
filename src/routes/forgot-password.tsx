import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — ClassPilot AI" },
      { name: "description", content: "Get a link to reset your ClassPilot AI password." },
      { property: "og:title", content: "Reset your password — ClassPilot AI" },
      { property: "og:description", content: "Get a link to reset your ClassPilot AI password." },
    ],
  }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) setError("We couldn't send the email. Please try again in a minute.");
    else setSent(true);
  };
  return (
    <AuthLayout>
      {sent ? (
        <div className="text-center">
          <MailCheck className="mx-auto h-12 w-12 text-electric" />
          <h1 className="mt-4 text-2xl font-bold text-navy">Check your email</h1>
          <p className="mt-2 text-muted-foreground">If an account exists for {email}, a reset link is on its way.</p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/login">Back to log in</Link>
          </Button>
        </div>
      ) : (
        <>
          <h1 className="text-3xl font-bold text-navy">Forgot your password?</h1>
          <p className="mt-2 text-muted-foreground">Enter your school email and we'll send you a reset link.</p>
          <form onSubmit={submit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">School email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" variant="hero" size="xl" className="w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />} Send reset link
            </Button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
