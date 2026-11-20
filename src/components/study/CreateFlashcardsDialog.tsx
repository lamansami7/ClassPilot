import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Wand2 } from "lucide-react";
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
import { Slider } from "@/components/ui/slider";
import { generateFlashcards } from "@/lib/ai.functions";
import { ClassNoteFields } from "./ClassNoteFields";
import { AiBusy } from "./AiBusy";

export function CreateFlashcardsDialog({
  courseId = null,
  noteId = null,
  defaultTopic = null,
  trigger,
}: {
  courseId?: string | null;
  noteId?: string | null;
  defaultTopic?: string | null;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [course, setCourse] = useState(courseId ?? "");
  const [note, setNote] = useState<string | null>(noteId);
  const [topic, setTopic] = useState(defaultTopic ?? "");
  const [count, setCount] = useState(12);
  const [busy, setBusy] = useState(false);
  const gen = useServerFn(generateFlashcards);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const submit = async () => {
    if (!course) {
      toast.error("Choose a class.");
      return;
    }
    setBusy(true);
    try {
      const res = await gen({
        data: { courseId: course, noteId: note, topic: topic.trim() || null, count },
      });
      setBusy(false);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      qc.invalidateQueries({ queryKey: ["flashcards"] });
      toast.success("Your flashcards are ready");
      setOpen(false);
      navigate({ to: "/flashcards/$id", params: { id: res.data.id } });
    } catch {
      toast.error("Could not generate material. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Generate Flashcards</DialogTitle>
          <DialogDescription>Turn your notes into question-and-answer cards.</DialogDescription>
        </DialogHeader>
        {busy ? (
          <AiBusy label="Making your flashcards…" />
        ) : (
          <div className="space-y-5">
            <ClassNoteFields
              courseId={course}
              noteId={note}
              onCourse={setCourse}
              onNote={setNote}
            />
            <div className="space-y-2">
              <Label htmlFor="ft">Topic (optional)</Label>
              <Input
                id="ft"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Cell organelles"
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Number of cards</Label>
                <span className="font-display text-lg font-bold text-navy">{count}</span>
              </div>
              <Slider
                min={4}
                max={40}
                step={1}
                value={[count]}
                onValueChange={(v) => setCount(v[0] ?? count)}
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="hero" onClick={submit} disabled={busy}>
            <Wand2 /> Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
