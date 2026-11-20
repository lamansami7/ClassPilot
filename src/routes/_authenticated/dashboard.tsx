import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpenText, ClipboardList, FileQuestion, Layers, Mic, NotebookPen, Plus, Sparkles } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/app/PageHeader";
import { NewNoteDialog } from "@/components/notes/NewNoteDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { fullName, greeting, meQuery, myCoursesQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

const materialSpecs = [
  ["study_guides", "Study guides"],
  ["worksheets", "Worksheets"],
  ["flashcards", "Flashcard sets"],
  ["quizzes", "Quizzes"],
  ["recordings", "Recordings"],
] as const;

function useDashboardData() {
  return useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: async () => {
      const requests = [
        supabase.from("notes").select("id,title,course_id,updated_at").order("updated_at", { ascending: false }).limit(5),
        supabase.from("activity").select("id,activity_type,description,created_at").order("created_at", { ascending: false }).limit(6),
        ...materialSpecs.map(([table]) => supabase.from(table).select("id", { count: "exact", head: true })),
      ] as const;
      const results = await Promise.all(requests);
      const [notes, activity, ...counts] = results;
      if (notes.error) throw notes.error;
      if (activity.error) throw activity.error;
      return {
        notes: notes.data ?? [],
        activity: activity.data ?? [],
        counts: Object.fromEntries(materialSpecs.map(([table, label], i) => [label, counts[i]?.count ?? 0])) as Record<string, number>,
      };
    },
  });
}

function DashboardPage() {
  const me = useQuery(meQuery);
  const courses = useQuery(myCoursesQuery);
  const overview = useDashboardData();
  const name = fullName(me.data?.profile) || "there";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={me.data?.school?.name ?? "ClassPilot AI"}
        title={<>{greeting()}, {name}</>}
        description="Your classes, notes, and recent study activity are all in one place."
        actions={<NewNoteDialog trigger={<Button variant="hero"><Plus /> Create Note</Button>} />}
      />

      <section aria-label="Study overview" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="My classes" value={courses.data?.length} icon={BookOpenText} />
        <StatCard label="Recent notes" value={overview.data?.notes.length} icon={NotebookPen} />
        <StatCard label="Study guides" value={overview.data?.counts["Study guides"]} icon={Sparkles} />
        <StatCard label="Practice sets" value={(overview.data?.counts["Worksheets"] ?? 0) + (overview.data?.counts.Quizzes ?? 0)} icon={ClipboardList} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>My classes</CardTitle>
            <Button variant="ghost" asChild><Link to="/classes">View all</Link></Button>
          </CardHeader>
          <CardContent>
            {courses.isLoading ? <p className="text-sm text-muted-foreground">Loading your classes…</p> :
              courses.data?.length ? <div className="grid gap-3 sm:grid-cols-2">
                {courses.data.slice(0, 4).map((course) => (
                  <Link key={course.id} to="/classes/$courseId" params={{ courseId: course.id }}
                    className="rounded-xl border bg-background p-4 transition hover:border-electric/50 hover:shadow-sm">
                    <p className="font-semibold text-navy">{course.course_name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{course.subject} · {course.noteCount} {course.noteCount === 1 ? "note" : "notes"}</p>
                  </Link>
                ))}
              </div> : <EmptyState icon={BookOpenText} title="No classes yet" description="Choose the classes you are taking to organize your study materials." action={<Button asChild variant="soft"><Link to="/classes">View My Classes</Link></Button>} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent notes</CardTitle></CardHeader>
          <CardContent>
            {overview.isLoading ? <p className="text-sm text-muted-foreground">Loading recent notes…</p> :
              overview.data?.notes.length ? <ul className="divide-y">
                {overview.data.notes.map((note) => <li key={note.id} className="py-3 first:pt-0 last:pb-0">
                  <Link to="/notes/$noteId" params={{ noteId: note.id }} className="font-medium hover:text-electric">{note.title}</Link>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(note.updated_at).toLocaleString()}</p>
                </li>)}
              </ul> : <p className="text-sm text-muted-foreground">Your notes will appear here after you create one.</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Study materials</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MaterialStat icon={BookOpenText} label="Study guides" value={overview.data?.counts["Study guides"]} />
            <MaterialStat icon={ClipboardList} label="Worksheets" value={overview.data?.counts.Worksheets} />
            <MaterialStat icon={Layers} label="Flashcard sets" value={overview.data?.counts["Flashcard sets"]} />
            <MaterialStat icon={FileQuestion} label="Quizzes" value={overview.data?.counts.Quizzes} />
            <MaterialStat icon={Mic} label="Recordings" value={overview.data?.counts.Recordings} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Study activity</CardTitle></CardHeader>
          <CardContent>
            {overview.data?.activity.length ? <ul className="space-y-3">
              {overview.data.activity.map((item) => <li key={item.id} className="flex items-start justify-between gap-4 text-sm">
                <span>{item.description}</span><time className="shrink-0 text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</time>
              </li>)}
            </ul> : <p className="text-sm text-muted-foreground">Your study activity will show here as you work.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value?: number; icon: typeof BookOpenText }) {
  return <Card><CardContent className="flex items-center justify-between p-5">
    <div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold text-navy">{value ?? "—"}</p></div>
    <span className="rounded-xl bg-electric-soft p-3 text-electric"><Icon className="h-5 w-5" aria-hidden="true" /></span>
  </CardContent></Card>;
}

function MaterialStat({ icon: Icon, label, value }: { icon: typeof BookOpenText; label: string; value?: number }) {
  return <div className="rounded-xl border p-3"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="h-4 w-4 text-electric" />{label}</div><p className="mt-2 text-xl font-semibold text-navy">{value ?? "—"}</p></div>;
}
