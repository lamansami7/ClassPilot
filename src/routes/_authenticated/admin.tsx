import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { meQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({ component: Admin });
function Admin() {
  const me = useQuery(meQuery);
  return me.data?.isAdmin ? <Controls /> : <p role="alert">Administrator access required.</p>;
}
function Controls() {
  const qc = useQueryClient();
  const [panel, setPanel] = useState<"schools" | "courses" | "reports" | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("pending");
  const [busy, setBusy] = useState(false);
  const dashboard = useQuery({
    queryKey: ["admin", status],
    queryFn: async () => {
      const [stats, queue, settings] = await Promise.all([
        supabase.rpc("admin_platform_stats"),
        supabase
          .from("profiles")
          .select("id,email,grade")
          .eq("eligibility_status", status)
          .order("created_at")
          .limit(100),
        supabase.from("app_settings").select("require_admin_approval").eq("id", 1).single(),
      ]);
      if (stats.error || queue.error || settings.error || !settings.data)
        throw Error("Unavailable");
      return {
        stats: stats.data as Record<string, number>,
        queue: queue.data,
        approval: settings.data.require_admin_approval,
      };
    },
  });
  async function change(action: () => PromiseLike<{ error: unknown }>, confirmation: string) {
    if (!confirm(confirmation)) return;
    setBusy(true);
    try {
      const { error } = await action();
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Updated");
    } catch {
      toast.error("Update failed. Refresh and retry.");
    } finally {
      setBusy(false);
    }
  }
  const records = useQuery({
    queryKey: ["admin", "directory", panel],
    enabled: !!panel,
    queryFn: async () => {
      if (panel === "schools") {
        const { data, error } = await supabase
          .from("schools")
          .select("id,name,active")
          .order("name");
        if (error) throw error;
        return data;
      }
      if (panel === "courses") {
        const { data, error } = await supabase
          .from("courses")
          .select("id,course_name,active")
          .eq("is_custom", false)
          .order("course_name");
        if (error) throw error;
        return data.map((c) => ({ id: c.id, name: c.course_name, active: c.active }));
      }
      const { data, error } = await supabase
        .from("issue_reports")
        .select("id,subject,message,status")
        .neq("status", "resolved")
        .order("created_at")
        .limit(100);
      if (error) throw error;
      return data.map((r) => ({ id: r.id, name: r.subject + ": " + r.message, active: true }));
    },
  });
  const data = dashboard.data;
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Administration</h1>
        <p className="mt-2 text-muted-foreground">
          Manage platform access without opening private student work.
        </p>
      </header>
      {dashboard.isError ? (
        <Button onClick={() => dashboard.refetch()}>Retry loading administration</Button>
      ) : !data ? (
        <p>Loading access controls…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {(["students", "approved", "pending", "ai_requests_7d"] as const).map((k, i) => (
              <div key={k} className="rounded-xl border bg-card p-4">
                <strong className="block text-2xl">{data.stats[k]}</strong>
                {["Accounts", "Approved", "Awaiting review", "AI requests · week"][i]}
              </div>
            ))}
          </div>
          <section className="space-y-3 rounded-xl border bg-card p-5">
            <h2 className="font-semibold">Enrollment review</h2>
            <p>
              Manual approval for new accounts is {data.approval ? "on" : "off"}. A district email
              and a guardian acknowledgment are not proof of enrollment or verified consent.
            </p>
            {!data.approval && (
              <Button
                disabled={busy}
                onClick={() =>
                  change(
                    () =>
                      supabase
                        .from("app_settings")
                        .update({ require_admin_approval: true })
                        .eq("id", 1)
                        .select("id")
                        .single(),
                    "Require manual approval for future student accounts? Existing accounts are not changed.",
                  )
                }
              >
                Require manual review
              </Button>
            )}
          </section>
          <section className="rounded-xl border bg-card p-5">
            <label className="font-semibold">
              Student access{" "}
              <select
                className="ml-2 rounded border bg-background p-2"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Access revoked</option>
              </select>
            </label>
            <p className="my-3 text-sm text-muted-foreground">
              Showing up to 100 accounts. Verify eligibility through an authorized district process
              before approval.
            </p>
            {!data.queue.length && <p>No accounts in this group.</p>}
            {data.queue.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 border-t py-3"
              >
                <span className="break-all">
                  {p.email} · Grade {p.grade ?? "—"}
                </span>
                <div className="flex gap-2">
                  {["approved", "rejected"]
                    .filter((v) => v !== status)
                    .map((v) => (
                      <Button
                        key={v}
                        disabled={busy}
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          change(
                            () =>
                              supabase
                                .from("profiles")
                                .update({ eligibility_status: v })
                                .eq("id", p.id)
                                .eq("eligibility_status", status)
                                .select("id")
                                .single(),
                            `Set ${p.email} to ${v}?`,
                          )
                        }
                      >
                        {v === "approved" ? "Approve" : "Revoke access"}
                      </Button>
                    ))}
                </div>
              </div>
            ))}
          </section>
          <section className="space-y-3 rounded-xl border bg-card p-5">
            <h2 className="font-semibold">Catalog and support</h2>
            <div className="flex flex-wrap gap-2">
              {(["schools", "courses", "reports"] as const).map((item) => (
                <Button
                  variant={panel === item ? "soft" : "outline"}
                  key={item}
                  onClick={() => {
                    setSearch("");
                    setPanel(item);
                  }}
                >
                  {item === "reports"
                    ? "Open reports"
                    : item === "courses"
                      ? "District courses"
                      : "Schools"}
                </Button>
              ))}
            </div>
            {panel && (
              <>
                <input
                  className="w-full rounded-md border p-2"
                  aria-label="Filter directory"
                  placeholder="Filter by name or text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {records.isLoading ? (
                  "Loading…"
                ) : records.isError ? (
                  <Button onClick={() => records.refetch()}>Retry</Button>
                ) : (
                  <div className="max-h-96 overflow-auto">
                    {!records.data?.some((r) =>
                      r.name.toLowerCase().includes(search.toLowerCase()),
                    ) && <p>No matches.</p>}
                    {records.data
                      ?.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
                      .map((r) => (
                        <div
                          className="flex flex-wrap items-center justify-between gap-2 border-t py-3"
                          key={r.id}
                        >
                          <span className="break-words">{r.name}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() =>
                              change(
                                () =>
                                  panel === "reports"
                                    ? supabase
                                        .from("issue_reports")
                                        .update({ status: "resolved" })
                                        .eq("id", r.id)
                                        .select("id")
                                        .single()
                                    : supabase
                                        .from(panel)
                                        .update({ active: !r.active })
                                        .eq("id", r.id)
                                        .select("id")
                                        .single(),
                                panel === "reports"
                                  ? "Mark this submitted report as resolved?"
                                  : `${r.active ? "Hide" : "Show"} ${r.name} in selection lists?`,
                              )
                            }
                          >
                            {panel === "reports"
                              ? "Resolve"
                              : r.active
                                ? "Hide listing"
                                : "Show listing"}
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
