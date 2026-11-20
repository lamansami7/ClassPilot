import {
  Atom,
  BookOpen,
  Calculator,
  Cpu,
  Dumbbell,
  Globe2,
  Landmark,
  Languages,
  Palette,
  Shapes,
  type LucideIcon,
} from "lucide-react";

export const SUBJECTS = [
  "Mathematics",
  "Science",
  "English / Language Arts",
  "Social Studies / History",
  "World Languages",
  "Computer Science / Technology",
  "Physical Education / Health",
  "Fine Arts",
  "Business Education",
  "Engineering Technology",
  "Family and Consumer Science",
  "Music",
  "Electives",
  "Other",
] as const;

export type Subject = (typeof SUBJECTS)[number];

export const SUBJECT_LABELS: Record<string, string> = {
  Other: "Other available courses",
};

const ICONS: Record<string, LucideIcon> = {
  Mathematics: Calculator,
  Science: Atom,
  "English / Language Arts": BookOpen,
  "Social Studies / History": Landmark,
  "World Languages": Languages,
  "Computer Science / Technology": Cpu,
  "Physical Education / Health": Dumbbell,
  "Fine Arts": Palette,
  Electives: Shapes,
  Other: Globe2,
};

export function subjectIcon(subject: string | null | undefined): LucideIcon {
  return ICONS[subject ?? "Other"] ?? Globe2;
}

export const GRADES = [7, 8, 9, 10, 11, 12] as const;

export function gradeLabel(grade: number | null | undefined) {
  if (!grade) return "—";
  return `${grade}th Grade`;
}
