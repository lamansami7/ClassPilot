import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { AiError } from "./ai.server";

export type Db = SupabaseClient<Database>;

/** Consumes one AI request from the student's hourly quota and returns their profile. */
export async function prepareAiRequest(supabase: Db, userId: string, feature: string) {
  const { data: quota, error } = await supabase.rpc("consume_ai_quota", { _feature: feature });
  if (error) throw new AiError("Couldn't verify your AI access. Please try again.", 500);
  if (quota !== "ok") throw new AiError(String(quota), 429);
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, grade, school_id")
    .eq("id", userId)
    .maybeSingle();
  return { profile };
}

export async function courseName(supabase: Db, courseId: string | null | undefined) {
  if (!courseId) return null;
  const { data } = await supabase.from("courses").select("course_name, subject").eq("id", courseId).maybeSingle();
  return data ? `${data.course_name} (${data.subject})` : null;
}

/** Converts any thrown error into a message safe to show students. */
export function safeMessage(error: unknown) {
  if (error instanceof AiError) return error.message;
  if (error instanceof Error && error.message.startsWith("Unauthorized")) return "Please sign in again.";
  return "Something went wrong. Your work is safe — please try again.";
}
