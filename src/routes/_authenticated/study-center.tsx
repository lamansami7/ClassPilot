import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpenText, ClipboardList, FileQuestion, Layers, Mic, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { myCoursesQuery } from "@/lib/queries";

export const Route=createFileRoute("/_authenticated/study-center")({component:StudyCenterPage});
type Item={id:string;title:string;topic:string|null;course_id:string|null;created_at:string;kind:"Study guide"|"Worksheet"|"Flashcards"|"Quiz"|"Recording"|"Resource";href:string;table:string};
function StudyCenterPage(){
 const[search,setSearch]=useState("");const[course,setCourse]=useState("all");const[kind,setKind]=useState("all");const qc=useQueryClient();const courses=useQuery(myCoursesQuery);
 const q=useQuery({queryKey:["study-center"],queryFn:async()=>{
  const specs=[["study_guides","Study guide","/study-guides/$id"],["worksheets","Worksheet","/worksheets/$id"],["flashcards","Flashcards","/flashcards/$id"],["quizzes","Quiz","/quizzes/$id"],["recordings","Recording","/recordings"],["saved_resources","Resource",null]] as const;
  const results=await Promise.all(specs.map(([table])=>supabase.from(table).select("id,title,topic,course_id,created_at").order("created_at",{ascending:false})));
  const items:Item[]=[];
  results.forEach((result,i)=>{if(result.error)throw result.error;const [table,label,path]=specs[i]!;for(const row of result.data??[])items.push({id:row.id,title:row.title,topic:row.topic,course_id:row.course_id,created_at:row.created_at,kind:label,table,href:path?path.replace("$id",row.id):"/study-center"});});
  return items.sort((a,b)=>b.created_at.localeCompare(a.created_at));
 }});
 const items=useMemo(()=>{const term=search.trim().toLocaleLowerCase();return(q.data??[]).filter(x=>(course==="all"||x.course_id===course)&&(kind==="all"||x.kind===kind)&&(!term||`${x.title} ${x.topic??""} ${x.kind}`.toLocaleLowerCase().includes(term)));},[q.data,search,course,kind]);
 const remove=async(item:Item)=>{if(!window.confirm(`Delete “${item.title}”?`))return;const{error}=await supabase.from(item.table as "study_guides").delete().eq("id",item.id);if(error)return toast.error("Couldn’t delete this item.");await qc.invalidateQueries({queryKey:["study-center"]});await qc.invalidateQueries({queryKey:[item.table]});};
 const icon=(item:Item)=>item.kind==="Study guide"?BookOpenText:item.kind==="Worksheet"?ClipboardList:item.kind==="Flashcards"?Layers:item.kind==="Quiz"?FileQuestion:Mic;
 return <div><PageHeader eyebrow="Your library" title="Study Center" description="Find and organize the learning materials you have saved." />
 <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_220px_190px]"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input aria-label="Search study materials" className="pl-9" placeholder="Search materials" value={search} onChange={e=>setSearch(e.target.value)}/></div>
 <Select value={course} onValueChange={setCourse}><SelectTrigger aria-label="Filter by class"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All classes</SelectItem>{(courses.data??[]).map(c=><SelectItem key={c.id} value={c.id}>{c.course_name}</SelectItem>)}</SelectContent></Select>
 <Select value={kind} onValueChange={setKind}><SelectTrigger aria-label="Filter by type"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All types</SelectItem>{["Study guide","Worksheet","Flashcards","Quiz","Recording","Resource"].map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div>
 {q.isLoading?<p role="status">Loading your materials…</p>:q.isError?<p role="alert" className="text-destructive">{q.error.message}</p>:items.length?<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{items.map(item=>{const Icon=icon(item);return <Card key={item.kind+item.id}><CardContent className="flex items-start justify-between gap-3 p-4"><div className="min-w-0"><p className="flex items-center gap-2 text-xs text-electric"><Icon className="h-4 w-4"/>{item.kind} · {courses.data?.find(c=>c.id===item.course_id)?.course_name??"Class"}</p><Link to={item.href as never} params={item.href.includes("$id")?{id:item.id}:undefined as never} className="mt-2 block truncate font-semibold text-navy hover:text-electric">{item.title}</Link><p className="mt-1 text-sm text-muted-foreground">{item.topic||new Date(item.created_at).toLocaleDateString()}</p></div>{item.kind!=="Recording"&&item.kind!=="Resource"&&<Button variant="ghost" size="icon" aria-label={`Delete ${item.title}`} onClick={()=>void remove(item)}><Trash2/></Button>}</CardContent></Card>})}</div>:<EmptyState icon={BookOpenText} title="No matching materials" description="Try another class or search term. Materials you create will show here."/>}</div>;
}
