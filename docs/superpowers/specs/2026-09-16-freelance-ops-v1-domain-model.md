# Freelance Ops V1 — Approved Domain Model and Business Rules

Date: 2026-09-16
Status: Approved
Repository: `Limman-qaidev/freelance-ops`

This document records the approved domain model and business rules for Freelance Ops V1. It complements the product and architecture design in `2026-09-16-freelance-ops-v1-design.md` and will be consolidated into the final V1 design specification before implementation planning.

## 1. Domain overview

```text
Workspace
│
├── Client
│   └── Project
│       ├── CommercialTerms
│       ├── Task
│       │   └── TaskDependency
│       ├── Milestone
│       ├── TimeEntry
│       │   └── WorkInterval
│       ├── Expense
│       │   └── ExpenseAttachment
│       └── BillingClosure
│           ├── TimeEntry items
│           └── Expense items
│
├── Activity
├── AlertPreferences
└── AppSettings
```

All domain identifiers use UUIDs from V1 to avoid coupling identity to one SQLite database and to simplify future synchronization across devices.

## 2. Workspace

V1 has exactly one automatically created workspace. It is a data ownership boundary only; V1 has no login or account system.

Fields:

- `id`
- `name`
- `default_currency`
- `created_at`
- `updated_at`

Future evolution may add `User -> Workspace -> Data` without redesigning client/project ownership.

## 3. Client

Fields:

- `id`
- `workspace_id`
- `name`
- `legal_name?`
- `notes?`
- `archived_at?`
- `created_at`
- `updated_at`

Tax identifiers, invoice address, VAT data and other formal invoicing fields are deferred to the future invoicing module.

## 4. Project

Fields:

- `id`
- `client_id`
- `name`
- `description?`
- `status`
- `planned_start_date?`
- `planned_end_date?`
- `actual_start_date?`
- `actual_end_date?`
- `project_currency`
- `archived_at?`
- `created_at`
- `updated_at`

Persistent statuses:

- `PLANNED`
- `ACTIVE`
- `ON_HOLD`
- `COMPLETED`
- `CANCELLED`

The first real work may transition a project from `PLANNED` to `ACTIVE`. Completion remains explicit: when all required work is complete, the application may suggest completing the project but must not silently do so.

## 5. Commercial terms

Commercial conditions are separate from the project so historical terms can be versioned.

Fields:

- `id`
- `project_id`
- `effective_from`
- `effective_to?`
- `billing_model`
- `currency`
- `hourly_rate?`
- `fixed_price?`
- `package_hours?`
- `package_price?`
- `budget_hours?`
- `budget_amount?`
- `rounding_policy`
- `created_at`

Supported V1 billing models:

- `HOURLY`
- `FIXED_PRICE`
- `HOUR_PACKAGE`

Billing model and budget are independent concepts. A fixed-price project may still have an internal hour and/or monetary budget.

Historical terms are never overwritten retroactively. New terms use a new effective period.

## 6. Task

Fields:

- `id`
- `project_id`
- `milestone_id?`
- `name`
- `description?`
- `status`
- `priority?`
- `estimated_minutes?`
- `planned_start_date?`
- `planned_end_date?`
- `actual_start_date?`
- `actual_end_date?`
- `archived_at?`
- `created_at`
- `updated_at`

Persistent statuses:

- `PENDING`
- `IN_PROGRESS`
- `COMPLETED`
- `CANCELLED`

`BLOCKED` is derived and is never a mutable persisted status.

Semi-automatic task state rules:

- New tasks start as `PENDING`.
- First real time registration can transition `PENDING -> IN_PROGRESS`.
- `COMPLETED` requires explicit user action.
- Registering new time against a completed task must prompt the user to reopen it.
- Reopening transitions `COMPLETED -> IN_PROGRESS`.
- Consuming estimated time never means that the task is completed.
- A blocked task may be started only after an explicit warning/override; dependencies are a planning control rather than an absolute physical lock.

Actual task effort is derived from associated time entries and is not manually maintained as an aggregate.

## 7. Task dependencies

Dependencies use an N:M relation:

- `task_id`
- `depends_on_task_id`

A task is considered blocked when at least one dependency is not completed:

`Blocked(T) = exists D in Dependencies(T) such that Status(D) != COMPLETED`.

Dependency cycles are invalid. Graphs such as `A -> B -> C -> A` must be rejected.

## 8. Milestone

Fields:

- `id`
- `project_id`
- `name`
- `description?`
- `planned_date?`
- `actual_completion_date?`
- `created_at`
- `updated_at`
- `archived_at?`

Tasks may optionally belong to a milestone. Milestones are grouping and control points; they do not add a second weight to project progress and must not double-count task effort.

## 9. Progress and effort metrics

Functional delivery progress and effort consumption are intentionally separate.

For tasks with estimated effort `e_i`, delivery progress is based on completion:

`P_delivery = sum(e_i * I_i) / sum(e_i)`

where `I_i = 1` only for completed tasks and `0` otherwise.

Effort consumption is:

`P_effort = sum(h_i) / sum(e_i)`

where `h_i` is real tracked effort.

The application must therefore be able to show discrepancies such as:

- Delivery progress: 35%
- Estimated effort used: 62%

Time spent must never be presented as equivalent to functional progress.

Tasks without estimates require a defined fallback treatment in reporting so they do not silently distort weighted progress. The implementation design must make this explicit before coding the metric.

## 10. Activity

Fields:

- `id`
- `workspace_id`
- `name`
- `archived_at?`
- `created_at`

Default suggested activities:

- Development
- Analysis
- Meeting
- Documentation
- Support
- Management
- Other

Activities are user-configurable.

`Project`, `Task`, and `Activity` are independent dimensions. Example:

