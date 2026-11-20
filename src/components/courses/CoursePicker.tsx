import { catalogSource } from "@/lib/catalog";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Plus, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { catalogQuery, type Course } from "@/lib/queries";
import { SUBJECTS, SUBJECT_LABELS, subjectIcon } from "@/lib/subjects";
import { cn } from "@/lib/utils";

export type CoursePickerValue = { courseIds: string[]; customCourses: string[] };

/** Searchable, category-grouped multi-select over the WDMCS catalog for one grade, plus manual courses. */
export function CoursePicker({
  grade,
  value,
  onChange,
  campus,
  allowCustom = true,
}: {
  grade: number;
  campus?: string | undefined;
  value: CoursePickerValue;
  onChange: (v: CoursePickerValue) => void;
  allowCustom?: boolean;
}) {
  const { data: courses = [], isLoading, error, refetch } = useQuery(catalogQuery(grade, campus));
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState<string>("All");
  const [custom, setCustom] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter(
      (c) =>
        (subject === "All" || c.subject === subject) &&
        (!q ||
          c.course_name.toLowerCase().includes(q) ||
          (c.description ?? "").toLowerCase().includes(q)),
    );
  }, [courses, search, subject]);

  const grouped = useMemo(() => {
    const m = new Map<string, Course[]>();
    for (const s of SUBJECTS) m.set(s, []);
    for (const c of filtered) (m.get(c.subject) ?? m.get("Other")!).push(c);
    return [...m.entries()].filter(([, list]) => list.length);
  }, [filtered]);

  const subjectsPresent = useMemo(
    () => SUBJECTS.filter((s) => courses.some((c) => c.subject === s)),
    [courses],
  );
  const selected = new Set(value.courseIds);
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ ...value, courseIds: [...next] });
  };
  const addCustom = () => {
    const name = custom.trim();
    if (
      name.length < 2 ||
      value.customCourses.length >= 10 ||
      value.customCourses.some((c) => c.toLowerCase() === name.toLowerCase())
    )
      return;
    onChange({ ...value, customCourses: [...value.customCourses, name] });
    setCustom("");
  };

  const selectedCourses = courses.filter((c) => selected.has(c.id));

  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-muted p-3 text-sm">
        {campus} · Grade {grade}.{" "}
        {campus === "Walnut Creek Campus"
          ? "Walnut Creek registers with a counselor. Shared AFJROTC courses rotate; enter other classes from your confirmed schedule."
          : "Campus availability and prerequisites are not independently verified for each listing."}{" "}
        <a
          href="https://courses.wdmcs.org/"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-electric underline"
        >
          Check district catalog ↗
        </a>
      </p>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search courses"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search classes, e.g. Biology or Algebra"
          className="h-11 pl-9"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {["All", ...subjectsPresent].map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={subject === s}
            onClick={() => setSubject(s)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              subject === s
                ? "border-electric bg-electric text-electric-foreground"
                : "bg-card hover:border-electric/50",
            )}
          >
            {SUBJECT_LABELS[s] ?? s}
          </button>
        ))}
      </div>

      {(selectedCourses.length > 0 || value.customCourses.length > 0) && (
        <div className="flex flex-wrap gap-2 rounded-xl bg-electric-soft p-3">
          {selectedCourses.map((c) => (
            <Badge
              key={c.id}
              className="gap-1 bg-electric text-electric-foreground hover:bg-electric"
            >
              {c.course_name}
              <button
                type="button"
                onClick={() => toggle(c.id)}
                aria-label={`Remove ${c.course_name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {value.customCourses.map((c) => (
            <Badge key={c} variant="outline" className="gap-1 bg-card">
              {c} (added)
              <button
                type="button"
                onClick={() =>
                  onChange({ ...value, customCourses: value.customCourses.filter((x) => x !== c) })
                }
                aria-label={`Remove ${c}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="max-h-[420px] space-y-5 overflow-y-auto rounded-xl border bg-card p-3">
        {isLoading && (
          <p className="p-4 text-sm text-muted-foreground">Loading the WDMCS course catalog…</p>
        )}
        {error && (
          <p className="p-4 text-sm text-destructive">
            Couldn't load courses.{" "}
            <button type="button" className="underline" onClick={() => refetch()}>
              Retry
            </button>
          </p>
        )}
        {!error && !isLoading && !grouped.length && (
          <p className="p-4 text-sm text-muted-foreground">
            No matching catalog classes.{" "}
            {allowCustom
              ? "Add a class from your schedule below."
              : "Try a different search or subject."}
          </p>
        )}
        {grouped.map(([subj, list]) => {
          const Icon = subjectIcon(subj);
          return (
            <div key={subj}>
              <div className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Icon className="h-3.5 w-3.5" /> {SUBJECT_LABELS[subj] ?? subj}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {list.map((c) => {
                  const on = selected.has(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(c.id)}
                      className={cn(
                        "flex items-start gap-3 rounded-lg border p-3 text-left transition-all",
                        on
                          ? "border-electric bg-electric-soft shadow-soft"
                          : "hover:border-electric/40 hover:bg-muted/50",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                          on
                            ? "border-electric bg-electric text-electric-foreground"
                            : "bg-background",
                        )}
                      >
                        {on && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{c.course_name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {catalogSource(c, grade)
                            ? "Title & grade checked · 2026–27"
                            : "Unverified catalog listing"}
                        </span>
                        {c.description && (
                          <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                            {c.description}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {allowCustom && (
        <div>
          <p className="mb-2 text-sm font-medium">Missing a class? Add it manually</p>
          <div className="flex gap-2">
            <Input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
              placeholder="e.g. Honors Chemistry"
              maxLength={120}
            />
            <Button
              type="button"
              variant="outline"
              disabled={
                custom.trim().length < 2 ||
                value.customCourses.length >= 10 ||
                value.customCourses.some((c) => c.toLowerCase() === custom.trim().toLowerCase())
              }
              onClick={addCustom}
            >
              <Plus /> Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
