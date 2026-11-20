import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { myCoursesQuery } from "@/lib/queries";

const NONE = "__none__";

/** Class + optional note selectors shared by AI generation dialogs. */
export function ClassNoteFields({
  courseId,
  noteId,
  onCourse,
  onNote,
  noteOptional = true,
}: {
  courseId: string;
  noteId: string | null;
  onCourse: (v: string) => void;
  onNote: (v: string | null) => void;
  noteOptional?: boolean;
}) {
  const { data: courses = [] } = useQuery(myCoursesQuery);
  const { data: notes = [] } = useQuery({
    queryKey: ["notes", "by-course", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("id, title")
        .eq("course_id", courseId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label>Class</Label>
        <Select
          value={courseId}
          onValueChange={(v) => {
            onCourse(v);
            onNote(null);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose a class" />
          </SelectTrigger>
          <SelectContent>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.course_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>{noteOptional ? "From note (optional)" : "Note"}</Label>
        <Select
          value={noteId ?? NONE}
          onValueChange={(v) => onNote(v === NONE ? null : v)}
          disabled={!courseId}
        >
          <SelectTrigger>
            <SelectValue placeholder="All recent notes" />
          </SelectTrigger>
          <SelectContent>
            {noteOptional && <SelectItem value={NONE}>All recent notes in this class</SelectItem>}
            {notes.map((n) => (
              <SelectItem key={n.id} value={n.id}>
                {n.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
