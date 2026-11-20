# ClassPilot branch release check — 2026-11-20

This is a tested branch preview, not a production deployment. The Lovable site was inspected, not republished. See [catalog reconciliation](CATALOG.md) for official source links and evidence boundaries.

## Checks performed

- `npm run build`, `npx tsc --noEmit`, `npm run lint` (zero errors, 14 component fast-refresh warnings), `npm test` (37 tests).
- `npm run test:db`: applies the checked-in SQL to disposable PGlite PostgreSQL, with stub auth users and storage metadata. Verifies catalog mappings, grade/school rejection, pending-account restrictions, admin-only stats, approval and revocation, note persistence and isolation, and storage path isolation. This is not a hosted Auth, SMTP or object-storage integration test.
- Headless Chromium: public signup navigation and signed-out `/admin` redirect at 390px and 1280px. Mobile browser with synthetic, intercepted auth/database responses: opened dashboard, classes, notes, recordings, guides, flashcards, worksheets, quizzes, tutor, resources, Study Center and settings; exercised note typing, autosave, Markdown preview and reload. Synthetic microphone: capture, pause, resume, stop and discard. No real student records used.
- Signed-in route testing found a client/server import violation that prevented the note editor from loading; fixed eager schema construction in `ai.functions.ts` and reran the editor workflow successfully.

## Before a student rollout

1. Reauthenticate the Supabase connector (project discovery returned 401). Verify project identity and configuration in staging. Reconcile the two documented catalog rows in place using Lovable. Confirm deployed RLS and private buckets match the checked-in policies. The approval requirement in the checked-in seed is **off**; enable manual review before accepting registrations. Existing approved accounts need a separate eligibility review. Storage policies still permit previously approved owners to read/update their own files after revocation; tighten those policies and review signed URL lifetimes in the managed database.
2. Agree on a district-authorized enrollment check, age/guardian process, AI provider terms and data retention/deletion schedule. The app does not verify guardian authorization or roster membership. Do not rely on legacy `guardian_consent` flags. Audit logging for privileged actions needs a protected append-only server/database implementation, not a second client write. Admin listing visibility controls are not a full catalog authoring tool.
3. Use disposable staging accounts to verify hosted signup, email verification/reset, password reauthentication, deletion (including partial storage failure), exports, multi-device note conflicts, actual recording uploads and representative devices. Test AI gateway transcription/generation/stream persistence and Firecrawl with configured staging credits. These external integrations were not live-tested.
4. Confirm counselor-specific prerequisites, course descriptions and campus timetables. Title and grade checks do not confirm placement. The checked-in catalog is not a student information system.
5. Remaining feature limits: Markdown editing is not WYSIWYG; import is text/Markdown, not an attachment library. Study-guide editing covers title/overview/summary. Practice history shows prior scores, not full historical answer sheets. No new production URL until the branch has been reviewed and published through Lovable.
