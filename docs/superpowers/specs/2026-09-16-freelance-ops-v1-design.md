# Freelance Ops V1 — Product and Architecture Design

Date: 2026-09-16
Status: In design
Repository: `Limman-qaidev/freelance-ops`

## 1. Product intent

Freelance Ops is an Android-first, cross-platform, offline-first mobile application for managing freelance work operationally and economically. It is not intended to be only a timesheet. The V1 must allow a freelancer to register work quickly while preserving enough structure to answer later:

- what was worked on;
- for which client and project;
- how much time was spent;
- how that time compares with estimates and budgets;
- which expenses were incurred;
- how much is billable;
- what has already been included in a billing closure;
- whether a project is drifting relative to plan.

The first real users/projects are expected to include Maubank and Nissan, but the product must not be hard-coded for a single user or client and should be able to evolve into a product for other freelancers.

## 2. Confirmed V1 scope

### Work tracking

- Clients.
- Projects.
- Optional tasks/work items inside projects.
- Configurable activities.
- Persistent global timer with START / PAUSE / RESUME / STOP.
- Exactly one active timer globally.
- Timer survives app closure, screen lock, and device restart by persisting timestamps rather than relying on an in-memory counter.
- Manual time entry.
- Historical entries with edit/delete subject to closure rules.

### Project management

- Task states with semi-automatic transitions.
- Task estimates in hours/minutes.
- Actual time derived from time entries, never manually entered as an aggregate.
- Optional task dependencies.
- Dependency-derived BLOCKED state.
- Milestones.
- Global project progress derived from tasks/milestones, not manually editable.
- Planned and actual start/end dates for projects, milestones, and tasks.
- Calendar view.
- Simplified timeline/Gantt view.
- Budget/effort deviation tracking.

### Commercial models

The design must support from V1:

- hourly billing;
- fixed-price projects;
- hour packages;
- project budgets in hours and/or money;
- future mixed models without redesigning the core domain.

Billing model and budget are separate concepts. Example: a fixed-price project may still have an internal 120-hour effort budget.

Formal tax invoice generation is explicitly out of V1, but V1 must preserve enough traceability to add invoices later.

### Expenses

- Expense associated with a project.
- Date.
- Amount.
- Currency.
- Category.
- Description.
- Reimbursable/non-reimbursable distinction.
- Status.
- Local receipt/document attachment.
- Attachments stored in local filesystem; database stores references/metadata.

### Multicurrency

V1 supports expenses in a currency different from the project currency.

For each converted expense preserve:

- original amount;
- original currency;
- exchange rate;
- project amount;
- project currency.

Exchange rates are entered manually in V1 and remain frozen historically. No FX API is required in V1.

### Billing preparation

V1 manages the state immediately before formal invoicing:

- billable time;
- billable expenses;
- billing periods/closures;
- prevention of double inclusion;
- ability to reopen a closure before modifying closed data.

### Reporting and export

V1 includes:

- dashboard;
- summaries by day/week/month;
- client/project/activity analysis;
- billable vs non-billable analysis;
- project economic tracking;
- Excel export filtered by period/client/project;
- professional PDF report suitable for sending to a client, but not a formal fiscal invoice.

Expected Excel sheets include at least:

- Summary;
- Time Entries;
- Expenses;
- Projects;
- Tasks;
- Billing;
- Period Report.

### Alerts

Offline/local notifications are included in V1 and configurable. Initial alert types include:

- unusually long active timer;
- task approaching/exceeding estimated effort;
- project budget nearing exhaustion;
- overdue task/milestone;
- project approaching target date;
- hour package nearing exhaustion.

### Backup and restore

V1 supports a manual complete backup containing:

- local database;
- attachments/receipts;
- configuration;
- format/version metadata;
- integrity manifest.

Backup is not additionally encrypted in V1.

Restore uses full snapshot replacement rather than merge. Before restoring, the app creates a preventive backup of the current state.

### AI

AI features are explicitly deferred to V2. Candidate future features include dictation, activity classification, summaries, natural-language queries, and anomaly detection. V1 architecture and data should not prevent these additions.

## 3. Platform and architecture — approved

### Platform

- Android-first.
- React Native.
- Expo.
- TypeScript.
- SQLite local persistence.
- Cross-platform architecture so iOS can be added later without rewriting the product.

