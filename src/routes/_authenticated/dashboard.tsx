import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, GraduationCap, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { meQuery, myCoursesQuery, greeting } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function Dashboard() {
  const { data: me } = useQuery(meQuery);
  const courses = useQuery(myCoursesQuery);
  const notes = useQuery({
    queryKey: ["notes", "recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("id,title,updated_at")
        .order("updated_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });
  const activity = useQuery({
    queryKey: ["activity", "recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity")
        .select("id,description,created_at")
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });
  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-navy p-7 text-navy-foreground md:p-10">
        <p className="text-sm font-medium opacity-75">YOUR STUDY SPACE</p>
        <h1 className="mt-3 font-display text-3xl font-bold md:text-4xl">
          {greeting()}
          {me?.profile?.first_name ? `, ${me.profile.first_name}` : ""}.
        </h1>
        <p className="mt-3 max-w-xl text-sm opacity-80">
          Your classes and notes, all in one place. Pick up where you left off or start something
          new.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="hero">
            <Link to="/notes">
              <NotebookPen /> My notes
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/classes">
              <GraduationCap /> My classes
            </Link>
          </Button>
        </div>
      </section>
      {courses.isSuccess && !courses.data.length && (
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-display text-xl font-bold">Start with your schedule</h2>
          <p className="my-2 text-muted-foreground">
            Add a class, create your first note, then use it to make practice questions.
          </p>
          <Button asChild variant="soft">
            <Link to="/classes">Choose classes →</Link>
          </Button>
        </section>
      )}
      <section>
        <h2 className="font-display text-xl font-bold">Quick actions</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/recordings">Record a lesson</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/study-guides">Study guides</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/flashcards">Flashcards</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/quizzes">Practice quizzes</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/tutor">AI Tutor</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/study-center">Study Center</Link>
          </Button>
        </div>
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/classes"
          className="rounded-2xl border bg-card p-5 transition-colors hover:bg-muted"
        >
          <GraduationCap className="text-electric" />
          <p className="mt-4 text-sm text-muted-foreground">Your classes</p>
          <p className="mt-1 text-2xl font-bold">
            {courses.isError ? "—" : courses.isLoading ? "…" : (courses.data?.length ?? 0)}
          </p>
        </Link>
        <Link
          to="/notes"
          className="rounded-2xl border bg-card p-5 transition-colors hover:bg-muted"
        >
          <BookOpen className="text-electric" />
          <p className="mt-4 text-sm text-muted-foreground">Recent notes</p>
          <p className="mt-1 text-sm font-medium">
            {notes.isError
              ? "Couldn't load notes"
              : notes.isLoading
                ? "Loading…"
                : notes.data?.length
                  ? `${notes.data.length} shown below`
                  : "No notes yet"}
          </p>
        </Link>
      </div>
      <section>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold">Recent notes</h2>
            <p className="mt-1 text-sm text-muted-foreground">Continue your latest work.</p>
          </div>
          <Button asChild variant="ghost">
            <Link to="/notes">
              View all <ArrowRight />
            </Link>
          </Button>
        </div>
        <div className="mt-4 rounded-2xl border bg-card">
          {notes.isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading notes…</p>
          ) : notes.isError ? (
            <p className="p-6 text-sm text-destructive">
              Couldn't load your notes. Please try again.
            </p>
          ) : !notes.data?.length ? (
            <p className="p-6 text-sm text-muted-foreground">
              No notes yet. Go to My Notes to create your first one.
            </p>
          ) : (
            notes.data.map((n) => (
              <Link
                key={n.id}
                to="/notes/$noteId"
                params={{ noteId: n.id }}
                className="flex items-center justify-between border-b p-4 last:border-0 hover:bg-muted"
              >
                <span className="font-medium">{n.title}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(n.updated_at).toLocaleDateString()}
                </span>
              </Link>
            ))
          )}
        </div>
      </section>
      <section>
        <h2 className="font-display text-xl font-bold">Recent activity</h2>
        <div className="mt-4 rounded-2xl border bg-card">
          {activity.isLoading ? (
            <p className="p-5 text-muted-foreground">Loading activity…</p>
          ) : activity.isError ? (
            <p className="p-5 text-destructive">Couldn't load activity.</p>
          ) : !activity.data?.length ? (
            <p className="p-5 text-muted-foreground">Your study activity will appear here.</p>
          ) : (
            activity.data.map((item) => (
              <div key={item.id} className="flex justify-between gap-4 border-b p-4 last:border-0">
                <span>{item.description}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
