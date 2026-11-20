import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { authenticateRequest, jsonError } from "@/lib/server/auth.server";
import { AI_MODEL, createAiProvider, gradeGuidance, reasoningOptions } from "@/lib/server/ai.server";
import { courseName, prepareAiRequest, safeMessage } from "@/lib/server/student.server";
import { getLovableAiGatewayRunId, withLovableAiGatewayRunIdHeader } from "@/lib/server/run-id.server";
import type { Json } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/tutor")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authenticateRequest(request);
        if (!auth) return jsonError("Please sign in again.", 401);
        const body = (await request.json().catch(() => null)) as { messages?: UIMessage[]; threadId?: string } | null;
        const messages = body?.messages;
        const threadId = body?.threadId;
        if (!Array.isArray(messages) || !messages.length || typeof threadId !== "string") return jsonError("Invalid request.", 400);
        if (JSON.stringify(messages).length > 8_000_000) return jsonError("This conversation is too long. Start a new one.", 413);

        const { data: thread } = await auth.supabase.from("tutor_threads").select("*").eq("id", threadId).maybeSingle();
        if (!thread) return jsonError("Conversation not found.", 404);

        let profile: Awaited<ReturnType<typeof prepareAiRequest>>["profile"];
        try {
          ({ profile } = await prepareAiRequest(auth.supabase, auth.userId, "tutor"));
        } catch (e) {
          return jsonError(safeMessage(e), 429);
        }

        const course = await courseName(auth.supabase, thread.course_id);
        let notesContext = "";
        if (thread.course_id) {
          const { data: notes } = await auth.supabase
            .from("notes")
            .select("title, content_text")
            .eq("course_id", thread.course_id)
            .order("updated_at", { ascending: false })
            .limit(4);
          notesContext = (notes ?? []).map((n) => `### ${n.title}\n${n.content_text.slice(0, 2500)}`).join("\n\n");
        }

        const instructions = `You are ClassPilot AI Tutor, a patient, encouraging tutor for ${profile?.first_name || "a student"} at West Des Moines Community Schools.
${gradeGuidance(profile?.grade)}
${course ? `Current class: ${course}.` : "The student may ask about any class."}
How to tutor:
- Explain concepts step by step and give concrete examples.
- Encourage learning: for homework-style problems, guide the student through the method and check their thinking instead of only handing over the final answer.
- End most replies with one short follow-up practice question.
- Adjust difficulty to the student's grade; if asked to "explain more simply", use simpler words and an analogy; if asked for "another example", give a new, different example.
- When you use the student's notes, say "From your notes:"; when using general knowledge, don't pretend it came from their notes.
- Never invent facts, sources, quotes or links. If you're unsure or can't verify something (including details of an image), say so.
- Keep content school-appropriate. Use Markdown with short paragraphs; write math clearly (e.g. y = mx + b).
${notesContext ? `\nThe student's recent notes for this class:\n${notesContext}` : ""}`;

        const { provider, runIdFetch } = createAiProvider(getLovableAiGatewayRunId(request));
        const result = streamText({
          model: provider.responses(AI_MODEL),
          instructions,
          messages: await convertToModelMessages(messages),
          abortSignal: request.signal,
          providerOptions: reasoningOptions("low"),
        });

        const response = result.toUIMessageStreamResponse({
          originalMessages: messages,
          sendReasoning: false,
          onError: (error) => {
            console.error("Tutor error", error);
            const status = (error as { statusCode?: number })?.statusCode;
            if (status === 402) return "ClassPilot AI is out of AI credits right now.";
            if (status === 429) return "ClassPilot AI is busy. Please try again in a moment.";
            return "The tutor couldn't answer right now. Please try again.";
          },
          onFinish: async ({ messages: finalMessages }) => {
            const rows = finalMessages.slice(-2).map((m) => ({
              thread_id: threadId,
              student_id: auth.userId,
              message_id: m.id,
              role: m.role,
              parts: m.parts as unknown as Json,
            }));
            const { error } = await auth.supabase.from("tutor_messages").upsert(rows, { onConflict: "thread_id,message_id" });
            if (error) console.error("Failed to save tutor messages", error);
            const firstUser = finalMessages.find((m) => m.role === "user");
            const firstText = firstUser?.parts.find((p) => p.type === "text") as { text?: string } | undefined;
            const update: { updated_at: string; title?: string } = { updated_at: new Date().toISOString() };
            if (thread.title === "New conversation" && firstText?.text) update.title = firstText.text.slice(0, 60);
            await auth.supabase.from("tutor_threads").update(update).eq("id", threadId);
          },
        });
        return withLovableAiGatewayRunIdHeader(response, runIdFetch);
      },
    },
  },
});
