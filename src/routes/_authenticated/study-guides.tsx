import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpenText, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageHeader } from "@/components/app/PageHeader";
import { StudyGuideFromNoteDialog } from "@/components/study/StudyGuideFromNoteDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { myCoursesQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/study-guides")({ component: StudyGuidesPage });
function StudyGuidesPage() {
 const qc=useQueryClient(); const courses=useQuery(myCoursesQuery);
 const guides=useQuery({queryKey:["study-guides"],queryFn:async()=>{const {data,error}=await supabase.from("study_guides").select("id,title,topic,course_id,created_at").order("created_at",{ascending:false});if(error)throw error;return data??[]}});
 const remove=async(id:string)=>{if(!window.confirm("Delete this study guide?"))return;const {error}=await supabase.from("study_guides").delete().eq("id",id);if(error)return toast.error("Couldn’t delete the study guide.");await qc.invalidateQueries({queryKey:["study-guides"]});};
 return <div><PageHeader eyebrow="Study materials" title="Study Guides" description="Review grade-level guides generated from your notes." actions={<StudyGuideFromNoteDialog trigger={<Button variant="hero"><Wand2 /> Generate guide</Button>} />} />
 {guides.isLoading?<p role="status">Loading study guides…</p>:guides.isError?<p role="alert" className="text-destructive">{guides.error.message}</p>:guides.data?.length?<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{guides.data.map(g=><Card key={g.id}><CardContent className="flex items-start justify-between gap-3 p-4"><div><p className="text-xs text-electric">{courses.data?.find(c=>c.id===g.course_id)?.course_name??"Class"}</p><Link to="/study-guides/$id" params={{id:g.id}} className="mt-1 block font-semibold text-navy hover:text-electric">{g.title}</Link><p className="mt-1 text-sm text-muted-foreground">{g.topic||"Study guide"}</p></div><Button variant="ghost" size="icon" aria-label={`Delete ${g.title}`} onClick={()=>void remove(g.id)}><Trash2 /></Button></CardContent></Card>)}</div>:<EmptyState icon={BookOpenText} title="No study guides yet" description="Choose one of your notes to generate a study guide." action={<StudyGuideFromNoteDialog trigger={<Button variant="soft"><Wand2 /> Generate guide</Button>} />} />}</div>;
}
