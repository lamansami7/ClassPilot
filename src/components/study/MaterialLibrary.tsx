import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { CreateFlashcardsDialog } from "./CreateFlashcardsDialog";
import { CreatePracticeDialog } from "./CreatePracticeDialog";
import { StudyGuideFromNoteDialog } from "./StudyGuideFromNoteDialog";

type Kind = "study-guides" | "flashcards" | "worksheets" | "quizzes";
const config = {
  "study-guides": { table: "study_guides", title: "Study Guides" },
  flashcards: { table: "flashcards", title: "Flashcards" },
  worksheets: { table: "worksheets", title: "Practice Worksheets" },
  quizzes: { table: "quizzes", title: "Quizzes & Tests" },
} as const;
export function MaterialLibrary({ kind }: { kind: Kind }) {
  const [search, setSearch] = useState("");
  const { table, title } = config[kind];
  const query = useQuery({
    queryKey: [kind],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select("id,title,topic,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const filtered = query.data?.filter((item) =>
    `${item.title} ${item.topic ?? ""}`.toLowerCase().includes(search.toLowerCase()),
  );
  const trigger = <Button variant="hero">Generate with AI</Button>;
  return (
    <div>
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-muted-foreground">
            Your saved study materials, ready when you are.
          </p>
        </div>
        {kind === "study-guides" ? (
          <StudyGuideFromNoteDialog trigger={trigger} />
        ) : kind === "flashcards" ? (
          <CreateFlashcardsDialog trigger={trigger} />
        ) : (
          <CreatePracticeDialog
            kind={kind === "quizzes" ? "quiz" : "worksheet"}
            trigger={trigger}
          />
        )}
      </div>
      <Input
        className="mt-8 max-w-md"
        aria-label={`Search ${title}`}
        placeholder="Search by title or topic"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="mt-5 rounded-2xl border bg-card">
        {query.isLoading ? (
          <p className="p-6">Loading…</p>
        ) : query.isError ? (
          <p className="p-6 text-destructive">Couldn't load materials. Please try again.</p>
        ) : !filtered?.length ? (
          <p className="p-6 text-muted-foreground">
            {search
              ? "No matching materials."
              : "Nothing here yet. Generate your first item to get started."}
          </p>
        ) : (
          filtered.map((item) => (
            <Link
              key={item.id}
              to={
                kind === "study-guides"
                  ? "/study-guides/$id"
                  : kind === "flashcards"
                    ? "/flashcards/$id"
                    : kind === "worksheets"
                      ? "/worksheets/$id"
                      : "/quizzes/$id"
              }
              params={{ id: item.id }}
              className="flex items-center justify-between gap-4 border-b p-5 last:border-0 hover:bg-muted"
            >
              <div>
                <p className="font-semibold">{item.title}</p>
                {item.topic && <p className="mt-1 text-sm text-muted-foreground">{item.topic}</p>}
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(item.created_at).toLocaleDateString()}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
