import { createFileRoute, useNavigate, useBlocker } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Flashcard } from "@/lib/ai.functions";
import type { Json } from "@/integrations/supabase/types";
export const Route = createFileRoute("/_authenticated/flashcards/$id")({ component: Page });
function Page() {
  const { id } = Route.useParams();
  return <Deck key={id} id={id} />;
}
function Deck({ id }: { id: string }) {
  const q = useQuery({
    queryKey: ["flashcards", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("flashcards").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (q.data && !dirty) setCards(q.data.cards as unknown as Flashcard[]);
  }, [q.data, dirty]);
  useBlocker({
    shouldBlockFn: () =>
      dirty && !window.confirm("You have unsaved deck changes. Leave without saving?"),
    enableBeforeUnload: dirty,
  });
  const card = cards[index];
  function update(patch: Partial<Flashcard>) {
    setCards((c) => c.map((v, i) => (i === index ? { ...v, ...patch } : v)));
    setDirty(true);
  }
  async function save() {
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("flashcards")
        .update({ cards: cards as unknown as Json })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      qc.setQueryData(["flashcards", id], data);
      setDirty(false);
      toast.success("Deck saved");
    } catch {
      toast.error("Couldn't save; your changes are still here.");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!confirm("Delete this deck permanently?")) return;
    setBusy(true);
    const { error } = await supabase.from("flashcards").delete().eq("id", id);
    if (error) {
      toast.error("Couldn't delete deck.");
      setBusy(false);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["flashcards"] });
    navigate({ to: "/flashcards", ignoreBlocker: true });
  }
  if (q.isLoading) return <p>Loading deck…</p>;
  if (q.isError || !q.data) return <p>Couldn't load deck.</p>;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">{q.data.title}</h1>
          <p className="mt-2 text-muted-foreground">
            {cards.filter((c) => c.learned).length} of {cards.length} marked learned
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={remove} disabled={busy}>
            Delete deck
          </Button>
          <Button onClick={save} disabled={!dirty || busy}>
            {busy ? "Saving…" : dirty ? "Save changes" : "Saved"}
          </Button>
        </div>
      </div>
      {card ? (
        <>
          <p className="text-sm text-muted-foreground">
            Card {index + 1} of {cards.length} · {flipped ? "Answer" : "Question"}
          </p>
          <button
            className="flex min-h-64 w-full items-center justify-center rounded-2xl border bg-card p-8 text-center text-xl font-medium hover:bg-muted"
            onClick={() => setFlipped(!flipped)}
          >
            {flipped ? card.back : card.front}
          </button>
          <p className="text-center text-xs text-muted-foreground">Click the card to flip</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={index === 0}
              onClick={() => {
                setIndex(index - 1);
                setFlipped(false);
              }}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={index >= cards.length - 1}
              onClick={() => {
                setIndex(index + 1);
                setFlipped(false);
              }}
            >
              Next
            </Button>
            <Button
              variant={card.learned ? "default" : "outline"}
              onClick={() => update({ learned: !card.learned })}
            >
              {card.learned ? "Learned ✓" : "Mark learned"}
            </Button>
            <Button
              variant={card.difficult ? "default" : "outline"}
              onClick={() => update({ difficult: !card.difficult })}
            >
              {card.difficult ? "Difficult ✓" : "Mark difficult"}
            </Button>
            <Button variant="outline" onClick={() => setEditing(!editing)}>
              Edit card
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (confirm("Delete this card?")) {
                  setCards((c) => c.filter((_, i) => i !== index));
                  setIndex(Math.max(0, index - 1));
                  setDirty(true);
                }
              }}
            >
              Delete card
            </Button>
          </div>
          {editing && (
            <div className="space-y-3 rounded-xl border p-4">
              <label className="block text-sm">
                Front
                <Input value={card.front} onChange={(e) => update({ front: e.target.value })} />
              </label>
              <label className="block text-sm">
                Back
                <Textarea value={card.back} onChange={(e) => update({ back: e.target.value })} />
              </label>
            </div>
          )}
        </>
      ) : (
        <p>No cards in this deck.</p>
      )}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setCards((c) => [
              ...c,
              {
                id: crypto.randomUUID(),
                front: "New question",
                back: "New answer",
                learned: false,
                difficult: false,
              },
            ]);
            setIndex(cards.length);
            setEditing(true);
            setDirty(true);
          }}
        >
          Add card
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setCards((c) => {
              const a = [...c];
              for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [a[i], a[j]] = [a[j]!, a[i]!];
              }
              return a;
            });
            setIndex(0);
            setFlipped(false);
            setDirty(true);
          }}
        >
          Shuffle
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Save changes before leaving the page.</p>
    </div>
  );
}
