import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { findResources, type LearningResource } from "@/lib/resources.functions";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId } from "@/lib/use-user";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/_authenticated/resources")({ component: Resources });
function Resources() {
  const [topic, setTopic] = useState("");
  const [results, setResults] = useState<LearningResource[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const search = useServerFn(findResources);
  const qc = useQueryClient();
  const saved = useQuery({
    queryKey: ["saved-resources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_resources")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  async function run() {
    setBusy(true);
    setError("");
    setResults(null);
    try {
      const res = await search({ data: { topic: topic.trim(), courseName: null } });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResults(res.data.resources);
    } catch {
      setError("Couldn't search right now. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function save(r: LearningResource) {
    try {
      const user = await currentUserId();
      const { error } = await supabase.from("saved_resources").insert({
        student_id: user,
        title: r.title,
        url: r.url,
        description: r.description,
        source: r.source,
        kind: r.kind,
        topic: topic.trim(),
      });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["saved-resources"] });
      toast.success("Resource saved");
    } catch {
      toast.error("Couldn't save resource.");
    }
  }
  async function remove(id: string) {
    if (!confirm("Remove this saved resource?")) return;
    const { error } = await supabase.from("saved_resources").delete().eq("id", id);
    if (error) toast.error("Couldn't remove resource.");
    else await qc.invalidateQueries({ queryKey: ["saved-resources"] });
  }
  return (
    <div className="space-y-7">
      <div>
        <h1 className="font-display text-3xl font-bold">Find resources</h1>
        <p className="mt-2 text-muted-foreground">
          Search the web for lessons, videos and tutorials.
        </p>
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
      >
        <Input
          aria-label="Topic to search"
          placeholder="e.g. balancing equations"
          value={topic}
          maxLength={200}
          onChange={(e) => setTopic(e.target.value)}
        />
        <Button disabled={busy || topic.trim().length < 2}>{busy ? "Searching…" : "Search"}</Button>
      </form>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {results && (
        <section>
          <h2 className="text-xl font-bold">Search results</h2>
          {!results.length ? (
            <p className="mt-3 text-muted-foreground">No results found.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {results.map((r) => (
                <div key={r.url} className="rounded-xl border p-4">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-electric hover:underline"
                  >
                    {r.title} ↗
                  </a>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.source} · {r.kind}
                  </p>
                  <p className="mt-2 text-sm">{r.description}</p>
                  <Button className="mt-3" variant="outline" size="sm" onClick={() => save(r)}>
                    Save resource
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      <section>
        <h2 className="text-xl font-bold">Saved resources</h2>
        <div className="mt-3 space-y-3">
          {saved.isLoading ? (
            <p>Loading…</p>
          ) : saved.isError ? (
            <p>Couldn't load saved resources.</p>
          ) : !saved.data?.length ? (
            <p className="text-muted-foreground">No saved resources yet.</p>
          ) : (
            saved.data.map((r) => (
              <div key={r.id} className="rounded-xl border p-4">
                <a
                  href={r.url.startsWith("https://") ? r.url : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-electric"
                >
                  {r.title} ↗
                </a>
                <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
                <Button className="mt-3" variant="outline" size="sm" onClick={() => remove(r.id)}>
                  Remove
                </Button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
