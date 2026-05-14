# Fisqo

An open-source local web app that helps resident individuals in India prepare and file income tax returns using AI — with first-class support for foreign income and foreign capital gains.

## What it does

- Ingests bank and brokerage statements (PDF, CSV, XLS) from a local directory
- Classifies documents by institution using a user-configured LLM
- Extracts and summarizes Dividends, Capital Gains, Bank Interest, Rent, Fixed Deposits, and Other Income
- Applies correct INR/FX conversion (SBI TT buying rates)
- Generates an ITR JSON validated against the Indian Income Tax portal schema
- Guides you through assisted filing on the portal step by step

## Who it's for

Resident individual taxpayers with foreign income (RSUs, foreign brokerage accounts, foreign bank interest) or complex domestic holdings, for whom existing tools fall short.

## Key design decisions

- Runs entirely on your machine; statements never leave it except when sent to your chosen LLM for parsing
- Only the New Tax Regime is supported in this release
- Not an authoritative tax engine — verify all computations before filing

## Getting started

> Setup instructions coming soon.

## License

MIT
