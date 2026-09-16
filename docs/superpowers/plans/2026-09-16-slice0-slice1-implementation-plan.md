# Freelance Ops — Slice 0 + Slice 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver an Android-first, offline-first first usable build of Freelance Ops that lets the user create projects, select an active project from Today, start/pause/resume/stop a persistent timer, enter time manually, review history, and record basic expenses without any backend.

**Architecture:** Expo + React Native + TypeScript with Expo Router for navigation and `expo-sqlite` for local persistence. UI depends on application use cases; application depends on domain interfaces; SQLite and filesystem adapters live in infrastructure. No route or screen may issue SQL directly.

**Tech Stack:** Expo SDK resolved by `create-expo-app@latest` at implementation time, Expo Router, React Native, TypeScript strict mode, `expo-sqlite`, Jest + `jest-expo`, React Native Testing Library, Expo Router testing utilities, GitHub Actions, Maestro for the critical Android end-to-end flow.

**Spec:**
- `docs/superpowers/specs/2026-09-16-freelance-ops-v1-design.md`
- `docs/superpowers/specs/2026-09-16-freelance-ops-v1-domain-model.md`
- `docs/superpowers/specs/2026-09-16-freelance-ops-v1-ui-ux.md`
- `docs/superpowers/specs/2026-09-16-freelance-ops-v1-quality-delivery.md`
- `docs/assets/concepts/freelance-ops-v1-ui-concept.jpg`

## Global Constraints

- Android-first, cross-platform codebase.
- Offline-first; no backend, authentication, cloud sync, Firebase, Supabase, or mandatory external API.
- Exactly one active work interval globally.
- Project is the only mandatory selection when starting work; task, activity, and description are optional.
- Timer state must survive app backgrounding, app termination, screen lock, and device restart by persisting timestamps.
- Every time entry belongs to exactly one project.
- Master data with history is archived rather than physically deleted.
- Money uses integer minor units; never use binary floating-point as the stored monetary source of truth.
- Time duration is derived from UTC timestamps; do not store decimal hours as the source of truth.
- UI code must not access SQLite directly.
- TypeScript `strict` must remain enabled.
- The repository must never contain real client data, receipts, exports, backups, databases, or secrets.
- Use standard Expo Router primitives; do not adopt experimental navigation APIs.
- Prefer `withExclusiveTransactionAsync` for critical SQLite state transitions where ordering matters.

---

## File Structure

The first two slices should converge on this structure:

```text
app/
├── _layout.tsx
├── (tabs)/
│   ├── _layout.tsx
│   ├── index.tsx                 # Today
│   ├── projects.tsx
│   ├── tasks.tsx
│   ├── planning.tsx              # placeholder in Slice 1
│   └── more.tsx
├── start-work.tsx
├── time-entry/
│   └── [id].tsx
├── client/
│   └── edit.tsx
├── project/
│   ├── edit.tsx
│   └── [id].tsx
├── task/
│   └── edit.tsx
└── expense/
    └── edit.tsx

src/
├── domain/
│   ├── shared/
│   ├── clients/
│   ├── projects/
│   ├── tasks/
│   ├── activities/
│   ├── time-tracking/
│   └── expenses/
├── application/
│   ├── clients/
│   ├── projects/
│   ├── tasks/
│   ├── activities/
│   ├── time-tracking/
│   └── expenses/
├── infrastructure/
│   ├── database/
│   │   ├── database.ts
│   │   ├── migrations.ts
│   │   └── migrations/
│   ├── repositories/
│   └── filesystem/
├── providers/
│   └── application-provider.tsx
└── ui/
    ├── components/
    ├── theme/
    └── hooks/

__tests__/
├── domain/
├── application/
├── infrastructure/
└── ui/

e2e/maestro/
└── critical-timer-flow.yaml

.github/workflows/
└── ci.yml
```

The structure may be adjusted only when an Expo convention requires it; domain/application/infrastructure boundaries must remain intact.

---

## Task 1 — FND-001: Scaffold the application and repository guardrails

