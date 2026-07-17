# Dashboard Empty State and Add Tax User - Design

- **Issue:** [#2 - View empty dashboard and add a tax user](https://github.com/amaramrahul/fisqo/issues/2)
- **Milestone:** 1 - App Shell & LLM Setup
- **Date:** 2026-07-17
- **Status:** Approved

---

## Context

Issue #2 asks for a dashboard empty state and an "Add new tax user" entry point. The repository currently contains no code at all: no `package.json`, no `packages/` directory, no build tooling. This issue is therefore the project's walking skeleton. The monorepo layout, the API contract, the data layer, and the test harness established here are inherited by every subsequent issue.

Two contradictions in the design documents surfaced during brainstorming and are resolved by this spec. Both were invisible from the issue text alone and both are load-bearing for this slice.

---

## Scope

### In scope

- npm workspaces monorepo with four packages: `core`, `api`, `web`, `desktop`.
- `TaxUser` entity persisted in SQLite via Prisma, with migrations applied on startup.
- `GET /api/v1/tax-users` and `POST /api/v1/tax-users`.
- Dashboard: empty state with descriptive text; "Add new tax user" button at the top in both the empty and non-empty states; a working create modal; tax user sections keyed by PAN.
- Electron shell that spawns the API as a child process and renders the SPA.
- Test harness across unit, integration, component, and end-to-end layers.
- Documentation corrections listed under "Documentation updates".

### Out of scope, with the owning issue

| Deferred | Owner |
|---|---|
| Workflow status cards per filing | #3 |
| "Start new filing" control and the `Filing` entity | #10 |
| Aadhaar Number field and storage | #13 |
| LLM configuration and the `pipeline` package | #5, #6 |
| `Idempotency-Key` handling and cursor pagination | ADR 0001 (deferred) |
| DD/MM/YYYY date-picker component, inline field-level validation, friendly duplicate-PAN copy | #9 |

### The #2 / #9 boundary

Issues #2 and #9 both reference the same "Add new tax user" button, and #9 sits in Milestone 2. The boundary is drawn by responsibility rather than by field:

- **#2 owns the mechanism.** The shared Zod schema (including the PAN format regex), server-side enforcement, the database `UNIQUE` constraint on PAN, `409` on violation, and `422` on malformed input. The modal surfaces failures, if bluntly.
- **#9 owns the validation experience.** The DD/MM/YYYY date-picker component, inline field-level error messages, and the friendly duplicate-PAN copy.

The PAN regex lives in `core` from the start. Shipping a validator known to be wrong and correcting it one milestone later would produce throwaway tests without making the milestone boundary any cleaner. Every acceptance criterion of #9 still lands in #9.

---

## Resolved contradictions

### 1. PAN and Aadhaar storage

The tech design contradicted itself. Line 160 (Database Entities) stated that only Aadhaar is AES-256-GCM encrypted; line 292 (Security) stated that PAN and Aadhaar both are.

The contradiction is not cosmetic. AES-256-GCM uses a random IV per encryption, so the same PAN yields different ciphertext on every write. A `UNIQUE` index on that column would never fire, and PAN lookup would require decrypting every row. Reusing a fixed IV to work around this destroys GCM's security guarantees. Since #9 requires duplicate-PAN rejection and the UX design groups the entire dashboard by PAN, an encrypted PAN column is incompatible with the product as specified without an additional deterministic blind index.

**Decision: neither PAN nor Aadhaar is encrypted. Both are stored in plain text.**

Rationale: Fisqo is a local, single-user application. With no master password, any encryption key would have to live on the same disk as the SQLite file, so encryption at rest protects against an attacker who already has read access to the user's machine - a threat it does not meaningfully address. This also matches issue #13, which already specifies that "Aadhaar is stored in plain text in the local SQLite database". The security posture becomes a single coherent statement: **the local SQLite file is the trust boundary**, consistent with how the LLM API key is already handled (tech design line 291).

This changes storage, not display. The last-4-digits masking specified in #13 is a shoulder-surfing defence and is unaffected.

Consequence: no encryption key management is required, which removes what would have been the desktop package's most fragile moving part.

### 2. Electron shell architecture

The tech design mandated two architectures that cannot both hold. Lines 41-42 state that Electron "Opens `http://localhost:3000` in the user's default browser" and that native OS access is provided "via Electron IPC with `contextIsolation: true`".

`contextIsolation` and preload scripts are properties of an Electron `BrowserWindow`. A page loaded in the user's own browser is an ordinary web page with no IPC bridge. If the UI runs in an external browser, the mandated IPC route to the native file picker does not exist.

**Decision: Electron renders the SPA in its own `BrowserWindow`** with `contextIsolation: true` and `nodeIntegration: false`.

Rationale: this is the only reading under which the mandated IPC file picker and the security section (line 294) work as written, and it matches the distribution section's description of a native app. Issue #2 needs no file picker, so nothing here blocks this slice, but the shell must be scaffolded one way or the other, and retrofitting the alternative later would mean rewriting the shell and the file-picking path in every stage that browses directories.

---

## Architecture

```
packages/
  core/     Zod schemas + inferred TS types, Prisma schema & client
  api/      Express, /api/v1 routes, error middleware
  web/      React SPA (Vite), dashboard + modal
  desktop/  Electron main; spawns api as a child process
```

Dependency direction is strictly one-way. `web` and `api` both depend on `core` and never on each other; `desktop` depends only on `api`. `core` owns the `TaxUser` Zod schema, so the client, the server, and the database validate against a single definition and the API contract cannot drift from the UI's assumptions.

The `pipeline` package is not created. It is introduced when #5/#6 require an LLM.

In development, Vite proxies `/api` to the Express port, giving a single origin and removing any need for a CORS layer.

### Tooling

| Concern | Choice | Reason |
|---|---|---|
| Monorepo | npm workspaces | Sufficient for four packages; no extra tooling. The devcontainer already anticipates `npm install`. |
| Language | TypeScript, `strict: true` | Mandated by tech design line 281. |
| Test runner | Vitest | Native pairing with the mandated Vite toolchain. |
| API tests | Supertest against real SQLite | The `UNIQUE` constraint is the logic under test; a mocked database would test nothing. |
| Component tests | React Testing Library | Standard for the React SPA. |
| E2E | Playwright | Exercises the assembled system. |
| Routing | None yet | The dashboard is the only screen. #3 and #10 introduce the second and can add a router then. |
| Data fetching | Typed `fetch` client in `web/src/api/` | One endpoint does not warrant a query library. |

---

## Data model

```prisma
model TaxUser {
  id        String   @id @default(uuid())
  pan       String   @unique
  dob       String   // ISO 8601 calendar date, YYYY-MM-DD
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

No `aadhaar` column yet; #13 adds it as an additive migration, which tech design line 171 already requires as the norm.

**`dob` is a `String`, not a `DateTime`.** Prisma with SQLite stores `DateTime` as a millisecond epoch, which represents an instant. A birth date is a calendar date, not an instant. Storing `1985-03-15` as an instant makes it `1985-03-14T18:30:00Z` in IST, so any code that later reads it in UTC gets 14 March. DOB is an identity field the IT portal matches on, so a silent one-day shift is a correctness bug of the worst kind. Storing the calendar date as an ISO string removes the entire bug class rather than defending against it.

**PAN is canonicalised to uppercase at the Zod boundary**, before it reaches the database. SQLite's `UNIQUE` is case-sensitive, so without canonicalisation `abcde1234f` and `ABCDE1234F` would both insert and #9's duplicate detection would have a hole no UI validation could close.

---

## API contract

```
GET  /api/v1/tax-users   → 200 { data: TaxUser[], nextCursor: null }
POST /api/v1/tax-users   → 201 { data: TaxUser }
                           422 { code: "VALIDATION_ERROR",   message, details }
                           409 { code: "PAN_ALREADY_EXISTS", message }
                           403 { code: "FORBIDDEN_ORIGIN",   message }
                           500 { code: "INTERNAL_ERROR",     message }
```

Success responses use a `{ data }` envelope throughout, so introducing pagination later is additive rather than a breaking response-shape change. Error responses use the mandated bare `{ code, message, details? }` shape (tech design line 64).

Duplicate detection is delegated to the database. Prisma raises `P2002` on the `UNIQUE` violation and the error middleware maps it to `409 PAN_ALREADY_EXISTS`. A read-then-write check in application code would be racy.

Validation failures return `422`, consistent with the tech design's existing use of `422` for semantic rejection (`UNSUPPORTED_AY`, line 117).

---

## Web

A single dashboard screen.

- **Empty state:** shown when no tax users exist. Carries descriptive text explaining what Fisqo does, per the issue's first acceptance criterion.
- **"Add new tax user" button:** rendered at the top of the dashboard in both the empty and non-empty states.
- **Create modal:** built on the native `<dialog>` element, which provides focus trapping, Esc-to-close, and correct accessibility semantics without a dependency. Fields: PAN, Date of Birth.
- **Tax user sections:** each shows PAN in the section header, matching the UX design's grouping by PAN, with its own "no filings yet" empty state. Workflow cards (#3) and the start-filing control (#10) are not rendered.

---

## Desktop

Electron main process spawns the Express API as a child process on the fixed local port and renders the SPA in a `BrowserWindow` with `contextIsolation: true` and `nodeIntegration: false`. Express binds to `127.0.0.1` only, per tech design line 295.

### SPA delivery and loopback exposure

Express serves both the React static build and the API from the same origin, per tech design line 12. The `BrowserWindow` loads `http://127.0.0.1:3000`. Same-origin delivery means no CORS layer, and the Vite dev proxy makes development mirror production exactly.

A consequence worth stating explicitly, because it is easy to miss: **the SPA is reachable at `localhost:3000` from any browser on the same machine.** This is not a network exposure - line 295 binds loopback only - but it is a local one, and it is accepted deliberately. It also serves as a useful debugging affordance.

The preload bridge is a property of the `BrowserWindow`, not of the URL. Electron's window therefore gets `contextIsolation` and the native file-picker IPC; a local browser hitting the same URL gets the SPA without the bridge. The two entry points are not equivalent, and only the Electron one is a supported surface.

### Origin-check middleware

A loopback HTTP server is reachable by any page the user visits in their everyday browser. Browsers block *reading* a cross-origin response without CORS headers, but a cross-origin `POST` is still *delivered*, so a malicious page could create tax users. DNS rebinding can go further and defeat naive host checks to read data back. Given that this application stores plain-text PAN, Aadhaar, and full financial statements, the API mitigates both:

- Every state-changing request (`POST`, `PUT`, `PATCH`, `DELETE`) must carry an `Origin` or `Referer` header matching the expected loopback origin. Mismatched or absent values are rejected with `403 FORBIDDEN_ORIGIN`.
- The `Host` header is validated against the expected loopback host, which is what defeats DNS rebinding: a rebound request arrives carrying the attacker's hostname, not `127.0.0.1`.

This middleware is written once here and every later endpoint inherits it, which is precisely why it belongs in the first slice rather than being retrofitted across a finished API.

---

## Testing

Tests precede implementation at each layer, per the tech design's TDD mandate (lines 253-258). API contract tests are written before the route handlers.

| Layer | Coverage |
|---|---|
| Unit | `core` Zod schema: valid PAN accepted; lowercase canonicalised to uppercase; malformed PAN rejected; DOB format enforced; DOB required |
| Integration | Empty list returns `{ data: [], nextCursor: null }`; create returns 201 and persists; subsequent list returns the created user; duplicate PAN returns 409; malformed input returns 422; a `POST` carrying a foreign `Origin` returns 403; a request carrying a foreign `Host` returns 403 |
| Component | Empty state renders its descriptive copy; Add button present in both empty and non-empty states; modal opens on click; submit calls the API client; server errors surface |
| E2E | Empty dashboard → click Add → enter PAN and DOB → save → tax user section appears |

The E2E test is what proves issue #2's acceptance criteria, exercising the assembled system as an end user experiences it.

---

## Documentation updates

| File | Line | Change |
|---|---|---|
| `docs/fisqo-tech-design.md` | 160 | Remove "Aadhaar AES-256-GCM encrypted"; note that PAN carries the `UNIQUE` index |
| `docs/fisqo-tech-design.md` | 292 | Replace AES-256-GCM claim with plain-text storage; state that the local SQLite file is the trust boundary |
| `docs/fisqo-tech-design.md` | 16, 41 | "default browser" → Electron `BrowserWindow` |
| `docs/fisqo-tech-design.md` | 295 | Add `Origin`/`Referer` and `Host` validation on state-changing requests; note that loopback binding alone does not prevent CSRF or DNS rebinding from the user's own browser |
| `docs/fisqo-ux-design.md` | 15 | Aadhaar "(stored encrypted; ...)" → "(stored in plain text; last 4 digits shown in UI)" |
| `docs/fisqo-ux-design.md` | 284 | Add the dashboard empty state to the Dashboard section, which currently describes only the populated view |
| `CLAUDE.md` | Dev environment | Replace "No build/test commands exist yet - the project is pre-implementation" with the real commands |
| `CLAUDE.md` | PR checklist item 2 | Repoint "the Testing Policy above" at the tech design's QA section; no such section exists in `CLAUDE.md`, so the mandatory checklist item is currently unresolvable |
| `docs/adr/0001-defer-idempotency-and-pagination.md` | new | Record the deviation below |

No user stories require changes. Issue #13 already specifies plain-text Aadhaar storage; only the design docs lagged.

---

## Deviations from the tech design

Recorded in ADR 0001.

The tech design (lines 62-66) mandates four cross-cutting API properties. Two are adopted now: versioned REST under `/api/v1`, and the standardised error shape. Two are deferred:

- **`Idempotency-Key` with 24-hour deduplication.** This guards against retry storms that a localhost application with a single user and no network flakiness does not experience. Implementing it now means a dedupe table, middleware, and TTL sweeping tested against a scenario that cannot yet occur, which is very likely to be subtly wrong by the time anything depends on it. It is additive whenever a real need appears.
- **Cursor-based pagination.** A realistic user has one to three tax users. The `{ data, nextCursor }` envelope is adopted now so that adding real pagination stays additive; the pagination machinery itself is not.

The envelope is adopted despite the deferral because response shape is the only decision in this area that is genuinely hard to reverse.

---

## Acceptance criteria mapping

| Issue #2 criterion | Covered by |
|---|---|
| Empty state shown when no tax users exist, with descriptive text explaining what Fisqo does | Web empty state; component test; E2E test |
| "Add new tax user" button visible at the top of the dashboard (empty and non-empty states) | Web dashboard; component test asserts both states |
| Clicking the button opens the new-tax-user flow (PAN + Date of Birth, per #9) | Create modal; `POST /api/v1/tax-users`; E2E test |
