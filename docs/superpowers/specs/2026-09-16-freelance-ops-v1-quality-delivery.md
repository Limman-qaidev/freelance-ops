# Freelance Ops V1 — Quality, Integrity and Delivery Design (4/4)

Date: 2026-09-16
Status: Approved
Repository: `Limman-qaidev/freelance-ops`

## 1. Engineering priority

The V1 engineering priority is:

```text
Data integrity
    >
Daily workflow reliability
    >
Additional functionality
    >
Technical sophistication
```

Freelance Ops V1 is intentionally a reliable local application rather than a distributed system. Backend, synchronization and unnecessary infrastructure must not be introduced before they are required.

## 2. Numeric and temporal integrity

### Money

Money must never use binary floating-point values as the source of truth.

Amounts are stored as integer minor units whenever the currency supports standard minor units. Example:

```text
EUR 28.43 -> 2843 minor units
```

Currency is stored alongside the amount.

FX rates must use a decimal representation suitable for exact commercial calculations rather than binary floating point.

### Time

Worked time is not stored as decimal hours. Work intervals preserve absolute timestamps and timezone context:

```text
started_at_utc
ended_at_utc
timezone_id
```

Duration is derived as:

```text
end - start
```

Human-readable durations and decimal-hour exports are derived representations.

### Identifiers

Domain identifiers use application-generated UUIDs from V1 to avoid coupling identity to one SQLite database and to preserve a clean path to future synchronization.

## 3. SQLite, transactions and migrations

SQLite is the V1 system of record.

Requirements:

- foreign keys enabled;
- explicit schema versioning;
- ordered migrations from the first release;
- transactional migrations where supported;
- no manual mutation of real user databases;
- tests for migrations that touch persisted production-shaped data;
- indexes on frequent lookup/relationship keys;
- database constraints for invariants that can be enforced locally.

Critical operations must use database transactions where multiple writes form one logical operation. This includes timer transitions, billing closure operations and relevant restore steps.

## 4. Timer reliability — Tier 1

The timer is Tier 1 functionality and must remain correct across:

- screen lock;
- app backgrounding;
- app process termination;
- app reopen;
- device restart;
- timezone changes.

The timer must not depend on an in-memory counter as the source of truth. Persisted timestamps are authoritative and the displayed elapsed duration is reconstructed from persisted intervals.

At most one work interval may be open globally.

## 5. Project progress metrics

Freelance Ops must distinguish completion, weighted delivery and planning coverage.

### Task completion

When a simple task-count metric is useful:

```text
completed tasks / total relevant tasks
```

### Weighted delivery

For tasks with estimates, delivery progress may be weighted by estimated effort:

```text
sum(estimated_effort_i * completed_indicator_i)
------------------------------------------------
       sum(estimated_effort_i)
```

A task without an estimate must not receive an invented arbitrary weight.

### Planning coverage

The UI/reporting should expose how much of the planned work has estimates, for example:

```text
estimated planned tasks / planned tasks
```

This prevents an apparently precise weighted progress number from hiding incomplete planning information.

Effort consumed and delivery progress remain separate metrics.

## 6. Commercial-model semantics

### Hourly

Billable amount is derived from billable time and the historically applicable rate, subject to the configured rounding policy.

### Fixed price

Worked hours do not determine contractual revenue. Time is used for effort, margin, budget and deviation analysis. Fixed-price billing may create explicit fixed-amount closure lines, optionally associated with project milestones.

### Hour package

Hour packages preserve purchased hours, consumed hours and remaining hours. Threshold alerts can be configured for package consumption.

Billing model and internal budget remain separate concepts.

## 7. Billing closure line model

A billing closure may contain lines with different economic origins, including:

- `TIME`;
- `EXPENSE`;
- `FIXED_AMOUNT`.

This supports hourly engagements, reimbursable expenses and fixed-price/milestone billing without turning V1 billing closures into fiscal invoices.

Closed lines preserve the economic snapshot needed to prevent historical rate or FX changes from rewriting the past.

## 8. Testing strategy

The project does not target an arbitrary coverage percentage. The quality rule is:

> Every material business rule and data-integrity invariant must have an automated test at the appropriate level.

### Unit tests

Pure business logic, including:

- duration calculations;
- task state transitions;
- dependency-cycle detection;
- weighted progress;
- planning coverage;
- effort and budget consumption;
- FX conversion;
- monetary rounding;
- hourly billing;
- fixed-amount billing;
- hour-package consumption.

### Integration tests

Use a real test SQLite database for:

- repositories;
- foreign keys;
- constraints;
- transactions;
- migrations;
- single-open-interval integrity;
- closure immutability;
- archival rules;
- prevention of double inclusion in billing closures.

### Component/UI tests

Cover key user-visible behavior such as:

- selection of an active project from Today;
- Start Work validation;
- pause/resume/stop behavior;
- dependency/blocking warnings;
- attempts to modify closed data;
- reopening completed tasks.

### E2E tests

Keep the E2E suite small and focused on critical journeys.

The primary E2E scenario is:

```text
Create client
 -> Create project
 -> Today
 -> Select active project
 -> Start work
 -> Close/kill app
 -> Reopen app
 -> Recover correct active timer
 -> Pause
 -> Resume
 -> Stop
 -> Verify history
```

