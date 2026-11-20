import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { myCoursesQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NewNoteDialog } from "@/components/notes/NewNoteDialog";
export const Route = createFileRoute("/_authenticated/classes/$id")({ component: Page });
function Page() {
  const { id } = Route.useParams();
  const [search, setSearch] = useState("");
  const courses = useQuery(myCoursesQuery);
  const course = courses.data?.find((x) => x.id === id);
  const materials = useQuery({
    queryKey: ["class-materials", id],
    enabled: !!course,
    queryFn: async () => {
      const res = await Promise.all([
        supabase.from("notes").select("id,title,created_at").eq("course_id", id),
        supabase.from("study_guides").select("id,title,created_at").eq("course_id", id),
        supabase.from("flashcards").select("id,title,created_at").eq("course_id", id),
        supabase.from("worksheets").select("id,title,created_at").eq("course_id", id),
        supabase.from("quizzes").select("id,title,created_at").eq("course_id", id),
      ]);
      for (const r of res) if (r.error) throw r.error;
      const types = ["Note", "Study guide", "Flashcards", "Worksheet", "Quiz"] as const;
      return res
        .flatMap((r, i) => (r.data ?? []).map((x) => ({ ...x, type: types[i]! })))
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
  });
  if (courses.isLoading) return <p>Loading class…</p>;
  if (courses.isError || !course) return <p>Class not found or unavailable.</p>;
  const items = materials.data?.filter((x) =>
    `${x.title} ${x.type}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div>
      <Link to="/classes" className="text-sm text-electric">
        ← My classes
      </Link>
      <div className="mt-5 flex flex-wrap justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{course.subject}</p>
          <h1 className="mt-1 font-display text-3xl font-bold">{course.course_name}</h1>
          <p className="mt-2 text-muted-foreground">{course.description}</p>
        </div>
        <NewNoteDialog courseId={id} trigger={<Button>New note</Button>} />
      </div>
      <h2 className="mt-10 text-xl font-bold">Class materials</h2>
      <Input
        className="mt-4 max-w-md"
        aria-label="Search class materials"
        placeholder="Search title or type"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="mt-4 rounded-xl border">
        {materials.isLoading ? (
          <p className="p-5">Loading…</p>
        ) : materials.isError ? (
          <p className="p-5 text-destructive">Couldn't load materials.</p>
        ) : !items?.length ? (
          <p className="p-5 text-muted-foreground">No materials found.</p>
        ) : (
          items.map((x) => (
            <Link
              key={`${x.type}-${x.id}`}
              to={
                x.type === "Note"
                  ? "/notes/$noteId"
                  : x.type === "Study guide"
                    ? "/study-guides/$id"
                    : x.type === "Flashcards"
                      ? "/flashcards/$id"
                      : x.type === "Worksheet"
                        ? "/worksheets/$id"
                        : "/quizzes/$id"
              }
              params={x.type === "Note" ? ({ noteId: x.id } as never) : ({ id: x.id } as never)}
              className="flex justify-between border-b p-4 last:border-0 hover:bg-muted"
            >
              <span className="font-medium">{x.title}</span>
              <span className="text-sm text-muted-foreground">{x.type}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
