import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { myCoursesQuery } from "@/lib/queries";
import { currentUserId } from "@/lib/use-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
export const Route = createFileRoute("/_authenticated/tutor")({ component: Tutor });
function Tutor() {
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [course, setCourse] = useState("");
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const courses = useQuery(myCoursesQuery);
  const threads = useQuery({
    queryKey: ["tutor-threads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutor_threads")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  async function create() {
    setBusy(true);
    try {
      const user = await currentUserId();
      const { data, error } = await supabase
        .from("tutor_threads")
        .insert({ student_id: user, course_id: course || null })
        .select("id")
        .single();
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["tutor-threads"] });
      setSelected(data.id);
    } catch {
      toast.error("Couldn't create conversation.");
    } finally {
      setBusy(false);
    }
  }
  async function rename(id: string, title: string) {
    const name = prompt("Conversation name", title);
    if (!name?.trim()) return;
    const { error } = await supabase
      .from("tutor_threads")
      .update({ title: name.trim().slice(0, 120) })
      .eq("id", id);
    if (error) toast.error("Couldn't rename conversation.");
    else await qc.invalidateQueries({ queryKey: ["tutor-threads"] });
  }
  async function remove(id: string) {
    if (!confirm("Delete this conversation and its messages?")) return;
    const { error } = await supabase.from("tutor_threads").delete().eq("id", id);
    if (error) {
      toast.error("Couldn't delete conversation.");
      return;
    }
    if (selected === id) setSelected(null);
    await qc.invalidateQueries({ queryKey: ["tutor-threads"] });
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">AI Tutor</h1>
        <p className="mt-2 text-muted-foreground">
          Ask questions, explore ideas and learn step by step.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-3 rounded-2xl border bg-card p-4">
          <label className="block text-sm">
            Class for new conversation
            <select
              className="mt-2 w-full rounded-md border bg-background p-2"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
            >
              <option value="">General</option>
              {courses.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.course_name}
                </option>
              ))}
            </select>
          </label>
          <Button onClick={create} disabled={busy} className="w-full">
            New conversation
          </Button>
          <Input
            aria-label="Search conversations"
            placeholder="Search conversations"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {threads.isLoading ? (
            <p>Loading…</p>
          ) : threads.isError ? (
            <p>Couldn't load conversations.</p>
          ) : (
            threads.data
              ?.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()))
              .map((t) => (
                <div key={t.id} className="rounded-lg border p-2">
                  <button
                    onClick={() => setSelected(t.id)}
                    className="w-full truncate text-left text-sm font-medium"
                  >
                    {t.title}
                  </button>
                  <div className="mt-2 flex gap-3 text-xs text-electric">
                    <button onClick={() => rename(t.id, t.title)}>Rename</button>
                    <button onClick={() => remove(t.id)}>Delete</button>
                  </div>
                </div>
              ))
          )}
        </aside>
        <div className="min-w-0 rounded-2xl border bg-card p-5">
          {selected ? (
            <Conversation key={selected} id={selected} />
          ) : (
            <p className="py-16 text-center text-muted-foreground">
              Start or select a conversation.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
function Conversation({ id }: { id: string }) {
  const q = useQuery({
    queryKey: ["tutor-messages", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutor_messages")
        .select("message_id,role,parts")
        .eq("thread_id", id)
        .order("created_at");
      if (error) throw error;
      return data.map((m) => ({ id: m.message_id, role: m.role, parts: m.parts }) as UIMessage);
    },
  });
  if (q.isLoading) return <p>Loading conversation…</p>;
  if (q.isError) return <p>Couldn't load conversation.</p>;
  return <Chat key={id} id={id} initial={q.data ?? []} />;
}
function Chat({ id, initial }: { id: string; initial: UIMessage[] }) {
  const [input, setInput] = useState("");
  const qc = useQueryClient();
  const { messages, sendMessage, status, error } = useChat({
    id,
    messages: initial,
    transport: new DefaultChatTransport({
      api: "/api/tutor",
      body: { threadId: id },
      prepareSendMessagesRequest: ({ messages, body, headers }) => ({
        headers: headers ?? {},
        body: { ...body, messages: messages.slice(-1) },
      }),
      headers: async () => {
        const { data } = await supabase.auth.getSession();
        return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
      },
    }),
    onFinish: () => {
      qc.invalidateQueries({ queryKey: ["tutor-threads"] });
      qc.invalidateQueries({ queryKey: ["tutor-messages", id] });
    },
  });
  const busy = status === "submitted" || status === "streaming";
  return (
    <div className="flex min-h-[500px] flex-col">
      <div className="flex-1 space-y-4">
        {messages.length === 0 && (
          <p className="text-muted-foreground">What would you like to understand better?</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-xl p-4 ${m.role === "user" ? "bg-electric-soft" : "bg-muted"}`}
          >
            <p className="mb-2 text-xs font-semibold">
              {m.role === "user" ? "You" : "ClassPilot AI"}
            </p>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap">
              {m.parts
                .filter((p) => p.type === "text")
                .map((p, i) => (
                  <ReactMarkdown key={i} skipHtml disallowedElements={["img"]}>
                    {p.text}
                  </ReactMarkdown>
                ))}
            </div>
          </div>
        ))}
        {busy && <p className="text-sm text-muted-foreground">Thinking…</p>}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            The tutor couldn't respond. Check your connection and try again.
          </p>
        )}
      </div>
      <form
        className="mt-5 space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          const text = input.trim();
          if (!text || busy) return;
          setInput("");
          void sendMessage({ text });
        }}
      >
        <Textarea
          maxLength={12000}
          aria-label="Message the tutor"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
        />
        <Button type="submit" disabled={busy || !input.trim()}>
          Send
        </Button>
        <p className="text-xs text-muted-foreground">
          AI can make mistakes. Check important answers against your class materials.
        </p>
      </form>
    </div>
  );
}
