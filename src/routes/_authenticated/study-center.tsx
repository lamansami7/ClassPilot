import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
export const Route = createFileRoute("/_authenticated/study-center")({ component: Center });
function Center() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const q = useQuery({
    queryKey: ["study-center"],
    queryFn: async () => {
      const results = await Promise.all([
        supabase.from("notes").select("id,title,created_at,course_id"),
        supabase.from("study_guides").select("id,title,created_at,course_id"),
        supabase.from("flashcards").select("id,title,created_at,course_id"),
        supabase.from("worksheets").select("id,title,created_at,course_id"),
        supabase.from("quizzes").select("id,title,created_at,course_id"),
      ]);
      for (const r of results) if (r.error) throw r.error;
      const types = ["Note", "Study guide", "Flashcards", "Worksheet", "Quiz"] as const;
      return results
        .flatMap((r, i) => (r.data ?? []).map((x) => ({ ...x, type: types[i]! })))
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
  });
  const items = q.data?.filter(
    (x) =>
      (filter === "all" || x.type === filter) &&
      x.title.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Study Center</h1>
      <p className="mt-2 text-muted-foreground">
        Find your saved notes and study materials in one place.
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Input
          className="max-w-md"
          aria-label="Search study materials"
          placeholder="Search titles"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Filter by type"
          className="rounded-md border bg-background px-3"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All types</option>
          {["Note", "Study guide", "Flashcards", "Worksheet", "Quiz"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </div>
      <div className="mt-5 rounded-2xl border bg-card">
        {q.isLoading ? (
          <p className="p-6">Loading library…</p>
        ) : q.isError ? (
          <p className="p-6 text-destructive">Couldn't load the library.</p>
        ) : !items?.length ? (
          <p className="p-6 text-muted-foreground">No materials found.</p>
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
              className="flex justify-between gap-3 border-b p-4 last:border-0 hover:bg-muted"
            >
              <span>
                <strong>{x.title}</strong>
                <span className="ml-3 text-sm text-muted-foreground">{x.type}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(x.created_at).toLocaleDateString()}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
