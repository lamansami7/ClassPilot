import { createOpenAI } from "@ai-sdk/openai";
import { APICallError, NoObjectGeneratedError, Output, jsonSchema, streamText, type ModelMessage } from "ai";
import { createLovableAiGatewayRunIdFetch } from "./run-id.server";

export const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
export const AI_MODEL = "openai/gpt-6-astra";
export const TRANSCRIBE_MODEL = "openai/gpt-transcribe";

export class AiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

export function requireLovableKey() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new AiError("AI is not configured on the server.", 500);
  return key;
}

/** Creates a request-scoped Responses provider for the Lovable AI Gateway. */
export function createAiProvider(initialRunId?: string) {
  const apiKey = requireLovableKey();
  const runIdFetch = createLovableAiGatewayRunIdFetch(initialRunId);
  const provider = createOpenAI({
    baseURL: AI_GATEWAY_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  return { provider, runIdFetch };
}

export function reasoningOptions(effort: "low" | "medium" = "low") {
  return {
    openai: {
      forceReasoning: true,
      reasoningEffort: effort,
      reasoningSummary: "auto",
      store: false,
      include: ["reasoning.encrypted_content"],
    },
  } as const;
}

/** Translate gateway/provider failures into a friendly, safe message + status. */
export function toAiError(error: unknown): AiError {
  if (error instanceof AiError) return error;
  const status =
    APICallError.isInstance(error) && typeof error.statusCode === "number"
      ? error.statusCode
      : typeof (error as { statusCode?: number })?.statusCode === "number"
        ? (error as { statusCode: number }).statusCode
        : 500;
  if (status === 402) return new AiError("ClassPilot AI is out of AI credits right now. Please tell your administrator.", 402);
  if (status === 429) return new AiError("ClassPilot AI is busy. Please wait a moment and try again.", 429);
  if (status === 403) return new AiError("This AI request was declined. Try rephrasing your notes or question.", 403);
  if (status === 400) return new AiError("The AI couldn't process that content. Try a shorter or simpler input.", 400);
  console.error("AI error", error);
  return new AiError("The AI request failed. Your work is safe — please try again.", status >= 400 ? status : 500);
}

type StructuredArgs = {
  instructions: string;
  messages: ModelMessage[];
  /** Strict JSON schema: object root, every property required, additionalProperties:false. */
  schema: Record<string, unknown>;
  effort?: "low" | "medium";
  signal?: AbortSignal;
};

/** Streams a structured-output call and returns the parsed object. */
export async function aiStructured<T>({ instructions, messages, schema, effort = "low", signal }: StructuredArgs): Promise<T> {
  const { provider } = createAiProvider();
  try {
    const result = streamText({
      model: provider.responses(AI_MODEL),
      instructions,
      messages,
      output: Output.object({ schema: jsonSchema<T>(schema as never) }),
      providerOptions: reasoningOptions(effort),
      ...(signal ? { abortSignal: signal } : {}),
    });
    return (await result.output) as T;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      try {
        if (error.text) return JSON.parse(error.text) as T;
      } catch {
        /* fall through */
      }
      throw new AiError("The AI returned an incomplete answer. Please try again.", 502);
    }
    throw toAiError(error);
  }
}

/** Streams a plain-text call and returns the final text. */
export async function aiText({
  instructions,
  messages,
  effort = "low",
}: {
  instructions: string;
  messages: ModelMessage[];
  effort?: "low" | "medium";
}): Promise<string> {
  const { provider } = createAiProvider();
  try {
    const result = streamText({
      model: provider.responses(AI_MODEL),
      instructions,
      messages,
      providerOptions: reasoningOptions(effort),
    });
    const text = await result.text;
    if (!text.trim()) throw new AiError("The AI returned an empty answer. Please try again.", 502);
    return text;
  } catch (error) {
    throw toAiError(error);
  }
}

export function gradeGuidance(grade: number | null | undefined) {
  if (!grade) return "Write for a high school student.";
  if (grade <= 8)
    return `The student is in ${grade}th grade (junior high). Use clear, friendly language, short sentences, concrete everyday examples, and define any technical term the first time it appears.`;
  if (grade <= 10)
    return `The student is in ${grade}th grade. Use clear high-school level language with precise vocabulary and worked examples.`;
  return `The student is in ${grade}th grade (upper high school). Use rigorous, college-prep explanations with precise terminology, deeper reasoning and challenging examples.`;
}

/** Strip HTML to plain text for prompts. */
export function htmlToText(html: string) {
  return html
    .replace(/<\/(p|h[1-6]|li|div|br|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
