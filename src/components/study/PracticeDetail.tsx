import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ClipboardCheck, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { gradePractice } from "@/lib/ai.functions";
import { QUESTION_TYPE_LABELS, type Answers, type PracticeResults, type Question } from "@/lib/practice";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export function PracticeDetail({ id, kind }: { id: string; kind: "worksheet" | "quiz" }) {
  const table = kind === "quiz" ? "quizzes" : "worksheets";
  const [answers, setAnswers] = useState<Answers>({});
  const [results, setResults] = useState<PracticeResults | null>(null);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const grade = useServerFn(gradePractice);
  const row = useQuery({
    queryKey: [table, id],
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("This practice set was not found.");
      return data;
    },
  });

  if (row.isLoading) return <p role="status">Loading practice…</p>;
  if (row.isError) return <p role="alert" className="text-destructive">{row.error.message}</p>;
  const questions = row.data.questions as unknown as Question[];
  const saved = row.data.results as unknown as PracticeResults | null;
  const review = results ?? saved;

  const submit = async () => {
    setBusy(true);
    try {
      const response = await grade({ data: { kind, id, answers } });
      if (!response.ok) return toast.error(response.error);
      setResults(response.data);
      await qc.invalidateQueries({ queryKey: [table, id] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Your answers have been saved.");
    } catch {
      toast.error("We couldn’t grade this set right now. Your answers are still on this page.");
    } finally { setBusy(false); }
  };

  return <div className="space-y-6">
    <PageHeader eyebrow={kind === "quiz" ? "Practice test" : "Worksheet"} title={row.data.title} description={row.data.topic || "Use this set to practice what you have learned."}
      actions={<Button asChild variant="ghost"><Link to={kind === "quiz" ? "/quizzes" : "/worksheets"}>All {kind === "quiz" ? "quizzes" : "worksheets"}</Link></Button>} />
    {review && <Card><CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
      <div><p className="text-sm text-muted-foreground">Practice score (not an official school grade)</p><p className="text-3xl font-bold text-navy">{review.percent}%</p></div>
      <Button variant="soft" onClick={() => { setResults(null); setAnswers({}); }}><RotateCcw /> Try again</Button>
    </CardContent></Card>}
    <div className="space-y-4">
      {questions.map((question, index) => {
        const result = review?.results.find((item) => item.id === question.id);
        return <Card key={question.id}><CardContent className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-electric">{QUESTION_TYPE_LABELS[question.type]} · {question.topic}</p><h2 className="mt-2 font-semibold text-navy">{index + 1}. {question.prompt}</h2></div>{result && <span aria-label={result.correct ? "Correct" : "Needs review"}>{result.correct ? "✓" : "↺"}</span>}</div>
          {question.options?.length ? <div className="grid gap-2 sm:grid-cols-2">{question.options.map((option) => <label key={option} className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm">
            <input type="radio" name={question.id} value={option} checked={answers[question.id] === option} disabled={!!review} onChange={() => setAnswers((current) => ({ ...current, [question.id]: option }))} />{option}
          </label>)}</div> : question.type === "matching" ? <div className="space-y-2">{(question.matching_pairs ?? []).map((pair) => <div key={pair.left} className="grid items-center gap-2 sm:grid-cols-2"><Label>{pair.left}</Label><input className="h-10 rounded-md border bg-background px-3 text-sm" aria-label={`Match for ${pair.left}`} value={typeof answers[question.id] === "object" ? (answers[question.id] as Record<string,string>)[pair.left] ?? "" : ""} disabled={!!review} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: { ...(typeof current[question.id] === "object" ? current[question.id] as Record<string,string> : {}), [pair.left]: event.target.value } }))} /></div>)}</div> : <Textarea aria-label={`Answer to question ${index + 1}`} rows={3} placeholder="Write your answer…" value={typeof answers[question.id] === "string" ? answers[question.id] as string : ""} disabled={!!review} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} />}
          {result && <div className={`rounded-lg p-3 text-sm ${result.correct ? "bg-success/10" : "bg-warning/10"}`}><p className="font-medium">{result.feedback}</p>{result.correct_answer_display && <p className="mt-1">Suggested answer: {result.correct_answer_display}</p>}</div>}
        </CardContent></Card>;
      })}
    </div>
    {!review && <Button variant="hero" onClick={() => void submit()} disabled={busy || questions.length === 0}><ClipboardCheck />{busy ? "Checking answers…" : "Submit answers"}</Button>}
    {review && <p className="text-sm text-muted-foreground">Written responses may be reviewed by AI and include feedback. This practice score is for learning only.</p>}
  </div>;
}
