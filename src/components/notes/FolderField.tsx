import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
export function FolderField({
  note,
}: {
  note: { id: string; course_id: string | null; folder_id: string | null };
}) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const folders = useQuery({
    queryKey: ["folders", note.course_id],
    queryFn: async () => {
      let query = supabase.from("folders").select("id,name").order("name");
      query = note.course_id ? query.eq("course_id", note.course_id) : query.is("course_id", null);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
  async function move(id: string | null, create?: string) {
    setBusy(true);
    try {
      if (create) {
        const { data, error } = await supabase
          .from("folders")
          .insert({ course_id: note.course_id, name: create })
          .select("id")
          .single();
        if (error) throw error;
        id = data.id;
        await folders.refetch();
      }
      const { error } = await supabase
        .from("notes")
        .update({ folder_id: id })
        .eq("id", note.id)
        .select("id")
        .single();
      if (error) throw error;
      await Promise.all(
        [["note", note.id], ["notes"]].map((queryKey) => qc.invalidateQueries({ queryKey })),
      );
      toast.success("Folder updated");
    } catch {
      toast.error("Could not update folder. Please retry.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-sm">
        Folder{" "}
        <select
          disabled={busy || folders.isLoading || folders.isError}
          className="rounded-md border bg-card p-2"
          value={note.folder_id ?? ""}
          onChange={(e) => move(e.target.value || null)}
        >
          <option value="">Unfiled</option>
          {folders.data?.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </label>
      {folders.isError ? (
        <Button onClick={() => folders.refetch()}>Retry folders</Button>
      ) : (
        <Button
          disabled={busy}
          size="sm"
          variant="outline"
          onClick={() => {
            const name = prompt("New folder name for this class")?.trim();
            if (name && name.length <= 80) void move(null, name);
            else if (name) toast.error("Use up to 80 characters.");
          }}
        >
          New folder
        </Button>
      )}
    </div>
  );
}
