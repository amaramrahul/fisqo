# Empty Dashboard and Add Tax User — Design

GitHub issue: [#2](https://github.com/amaramrahul/fisqo/issues/2) "View empty dashboard and add a tax user" (Milestone 1 — App Shell & LLM Setup).

This is the first feature implemented in the repo, so it also bootstraps the monorepo skeleton described in `docs/fisqo-tech-design.md`.

## Goal

A user opening Fisqo for the first time sees an empty dashboard with a clear entry point to add a tax user (PAN + Date of Birth). Creating a tax user makes it appear on the dashboard. This is the seed of Workflow 1 Stage 2 (issue #12 covers the full "create tax user" stage inside a filing; this issue covers the dashboard-level entry point per the note on US-08: "the populated grouped-by-tax-user dashboard view becomes fully exercisable in Milestone 2... covered by US-02").

## Scope

### In scope
- Monorepo bootstrap: npm workspaces with `packages/core`, `packages/api`, `packages/web`, `packages/desktop`.
- `packages/core`: Prisma schema with a `TaxUser` model (`id`, `pan`, `dateOfBirth`, `createdAt`, `updatedAt`); a Zod schema validating PAN format (`AAAAA9999A`, case-insensitive input normalised to uppercase) and DOB (valid past date).
- `packages/api`: Express server; `GET /api/v1/tax-users` (list, ordered by `createdAt`); `POST /api/v1/tax-users` (create; 400 on validation failure; 409 with `{ code: "DUPLICATE_PAN", message, details }` on duplicate PAN).
- `packages/web`: React + Vite SPA. Dashboard page:
  - Empty state (no tax users): descriptive text about what Fisqo does + "Add new tax user" button.
  - Non-empty state: "Add new tax user" button at the top, plus one section per existing tax user (PAN shown; no filings listed yet — that's issue #10/#3).
  - "Add new tax user" opens a modal: PAN field (client-side format validation), Date of Birth field (date picker, required). Submit calls the API; success adds/reveals the tax user section; duplicate-PAN response shows an inline form error ("A tax user with this PAN already exists.").
- `packages/desktop`: minimal Electron main process — spawns the API as a child process on a fixed local port, opens `http://localhost:3000` in a `BrowserWindow` with `contextIsolation: true, nodeIntegration: false`. No IPC/file-picker work (not needed until a later stage).
- SQLite dev database at `packages/core/prisma/dev.sqlite`, created via Prisma migration, git-ignored.
- Package manager: npm workspaces.

### Out of scope (deferred to later issues)
- Filing creation, financial year selection, workflow cards (issue #10, #3).
- Locking W2/W3 until W1 complete (issue #4).
- LLM configuration (issues #5, #6, #7, #8).
- Editing or deleting a tax user (issue #11 covers edit-from-W1-Stage-2).
- Aadhaar Number field (issue #13).
- Electron file picker / native IPC.
- LangGraph pipeline (`packages/pipeline`) — not touched by this issue.

## Data model

```prisma
model TaxUser {
  id          String   @id @default(cuid())
  pan         String   @unique
  dateOfBirth DateTime
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

PAN is stored uppercase. Uniqueness enforced at the DB level (`@unique`) and surfaced as a 409 by the route handler catching the Prisma unique-constraint error.

## API

`GET /api/v1/tax-users`
- 200: `{ taxUsers: { id, pan, dateOfBirth }[] }`

`POST /api/v1/tax-users`
- Body: `{ pan: string, dateOfBirth: string (ISO date) }`
- 201: `{ taxUser: { id, pan, dateOfBirth } }`
- 400: `{ code: "VALIDATION_ERROR", message, details: ZodError.flatten() }` — bad PAN format or missing/invalid DOB
- 409: `{ code: "DUPLICATE_PAN", message: "A tax user with this PAN already exists." }`

No `Idempotency-Key` handling yet — the tech design specifies it for mutation endpoints generally, but a single retry-safe create isn't a correctness risk at this scale; can be added when the job-queue infrastructure that motivates it arrives in Workflow 2. Noting this as a deliberate deferral rather than an oversight.

## Frontend

- `Dashboard` page component: fetches tax users on mount, renders empty state or list of `TaxUserSection` components.
- `AddTaxUserModal` component: controlled form, client-side Zod validation (shared schema imported from `packages/core`), disabled submit until valid, shows server error inline on 409/400.
- No routing library needed yet (single page); add one when a second route (filing detail) is needed in issue #10/#3.

## Testing

- **Unit** (`packages/core`): Zod schema tests for PAN format (valid, lowercase-normalised, malformed) and DOB (valid past date, missing, future date).
- **Integration** (`packages/api`): route tests against a real SQLite test database (separate file, reset between tests) — create succeeds, list returns created users, duplicate PAN returns 409, malformed PAN returns 400.
- **E2E** (`packages/web/e2e`, Playwright): loads the app with an empty DB and confirms the empty state and button; adds a tax user through the UI and confirms it appears; attempts a duplicate PAN and confirms the inline error. Run headlessly via `npx playwright test`, wired into CI per the tech design's GitHub Actions plan.

## Open questions / deliberate deferrals
- No routing yet; single dashboard page only.
- No auth/session model — this is a fully local single-user app per the PRD, consistent with existing design.
