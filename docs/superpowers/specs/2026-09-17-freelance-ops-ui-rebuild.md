# Freelance Ops — Mobile UI Rebuild Design

Date: 2026-09-17
Status: Approved reconstruction direction
Issue: UI-002 / #24

## 1. Purpose

This document defines the visual and interaction-layer reconstruction required after the first physical Android release candidate exposed a substantial gap between the implemented interface and the approved product intent.

This is a presentation-layer reconstruction. Existing domain rules, persistence invariants, offline-first behavior, timer semantics, expense semantics, project/task semantics, and the functional requirements in the existing V1 specifications remain authoritative unless a separate approved issue explicitly changes them.

The existing functional UI specification remains the baseline:

- `docs/superpowers/specs/2026-09-16-freelance-ops-v1-ui-ux.md`
- visual reference: `docs/assets/concepts/freelance-ops-v1-ui-concept.jpg`

If this document conflicts with a functional rule in the earlier approved specification, the functional rule wins. This document controls the reconstruction-specific visual system, localization, theming, delivery model and visual acceptance gates.

## 2. Product-quality target

The rebuilt mobile UI must feel like a serious professional productivity tool rather than a scaffold or a consumer-card-heavy application.

Required qualities:

- compact and information-efficient;
- visually restrained;
- clear hierarchy without oversized empty areas;
- fast daily capture;
- predictable, recognizable controls;
- real iconography rather than textual glyph placeholders;
- actionable empty states;
- consistent behavior across screens;
- legible in both light and dark themes;
- resilient to Spanish and English text length.

The design language is hybrid:

- minimal, flat, productivity-oriented base;
- native/Material interaction patterns when they improve mobile usability, such as pickers, sheets, menus, date selection and system feedback;
- no decorative complexity that slows primary workflows.

## 3. Visual identity

The previous blue-led visual identity is replaced.

New direction:

- neutral graphite foundation;
- petroleum/teal as the primary accent family;
- semantic success, warning and error colors remain independent of the brand accent;
- restrained surfaces, borders and elevation;
- typography and spacing prioritize density and scanability.

The design system must expose semantic tokens rather than screen-specific color constants.

At minimum it must define:

- background and elevated/surface backgrounds;
- primary/secondary/muted text;
- borders/dividers;
- primary accent and pressed/selected states;
- success/warning/error/info semantics;
- disabled states;
- typography scale;
- spacing scale;
- radii;
- touch targets;
- icon sizing.

## 4. Theme behavior

The application supports three theme preferences:

1. System
2. Light
3. Dark

`System` is the default.

The application follows the operating-system color scheme while System is selected. A manual Light or Dark selection overrides the OS and is persisted locally.

Theme preference is presentation state only. It must not alter domain or operational data.

Every materially changed screen must be visually checked in both Light and Dark before it can be considered implementation-complete.

## 5. Localization and locale behavior

The application supports Spanish and English fully.

Default behavior:

- use Spanish when the device language resolves to Spanish;
- use English when the device language resolves to English;
- use Spanish as fallback for unsupported locales;
- allow persistent manual language override from Settings.

All user-visible application strings must pass through the localization layer once that layer exists. Do not maintain separate screen implementations per language.

Locale-aware presentation includes:

- dates;
- times;
- numbers;
- currencies and monetary display.

Stored source-of-truth values must not be changed merely to support presentation formatting.

## 6. Primary navigation

Primary navigation remains exactly five destinations:

Spanish:

1. Hoy
2. Proyectos
3. Tareas
4. Planificación
5. Más

English:

1. Today
2. Projects
3. Tasks
4. Planning
5. More

Each destination uses a stable real icon and a visible text label. The tab bar must remain compact and immediately understandable.

Broken or font-dependent text glyphs are not acceptable as navigation icons.

## 7. Screen-level reconstruction rules

Existing functional behavior remains as specified in the approved V1 UI/UX document. The reconstruction changes how that behavior is presented.

### 7.1 Today / Hoy

Today remains the primary entry point.

Visual priorities:

