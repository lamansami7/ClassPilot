import { createFileRoute, Link, useNavigate, useBlocker } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { improveNotes } from "@/lib/ai.functions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/notes/$noteId")({ component: NotePage });
function NotePage() {
  const { noteId } = Route.useParams();
  return <NoteEditor key={noteId} noteId={noteId} />;
}
function NoteEditor({ noteId }: { noteId: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const note = useQuery({
    queryKey: ["note", noteId],
    queryFn: async () => {
      const { data, error } = await supabase.from("notes").select("*").eq("id", noteId).single();
      if (error) throw error;
      return data;
    },
  });
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [improving, setImproving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const improve = useServerFn(improveNotes);
  useEffect(() => {
    if (note.data && !initialized) {
      setTitle(note.data.title);
      setContent(note.data.content);
      setTopic(note.data.topic ?? "");
      setInitialized(true);
    }
  }, [note.data, initialized]);
  const dirty =
    initialized &&
    (title !== note.data?.title ||
      content !== note.data?.content ||
      topic !== (note.data?.topic ?? ""));
  useBlocker({
    shouldBlockFn: () =>
      dirty && !window.confirm("You have unsaved changes. Leave without saving?"),
    enableBeforeUnload: dirty,
  });
  useEffect(() => {
    if (!dirty || busy || saveFailed) return;
    const timer = window.setTimeout(() => {
      void save();
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [dirty, busy, saveFailed, title, content, topic]);
  async function save() {
    setBusy(true);
    setSaveFailed(false);
    try {
      const { data, error } = await supabase
        .from("notes")
        .update({
          title: title.trim() || "Untitled note",
          content,
          content_text: content,
          topic: topic.trim() || null,
        })
        .eq("id", noteId)
        .select("*")
        .single();
      if (error) throw error;
      qc.setQueryData(["note", noteId], data);
      await qc.invalidateQueries({ queryKey: ["notes"] });
      setTitle((latest) => latest === title ? data.title : latest);
      setTopic((latest) => latest === topic ? data.topic ?? "" : latest);
    } catch {
      setSaveFailed(true);
      toast.error("Couldn't save. Your changes remain in the editor; please retry.");
    } finally {
      setBusy(false);
    }
  }
  async function requestImprovement() {
    if (!content.trim()) return;
    setImproving(true);
    try {
      const res = await improve({
        data: { html: content, courseId: note.data?.course_id ?? null },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const doc = new DOMParser().parseFromString(res.data.html, "text/html");
      doc.querySelectorAll("script,style").forEach((el) => el.remove());
      const text = (doc.body.innerText || doc.body.textContent || "").trim();
      if (!text) {
        toast.error("The AI returned empty notes.");
        return;
      }
      setPreview(text);
    } catch {
      toast.error("Couldn't improve notes. Your original is unchanged.");
    } finally {
      setImproving(false);
    }
  }
  async function remove() {
    if (!window.confirm("Delete this note permanently?")) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("notes")
        .delete()
        .eq("id", noteId)
        .select("id")
        .single();
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["notes"] });
      await qc.invalidateQueries({ queryKey: ["my-courses"] });
      navigate({ to: "/notes", ignoreBlocker: true });
    } catch {
      toast.error("Couldn't delete this note.");
      setBusy(false);
    }
  }
  if (note.isLoading || (!initialized && !note.isError)) return <p>Loading note…</p>;
  if (note.isError)
    return (
      <p className="text-destructive">Couldn't load this note. It may no longer be available.</p>
    );
  return (
    <div className="space-y-5">
      <Link to="/notes" className="text-sm font-medium text-electric">
        ← Back to notes
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Edit note</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {busy
              ? "Saving…"
              : saveFailed
                ? "Save failed — retry"
                : dirty
                  ? "Unsaved changes"
                  : "Saved"}
          </span>
          <Button variant="outline" onClick={remove} disabled={busy}>
            Delete
          </Button>
          <Button onClick={save} disabled={busy || !dirty}>
            Save changes
          </Button>
        </div>
      </div>
      <label className="block text-sm font-medium">
        Title
        <Input
          className="mt-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label className="block text-sm font-medium">
        Topic
        <Input
          className="mt-2"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
      </label>
      <label className="block text-sm font-medium">
        Notes
        <Textarea
          className="mt-2 min-h-[420px] resize-y"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start writing…"
        />
      </label>
      <Button
        variant="outline"
        onClick={requestImprovement}
        disabled={improving || !content.trim()}
      >
        {improving ? "Improving…" : "Improve with AI"}
      </Button>
      {preview !== null && (
        <section className="space-y-3 rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Review AI suggestion</h2>
          <p className="text-sm text-muted-foreground">
            Review for accuracy. Applying replaces your current text and will autosave.
          </p>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-sm">{preview}</pre>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                if (window.confirm("Replace your current note with this suggestion?")) {
                  setContent(preview);
                  setSaveFailed(false);
                  setPreview(null);
                }
              }}
            >
              Apply suggestion
            </Button>
            <Button variant="outline" onClick={() => setPreview(null)}>
              Discard
            </Button>
          </div>
        </section>
      )}
      <p className="text-xs text-muted-foreground">
        Changes autosave after you pause typing. Last saved{" "}
        {new Date(note.data!.updated_at).toLocaleString()}.
      </p>
    </div>
  );
}
