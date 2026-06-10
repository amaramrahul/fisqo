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
6. Collect advance tax challan details and populate Schedule IT (advance tax and self-assessment tax payments) in the ITR JSON.
7. Guide the user through Schedule FA (foreign asset disclosure) and auto-derive Schedule FSI and Schedule TR from the foreign income data already collected.
8. Extract TDS credit details from Form 16, Form 16A, and Form 26AS documents and populate Schedule TDS1, TDS2, and TCS in the ITR JSON.

### Non-Goals

- Not an authoritative tax-calculation engine; users must verify results before filing.
- Not for HUFs, firms, companies, or trusts.
- No automated download of statements or automated submission to the IT portal in this release.
- Old Tax Regime is not supported in this release; only the New Tax Regime is in scope.
- Automated DTAA rate lookup is not performed in this release; the user must confirm the applicable relief percentage for each country when reviewing Schedule TR.

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

4. **Summary generation.** Produce consolidated summary data across twelve income sub-categories — Domestic Bank Interest, Other Domestic Interest, Foreign Interest, Domestic Dividends, Foreign Dividends, Domestic Capital Gains, Foreign Capital Gains, Property Capital Gains, House Property, Other Domestic Income, Other Foreign Income, Domestic Salary — each line item traceable back to the source statement. The UI presents these grouped **by institution**; the persisted output is a **single ODS file with one sheet per category**.

5. **Multi-year support.** Support filing for multiple financial years. Each financial year is an independent filing, consisting of four coordinated workflows (Personal Information, FY Income & Taxes, Schedule FA, and Summary & Filing), with its own directory, state, and outputs. Re-opening an existing financial year's filing resumes each workflow where it was left off.

6. **Tax regime support.** Only the New Tax Regime is supported in this release. Old Tax Regime is out of scope.

7. **FX conversion.** Apply correct INR conversion for all foreign-currency amounts per applicable rules (SBI TT buying rate on the prescribed date for the transaction type). Every row involving a foreign-currency amount must display the FX rate inline — currency pair, rate value, and the date from which the rate was sourced — so the conversion is fully traceable. The user can override the FX rate on any individual row; an override is visually flagged and persisted.

8. **ITR JSON generation.** Produce a JSON file conforming to the current Income Tax portal schema, populated from the summary data. The JSON must validate against the official schema and be accepted on upload. The portal schema is versioned per assessment year and bundled with the Fisqo release. If the IT department revises the schema mid-season, a Fisqo update is required; the app displays a visible banner when the installed schema version may be outdated. Generation proceeds using the bundled schema; the banner prompts the user to check for a Fisqo update before uploading to the portal.

9. **Assisted filing guidance.** Walk the user through filing on the Indian IT portal step by step — which schedule to open, what to paste or upload, what to verify — via the web UI, with the user performing each action on the portal themselves.

10. **Local web application.** Fisqo runs on the user's machine as a local web app, serving a browser UI on localhost.

11. **Data locality.** Source statements stay on the user's machine, except when sent to a user-configured cloud LLM for parsing. When the user first configures a cloud provider (W1 Stage 1), Fisqo displays an explicit acknowledgement: the user confirms they understand that document contents — including financial statements that may contain PAN, account numbers, transaction details, and other personal data — will be transmitted to the configured API endpoint, and that they have reviewed and accept the cloud provider's data-processing terms. This acknowledgement is recorded and shown as accepted on subsequent visits. Users who want to keep all data local should configure a local model (Ollama, llama.cpp).

12. **Persisted settings scope.** Only LLM configuration is persisted as a global setting. PAN is scoped to a **tax user** (a single Fisqo installation can hold multiple tax users). All other settings (name, address, statements directory, etc.) are scoped to an individual filing.

13. **Stage idempotency.** Each stage within a workflow, once completed, is not re-executed on revisit. Re-execution requires an explicit user-initiated rescan, which warns the user that downstream stages within the same workflow will be reset. "Downstream" is defined by data dependency, not stage number — the UI lists exactly which stages will be reset before the user confirms. Rescan dependencies are scoped within a workflow.

14. **Transparency of computations.** Every computed number must be inspectable — the user can see the inputs, the FX rate, and the formula used.

15. **User correction and override.** The user can edit, add, or remove parsed line items and institutions before JSON generation. Changes are visually indicated (added / removed / modified) and persisted when the user advances to the next stage.

16. **Reproducibility.** Running Fisqo twice on the same directory produces the same outputs (modulo LLM nondeterminism, which must be bounded — e.g., by caching parsed results).

17. **Extensibility.** Adding support for a new statement format or institution should not require changes to core logic; it should be a matter of adding a prompt, example, or lightweight adapter.

