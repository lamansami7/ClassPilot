import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Printer, RotateCcw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { regenerateStudyGuide, type StudyGuideContent } from "@/lib/ai.functions";
import type { Json } from "@/integrations/supabase/types";

export const Route=createFileRoute("/_authenticated/study-guides/$id")({component:GuidePage});
function GuidePage(){
 const{id}=Route.useParams();const nav=useNavigate();const qc=useQueryClient();const [busy,setBusy]=useState(false);const [title,setTitle]=useState("");const [overview,setOverview]=useState("");const [summary,setSummary]=useState("");const gen=useServerFn(regenerateStudyGuide);
 const q=useQuery({queryKey:["study-guides",id],queryFn:async()=>{const{data,error}=await supabase.from("study_guides").select("*").eq("id",id).maybeSingle();if(error)throw error;if(!data)throw new Error("Study guide not found.");return data;}});
 const content=q.data?.content as unknown as StudyGuideContent|undefined;
 useEffect(()=>{if(content){setTitle(content.title);setOverview(content.overview);setSummary(content.summary);}},[q.dataUpdatedAt]);
 if(q.isLoading)return <p role="status">Loading study guide…</p>;
 if(q.isError||!content)return <p role="alert" className="text-destructive">{q.error?.message??"Study guide unavailable."}</p>;
 const save=async()=>{const next={...content,title:title.trim()||"Study guide",overview,summary};const{error}=await supabase.from("study_guides").update({title:next.title,content:next as unknown as Json}).eq("id",id);if(error)return toast.error("Couldn’t save your changes.");await qc.invalidateQueries({queryKey:["study-guides"]});toast.success("Study guide saved.");};
 const regenerate=async()=>{if(!window.confirm("Regenerate this guide from its original note? Your current edits will be replaced."))return;setBusy(true);try{const res=await gen({data:{studyGuideId:id}});if(!res.ok)return toast.error(res.error);await q.refetch();toast.success("Study guide updated from your note.");}catch{toast.error("Couldn’t regenerate the guide.");}finally{setBusy(false);}};
 const remove=async()=>{if(!window.confirm("Delete this study guide?"))return;const{error}=await supabase.from("study_guides").delete().eq("id",id);if(error)return toast.error("Couldn’t delete this study guide.");await qc.invalidateQueries({queryKey:["study-guides"]});nav({to:"/study-guides"});};
 return <div className="space-y-6 print:space-y-4"><PageHeader eyebrow={q.data.topic||"Study guide"} title="Study Guide" actions={<><Button variant="soft" onClick={()=>void save()}><Save /> Save edits</Button><Button variant="ghost" onClick={()=>window.print()}><Printer /> Print</Button><Button variant="ghost" disabled={busy} onClick={()=>void regenerate()}><RotateCcw /> Regenerate</Button><Button variant="ghost" onClick={()=>void remove()}><Trash2 /></Button></>} />
 <Card><CardContent className="space-y-4 p-5"><Input aria-label="Guide title" value={title} onChange={e=>setTitle(e.target.value)} className="text-xl font-bold" /><Textarea aria-label="Topic overview" value={overview} onChange={e=>setOverview(e.target.value)} rows={4} /></CardContent></Card>
 <Section title="Main ideas">{content.important_concepts.map((x,i)=><p key={i}><strong>{x.name}.</strong> {x.explanation}</p>)}</Section>
 <Section title="Important vocabulary">{content.key_definitions.map((x,i)=><p key={i}><strong>{x.term}:</strong> {x.definition}</p>)}</Section>
 <Section title="Detailed explanations">{content.detailed_explanations.map((x,i)=><article key={i}><h3 className="font-semibold">{x.heading}</h3><p>{x.body}</p></article>)}</Section>
 <Section title="Step-by-step examples">{content.step_by_step_examples.map((x,i)=><article key={i}><h3 className="font-semibold">{x.title}</h3><ol className="list-decimal space-y-1 pl-5">{x.steps.map((step,j)=><li key={j}>{step}</li>)}</ol><p><strong>Answer:</strong> {x.answer}</p></article>)}</Section>
 {content.formulas.length>0&&<Section title="Formulas">{content.formulas.map((x,i)=><p key={i}><strong>{x.name}: {x.formula}</strong> — {x.when_to_use}</p>)}</Section>}
 <Section title="Common mistakes">{content.common_mistakes.map((x,i)=><p key={i}><strong>{x.mistake}</strong><br/>Try this: {x.fix}</p>)}</Section>
 <Section title="Remember">{content.things_to_memorize.map((x,i)=><p key={i}>• {x}</p>)}</Section>
 <Section title="Review questions">{content.review_questions.map((x,i)=><details key={i} className="rounded-lg border p-3"><summary className="cursor-pointer font-medium">{x.question}</summary><p className="mt-2">{x.answer}</p></details>)}</Section>
 <Card><CardHeader><CardTitle>Summary</CardTitle></CardHeader><CardContent><Textarea aria-label="Guide summary" value={summary} onChange={e=>setSummary(e.target.value)} rows={4}/></CardContent></Card>
 <Button asChild variant="ghost"><Link to="/study-guides">Back to Study Guides</Link></Button></div>;
}
function Section({title,children}:{title:string;children:React.ReactNode}){return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="space-y-3">{children}</CardContent></Card>}
