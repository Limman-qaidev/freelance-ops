# Freelance Ops — Phase 1 UI Contract

Date: 2026-09-18  
Status: **APPROVED / CANONICAL**  
Owner: Product Owner  
Scope: Phase 1 mobile UI reconstruction

## 1. Purpose

This document freezes the approved Phase 1 mobile product direction and exists to prevent further visual or interaction drift.

Implementation quality is not defined only by passing tests or preserving domain behavior. For Phase 1 UI work, **visual and interaction conformance to the approved concept is part of correctness**.

No implementer may substantially reinterpret the approved composition without explicit Product Owner approval.

## 2. Canonical sources and precedence

### 2.1 Primary visual source

The canonical visual reference is:

`docs/assets/concepts/freelance-ops-v1-ui-concept.png`

The PNG is authoritative for:

- screen composition;
- information hierarchy;
- relative prominence of controls;
- navigation placement;
- information density;
- visible Phase 1 surfaces;
- project/task/expense/finance presentation;
- overall visual tone.

The old JPG is not an approved implementation reference.

### 2.2 Functional/domain sources

Existing approved product and domain specifications remain authoritative for business semantics, persistence, timer invariants, money handling, offline behavior, and data integrity.

Relevant supporting documents include:

- `docs/superpowers/specs/2026-09-16-freelance-ops-v1-design.md`
- `docs/superpowers/specs/2026-09-16-freelance-ops-v1-domain-model.md`
- `docs/superpowers/specs/2026-09-16-freelance-ops-v1-ui-ux.md`
- `docs/superpowers/specs/2026-09-16-freelance-ops-v1-quality-delivery.md`
- `docs/superpowers/specs/2026-09-17-freelance-ops-ui-rebuild.md`
- `docs/design/ui-rebuild-phase1-visual-blueprint.md`

### 2.3 Conflict rule

When sources conflict:

1. business/domain invariants remain governed by the approved functional/domain specs;
2. for visual composition and interaction presentation, **this contract wins**;
3. then the approved PNG wins;
4. supporting reconstruction documents are subordinate;
5. implementer preference is last.

A supporting document must never be used to justify a visual result that no longer resembles the approved PNG at screen-composition level.

## 3. Approved product character

Freelance Ops Phase 1 must feel like a compact professional mobile operations application for freelance/project work.

It must be:

- operational;
- structured;
- clear;
- compact;
- immediately actionable;
- information-efficient;
- recognizably mobile.

It must not look like:

- a generic CRUD scaffold;
- a document or Word-like layout;
- a loose collection of forms;
- an oversized consumer-card dashboard;
- an unfinished development shell;
- a visual redesign unrelated to the approved concept.

The approved concept expresses the product promise:

> Start fast. Work, project and billing operations — all in one place.

## 4. Canonical Phase 1 surfaces

The approved concept explicitly defines the following primary Phase 1 surfaces:

1. Today
2. Start Work
3. Projects
4. Project Details
5. Tasks
6. Planning
7. New Expense
8. Billing & Finance

These surfaces are required. They may not be omitted, replaced by placeholders, or treated as optional future polish.

## 5. Global application shell

### 5.1 Bottom navigation

Primary destinations remain, in this exact order:

1. Today
2. Projects
3. Tasks
4. Planning
5. More

The approved concept shows the bottom navigation consistently across all eight canonical screens, including secondary/detail flows such as:

- Start Work;
- Project Details;
- New Expense;
- Billing & Finance.

Therefore the Phase 1 implementation must preserve a coherent persistent tab shell. Normal navigation into these approved secondary surfaces must not make the application appear to leave its primary product shell.

The tab bar must use:

- stable vector icons;
- visible labels;
- clear selected state;
- compact height;
- consistent spacing.

No emoji, Unicode glyphs, temporary text icons, or platform-dependent placeholders are acceptable.

### 5.2 Header model

Headers must be compact and consistent.

Required characteristics:

