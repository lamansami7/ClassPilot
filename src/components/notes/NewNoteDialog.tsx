import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { currentUserId } from "@/lib/use-user";

export async function createNote(opts: {
  courseId: string | null;
  title?: string;
  folderId?: string | null;
  topic?: string | null;
}) {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from("notes")
    .insert({
      student_id: userId,
      course_id: opts.courseId,
      title: opts.title?.trim() || "Untitled note",
      folder_id: opts.folderId ?? null,
      topic: opts.topic ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export function NewNoteDialog({
  trigger,
  courseId,
}: {
  trigger: ReactNode;
  courseId?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [course, setCourse] = useState<string>(courseId ?? "");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: courses = [] } = useQuery(myCoursesQuery);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const create = async () => {
    if (!course) {
      toast.error("Choose a class for this note.");
      return;
    }
    setBusy(true);
    try {
      const id = await createNote({ courseId: course, title });
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["my-courses"] });
      setOpen(false);
      navigate({ to: "/notes/$noteId", params: { noteId: id } });
    } catch {
      toast.error("Couldn't create the note. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new note</DialogTitle>
          <DialogDescription>Pick the class this note belongs to.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Class</Label>
            <Select value={course} onValueChange={setCourse}>
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
            <Label htmlFor="nt">Title (optional)</Label>
            <Input
              id="nt"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Slope-intercept form"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="hero" onClick={create} disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} Create note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
