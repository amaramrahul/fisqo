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

8. **ITR JSON generation.** Produce a JSON file conforming to the current Income Tax portal schema, populated from the summary data. The JSON must validate against the official schema and be accepted on upload.

9. **Assisted filing guidance.** Walk the user through filing on the Indian IT portal step by step — which schedule to open, what to paste or upload, what to verify — via the web UI, with the user performing each action on the portal themselves.

10. **Local web application.** Fisqo runs on the user's machine as a local web app, serving a browser UI on localhost.

11. **Data locality.** Source statements stay on the user's machine, except when sent to a user-configured cloud LLM for parsing.

12. **Persisted settings scope.** Only LLM configuration is persisted as a global setting. PAN is scoped to a **tax user** (a single Fisqo installation can hold multiple tax users). All other settings (name, address, statements directory, etc.) are scoped to an individual filing.

13. **Stage idempotency.** Each stage within a workflow, once completed, is not re-executed on revisit. Re-execution requires an explicit user-initiated rescan, which warns the user that downstream stages within the same workflow will be reset. Rescan dependencies are scoped within a workflow; a rescan in W2 does not affect W3. W4 generation (W4 Stage 3) is always re-runnable and reads the current completed state of W1, W2, and W3 at the time of execution.

14. **Transparency of computations.** Every computed number must be inspectable — the user can see the inputs, the FX rate, and the formula used.

15. **User correction and override.** The user can edit, add, or remove parsed line items and institutions before JSON generation. Changes are visually indicated (added / removed / modified) and persisted when the user advances to the next stage.

16. **Reproducibility.** Running Fisqo twice on the same directory produces the same outputs (modulo LLM nondeterminism, which must be bounded — e.g., by caching parsed results).

17. **Extensibility.** Adding support for a new statement format or institution should not require changes to core logic; it should be a matter of adding a prompt, example, or lightweight adapter.

18. **TDS document parsing.** Recognise Form 16, Form 16A, Form 16B, and Form 26AS / AIS as document types in W2 Stage 1 (Document Discovery and Categorisation). Parse them for TDS/TCS deduction details (deductor name, TAN, section, amount deducted, amount deposited, assessment year). These feed Schedule TDS1 (salary TDS), Schedule TDS2 (non-salary TDS), and Schedule TCS in the ITR JSON.

19. **Advance tax and self-assessment tax entry.** Provide a dedicated data-entry section for advance tax and self-assessment tax challans. Each entry captures: BSR code, challan serial number, date of deposit, amount, bank name, and payment type (advance tax / self-assessment tax / regular assessment tax). Where Form 26AS is available, pre-populate from it; otherwise the user enters manually. These feed Schedule IT in the ITR JSON.

20. **Row-level notes.** Every data row in every data-entry stage — W2 Stages 2–20, and W3 Stages 3–14 — supports an optional free-text **Note** field. Notes are persisted alongside the row, exported into the ODS file as a dedicated Notes column on each sheet, and are visible during the W4 Stage 4 filing checklist. Notes do not affect computed values and are never sent to the LLM.

21. **Schedule FA data collection.** Schedule FA (foreign asset disclosure) is handled in a dedicated separate workflow — **Workflow 3 (Schedule FA)** — with its own documents directory covering the Calendar Year (1 January – 31 December of the year preceding the assessment year). This is architecturally separate from Workflow 2, which covers the Financial Year (April – March). The two time periods overlap but are not identical: an asset may be held during the CY but disposed of before the FY begins, or acquired after the CY ends; the FA workflow makes no assumptions about the FY workflow's asset universe.

Workflow 3 accepts its own set of statements (full-year CY statements from foreign banks and brokerages) and runs its own 15-stage pipeline: document discovery and categorisation, CY income extraction (foreign interest, dividends, capital gains, other income), and Schedule FA sub-table entry stages for all parts required by the ITR-2/ITR-3 schema (Parts A–G: foreign bank accounts, financial interests in foreign entities, immovable property, other capital assets, signing authority accounts, trusts, and other interests). The LLM pre-fills FA sub-table entries from the CY income data extracted in W3 Stages 3–6; the user reviews and completes remaining fields.

**The UI must make the CY vs FY distinction explicit throughout Workflow 3.** All W3 stage pages carry a persistent "Schedule FA — Calendar Year CY20XX, 1 January – 31 December" banner. FX conversion for peak and closing balances uses the 31 December rate, confirmed in W3 Stage 1, distinct from the 31 March rate used in Workflow 2. Each FA sub-table stage has an explicit Reviewed confirmation gate before the workflow can be locked, given the steep Black Money Act penalties for omissions.

Workflow 3 results are consumed by Workflow 4 (W4 Stage 3) for ODS and ITR JSON generation. If W3 is not locked when W4 generates the ITR JSON, Schedule FA entries are omitted and a notice is recorded.

22. **Schedule FSI derivation.** Auto-derive Schedule FSI (foreign-source income) from the foreign-institution income rows collected in W2 Stages 5 (Foreign Interest), 7 (Foreign Dividends), 9 (Foreign Capital Gains), and 14 (Other Foreign Income). Group by country. For each country × income-head combination, show: income in foreign currency, INR equivalent (from the FX rate already computed), and tax paid in the source country (user-entered or extracted from statements). The user reviews and corrects before JSON generation.

23. **Schedule TR derivation.** Auto-derive Schedule TR (tax relief) from Schedule FSI rows. For each FSI row where foreign tax was paid, propose a relief claim under Section 90 (DTAA country) or Section 91 (non-DTAA country). The applicable relief amount and rate are shown for user confirmation; the user may override. Final Schedule TR entries feed the ITR JSON.

24. **Capital gains dual-mode computation.** For each institution with Capital Gains selected in W2 Stage 1 (or W3 Stage 2 for FA), the user specifies whether the institution's documents contain a **CG summary** (a pre-computed gains report from the broker) or a **transaction history** (raw buy/sell logs). In CG-summary mode, the LLM extracts the broker's pre-computed figures directly. In transaction-history mode, the LLM extracts each individual trade and Fisqo computes gains using FIFO matching, determines the holding period to classify STCG vs LTCG, and applies applicable rules (Section 111A/112A for domestic listed equities; grandfathering via FMV as on 31 January 2018 for LTCG on domestic listed equities acquired before that date; no indexation for foreign equities). In transaction-history mode, each gain row in the review table is expandable to show the full FIFO breakdown — the matched buy lot(s), acquisition cost, holding period, and the computed gain. The source mode is set once per institution in the relevant document discovery stage and applies to all rows from that institution; it cannot be changed at the row level. The row-level source indicator ("CG Statement" or "Computed from transactions") reflects the institution's chosen mode.

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

