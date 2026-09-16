# Freelance Ops V1 — Approved Design Index

Date: 2026-09-16
Status: **DESIGN COMPLETE — APPROVED**
Repository: `Limman-qaidev/freelance-ops`
Branch: `docs/v1-design`

## Product principle

> Freelance Ops debe ser suficientemente simple para empezar a registrar trabajo en segundos, pero suficientemente estructurado para responder posteriormente cuánto se trabajó, dónde se gastó ese tiempo, cuánto costó, cuánto puede facturarse y si el proyecto está desviándose respecto a su planificación.

## Approved design set

### 1/4 — Product and architecture

`2026-09-16-freelance-ops-v1-design.md`

Defines:

- product intent and V1 scope;
- Android-first / cross-platform strategy;
- React Native + Expo + TypeScript + SQLite;
- offline-first architecture;
- repository/domain/application/infrastructure boundaries;
- future backend/synchronization extensibility;
- first usable-build target;
- integrity and archival baseline.

### 2/4 — Domain model and business rules

`2026-09-16-freelance-ops-v1-domain-model.md`

Defines:

- Workspace, Client, Project and CommercialTerms;
- Task, TaskDependency and Milestone;
- Activity;
- TimeEntry and WorkInterval;
- Expense and ExpenseAttachment;
- BillingClosure;
- task state semantics;
- dependency behavior;
- progress and effort semantics;
- multicurrency and historical FX preservation;
- billing and archival integrity.

### 3/4 — UX, screens and flows

`2026-09-16-freelance-ops-v1-ui-ux.md`

Defines:

- Today as the operational home screen;
- all active projects visible directly from Today;
- project selection as the fastest normal entry point into time tracking;
- Project as the only mandatory dimension required to start work;
- start-work flow;
- Projects, Project Detail, Tasks and Planning;
- Expenses and Billing/Finance;
- reporting/export behavior;
- backup/restore UX;
- error and offline behavior.

Approved visual reference:

`../assets/concepts/freelance-ops-v1-ui-concept.jpg`

### 4/4 — Quality, integrity and delivery

`2026-09-16-freelance-ops-v1-quality-delivery.md`

Defines:

- monetary/time integrity rules;
- SQLite transactions and migrations;
- Tier-1 timer reliability;
- progress/planning coverage rules;
- hourly, fixed-price and hour-package semantics;
- billing closure line semantics;
- testing strategy;
- backup/restore validation;
- local alerts;
- repository privacy rules;
- CI baseline;
- Slice 0–4 delivery strategy;
- first-real-data Definition of Done.

## Approved V1 delivery slices

```text
Slice 0 — Foundation
    ↓
Slice 1 — First usable build
    ↓
Slice 2 — Project Control
    ↓
Slice 3 — Commercial & Finance
    ↓
Slice 4 — Reporting & Resilience
```

The priority is Slice 0 + Slice 1. The first installable Android build must allow real Maubank and Nissan work to be tracked safely before the remainder of V1 is complete.

## Next phase

The product-design phase is closed. The next source-of-truth artifact is the implementation plan under:

`docs/superpowers/plans/`

Implementation must be decomposed into small GitHub issues and pull requests, with Slice 0 and Slice 1 prioritized until an Android build is `SAFE FOR REAL DATA`.
