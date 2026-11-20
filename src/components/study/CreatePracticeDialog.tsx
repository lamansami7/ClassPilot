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
import { generatePractice } from "@/lib/ai.functions";
import {
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  type Difficulty,
  type QuestionType,
} from "@/lib/practice";
import { cn } from "@/lib/utils";
import { ClassNoteFields } from "./ClassNoteFields";
import { AiBusy } from "./AiBusy";

const DEFAULT_TYPES: Record<"worksheet" | "quiz", QuestionType[]> = {
  worksheet: ["multiple_choice", "true_false", "fill_blank", "short_answer", "matching", "problem"],
  quiz: ["multiple_choice", "true_false", "fill_blank", "short_answer"],
};

export function CreatePracticeDialog({
  kind = "worksheet",
  courseId = null,
  noteId = null,
  defaultTopic = null,
  trigger,
}: {
  kind?: "worksheet" | "quiz";
  courseId?: string | null;
  noteId?: string | null;
  defaultTopic?: string | null;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [course, setCourse] = useState(courseId ?? "");
  const [note, setNote] = useState<string | null>(noteId);
  const [topic, setTopic] = useState(defaultTopic ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty>("mixed");
  const [count, setCount] = useState(kind === "quiz" ? 15 : 10);
  const [types, setTypes] = useState<QuestionType[]>(DEFAULT_TYPES[kind]);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const gen = useServerFn(generatePractice);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const toggleType = (t: QuestionType) =>
    setTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  const submit = async () => {
    if (!course) {
      toast.error("Choose a class.");
      return;
    }
    if (!types.length) {
      toast.error("Pick at least one question type.");
      return;
    }
    setBusy(true);
    try {
      const res = await gen({
        data: {
          kind,
          courseId: course,
          noteId: note,
          topic: topic.trim() || null,
          difficulty,
          count,
          types,
          title: title.trim() || null,
        },
      });
      setBusy(false);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      qc.invalidateQueries({ queryKey: [kind === "quiz" ? "quizzes" : "worksheets"] });
      toast.success(kind === "quiz" ? "Your practice test is ready" : "Your worksheet is ready");
      setOpen(false);
      if (kind === "quiz") navigate({ to: "/quizzes/$id", params: { id: res.data.id } });
      else navigate({ to: "/worksheets/$id", params: { id: res.data.id } });
    } catch {
      toast.error("Could not generate material. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {kind === "quiz" ? "Create a Practice Test" : "Create Practice Worksheet"}
          </DialogTitle>
          <DialogDescription>
            ClassPilot AI writes questions from your notes for this class.
          </DialogDescription>
        </DialogHeader>
        {busy ? (
          <AiBusy
            label={kind === "quiz" ? "Writing your practice test…" : "Writing your worksheet…"}
          />
        ) : (
          <div className="space-y-5">
            <ClassNoteFields
              courseId={course}
              noteId={note}
              onCourse={setCourse}
              onNote={setNote}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pt">Topic (optional)</Label>
                <Input
                  id="pt"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Systems of equations"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ptt">Title (optional)</Label>
                <Input id="ptt" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <div className="grid grid-cols-4 gap-2">
                {(["easy", "medium", "hard", "mixed"] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-sm font-medium capitalize transition-colors",
                      difficulty === d
                        ? "border-electric bg-electric text-electric-foreground"
                        : "hover:border-electric/50",
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Number of questions</Label>
                <span className="font-display text-lg font-bold text-navy">{count}</span>
              </div>
              <Slider
                min={3}
                max={30}
                step={1}
                value={[count]}
                onValueChange={(v) => setCount(v[0] ?? count)}
              />
            </div>
            <div className="space-y-2">
              <Label>Question types</Label>
              <div className="flex flex-wrap gap-2">
                {QUESTION_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleType(t)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      types.includes(t)
                        ? "border-electric bg-electric-soft text-accent-foreground"
                        : "hover:border-electric/50",
                    )}
                  >
                    {QUESTION_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
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
