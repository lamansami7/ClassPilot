import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { regenerateStudyGuide, type StudyGuideContent } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/_authenticated/study-guides/$id")({ component: Page });
function Page() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const nav = useNavigate();
  const regenerate = useServerFn(regenerateStudyGuide);
  const [busy, setBusy] = useState(false);
  const q = useQuery({
    queryKey: ["study-guides", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("study_guides").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });
  async function remove() {
    if (!confirm("Delete this guide permanently?")) return;
    setBusy(true);
    const { error } = await supabase.from("study_guides").delete().eq("id", id);
    if (error) {
      toast.error("Couldn't delete guide.");
      setBusy(false);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["study-guides"] });
    nav({ to: "/study-guides" });
  }
  async function regen() {
    if (!confirm("Regenerate and replace this guide using its original note?")) return;
    setBusy(true);
    try {
      const res = await regenerate({ data: { studyGuideId: id } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      await qc.invalidateQueries({ queryKey: ["study-guides"] });
      toast.success("Guide regenerated");
    } catch {
      toast.error("Couldn't regenerate guide.");
    } finally {
      setBusy(false);
    }
  }
  if (q.isLoading) return <p>Loading guide…</p>;
  if (q.isError || !q.data) return <p>Couldn't load this guide.</p>;
  const g = q.data.content as unknown as StudyGuideContent;
  return (
    <article className="space-y-8">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-electric">STUDY GUIDE</p>
          <h1 className="mt-2 font-display text-3xl font-bold">{q.data.title}</h1>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            Print
          </Button>
          <Button variant="outline" disabled={busy || !q.data.note_id} onClick={regen}>
            Regenerate
          </Button>
          <Button variant="outline" disabled={busy} onClick={remove}>
            Delete
          </Button>
        </div>
      </div>
      {g.overview && (
        <section>
          <h2 className="text-xl font-bold">Overview</h2>
          <p className="mt-2 whitespace-pre-wrap">{g.overview}</p>
        </section>
      )}
      {g.important_concepts?.length > 0 && (
        <section>
          <h2 className="text-xl font-bold">Main ideas</h2>
          <div className="mt-3 space-y-3">
            {g.important_concepts.map((x, i) => (
              <div key={i} className="rounded-xl border p-4">
                <h3 className="font-semibold">{x.name}</h3>
                <p className="mt-1 whitespace-pre-wrap">{x.explanation}</p>
              </div>
            ))}
          </div>
        </section>
      )}
      {g.key_definitions?.length > 0 && (
        <section>
          <h2 className="text-xl font-bold">Key vocabulary</h2>
          <dl className="mt-3 space-y-3">
            {g.key_definitions.map((x, i) => (
              <div key={i}>
                <dt className="font-semibold">{x.term}</dt>
                <dd>{x.definition}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {g.detailed_explanations?.length > 0 && (
        <section>
          <h2 className="text-xl font-bold">Explanations</h2>
          {g.detailed_explanations.map((x, i) => (
            <div key={i} className="mt-3">
              <h3 className="font-semibold">{x.heading}</h3>
              <p className="whitespace-pre-wrap">{x.body}</p>
            </div>
          ))}
        </section>
      )}
      {g.step_by_step_examples?.length > 0 && (
        <section>
          <h2 className="text-xl font-bold">Examples</h2>
          {g.step_by_step_examples.map((x, i) => (
            <div key={i} className="mt-3">
              <h3 className="font-semibold">{x.title}</h3>
              <ol className="ml-5 list-decimal">
                {x.steps?.map((s, j) => (
                  <li key={j}>{s}</li>
                ))}
              </ol>
              <p>{x.answer}</p>
            </div>
          ))}
        </section>
      )}
      {g.formulas?.length > 0 && (
        <section>
          <h2 className="text-xl font-bold">Formulas</h2>
          {g.formulas.map((x, i) => (
            <p key={i} className="mt-2">
              <strong>{x.name}:</strong> {x.formula} — {x.when_to_use}
            </p>
          ))}
        </section>
      )}
      {g.common_mistakes?.length > 0 && (
        <section>
          <h2 className="text-xl font-bold">Common mistakes</h2>
          {g.common_mistakes.map((x, i) => (
            <p key={i} className="mt-2">
              <strong>{x.mistake}:</strong> {x.fix}
            </p>
          ))}
        </section>
      )}
      {g.things_to_memorize?.length > 0 && (
        <section>
          <h2 className="text-xl font-bold">Things to remember</h2>
          <ul className="ml-5 mt-2 list-disc">
            {g.things_to_memorize.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </section>
      )}
      {g.review_questions?.length > 0 && (
        <section>
          <h2 className="text-xl font-bold">Review questions</h2>
          {g.review_questions.map((x, i) => (
            <details key={i} className="mt-3 rounded-xl border p-4">
              <summary className="cursor-pointer font-medium">{x.question}</summary>
              <p className="mt-2">{x.answer}</p>
            </details>
          ))}
        </section>
      )}
      {g.summary && (
        <section>
          <h2 className="text-xl font-bold">Summary</h2>
          <p className="mt-2 whitespace-pre-wrap">{g.summary}</p>
        </section>
      )}
    </article>
  );
}