18. **TDS document parsing.** Recognise Form 16, Form 16A, Form 16B, and Form 26AS / AIS as distinct TDS document types. Parse them for TDS/TCS deduction details (deductor name, TAN, section, amount deducted, amount deposited, assessment year). These feed Schedule TDS1 (salary TDS), Schedule TDS2 (non-salary TDS), and Schedule TCS in the ITR JSON.

19. **Advance tax and self-assessment tax entry.** Provide a dedicated data-entry section for advance tax and self-assessment tax challans, pre-populated from Form 26AS where available. These feed Schedule IT in the ITR JSON.

20. **Row-level notes.** Every data row in every data-entry stage supports an optional free-text **Note** field. Notes are persisted alongside the row and exported into the ODS file as a dedicated Notes column on each sheet. Notes do not affect computed values and are never sent to the LLM.

21. **Schedule FA data collection.** Schedule FA (foreign asset disclosure) is handled in a dedicated separate workflow — **Workflow 3 (Schedule FA)** — with its own documents directory covering the Calendar Year (1 January – 31 December of the year preceding the assessment year). This is architecturally separate from Workflow 2, which covers the Financial Year (April – March). The two time periods overlap but are not identical: an asset may be held during the CY but disposed of before the FY begins, or acquired after the CY ends; the FA workflow makes no assumptions about the FY workflow's asset universe.

22. **Schedule FSI derivation.** Auto-derive Schedule FSI (foreign-source income) from all foreign-institution income rows collected in Workflow 2, grouped by country. These feed the ITR JSON.

23. **Schedule TR derivation.** Auto-derive Schedule TR (tax relief) from Schedule FSI rows. Final entries feed the ITR JSON.

24. **Capital gains dual-mode computation.** For each institution with Capital Gains, support two source modes: **CG summary** (broker's pre-computed gains report) or **transaction history** (raw buy/sell logs; Fisqo computes gains). In CG-summary mode, the LLM extracts the broker's pre-computed figures. In transaction-history mode, the LLM extracts individual trades and Fisqo computes gains using FIFO, classifies STCG vs LTCG by holding period, and applies applicable rules (Section 111A/112A for domestic listed equities; grandfathering via FMV as on 31 January 2018 for LTCG on pre-2018 domestic listed equities; no indexation for foreign equities).

## TDS and Tax Credits

Tax Deducted at Source (TDS) and Tax Collected at Source (TCS) are withholding taxes that reduce the taxpayer's net liability. They are the most common source of pre-paid tax for salaried individuals and for those with interest or dividend income from Indian institutions. Correctly capturing all TDS/TCS entries is critical: any shortfall in the ITR relative to Form 26AS triggers a demand notice.

### Source Documents

| Document | Issued by | Covers |
|---|---|---|
| Form 16 Part A | Employer | Salary TDS — quarter-wise details, TAN, deposits |
| Form 16 Part B | Employer | Salary breakdown, deductions, net taxable salary |
| Form 16A | Any deductor other than an employer | TDS on interest, rent, professional fees, contract payments, etc. |
| Form 16B | Property buyer | TDS deducted on immovable property purchase (Section 194IA) |
| Form 26AS | Income Tax Department | Consolidated annual statement — all TDS, TCS, advance tax, self-assessment tax, and refunds linked to the PAN |
| AIS / TIS | Income Tax Department | Annual Information Statement — extends Form 26AS with SFT data, dividends, securities transactions, and more |

Fisqo treats Form 26AS as the **authoritative source for TDS credit amounts** (the portal validates credits against Form 26AS). AIS / TIS is supplementary — used to surface TDS or income entries not yet appearing in Form 26AS, and as the primary source for dividend, securities-transaction, and SFT data not covered by Form 26AS. When the two documents differ on TDS deposit amounts, Form 26AS takes precedence; the discrepancy is flagged for the user to review. Where Form 16 / 16A / 16B are also uploaded, Fisqo extracts them and cross-checks against Form 26AS; any discrepancy is flagged for the user to resolve before proceeding.

### TDS Categories and ITR Mapping

| Category | Typical sections | ITR schedule |
|---|---|---|
| Salary TDS | 192 | Schedule TDS1 |
| Non-salary TDS (interest, rent, professional fees, etc.) | 194A, 194I, 194J, 194C, others | Schedule TDS2 |
| Tax Collected at Source | 206C series | Schedule TCS |

## Design And User Experience

See [fisqo-ux-design.md](fisqo-ux-design.md) for the full workflow and UI specification.

## Dependencies

- **LLM provider.** A user-configured large language model for document classification and parsing. Either a cloud provider (OpenAI, Anthropic, Google) accessed via API, or a locally-run model (Ollama, llama.cpp). Fisqo's quality is bounded by the underlying model's accuracy on financial documents.
- **SBI TT buying rate reference data.** Historical exchange rates published by the State Bank of India, required for FX conversion of foreign-currency transactions.
