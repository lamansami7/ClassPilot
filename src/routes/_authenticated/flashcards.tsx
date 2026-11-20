import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageHeader } from "@/components/app/PageHeader";
import { CreateFlashcardsDialog } from "@/components/study/CreateFlashcardsDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route=createFileRoute("/_authenticated/flashcards")({component:FlashcardsPage});
function FlashcardsPage(){const qc=useQueryClient();const q=useQuery({queryKey:["flashcards"],queryFn:async()=>{const{data,error}=await supabase.from("flashcards").select("id,title,topic,cards,created_at").order("created_at",{ascending:false});if(error)throw error;return data??[]}});
const remove=async(id:string)=>{if(!window.confirm("Delete this flashcard set?"))return;const{error}=await supabase.from("flashcards").delete().eq("id",id);if(error)return toast.error("Couldn’t delete this set.");await qc.invalidateQueries({queryKey:["flashcards"]});};
return <div><PageHeader eyebrow="Study materials" title="Flashcards" description="Study a saved deck, shuffle the cards, and track what you have learned." actions={<CreateFlashcardsDialog trigger={<Button variant="hero"><Wand2/> Create flashcards</Button>}/>} />
{q.isLoading?<p role="status">Loading flashcards…</p>:q.isError?<p role="alert" className="text-destructive">{q.error.message}</p>:q.data.length?<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{q.data.map(deck=><Card key={deck.id}><CardContent className="flex items-start justify-between gap-3 p-4"><div><Link to="/flashcards/$id" params={{id:deck.id}} className="font-semibold text-navy hover:text-electric">{deck.title}</Link><p className="mt-1 text-sm text-muted-foreground">{deck.topic||"Flashcards"} · {Array.isArray(deck.cards)?deck.cards.length:0} cards</p></div><Button variant="ghost" size="icon" aria-label={`Delete ${deck.title}`} onClick={()=>void remove(deck.id)}><Trash2/></Button></CardContent></Card>)}</div>:<EmptyState icon={Layers} title="No flashcards yet" description="Generate a deck from a note or class." action={<CreateFlashcardsDialog trigger={<Button variant="soft"><Wand2/> Create flashcards</Button>}/>} />}</div>;
}