1. compact page header with current day/date context;
2. active session, when present, as the highest-priority element with elapsed time and Pause/Resume/Stop;
3. active projects as compact, scannable rows/cards;
4. direct project-to-Start-Work flow;
5. secondary actions for manual time and expense capture;
6. actionable empty state with a clear route to create a project.

A user should understand what to do within seconds of opening the app.

### 7.2 Projects / Proyectos

Projects is a management view, not an unlabeled form.

It must expose clear creation, search/filtering and project rows/cards with relevant status/context. Project detail continues to follow the approved sections from the original spec.

### 7.3 Tasks / Tareas

Tasks is an execution-oriented view. It must make task identity, project context, status, blocking state, timing/estimate context and actionable work controls understandable without entering every detail screen.

### 7.4 Planning / Planificación

Planning must be an actual V1 planning surface, not development placeholder copy. It follows the simplified timeline/calendar/Gantt intent from the existing approved specification.

### 7.5 More / Más

More is a structured secondary-navigation surface rather than one long mixed maintenance form.

It groups secondary areas such as time history, expenses, settings, language/theme preferences and other V1 secondary operations into understandable destinations.

## 8. Forms and controls

Forms must use visible labels and recognizable control affordances.

Required behavior:

- no unlabeled white boxes acting as selectors;
- selection controls communicate current value and affordance;
- destructive actions are visually and semantically distinct;
- validation is specific and proximal to the failing field/action;
- keyboard and focus behavior must not hide the current field/action;
- optional data must remain optional and must not block STOP or other critical workflow exits.

## 9. Empty, loading, error and feedback states

Every screen with potentially empty data must explain the next useful action.

Examples:

- no projects -> create project;
- no tasks -> create/select project task flow;
- no history -> explain what will appear and how to create it.

Loading and initialization states must be explicit but unobtrusive.

Errors must explain what failed and, where possible, provide a recovery action. Offline operation is normal and must not be presented as an error by itself.

## 10. Accessibility

Accessibility is part of acceptance, not a later polish pass.

Requirements include:

- meaningful accessibility roles, labels and states;
- icon-only controls have accessible names;
- adequate touch targets;
- no state communicated by color alone;
- predictable focus order;
- layout resilience to larger text;
- Spanish and English text expansion must not obscure critical controls.

## 11. Delivery and ownership model

Specialized agents are used with non-overlapping primary ownership:

- `product_designer`: hierarchy, flow, density and visual design review;
- `design_system_engineer`: theme, tokens, iconography and reusable UI primitives;
- `mobile_ui_engineer`: screen/navigation implementation using approved primitives;
- `localization_accessibility_engineer`: ES/EN, locale formatting and accessibility;
- `qa_mobile_engineer`: automated/mobile regression and release evidence;
- `tech_lead`: independent architecture and integration review.

The ChatGPT conversation controller acts as Tech Lead/controller for the program: it scopes work, routes tasks, adjudicates conflicts, reviews integration and owns merge readiness.

Implementers do not approve their own work.

## 12. Physical-device visual gate

A materially changed screen is not considered accepted merely because:

- it compiles;
- tests pass;
- Maestro passes;
- a reviewer approves code;
- a simulator/emulator screenshot looks plausible.

For materially changed screens, Product Owner review on a physical Android device is mandatory before merge readiness.

The intended delivery order begins with the shared design system and Today. Today establishes the reference density, color balance, typography, iconography, tab bar and common components. Once Today is approved physically, the same visual system is reused across the remaining screens rather than independently reinvented.

## 13. Relationship to REL-001

REL-001 / #11 remains blocked while the UI reconstruction is in progress.

Do not declare `SAFE FOR REAL DATA` until:

1. the relevant UI reconstruction work is complete;
2. required physical visual gates are approved;
3. automated regression is green;
4. REL-001 physical reliability checks are rerun against the accepted interface.

## 14. Non-goals

This reconstruction does not by itself authorize:

- backend or authentication work;
- cloud synchronization;
- database schema redesign;
- changes to timer invariants;
- changes to money storage rules;
- new commercial/business semantics;
- broad dependency upgrades unrelated to the UI rebuild.

Any such requirement must be handled by a separate approved issue.