- strong left alignment;
- predictable title placement;
- restrained vertical space;
- back navigation where shown by the concept;
- contextual actions only where needed.

Forbidden:

- large document-style title blocks;
- explanatory subtitle paragraphs on every screen;
- inconsistent title alignment;
- excessive whitespace before useful content.

### 5.3 Visual tone

The canonical concept is a light, clean productivity UI with:

- neutral light surfaces;
- blue primary/action emphasis;
- green active/success statuses;
- limited semantic accent colors;
- subtle borders and elevation;
- compact rounded cards/fields;
- high information density without clutter.

Theme support may extend this system to dark mode, but dark mode must preserve the same hierarchy, affordances, density, and readability.

Do not replace the canonical blue-led product identity with a different visual language unless the Product Owner explicitly approves that change.

## 6. Today

### Required composition

The screen must contain:

- title: Today / localized equivalent;
- date line directly below;
- compact status/connectivity control at top-right where applicable;
- section heading for Active projects;
- active project list;
- one dominant work-start action;
- bottom navigation.

### Project item anatomy

Each visible active project should communicate, where data exists:

- project identity/icon;
- project name;
- short project/context description;
- Active status;
- delivery/effort progress;
- due date or no-date state;
- compact percentage/progress representation.

### Primary intent

Today is the operational launcher for current work.

It must not be converted into an analytics dashboard or passive home page.

## 7. Start Work

### Required composition

The screen must contain:

- back action;
- Start Work title;
- fixed selected-project identity block;
- Task selector — optional;
- Activity selector — optional;
- Description field — optional;
- description counter where implemented by the approved design;
- prominent Start Work action;
- persistent application shell/bottom navigation.

### Behavioral rules

- project is the only mandatory work dimension;
- task, activity and description remain optional;
- entering from a project should preserve that project context;
- active-timer conflict rules remain governed by existing timer semantics.

This is a focused start form, not a wizard and not a project-administration screen.

## 8. Projects

### Required composition

The screen must contain:

- Projects title;
- search field;
- compact filter control;
- segmented states for All / Active / Archived;
- project list/cards;
- create-project action;
- bottom navigation.

### Project item anatomy

Project rows/cards must communicate, where available:

- project identity/icon;
- project name;
- short description;
- status;
- Delivery progress;
- Effort progress;
- due date;
- client/context.

The screen is a project operations list, not an unlabeled form.

## 9. Project Details

### Required composition

The screen must contain:

- back action;
- Project Details title;
- contextual overflow action;
- project identity/header;
- active status;
- project date range where available;
- compact KPI summary;
- tabbed detail navigation;
- selected tab content;
- bottom navigation.

### Required detail tabs

Exactly these concepts must be present:

- Overview
- Tasks
- Time
- Expenses
- Economics

### KPI intent

The approved concept includes operational/economic metrics such as:

- Delivery;
- Effort;
- Calendar;
- Budget;
- Expenses;
- Remaining.

The exact data availability may depend on domain state, but the page must preserve this compact project-control intent.

A long stacked pseudo-document is not an acceptable substitute for the approved tabbed project-detail structure.

## 10. Tasks

### Required composition

The screen must contain:

- Tasks title;
- project context/selector;
- segmented task status filters;
- milestone grouping;
- task rows;
- bottom navigation.

### Task row intent

A row must clearly communicate:

- state;
- task identity;
- schedule/date context when available;
- blocked state/reason where relevant.

Milestones must expose their own progress/count.

The result must read as an execution tracker, not a generic CRUD editor.

## 11. Planning

### Required composition

The screen must contain:

- Planning title;
- visible period/month heading;
- previous/next period controls;
- week/time columns;
- workstream/task rows;
- colored timeline bars;
- milestone indicator(s);
- legend;
- bottom navigation.

Planning is a compact timeline/Gantt-like operational view.

A text-only list of planned items is not a valid substitute.

## 12. New Expense

### Required composition

The screen must use visible, explicit labels and contain the concepts shown in the approved design:

