import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { ArrowLeft, Bold, Check, Highlighter, Italic, List, ListChecks, ListOrdered, Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { myCoursesQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/notes/$noteId")({
  component: NoteEditorPage,
});

type SaveState = "saved" | "dirty" | "saving" | "error";

function NoteEditorPage() {
  const { noteId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const classes = useQuery(myCoursesQuery);
  const note = useQuery({
    queryKey: ["notes", noteId],
    queryFn: async () => {
      const { data, error } = await supabase.from("notes").select("*").eq("id", noteId).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("This note was not found or is no longer available.");
      return data;
    },
  });
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [courseId, setCourseId] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const latest = useRef({ title: "", topic: "", courseId: "", content: "", contentText: "" });
  const dirty = useRef(false);
  const saving = useRef(false);
  const loadedId = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedRef = useRef<(force?: boolean) => Promise<void>>(async () => {});

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: false }),
      Highlight,
      Placeholder.configure({ placeholder: "Write your class notes here…" }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: "",
    immediatelyRender: false,
    onUpdate: ({ editor: current }) => {
      latest.current.content = current.getHTML();
      latest.current.contentText = current.getText();
      markDirty();
    },
  });

  function markDirty() {
    dirty.current = true;
    setSaveState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void savedRef.current(), 850);
  }

  useEffect(() => {
    if (!note.data || !editor || loadedId.current === noteId) return;
    loadedId.current = noteId;
    setTitle(note.data.title);
    setTopic(note.data.topic ?? "");
    setCourseId(note.data.course_id ?? "");
    latest.current = { title: note.data.title, topic: note.data.topic ?? "", courseId: note.data.course_id ?? "", content: note.data.content ?? "", contentText: note.data.content_text ?? "" };
    editor.commands.setContent(note.data.content || "", { emitUpdate: false });
    dirty.current = false;
    setSaveState("saved");
  }, [note.data, noteId, editor]);

  const save = useCallback(async (force = false) => {
    if (timer.current) clearTimeout(timer.current);
    if (saving.current) return;
    if (!dirty.current && !force) return;
    saving.current = true;
    setSaveState("saving");
    let failed = false;
    try {
      do {
        dirty.current = false;
        const snapshot = { ...latest.current };
        const { data, error } = await supabase.from("notes").update({
          title: snapshot.title.trim() || "Untitled note",
          topic: snapshot.topic.trim() || null,
          course_id: snapshot.courseId || null,
          content: snapshot.content,
          content_text: snapshot.contentText,
        }).eq("id", noteId).select("id").maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("This note is no longer available.");
        await qc.invalidateQueries({ queryKey: ["notes"] });
        if (dirty.current) setSaveState("saving");
      } while (dirty.current);
      setSaveState("saved");
    } catch {
      failed = true;
      dirty.current = true;
      setSaveState("error");
    } finally {
      saving.current = false;
      if (dirty.current && !failed) timer.current = setTimeout(() => void savedRef.current(), 250);
    }
  }, [noteId, qc, saveState]);
  savedRef.current = save;

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (dirty.current) void savedRef.current();
  }, []);

  const updateTitle = (value: string) => { setTitle(value); latest.current.title = value; markDirty(); };
  const updateTopic = (value: string) => { setTopic(value); latest.current.topic = value; markDirty(); };
  const updateCourse = (value: string) => { setCourseId(value); latest.current.courseId = value === "unassigned" ? "" : value; markDirty(); };

  const remove = async () => {
    if (!window.confirm("Delete this note? This cannot be undone.")) return;
    const { error } = await supabase.from("notes").delete().eq("id", noteId);
    if (error) return toast.error("The note couldn’t be deleted. Please try again.");
    await qc.invalidateQueries({ queryKey: ["notes"] });
    toast.success("Note deleted");
    navigate({ to: "/notes" });
  };

  const saveLabel = useMemo(() => {
    if (saveState === "saving") return <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>;
    if (saveState === "dirty") return "Unsaved changes";
    if (saveState === "error") return "Save failed — retry";
    return <><Check className="h-4 w-4" /> Saved</>;
  }, [saveState]);

  if (note.isLoading) return <p role="status">Loading note…</p>;
  if (note.isError) return <div><PageHeader title="Couldn’t open this note" description={note.error.message} /><Button asChild variant="soft"><Link to="/notes"><ArrowLeft /> Back to notes</Link></Button></div>;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Button asChild variant="ghost"><Link to="/notes"><ArrowLeft /> All notes</Link></Button>
      <div className="flex items-center gap-2">
        <span role="status" aria-live="polite" className={`flex items-center gap-1.5 text-sm ${saveState === "error" ? "text-destructive" : "text-muted-foreground"}`}>{saveLabel}</span>
        <Button variant="soft" onClick={() => void save(true)} disabled={saveState === "saving"}><Save /> Save now</Button>
        <Button variant="ghost" onClick={() => void remove()} aria-label="Delete note"><Trash2 /></Button>
      </div>
    </div>
    <Card><CardContent className="space-y-4 p-4 sm:p-6">
      <Input aria-label="Note title" className="h-auto border-0 px-0 text-2xl font-bold text-navy shadow-none focus-visible:ring-0" value={title} onChange={(e) => updateTitle(e.target.value)} placeholder="Untitled note" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5"><Label htmlFor="note-topic">Topic</Label><Input id="note-topic" value={topic} onChange={(e) => updateTopic(e.target.value)} placeholder="Add a topic" /></div>
        <div className="space-y-1.5"><Label>Class</Label><Select value={courseId || "unassigned"} onValueChange={updateCourse}><SelectTrigger aria-label="Assign note to class"><SelectValue placeholder="Choose a class" /></SelectTrigger><SelectContent><SelectItem value="unassigned">Unassigned</SelectItem>{(classes.data ?? []).map((course) => <SelectItem key={course.id} value={course.id}>{course.course_name}</SelectItem>)}</SelectContent></Select></div>
      </div>
      <Separator />
      <div className="flex flex-wrap gap-1" role="toolbar" aria-label="Note formatting">
        <ToolButton label="Bold" active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold /></ToolButton>
        <ToolButton label="Italic" active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic /></ToolButton>
        <ToolButton label="Highlight" active={editor?.isActive("highlight")} onClick={() => editor?.chain().focus().toggleHighlight().run()}><Highlighter /></ToolButton>
        <ToolButton label="Heading" active={editor?.isActive("heading", { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>H2</ToolButton>
        <ToolButton label="Bulleted list" active={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List /></ToolButton>
        <ToolButton label="Numbered list" active={editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered /></ToolButton>
        <ToolButton label="Checklist" active={editor?.isActive("taskList")} onClick={() => editor?.chain().focus().toggleTaskList().run()}><ListChecks /></ToolButton>
      </div>
      <div className="min-h-[50vh] rounded-xl border bg-background px-4 py-3 focus-within:ring-2 focus-within:ring-ring">
        <EditorContent editor={editor} className="note-editor min-h-[48vh] max-w-none" />
      </div>
    </CardContent></Card>
  </div>;
}

function ToolButton({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return <Button type="button" variant={active ? "soft" : "ghost"} size="sm" aria-label={label} aria-pressed={active} onClick={onClick}>{children}</Button>;
}