Fisqo treats Form 26AS / AIS as the **authoritative source** for TDS data. Where Form 16 / 16A / 16B are also uploaded, Fisqo extracts them and cross-checks against Form 26AS; any discrepancy is flagged for the user to resolve before proceeding.

### TDS Categories and ITR Mapping

| Category | Typical sections | ITR schedule |
|---|---|---|
| Salary TDS | 192 | Schedule TDS1 |
| Non-salary TDS (interest, rent, professional fees, etc.) | 194A, 194I, 194J, 194C, others | Schedule TDS2 |
| Tax Collected at Source | 206C series | Schedule TCS |

### Data Sources and Fields Captured

TDS data is drawn from three sources and matched 1-to-1 by TAN + section code + approximate amount in W2 Stage 16:

1. **Bank and brokerage statements** (already parsed for income in W2 Stages 2–14) — carry per-transaction TDS amounts for FD interest, professional fees, equity redemption proceeds, and other income.
2. **Capital gains statements** — broker-issued statements that may include TDS on equity or MF redemptions.
3. **Form 26AS / AIS** — the authoritative government record of what each deductor deposited. This is what the portal validates against.

Per matched entry: deductor name, TAN, section code, Head of Income (Salary / HP / CG / OS), statement gross income and TDS deducted, Form 26AS TDS deposited, match status, and TDS credit claimed.

### Reconciliation

For each matched pair, Fisqo shows both the statement amount and the Form 26AS amount. When they differ, a match-status indicator (⚠ Discrepancy) appears and the user picks which to prefer — "Use statement amount" or "Use Form 26AS amount" (default). For entries present in only one source, a status of ○ Statement only (deductor may not have deposited yet) or ○ Form 26AS only (statement not uploaded) is shown. The TDS credit claimed defaults to the preferred amount but remains editable. All rows editable; edited rows highlighted in amber.

For TDS3 (property TDS from Form 16B / 16C): additionally captures PAN and Aadhaar of the buyer/tenant who deducted TDS.

### Advance Tax and Self-Assessment Tax

Advance tax (paid quarterly by 15 June, 15 September, 15 December, 15 March) and self-assessment tax (paid at filing time) are captured in W2 Stage 17. Per challan: BSR Code, Date of Deposit, Serial Number of Challan, Amount (₹). Pre-populated from Form 26AS where available. These feed Schedule IT in the ITR JSON.

## Design And User Experience

### Workflows

A filing for a financial year consists of four coordinated workflows. Each workflow has its own stage list, its own completion status, and can be worked on independently once Workflow 1 (Personal Information) is complete. Each stage within a workflow is idempotent: revisiting shows the prior state without re-running. Re-execution requires an explicit **Rescan** action, which resets only that stage and downstream stages within the same workflow. Stages that are not applicable can be marked **Skipped**, which records a conscious bypass without blocking downstream stages. Per-stage status is: Not started / In progress / Complete / Skipped.

---

### Workflow 1 — Personal Information

Covers identity, LLM configuration, and filing-scope settings. Must be complete before Workflows 2 or 3 can be started.

**W1 Stage 1 — LLM Configuration.** User enters LLM configuration (local model or cloud provider with API key). This is the only globally-persisted setting, shared across all filings. Shown as pre-complete on subsequent filings if already configured.

**W1 Stage 2 — Tax User.** User selects an existing tax user or adds a new one. Fields stored per tax user: PAN, Date of Birth, Aadhaar Number (stored encrypted; last 4 digits shown in UI).

**W1 Stage 3 — Filing Details.** User enters filing-scoped information: First Name, Middle Name (optional), Last Name; structured primary address (Flat/Door/Block No, Premises/Building, Road/Street, Area/Locality, Town/City/District, State, Country, PIN Code); contact details (Primary Email *, Primary Mobile with country code *, Phone with STD/ISD code, Secondary Email, Secondary Mobile); Financial Year; path to the FY statements directory. PAN is inherited from the tax user.

**W1 Stage 4 — Filing Status.** User confirms: Residential Status (Resident / Non-Resident / RNOR; default Resident); Residential Status Condition (conditional dropdown for Resident — e.g. "182 days or more during the previous year"; default that condition); Filing section — 139(1) Return filed on or before due date / 139(4) Belated / 139(5) Revised / Other (radio; default 139(1)); Director in a company at any time during the FY? (Yes/No; default No); Held unlisted equity shares at any time during the FY? (Yes/No; default No). Fisqo supports only the New Tax Regime; this is shown as a read-only notice, not a user choice.

**W1 Stage 5 — Bank Details.** User lists all Indian bank accounts held during the FY (excluding dormant accounts). For each account: IFS Code *, Name of the Bank *, Account Number *, Type of Account (Savings / Current / Cash Credit / OD / Others). Exactly one account must be toggled as Nominated for Refund. Accounts can be added and removed. Note: account validation happens on the IT portal; Fisqo collects the details for population into Part A.

---

### Workflow 2 — FY Income & Taxes

Covers all Financial Year (April–March) income and all taxes paid — TDS deducted at source, advance tax and self-assessment tax challans, and foreign taxes paid in source countries. Also derives Schedule FSI and Schedule TR from the FY foreign income data. TDS entries feed Schedule TDS1/TDS2/TCS; advance tax challans feed Schedule IT; foreign taxes paid (entered per country in Schedule FSI) feed Schedule TR. All three are needed before the ITR JSON can be generated in Workflow 4.

**W2 Stage 1 — Document Discovery and Categorisation.** Fisqo sends all discovered documents in the FY statements directory to the LLM, which classifies them by institution. The UI presents documents grouped under institutions, with controls to:

