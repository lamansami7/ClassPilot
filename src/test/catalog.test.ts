import { expect, it } from 'vitest';
import { matchesCampus } from '@/lib/catalog';
it('restricts immersion to Stilwell, not all students in the same grade', () => {
 const course = {school:'Junior High', course_name:'Estudios Sociales (8to Grado) — Stilwell Only'};
 expect(matchesCampus(course,'Indian Hills Junior High')).toBe(false);
 expect(matchesCampus(course,'Stilwell Junior High School')).toBe(true);
});
it('does not imply Valley courses are offered at Walnut Creek', () => {
 const course = {school:'High School', course_name:'Spanish I'};
 expect(matchesCampus(course,'Walnut Creek Campus')).toBe(false);
 expect(matchesCampus(course,'Valley High School')).toBe(true);
});
