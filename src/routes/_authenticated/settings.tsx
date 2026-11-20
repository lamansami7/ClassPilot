import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/queries";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/_authenticated/settings")({ component: Settings });
function Settings() {
  const { data: me } = useQuery(meQuery);
  const qc = useQueryClient();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [password, setPassword] = useState("");
  const [issue, setIssue] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (me?.profile) {
      setFirst(me.profile.first_name);
      setLast(me.profile.last_name);
    }
  }, [me?.profile]);
  async function profile() {
    if (!me) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ first_name: first.trim(), last_name: last.trim() })
        .eq("id", me.userId)
        .select("id")
        .single();
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("Profile updated");
    } catch {
      toast.error("Couldn't update profile.");
    } finally {
      setBusy(false);
    }
  }
  async function changePassword() {
    if (password.length < 8) {
      toast.error("Use at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      toast.success("Password updated");
    } catch {
      toast.error("Couldn't update password. You may need to sign in again.");
    } finally {
      setBusy(false);
    }
  }
  async function report() {
    if (!issue.trim() || !me) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("issue_reports")
        .insert({ student_id: me.userId, subject: "Student report", message: issue.trim() });
      if (error) throw error;
      setIssue("");
      toast.success("Issue submitted");
    } catch {
      toast.error("Couldn't submit your issue.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Settings</h1>
        <p className="mt-2 text-muted-foreground">Manage your profile and account.</p>
      </div>
      <section className="space-y-4 rounded-2xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Profile</h2>
        <label className="block text-sm">
          First name
          <Input value={first} onChange={(e) => setFirst(e.target.value)} />
        </label>
        <label className="block text-sm">
          Last name
          <Input value={last} onChange={(e) => setLast(e.target.value)} />
        </label>
        <p className="text-sm text-muted-foreground">
          {me?.email} · Grade {me?.profile?.grade ?? "not set"} ·{" "}
          {me?.school?.name ?? "School not set"}
        </p>
        <Button onClick={profile} disabled={busy || !first.trim() || !last.trim()}>
          Save profile
        </Button>
      </section>
      <section className="space-y-4 rounded-2xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Account security</h2>
        <label className="block text-sm">
          New password
          <Input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <Button onClick={changePassword} disabled={busy || !password}>
          Change password
        </Button>
      </section>
      <section className="space-y-4 rounded-2xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Report an issue</h2>
        <p className="text-sm text-muted-foreground">
          Avoid including private notes or sensitive information.
        </p>
        <Textarea
          aria-label="Issue description"
          value={issue}
          onChange={(e) => setIssue(e.target.value)}
          maxLength={5000}
        />
        <Button onClick={report} disabled={busy || !issue.trim()}>
          Submit report
        </Button>
      </section>
      <section className="rounded-2xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Privacy</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your study materials are private to your account. Contact the administrator for account
          and data deletion requests.
        </p>
      </section>
    </div>
  );
}
