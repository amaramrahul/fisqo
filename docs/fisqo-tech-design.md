# Fisqo — Technical Design Document

---

## High-Level Design

### System Components

| Component | Technology | Responsibility |
|---|---|---|
| **Frontend** | React SPA (Vite) | Stage-by-stage filing UI; calls REST API; streams LLM job progress via SSE |
| **API Server** | Node.js + Express | REST API (`/api/v1/...`); serves React static build in production; manages LLM job queue |
| **LLM Pipeline** | LangGraph.js | Document classification and income extraction chains; one chain per extraction category |
| **ORM / DB** | Prisma + SQLite | All app state persisted locally; migrations applied on startup |
| **File System Layer** | Node.js `fs` | Reads user-supplied statement directories; path-sanitised at API boundary |
| **Desktop Shell** | Electron | Spawns Express as child process; opens `localhost:3000` in browser; handles native OS interactions (file picker) |

**Monorepo layout:**
```
packages/
  core/       — shared types, Zod schemas, Prisma client, FIFO engine, tax computation
  api/        — Express server, route handlers, LLM job queue
  pipeline/   — LangGraph chains, prompt files, LLM provider adapters
  web/        — React SPA
  desktop/    — Electron shell
data/
  fx-rates/   — Bundled SBI TT rate CSVs (refreshed at release time)
schemas/
  ay2026/     — Bundled ITR-2 JSON schema for AY 2026
evals/
  fixtures/   — Redacted statement samples + reference extraction outputs
docs/
  adr/        — Architecture Decision Records
```

### Distribution

Electron app — bundles Node.js runtime + Express + React build. Installs like a native app on Mac/Windows/Linux. No prerequisites for end users.

- Electron main process spawns the Express server as a child process on a fixed local port.
- Opens `http://localhost:3000` in the user's default browser on launch.
- Native OS access (file picker, app data directory) via Electron IPC with `contextIsolation: true`.

### Config File

LLM configuration stored as plain-text JSON at `app.getPath('userData')` (OS app data directory):

```json
{
  "llm": {
    "provider": "deepseek",
    "model": "deepseek-chat",
    "apiKey": "sk-..."
  }
}
```

Read on startup; written when the user saves W1 Stage 1. Not stored in SQLite.

### API Design

- Versioned REST under `/api/v1/...`
- Mutation endpoints carry an `Idempotency-Key` header; server deduplicates within a 24-hour window.
- Standardised error shape: `{ code: string, message: string, details?: unknown }`
- List endpoints use cursor-based pagination; page size capped at 200.
- Individual endpoint inventory deferred to implementation.

### LLM Provider Abstraction

All providers implement a single `LlmAdapter` interface:

```ts
interface LlmAdapter {
  chat(messages: ChatMessage[], options: LlmOptions): Promise<string>;
  stream(messages: ChatMessage[], options: LlmOptions): AsyncIterable<string>;
  readonly capabilities: { supportsPdfInput: boolean };
}
```

Provider is selected at runtime from user config. No provider-specific code leaks into pipeline or route handlers. Supported: **DeepSeek** (primary), **OpenAI**, **Anthropic**, **Google Gemini**. Local model support deferred.

### Model Selection

| Axis | Decision |
|---|---|
| **Primary model** | DeepSeek-V3 — primary development and testing model; strong structured JSON extraction at significantly lower cost |
| **Other providers** | OpenAI (GPT-4o), Anthropic (Claude Sonnet), Google (Gemini) — user-selectable; no automatic fallback |
| **Context window** | Typical Indian bank statement ≈ 10k–80k tokens. All providers support ≥ 64k; no chunking needed for most documents |
| **Cost estimate** | DeepSeek-V3: full W2 extraction ≈ $0.05–0.15. Western providers 5–20× higher. |

### PDF Parsing Strategy

Provider-aware via `adapter.capabilities.supportsPdfInput`:

