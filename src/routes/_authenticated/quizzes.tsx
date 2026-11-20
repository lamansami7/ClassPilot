import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileQuestion, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageHeader } from "@/components/app/PageHeader";
import { CreatePracticeDialog } from "@/components/study/CreatePracticeDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route=createFileRoute("/_authenticated/quizzes")({component:QuizzesPage});
function QuizzesPage(){const qc=useQueryClient();const q=useQuery({queryKey:["quizzes"],queryFn:async()=>{const{data,error}=await supabase.from("quizzes").select("id,title,topic,difficulty,created_at,score,completed_at").order("created_at",{ascending:false});if(error)throw error;return data??[]}});
const remove=async(id:string)=>{if(!window.confirm("Delete this practice test?"))return;const{error}=await supabase.from("quizzes").delete().eq("id",id);if(error)return toast.error("Couldn’t delete this test.");await qc.invalidateQueries({queryKey:["quizzes"]});};
return <div><PageHeader eyebrow="Practice" title="Quizzes & Tests" description="Practice tests use your notes when available and give explanations after submission." actions={<CreatePracticeDialog kind="quiz" trigger={<Button variant="hero"><Wand2/> Create practice test</Button>}/>} />
{q.isLoading?<p role="status">Loading quizzes…</p>:q.isError?<p role="alert" className="text-destructive">{q.error.message}</p>:q.data.length?<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{q.data.map(w=><Card key={w.id}><CardContent className="flex items-start justify-between gap-3 p-4"><div><Link to="/quizzes/$id" params={{id:w.id}} className="font-semibold text-navy hover:text-electric">{w.title}</Link><p className="mt-1 text-sm text-muted-foreground">{w.topic||"Practice"} · {w.difficulty}</p><p className="mt-2 text-xs text-muted-foreground">{w.completed_at?(`Practice score: ${w.score}%`):"Not completed"}</p></div><Button variant="ghost" size="icon" aria-label={`Delete ${w.title}`} onClick={()=>void remove(w.id)}><Trash2/></Button></CardContent></Card>)}</div>:<EmptyState icon={FileQuestion} title="No practice tests yet" description="Build a practice test using notes from one of your classes." action={<CreatePracticeDialog kind="quiz" trigger={<Button variant="soft"><Wand2/> Create practice test</Button>}/>} />}</div>;
}