**Files:**
- Create/replace: `package.json`, `package-lock.json`, `app.json`, `tsconfig.json`, `eslint.config.js`
- Create: `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, tab route placeholders
- Create: `src/ui/theme/tokens.ts`
- Create: `AGENTS.md`
- Create/modify: `.gitignore`

**Interfaces:**
- Produces a bootable Expo Router app with five tab destinations: Today, Projects, Tasks, Planning, More.
- Produces repository-wide rules in `AGENTS.md` that point agents to the approved specs and prohibit SQL in UI code.

- [ ] Initialize from `npx create-expo-app@latest` using the standard TypeScript/Expo Router template; preserve the generated compatible Expo package versions and commit the lockfile.
- [ ] Enable TypeScript strict mode and ensure `npx tsc --noEmit` succeeds.
- [ ] Replace example routes with the approved five-tab shell and placeholder content only.
- [ ] Add reusable spacing, typography, radius, and surface tokens in `src/ui/theme/tokens.ts`; do not hard-code a large visual system yet.
- [ ] Add `.gitignore` rules for `.env*`, `*.sqlite`, `*.db`, `backups/`, `exports/`, `receipts/`, `attachments/`, generated Android build output, and local IDE files.
- [ ] Write root `AGENTS.md` with the approved architecture, source-of-truth documents, PR expectations, and rule that no real customer data may enter the repository.
- [ ] Run `npm run lint` and `npx tsc --noEmit`.
- [ ] Commit as `chore: scaffold Expo app foundation`.

**Acceptance:** App launches locally, tabs navigate, TypeScript is strict, and no sample Expo tutorial screens remain.

---

## Task 2 — FND-002: Establish automated tests and CI

**Files:**
- Modify: `package.json`, `tsconfig.json`
- Create: `jest.config.js` or equivalent current Expo Jest configuration
- Create: `__tests__/smoke/navigation.test.tsx`
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces scripts `test`, `test:ci`, `typecheck`, and `lint` used by all later issues.

- [ ] Install Jest using Expo-compatible packages (`jest-expo`, Jest, Jest types, React Native Testing Library) through `npx expo install` where Expo controls versions.
- [ ] Configure Expo Router testing utilities and keep tests outside `app/`.
- [ ] Write a failing smoke test that expects the Today route and bottom navigation to render.
- [ ] Make the smoke test pass using the Task 1 shell.
- [ ] Add CI on pushes/PRs that runs `npm ci`, `npm run typecheck`, `npm run lint`, and `npm run test:ci`.
- [ ] Ensure CI contains no build secrets and does not perform cloud builds.
- [ ] Commit as `ci: add automated quality gates`.

**Acceptance:** A PR with a type error, lint error, or failing Jest test cannot pass CI.

---

## Task 3 — FND-003: Add SQLite bootstrap, migrations, and repository database boundary

**Files:**
- Create: `src/infrastructure/database/database.ts`
- Create: `src/infrastructure/database/migrations.ts`
- Create: `src/infrastructure/database/migrations/001_initial.ts`
- Create: `src/infrastructure/database/schema-version.ts`
- Create: `src/providers/application-provider.tsx`
- Modify: `app/_layout.tsx`
- Test: `__tests__/infrastructure/migrations.test.ts`

**Interfaces:**
- Produces `initializeDatabase(db)` and migration versioning.
- Produces an application provider from which route components obtain use cases, never a raw SQLite handle.

- [ ] Install `expo-sqlite` with Expo's package installer.
- [ ] Define migration `001_initial` with workspace, clients, projects, tasks, activities, time_entries, work_intervals, expenses, and attachment metadata required by Slice 1. Include `created_at`, `updated_at`, archive fields where specified, and foreign keys.
- [ ] Store monetary amounts as integer minor units and timestamps as UTC text values plus timezone identifiers where required.
- [ ] Enable WAL and `PRAGMA foreign_keys = ON` on initialization.
- [ ] Implement ordered schema migration using `PRAGMA user_version` (or one explicit equivalent) and make each migration atomic.
- [ ] Ensure critical write helpers can execute in `withExclusiveTransactionAsync`.
- [ ] Add an application provider that receives/creates infrastructure repositories and exposes application services without exposing the database to screens.
- [ ] Add migration tests covering fresh database creation and idempotent initialization.
- [ ] Commit as `feat: add SQLite migration foundation`.

**Acceptance:** A clean install creates schema version 1, reopening does not rerun destructive migration logic, and foreign-key violations are rejected.

---

## Task 4 — DOM-001: Implement clients, projects, tasks, and activities end to end

**Files:**
- Create domain entities/interfaces under `src/domain/{clients,projects,tasks,activities}/`
- Create use cases under `src/application/{clients,projects,tasks,activities}/`
- Create SQLite repository adapters under `src/infrastructure/repositories/`
- Implement screens: client/project/task editors, Projects tab, Tasks tab
- Tests: domain, use-case, repository, and key UI tests

**Interfaces:**
- Produces CRUD/archive use cases and `listActiveProjects()` consumed by Today and Start Work.
- Produces `listTasksForProject(projectId)` and `listActiveActivities()` consumed by Start Work.

- [ ] Define UUID-based entity types and repository contracts before SQLite-specific implementations.
- [ ] Write tests for archive semantics: entities with history remain queryable by ID but disappear from active lists.
- [ ] Implement client create/edit/archive.
- [ ] Implement project create/edit/archive with `PLANNED | ACTIVE | ON_HOLD | COMPLETED | CANCELLED`, project currency, and planned dates.
- [ ] Implement task create/edit/archive with optional estimate and planned dates; dependency logic remains out of Slice 1.
- [ ] Implement configurable activities with seeded values Development, Analysis, Meeting, Documentation, Support, Management, Other.
- [ ] Implement Projects and Tasks screens using application use cases only.
- [ ] Ensure a project automatically becomes ACTIVE when the first real work interval begins, unless already ACTIVE/ON_HOLD/COMPLETED/CANCELLED rules require explicit handling.
- [ ] Commit as `feat: add core work entities`.

**Acceptance:** User can create Nissan/Maubank-style clients, projects, optional tasks, and activities entirely offline and see them after app restart.

---

## Task 5 — TIM-001: Implement persistent timer domain and application service

**Files:**
- Create: `src/domain/time-tracking/time-entry.ts`, `work-interval.ts`, repository interfaces
- Create: `src/application/time-tracking/time-tracking-service.ts`
- Create: `src/infrastructure/repositories/sqlite-time-entry-repository.ts`
- Tests: `__tests__/domain/time-tracking/*`, `__tests__/application/time-tracking/*`, repository integration tests

**Interfaces:**
- Produces `startWork(input)`, `pauseWork()`, `resumeWork()`, `stopWork()`, `getActiveSession()`, `getElapsedDuration(now)`.
- `startWork` requires `projectId`; `taskId`, `activityId`, and `description` are optional.

- [ ] Write tests first for the invariant `open work intervals <= 1`.
- [ ] Model a logical TimeEntry with one or more WorkIntervals.
- [ ] Persist start/end UTC timestamps and the IANA timezone captured at each interval start.
- [ ] Implement START as a critical exclusive transaction that creates a TimeEntry and one open WorkInterval.
- [ ] Implement PAUSE by closing the currently open interval without closing the TimeEntry.
- [ ] Implement RESUME by creating a new interval under the paused TimeEntry.
- [ ] Implement STOP by closing any open interval and marking the logical session complete according to the chosen representation.
- [ ] Reject task/project mismatches.
- [ ] Derive elapsed duration from persisted timestamps; never persist a ticking counter.
- [ ] Test reconstruction after service re-instantiation to simulate process death/reopen.
- [ ] Commit as `feat: implement persistent time tracking`.

**Acceptance:** Service reconstruction from SQLite recovers the correct active/paused state and elapsed duration without any in-memory state from the previous process.

---

## Task 6 — UX-001: Implement Today active-project launcher and Start Work flow

**Files:**
- Implement: `app/(tabs)/index.tsx`
- Implement: `app/start-work.tsx`
- Create reusable components under `src/ui/components/`
- Tests: `__tests__/ui/today.test.tsx`, `start-work.test.tsx`

**Interfaces:**
- Consumes `listActiveProjects`, `listTasksForProject`, `listActiveActivities`, and time-tracking service APIs.

- [ ] Build Today from the approved concept: list all active projects prominently, including concise status/progress metadata available in Slice 1.
- [ ] Selecting a project opens Start Work with that project preselected.
- [ ] Allow changing the selected project before starting.
- [ ] Keep Task, Activity, and Description optional.
- [ ] Starting work requires no network call and no additional confirmation when there is no active timer.
- [ ] If a timer is already active, require explicit `Stop current & start selected` or cancel; never allow two open intervals.
- [ ] When a timer is active, Today changes to an active-session state with elapsed duration, Pause/Resume, and Stop controls while preserving quick project context.
- [ ] Match the approved concept's hierarchy rather than attempting pixel-perfect reproduction of generated imagery.
- [ ] Commit as `feat: add fast Today start-work flow`.

**Acceptance:** Normal path is `open app -> tap active project -> Start Work`, with Project as the only required field.

---

## Task 7 — TIM-002: Add manual time entry, history, and controlled editing

**Files:**
- Create application use cases for manual create/update/delete/list history
- Implement: time history UI and `app/time-entry/[id].tsx`
- Tests for duration, overlap policy, edit/delete, and archived master-data references

**Interfaces:**
- Produces project/day/week history queries consumed by Today summary and later reports.

- [ ] Support manual entry by start/end timestamps and by explicit duration input converted into a consistent interval representation.
- [ ] Require project; task/activity remain optional.
- [ ] Preserve original timezone context.
- [ ] List recent entries grouped by local work date.
- [ ] Permit editing/deleting entries not in a closed billing closure.
- [ ] Keep overlap warning non-blocking in Slice 1 except the live-timer single-open-interval invariant.
- [ ] Ensure editing cannot change a task to one belonging to another project.
- [ ] Commit as `feat: add manual time and history`.

**Acceptance:** User can repair a forgotten timer session without corrupting live timer state or aggregate durations.

---

## Task 8 — EXP-001: Add basic offline expenses and receipt attachments

**Files:**
- Create expense domain/repository/use cases
- Implement: `app/expense/edit.tsx`
- Create filesystem attachment adapter
- Tests for amount serialization, project relationship, attachment metadata, and missing-file detection

**Interfaces:**
- Expense stores original currency/amount and project currency/converted amount fields from the V1 schema even if advanced FX workflows arrive later.

- [ ] Store original and project amounts in integer minor units.
- [ ] Store FX rate as a decimal string when currencies differ; do not use JS floating-point as the persisted financial source of truth.
- [ ] Support date, project, category, description, reimbursable flag, and billable flag if retained by the final schema.
- [ ] Copy chosen receipt files into app-controlled local storage; SQLite stores URI, filename, MIME type, file size, and checksum metadata.
- [ ] Detect an attachment reference whose file no longer exists and surface a recoverable integrity warning.
- [ ] Add expense list/summary entry points from project and Today quick actions.
- [ ] Commit as `feat: add local expense tracking`.

**Acceptance:** Expenses and attachments survive app restart and require no online service.

---

## Task 9 — REL-001: Prove resilience and produce the first usable Android build

**Files:**
- Create: `e2e/maestro/critical-timer-flow.yaml`
- Modify: scripts/docs as needed for Android local build
- Create: `docs/runbooks/android-first-usable-build.md`
- Create: `docs/runbooks/real-data-readiness.md`

**Interfaces:**
- Consumes all Slice 0/1 functionality and provides the release checkpoint for real usage.

- [ ] Write the critical E2E flow: create client -> create project -> Today -> select project -> start -> background/reopen -> pause -> resume -> stop -> verify history.
- [ ] Add manual device checks that cannot be simulated reliably: screen lock, app kill from recents/settings, device restart, and timezone change.
- [ ] Verify SQLite data persists across app process death and device restart.
- [ ] Verify no Internet connection is required for any Slice 1 workflow.
- [ ] Run typecheck, lint, unit tests, integration tests, and E2E critical flow.
- [ ] Compile and run an Android release-mode build locally using the supported Expo/Android toolchain; document exact commands and artifact location used by the project.
- [ ] Complete `real-data-readiness.md`; it must explicitly record pass/fail for the approved SAFE FOR REAL DATA criteria.
- [ ] Commit as `release: validate first usable Android build`.

**Acceptance:** The build is not declared ready until the critical timer flow and device resilience checks pass. Only then may the app be used for real Maubank/Nissan data.

---

## Dependency Order

```text
FND-001
   ├── FND-002
   └── FND-003
          ↓
       DOM-001
          ↓
       TIM-001
          ↓
       UX-001
          ↓
       TIM-002
          ↓
       EXP-001
          ↓
       REL-001
```

`FND-002` can proceed in parallel with `FND-003` after FND-001. All later work should merge sequentially unless an agent can prove there is no shared-file conflict.

## Review Gates

Every PR must answer:

1. Which approved spec requirement does this implement?
2. Which invariant can this change break?
3. What automated tests prove the expected behavior?
4. Does any screen access SQLite directly? If yes, reject the PR.
5. Does the change introduce network dependence? If yes, reject unless explicitly approved as a later version.
6. Does it place real client data or secrets in the repository? If yes, reject and purge before merge.

## Self-Review

- Spec coverage: Slice 0 and Slice 1 scope from the approved quality/delivery document is covered by Tasks 1-9.
- Timer invariants: covered by TIM-001, UX-001, REL-001.
- Offline persistence and migrations: covered by FND-003 and REL-001.
- Clients/projects/tasks/activities: covered by DOM-001.
- Manual time/history: covered by TIM-002.
- Basic expenses/receipts: covered by EXP-001.
- Today active-project UX: covered by UX-001.
- CI/testing: covered by FND-002 and REL-001.
- No V2 scope (AI, backend, sync, formal invoicing) is included.

## Completion Condition

Slice 0 + Slice 1 are complete only when `REL-001` records a passing **SAFE FOR REAL DATA** checkpoint on a physical Android device.