| Mode | How | Providers |
|---|---|---|
| **Text extraction (default)** | `pdfjs-dist` extracts text; sent as string | DeepSeek and any text-only provider |
| **Native PDF** | PDF bytes sent directly in the API message | Claude, Gemini |
| **Image mode (opt-in)** | Pages converted to PNG via `pdf2pic` | Claude, GPT-4o, Gemini — for scanned PDFs |

DeepSeek (primary) always uses text extraction — it is text-only. Image mode requires switching to a multimodal provider; user can toggle per institution in W2 Stage 1 / W3 Stage 2.

### Communication Modes

| Operation | Protocol | Rationale |
|---|---|---|
| CRUD (stage data, rows, config) | Synchronous REST | Simple; easy to test and cache |
| LLM extraction jobs | SSE (`/api/v1/jobs/:id/events`) | Unidirectional server→client stream; no WebSocket handshake; works through HTTP/1.1 proxies |

### AY Schema and Prompt Registry

A `SchemaRegistry` factory in `packages/core/src/registry.ts` maps an Assessment Year string (e.g. `"AY2026"`) to:

- The Zod schema bundle under `schemas/ay{year}/`
- The prompt directory under `packages/pipeline/prompts/ay{year}/`

Route handlers and LangGraph chains receive the AY from `Filing.assessmentYear` and call `SchemaRegistry.forYear(ay)` to obtain the correct schemas and prompts. No handler hard-codes a year. If the requested AY is not registered, the server returns `HTTP 422` with error code `UNSUPPORTED_AY`. On app update, the UI shows a banner if a filing's AY schema has been superseded by a newer bundled version, prompting the user to re-validate extracted data.

### Data Sourcing

- User provides statement files (PDF, CSV, XLS) from their local machine.
- Fisqo validates LLM output **structure** (Zod) but not **semantic correctness** — user is responsible for reviewing extracted values before filing.
- Before the first cloud LLM job on a filing, UI shows an explicit acknowledgement that financial documents will be transmitted to the configured API endpoint.

---

## Detailed Design

### LangGraph Pipeline

All LLM work uses deterministic **chains**, not autonomous agents — every extraction task has a fixed input and output schema. One chain per extraction category, independently prompt-tunable and testable:

| Chain | Output Zod type |
|---|---|
| `classifyDocuments` | `InstitutionClassification[]` |
| `extractSalary` | `SalaryRow[]` |
| `extractDomesticBankInterest` | `InterestRow[]` |
| `extractOtherDomesticInterest` | `InterestRow[]` |
| `extractForeignInterest` | `ForeignIncomeRow[]` |
| `extractDomesticDividends` | `DividendRow[]` |
| `extractForeignDividends` | `ForeignDividendRow[]` |
| `extractDomesticCgSummary` | `CgSummaryRow[]` |
| `extractDomesticCgTransactions` | `TradeRow[]` |
| `extractForeignCgSummary` | `ForeignCgSummaryRow[]` |
| `extractForeignCgTransactions` | `ForeignTradeRow[]` |
| `extractTds` | `TdsRow[]` |
| `extractFaIncome` | `FaIncomeRow[]` |
| *(+ FA-period mirrors of interest / dividend / CG chains)* | |

**Prompt versioning**: prompts live in `prompts/{category}.md`, hashed (SHA-256) at load time, hash stored in `LlmJob.promptHash` — enables exact reproduction of any past extraction run.

**Retry / failure**: on Zod parse failure, chain retries up to `maxRetries` (configurable); on exhaustion, job moves to `failed` and stores `rawResponse` + `zodError` for debugging.

### Database Entities

Key entities (full schema in `packages/core/prisma/schema.prisma`):

