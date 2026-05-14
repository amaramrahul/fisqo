# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Fisqo is a local web application that helps Indian resident individuals file income tax returns, with first-class support for foreign income. It runs entirely on the user's machine, parsing bank/brokerage statements via a user-configured LLM, and produces an ITR JSON accepted by the Indian Income Tax portal.

The full product specification is in [docs/fisqo-prd.md](docs/fisqo-prd.md). Read it before making significant architectural decisions.

## Dev environment

The repo ships with a devcontainer ([.devcontainer/](.devcontainer/)) based on `mcr.microsoft.com/devcontainers/base:noble` with the Claude Code feature pre-installed. Open in VS Code Dev Containers or GitHub Codespaces and the environment is ready.

No build/test commands exist yet — the project is pre-implementation.
