import { boundedBody } from "@/lib/server/body.server";
import { createFileRoute } from "@tanstack/react-router";
import { authenticateRequest, jsonError } from "@/lib/server/auth.server";
import { AI_GATEWAY_URL, TRANSCRIBE_MODEL } from "@/lib/server/ai.server";
import { prepareAiRequest, safeMessage } from "@/lib/server/student.server";

const MAX_BYTES = 24 * 1024 * 1024;

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authenticateRequest(request);
        if (!auth) return jsonError("Please sign in again.", 401);
        const declared = Number(request.headers.get("content-length") ?? "0");
        if (declared > MAX_BYTES + 65536) return jsonError("That audio segment is too large.", 413);
        const body = await boundedBody(request, MAX_BYTES + 65536);
        if (!body) return jsonError("Recording too large.", 413);
        const form = await new Response(body, {
          headers: { "content-type": request.headers.get("content-type") ?? "" },
        })
          .formData()
          .catch(() => null);
        if (!form) return jsonError("Invalid audio upload.", 400);
        const file = form.get("file");
        if (!(file instanceof File) || file.size < 2048)
          return jsonError("The recording was empty. Please record again.", 400);
        if (file.size > MAX_BYTES) return jsonError("That audio segment is too large.", 413);
        if (!file.type.startsWith("audio/")) return jsonError("Unsupported audio format.", 400);
        try {
          await prepareAiRequest(auth.supabase, auth.userId, "transcribe");
        } catch (e) {
          return jsonError(safeMessage(e), 429);
        }
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return jsonError("AI is not configured on the server.", 500);
        const upstream = new FormData();
        upstream.append("model", TRANSCRIBE_MODEL);
        upstream.append("file", file, file.name || "segment.wav");
        upstream.append("response_format", "json");

        const res = await fetch(`${AI_GATEWAY_URL}/audio/transcriptions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${key}` },
          body: upstream,
          signal: request.signal,
        });
        if (!res.ok) {
          console.error(`Transcription failed [${res.status}]`);
          const msg =
            res.status === 402
              ? "ClassPilot AI is out of AI credits right now."
              : res.status === 429
                ? "Transcription is busy. Please try again in a moment."
                : "Couldn't transcribe this audio. Try recording again.";
          return jsonError(msg, res.status);
        }
        return new Response(res.body, {
          status: res.status,
          headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
        });
      },
    },
  },
});
