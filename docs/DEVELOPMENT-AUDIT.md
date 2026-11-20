# ClassPilot AI development audit and plan

## Scope and baseline

This is an initial repository review, not an independent production security assessment. The repository contains a TanStack Start app, public landing and five-step signup/login/password routes, an authenticated shell, shared Supabase queries, study creation dialogs, AI server functions, tutor and transcription endpoints, migrations, catalog seed, RLS/storage policies, and practice grading tests. Before this work the generated route tree omitted authentication routes, the authenticated layout had no child routes, the build failed with a route conflict, and all shell links pointed to missing pages. Tables and server functions alone do not establish working end-to-end features. The roadmap is stale.

The database in `drizzle/migrations` is Lovable-managed (see AGENTS.md); its SQL was reviewed as source, not verified against a live database. No production data or schema was changed. The tracked `.env` contains configuration named for Supabase URLs, project IDs and publishable keys, not a named service-role or AI secret. Publishable keys are intended for clients but do not constitute authorization; review key classification and history before assuming no credential exposure. If a service-role, secret or other privileged credential was ever committed, rotate it with the provider and review history. Removing a file from the current tree alone does not erase history. Avoid committing future environment files and secrets.

## Work in this iteration

- Restored route generation/build by adding authenticated child routes. Added dashboard, class listing and a searchable note library and plain-text editor using existing queries, tables and RLS. Notes require explicit save; there is no autosave. The editor confirms navigation away with unsaved work, warns on browser unload and retains edits when a save fails. Deletion asks for confirmation. Real query errors are surfaced rather than silently counted as zero.
- Hid shell navigation for routes that do not exist, rather than advertising broken functionality. Existing components and AI integrations are retained for future development.
- Removed logging of transcription provider response bodies, which may contain sensitive content.
- Added route-match coverage. This does not exercise loaders, authentication, RLS or the database.

## Security and launch blockers

1. The seed sets `require_admin_approval = false`; signup is automatically approved after domain/grade/school checks. Domain ownership is not proof of enrollment. Arrange an actual enrollment-verification workflow and enable mandatory approval in the deployed database through Lovable. The existing pending screen's language should not be taken as evidence that review is currently enforced.
2. Guardian consent is client-supplied metadata; there is no verified guardian consent process in the reviewed code. Obtain legal and district guidance, implement and verify required consent and retention procedures before use by minors. No compliance claim is made.
3. The latest seed grants admin after email confirmation, but this and all RLS/storage policies need integration testing against the actual deployed schema and auth configuration. Verify email-confirmation settings, admin role grants/revocation, suspended access, cross-user isolation and private bucket configuration. Existing storage read/update policies do not require approval; assess suspended-account access. Generic foreign keys do not validate that referenced student-owned entities share an owner; review cross-tenant integrity. No admin page has been delivered.
4. Existing account deletion code lists at most 1,000 files per bucket, does not recursively remove nested files, and ignores storage errors; it can delete an account while leaving files. Do not expose or rely on it until deletion is made complete, auditable and tested, including partial failure and retention policy.
5. AI and transcription routes depend on server secrets and external services. Review request-size enforcement, message validation, quotas, provider retention and error logging; client-provided content and prompt injection must not be trusted. Actual service availability and AI outputs were not tested.
6. Do not deploy to students without a documented privacy policy, recording consent, incident handling, access-control tests, and external security/legal review.

## Phased plan

1. Verify deployed schema and settings with Lovable; correct enrollment approval, consent, storage and deletion controls. Establish safe test accounts and a non-production Supabase environment.
2. Finish class details, filtering and course management. Extend dashboard with only verified, persisted material and activity.
3. Replace the plain-text editor with a compatible rich-text editor, autosave with serialized writes, local recovery and conflict handling, folders, uploads and review-before-replace AI editing. Test failure and navigation scenarios.
4. Connect and test existing study generation functions to persistent guide, worksheet, flashcard and quiz routes. Implement answer concealment, grading, attempts and review without fabricating results.
5. Build tutor threads and reliable message persistence; then recording, private upload, playback and transcription, including permissions and interrupted-upload handling.
6. Build the Study Center, resource search, settings, data export and safe deletion. Implement the administrative interface with server/database authorization, audit logs and no casual access to private material.
7. Run integration and browser tests for signup, auth, ownership, all material workflows and responsive/mobile behavior. Resolve baseline type and lint failures and perform a security assessment before production.

