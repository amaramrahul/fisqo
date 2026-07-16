# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Fisqo is a local web application that helps Indian resident individuals file income tax returns, with first-class support for foreign income. It runs entirely on the user's machine, parsing bank/brokerage statements via a user-configured LLM, and produces an ITR JSON accepted by the Indian Income Tax portal.

The full product specification is in [docs/fisqo-prd.md](docs/fisqo-prd.md). Read it before making significant architectural decisions.

## Guidelines

### Writing style

Never use the em dash character. Use a plain dash "-" instead.

### Before starting any feature or change

Read [docs/fisqo-tech-design.md](docs/fisqo-tech-design.md) and [docs/fisqo-ux-design.md](docs/fisqo-ux-design.md) in full before writing a design/spec or touching code. Specifically check:
- Does an existing component, package, schema, or API endpoint already cover part of this? Reuse it rather than re-deriving it in a spec.
- Does the change fit the documented architecture (monorepo layout, API versioning, error shape, stage-dependency model), or does it require a documented deviation?
- Does the UX design doc already describe the screen/flow this touches? Match its structure and terminology instead of inventing new ones.

### Technical decision-making

When making technical decisions, do not give much weight to development cost. Instead, prefer quality, simplicity, robustness, scalability, and long-term maintainability.

### Bug fixes

Always start by reproducing the bug in an end-to-end setting as closely aligned with how an end user experiences it. This makes sure you find the real problem so the fix actually solves it.

### Before opening a PR - mandatory checklist

Before running any "finish branch" / PR-creation workflow, explicitly confirm each item below (state pass/fail for each, don't skip silently):

1. [docs/fisqo-tech-design.md](docs/fisqo-tech-design.md) and [docs/fisqo-ux-design.md](docs/fisqo-ux-design.md) updated to reflect what was actually built.
2. Tests exist per the Testing Policy above and the full suite passes.

This checklist is project-specific and is not covered by generic branch-completion skills (e.g. finishing-a-development-branch) - it must be checked separately, not assumed to be part of their process.

### Commit messages

Never auto-add your agent name as co-author.

## Dev environment

The repo ships with a devcontainer ([.devcontainer/](.devcontainer/)). Open in VS Code Dev Containers or GitHub Codespaces and the environment is ready.

No build/test commands exist yet - the project is pre-implementation.

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
| Schedule FSI | Foreign source income per country | W2 Stage 18 | ✅ Done |
| Schedule TR | Tax relief for foreign taxes paid | W2 Stage 19 | ✅ Done |
| Schedule FA | Foreign asset disclosure (CY scope) | W3 Stages 7–14 | ✅ Done |
| Tax Paid (TP) | TDS1/TDS2/TDS3/TCS/Advance Tax | W2 Stages 16–17 | ✅ Done |
| Schedule CYLA | Set-off of current year losses | Auto-computed by portal | ✅ Done (no Fisqo stage needed) |
| Schedule BFLA | Set-off of brought-forward losses | Auto-computed by portal | ✅ Done (no Fisqo stage needed) |
| Schedule CFL | Carry-forward of losses | W2 Stage 15 (new) | ✅ Done |
| Part B-TTI | Final tax computation and liability | W4 Stage 2 (new) | ✅ Done |
| Schedule SI | Income at special rates | Auto-computed from CG/OS | ✅ Done (no Fisqo stage needed) |
| Schedule AL | Assets and Liabilities | W2 Stage 20 | ✅ Done |
| Part B-TI | Total income computation | Auto-derived from income schedules | ✅ Done (no Fisqo stage needed) |

Workflow: navigate portal → inspect all fields and Add Another forms → propose PRD changes → get user review → update PRD → commit. Pause after each schedule for user approval.