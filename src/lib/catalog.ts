/** Campus scope is distinct from grade eligibility: Walnut Creek registers separately. */
export function matchesCampus(course: {school: string | null; course_name: string}, campus?: string) {
  if (!campus) return true;
  if (course.school === campus) return true;
  if (campus === 'Indian Hills Junior High' || campus === 'Stilwell Junior High School') {
    return course.school === 'Junior High' && (!course.course_name.includes('Stilwell Only') || campus.startsWith('Stilwell'));
  }
  return course.school === 'High School' && ['Valley High School','Valley Southwoods Freshman High School'].includes(campus);
}
