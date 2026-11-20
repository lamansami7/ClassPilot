import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap } from "lucide-react";
import { myCoursesQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/classes/")({ component: Classes });
function Classes() {
  const { data, isLoading, isError } = useQuery(myCoursesQuery);
  return (
    <div>
      <h1 className="font-display text-3xl font-bold">My Classes</h1>
      <p className="mt-2 text-muted-foreground">
        Your selected courses and the notes you've created for them.
      </p>
      {isLoading ? (
        <p className="mt-8">Loading classes…</p>
      ) : isError ? (
        <p className="mt-8 text-destructive">Couldn't load classes. Please try again.</p>
      ) : !data?.length ? (
        <div className="mt-8 rounded-2xl border p-8 text-muted-foreground">
          No classes selected yet.
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
            <div key={c.id} className="rounded-2xl border bg-card p-6">
              <GraduationCap className="text-electric" />
              <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {c.subject}
              </p>
              <h2 className="mt-1 font-display text-lg font-bold">{c.course_name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {c.noteCount} {c.noteCount === 1 ? "note" : "notes"}
              </p>
              <Link
                to="/classes/$id"
                params={{ id: c.id }}
                className="mt-5 inline-block text-sm font-semibold text-electric"
              >
                Open class →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
