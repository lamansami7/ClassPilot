import { expect, it } from "vitest";
import { matchesCampus } from "@/lib/catalog";
it("restricts immersion to Stilwell, not all students in the same grade", () => {
  const course = {
    school: "Junior High",
    course_name: "Estudios Sociales (8to Grado) — Stilwell Only",
  };
  expect(matchesCampus(course, "Indian Hills Junior High")).toBe(false);
  expect(matchesCampus(course, "Stilwell Junior High School")).toBe(true);
});
it("does not imply Valley courses are offered at Walnut Creek", () => {
  const course = { school: "High School", course_name: "Spanish I" };
  expect(matchesCampus(course, "Walnut Creek Campus")).toBe(false);
  expect(matchesCampus(course, "Valley High School")).toBe(true);
});

import { catalogSource } from "@/lib/catalog";
it("does not carry verification over to changed grade flags or a different level", () => {
  const row = { school: "High School", course_name: "Organic Chemistry", grades: [11, 12] };
  expect(catalogSource(row, 11)).toContain("/science");
  expect(catalogSource({ ...row, grades: [9, 11, 12] }, 9)).toBeNull();
  expect(catalogSource({ ...row, school: "Junior High" }, 7)).toBeNull();
});

import { reconcileListing } from "@/lib/catalog";
it("corrects TEC240 eligibility before filtering, without changing a personal course", () => {
  const raw = {
    course_name: "Carpentry II",
    school: "High School",
    subject: "Computer Science / Technology",
    grades: [10, 11, 12],
    is_custom: false,
    description: null,
  };
  const fixed = reconcileListing(raw);
  expect(fixed.grades).toContain(9);
  expect(fixed.subject).toBe("Engineering Technology");
  expect(catalogSource(fixed, 9)).toContain("/engineering-technology");
  expect(reconcileListing({ ...raw, is_custom: true }).grades).not.toContain(9);
});
it("permits the documented shared AFJROTC program at Walnut Creek", () =>
  expect(
    matchesCampus(
      { school: "High School", course_name: "AFJROTC Aviation History" },
      "Walnut Creek Campus",
    ),
  ).toBe(true));
