# ADR 0001: Defer Idempotency-Key and cursor pagination

- **Status:** Accepted
- **Date:** 2026-07-17
- **Context issue:** #2

## Context

The technical design mandates four cross-cutting properties for the REST API: versioning under `/api/v1`, a standardised error shape, an `Idempotency-Key` header on mutation endpoints deduplicated within a 24-hour window, and cursor-based pagination on list endpoints capped at 200 per page.

Issue #2 introduces the first two endpoints, `GET` and `POST /api/v1/tax-users`, and therefore forces a decision on all four.

## Decision

Versioning and the standardised error shape are adopted now.

`Idempotency-Key` deduplication and cursor pagination are deferred. The `{ data, nextCursor }` response envelope is adopted now even though pagination is not implemented; `nextCursor` is always `null`.

## Rationale

Idempotency keys guard against duplicate submissions caused by client retries over unreliable networks. Fisqo is a local application: the client and server are the same machine, communicating over loopback, with a single user. The failure mode the mechanism exists to prevent cannot currently occur. Implementing it now would mean a dedupe table, middleware, and TTL sweeping, all tested against a scenario that cannot be produced - which makes it likely to be subtly wrong by the time anything depends on it. It is additive whenever a real need appears.

Cursor pagination is similarly premature: a realistic user has one to three tax users, and the largest list in the product is bounded by the number of income rows in a single filing.

The response envelope is adopted despite the deferral because it is the only decision in this area that is genuinely hard to reverse. Returning a bare array today and paginating later would be a breaking response-shape change for every client; shipping the envelope now makes pagination purely additive.

## Consequences

- Every list endpoint returns `{ data, nextCursor }`, with `nextCursor` always `null` until pagination is implemented.
- Mutation endpoints accept no `Idempotency-Key` header. A client that sends one is not served differently.
- When a genuine need for either arises, this ADR should be superseded rather than amended.
