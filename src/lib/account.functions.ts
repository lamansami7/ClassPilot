import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function removeUserData(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  for (const bucket of ["recordings", "uploads"]) {
    const { data: files } = await supabaseAdmin.storage.from(bucket).list(userId, { limit: 1000 });
    if (files?.length) await supabaseAdmin.storage.from(bucket).remove(files.map((f) => `${userId}/${f.name}`));
  }
  await supabaseAdmin.from("courses").delete().eq("created_by", userId).eq("is_custom", true);
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) throw new Error("Couldn't delete the account.");
}

/** Permanently deletes the signed-in student's account, files and data. */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      await removeUserData(context.userId);
      return { ok: true as const };
    } catch (e) {
      console.error(e);
      return { ok: false as const, error: "Couldn't delete your account. Please try again." };
    }
  });

/** Admin-only: delete a student account. */
export const adminDeleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) return { ok: false as const, error: "Forbidden" };
    if (data.userId === context.userId) return { ok: false as const, error: "You can't delete your own admin account here." };
    try {
      await removeUserData(data.userId);
      return { ok: true as const };
    } catch (e) {
      console.error(e);
      return { ok: false as const, error: "Couldn't delete that account." };
    }
  });
