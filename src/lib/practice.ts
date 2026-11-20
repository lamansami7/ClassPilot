/** Shared question/answer types and objective grading for worksheets and practice tests. */

export const QUESTION_TYPES = [
  "multiple_choice",
  "true_false",
  "fill_blank",
  "short_answer",
  "matching",
  "problem",
  "written",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "Multiple choice",
  true_false: "True or false",
  fill_blank: "Fill in the blank",
  short_answer: "Short answer",
  matching: "Matching",
  problem: "Problem solving",
  written: "Written explanation",
};

export type Difficulty = "easy" | "medium" | "hard" | "mixed";

export type MatchingPair = { left: string; right: string };

export type Question = {
  id: string;
  type: QuestionType;
  prompt: string;
  /** Choices for multiple choice (and ["True","False"] for true/false). */
  options: string[] | null;
  /** Canonical answer. Fill-in-the-blank may list alternatives separated by "|". */
  correct_answer: string | null;
  matching_pairs: MatchingPair[] | null;
  explanation: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
};

/** Student answers keyed by question id. Matching answers map left -> chosen right. */
export type Answers = Record<string, string | Record<string, string>>;

export type QuestionResult = {
  id: string;
  correct: boolean;
  /** 0..1 partial credit. */
  score: number;
  feedback: string;
  correct_answer_display: string;
  ai_graded: boolean;
};

export type PracticeResults = {
  total: number;
  earned: number;
  percent: number;
  by_topic: { topic: string; earned: number; total: number }[];
  weak_topics: string[];
  results: QuestionResult[];
};

export const OBJECTIVE_TYPES: QuestionType[] = [
  "multiple_choice",
  "true_false",
  "fill_blank",
  "matching",
];

export function isObjective(type: QuestionType) {
  return OBJECTIVE_TYPES.includes(type);
}

export function normalizeAnswer(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.\-/ ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sameAnswer(given: string, expected: string) {
  const a = normalizeAnswer(given);
  const b = normalizeAnswer(expected);
  if (!a) return false;
  if (a === b) return true;
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && a !== "" && b !== "")
    return Math.abs(na - nb) < 1e-9;
  return false;
}

/** Grades objective questions deterministically. Returns null for questions that need AI grading. */
export function gradeObjective(
  q: Question,
  answer: Answers[string] | undefined,
): QuestionResult | null {
  if (!isObjective(q.type)) return null;

  if (q.type === "matching") {
    const pairs = q.matching_pairs ?? [];
    const given = (answer && typeof answer === "object" ? answer : {}) as Record<string, string>;
    const right = pairs.filter(
      (p) => given[p.left] !== undefined && sameAnswer(given[p.left]!, p.right),
    ).length;
    const score = pairs.length ? right / pairs.length : 0;
    return {
      id: q.id,
      correct: pairs.length > 0 && right === pairs.length,
      score,
      feedback:
        right === pairs.length
          ? "All matches correct."
          : `${right} of ${pairs.length} matches correct. ${q.explanation}`,
      correct_answer_display: pairs.map((p) => `${p.left} → ${p.right}`).join("; "),
      ai_graded: false,
    };
  }

  const given = typeof answer === "string" ? answer : "";
  const expected = q.correct_answer ?? "";
  const alternatives = q.type === "fill_blank" ? expected.split("|") : [expected];
  const correct = alternatives.some((alt) => sameAnswer(given, alt));
  return {
    id: q.id,
    correct,
    score: correct ? 1 : 0,
    feedback: correct ? "Correct!" : given ? q.explanation : `No answer given. ${q.explanation}`,
    correct_answer_display: alternatives[0] ?? "",
    ai_graded: false,
  };
}

/** Combines per-question results into a score and topic breakdown. */
export function summarizeResults(
  questions: Question[],
  results: QuestionResult[],
): PracticeResults {
  const byId = new Map(results.map((r) => [r.id, r]));
  const topics = new Map<string, { earned: number; total: number }>();
  let earned = 0;
  for (const q of questions) {
    const r = byId.get(q.id);
    const s = r?.score ?? 0;
    earned += s;
    const t = topics.get(q.topic) ?? { earned: 0, total: 0 };
    t.earned += s;
    t.total += 1;
    topics.set(q.topic, t);
  }
  const by_topic = [...topics.entries()].map(([topic, v]) => ({ topic, ...v }));
  const total = questions.length;
  return {
    total,
    earned: Math.round(earned * 100) / 100,
    percent: total ? Math.round((earned / total) * 100) : 0,
    by_topic,
    weak_topics: by_topic
      .filter((t) => t.total > 0 && t.earned / t.total < 0.7)
      .map((t) => t.topic),
    results: questions.map((q) => byId.get(q.id)).filter(Boolean) as QuestionResult[],
  };
}
