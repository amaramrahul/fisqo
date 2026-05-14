# Fisqo — Product Requirements Document

## Overview

Fisqo is an open-source tool that helps resident individuals in India prepare and file their income tax returns using AI agents and workflows. Its differentiator is first-class support for foreign income and foreign capital gains, an area poorly served by existing tools.

Fisqo is not an authoritative source for tax calculations. All computations are produced for the user's convenience; the user is responsible for verifying their correctness, ideally against a secondary source or a qualified tax professional, before filing.

## Background And Context

**The problem.** Filing income tax returns in India is non-trivial for any individual with income beyond a single salary, and it becomes substantially harder when foreign income is involved. A resident individual with a brokerage account abroad, RSUs from a foreign employer, dividends from US-listed stocks, or interest from a foreign bank must:

- Reconcile statements across multiple institutions, each with its own format and currency.
- Apply the correct FX conversion rules (SBI TT buying rate on specified dates) for each transaction type.
- Compute capital gains under Indian rules, which differ from the source country's reporting (e.g., FIFO, indexation where applicable, separate treatment of listed vs unlisted foreign securities).
- Report foreign assets and income in Schedule FA, Schedule FSI, and claim DTAA relief via Schedule TR — sections that are easy to get wrong and carry steep penalties under the Black Money Act for omissions.
- Translate all of this into the rigid JSON schema accepted by the IT portal.

**Existing tools fall short.** Indian tax-filing platforms (ClearTax, Quicko, TaxBuddy, and the official IT portal utility) handle domestic income well but offer limited or no automation for foreign brokerage statements, foreign dividends, or Schedule FA. Users with foreign income typically fall back to spreadsheets, paid CAs, or both — expensive, slow, and error-prone.

**Why now.** The number of Indian residents holding foreign equities has grown sharply with the rise of platforms like Vested, IndMoney, and INDmoney, and with RSU-heavy compensation at multinationals. At the same time, AI document parsing has become reliable enough to handle the long tail of non-standard statement formats without per-source engineering.

## Goals And Non-Goals

### Goals

1. Help resident individuals with foreign income prepare an accurate ITR with materially less effort than manual or spreadsheet workflows.
2. Parse heterogeneous Indian and foreign bank and brokerage statements into a normalized internal representation.
3. Produce summary artifacts for dividends, capital gains, bank interest, and rent, each traceable to source line items.
4. Generate an ITR JSON accepted by the Indian Income Tax portal.
5. Guide the user through assisted filing on the portal.

### Non-Goals

- Not an authoritative tax-calculation engine; users must verify results before filing.
- Not for HUFs, firms, companies, or trusts.
- No automated download of statements or automated submission to the IT portal in this release.
- Old Tax Regime is not supported in this release; only the New Tax Regime is in scope.

## Success Metrics

### Quantitative

- **Successful filings completed.** Number of users who, in a tax year, used Fisqo end-to-end and submitted their ITR on the portal.
- **Time to prepare a return.** Median wall-clock time from pointing Fisqo at a statements directory to having a portal-ready JSON, compared to the user's prior workflow (self-reported baseline).
- **Parsing accuracy on foreign statements.** Percentage of line items extracted correctly from a held-out set of real-world brokerage and bank statements, measured against human-labeled ground truth.
- **User-reported correction rate.** Average number of edits the user makes to Fisqo's computed summaries before accepting them — a proxy for how much the user trusts the output.

### Qualitative

- User feedback themes from GitHub issues, a post-filing survey, and community channels — particularly around trust, foreign-income coverage, and friction points in the assisted-filing flow.

## Target Audience

Fisqo is built for resident individual taxpayers in India whose returns are complex enough that simple tools fall short — primarily those with foreign income (RSUs, foreign brokerage holdings, foreign bank interest) and those with diverse domestic holdings (capital gains across multiple brokers, rental income, interest across multiple banks).

## Requirements

1. **Statements directory ingestion.** For each filing, accept a user-specified local directory containing bank and brokerage statements in mixed formats (PDF, CSV, possibly XLS). Recursively discover files; no assumption of naming convention or per-institution subfolders.

2. **AI-driven statement parsing.** Parse statements from Indian and foreign banks and brokerages into a normalized internal representation, without per-institution hand-coded parsers. Parsing must handle the long tail of formats encountered in practice.

3. **Document classification.** Identify each input file by institution and document type so it can be routed to the right parsing logic.

4. **Summary generation.** Produce consolidated summary data across six income categories — Dividends, Capital Gains, Bank Interest, Rent, Fixed Deposits, Other Income — each line item traceable back to the source statement. The UI presents these grouped **by institution**; the persisted output is a **single ODS file with one sheet per category**.

5. **Multi-year support.** Support filing for multiple financial years. Each financial year is an independent filing workflow with its own directory, state, and outputs. Re-opening an existing financial year's filing resumes it where the user left off.

6. **Tax regime support.** Only the New Tax Regime is supported in this release. Old Tax Regime is out of scope.

7. **FX conversion.** Apply correct INR conversion for all foreign-currency amounts per applicable rules (SBI TT buying rate on the prescribed date for the transaction type). Conversion rates used must be visible in the output.

8. **ITR JSON generation.** Produce a JSON file conforming to the current Income Tax portal schema, populated from the summary data. The JSON must validate against the official schema and be accepted on upload.

