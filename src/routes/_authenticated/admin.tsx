import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { meQuery } from '@/lib/queries';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/_authenticated/admin')({component: Admin});
function Admin() {
 const me = useQuery(meQuery);
 return me.data?.isAdmin ? <Controls/> : <p role="alert">Administrator access required.</p>;
}
function Controls() {
 const qc = useQueryClient();
 const [status,setStatus] = useState('pending');
 const [busy,setBusy] = useState(false);
 const dashboard = useQuery({queryKey:['admin',status],queryFn:async()=>{
 const [stats,queue,settings] = await Promise.all([supabase.rpc('admin_platform_stats'),supabase.from('profiles').select('id,email,grade').eq('eligibility_status',status).order('created_at').limit(100),supabase.from('app_settings').select('require_admin_approval').eq('id',1).single()]);
 if(stats.error || queue.error || settings.error || !settings.data) throw Error('Unavailable');
 return {stats:stats.data as Record<string,number>, queue:queue.data, approval:settings.data.require_admin_approval};
 }});
 async function change(action:()=>PromiseLike<{error:unknown}>,confirmation:string){
 if(!confirm(confirmation)) return; setBusy(true);
 try {const {error}=await action(); if(error) throw error; await qc.invalidateQueries({queryKey:['admin']}); toast.success('Updated');} catch {toast.error('Update failed. Refresh and retry.');} finally {setBusy(false);}
 }
 const data=dashboard.data;
 return <div className="space-y-6"><header><h1 className="font-display text-3xl font-bold">Administration</h1><p className="mt-2 text-muted-foreground">Manage platform access without opening private student work.</p></header>
 {dashboard.isError ? <Button onClick={()=>dashboard.refetch()}>Retry loading administration</Button> : !data ? <p>Loading access controls…</p> : <><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{(['students','approved','pending','ai_requests_7d'] as const).map((k,i)=><div key={k} className="rounded-xl border bg-card p-4"><strong className="block text-2xl">{data.stats[k]}</strong>{['Accounts','Approved','Awaiting review','AI requests · week'][i]}</div>)}</div>
 <section className="space-y-3 rounded-xl border bg-card p-5"><h2 className="font-semibold">Enrollment review</h2><p>Manual approval for new accounts is {data.approval?'on':'off'}. A district email and a guardian acknowledgment are not proof of enrollment or verified consent.</p>{!data.approval && <Button disabled={busy} onClick={()=>change(()=>supabase.from('app_settings').update({require_admin_approval:true}).eq('id',1).select('id').single(),'Require manual approval for future student accounts? Existing accounts are not changed.')}>Require manual review</Button>}</section>
 <section className="rounded-xl border bg-card p-5"><label className="font-semibold">Student access <select className="ml-2 rounded border bg-background p-2" value={status} onChange={e=>setStatus(e.target.value)}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Access revoked</option></select></label><p className="my-3 text-sm text-muted-foreground">Showing up to 100 accounts. Verify eligibility through an authorized district process before approval.</p>{!data.queue.length && <p>No accounts in this group.</p>}{data.queue.map(p=><div key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-t py-3"><span className="break-all">{p.email} · Grade {p.grade ?? '—'}</span><div className="flex gap-2">{['approved','rejected'].filter(v=>v!==status).map(v=><Button key={v} disabled={busy} size="sm" variant="outline" onClick={()=>change(()=>supabase.from('profiles').update({eligibility_status:v}).eq('id',p.id).eq('eligibility_status',status).select('id').single(),`Set ${p.email} to ${v}?`)}>{v==='approved'?'Approve':'Revoke access'}</Button>)}</div></div>)}</section></>}
 </div>;
}
