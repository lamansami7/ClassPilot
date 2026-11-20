import evidence from "./catalog-evidence.json";
/** Campus scope is distinct from grade eligibility: Walnut Creek registers separately. */
export function matchesCampus(
  course: { school: string | null; course_name: string },
  campus?: string,
) {
  if (!campus) return true;
  if (course.school === campus) return true;
  if (campus === "Walnut Creek Campus" && course.school === "High School")
    return [
      "AFJROTC Aviation History",
      "AFJROTC Cultural Studies",
      "AFJROTC Exploring Space",
      "AFJROTC Science of Flight",
    ].includes(course.course_name);
  if (campus === "Indian Hills Junior High" || campus === "Stilwell Junior High School") {
    return (
      course.school === "Junior High" &&
      (!course.course_name.includes("Stilwell Only") || campus.startsWith("Stilwell"))
    );
  }
  return (
    course.school === "High School" &&
    ["Valley High School", "Valley Southwoods Freshman High School"].includes(campus)
  );
}

/** Evidence is for the title and grade flags, not a guarantee of a seat or eligibility. */
export function catalogSource(
  c: { school: string | null; course_name: string; grades: number[] },
  grade: number,
) {
  const flags = [...c.grades].sort((a, b) => a - b).join(",");
  for (const [department, rows] of Object.entries(evidence)) {
    const junior = department === "junior-high";
    if (
      c.school !== (junior ? "Junior High" : "High School") ||
      (rows as Record<string, string>)[c.course_name] !== flags
    )
      continue;
    return junior
      ? `https://courses.wdmcs.org/junior-high-courses/${grade === 7 ? "seventh" : "eighth"}-grade`
      : `https://courses.wdmcs.org/courses-listed-by-department/${department}`;
  }
  return null;
}

/** Preserve stable DB IDs for existing enrollments while the managed seed is reconciled. */
export function reconcileListing<
  T extends {
    school: string | null;
    course_name: string;
    grades: number[];
    is_custom: boolean;
    subject: string;
    description: string | null;
  },
>(row: T): T {
  if (row.is_custom || row.school !== "High School") return row;
  const name = row.course_name === "Café V" ? "Cafè V" : row.course_name;
  const grades = name === "Carpentry II" ? [9, 10, 11, 12] : row.grades;
  const prerequisite: Record<string, string> = {
    "Initial Field Experience":
      "Prerequisite: Foundations of Education with a final grade of C− or better.",
    "Fundamentals of Writing": "Prerequisite: both semesters of Language and Literature.",
  };
  const extra =
    prerequisite[name] ??
    (name.startsWith("AFJROTC ")
      ? "Hosted at Valley. Eligible campuses: Valley Southwoods, Valley and Walnut Creek. Aviation History plus one rotating course are offered each year; confirm this year’s rotation."
      : null);
  const labels: Record<string, string> = {
    "business-education": "Business Education",
    "engineering-technology": "Engineering Technology",
    "family-and-consumer-science": "Family and Consumer Science",
    music: "Music",
  };
  const dept = Object.entries(evidence).find(
    ([k, rows]) => k !== "junior-high" && Object.hasOwn(rows, name),
  )?.[0];
  return {
    ...row,
    course_name: name,
    grades,
    subject: (dept && labels[dept]) || row.subject,
    description: [row.description, extra].filter(Boolean).join(" ") || null,
  };
}
