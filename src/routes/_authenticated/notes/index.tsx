import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NewNoteDialog } from "@/components/notes/NewNoteDialog";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/notes/")({ component: Notes });
function Notes() {
  const [search, setSearch] = useState("");
  const notes = useQuery({
    queryKey: ["notes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("id,title,topic,updated_at,folders(name)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const filtered = notes.data?.filter((n) =>
    `${n.title} ${n.topic ?? ""} ${n.folders?.name ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">My Notes</h1>
          <p className="mt-2 text-muted-foreground">
            Capture your ideas and keep your classwork together.
          </p>
        </div>
        <NewNoteDialog
          trigger={
            <Button variant="hero">
              <Plus /> New note
            </Button>
          }
        />
      </div>
      <Input
        aria-label="Search notes"
        placeholder="Search title, topic or folder"
        className="mt-8 max-w-md"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="mt-5 rounded-2xl border bg-card">
        {notes.isLoading ? (
          <p className="p-6">Loading notes…</p>
        ) : notes.isError ? (
          <p className="p-6 text-destructive">Couldn't load notes. Please try again.</p>
        ) : !filtered?.length ? (
          <p className="p-6 text-muted-foreground">
            {search ? "No notes match your search." : "No notes yet. Create one to get started."}
          </p>
        ) : (
          filtered.map((n) => (
            <Link
              key={n.id}
              to="/notes/$noteId"
              params={{ noteId: n.id }}
              className="flex items-center justify-between gap-4 border-b p-5 last:border-0 hover:bg-muted"
            >
              <div>
                <p className="font-semibold">{n.title}</p>
                {n.folders && (
                  <p className="text-xs text-muted-foreground">Folder · {n.folders.name}</p>
                )}
                {n.topic && <p className="mt-1 text-sm text-muted-foreground">{n.topic}</p>}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {new Date(n.updated_at).toLocaleDateString()}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