- Project;
- Date;
- Amount;
- Currency;
- Exchange rate;
- Converted amount;
- Category;
- Billable;
- Receipt;
- Take photo;
- Choose file.

Every field must be immediately understandable without guessing.

Repeated expense creation must not pollute the navigation back stack.

The bottom navigation remains part of the coherent application shell.

## 13. Billing & Finance

Billing & Finance is mandatory in Phase 1.

### Required composition

The screen must contain:

- Billing & Finance title;
- top tabs for Summary / Expenses / Time / Invoices;
- period-closure context;
- project/date-range context;
- Ready/closure status;
- financial summary rows;
- highlighted total-to-invoice value;
- Review items action;
- Close period action;
- bottom navigation.

### Required summary concepts

At minimum:

- total time;
- total expenses;
- billable time;
- billable expenses;
- total to invoice.

This surface must not be omitted or replaced by a generic More/Reports placeholder.

## 14. Localization

Spanish and English use the same screen implementation.

Requirements:

- no mixed-language leakage;
- all visible controls, statuses, tabs and labels use the localization layer;
- dates, times, numbers and currency formatting are locale-aware;
- layout must tolerate Spanish expansion without changing the approved information hierarchy.

## 15. Theme

Light mode is the canonical visual reference because the approved concept is light.

System / Light / Dark preferences may remain supported, but:

- dark mode must preserve hierarchy;
- labels and input values must remain clearly readable;
- no screen may become visually ambiguous in dark mode;
- dark support must not be used to reinterpret the approved light-mode composition.

## 16. Accessibility

Acceptance requires:

- semantic roles and labels;
- accessible names for icon-only actions;
- minimum 44 dp touch targets;
- state communication that does not rely on color alone;
- predictable reading/focus order;
- usable large-text behavior;
- keyboard-safe forms.

Accessibility improvements may not materially alter the approved composition without Product Owner review.

## 17. Anti-drift implementation rules

### 17.1 No free redesign

An implementation agent may not invent a substantially different layout because it appears cleaner, more modern, more Material, or easier to implement.

If the approved concept cannot be reconciled with an existing functional requirement, stop and surface the conflict.

### 17.2 One visual slice at a time

Large end-to-end visual rewrites without intermediate Product Owner review are forbidden.

Required delivery order:

1. application shell + Today;
2. Start Work;
3. Projects;
4. Project Details;
5. Tasks;
6. Planning;
7. New Expense;
8. Billing & Finance.

A dependent visual slice must not race far ahead of an unresolved rejected slice.

### 17.3 Product Owner visual gate

For each material slice:

1. automated checks must pass;
2. implementation must be technically reviewed;
3. the slice must be exercised on physical Android;
4. Product Owner must explicitly record Approved / Approved with deviations / Rejected.

Green CI is never sufficient visual approval.

### 17.4 No hidden substitutions

A required product concept may not be silently represented by a different screen.

Examples:

- a generic expense list does not replace New Expense;
- project Economics does not replace Billing & Finance;
- a list does not replace the approved Planning timeline;
- stacked project sections do not replace the approved Project Details tabs.

### 17.5 Stop on rejection

If a material screen is rejected by the Product Owner:

- dependent visual expansion stops;
- the rejection is documented;
- the rejected slice is corrected before another large UI batch continues.

## 18. Definition of done

Phase 1 visual reconstruction is complete only when:

- all eight canonical surfaces exist;
- all conform to this contract and the approved PNG at composition level;
- navigation/back behavior is coherent;
- the bottom shell behaves consistently;
- ES and EN are coherent;
- Light and Dark are readable;
- accessibility requirements pass;
- automated regression is green;
- physical Android validation is complete;
- Product Owner explicitly approves the final result.

## 19. Final correctness rule

If the application no longer clearly resembles the approved PNG at screen-composition and information-hierarchy level, the implementation is not Phase 1-conformant even if:

- tests pass;
- code quality is high;
- domain behavior works;
- localization works;
- CI is green.

Visual conformance is part of the product contract.
