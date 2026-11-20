import { createFileRoute, useBlocker } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId } from "@/lib/use-user";
import { myCoursesQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export const Route = createFileRoute("/_authenticated/recordings")({ component: Recordings });
function Recordings() {
  const qc = useQueryClient();
  const courses = useQuery(myCoursesQuery);
  const list = useQuery({
    queryKey: ["recordings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recordings")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const startTime = useRef(0);
  const elapsedRef = useRef(0);
  const mounted = useRef(true);
  const [status, setStatus] = useState<"idle" | "recording" | "paused" | "stopped">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [course, setCourse] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  useBlocker({
    shouldBlockFn: () =>
      status !== "idle" && !window.confirm("Your recording is not saved. Leave this page?"),
    enableBeforeUnload: status !== "idle",
  });
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (recorder.current?.state !== "inactive") recorder.current?.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  useEffect(() => {
    if (status !== "recording") return;
    const timer = window.setInterval(
      () => setElapsed(elapsedRef.current + (Date.now() - startTime.current) / 1000),
      250,
    );
    return () => window.clearInterval(timer);
  }, [status]);
  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("Recording is not supported in this browser.");
      return;
    }
    if (
      !confirm(
        "Only record with permission from your teacher and everyone being recorded. Follow your school's rules. Continue?",
      )
    )
      return;
    setBusy(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) { s.getTracks().forEach((t) => t.stop()); return; }
      stream.current = s;
      const r = new MediaRecorder(s);
      chunks.current = [];
      let size = 0;
      r.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
        size += e.data.size;
        if (size >= 20 * 1024 * 1024 && r.state !== "inactive") stop();
      };
      r.onstop = () => {
        s.getTracks().forEach((t) => t.stop());
        if (!mounted.current) return;
        setBlob(new Blob(chunks.current, { type: r.mimeType || "audio/webm" }));
        setStatus("stopped");
      };
      r.onerror = () => toast.error("Recording failed; check microphone permissions.");
      recorder.current = r;
      elapsedRef.current = 0;
      setElapsed(0);
      setBlob(null);
      r.start(1000);
      startTime.current = Date.now();
      setStatus("recording");
    } catch {
      stream.current?.getTracks().forEach(t => t.stop());
      toast.error("Couldn't access the microphone. Check your browser permissions.");
    } finally { setBusy(false); }
  }
  function pause() {
    if (recorder.current?.state !== "recording") return;
    recorder.current.pause();
    elapsedRef.current += (Date.now() - startTime.current) / 1000;
    setElapsed(elapsedRef.current);
    setStatus("paused");
  }
  function resume() {
    if (recorder.current?.state !== "paused") return;
    recorder.current.resume();
    startTime.current = Date.now();
    setStatus("recording");
  }
  function stop() {
    if (!recorder.current || recorder.current.state === "inactive") return;
    if (recorder.current.state === "recording")
      elapsedRef.current += (Date.now() - startTime.current) / 1000;
    setElapsed(elapsedRef.current);
    recorder.current.stop();
  }
  async function save() {
    if (!blob || !blob.size) return;
    setBusy(true);
    try {
      const user = await currentUserId();
      const path = `${user}/${crypto.randomUUID()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from("recordings")
        .upload(path, blob, { contentType: blob.type || "audio/webm" });
      if (uploadError) throw uploadError;
      const { error } = await supabase.from("recordings").insert({
        student_id: user,
        course_id: course || null,
        title: title.trim() || "Lesson recording",
        audio_path: path,
        duration: Math.round(elapsed),
      });
      if (error) {
        const cleanup = await supabase.storage.from("recordings").remove([path]);
        if (cleanup.error)
          toast.error("The upload couldn't be cleaned up; contact the administrator.");
        throw error;
      }
      setBlob(null);
      setStatus("idle");
      setTitle("");
      await qc.invalidateQueries({ queryKey: ["recordings"] });
      toast.success("Recording saved");
    } catch {
      toast.error(
        "Couldn't save recording. It remains available here to retry while this page is open.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function play(id: string, path: string) {
    const { data, error } = await supabase.storage.from("recordings").createSignedUrl(path, 3600);
    if (error) {
      toast.error("Couldn't open recording.");
      return;
    }
    setPlaying(id);
    setAudioUrl(data.signedUrl);
  }
  async function remove(id: string, path: string) {
    if (!confirm("Delete this recording permanently?")) return;
    setBusy(true);
    try {
      const { error: storageError } = await supabase.storage.from("recordings").remove([path]);
      if (storageError) throw storageError;
      const { error } = await supabase.from("recordings").delete().eq("id", id);
      if (error) throw error;
      if (playing === id) {
        setPlaying(null);
        setAudioUrl(null);
      }
      await qc.invalidateQueries({ queryKey: ["recordings"] });
      toast.success("Recording deleted");
    } catch {
      toast.error("Couldn't fully delete the recording. Please retry.");
    } finally {
      setBusy(false);
    }
  }
  async function transcribe(id: string, path: string) {
    if (!confirm("Send this recording to the AI service for transcription? Only continue with permission.")) return;
    setBusy(true);
    try {
      const {data: audio, error} = await supabase.storage.from("recordings").download(path);
      if (error || !audio) throw Error();
      const {data} = await supabase.auth.getSession();
      if (!data.session) throw Error();
      const form = new FormData(); form.append("file", audio, path.split("/").pop());
      const res = await fetch("/api/transcribe", {method:"POST", headers:{Authorization:`Bearer ${data.session.access_token}`}, body:form});
      const payload = await res.json();
      if (!res.ok || typeof payload.text !== 'string' || !payload.text.trim()) throw Error();
      const result = await supabase.from("recordings").update({ transcript:payload.text }).eq("id",id).select('id').single();
      if(result.error) throw result.error;
      await qc.invalidateQueries({queryKey:['recordings']}); toast.success('Transcript saved. Review it for accuracy.');
    } catch {toast.error('Transcription failed. Your recording is unchanged.');} finally {setBusy(false);}
  }
  async function transcriptNote( courseId: string | null, name: string, transcript: string) {
    setBusy(true);
    try {
      const {error} = await supabase.from('notes').insert({student_id:await currentUserId(),course_id:courseId,title:name,topic:'Recording transcript',content:transcript,content_text:transcript});
      if(error) throw error;
      await Promise.all(['notes','my-courses','study-center'].map(k=>qc.invalidateQueries({queryKey:[k]})));
      toast.success('Transcript copied to My Notes. Review it before generating study materials.');
    } catch {toast.error('Could not create a note. Your transcript is unchanged.');} finally {setBusy(false);}
  }
  async function rename(id: string, old: string) {
    const name = prompt("Recording name", old);
    if (!name?.trim()) return;
    const { error } = await supabase
      .from("recordings")
      .update({ title: name.trim().slice(0, 200) })
      .eq("id", id);
    if (error) toast.error("Couldn't rename recording.");
    else await qc.invalidateQueries({ queryKey: ["recordings"] });
  }
  const time = `${Math.floor(elapsed / 60)}:${String(Math.floor(elapsed % 60)).padStart(2, "0")}`;
  return (
    <div className="space-y-7">
      <div>
        <h1 className="font-display text-3xl font-bold">Recordings</h1>
        <p className="mt-2 text-muted-foreground">Capture lessons only when you have permission.</p>
      </div>
      <section className="space-y-4 rounded-2xl border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Recording stops if the browser closes or the device sleeps. Keep this page open until the
          upload finishes. Capture stops automatically near 20 MB.
        </p>
        <p className="font-display text-3xl font-bold">{time}</p>
        <p className="text-sm capitalize">{status}</p>
        <div className="flex flex-wrap gap-2">
          {status === "idle" && <Button disabled={busy} onClick={start}>Start recording</Button>}
          {status === "recording" && (
            <Button variant="outline" onClick={pause}>
              Pause
            </Button>
          )}
          {status === "paused" && (
            <Button variant="outline" onClick={resume}>
              Resume
            </Button>
          )}
          {(status === "recording" || status === "paused") && <Button onClick={stop}>Stop</Button>}
        </div>
        {status === "stopped" && (
          <div className="space-y-3">
            <label className="block text-sm">
              Title
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Lesson recording"
              />
            </label>
            <label className="block text-sm">
              Class
              <select
                className="mt-2 block w-full rounded-md border bg-background p-2"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
              >
                <option value="">No class</option>
                {courses.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.course_name}
                  </option>
                ))}
              </select>
            </label>
            <Button onClick={save} disabled={busy || !blob?.size}>
              {busy ? "Uploading…" : "Save recording"}
            </Button>
            <Button
              className="ml-2"
              variant="outline"
              disabled={busy}
              onClick={() => {
                if (confirm("Discard this unsaved recording?")) {
                  setBlob(null);
                  setStatus("idle");
                }
              }}
            >
              Discard
            </Button>
          </div>
        )}
      </section>
      <section>
        <h2 className="text-xl font-semibold">Saved recordings</h2>
        <div className="mt-4 space-y-3">
          {list.isLoading ? (
            <p>Loading…</p>
          ) : list.isError ? (
            <p>Couldn't load recordings.</p>
          ) : !list.data?.length ? (
            <p className="text-muted-foreground">No recordings yet.</p>
          ) : (
            list.data.map((r) => (
              <div key={r.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()} · {Math.floor(r.duration / 60)}:
                      {String(r.duration % 60).padStart(2, "0")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!r.transcript && <Button size="sm" disabled={busy} onClick={()=>transcribe(r.id,r.audio_path)}>Transcribe</Button>}
                    <Button size="sm" variant="outline" onClick={() => play(r.id, r.audio_path)}>
                      Play
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => rename(r.id, r.title)}>
                      Rename
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => remove(r.id, r.audio_path)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                {playing === r.id && audioUrl && (
                  <audio className="mt-4 w-full" controls src={audioUrl} />
                )}
                {r.transcript && (
                  <details className="mt-3">
                    <summary>Review transcript</summary>
                    <Button variant="outline" disabled={busy} onClick={()=>transcriptNote(r.course_id,r.title,r.transcript!)}>Copy transcript to a new note</Button>
                    <p className="mt-2 whitespace-pre-wrap text-sm">{r.transcript}</p>
                  </details>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