| Entity | Purpose | Key design notes |
|---|---|---|
| `TaxUser` | One per taxpayer — PAN, DOB, Aadhaar | Aadhaar AES-256-GCM encrypted |
| `Filing` | One per AY per tax user | References AY for ITR schema selection |
| `Stage` | One row per stage per filing | `(filingId, stageKey)` unique; `status` enum (`NOT_STARTED \| IN_PROGRESS \| COMPLETE \| SKIPPED`) required column — `SKIPPED` records a conscious user bypass without blocking downstream stages; W4 routing requires all prerequisite stages to be `COMPLETE` or `SKIPPED` before unlocking; `data` JSON holds stage output |
| `Institution` | Document grouping + category selection | `workflowScope: FY \| CY` — `FY` for Workflow 2 (April–March statements), `CY` for Workflow 3 (January–December FA statements); LangGraph chains receive only institutions matching the active workflow scope, preventing cross-contamination; `cgMode` (summary/transactions), `pdfMode` (auto/image) per institution |
| `Document` | File path + exclusion flag per institution | — |
| `IncomeRow` | Extracted or manually-added data row | `data` JSON for category-specific fields; `note` never sent to LLM |
| `LlmJob` | One job per chain run | Tracks tokens, latency, `promptHash`, status FSM |
| `FxRate` | SBI TT rate by currency + date | `lastFetchedAt` drives staleness check |

**Key schema decisions:**
- Flexible income data stored as JSON in `IncomeRow.data` — avoids a column-per-field explosion across 13+ extraction categories.
- Additive-only migrations — no destructive column drops on existing filings when AY schema changes.
- `Stage.data` JSON stores stage-specific output; downstream stages read it directly rather than requerying all rows.

### Stage Dependency Graph

Rescan of a stage resets all stages in its subtree. Manual-entry stages (W2.10–12, W2.15–17, W2.20) are never in any downstream — rescanning income extraction never clears manual entries.

```
W2.1 (Doc Discovery)
  └─► W2.2–9, W2.13, W2.14 (income extraction)
        └─► W2.5, W2.7, W2.9, W2.14 (foreign income stages)
              └─► W2.18 (Schedule FSI)
                    └─► W2.19 (Schedule TR)
              └─► W3.3–6 (FA income, if started) ← explicit cross-workflow warning shown

W3.1 (FA Setup — Dec 31 FX rate confirmed)
  └─► W3.2 (FA Doc Discovery)
        └─► W3.3–6 (FA income extraction)
              └─► W3.7–14 (FA sub-tables)
                    └─► W3.15 (FA Review and Lock)
```

W3.1 is the root dependency for all W3 calculations. Any user override to the December 31 FX rate cascades invalidation through W3.3–14. W3.15 can only be reached when all sub-table stages are `COMPLETE` or `SKIPPED`.

LlmJob status FSM: `queued → running → succeeded | retrying → failed | superseded`

### FIFO Capital Gains Engine

Pure TypeScript in `packages/core/src/fifo.ts`, no LLM. Processes `TradeRow[]` into `CgSummaryRow[]` using FIFO lot matching, with 31 Jan 2018 FMV grandfathering for domestic listed equities. Foreign CG applies FX conversion at acquisition and sale dates separately.

**Corporate action override interface:** The engine accepts an `overrides: TradeRow[]` parameter alongside the LLM-extracted rows. Override rows carry `rowType: 'corporate_action'` and fields: `date`, `actionType` (`SPLIT | BONUS | MERGER | SPINOFF`), quantity delta, and cost basis delta. Before lot-matching, the engine merges and date-sorts extracted rows and override rows; override rows take precedence over any extracted row with the same `(isin, date, actionType)` key. This injection point is populated from user-added rows in the W2 Stage 8 / W3 Stage 5 UI ("Add adjustment row") — required when the broker statement omits corporate-action entries.

### SBI FX Rate Data

