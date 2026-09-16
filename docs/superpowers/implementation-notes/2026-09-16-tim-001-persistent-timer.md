# TIM-001 — Persistent Timer Implementation Notes

Date: 2026-09-16
Issue: #7
Status: Implemented on `codex/tim-001-persistent-timer`, pending merge

This note records implementation-level decisions made while realizing the approved V1 time-entry/work-interval domain model. It does not replace the approved domain specification.

## Lifecycle representation

`TimeEntry` remains the logical work session and may own multiple `WorkInterval` rows.

For TIMER entries, SQLite persists `stopped_at_utc` on `time_entries`:

- `stopped_at_utc IS NULL` and an open interval exists → `RUNNING`;
- `stopped_at_utc IS NULL` and all intervals are closed → `PAUSED`;
- `stopped_at_utc IS NOT NULL` → `STOPPED`.

`RUNNING`, `PAUSED`, and `STOPPED` are therefore reconstructed from persisted timestamps rather than maintained as an independent mutable status field.

Manual entries are excluded from the TIMER-session lifecycle invariant.

## Global exclusivity invariants

Two related invariants are enforced independently in SQLite:

1. At most one `WorkInterval` may have `ended_at_utc IS NULL` globally.
2. At most one `TimeEntry` with `source = 'TIMER'` may have `stopped_at_utc IS NULL` globally.

The second invariant is required because PAUSE closes the current interval but does not end the logical timer session. Without it, another timer could be started while the first session was paused.

Application checks provide useful errors, while the database constraints remain the concurrency-safe source of truth.

## Atomic operations

START, PAUSE, RESUME, and STOP execute through `TransactionalDataDatabase.withExclusiveTransactionAsync`.

- START optionally activates an eligible PLANNED project, inserts the TIMER `TimeEntry`, and inserts its first `WorkInterval` in one transaction.
- PAUSE closes the current open interval and updates the logical entry in one transaction.
- RESUME validates the living session, inserts a new open interval, and updates the entry in one transaction.
- STOP closes any current open interval and records `stopped_at_utc` in one transaction.

The React/UI layer never performs these writes directly.

## Time and reconstruction

The timer does not persist a ticking counter.

Each interval stores:

- `started_at_utc`;
- optional `ended_at_utc`;
- the IANA `timezone_id` active when that interval begins.

Elapsed duration is derived from the persisted intervals. Closing the database and reconstructing the application service therefore restores the same RUNNING or PAUSED logical state without depending on process memory.

## Application boundary

`CoreApplication` exposes `timeTrackingService` alongside the existing client/project/task/activity services. Future Today/Start Work UI must consume this application service through `useApplication()` rather than access repositories or SQLite.

## Domain rules enforced by TIM-001

- `projectId` is required to start work.
- Task, activity, and description are optional.
- A referenced task must belong to the selected project.
- Archived entities cannot be used for new timer work.
- COMPLETED/CANCELLED tasks cannot receive timer work silently.
- ON_HOLD/COMPLETED/CANCELLED projects cannot start timer work.
- Starting the first real interval on an eligible PLANNED project transitions it to ACTIVE and records its first actual local work date when absent.

Task dependency warnings/reopen UX remain later-slice concerns and are not implemented by TIM-001.

## Verification coverage

The TIM-001 test suite covers:

- START → PAUSE → RESUME → STOP;
- multiple intervals in one logical entry;
- elapsed-duration derivation;
- UTC timestamps plus IANA timezone persistence;
- service reconstruction after physically closing/reopening SQLite in RUNNING and PAUSED states;
- task/project mismatch rejection;
- PLANNED → ACTIVE project transition;
- rejection of a second logical TIMER session;
- the global one-open-interval database invariant;
- the one-unstopped-TIMER-session invariant.
