import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageHeader } from "@/components/app/PageHeader";
import { CreatePracticeDialog } from "@/components/study/CreatePracticeDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route=createFileRoute("/_authenticated/worksheets")({component:WorksheetsPage});
function WorksheetsPage(){const qc=useQueryClient();const q=useQuery({queryKey:["worksheets"],queryFn:async()=>{const{data,error}=await supabase.from("worksheets").select("id,title,topic,difficulty,created_at,score,completed_at").order("created_at",{ascending:false});if(error)throw error;return data??[]}});
const remove=async(id:string)=>{if(!window.confirm("Delete this worksheet?"))return;const{error}=await supabase.from("worksheets").delete().eq("id",id);if(error)return toast.error("Couldn’t delete the worksheet.");await qc.invalidateQueries({queryKey:["worksheets"]});};
return <div><PageHeader eyebrow="Practice" title="Worksheets" description="Generate questions from your class notes and check your understanding." actions={<CreatePracticeDialog kind="worksheet" trigger={<Button variant="hero"><Wand2/> Create worksheet</Button>}/>} />
{q.isLoading?<p role="status">Loading worksheets…</p>:q.isError?<p role="alert" className="text-destructive">{q.error.message}</p>:q.data.length?<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{q.data.map(w=><Card key={w.id}><CardContent className="flex items-start justify-between gap-3 p-4"><div><Link to="/worksheets/$id" params={{id:w.id}} className="font-semibold text-navy hover:text-electric">{w.title}</Link><p className="mt-1 text-sm text-muted-foreground">{w.topic||"Practice"} · {w.difficulty}</p><p className="mt-2 text-xs text-muted-foreground">{w.completed_at?(`Score: ${w.score}%`):"Not completed"}</p></div><Button variant="ghost" size="icon" aria-label={`Delete ${w.title}`} onClick={()=>void remove(w.id)}><Trash2/></Button></CardContent></Card>)}</div>:<EmptyState icon={ClipboardList} title="No worksheets yet" description="Create a worksheet from a class and your saved notes." action={<CreatePracticeDialog kind="worksheet" trigger={<Button variant="soft"><Wand2/> Create worksheet</Button>}/>} />}</div>;
}
