import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap } from "lucide-react";
import { CoursePicker, type CoursePickerValue } from "@/components/courses/CoursePicker";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { meQuery, myCoursesQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/classes/")({ component: Classes });
function Classes() {
  const { data, isLoading, isError } = useQuery(myCoursesQuery);
  const me = useQuery(meQuery).data;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<CoursePickerValue>({ courseIds: [], customCourses: [] });
  const [saving, setSaving] = useState(false);
  const ids = value.courseIds.filter((id) => !data?.some((c) => c.id === id));
  const custom = value.customCourses.filter(
    (n) => !data?.some((c) => c.course_name.toLowerCase() === n.toLowerCase()),
  );
  const count = ids.length + custom.length;
  async function add() {
    if (!me || !count) return;
    setSaving(true);
    try {
      const picked = [...ids];
      for (const name of custom) {
        // Reuse a private class if the previous enrollment write failed.
        const prior = await supabase
          .from("courses")
          .select("id")
          .eq("created_by", me.userId)
          .eq("is_custom", true)
          .eq("course_name", name)
          .limit(1)
          .maybeSingle();
        if (prior.error) throw prior.error;
        if (prior.data) {
          picked.push(prior.data.id);
          continue;
        }
        const result = await supabase
          .from("courses")
          .insert({
            course_name: name,
            subject: "Other",
            is_custom: true,
            created_by: me.userId,
            grades: me.profile?.grade ? [me.profile.grade] : [],
          })
          .select("id")
          .single();
        if (result.error) throw result.error;
        picked.push(result.data.id);
      }
      const { error } = await supabase.from("student_courses").upsert(
        picked.map((course_id) => ({ course_id, student_id: me.userId })),
        { onConflict: "student_id,course_id", ignoreDuplicates: true },
      );
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["my-courses"] });
      setOpen(false);
      setValue({ courseIds: [], customCourses: [] });
      toast.success("Classes added");
    } catch {
      toast.error("Could not add classes. Your selection is still here.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div>
      <h1 className="font-display text-3xl font-bold">My Classes</h1>
      <p className="mt-2 text-muted-foreground">
        Your selected courses and the notes you've created for them.
      </p>
      {me?.profile?.grade && (
        <div className="mt-4">
          <Button variant="outline" aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? "Close course picker" : "Add classes"}
          </Button>
          {open && (
            <section className="mt-3 space-y-4 rounded-xl border bg-card p-4">
              <CoursePicker
                grade={me.profile.grade}
                campus={me.school?.name}
                value={value}
                onChange={setValue}
                allowCustom
              />
              <Button disabled={saving || !count} onClick={add}>
                {saving ? "Adding…" : `Add ${count} ${count === 1 ? "class" : "classes"}`}
              </Button>
            </section>
          )}
        </div>
      )}
      {isLoading ? (
        <p className="mt-8">Loading classes…</p>
      ) : isError ? (
        <p className="mt-8 text-destructive">Couldn't load classes. Please try again.</p>
      ) : !data?.length ? (
        <div className="mt-8 rounded-2xl border p-8 text-muted-foreground">
          No classes selected yet.
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
            <div key={c.id} className="rounded-2xl border bg-card p-6">
              <GraduationCap className="text-electric" />
              <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {c.subject}
              </p>
              <h2 className="mt-1 font-display text-lg font-bold">{c.course_name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {c.noteCount} {c.noteCount === 1 ? "note" : "notes"}
              </p>
              <Link
                to="/classes/$id"
                params={{ id: c.id }}
                className="mt-5 inline-block text-sm font-semibold text-electric"
              >
                Open class →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
