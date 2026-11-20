import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpenText, NotebookPen } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/app/PageHeader";
import { NewNoteDialog } from "@/components/notes/NewNoteDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { myCoursesQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/classes")({
  component: ClassesPage,
});

function ClassesPage() {
  const { data: courses = [], isLoading, isError, error } = useQuery(myCoursesQuery);
  return <div>
    <PageHeader eyebrow="Your schedule" title="My Classes" description="Keep notes and study materials organized by class."
      actions={<NewNoteDialog trigger={<Button variant="hero"><NotebookPen /> Create note</Button>} />} />
    {isLoading ? <p role="status" className="text-sm text-muted-foreground">Loading your classes…</p> :
      isError ? <p role="alert" className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">We couldn’t load your classes. {error.message}</p> :
      courses.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => <Card key={course.id} className="transition hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-electric">{course.subject}</p>
            <h2 className="mt-2 text-lg font-semibold text-navy"><Link to="/classes/$courseId" params={{ courseId: course.id }} className="hover:text-electric">{course.course_name}</Link></h2>
            <p className="mt-2 min-h-10 text-sm text-muted-foreground">{course.description || "Your class materials and activity, together in one place."}</p>
            <div className="mt-5 flex items-center justify-between gap-3 border-t pt-4">
              <span className="text-sm text-muted-foreground">{course.noteCount} {course.noteCount === 1 ? "note" : "notes"}</span>
              <Button asChild variant="soft" size="sm"><Link to="/classes/$courseId" params={{ courseId: course.id }}>Open class</Link></Button>
            </div>
          </CardContent>
        </Card>)}
      </div> : <EmptyState icon={BookOpenText} title="Your classes will show up here" description="The classes selected during sign-up are used to organize your learning materials. Add a note to get started." />}
  </div>;
}