9. **Assisted filing guidance.** Walk the user through filing on the Indian IT portal step by step — which schedule to open, what to paste or upload, what to verify — via the web UI, with the user performing each action on the portal themselves.

10. **Local web application.** Fisqo runs on the user's machine as a local web app, serving a browser UI on localhost.

11. **Data locality.** Source statements stay on the user's machine, except when sent to a user-configured cloud LLM for parsing.

12. **Persisted settings scope.** Only LLM configuration is persisted as a global setting. PAN is scoped to a **tax user** (a single Fisqo installation can hold multiple tax users). All other settings (name, address, statements directory, etc.) are scoped to an individual filing.

13. **Stage idempotency.** Each filing stage, once completed, is not re-executed on revisit. Re-execution requires an explicit user-initiated rescan, which warns the user that downstream stages will be reset.

14. **Transparency of computations.** Every computed number must be inspectable — the user can see the inputs, the FX rate, and the formula used.

15. **User correction and override.** The user can edit, add, or remove parsed line items and institutions before JSON generation. Changes are visually indicated (added / removed / modified) and persisted when the user advances to the next stage.

16. **Reproducibility.** Running Fisqo twice on the same directory produces the same outputs (modulo LLM nondeterminism, which must be bounded — e.g., by caching parsed results).

17. **Extensibility.** Adding support for a new statement format or institution should not require changes to core logic; it should be a matter of adding a prompt, example, or lightweight adapter.

## Design And User Experience

### Workflows

**Workflow 0: First-time application setup (one-time).** User launches Fisqo, browser opens to localhost UI, user enters LLM configuration (local model or cloud provider with API key). This is the only globally-persisted setting.

**Workflow 1: Filing for a financial year.** From the dashboard, the user selects a tax user (or adds a new one with **Add new tax user**) and then either resumes an existing filing for a financial year or starts a new one. A filing has five sequential stages. Each stage is idempotent: revisiting it shows the prior state without re-running. Re-running requires an explicit **Rescan** action, which warns that downstream stages will be reset.

**Stage 1 — Basic settings.** User enters the name of the person filing, the address, and the path to the statements directory for this filing. The financial year and PAN are inherited from the tax user and the filing selection. Stored as filing-scoped state.

**Stage 2 — Document discovery and categorization.** Fisqo sends all discovered documents to the LLM, which classifies them by institution. The UI presents documents grouped under institutions, with controls to:

- Create a new institution.
- Move documents between institutions.
- Exclude specific files or folders.
- Submit a custom prompt to the LLM (e.g., to refine classification logic).

The user clicks **Next** to persist custom prompts and manual changes, then advance. The classification is not re-run on revisit unless the user clicks **Rescan**, which warns about downstream resets.

**Stage 3 — Per-category review (grouped by institution).** Fisqo extracts the six categories — Dividends, Capital Gains, Bank Interest, Rent, FDs, Other Income — from the classified documents and presents each as a separate section, with rows grouped by institution. For each category section, the user can:

- Submit a custom prompt and trigger a rescan of statements for that category.
- Add, modify, or remove rows.
- Add or remove institution-level entries.

Added, removed, and modified entries are visually distinct. The user clicks **Next** to persist changes and advance. Like Stage 2, content is preserved on revisit unless the user explicitly rescans.

**Stage 4 — ODS and JSON generation.** Fisqo produces:

- A single ODS file with one sheet per category — Dividends, Capital Gains, Bank Interest, Rent, FDs, Other Income — grouped by category (the institution grouping is collapsed at this point; the exact column structure of the sheets is deferred to the technical design document).
- The ITR JSON document, validated against the portal schema.

The user can regenerate these files at this stage.

**Stage 5 — Manual filing.** Fisqo provides instructions for the user to:

1. Open the generated JSON in the official Indian IT Department application (or edit it manually) to make any adjustments the portal requires.
2. Follow a step-by-step checklist to upload the JSON, verify each schedule on the portal, and complete the submission and e-verification.

### UI Surfaces

- **Setup / Settings page** — LLM configuration (the only globally-persisted setting).
- **Dashboard** — filings grouped by tax user (PAN). Each tax user section lists the financial years for which a filing has been initiated, with progress per stage, plus a control to start a filing for a new financial year. An **Add new tax user** button at the top of the dashboard prompts for a PAN and creates a new tax user section.
- **Stage 1 page** — basic settings form (name, address, statements directory). Financial year and PAN are displayed read-only.
- **Stage 2 page** — file explorer grouped by institution, with reclassify / exclude / custom-prompt controls.
- **Stage 3 pages** — one per category (Dividends, Capital Gains, Bank Interest, Rent, FDs, Other Income), each with institution-grouped rows, custom-prompt and rescan controls, and edit/add/remove with visual change indicators.
- **Stage 4 page** — ODS and JSON generation status, downloads, and regenerate control.
- **Stage 5 page** — guided manual-filing checklist.

## Dependencies

- **LLM provider.** A user-configured large language model for document classification and parsing. Either a cloud provider (OpenAI, Anthropic, Google) accessed via API, or a locally-run model (Ollama, llama.cpp). Fisqo's quality is bounded by the underlying model's accuracy on financial documents.
- **SBI TT buying rate reference data.** Historical exchange rates published by the State Bank of India, required for FX conversion of foreign-currency transactions.