- Create a new institution.
- Move documents between institutions.
- Exclude specific files or folders.
- **Select income categories.** For each institution, a multi-select control lists the income sub-categories plus Salary and TDS / Tax Credits: Domestic Salary, Domestic Bank Interest, Other Domestic Interest, Foreign Interest, Domestic Dividends, Foreign Dividends, Domestic Capital Gains, Foreign Capital Gains, House Property, Other Domestic Income, Other Foreign Income, TDS / Tax Credits. The LLM pre-populates a suggested selection based on the institution type — for example, an employer with a Form 16 is pre-selected for Domestic Salary and TDS / Tax Credits; an Indian savings bank is pre-selected for Domestic Bank Interest; an Indian bank with FDs also gets Other Domestic Interest; an Indian brokerage or MF gets Domestic Dividends and Domestic Capital Gains; a foreign bank gets Foreign Interest; a foreign brokerage gets Foreign Interest, Foreign Dividends, and Foreign Capital Gains. The user can change the selection. Only categories checked for an institution are extracted from its documents in the corresponding income stages.
- **Capital Gains source type.** For each institution that has Domestic Capital Gains or Foreign Capital Gains selected, a secondary control appears: **CG Summary** (the institution provides a pre-computed gains report) or **Transaction History** (raw buy/sell logs; Fisqo computes gains). The LLM suggests the most likely type based on the document. This sets the extraction mode for W2 Stages 8 and 9 for that institution.
- Submit a custom prompt to the LLM (e.g., to refine classification logic).

Form 16, Form 16A, Form 16B, and Form 26AS / AIS are recognised as distinct document types. The LLM classifier groups them under a **Tax Documents** pseudo-institution created automatically when such documents are found; its pre-selected category is TDS / Tax Credits.

W2 Stages 18–20 (Schedule FSI, Schedule TR, and Total Assets) are not driven by W2 Stage 1 category selection; they always appear and are individually user-skippable.

The user clicks **Next** to persist changes and advance. The classification is not re-run on revisit unless the user clicks **Rescan**, which warns about downstream resets.

**Common structure for LLM-extracted income stages (W2 Stages 2–9, 13–14).** Each income stage covers one sub-category. Only institutions with that sub-category selected in W2 Stage 1 appear; rows are grouped by institution. For each institution, the user can:

- Submit a custom LLM prompt and trigger a rescan (resets only this stage; warns if downstream stages — FSI, TR — derive from it).
- Add, modify, or remove rows manually.
- Add an optional free-text **Note** to any row (persisted, exported to ODS, never sent to the LLM).

Added, removed, and modified entries are visually distinct. The user clicks **Next** to persist changes and advance.

**W2 Stage 2 — Domestic Salary.** Salary income extracted from Form 16 Part B, grouped by employer. Stage is skippable for users with no Indian employer. For each employer, the LLM extracts: Employer Name, TAN, Nature of employer, Address; salary components under Section 17(1) (Basic, DA, HRA, LTA, Conveyance, Gratuity, Leave Encashment, Fees/Commission, Others) with amounts; perquisites under Section 17(2) (Accommodation, Cars, ESOP, Other benefits, etc.) with amounts; profit in lieu of salary under Section 17(3) if applicable; exempt allowances under Section 10 (HRA, LTA, etc.) with amounts; Employer's contribution to NPS u/s 80CCD(2) (extracted from Form 16 Part B; auto-populates Schedule VI-A in the ITR JSON); Standard Deduction (₹75,000 for FY 2025-26, auto-applied); net taxable salary (auto-calculated and shown). The user can add, edit, or remove rows per component. ITR line: Schedule S.

**W2 Stage 3 — Domestic Bank Interest.** Savings and current account interest from Indian banks. Each row: institution, account type, interest amount (INR). Also includes interest on Income Tax refunds (sourced from AIS; maps to portal OS 1(b)(iii)). ITR line: Schedule OS 1(b)(i) for savings bank, 1(b)(ii) for deposits, 1(b)(iii) for IT refund interest.

