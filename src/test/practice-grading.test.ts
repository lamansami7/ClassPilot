import { describe, expect, it } from "vitest";
import { gradeObjective, summarizeResults, type Question } from "@/lib/practice";

const base = {
  explanation: "Because.",
  topic: "Slope",
  difficulty: "easy" as const,
  matching_pairs: null,
};

describe("objective grading", () => {
  it("auto-grades multiple choice", () => {
    const q: Question = {
      ...base,
      id: "1",
      type: "multiple_choice",
      prompt: "?",
      options: ["2", "3"],
      correct_answer: "3",
    };
    expect(gradeObjective(q, "3")?.correct).toBe(true);
    expect(gradeObjective(q, "2")?.correct).toBe(false);
  });

  it("accepts fill-in-the-blank alternatives and ignores case", () => {
    const q: Question = {
      ...base,
      id: "2",
      type: "fill_blank",
      prompt: "?",
      options: null,
      correct_answer: "y-intercept|intercept",
    };
    expect(gradeObjective(q, "Y-Intercept")?.correct).toBe(true);
    expect(gradeObjective(q, "intercept")?.correct).toBe(true);
  });

  it("gives partial credit on matching", () => {
    const q: Question = {
      ...base,
      id: "3",
      type: "matching",
      prompt: "Match",
      options: null,
      correct_answer: null,
      matching_pairs: [
        { left: "m", right: "slope" },
        { left: "b", right: "y-intercept" },
      ],
    };
    expect(gradeObjective(q, { m: "slope", b: "slope" })?.score).toBe(0.5);
  });

  it("leaves written answers for AI grading", () => {
    const q: Question = {
      ...base,
      id: "4",
      type: "written",
      prompt: "Explain",
      options: null,
      correct_answer: null,
    };
    expect(gradeObjective(q, "anything")).toBeNull();
  });

  it("flags topics under 70% as needing practice", () => {
    const qs: Question[] = [
      {
        ...base,
        id: "a",
        type: "true_false",
        prompt: "",
        options: ["True", "False"],
        correct_answer: "True",
        topic: "Graphing",
      },
      {
        ...base,
        id: "b",
        type: "true_false",
        prompt: "",
        options: ["True", "False"],
        correct_answer: "True",
        topic: "Slope",
      },
    ];
    const res = summarizeResults(qs, [
      gradeObjective(qs[0]!, "False")!,
      gradeObjective(qs[1]!, "True")!,
    ]);
    expect(res.percent).toBe(50);
    expect(res.weak_topics).toEqual(["Graphing"]);
  });
});