## Verification and configuration

`npx --yes bun install --frozen-lockfile` installed the existing lockfile; npm install failed in this environment. `npm run build` succeeds after the changes. `npm test` passes 12 tests, consisting of route matching and existing grading unit tests. `npx tsc --noEmit` still fails on existing issues including dangling study-dialog routes and strict typing. `npm run lint` still fails on extensive existing formatting errors. No live Supabase, AI, recording, browser, accessibility or mobile end-to-end workflow was verified. The app needs the existing Supabase URL and publishable key configuration; server-side AI requires `LOVABLE_API_KEY`, resource search additionally uses the configured Firecrawl connector/key, and administrative deletion requires a service-role key. Never expose server keys in browser code.

Run locally with `npx --yes bun install --frozen-lockfile` and `npm run dev -- --host 0.0.0.0`. Use a non-production backend and authorized test account. This iteration is not a completed or production-ready application.

## Continuation: implementation status

The following additional workflows have been implemented in the existing architecture, but have **not** been verified against a live backend or AI service:

- Class detail pages search notes, guides, decks, worksheets and quizzes for an enrolled class. Dashboard has navigation shortcuts and database-backed recent activity.
- Searchable libraries and detail pages for study guides, flashcard decks, worksheets and quizzes. Guide generation/regeneration uses the existing server function and requires an original note; guides can be printed or deleted. Decks can be studied, flipped, shuffled, edited, added to, marked learned/difficult and explicitly saved. Practice uses existing question types and grading function; answer explanations appear after submission, and the latest result is stored. Retakes replace the previous result: attempt history is not supported by the current schema.
- A tutor UI supports separate class-associated threads, history loading, rename/delete and streamed requests to the existing authenticated tutor endpoint. Server persistence occurs on stream completion; neither successful streaming nor persistence has been tested with a real AI gateway.
- Recording UI uses MediaRecorder with consent reminders, pause/resume, local in-memory retry after an upload failure, storage upload, signed playback, rename and delete. It cannot recover after page/browser closure; transcription and transcript conversion have no connected UI. Storage/database partial failures are possible and need integration testing.
- Plain-text notes now debounce autosaves and preserve unsaved in-memory edits on failure with a retry button and navigation warning. AI improvement displays a plain-text suggestion for review before replacement; it depends on the existing AI service. Rich text, attachments, folders, cross-device conflict detection, durable offline recovery and unsaved-draft recovery after closure remain incomplete. Existing HTML content is shown as source text, not a rich-text document.
- Study Center aggregates five material types. Resource search connects the existing server-side Firecrawl integration and saves returned HTTPS resources; it needs configured keys. Settings supports name, password and issue reports. No student-facing deletion/export or admin UI was added.
- Account-deletion server code now enumerates storage pages and folders and stops on reported storage errors before deleting the auth account. Deletion is still not exposed in settings: recursive cleanup, partial failure, concurrent upload and retention behavior require real integration tests before relying on it.
- The committed seed still allows automatic approval based on domain. Enrollment verification, verified guardian consent and administrator approval must be implemented and enforced in the Lovable-managed database; client UI cannot make these safeguards effective. The application remains unsuitable for production use by students until these and the earlier blockers are addressed.

Build and TypeScript checks pass. The route-match suite now covers 21 paths and existing grading tests pass (26 total); route matching does not execute authentication, UI, network, permissions, persistence or real AI calls. Full lint still fails predominantly on pre-existing formatting. No live signup, ownership/RLS, storage, recording, AI, account-deletion, browser or mobile end-to-end tests have been run. Required integrations remain Supabase configuration, Lovable AI gateway credentials, Firecrawl connector credentials for resource search, and a server-side service-role key for the unexposed deletion function. No database migration was changed.
