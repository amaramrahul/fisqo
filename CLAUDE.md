# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Fisqo is a local web application that helps Indian resident individuals file income tax returns, with first-class support for foreign income. It runs entirely on the user's machine, parsing bank/brokerage statements via a user-configured LLM, and produces an ITR JSON accepted by the Indian Income Tax portal.

The full product specification is in [docs/fisqo-prd.md](docs/fisqo-prd.md). Read it before making significant architectural decisions.

## Dev environment

The repo ships with a devcontainer ([.devcontainer/](.devcontainer/)) based on `mcr.microsoft.com/devcontainers/base:noble` with the Claude Code feature pre-installed. Open in VS Code Dev Containers or GitHub Codespaces and the environment is ready.

No build/test commands exist yet — the project is pre-implementation.

## ITR-2 AY2026 Portal Schedule Review Status

We are systematically navigating the IT Portal (https://eportal.incometax.gov.in) to inspect every field in each schedule, then updating `docs/fisqo-prd.md` to match exactly what the portal asks. Status as of the most recent commit:

| Schedule | Portal Section | PRD Stages Affected | Status |
|---|---|---|---|
| Part A-Gen | Personal Information | W1 Stages 1–5 | ✅ Done |
| Schedule Salary | Salary income | W2 Stage 2 | ✅ Done |
| Schedule House Property | House property income | W2 Stage 12 | ✅ Done |
| Schedule Capital Gains | CG from equities, MFs, property | W2 Stages 8–11 | ✅ Done |
| Schedule 112A | LTCG from listed equity/MF | W2 Stage 8 | ✅ Done |
| Schedule Other Sources | Dividends, interest, other income | W2 Stages 3–7, 13–14 | ✅ Done |
| Schedule VI-A | Deductions (80CCD(2) only under New Regime) | W2 Stage 2 | ✅ Done |
| Schedule EI | Exempt income (PPF, EPF, SSY) | W2 Stage 4 | ✅ Done |
| Schedule FSI | Foreign source income per country | W2 Stage 17 | ✅ Done |
| Schedule TR | Tax relief for foreign taxes paid | W2 Stage 18 | ✅ Done |
| Schedule FA | Foreign asset disclosure (CY scope) | W3 Stages 7–13 | ✅ Done |
| Tax Paid (TP) | TDS1/TDS2/TDS3/TCS/Advance Tax | W2 Stages 15–16 | ✅ Done |
| Schedule CYLA | Set-off of current year losses | — | 🔲 Pending |
| Schedule BFLA | Set-off of brought-forward losses | — | 🔲 Pending |
| Schedule CFL | Carry-forward of losses | — | 🔲 Pending |
| Part B-TTI | Final tax computation and liability | W4 | 🔲 Pending |
| Schedule SI | Income at special rates | — | 🔲 Pending (check if auto-computed) |
| Schedule AL | Assets and Liabilities | W2 Stage 19 | 🔲 Pending verify |
| Part B-TI | Total income computation | — | 🔲 Pending (likely auto-computed) |

Workflow: navigate portal → inspect all fields and Add Another forms → propose PRD changes → get user review → update PRD → commit. Pause after each schedule for user approval.
