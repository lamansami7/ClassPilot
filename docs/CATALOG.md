## District catalog check · November 20, 2026

Sources: [district feeder schools](https://www.wdmcs.org/enroll/boundaries), [registration](https://courses.wdmcs.org/registration-resources), [grade 7](https://courses.wdmcs.org/junior-high-courses/seventh-grade), [grade 8](https://courses.wdmcs.org/junior-high-courses/eighth-grade), [Valley/Southwoods departments](https://courses.wdmcs.org/courses-listed-by-department). Catalog year: 2026–27.

The five seeded campuses correspond to the district feeder/alternative schools: Indian Hills and Stilwell (7–8), Valley Southwoods (9), Valley (10–12), Walnut Creek (alternative, 9–12). Compared the 36 junior-high seed titles and grade arrays against both junior-high listing pages. The two Spanish immersion social studies classes are Stilwell-only, despite the seed's generic Junior High school field. Orchestra is offered at both with different course codes. Qualified supports are not automatic placements.

The Valley/Southwoods department index is not a Walnut Creek catalog. Walnut Creek students register directly with their counselor. The picker no longer treats generic high school rows as Walnut Creek offerings. High school titles, descriptions, prerequisites and individual campus placements have not all been independently reconciled. Do not infer prerequisites from titles or promote the seed as a complete current schedule. Changes filter public catalog choices without altering existing student-owned class associations.

Additional subject check: all 17 titles and grade flags on the [Art department list](https://courses.wdmcs.org/courses-listed-by-department/art) match the seed's opening art block. This does not verify every description, prerequisite or campus schedule.

Also reconciled title and grade flags in [Mathematics](https://courses.wdmcs.org/courses-listed-by-department/mathematics) (13 distinct listings; pathway repetitions are not additional courses), [Science](https://courses.wdmcs.org/courses-listed-by-department/science) (16 distinct listings), and [World Languages](https://courses.wdmcs.org/courses-listed-by-department/world-languages) (19). The evidence snapshot in `src/lib/catalog-evidence.json` only grants the checked label when name, school level and full grade array match. It does not verify descriptions, prerequisites or an individual student's placement.

### Remaining department lists reviewed on the same date

[Business](https://courses.wdmcs.org/courses-listed-by-department/business-education), [computer science](https://courses.wdmcs.org/courses-listed-by-department/computer-science), [engineering](https://courses.wdmcs.org/courses-listed-by-department/engineering-technology), [family and consumer science](https://courses.wdmcs.org/courses-listed-by-department/family-and-consumer-science), [language arts](https://courses.wdmcs.org/courses-listed-by-department/language-arts), [music](https://courses.wdmcs.org/courses-listed-by-department/music), [PE/health](https://courses.wdmcs.org/courses-listed-by-department/physical-education-health), [social studies](https://courses.wdmcs.org/courses-listed-by-department/social-studies), [unique offerings](https://courses.wdmcs.org/courses-listed-by-department/unique-courses).

Reconciliation findings:

- Carpentry II (TEC240) flags grades 9–12, not 10–12. The published FAM420 title is **Cafè V**. These corrections are applied before grade filtering and to existing class views without changing IDs. For Lovable-managed database reconciliation, correct those two non-custom High School rows in place; do not replace the seed or recreate enrollments.
- Contrary to a blanket campus exclusion, Walnut Creek students may register for Valley's AFJROTC program. Aviation History and one other course are offered per year. The four descriptions are not a four-course annual schedule.
- Initial Field Experience requires Foundations of Education with a C− or better. Fundamentals of Writing requires both semesters of Language and Literature. Other prerequisites were not individually confirmed.
- Language Arts prints both AP Literature and Composition and Literature and Composition with ENG503/504. Do not merge students' classes or assume the labels are interchangeable without district clarification.
- Summer Drivers Education is described as a separately scheduled StreetSmarts offering with external fees, not a grade-flagged district course; it was not added to the regular course picker.
- Course titles/grade evidence is not verification of every description, section, program placement, or campus timetable. District counselors are authoritative for individual schedules.
