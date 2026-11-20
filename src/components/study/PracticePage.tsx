import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { gradePractice } from "@/lib/ai.functions";
import type { Answers, PracticeResults, Question } from "@/lib/practice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function PracticePage({ kind, id }: { kind: "quiz" | "worksheet"; id: string }) {
  const table = kind === "quiz" ? "quizzes" : "worksheets";
  const query = useQuery({
    queryKey: [table, id],
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });
  const history = useQuery({
    queryKey: ["practice-history", kind, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity")
        .select("id,description,created_at")
        .eq("ref_id", id)
        .eq("activity_type", kind + "_completed")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });
  const [answers, setAnswers] = useState<Answers>({});
  const [result, setResult] = useState<PracticeResults | null>(null);
  const [retaking, setRetaking] = useState(false);
  const [busy, setBusy] = useState(false);
  const grade = useServerFn(gradePractice);
  const qc = useQueryClient();
  const navigate = useNavigate();
  async function submit() {
    if (!Object.keys(answers).length) return;
    setBusy(true);
    try {
      const res = await grade({ data: { kind, id, answers } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setResult(res.data);
      await qc.invalidateQueries({ queryKey: [table, id] });
      await history.refetch();
      toast.success("Results saved");
    } catch {
      toast.error("Couldn't grade this attempt. Your answers are still here.");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!confirm("Delete this practice set permanently?")) return;
    setBusy(true);
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      toast.error("Couldn't delete this item.");
      setBusy(false);
      return;
    }
    await qc.invalidateQueries({ queryKey: [table] });
    navigate({ to: kind === "quiz" ? "/quizzes" : "/worksheets" });
  }
  if (query.isLoading) return <p>Loading practice…</p>;
  if (query.isError || !query.data) return <p>Couldn't load this practice set.</p>;
  const questions = query.data.questions as unknown as Question[];
  const shownResult =
    result ?? (!retaking ? (query.data.results as unknown as PracticeResults | null) : null);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">{query.data.title}</h1>
          <p className="mt-2 text-muted-foreground">
            {query.data.difficulty} · {questions.length} questions
          </p>
        </div>
        <Button variant="outline" onClick={remove} disabled={busy}>
          Delete
        </Button>
      </div>
      {shownResult && (
        <div className="rounded-2xl bg-electric-soft p-5">
          <h2 className="text-xl font-bold">Score: {shownResult.percent}%</h2>
          <p className="mt-1 text-sm">
            {shownResult.earned} of {shownResult.total} points. Practice feedback is not an official
            grade.
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => {
              setResult(null);
              setRetaking(true);
              setAnswers({});
            }}
          >
            Retake
          </Button>
        </div>
      )}
      {shownResult && shownResult.weak_topics.length > 0 && (
        <p className="rounded-xl border p-4">
          Topics to review: {shownResult.weak_topics.join(", ")}
        </p>
      )}
      {questions.map((q, i) => {
        const r = shownResult?.results.find((x) => x.id === q.id);
        return (
          <section key={q.id} className="rounded-2xl border bg-card p-5">
            <p className="font-semibold">
              {i + 1}. {q.prompt}
            </p>
            {shownResult ? (
              <div className="mt-4 space-y-2 text-sm">
                <p className="font-semibold">
                  {r?.correct ? "Correct" : "Review this answer"} · {r?.score ?? 0} / 1
                </p>
                <p>{r?.feedback}</p>
                <p>Answer: {r?.correct_answer_display}</p>
                {q.explanation && <p>{q.explanation}</p>}
              </div>
            ) : q.type === "matching" ? (
              <div className="mt-4 space-y-3">
                {(q.matching_pairs ?? []).map((pair) => (
                  <label key={pair.left} className="block text-sm">
                    {pair.left}
                    <select
                      className="ml-3 rounded-md border bg-background p-2"
                      value={
                        typeof answers[q.id] === "object"
                          ? ((answers[q.id] as Record<string, string>)[pair.left] ?? "")
                          : ""
                      }
                      onChange={(e) =>
                        setAnswers((a) => ({
                          ...a,
                          [q.id]: {
                            ...(typeof a[q.id] === "object"
                              ? (a[q.id] as Record<string, string>)
                              : {}),
                            [pair.left]: e.target.value,
                          },
                        }))
                      }
                    >
                      <option value="">Choose an answer</option>
                      {[...(q.matching_pairs ?? [])]
                        .map((p) => p.right)
                        .sort((a, b) => a.localeCompare(b))
                        .map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                    </select>
                  </label>
                ))}
              </div>
            ) : q.options?.length ? (
              <div className="mt-4 space-y-2">
                {q.options.map((o) => (
                  <label key={o} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === o}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: o }))}
                    />
                    {o}
                  </label>
                ))}
              </div>
            ) : q.type === "fill_blank" ? (
              <Input
                className="mt-4"
                aria-label={`Answer ${i + 1}`}
                value={typeof answers[q.id] === "string" ? (answers[q.id] as string) : ""}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
              />
            ) : (
              <Textarea
                className="mt-4"
                aria-label={`Answer ${i + 1}`}
                value={typeof answers[q.id] === "string" ? (answers[q.id] as string) : ""}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
              />
            )}
          </section>
        );
      })}
      {!shownResult && (
        <Button onClick={submit} disabled={busy || !Object.keys(answers).length}>
          {busy ? "Grading…" : "Submit answers"}
        </Button>
      )}
      <details className="rounded-xl border bg-card p-4">
        <summary className="cursor-pointer font-semibold">Attempt history</summary>
        <p className="my-3 text-sm text-muted-foreground">
          Your last 20 scores. Detailed feedback is available for the latest attempt.
        </p>
        {history.isLoading ? (
          "Loading scores…"
        ) : history.isError ? (
          <button onClick={() => history.refetch()}>Retry loading scores</button>
        ) : history.data?.length ? (
          <ul className="divide-y">
            {history.data.map((a) => (
              <li className="py-2" key={a.id}>
                {a.description} · {new Date(a.created_at).toLocaleString()}
              </li>
            ))}
          </ul>
        ) : (
          "No attempts yet."
        )}
      </details>
    </div>
  );
}
