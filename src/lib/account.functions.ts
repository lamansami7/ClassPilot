import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function removeUserData(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // List every page and recursively traverse folders before deleting the account.
  // Refuse to delete the auth user if storage cleanup fails.
  for (const bucket of ["recordings", "uploads"]) {
    const paths: string[] = [];
    const pending = [userId];
    while (pending.length) {
      const prefix = pending.pop()!;
      let offset = 0;
      while (true) {
        const { data, error } = await supabaseAdmin.storage.from(bucket).list(prefix, {
          limit: 1000,
          offset,
          sortBy: { column: "name", order: "asc" },
        });
        if (error) throw new Error("Couldn't list account files.");
        for (const entry of data) {
          const path = `${prefix}/${entry.name}`;
          if (entry.id) paths.push(path);
          else pending.push(path);
        }
        if (data.length < 1000) break;
        offset += data.length;
      }
    }
    for (let i = 0; i < paths.length; i += 1000) {
      const { error } = await supabaseAdmin.storage.from(bucket).remove(paths.slice(i, i + 1000));
      if (error) throw new Error("Couldn't delete account files.");
    }
  }
  const { error: courseError } = await supabaseAdmin
    .from("courses")
    .delete()
    .eq("created_by", userId)
    .eq("is_custom", true);
  if (courseError) throw new Error("Couldn't delete account courses.");
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
  .inputValidator((input: { userId: string }) =>
    z.object({ userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) return { ok: false as const, error: "Forbidden" };
    if (data.userId === context.userId)
      return { ok: false as const, error: "You can't delete your own admin account here." };
    try {
      await removeUserData(data.userId);
      return { ok: true as const };
    } catch (e) {
      console.error(e);
      return { ok: false as const, error: "Couldn't delete that account." };
    }
  });
