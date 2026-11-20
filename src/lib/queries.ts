import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;
export type Course = Tables<"courses">;
export type School = Tables<"schools">;
export type Note = Tables<"notes">;

export type Me = {
  userId: string;
  email: string;
  profile: Profile | null;
  school: School | null;
  isAdmin: boolean;
};

/** Signed-in student's profile, school and admin flag. */
export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async (): Promise<Me> => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error("Not signed in");
    const user = userData.user;
    const [{ data: profile, error: profileError }, { data: roles, error: rolesError }] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
    if (profileError) throw profileError;
    if (rolesError) throw rolesError;
    let school: School | null = null;
    if (profile?.school_id) {
      const { data } = await supabase
        .from("schools")
        .select("*")
        .eq("id", profile.school_id)
        .maybeSingle();
      school = data ?? null;
    }
    return {
      userId: user.id,
      email: user.email ?? "",
      profile: profile ?? null,
      school,
      isAdmin: (roles ?? []).some((r) => r.role === "admin"),
    };
  },
  staleTime: 60_000,
});

export type MyCourse = Course & { noteCount: number; lastActivity: string | null };

/** The student's selected classes with note counts and last activity. */
export const myCoursesQuery = queryOptions({
  queryKey: ["my-courses"],
  queryFn: async (): Promise<MyCourse[]> => {
    const { data, error } = await supabase
      .from("student_courses")
      .select("course_id, created_at, courses(*)")
      .order("created_at", { ascending: true });
    if (error) throw error;
    const courses = (data ?? []).map((r) => r.courses).filter(Boolean) as Course[];
    if (!courses.length) return [];
    const { data: notes, error: notesError } = await supabase
      .from("notes")
      .select("course_id, updated_at")
      .in(
        "course_id",
        courses.map((c) => c.id),
      );
    if (notesError) throw notesError;
    return courses.map((c) => {
      const mine = (notes ?? []).filter((n) => n.course_id === c.id);
      const last =
        mine
          .map((n) => n.updated_at)
          .sort()
          .at(-1) ?? null;
      return { ...c, noteCount: mine.length, lastActivity: last };
    });
  },
});

/** Active catalog courses for a grade (public read). */
export const catalogQuery = (grade: number | null) =>
  queryOptions({
    queryKey: ["catalog", grade],
    enabled: !!grade,
    queryFn: async (): Promise<Course[]> => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("active", true)
        .eq("is_custom", false)
        .contains("grades", [grade!])
        .order("course_name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

export const schoolsQuery = queryOptions({
  queryKey: ["schools"],
  queryFn: async (): Promise<School[]> => {
    const { data, error } = await supabase
      .from("schools")
      .select("*")
      .eq("active", true)
      .order("name");
    if (error) throw error;
    return data ?? [];
  },
  staleTime: 5 * 60_000,
});

export function fullName(p: Pick<Profile, "first_name" | "last_name"> | null | undefined) {
  if (!p) return "";
  return `${p.first_name} ${p.last_name}`.trim();
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
