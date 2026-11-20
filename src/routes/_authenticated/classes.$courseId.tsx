import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpenText, NotebookPen } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/app/PageHeader";
import { NewNoteDialog } from "@/components/notes/NewNoteDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { myCoursesQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/classes/$courseId")({
  component: ClassDetailPage,
});

function ClassDetailPage() {
  const { courseId } = Route.useParams();
  const classes = useQuery(myCoursesQuery);
  const course = classes.data?.find((item) => item.id === courseId);
  const notes = useQuery({
    queryKey: ["notes", "class", courseId],
    enabled: !!course,
    queryFn: async () => {
      const { data, error } = await supabase.from("notes").select("id,title,topic,updated_at").eq("course_id", courseId).order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (classes.isLoading) return <p role="status">Loading class…</p>;
  if (!course) return <div><PageHeader title="Class not found" description="This class may have been removed from your schedule." /><Button asChild variant="soft"><Link to="/classes">Back to My Classes</Link></Button></div>;

  return <div className="space-y-7">
    <PageHeader eyebrow={course.subject} title={course.course_name} description={course.description || "Class materials and activity"}
      actions={<NewNoteDialog courseId={courseId} trigger={<Button variant="hero"><NotebookPen /> Create note</Button>} />} />
    <div className="grid gap-4 sm:grid-cols-3">
      <SummaryCard label="Notes" value={course.noteCount} />
      <SummaryCard label="Grade range" value={course.grades.length ? course.grades.map((grade) => `Grade ${grade}`).join(", ") : "All grades"} />
      <SummaryCard label="Subject" value={course.subject} />
    </div>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Notes for this class</CardTitle><Button asChild variant="ghost"><Link to="/notes">All notes</Link></Button></CardHeader>
      <CardContent>
        {notes.isLoading ? <p role="status" className="text-sm text-muted-foreground">Loading notes…</p> :
          notes.data?.length ? <ul className="divide-y">{notes.data.map((note) => <li key={note.id} className="py-3 first:pt-0 last:pb-0">
            <Link to="/notes/$noteId" params={{ noteId: note.id }} className="font-medium text-navy hover:text-electric">{note.title}</Link>
            <p className="mt-1 text-sm text-muted-foreground">{note.topic || "No topic"} · Updated {new Date(note.updated_at).toLocaleDateString()}</p>
          </li>)}</ul> :
          <EmptyState icon={NotebookPen} title="No notes for this class yet" description="Create a note to start collecting what you learn here." action={<NewNoteDialog courseId={courseId} trigger={<Button variant="soft"><NotebookPen /> Create note</Button>} />} />}
      </CardContent>
    </Card>
    <Card><CardHeader><CardTitle>Study tools</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">
      <p>Study guides, worksheets, flashcards, quizzes, and recordings will appear here as those activities are added to your class.</p>
      <p className="mt-2">Your existing class notes are used as the source for study materials.</p>
    </CardContent></Card>
  </div>;
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 font-semibold text-navy">{value}</p></CardContent></Card>;
}