- Project: Nissan Spare Parts
- Task: Catalogue parser
- Activity: Development

## 11. Time entry

`TimeEntry` represents a logical work session.

Fields:

- `id`
- `project_id`
- `task_id?`
- `activity_id?`
- `description?`
- `billable`
- `source`
- `created_at`
- `updated_at`

`source` includes at least:

- `TIMER`
- `MANUAL`

Every time entry belongs to a project. A task is optional; when present it must belong to the same project. Activity is optional unless product UX later decides to require it.

## 12. Work interval and timer model

A logical time entry may contain multiple work intervals to support pause/resume.

Fields:

- `id`
- `time_entry_id`
- `started_at`
- `ended_at?`
- `timezone`
- `created_at`

Duration of a time entry is derived as the sum of its closed intervals:

`T = sum(end_k - start_k)`.

There is exactly one global timer. The invariant is:

`number of open WorkIntervals <= 1`.

Starting a new timer while another interval is open must require an explicit decision to stop the current work and start the new work, or cancel.

Timer correctness is based on persisted timestamps, not an incrementing in-memory counter, so it survives app closure, screen lock, process termination and device restart.

## 13. Time zones

Absolute instants and timezone context are preserved. Conceptually store UTC timestamps plus an IANA timezone identifier.

Reports group work using the local date of the work context rather than blindly grouping by UTC date. Changing the phone timezone later must not retrospectively move historical work into another local day.

## 14. Expense

Fields:

- `id`
- `project_id`
- `expense_date`
- `category`
- `description?`
- `original_amount`
- `original_currency`
- `exchange_rate?`
- `project_amount`
- `project_currency`
- `reimbursable`
- `status`
- `created_at`
- `updated_at`

Initial statuses:

- `PENDING`
- `INCLUDED_IN_CLOSURE`
- `REIMBURSED`

If original and project currencies match, FX is 1. If different:

`project_amount = original_amount * exchange_rate`.

The applied FX rate is manually entered in V1 and frozen historically.

## 15. Expense attachments

Fields:

- `id`
- `expense_id`
- `local_uri`
- `original_filename`
- `mime_type`
- `file_size?`
- `checksum?`
- `created_at`

Files remain in local application storage. SQLite stores references and metadata. A checksum is recommended to detect missing, corrupted or incomplete backup files.

## 16. Billing closure

V1 has billing closures, not formal fiscal invoices.

Fields:

- `id`
- `client_id`
- `currency`
- `period_start`
- `period_end`
- `status`
- `closed_at?`
- `created_at`
- `updated_at`

Statuses:

- `DRAFT`
- `CLOSED`

Closures associate eligible time entries and expenses and preserve an economic snapshot. Snapshot line information must be sufficient to keep historical calculations stable, including quantities, applied unit rates, amounts and currency.

Changing a future project rate must not recalculate an already closed historical period.

A time entry or expense cannot be included in two active/closed billing closures for the same economic event.

Closed entries are immutable until their closure is reopened.

## 17. Multicurrency closure rule

A billing closure has one currency. V1 does not silently combine unrelated billing currencies in one closure.

If one client has work contractually billed in EUR and USD, separate closures are created unless a future feature explicitly defines billing conversion rules.

## 18. Archival and deletion

Master/reference entities with historical use are archived rather than physically deleted:

- Client
- Project
- Task
- Milestone
- Activity

Unclosed transactional records such as erroneous `TimeEntry` and `Expense` records may be physically deleted.

Once included in a closed billing closure they cannot be edited or deleted until the closure is reopened.

## 19. Alerts

V1 persists alert preferences/rules, not stale alert results.

Conceptual fields:

- `type`
- `enabled`
- `threshold`

Examples:

- long timer threshold;
- task estimated-effort threshold;
- project budget usage threshold;
- overdue task or milestone;
- project deadline proximity;
- hour-package depletion.

Alerts are derived from current local data and use local notifications.

## 20. App settings

Local settings include functional preferences such as:

- default currency;
- default activity?;
- timer warning threshold;
- default rounding policy;
- week start;
- date format.

V1 has no remote credentials or secrets because it has no external mandatory service.

## 21. Aggregates that are not persisted as mutable truth

Do not maintain mutable aggregate truth such as:

- `project.total_hours`
- `task.actual_hours`
- `project.progress`
- `project.total_expenses`
- `client.total_billed`

These values are derived from transactional data. If future performance requires cached/materialized values, they remain rebuildable derivatives rather than independent business truth.

## 22. Core integrity invariants

- At most one work interval is open globally.
- Every time entry belongs to a project.
- A referenced task must belong to the same project as its time entry.
- Task dependency cycles are forbidden.
- `BLOCKED` is derived.
- Completion is explicit.
- Historical closed commercial terms and FX values are stable.
- Closed records are immutable until their closure is reopened.
- Master data with historical references is archived, not deleted.
- Attachment/database inconsistencies must be detectable.
- Economic and progress aggregates are derived rather than manually maintained.

## 23. Representative model

```text
Workspace
└── Nissan
    └── Spare Parts
        │
        ├── FIXED_PRICE
        │   ├── Price: 7,500 EUR
        │   └── Budget: 120 h
        │
        ├── Milestone: Analysis
        │   ├── Inspect catalogue       completed
        │   └── Define data model       in progress
        │
        ├── Milestone: MVP
        │   ├── Parser                  blocked
        │   └── Validation              blocked
        │
        ├── Time
        │   └── 12 h 43 min
        │
        └── Expenses
            ├── Taxi: 1,500 MUR
            └── Hotel: 240 EUR
```

The model must support reporting delivery progress, effort consumption, budget consumption, expenses, billable amount and upcoming milestones without client-specific logic.
