import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aiStructured, gradeGuidance, AiError } from "@/lib/server/ai.server";
import { arr, obj, str } from "@/lib/server/schema.server";
import { prepareAiRequest, safeMessage } from "@/lib/server/student.server";

export type LearningResource = {
  title: string;
  url: string;
  description: string;
  source: string;
  kind: "video" | "article";
};

const REPUTABLE = [
  "khanacademy.org",
  "youtube.com",
  "britannica.com",
  "pbslearningmedia.org",
  "ck12.org",
  "mathsisfun.com",
  "nationalgeographic.org",
  "nasa.gov",
  "smithsonianmag.com",
  "openstax.org",
  "purplemath.com",
  "desmos.com",
  "phet.colorado.edu",
  "loc.gov",
  "history.com",
  "edu",
  "gov",
];

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function reputationScore(host: string) {
  const i = REPUTABLE.findIndex((d) => host === d || host.endsWith(`.${d}`));
  return i === -1 ? 0 : REPUTABLE.length - i;
}

async function firecrawlSearch(query: string, limit: number) {
  const lovable = process.env["LOVABLE_API_KEY"];
  const fc = process.env["FIRECRAWL_API_KEY"];
  if (!lovable || !fc) throw new AiError("Resource search isn't configured yet.", 500);
  const res = await fetch("https://connector-gateway.lovable.dev/firecrawl/v2/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovable}`,
      "X-Connection-Api-Key": fc,
    },
    body: JSON.stringify({ query, limit, country: "US", lang: "en" }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Firecrawl search failed [${res.status}]: ${body}`);
    if (res.status === 402 || res.status === 403) throw new AiError("Online resource search is unavailable right now.", res.status);
    throw new AiError("Couldn't search for resources right now. Please try again.", res.status);
  }
  const json = (await res.json()) as { data?: { web?: { url: string; title?: string; description?: string }[] } };
  return json.data?.web ?? [];
}

/** Searches the web for real, retrieved educational resources (never AI-invented). */
export const findResources = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { topic: string; courseName: string | null }) =>
    z.object({ topic: z.string().min(2).max(200), courseName: z.string().max(200).nullable() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    try {
      const { profile } = await prepareAiRequest(context.supabase, context.userId, "resources");
      const level = profile?.grade ? (profile.grade <= 8 ? "middle school" : "high school") : "high school";
      const subject = data.courseName ? ` ${data.courseName}` : "";
      const [videos, lessons, general] = await Promise.all([
        firecrawlSearch(`${data.topic}${subject} explained site:youtube.com`, 5),
        firecrawlSearch(`${data.topic} site:khanacademy.org`, 3),
        firecrawlSearch(`${data.topic}${subject} ${level} lesson tutorial examples`, 8),
      ]);
      const seen = new Set<string>();
      const all: LearningResource[] = [];
      for (const r of [...videos, ...lessons, ...general]) {
        if (!r.url || seen.has(r.url)) continue;
        seen.add(r.url);
        const host = hostOf(r.url);
        if (!host) continue;
        const isVideo = host.endsWith("youtube.com") || host === "youtu.be" || host.endsWith("vimeo.com");
        if (isVideo && !/watch|youtu\.be|vimeo\.com\/\d/.test(r.url)) continue;
        all.push({
          title: (r.title ?? host).slice(0, 200),
          url: r.url,
          description: (r.description ?? "").slice(0, 300),
          source: host,
          kind: isVideo ? "video" : "article",
        });
      }
      all.sort((a, b) => reputationScore(b.source) - reputationScore(a.source));
      return { ok: true as const, data: { resources: all.slice(0, 12) } };
    } catch (error) {
      return { ok: false as const, error: safeMessage(error) };
    }
  });

export type TopicExplanation = {
  short_explanation: string;
  steps: { title: string; detail: string }[];
  practice_questions: { question: string; answer: string }[];
  from_notes: string;
};

/** AI explanation for a topic, clearly separating what came from the student's notes. */
export const explainTopic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { topic: string; courseId: string | null }) =>
    z.object({ topic: z.string().min(2).max(200), courseId: z.string().uuid().nullable() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    try {
      const { profile } = await prepareAiRequest(context.supabase, context.userId, "explain_topic");
      let notes = "";
      if (data.courseId) {
        const { data: rows } = await context.supabase
          .from("notes")
          .select("title, content_text")
          .eq("course_id", data.courseId)
          .order("updated_at", { ascending: false })
          .limit(5);
        notes = (rows ?? []).map((n) => `${n.title}: ${n.content_text.slice(0, 3000)}`).join("\n\n");
      }
      const out = await aiStructured<TopicExplanation>({
        instructions: `You are ClassPilot AI. ${gradeGuidance(profile?.grade)} Explain the topic briefly, give 3-5 step-by-step example steps, and 3 practice questions with answers. In "from_notes", summarize in 1-3 sentences what the student's own notes say about this topic, or write exactly "Your notes don't cover this topic yet." if they don't. Never invent sources.`,
        messages: [{ role: "user", content: `Topic: ${data.topic}\n\nStudent notes:\n${notes || "(none)"}` }],
        schema: obj({
          short_explanation: str(),
          steps: arr(obj({ title: str(), detail: str() })),
          practice_questions: arr(obj({ question: str(), answer: str() })),
          from_notes: str(),
        }),
      });
      return { ok: true as const, data: out };
    } catch (error) {
      return { ok: false as const, error: safeMessage(error) };
    }
  });
