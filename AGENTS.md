<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->
## Project rules

- Stack: TanStack Start + Lovable Cloud. All AI calls go through server code in `src/lib/server/ai.server.ts` (Lovable AI Gateway, Responses API, streamed); never call AI from the browser. Why: keeps the key server-side and output streamed.
- AI server functions live in `src/lib/*.functions.ts`, return `{ ok: true, data } | { ok: false, error }` with student-safe messages, and call `prepareAiRequest` first. Why: quota, approval and AI on/off checks are enforced on the backend for every AI feature.
- Streaming endpoints (tutor chat, transcription) are server routes under `src/routes/api/` that verify the bearer token with `authenticateRequest`. Why: server routes bypass the function middleware.
- Every student-owned table has RLS `student_id = auth.uid() AND is_approved(auth.uid())`; admins never get read access to student notes/recordings. Why: student privacy for minors.
- Admin role is granted by database triggers only after the email in `app_settings.admin_emails` is verified; never assign roles from the client. Why: prevents privilege escalation.
- Sign-up eligibility (grade 7–12, school serves grade, allowed email domain) is enforced in the `handle_new_user` trigger and pre-checked with the `check_signup_eligibility` RPC. Why: frontend checks alone are bypassable.
- Shared query options live in `src/lib/queries.ts`; question/grading logic in `src/lib/practice.ts` (tested in `src/test/practice-grading.test.ts`). Why: one source of truth for client and server.
- Signed-in pages live under `src/routes/_authenticated/` and render inside `AppShell`; use `PageHeader`/`EmptyState` from `src/components/app/PageHeader.tsx`. Why: consistent layout and auth gate.
- Styling uses semantic tokens from `src/styles.css` (navy, electric, electric-soft, highlight, success, warning) and Button variants `hero`, `navy`, `soft`, `glass`; no raw color classes. Why: one design system.
