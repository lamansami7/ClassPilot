# ClassPilot AI Project Audit

Audit date: 2026-11-19 (America/Chicago)  
Repository: [lamansami7/pixel-perfect-picture-9957](https://github.com/lamansami7/pixel-perfect-picture-9957)  
Audited ref: `main` at `1b106bc83dd17b50739836a8e5d44a5c7d3983a1`  
Audit method: GitHub source, route, and migration inspection. No local checkout or configured Supabase project was available in this task environment, so runtime behavior, build, lint, and live RLS/storage behavior could not be exercised.

## Summary

This is an existing Lovable application, not an empty repository. It uses TanStack Start, React, TypeScript, Supabase, Drizzle migration files, TipTap, and the Lovable AI Gateway. It contains real signup/login, a WDMCS school/course seed, database tables and policies, server-side AI helpers, and authenticated AI/tutor/transcription endpoints.

The app shell advertises many signed-in pages, but the audited route tree has no dashboard, classes, notes, recording, study-material, tutor UI, settings, or admin page routes. The checked-in roadmap marks all those features incomplete. A landing page and signup flow therefore do not demonstrate the advertised student workflows.

## Repository and history

- Default branch: `main`; it is the only branch reported in the repository at audit time.
- Latest commit: `1b106bc83d` — “Add project README” (Lovable, 2026-11-20T01:29:33Z).
- Earlier commits: `42e8d48967` — “Added welcome page & signup”; `dd2015b76f` — “Started ClassPilot AI build”; initial TanStack template commit `08b3de56ac`.
- The repository contains Lovable project metadata and an `AGENTS.md` stating that commits to the connected branch sync to Lovable. Existing published history must be preserved.
- The root README is still generic “Pixel Perfect Picture” template copy and does not describe ClassPilot AI setup, environment, deployment, or operations.
- Package configuration provides `dev`, `build`, `lint`, and Vitest scripts. It has a Bun lockfile and Lovable/TanStack tooling.

## Existing features

### Present in source

- ClassPilot-branded welcome page with a list of intended product features.
- Login, forgot-password, reset-password, and multi-step signup routes.
- Supabase auth middleware, generated Supabase client/types, and a signed-in route guard.
- App shell/navigation entries for dashboard, classes, notes, recordings, study guides, worksheets, flashcards, quizzes, tutor, Study Center, settings, and admin.
- A course picker and database-backed school/course query helpers.
- WDMCS school and course seed migration.
- Core schema for profiles, roles, courses, selected courses, notes, folders, recordings, study guides, worksheets, flashcards, quizzes, tutor threads/messages, resources, activity, issue reports, AI usage, and settings.
- RLS and storage policy migrations.
- Server-side AI functions for note improvement and study/practice content, plus shared AI request/quota helpers.
- Authenticated tutor and transcription server routes.
- Small unit tests for route matching and objective grading.

### Roadmap status in the audited commit

The checked-in roadmap marks database/security/catalog, initial admin configuration, and AI server functions as done. It marks welcome/signup, dashboard, classes, notes, recordings, study materials, tutor conversations, Study Center, settings/admin, and end-to-end verification as not done. Source inspection confirms that the listed signed-in page routes are absent.

## Working functionality

“Working” below means the relevant implementation exists in source; it has not been confirmed against a running deployment.

- Signup source includes eligibility pre-checking, school/course selection, and Supabase signup.
- Login and password recovery routes exist.
- The authenticated route guard checks Supabase identity and redirects unauthenticated users.
- AI generation helpers call a configured server-side Lovable AI Gateway and return configuration/error states rather than fabricated results.
- Tutor and transcription server handlers authenticate the bearer token and check AI eligibility/quota.
- The database has student-owned content tables, activity tracking, objective-grading utilities, seeded schools/courses, and RLS/storage policies.
- Unit test source covers a few grading cases and root route matching.

## Broken or misleading behavior

- The app shell links to eleven signed-in destinations, but the audited route tree contains no corresponding page modules. Navigation targets therefore resolve to missing routes.
- The welcome page describes implemented features that are not yet represented by the missing student-facing workflows.
- The README describes the old generic template instead of the ClassPilot project.
- No runtime test has established that signup, login, database writes, AI generation, audio transcription, or any advertised workflow succeeds in the deployed environment.

## Incomplete functionality

- Dashboard, real database-backed statistics and recent activity.
- My Classes list and per-class pages/materials.
- Notes library/editor, autosave/error states, folders/topics, uploads, history, and review-before-accept AI edits.
- Recording UI, MediaRecorder lifecycle, private audio persistence, chunk recovery/assembly, recording list, transcript-to-note workflow, and consent reminders.
- Study guide, worksheet, flashcard, quiz, and test creation/edit/study/retry interfaces and saved history.
- Tutor conversation list/new/rename/delete/search UI and automatic message persistence/continuation verification.
- Study Center search, filters, organization, and saved resources UI.
- Account settings, grade-change requests, class management, reports, personal data export, and secure account deletion.
- Admin dashboard and management UI for students, schools, courses, platform settings, and issue reports.
- Student eligibility/guardian consent UX and documented approval/revocation workflows.
- Build, lint, unit, browser, accessibility, mobile, Chromebook, database, storage, and deployment verification.

## Missing functionality

- Route modules for the dashboard and the signed-in destinations listed in `src/components/app/AppShell.tsx`.
- An end-to-end test suite for account lifecycle, eligibility, content persistence, AI, recording recovery, RLS, storage privacy, and account deletion.
- Deployment/setup documentation and an environment-variable template that lists names without values.
- A verified local checkout in the current task environment; direct Git network access failed, so local execution and editing are unavailable here.

## Database findings

- Three migrations are present: core schema, WDMCS catalog/admin seed, and storage policies. The schema includes the expected student-content tables and uses student IDs, foreign keys, and RLS.
- Generic student-owned tables receive owner policies, but the UPDATE policy's `WITH CHECK` and DELETE policy check ownership without also requiring `is_approved(auth.uid())`. This differs from the project rule that every student-owned table requires both ownership and approval. Confirm intended access for rejected/unapproved users and tighten consistently through the Lovable-managed schema workflow.
- `handle_new_user` determines the initial admin role from an email string in `app_settings.admin_emails` during the auth-user insert trigger. The migration does not check that the address has been verified before inserting the admin role. This does not meet the stated requirement that the initial administrator be a verified account. Fix the trigger/workflow so admin privileges are granted only after verified email, then revoke any premature role safely.
- The signup eligibility RPC is callable by anonymous users and returns explanatory eligibility messages; it does not return profile data. This is useful for pre-checking but is not proof of enrollment.
- The initial schema provides an admin-only stats RPC and an issue-report table, but no admin page or full management workflow exists.
- Live schema state and the deployed database's applied migration versions were not available for verification.

## Security findings

- Positive controls found in source: no client-side role assignment path was observed; admin role inserts occur in the database trigger, AI API keys are read server-side, tutor/transcription endpoints authenticate requests, and student content has RLS owner policies.
- High priority: the committed tree includes a tracked root `.env` file. Its contents were deliberately not read or reproduced in this audit. Treat any credentials in it as potentially exposed: identify the values through the secret manager, rotate anything sensitive, remove the file from the repository through the Lovable-approved workflow, and ensure it stays ignored. A repository-level secret scan is still required.
- High priority: admin role assignment on auth-user creation is not conditioned on verified email in the reviewed migration.
- Review the student-table UPDATE/DELETE policies against the stated approved-student rule.
- Storage policies constrain the first path segment to the authenticated user's ID and uploads to approved users. Live bucket privacy, signed URL behavior, MIME/size enforcement, object cleanup, and interruption recovery remain unverified.
- The profile trigger protects email, grade, eligibility state, and school grade eligibility from ordinary student updates. Grade-change request handling and administrator approval UI are not implemented.
- No live RLS, cross-student access, rate-limit, or account-deletion tests were possible. Do not treat migration text alone as proof that the deployed database is secure.

## Integration findings

- Supabase configuration is read from `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and server-side `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY`. AI uses server-side `LOVABLE_API_KEY`; the transcription route uses the Lovable gateway.
- No secret values are included in this report. The tracked `.env` presence needs secret-manager review and rotation assessment.
- AI calls depend on the Lovable Gateway and configured key/credits. No deployed credentials or gateway request were available to verify.
- Transcription accepts audio segments up to 24 MiB at the server endpoint, but there is no recording interface or durable chunk-upload/recovery flow in the audited routes.
- The project’s `AGENTS.md` says schema changes and secrets must be managed through Lovable, and AI calls must remain on the Lovable gateway. Future work must follow those constraints unless the project owner changes them.

## Build and deployment findings

- Build/lint/test scripts exist in `package.json`; no install or execution was possible because there is no local repository checkout and direct GitHub network access failed.
- The GitHub connector can inspect the private repository, but it does not provide a local working tree. The workspace directory supplied for this task is not a Git repository.
- Lovable metadata and README indicate the application is connected to Lovable. Deployment configuration and a live deployment URL were not verified.
- Do not mark any build, lint, runtime, or deployment check as passing until run in a provisioned local checkout with configured dependencies/environment.

## Remaining development tasks

1. Provision/attach the repository checkout on the existing branch and preserve the Lovable commit history.
2. Resolve the tracked `.env` exposure and verified-admin-trigger gap using approved Lovable/secret-management workflows.
3. Reconcile generic owner RLS policies with the approved-user rule and test cross-student access.
4. Implement dashboard, classes, notes, and safe autosave/upload flows.
5. Implement saved study guides, worksheets, flashcards, quizzes, and Study Center.
6. Implement tutor conversation management and verify message persistence/context.
7. Implement recording lifecycle, private chunk persistence/recovery, transcription, and transcript workflows.
8. Implement account settings, reporting, data export/deletion, and admin workflows with backend authorization.
9. Update README/setup documentation and environment-variable names (never values).
10. Install dependencies, build, lint, run existing tests, then add and run end-to-end/security/device verification for the required journeys.
