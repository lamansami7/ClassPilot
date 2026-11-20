import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FileText, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { myCoursesQuery } from "@/lib/queries";
import { NewNoteDialog } from "@/components/notes/NewNoteDialog";

export const Route = createFileRoute("/_authenticated/notes")({
  component: NotesPage,
});

function NotesPage() {
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const qc = useQueryClient();
  const courses = useQuery(myCoursesQuery);
  const notes = useQuery({
    queryKey: ["notes", "library"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notes").select("id,title,topic,course_id,folder_id,updated_at").order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return (notes.data ?? []).filter((note) => (courseFilter === "all" || note.course_id === courseFilter) &&
      (!term || `${note.title} ${note.topic ?? ""}`.toLocaleLowerCase().includes(term)));
  }, [notes.data, search, courseFilter]);

  const remove = async (id: string) => {
    if (!window.confirm("Delete this note? This cannot be undone.")) return;
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) return toast.error("The note couldn’t be deleted. Please try again.");
    await Promise.all([qc.invalidateQueries({ queryKey: ["notes"] }), qc.invalidateQueries({ queryKey: ["my-courses"] }), qc.invalidateQueries({ queryKey: ["dashboard"] })]);
    toast.success("Note deleted");
  };

  return <div>
    <PageHeader eyebrow="Your learning" title="My Notes" description="Search and open notes saved to your classes."
      actions={<NewNoteDialog trigger={<Button variant="hero"><Plus /> New note</Button>} />} />
    <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_240px]">
      <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search notes" className="pl-9" placeholder="Search by title or topic" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      <Select value={courseFilter} onValueChange={setCourseFilter}><SelectTrigger aria-label="Filter notes by class"><SelectValue /></SelectTrigger><SelectContent>
        <SelectItem value="all">All classes</SelectItem>{(courses.data ?? []).map((course) => <SelectItem key={course.id} value={course.id}>{course.course_name}</SelectItem>)}
      </SelectContent></Select>
    </div>
    {notes.isLoading ? <p role="status" className="text-sm text-muted-foreground">Loading notes…</p> :
      notes.isError ? <p role="alert" className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">We couldn’t load your notes. {notes.error.message}</p> :
      visible.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((note) => {
          const courseName = courses.data?.find((course) => course.id === note.course_id)?.course_name ?? "Unassigned";
          return <Card key={note.id}><CardContent className="p-4">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0">
              <Link to="/notes/$noteId" params={{ noteId: note.id }} className="font-semibold text-navy hover:text-electric">{note.title}</Link>
              <p className="mt-1 truncate text-sm text-muted-foreground">{courseName}{note.topic ? ` · ${note.topic}` : ""}</p>
            </div><Button variant="ghost" size="icon" aria-label={`Delete ${note.title}`} onClick={() => void remove(note.id)}><Trash2 className="h-4 w-4" /></Button></div>
            <p className="mt-4 text-xs text-muted-foreground">Saved {new Date(note.updated_at).toLocaleString()}</p>
          </CardContent></Card>;
        })}
      </div> : <EmptyState icon={FileText} title={search || courseFilter !== "all" ? "No matching notes" : "No notes yet"} description={search || courseFilter !== "all" ? "Try a different search or class." : "Create your first class note and it will be saved here."} action={<NewNoteDialog trigger={<Button variant="soft"><Plus /> New note</Button>} />} />}
  </div>;
}