**W2 Stage 4 — Other Domestic Interest.** FD interest, RD interest, bond coupons, NSC accrual, post-office interest, interest on loans given, and other domestic fixed-income. Also includes tax-exempt interest: PPF interest, EPF interest (to the extent taxable portions are excluded), and SSY interest (Sukanya Samriddhi Yojana — minor child's account). Each row: institution, instrument type, amount (INR), and whether the interest is taxable or exempt. Taxable rows map to Schedule OS 1(b)(ix); exempt rows (PPF, EPF, SSY) map to Schedule EI Field 1 in the ITR JSON.

**W2 Stage 5 — Foreign Interest.** Interest from foreign bank accounts, foreign bonds, and other foreign fixed-income instruments. Each row: institution, country, currency, amount in foreign currency, FX rate (SBI TT buying rate and applicable date), INR equivalent. The FX rate is user-editable; an override is visually flagged. ITR line: Schedule OS. Feeds W2 Stage 18 (Schedule FSI).

**W2 Stage 6 — Domestic Dividends.** Dividends from Indian listed equities and mutual funds. Each row: company/fund name, ISIN, dividend amount (INR), dividend date. ITR line: Schedule OS.

**W2 Stage 7 — Foreign Dividends.** Dividends from foreign equities and ADRs/GDRs. Each row: company name, country, currency, dividend date, amount in foreign currency, FX rate (SBI TT buying rate and applicable date), INR equivalent. The FX rate is user-editable; an override is visually flagged. ITR line: Schedule OS. Feeds W2 Stage 18 (Schedule FSI).

**W2 Stage 8 — Domestic Capital Gains.** Capital gains from Indian listed equities (STCG 111A / LTCG 112A), equity mutual funds, listed bonds/debentures (Section 112), and other domestic securities. Immovable property is handled separately in W2 Stage 10. ITR line: Schedule CG and Schedule 112A.

The stage operates in the mode selected per institution in W2 Stage 1:

*CG Summary mode* — the LLM extracts the broker's pre-computed figures. Each row: institution, asset name/ISIN, acquisition date, acquisition cost (INR), sale date, sale proceeds (INR), gain type (STCG/LTCG), gain section (111A / 112A / 112 / Other), gain amount (INR). Source indicator: "CG Statement."

*Transaction History mode* — the LLM extracts individual trades; Fisqo computes gains using FIFO. For LTCG on listed equities acquired before 31 January 2018, the cost is capped at the FMV on that date (grandfathering). Each row shows the same fields as CG Summary mode, with an expandable section revealing the FIFO lot matching: matched buy lot(s), original acquisition date and cost, holding period, grandfathering adjustment if applicable, and the computed gain step by step. Source indicator: "Computed from transactions."

For LTCG 112A rows, Fisqo also generates a Schedule 112A–compatible CSV output (one row per ISIN: ISIN code, name, acquisition date flag, number of units, sale price per unit, cost of acquisition, FMV as on 31 January 2018 where applicable, transfer expenses). This CSV is available for download and for upload to the portal's Schedule 112A. For STCG 111A entries, a Section 94(7)/94(8) loss disallowance field is exposed for CG-summary mode.

The source mode is fixed per institution (set in W2 Stage 1) and applies to all rows for that institution. The user can add/edit/remove rows within the mode.

**W2 Stage 9 — Foreign Capital Gains.** Capital gains from foreign equities and other foreign assets. ITR line: Schedule CG (A5 for STCG, B8 for LTCG). Feeds W2 Stage 18 (Schedule FSI).

The stage operates in the mode selected per institution in W2 Stage 1:

*CG Summary mode* — the LLM extracts the broker's pre-computed figures. Each row: institution, asset name, country, acquisition date, acquisition cost in foreign currency, acquisition FX rate (SBI TT buying rate and applicable date), acquisition cost in INR, sale date, sale proceeds in foreign currency, sale FX rate (SBI TT buying rate and applicable date), sale proceeds in INR, gain type (STCG/LTCG), computed gain in INR. Source indicator: "CG Statement."

*Transaction History mode* — the LLM extracts individual trades; Fisqo computes gains using FIFO. FX conversion is applied separately at acquisition date and sale date. Each row shows the same fields as CG Summary mode, with an expandable section showing the FIFO lot matching and FX computation detail. Source indicator: "Computed from transactions."

Both FX rates (acquisition and sale) are user-editable per row; an override is visually flagged. The source mode is fixed per institution (set in W2 Stage 1) and applies to all rows for that institution. The user can add/edit/remove rows within the mode.

**W2 Stage 10 — Property Capital Gains.** Capital gains from the sale of immovable property (land and/or building). Fully manual — no LLM extraction. Stage is skippable for users who did not sell any property during the FY. Per property sold (Add Another for multiple):

- Date of acquisition; Date of sale/transfer
- Full value of consideration received/receivable (₹)
- Value of property as per stamp duty authority / Section 50C (₹) — if different; the higher of the two is used
- Cost of acquisition (₹) *; Cost of improvement (₹); Transfer expenditure (₹)
- Gain type (STCG / LTCG) — auto-determined from holding period (< 24 months = STCG), shown for confirmation
- Section 54 / 54B deduction amount (₹) — linked to entries in W2 Stage 11
- Optional Note field

ITR line: Schedule CG (A1 for STCG, B1 for LTCG).

**W2 Stage 11 — Capital Gains Deductions (Section D).** Reinvestment deductions claimed against capital gains under Sections 54, 54B, 54EC, and 54F. Fully manual. Stage is skippable for users with no reinvestment deductions. Per reinvestment entry (Add Another):

- Deduction type * (54 — new residential house from residential property / 54B — agricultural land / 54EC — specified bonds / 54F — new residential house from any non-residential asset)
- Date of transfer of original asset *
- Reinvestment details (vary by type):
  - 54 / 54F: Cost of new residential house (₹), Date of purchase or construction
  - 54EC: Bond name/description, Amount invested (₹), Date of investment
  - 54B: Cost of new agricultural land (₹), Date of purchase
- Capital Gains Account Scheme (CGAS) deposit, if the reinvestment was not completed before the due date: Amount deposited (₹), Date of deposit, Account number, IFS code of bank
- Amount of deduction claimed (₹) *
- Optional Note field

ITR line: Schedule CG Section D.

**W2 Stage 12 — House Property.** Income or loss from house property. Per property (Add Another for multiple properties):

- Address (Address, Town/City, State, PIN Code)
- Type of House property * (Self-occupied / Let out / Deemed let out)
- Owner of property * (Self / Spouse / Others)
- Co-owned? (Yes/No); if Yes: ownership percentage (%)
- Gross rent received or receivable or lettable value (₹) — enter 0 for self-occupied
- Unrealised rent (₹)
- Municipal taxes paid (₹)
- Arrears/Unrealised rent received during the year less 30% (₹)
- Home loan interest — per loan (Add Another): Lender name *, Loan account number *, Date of sanction *, Total loan amount (₹) *, Loan outstanding as of 31 March (₹) *, Interest on borrowed capital u/s 24(b) (₹) *
- Optional Note field per row

Auto-computed and shown (not user-entered): Annual value, Standard deduction (30% of annual value after deductions), Income / Loss from house property. ITR line: Schedule HP.

**W2 Stage 13 — Other Domestic Income.** Freelance or professional income, gifts, and other domestic income not covered in W2 Stages 2–12. ITR line: Schedule OS / Schedule S as applicable.

**W2 Stage 14 — Other Foreign Income.** RSU vesting income (perquisite), foreign salary, and other foreign-source income not covered in W2 Stages 5, 7, or 9. Each row: income type, country, currency, amount in foreign currency, FX rate (SBI TT buying rate and applicable date), INR equivalent. The FX rate is user-editable; an override is visually flagged. Feeds W2 Stage 18 (Schedule FSI).

**W2 Stage 15 — Brought-Forward Losses (Schedule CFL).** Prior-year capital and house property losses carried forward reduce current-year tax by setting off against gains. This stage is skippable for users with no prior-year losses. Per assessment year where losses exist (2018-19 through 2024-25), the user enters: Date of filing of the original ITR for that year (DD-MMM-YYYY) *, House property loss carried forward (₹), Short-term capital loss carried forward (₹), Long-term capital loss carried forward (₹). Source: prior year ITR acknowledgement / ITR-V. No LLM extraction — fully manual. Race horse losses are out of scope. Current-year losses (if any) are auto-derived from W2 Stages 8–12 and not entered here. Entries feed Schedule CFL in the ITR JSON; the portal auto-computes CYLA and BFLA from these entries and the current-year income.

**W2 Stage 16 — TDS / Tax Credits.** TDS entries are extracted from three sources: (a) bank and brokerage statements — the same documents already parsed in W2 Stages 2–14 — which carry per-transaction TDS amounts for FD interest, professional fees, equity redemption proceeds, and other income; (b) capital gains statements from brokers, which may include TDS on equity or MF redemptions; and (c) Form 26AS / AIS — the authoritative government record of what each deductor actually deposited with the government. Entries from all three sources are extracted by the LLM and matched 1-to-1 by TAN + section code + approximate amount.

Entries are grouped by institution (deductor TAN), mirroring the layout of the Dividends and Capital Gains stages. Each institution card shows all TDS rows under that deductor, with a per-institution subtotal.

**TDS2 / TDS3 rows** (per matched entry):
- Deductor name, TAN, Section code (e.g. 194A interest, 194J professional fees, 195 non-resident payments), Head of Income (Salary / HP / CG / OS — maps the TDS to the correct income schedule in the ITR).
- Statement figures: gross income (₹) and TDS deducted (₹) — from bank or CG statement.
- Form 26AS figures: TDS deposited (₹) — from Form 26AS / AIS.
- Match status indicator: ✓ Matched (amounts agree) / ⚠ Discrepancy (amounts differ) / ○ Statement only (not yet in Form 26AS — deductor may not have deposited) / ○ Form 26AS only (statement not uploaded or not applicable).
- On Discrepancy: a preference toggle — "Use statement amount" / "Use Form 26AS amount" (defaults to Form 26AS, which is what the portal validates against).
- TDS credit claimed this year (₹) — defaults to the preferred amount; editable.
- Brought-forward TDS from prior years: FY and amount (₹) — shown when non-zero per Form 26AS.
- TDS credit carried forward (₹) — auto-computed (brought-forward + current FY − claimed).

For **TDS3 rows** (property TDS from Form 16B / Form 16C), additionally: PAN of buyer/tenant *, Aadhaar of buyer/tenant.

**TCS rows** (Tax Collected at Source, per collector, grouped by institution): TAN of Collector, TCS collected in current FY (₹), TCS credit claimed this year (₹), TCS credit carried forward (₹). Source: Form 27D / Form 26AS.

**TDS1 rows** (salary TDS) are auto-populated from W2 Stage 2 (Form 16 Part A) and shown read-only in this stage for completeness: TAN of employer, Employer name, Income chargeable under Salaries (₹), Total TDS (₹). They feed Schedule TDS1 in the ITR JSON and are not editable here (edit via W2 Stage 2).

All TDS2, TDS3, and TCS rows are fully editable; any field edited by the user is highlighted in amber, consistent with the income stages. Rows may be added or removed. Rows feed Schedule TDS1 (salary), Schedule TDS2 (non-salary), Schedule TDS3 (property), and Schedule TCS in the ITR JSON.

**W2 Stage 17 — Advance Tax & Self-Assessment Tax.** Challan-based rows, not institution-grouped. Pre-populated from Form 26AS where available; otherwise blank for manual entry. Per challan: BSR Code *, Date of Deposit (DD/MM/YYYY) *, Serial Number of Challan *, Amount (₹) *. All rows editable; edited rows highlighted in amber. Rows feed Schedule IT in the ITR JSON.

**W2 Stage 18 — Schedule FSI.** Auto-derived from W2 Stages 5, 7, 9, and 14. One entry per country. For each country, the user confirms: Taxpayer Identification Number in source country (TIN abroad — e.g. US SSN; mandatory on portal); and for each income head (Salary / House Property / Capital Gains / Other Sources) where income was earned: income in foreign currency, INR equivalent (from the FX rate already computed), taxes paid in the source country (user-entered or extracted from statements), tax payable in India on such income under normal provisions (Fisqo computes from income and applicable slab; user-confirmable), tax relief available (auto: lower of tax paid abroad or tax payable in India), and relevant article of DTAA if relief is claimed u/s 90 or 90A (optional text per income head). The user reviews and corrects entries before JSON generation.

**W2 Stage 19 — Schedule TR.** Auto-derived from W2 Stage 18. The summary table (country, TIN, total taxes paid abroad, total relief available) is auto-populated from Schedule FSI. For each country row, the user confirms the relief section (90 / 90A / 91). Additionally: Was any tax paid outside India, on which relief was allowed in India, subsequently refunded or credited by the foreign tax authority? (Yes/No; default No). If Yes: amount of tax refunded (₹) and assessment year in which the relief was originally allowed. Final entries feed the ITR JSON.

**W2 Stage 20 — Total Assets as of 31 March (Schedule AL).** Required for taxpayers with total income exceeding ₹1 Crore; shown to all users with a note about the threshold so they can decide whether to complete it.

**A. Immovable assets** — per property (Add Another): Description *, Flat/Door/Block No. *, Premises/Building/Village, Road/Street/Post Office, Area/Locality *, Town/City/District *, State * (dropdown), Country * (default India), Pin code, Amount (cost) in Rs. *.

**B. Movable assets** — fixed single-amount rows (not per item):
- Jewellery, bullion etc (₹)
- Archaeological collections, drawings, paintings, sculptures, works of art (₹)
- Vehicles, yachts, boats and aircraft (₹)
- Financial assets: Bank including all deposits (₹, pre-filled from W2 Stage 3/4 closing balances); Shares and securities (₹, pre-filled from W2 Stage 8/9 brokerage statements); Insurance policies (₹, cost/premium paid — not sum assured); Loans and advances given (₹); Cash in hand (₹)

**C. Liabilities** — single total amount (₹) covering all liabilities in relation to A+B combined.

Each row has an optional Note field. Rows feed Schedule AL in the ITR JSON.

---

### Workflow 3 — Schedule FA

Covers the Calendar Year (1 January – 31 December of the year preceding the assessment year) foreign asset disclosure. Fully independent from Workflow 2 — uses its own documents directory containing statements covering the CY. There is no data dependency between W2 and W3; the two workflows use different time periods and potentially different asset populations.

A persistent banner — "Schedule FA — Calendar Year CY20XX, 1 January – 31 December" — appears on every W3 stage page to make the CY scope explicit throughout.

Users with no foreign assets can declare nil at W3 Stage 2 (with a second affirmation), which marks all of Workflow 3 as Skipped and records a nil declaration for the ODS and ITR JSON.

**W3 Stage 1 — FA Setup.** Confirm the Calendar Year (auto-derived from the filing's assessment year; not editable). Provide the path to the FA documents directory — a separate directory containing CY statements from foreign banks and brokerages. Confirm the December 31 FX rates per foreign currency (SBI TT buying rate as of 31 December CY20XX; pre-populated from SBI rate reference data if available; user-confirmable and overridable; labeled explicitly as "FX rate as of 31 December CY20XX" — distinct from the transaction-date and 31 March rates used in Workflow 2). Overrides are visually flagged and persisted.

**W3 Stage 2 — FA Document Discovery and Categorisation.** Same controls as W2 Stage 1 but scoped to the FA documents directory. FA-specific institution categories:

- **Foreign Depository Account** (bank savings/current accounts) → FA Part A1
- **Foreign Custodial Account** (brokerage/securities accounts) → FA Part A2
- **Foreign Equity / Debt Interest in Entity** (equity shares, bonds, debt instruments in a foreign entity) → FA Part A3
- **Foreign Cash Value Insurance / Annuity Contract** → FA Part A4 (manual)
- **Financial Interest in Foreign Entity** (beneficial interest, partnership interests) → FA Part B
- **Immovable Property Outside India** → FA Part C (manual)
- **Other Capital Asset Outside India** (bonds, debentures, other securities not in A3 or B) → FA Part D
- **Signing Authority Account** → FA Part E (manual)
- **Trust Outside India** → FA Part F (manual)
- **Other Foreign Interest / Income** → FA Part G

The LLM pre-suggests categories based on institution type. Capital Gains source type (CG Summary / Transaction History) is set per institution for institutions with financial interests or other capital assets, as in W2.

Nil-declaration shortcut: if the user has no foreign assets to report, they click "Declare nil — no foreign assets" and confirm; all of Workflow 3 is marked Skipped.

**Common structure for FA income stages (W3 Stages 3–6).** Each stage covers one income sub-category for the Calendar Year (1 January – 31 December). Structure mirrors the corresponding W2 income stage but uses the CY date range. Only institutions with the relevant category selected in W3 Stage 2 appear; rows are grouped by institution. Same controls as W2 income stages: custom LLM prompt, rescan, add/edit/remove, optional Note field.

**W3 Stage 3 — FA Foreign Interest (CY).** Interest from foreign bank accounts and bonds, 1 January – 31 December of the FA CY. Mirrors W2 Stage 5. Feeds W3 Stages 7 (FA Parts A1 & A2) and 11 (FA Part D).

**W3 Stage 4 — FA Foreign Dividends (CY).** Dividends from foreign equities, 1 January – 31 December. Mirrors W2 Stage 7. Feeds W3 Stage 8 (FA Parts A3 & B).

**W3 Stage 5 — FA Capital Gains (CY).** Capital gains on foreign assets with transactions during the CY. Mirrors W2 Stage 9 (CG Summary / Transaction History modes per institution). Feeds W3 Stages 8 and 11.

**W3 Stage 6 — FA Other Income (CY).** RSU vesting, foreign salary, and other CY foreign income not covered in W3 Stages 3–5. Mirrors W2 Stage 14. Advisory hints from rows without a known asset type are surfaced in W3 Stage 14 (FA Part G).

**Common structure for FA sub-table stages (W3 Stages 7–14).** Each stage covers one or more Schedule FA sub-tables. Pre-filled from the relevant W3 income stages where possible; remaining fields require user completion. Every row has an optional Note field. For all foreign-currency amounts, Fisqo displays the original foreign currency amount, the SBI TT buying rate as of 31 December CY (confirmed in W3 Stage 1), and the INR equivalent; the portal is populated with the INR value. Each stage has an explicit **Reviewed** confirmation gate — the user must mark it Reviewed before Workflow 3 can be locked. Each sub-table stage also generates a portal-compatible CSV for direct upload to the corresponding Schedule FA section. Given the steep Black Money Act penalties for omissions, the lock step in W3 Stage 15 also verifies that all sub-table stages are Reviewed.

**W3 Stage 7 — FA Parts A1 & A2: Foreign Depository and Custodial Accounts.**

*Part A1 — Foreign Depository Accounts (bank savings/current accounts):* Pre-filled from W3 Stage 3 (interest rows). Per account: country, institution name, address, ZIP code, account number, status (open/closed), account opening date, peak balance during CY (INR), closing balance as of 31 December (INR), gross interest credited during CY (INR). Reviewed gate.

*Part A2 — Foreign Custodial Accounts (brokerage/securities accounts):* Pre-filled from W3 Stages 4 and 5 (dividend and capital gains rows). Per account: same fields as A1 plus nature of amount (dividends / interest / other) and gross amount paid/credited (INR). Reviewed gate.

**W3 Stage 8 — FA Parts A3 & B: Foreign Equity/Debt Interest and Financial Interests.**

*Part A3 — Foreign Equity and Debt Interest in any entity:* Pre-filled from W3 Stages 4 and 5 for holdings in foreign entities tracked with balance history. Per holding: country, entity name, address, ZIP, nature of entity, date of acquiring interest, initial value of investment (INR), peak value during CY (INR), closing balance as of 31 December (INR), total gross amount paid/credited during CY (INR), total gross proceeds from sale/redemption during CY (INR). Reviewed gate.

*Part B — Financial Interest in any Entity (beneficial interest, partnership):* Pre-filled from W3 Stages 4 and 5 for holdings with beneficial or partnership interests. Per holding: country, ZIP, nature of entity, entity name, address, nature of interest, date since held, total investment at cost (INR), income accrued during CY (INR), nature of income, and — since this income must also be declared elsewhere in the return — the schedule where offered (Schedule OS / CG / Salary) and item number of that schedule. A manual "Add pre-existing holding" control captures interests held throughout the CY with no transactions during it. Reviewed gate.

**W3 Stage 9 — FA Part A4: Foreign Cash Value Insurance / Annuity Contracts.** Fully manual, skippable for users who hold no such contracts. Per contract: country, name of financial institution, address, ZIP, date of contract, cash value or surrender value as of 31 December (INR), total gross amount paid/credited during CY (INR). Reviewed gate. Generates portal-compatible CSV.

**W3 Stage 10 — FA Part C: Immovable Property Outside India.** Manual entry per property. Per property: country, ZIP, address of property, ownership type, date of acquisition, total investment at cost (INR), income derived during CY (INR), nature of income, and — since this income must also be declared elsewhere in the return — the schedule where offered and item number of that schedule. Reviewed gate.

**W3 Stage 11 — FA Part D: Other Capital Assets Outside India.** Pre-filled from W3 Stages 3–6 for assets not covered in FA Parts A3 or B (bonds, debentures, other securities). Per asset: country, ZIP, nature of asset, ownership type, date of acquisition, total investment at cost (INR), income derived during CY (INR), nature of income, schedule where offered, and item number of that schedule. Reviewed gate.

**W3 Stage 12 — FA Part E: Accounts with Signing Authority.** Manual entry. Per account: institution name, address, country, ZIP, account holder name, account number, peak balance/investment during CY (INR), whether income accrued is taxable in the user's hands (Yes/No). Reviewed gate.

**W3 Stage 13 — FA Part F: Trusts Outside India.** Manual entry. Per trust: country, ZIP, trust name, address, trustee name(s), trustee address(es), settlor name, settlor address, beneficiary name(s), beneficiary address(es), date since position held, whether income derived is taxable in the user's hands (Yes/No). Reviewed gate.

**W3 Stage 14 — FA Part G: Other Foreign Income.** Manual entry with advisory hints from W3 Stage 6 rows that do not map to a known asset type. Per entry: country, ZIP, name and address of person from whom derived, income derived (INR), nature of income, whether taxable in the user's hands (Yes/No). Reviewed gate.

**W3 Stage 15 — FA Review and Lock.** Consolidated summary of all Parts A–G with entry counts and unreviewed-item highlights. User clicks **Confirm and Lock** to mark Workflow 3 complete. Locked data is read by Workflow 4 for ODS and ITR JSON generation.

---

### Workflow 4 — Summary & Filing

Integration point. Reads the completed outputs of Workflows 1, 2, and 3 and produces the ITR artefacts. W4 Stage 3 (generation) is blocked until W1 and W2 are Complete and W3 is either Complete or Skipped; the user can open Workflow 4 at any time to check status.

**W4 Stage 1 — Pre-filing Review.** Shows the completion status of Workflows 1, 2, and 3 with a summary of key computed numbers — total income by category, total TDS, total advance tax, Schedule FA entry counts. Any workflow that is In Progress or Not Started is highlighted with a direct link to resume it. The user can proceed even if W3 is incomplete; they receive a warning that the ITR JSON will not include Schedule FA data.

**W4 Stage 2 — Tax Computation Review (Part B-TTI).** Fisqo independently computes the full Part B-TTI chain and presents it for user review before generating the ITR JSON. All computed fields are shown in sequence:

Total income (from Part B-TI) → tax at slab rates → Section 87A rebate → surcharge (with marginal relief) → Health & Education Cess (4%) → gross tax liability → AMT credit u/s 115JD → tax relief (Section 89 / 90 / 91) → net tax liability → TDS / advance tax / TCS credits → balance payable or refund.

Fields Fisqo auto-computes and shows as pre-filled (amber-highlighted if user overrides):
- Section 87A rebate: ₹60,000 for total income up to ₹12 lakh under New Tax Regime, else ₹0
- Health & Education Cess: 4% of (tax after rebate + surcharge)
- Interest u/s 234B: computed from income and advance tax actually paid; shown if advance tax paid is less than 90% of assessed tax
- Interest u/s 234C: computed from quarterly advance tax instalment shortfalls
- Late filing fee u/s 234F: ₹1,000 (total income ≤ ₹5 lakh) or ₹5,000 (otherwise), shown only if filing date is after the due date
- Section 90/91 relief: auto from W2 Stage 19 (Schedule TR)

User-entered fields:
- Section 89 relief (salary arrears) — optional; shown with a note: *"File Form 10E separately on the IT portal before submitting this return"*
- Interest u/s 234A — only if filing after the due date and tax is unpaid; Fisqo shows a computed estimate but requires user confirmation

**Foreign asset declaration** (mandatory): "Did you at any time during the previous year hold any asset / signing authority / income outside India?" Auto-set to **Yes** if W3 has any entries or W2 Stages 5, 7, 9, or 14 contain any foreign income rows; otherwise defaults to **No**. The user must explicitly confirm this before proceeding.

**If balance is payable**: A prominent banner shows the amount due and instructs the user to: (1) pay self-assessment tax via the IT portal or bank, (2) return to W2 Stage 17 to enter the challan, and (3) return to this stage to re-run the computation before generating the JSON.

**W4 Stage 3 — ODS and JSON Generation.** Fisqo produces:

- A single ODS file with one sheet per category — Domestic Salary, Domestic Bank Interest, Other Domestic Interest, Foreign Interest, Domestic Dividends, Foreign Dividends, Domestic Capital Gains, Foreign Capital Gains, Property Capital Gains, House Property, Other Domestic Income, Other Foreign Income, TDS Credits, Advance Tax Challans, Schedule FA (labeled "Calendar Year CY20XX — 1 January – 31 December"), Schedule FSI, Schedule TR, Total Assets (Schedule AL) — grouped by category (institution grouping is collapsed at this point; exact column structure is deferred to the technical design document). Each sheet includes a Notes column. If W3 is not locked, the Schedule FA sheet records a nil declaration or an "incomplete — Schedule FA not filed" notice.
- The ITR JSON document, validated against the portal schema, including Schedule TDS1, TDS2, TCS, Schedule IT, Schedule FA, Schedule FSI, Schedule TR, and Schedule AL. If W3 is not locked, Schedule FA entries are omitted and a note records the omission.

The user can regenerate these files at any time from this stage.

**W4 Stage 4 — Manual Filing.** Fisqo provides instructions for the user to:

1. Open the generated JSON in the official Indian IT Department application (or edit it manually) to make any adjustments the portal requires.
2. Follow a step-by-step checklist to upload the JSON, verify each schedule on the portal, and complete the submission and e-verification.

### UI Surfaces

**Dashboard** — top-level view, grouped by tax user (PAN). An **Add new tax user** button at the top prompts for a PAN and creates a new tax user section. Each tax user section lists the financial years for which a filing has been initiated. For each filing, four workflow cards are shown:

```
[W1] Personal Information          ● Complete
[W2] FY Income & Taxes             ◑ In Progress  (Stage 8 of 20)
[W3] Schedule FA — CY20XX          ○ Not started
[W4] Summary & Filing              🔒 Awaiting W1, W2, W3
```

Each card shows the workflow name, current status, and (if in progress) the current stage. W4 shows "Ready to generate" when W1 and W2 are Complete and W3 is Complete or Skipped; otherwise it shows "Awaiting" with the blocking workflows listed. A **Start new filing** control initiates a new financial year under the same tax user.

**Workflow 1 pages:**
- **W1 Stage 1** — LLM configuration: API key / local model setup.
- **W1 Stage 2** — Tax user: PAN selection or creation; Date of Birth; Aadhaar Number.
- **W1 Stage 3** — Filing details: structured name (First / Middle / Last), structured address, contact details (email, mobile, phone), financial year, FY statements directory path.
- **W1 Stage 4** — Filing status: Residential Status, residential condition, filing section (139(1) default), Director flag, unlisted equity shares flag.
- **W1 Stage 5** — Bank details: Indian bank accounts (IFS Code, bank name, account number, account type, refund nomination toggle); add/remove accounts.

**Workflow 2 pages:**
- **W2 Stage 1** — File explorer grouped by institution, with reclassify / exclude / category-selection / CG-source-type / custom-prompt controls. Category selection determines which income sub-categories subsequent stages will extract.
- **W2 Stage 2** — Domestic Salary: employer-grouped rows extracted from Form 16 Part B; salary component breakdown, perquisites, exempt allowances, standard deduction; skippable.
- **W2 Stages 3–9** — one page per income sub-category (Domestic Bank Interest, Other Domestic Interest, Foreign Interest, Domestic Dividends, Foreign Dividends, Domestic Capital Gains, Foreign Capital Gains). Each page has institution-grouped rows, custom-prompt and rescan controls, add/edit/remove with visual change indicators, and an optional Note field per row. W2 Stage 8 additionally exposes a Schedule 112A CSV download for LTCG 112A rows.
- **W2 Stage 10** — Property Capital Gains: manual entry per property sold (dates, consideration, stamp duty value, cost, improvement, transfer expenses, deduction link); skippable.
- **W2 Stage 11** — Capital Gains Deductions (Section D): manual entry per reinvestment (type, dates, amounts, CGAS details); skippable.
- **W2 Stage 12** — House Property: per-property entry (type, ownership, rent, municipal taxes, unrealised rent, loan details per loan); auto-computed annual value and income shown.
- **W2 Stages 13–14** — Other Domestic Income; Other Foreign Income.
- **W2 Stage 15** — Brought-Forward Losses (Schedule CFL): manual entry of prior-year HP loss, STCL, and LTCL per assessment year (2018-19 to 2024-25) with filing date; skippable.
- **W2 Stage 16** — TDS / Tax Credits: deductor-grouped rows, add/edit/remove, Note field.
- **W2 Stage 17** — Advance Tax & Self-Assessment Tax: challan rows, add/edit/remove, Note field.
- **W2 Stage 18** — Schedule FSI: one entry per country — Taxpayer Identification Number (TIN abroad), per-income-head income/tax-paid/tax-payable-in-India/relief fields, and relevant DTAA article per head; auto-derived from W2 Stages 5, 7, 9, 14 with user review.
- **W2 Stage 19** — Schedule TR: per-country relief section (90/90A/91) confirmation; refunded foreign tax flag (Yes/No) with amount and assessment year if Yes.
- **W2 Stage 20** — Total Assets (Schedule AL): structured entry of assets and liabilities as of 31 March, with LLM-pre-filled bank and securities values and Note field per row.

Within Workflow 2, stages are grouped in the sidebar: **Income** (Stages 2–15), **Taxes Paid** (Stages 16–17), **Foreign Schedules** (Stages 18–19), **Assets** (Stage 20).

**Workflow 3 pages:**
- **W3 Stage 1** — FA setup: FA documents directory path, December 31 FX rate confirmation per currency.
- **W3 Stage 2** — FA document discovery and categorisation: same controls as W2 Stage 1 with FA-specific categories (A1, A2, A3, A4, B, C, D, E, F, G). Nil-declaration shortcut.
- **W3 Stages 3–6** — one page per FA income sub-category (FA Foreign Interest, FA Foreign Dividends, FA Capital Gains, FA Other Income), all scoped to the Calendar Year. Same row structure as the corresponding W2 income stages. Persistent CY banner on every page.
- **W3 Stages 7–14** — one page per Schedule FA sub-table grouping (Stage 7: Parts A1+A2; Stage 8: Parts A3+B; Stage 9: Part A4; Stage 10: Part C; Stage 11: Part D; Stage 12: Part E; Stage 13: Part F; Stage 14: Part G), each labeled "Calendar Year CY20XX". LLM-pre-filled from W3 Stages 3–6 where possible. For all foreign-currency amounts: original currency amount, SBI TT rate as of 31 Dec, and INR equivalent displayed inline. Expandable computation trace for balance and income values. Note field per row. CSV download per sub-table for direct portal upload. Explicit Reviewed confirmation gate per stage.
- **W3 Stage 15** — FA Review and Lock: entry-count summary per Part, unreviewed-item warnings, Confirm and Lock button.

**Workflow 4 pages:**
- **W4 Stage 1** — Pre-filing review: completion status of W1/W2/W3 with key computed totals and direct links to incomplete workflows.
- **W4 Stage 2** — Tax Computation Review: full Part B-TTI chain (income → tax → rebate → cess → relief → net liability); user-confirmable computed fields; foreign asset declaration; self-assessment tax prompt if balance due.
- **W4 Stage 3** — ODS and JSON generation: status, downloads, and regenerate control.
- **W4 Stage 4** — Manual filing checklist: step-by-step portal upload and e-verification guidance.

## Dependencies

- **LLM provider.** A user-configured large language model for document classification and parsing. Either a cloud provider (OpenAI, Anthropic, Google) accessed via API, or a locally-run model (Ollama, llama.cpp). Fisqo's quality is bounded by the underlying model's accuracy on financial documents.
- **SBI TT buying rate reference data.** Historical exchange rates published by the State Bank of India, required for FX conversion of foreign-currency transactions.