### Explicitly excluded from V1 infrastructure

- backend;
- server;
- Supabase;
- Firebase;
- authentication;
- cloud accounts;
- Docker;
- mandatory external APIs;
- sync service.

The app must remain usable with no Internet connection.

### Architectural boundary

The UI must not access SQLite directly.

Conceptual dependency flow:

```text
UI
 ↓
Application / Use Cases
 ↓
Domain
 ↓
Repository interfaces
 ↓
Infrastructure
 ↓
SQLite / Filesystem
```

Example:

```text
StartTimer
    ↓
TimeTrackingService
    ↓
TimeEntryRepository
    ↓
SQLiteTimeEntryRepository
    ↓
SQLite
```

This abstraction is required so a future synchronized repository/backend can replace or augment local persistence without rewriting domain rules or UI flows.

## 4. Logical module boundaries — approved

```text
src/
├── domain/
│   ├── workspace/
│   ├── clients/
│   ├── projects/
│   ├── tasks/
│   ├── milestones/
│   ├── activities/
│   ├── time-tracking/
│   ├── expenses/
│   ├── billing/
│   └── planning/
│
├── application/
│   └── use-cases/
│
├── infrastructure/
│   ├── database/
│   ├── repositories/
│   ├── filesystem/
│   ├── backup/
│   ├── export/
│   └── notifications/
│
├── features/
└── ui/
```

This is a logical design boundary, not an irrevocable folder structure. Expo/framework conventions may require small physical adaptations while preserving these responsibilities.

## 5. Future evolution — approved

V1:

```text
Single user
Single device
SQLite
Offline
```

Future target:

```text
User
 ↓
Workspace
 ↓
Multiple devices
 ↓
Synchronization
 ↓
Backend
 ↓
Other freelancers
```

A Workspace concept therefore exists from V1 even though no login or multi-user behavior exists yet.

## 6. Delivery strategy — approved

V1 is one product scope but will be delivered through usable vertical slices so real data can be captured before the whole V1 is complete.

### Milestone 1 — first usable build

Must provide:

- create/manage clients;
- create/manage projects;
- create/manage tasks;
- configurable activities;
- START / PAUSE / RESUME / STOP;
- manual time entry;
- history;
- edit/delete under integrity rules;
- basic expenses;
- SQLite persistence;
- Today dashboard;
- correct persistence after app close/reopen;
- correct timer recovery after device restart.

At this point the application should be usable for real Maubank and Nissan work.

### Subsequent V1 capability slices

- budgets;
- milestones;
- dependencies;
- planning;
- Gantt/timeline;
- economic analytics;
- billing closures;
- advanced dashboard;
- local alerts;
- Excel export;
- PDF report;
- backup;
- restore.

## 7. Confirmed integrity rules

- At most one work interval may be active globally.
- Every time entry belongs to a project.
- Task association is optional; when present, task and time entry must belong to the same project.
- Dependency cycles are forbidden.
- Completing a task is a deliberate user action; consuming estimated hours does not automatically complete it.
- Starting work on a completed task should prompt to reopen it.
- BLOCKED is derived from incomplete dependencies, not manually persisted as a mutable status.
- Actual time, aggregate progress, deviations, and other calculated aggregates are derived rather than manually maintained.
- A time entry or expense cannot belong to two active billing closures.
- Closed data cannot be modified until the relevant closure is reopened.
- Historical commercial rates and FX rates used for closed/billed data must remain stable.
- Master data with historical references is archived rather than physically deleted.
- Unclosed time entries and expenses created by mistake may be physically deleted.
- Attachment/database inconsistencies must be detectable.

## 8. Deletion/archival policy

Entities such as clients, projects, tasks, activities, and milestones with historical usage are archived rather than deleted.

Time entries and expenses may be deleted while they are not part of a billing closure. Once closed, they are immutable until that closure is reopened.

## 9. Design status

Approved:

- product intent;
- V1 scope decisions listed above;
- platform choice;
- offline-first architecture;
- architectural boundaries;
- future extensibility principle;
- first usable milestone;
- integrity/deletion policies;
- multicurrency approach;
- backup/restore approach.

Still to be completed and explicitly approved:

1. Domain model and business rules.
2. User flows, screens, dashboard, reporting and error handling.
3. Testing strategy, delivery boundaries, operational constraints, and final design review.