This scenario is release-blocking for the first real-data build.

Other critical scenarios include:

- manual time entry;
- multicurrency expense;
- dependency-cycle rejection;
- reopening a completed task;
- project archival;
- hour-package exhaustion;
- fixed-price closure;
- hourly closure;
- duplicate-closure prevention;
- historical commercial-rate preservation;
- timezone changes;
- backup creation;
- backup restore;
- corrupted-backup rejection.

## 9. Backup and restore integrity

The conceptual backup package is versioned and contains:

```text
manifest.json
database.sqlite
attachments/
checksums.json
```

The manifest records at least:

- backup-format version;
- app version;
- database-schema version;
- creation timestamp.

Restore flow:

```text
validate package
 -> validate checksums
 -> validate compatibility
 -> create safety backup
 -> restore
 -> validate restored state
```

Invalid or incomplete packages must not replace the current application state.

## 10. Local notifications

V1 notifications remain fully local and derive from persisted application state.

Examples include:

- long-running timer;
- task effort threshold;
- project budget threshold;
- overdue tasks/milestones;
- approaching project deadlines;
- hour-package exhaustion thresholds.

No server is required for V1 alerts.

## 11. Privacy and repository hygiene

The repository must never contain real operational data.

The project `.gitignore` must exclude at least appropriate forms of:

```text
*.sqlite
*.db
backups/
exports/
receipts/
attachments/
.env*
```

Real client time entries, confidential rates, budgets, receipts, client documents, generated exports and secrets must never be committed.

Synthetic fixtures are permitted for tests.

## 12. CI baseline

Each pull request should run at least:

```text
TypeScript typecheck
 -> lint
 -> unit tests
 -> integration tests
```

A full Android APK build does not need to run on every commit initially. Android build verification is mandatory at release checkpoints.

## 13. Development workflow

Development should follow small, independently reviewable units:

```text
issue
 -> branch
 -> implementation + tests
 -> pull request
 -> CI
 -> review
 -> merge
```

Large V1-wide implementation branches are explicitly discouraged.

## 14. Delivery slices

### Slice 0 — Foundation

Establish only the technical foundation needed by the first functional slice:

- Expo / React Native;
- TypeScript strict mode;
- navigation;
- SQLite;
- migrations;
- repository infrastructure;
- test infrastructure;
- CI.

### Slice 1 — First usable build

Priority release for real work:

- clients;
- projects;
- tasks;
- activities;
- Today screen listing active projects;
- select project and start work in seconds;
- START / PAUSE / RESUME / STOP;
- manual time entry;
- history;
- basic expenses;
- SQLite persistence.

At the end of Slice 1 an installable Android build must be available and safe enough to start tracking real Maubank and Nissan work.

### Slice 2 — Project Control

Add:

- estimates;
- semi-automatic task states;
- dependencies;
- milestones;
- delivery progress;
- effort deviation;
- calendar;
- simplified timeline/Gantt.

### Slice 3 — Commercial & Finance

Add:

- commercial terms;
- hourly billing;
- fixed-price handling;
- hour packages;
- budgets;
- multicurrency/FX handling;
- advanced expenses;
- billing closures;
- economic dashboard;
- local alerts.

### Slice 4 — Reporting & Resilience

Add:

- Excel export;
- professional PDF report;
- backup;
- restore;
- integrity diagnostics;
- final V1 regression coverage.

## 15. Slice 1 acceptance journey

The first usable build must support the following offline journey reliably:

```text
Open Freelance Ops
 -> Today lists all active projects
 -> Tap Nissan — Spare Parts
 -> optionally select Catalogue parser and Development
 -> START
 -> lock phone / background app / kill app
 -> reopen later
 -> elapsed timer is correct
 -> PAUSE
 -> RESUME
 -> STOP
 -> history contains the correct session
```

The Project is the only mandatory dimension required to start work. Task, activity and description remain optional.

## 16. Explicit V1 exclusions

To prevent scope creep, V1 excludes:

- backend;
- user accounts/login;
- cloud synchronization;
- multi-device sync;
- teams;
- web app;
- formal fiscal invoices;
- automatic FX service;
- AI features;
- OCR;
- bank integrations;
- external calendar integration;
- client portal;
- mandatory Play Store publication.

These exclusions must not be interpreted as architectural prohibitions for future versions.

## 17. Definition of Done — first real-data build

Before the application is considered safe for real operational data, all of the following must hold:

- installable Android build;
- SQLite schema versioning and migrations;
- Today displays active projects;
- normal start flow takes only a few interactions;
- globally unique active timer;
- pause/resume/stop works correctly;
- timer recovers after app process termination;
- timer recovers after device restart;
- manual time entry works;
- history is viewable and editable under integrity rules;
- tasks and activities work;
- basic expenses work;
- release-blocking tests pass;
- CI is green;
- no Internet dependency exists for normal operation;
- no real/private operational data is versioned.

Only then may the build be considered:

```text
SAFE FOR REAL DATA
```

## 18. Design completion

With this document approved, the four V1 design blocks are complete:

1. Product and architecture.
2. Domain model and business rules.
3. UX, screens and user flows.
4. Quality, integrity and delivery strategy.

The next phase is implementation planning: translate the approved design into an executable roadmap, GitHub issues and small reviewable slices, prioritizing Slice 0 and Slice 1.
