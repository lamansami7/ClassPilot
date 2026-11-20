import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { generateStudyGuide } from "@/lib/ai.functions";
import { ClassNoteFields } from "./ClassNoteFields";
import { AiBusy } from "./AiBusy";

/** Pick a class + note and generate a study guide from it. */
export function StudyGuideFromNoteDialog({ trigger, courseId = null }: { trigger: ReactNode; courseId?: string | null }) {
  const [open, setOpen] = useState(false);
  const [course, setCourse] = useState(courseId ?? "");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const gen = useServerFn(generateStudyGuide);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const submit = async () => {
    if (!note) return toast.error("Choose the note to study from.");
    setBusy(true);
    const res = await gen({ data: { noteId: note } });
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    qc.invalidateQueries({ queryKey: ["study-guides"] });
    setOpen(false);
    navigate({ to: "/study-guides/$id", params: { id: res.data.id } });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Generate Study Guide</DialogTitle>
          <DialogDescription>Choose a note and ClassPilot AI builds a complete study guide at your grade level.</DialogDescription>
        </DialogHeader>
        {busy ? <AiBusy label="Writing your study guide…" /> : <ClassNoteFields courseId={course} noteId={note} onCourse={setCourse} onNote={setNote} noteOptional={false} />}
        <DialogFooter>
          <Button variant="hero" onClick={submit} disabled={busy || !note}>
            <Wand2 /> Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
