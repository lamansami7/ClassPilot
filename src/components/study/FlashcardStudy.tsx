import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Shuffle, Star } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import type { Flashcard } from "@/lib/ai.functions";
import type { Json } from "@/integrations/supabase/types";

export function FlashcardStudy({ id }: { id: string }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [shuffled, setShuffled] = useState<Flashcard[] | null>(null);
  const qc = useQueryClient();
  const deck = useQuery({
    queryKey: ["flashcards", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("flashcards").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("This flashcard set was not found.");
      return data;
    },
  });
  if (deck.isLoading) return <p role="status">Loading flashcards…</p>;
  if (deck.isError) return <p role="alert" className="text-destructive">{deck.error.message}</p>;
  const cards = shuffled ?? deck.data.cards as unknown as Flashcard[];
  const current = cards[index];
  const persist = async (next: Flashcard[]) => {
    const { error } = await supabase.from("flashcards").update({ cards: next as unknown as Json }).eq("id", id);
    if (error) return toast.error("Your progress couldn’t be saved. Try again.");
    setShuffled(next);
    await qc.invalidateQueries({ queryKey: ["flashcards"] });
  };
  const mark = async (field: "learned" | "difficult") => {
    const next = cards.map((card, i) => i === index ? { ...card, [field]: !card[field] } : card);
    await persist(next);
  };
  const shuffleCards = () => { setShuffled([...cards].sort(() => Math.random() - 0.5)); setIndex(0); setFlipped(false); };
  const step = (delta: number) => { setIndex((index + delta + cards.length) % cards.length); setFlipped(false); };

  return <div className="space-y-6">
    <PageHeader eyebrow={deck.data.topic || "Flashcards"} title={deck.data.title} description={`Card ${cards.length ? index + 1 : 0} of ${cards.length} · ${cards.filter((card) => card.learned).length} learned`}
      actions={<Button asChild variant="ghost"><Link to="/flashcards">All flashcards</Link></Button>} />
    {current ? <>
      <button type="button" onClick={() => setFlipped((value) => !value)} aria-label={flipped ? "Show question" : "Flip card to see answer"} className="block w-full text-left">
        <Card className="min-h-[300px] transition hover:shadow-md"><CardContent className="flex min-h-[300px] flex-col items-center justify-center gap-4 p-8 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-electric">{flipped ? "Answer" : "Question"}</span><p className="max-w-2xl text-xl font-semibold text-navy">{flipped ? current.back : current.front}</p><span className="text-sm text-muted-foreground">Click or press to flip</span>
        </CardContent></Card>
      </button>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="soft" onClick={() => step(-1)}><ArrowLeft /> Previous</Button><Button variant="navy" onClick={() => setFlipped((value) => !value)}>Flip card</Button><Button variant="soft" onClick={() => step(1)}>Next <ArrowRight /></Button>
        <Button variant={current.difficult ? "hero" : "ghost"} onClick={() => void mark("difficult")}><Star />{current.difficult ? "Difficult" : "Mark difficult"}</Button><Button variant={current.learned ? "hero" : "ghost"} onClick={() => void mark("learned")}><Check />{current.learned ? "Learned" : "Mark learned"}</Button><Button variant="ghost" onClick={shuffleCards}><Shuffle /> Shuffle</Button>
      </div>
    </> : <p>This set has no cards. Generate a new set from your notes.</p>}
  </div>;
}
