import { useServerFn } from "@tanstack/react-start";
import { deleteMyAccount } from "@/lib/account.functions";
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
  const deleteAccount = useServerFn(deleteMyAccount);
  const [confirmation, setConfirmation] = useState("");
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
  async function exportWork() {
    if (
      !me ||
      !confirm(
        "This download contains private schoolwork. Save it only on a trusted device. Continue?",
      )
    )
      return;
    setBusy(true);
    try {
      const records: Record<string, unknown[]> = {};
      for (const table of [
        "student_courses",
        "folders",
        "notes",
        "study_guides",
        "worksheets",
        "quizzes",
        "flashcards",
        "tutor_threads",
        "tutor_messages",
        "saved_resources",
        "recordings",
      ] as const) {
        const rows: unknown[] = [];
        for (let offset = 0; ; offset += 250) {
          const { data, error } = await supabase
            .from(table)
            .select("*")
            .eq("student_id", me.userId)
            .order("id")
            .range(offset, offset + 249);
          if (error) throw error;
          rows.push(...data);
          if (data.length < 250) break;
        }
        records[table] = rows;
      }
      const url = URL.createObjectURL(
        new Blob(
          [
            JSON.stringify(
              { exportedAt: new Date().toISOString(), profile: me.profile, records },
              null,
              2,
            ),
          ],
          { type: "application/json" },
        ),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "classpilot-study-data.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Export ready");
    } catch {
      toast.error("Export failed. No partial file was downloaded.");
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
          and data deletion requests. Export includes profile, saved study data and recording
          metadata, not audio files.
        </p>
        <Button className="mt-4" variant="outline" disabled={busy} onClick={exportWork}>
          Download my study data
        </Button>
      </section>
      <section className="space-y-3 rounded-xl border bg-card p-6">
        <h2 className="font-semibold">Permanently delete account</h2>
        <p className="text-sm">
          Download anything you want to keep first. Deletion removes your files and study materials
          and cannot be undone. Recent password sign-in is required.
        </p>
        <label className="block text-sm">
          Type DELETE to confirm
          <Input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
        </label>
        <Button
          variant="destructive"
          disabled={busy || confirmation !== "DELETE"}
          onClick={async () => {
            if (!confirm("Permanently delete this account and its files?")) return;
            setBusy(true);
            try {
              const result = await deleteAccount();
              if (!result.ok) {
                toast.error(result.error);
                return;
              }
              qc.clear();
              await supabase.auth.signOut({ scope: "local" });
              window.location.assign("/");
            } catch {
              toast.error("Could not complete deletion. Contact support before retrying.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Delete my account
        </Button>
      </section>
    </div>
  );
}