- Source: [`sbi-fx-ratekeeper`](https://github.com/sahilgupta/sbi-fx-ratekeeper/tree/main/csv_files) CSV files.
- CSVs bundled under `data/fx-rates/` at release time; seeded into `FxRate` on first run.
- On startup (background): download and re-seed only if `FxRate.lastFetchedAt` is older than 24 hours. Falls back to existing data if offline.
- Look-up by currency + exact date. The look-up function returns `{ rate: number, appliedDate: string, requestedDate: string, isFallback: boolean }`. When `isFallback: true` (weekend, bank holiday, or missing entry), the API includes this metadata in the response and the UI renders a tooltip: "Rate from [appliedDate] used — no rate available for [requestedDate]." This lets the user confirm the correct fallback rate was applied before filing.

### W3 Lock Mechanism

W3 Stage 15 ("FA Review and Lock") is the terminal node of the W3 dependency graph. When the user clicks "Confirm and Lock":

- `Stage.status` for the W3.15 row is set to `COMPLETE` and a `lockedAt` ISO timestamp is written into `Stage.data`.
- All W3 mutation routes (PUT/PATCH on `IncomeRow`, `Stage.data`, or `Institution` where `workflowScope = CY`) include a pre-handler guard: if `w3LockStage.lockedAt` is set and W4 has been initialised, the request is rejected with `HTTP 409 Conflict` and error code `W3_LOCKED`.
- Async LLM job completions for W3 chains check the lock before writing results; any job that completes after the lock was set discards its output and transitions to status `superseded`.
- **Unlock path**: the user clicks "Reopen W3" in W3.15, which clears `lockedAt` and resets W4 to `NOT_STARTED` with an explicit warning that any generated ODS/ITR JSON must be regenerated.

### W4 Tax Computation Engine

A dedicated, purely rule-based module in `packages/core/src/tax/`. No LLM involvement — all computations are deterministic formula executions over typed inputs.

**Architecture:** DAG of pure TypeScript functions — each node takes typed inputs and returns typed outputs with no side effects, enabling isolated unit testing per node.

**Computation nodes (in dependency order):**

| Node | Inputs | Output |
|---|---|---|
| `computeSlabTax` | `totalIncome`, `regime` | tax before rebate |
| `computeRebate87A` | `totalIncome`, `regime`, `taxBeforeRebate` | rebate (₹60,000 cap under NTR for income ≤ ₹12L) |
| `computeSurcharge` | `totalIncome`, `taxAfterRebate` | surcharge + marginal relief |
| `computeCess` | `taxAfterSurcharge` | 4% Health & Education Cess |
| `computeAMTCredit` | `filingHistory` | credit u/s 115JD if applicable |
| `computeRelief` | `foreignTaxPaid`, `scheduleFsi` | relief u/s 89/90/91 |
| `computeCredits` | `tdsRows`, `advanceTaxRows`, `tcsRows` | total prepaid credits |
| `compute234B` | `assessedTax`, `advanceTaxPaid`, `assessmentDate` | interest; quarterly due dates (Jun 15, Sep 15, Dec 15, Mar 15) are statutory constants in the module |
| `compute234C` | `quarterlyShortfalls` | interest per quarter |
| `compute234A` | `taxPayable`, `filingDate`, `dueDate` | interest; computed and shown only if filing date is after the due date |
| `compute234F` | `totalIncome`, `filingDate`, `dueDate` | late fee (₹1,000 / ₹5,000 depending on income) |

**Inputs sourced from:** W2 Stage 16/17 (TDS, advance tax), W2 Stage 19 (Schedule TR relief amounts), Part B-TI total income (auto-derived from income schedules).

**UI positioning:** Computed values are shown with a banner: "These figures are computed by Fisqo for reference. Verify with a CA or authorised representative before filing." This is a user-facing disclaimer about responsibility — the computation is deterministic and fully implemented.

**Testing:** Unit tests cover known CBDT examples, the 87A rebate cliff at ₹12L, the surcharge marginal relief band, nil advance tax (full 234B), and partial advance tax with one shortfall quarter (234C).

---

## QA

### TDD Approach

Tests written before implementation for every non-trivial component:

- Zod output schemas defined per extraction category first — chains must satisfy them.
- Unit tests for FIFO engine, tax computation, FX look-up written before those modules.
- API contract tests (request/response shape) written before route handler implementations.
- Golden eval set and Zod schema written before each LangGraph chain.

### Test Pyramid

| Layer | Coverage |
|---|---|
| Unit | FIFO engine, tax computation (Part B-TTI), FX look-up, Zod schema validation |
| Integration | API routes + DB (real SQLite), stage dependency graph, rescan logic |
| End-to-end | Stage flows with mocked LLM responses |
| Snapshot | Generated ITR JSON for fixture filings — explicit update required on any output change |

### LLM Evaluation

- Golden test set: 10–20 redacted statement samples with reference extraction output per income category; lives in `evals/fixtures/`.
- Each fixture has `metadata.json` (institution type, AY, categories present, redaction notes) and a corresponding reference output JSON.
- **Primary metric**: field-level extraction accuracy — exact match for amounts/ISINs; fuzzy match for institution names.
- **Secondary metrics**: tokens per extraction, latency, false-positive institution classification rate.
- CI runs with mocked LLM; real-LLM eval is manual/opt-in before any prompt version bump or model upgrade.

---

## Release and Build Automation

- **CI**: GitHub Actions — lint, type-check (`strict: true`), unit tests, integration tests, snapshot tests, LLM eval suite (mocked).
- **Packaging**: `electron-builder` produces platform installers (Mac `.dmg`, Windows `.exe`, Linux `.AppImage`) on each release tag.
- **AY schema versioning**: each AY's ITR JSON schema under `schemas/ay{year}/`; a filing records its AY at creation and always uses the matching schema; UI shows a banner if a newer AY schema ships with an app update.
- **Versioning**: semver; breaking API changes increment major version.
- **Branch strategy**: GitHub Flow — feature branches → main.

---

## Security

- LLM API key stored in plain-text JSON config file at the OS app data directory; users should treat this file as a credential.
- PAN and Aadhaar stored AES-256-GCM encrypted in SQLite.
- File path sanitisation: all user-supplied paths resolved to absolute and checked against allowed roots before any `fs` operation; directory traversal rejected with HTTP 400.
- Electron: `contextIsolation: true`, `nodeIntegration: false`; IPC used for all native OS access.
- Express binds to `127.0.0.1` only; no inbound traffic from the network.

**LLM input guardrails:**
- Explicit acknowledgement gate before the first cloud LLM job on a filing — user confirms that financial documents (PAN, account numbers, transaction data) will be transmitted to the configured endpoint.
- User-supplied custom prompts (W2.1/W3.2) are sandboxed — appended after the system prompt, never replacing it; LLM output still goes through Zod regardless.
- Document size checked before sending; user warned if approaching the provider's context limit.
- Single-worker job queue per session — new LLM job requests are enqueued, not parallelised. The `LlmJob` table tracks queue position; the UI shows "Queued (position N)" for waiting jobs. This prevents rate-limit exhaustion and gives the user clear visibility into pending cost before jobs run.

**LLM output guardrails:**
- Zod schema validation on every response before any application code touches it; failure moves the job to `failed`.
- Post-Zod sanity checks: amounts in plausible ranges, dates within relevant FY/CY, currency codes are valid ISO 4217 — surface as UI warnings, not hard blocks.
- LLM output is never executed as code and never rendered as HTML.
- Raw LLM response stored only in `LlmJob.rawResponse` (failure debugging only); never written to log files or transmitted elsewhere.

---

## Monitoring and Observability

- Structured JSON logs to `~/.fisqo/logs/` (rotated, size-capped).
- Every LangGraph run persists `(promptHash, model, tokensIn, tokensOut, latencyMs, outputValid)` in `LlmJob` — enables per-session cost estimate and extraction replay.
- UI "Extraction log" panel per stage: model used, token count, latency, validation status.

---

## Alternative Designs

| Decision | Chosen | Runner-up | Reason |
|---|---|---|---|
| LLM orchestration | LangGraph | LangChain | Explicit state machine; step-level retries; deterministic chain execution |
| Database | SQLite | PostgreSQL | Zero ops; single-user local app; sufficient data volumes |
| API style | REST | GraphQL | First-party clients; query shapes are known; REST simpler to test and cache |