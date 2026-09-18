# Freelance Ops — Phase 1 Visual Blueprint

Date: 2026-09-17  
Status: Implementation blueprint  
Issue: UI-003 / #28  
Parent: UI-002 / #24

## 1. Purpose and authority

This document turns the approved UI reconstruction direction into exact visual and interaction rules for the shared mobile design system and the `Today / Hoy` + `Start Work / Iniciar trabajo` journey.

It is a presentation blueprint only. It does not change domain behavior, timer semantics, persistence, project/task rules, expense rules, or application-service contracts.

Authority order:

1. written functional rules in `docs/superpowers/specs/2026-09-16-freelance-ops-v1-ui-ux.md`;
2. reconstruction rules in `docs/superpowers/specs/2026-09-17-freelance-ops-ui-rebuild.md`;
3. this implementation blueprint;
4. the canonical concept board `docs/assets/concepts/freelance-ops-v1-ui-concept.png`, governed by `docs/design/phase1-ui-contract.md`, as the authoritative Phase 1 visual/composition reference.

If a visual choice would conflict with a functional rule, the functional rule wins.

## 2. Phase-1 design principles

The rebuilt interface must read as a professional productivity tool rather than a scaffold or a consumer-card-heavy application.

The Phase-1 implementation therefore uses these rules consistently:

- information before decoration;
- compact vertical rhythm with 16 dp screen gutters;
- surfaces are primarily separated by spacing, thin borders and background tone rather than heavy shadows;
- one petroleum/teal accent family is used for primary interaction and selection, not as general decoration;
- semantic success, warning and error colors remain independent of the brand accent;
- headings are deliberately smaller than the current scaffold implementation;
- controls are recognizable without explanatory copy;
- all iconography comes from a stable vector icon set;
- empty states are small, contextual and actionable;
- dark mode is a first-class theme rather than an inverted afterthought;
- Spanish and English use the same component geometry and interaction structure.

## 3. Semantic color system

### 3.1 Light theme

| Token | Value | Intended use |
|---|---:|---|
| `background` | `#F5F7F7` | App/background canvas |
| `surface` | `#FFFFFF` | Standard rows, fields, cards |
| `surfaceElevated` | `#FBFCFC` | Sheets, active timer card inner surface, elevated groups |
| `surfaceMuted` | `#EEF2F1` | Subtle grouped backgrounds, selected/secondary zones |
| `textPrimary` | `#17211F` | Primary body and headings |
| `textSecondary` | `#40504C` | Secondary information |
| `textMuted` | `#64716E` | Captions, metadata, inactive navigation labels |
| `border` | `#D8E0DE` | Standard dividers and control borders |
| `borderStrong` | `#B8C5C2` | Stronger control boundaries/focus-adjacent states |
| `accent` | `#0F766E` | Primary CTA, active tab, selected controls |
| `accentPressed` | `#0B5F59` | Pressed primary controls |
| `accentSoft` | `#DDF2EF` | Selected row/pill background, subtle active state |
| `onAccent` | `#FFFFFF` | Text/icons on `accent` and `accentPressed` |
| `success` | `#2E7D32` | Positive/success state |
| `warning` | `#A86400` | Warning/attention state |
| `error` | `#B3261E` | Error/destructive state |
| `info` | `#2F6F8F` | Informational state when needed |
| `disabledSurface` | `#E7ECEB` | Disabled control surface |
| `disabledText` | `#88938F` | Disabled labels/icons |
| `focusRing` | `#0F766E` | Visible focus/highlight outline |
| `scrim` | `rgba(11, 20, 18, 0.44)` | Modal/sheet scrim |

### 3.2 Dark theme

| Token | Value | Intended use |
|---|---:|---|
| `background` | `#101615` | App/background canvas |
| `surface` | `#16201E` | Standard rows, fields, cards |
| `surfaceElevated` | `#1C2825` | Sheets and visually elevated groups |
| `surfaceMuted` | `#222F2C` | Subtle grouped backgrounds, selected/secondary zones |
| `textPrimary` | `#F1F5F4` | Primary body and headings |
| `textSecondary` | `#C3CDCA` | Secondary information |
| `textMuted` | `#8FA09C` | Captions, metadata, inactive navigation labels |
| `border` | `#2E3B38` | Standard dividers and control borders |
| `borderStrong` | `#465753` | Stronger control boundaries/focus-adjacent states |
| `accent` | `#41B7AA` | Primary CTA, active tab, selected controls |
| `accentPressed` | `#319A8F` | Pressed primary controls |
| `accentSoft` | `#173C38` | Selected row/pill background, subtle active state |
| `onAccent` | `#07211E` | Text/icons on `accent` and `accentPressed` |
| `success` | `#67C96E` | Positive/success state |
| `warning` | `#E0A84B` | Warning/attention state |
| `error` | `#F28482` | Error/destructive state |
| `info` | `#74B8D4` | Informational state when needed |
| `disabledSurface` | `#24302E` | Disabled control surface |
| `disabledText` | `#6F7F7B` | Disabled labels/icons |
| `focusRing` | `#63CFC3` | Visible focus/highlight outline |
| `scrim` | `rgba(0, 0, 0, 0.60)` | Modal/sheet scrim |

### 3.3 Contrast requirements

The implementation must preserve at least WCAG AA-level contrast for ordinary text and essential controls. The selected core pairs provide the following approximate contrast ratios:

- light `textPrimary` on `background`: `15.3:1`;
- light `textSecondary` on `background`: `7.9:1`;
- light `textMuted` on `background`: `4.7:1`;
- light `onAccent` on `accent`: `5.5:1`;
- dark `textPrimary` on `background`: `16.6:1`;
- dark `textSecondary` on `background`: `11.2:1`;
- dark `textMuted` on `background`: `6.7:1`;
- dark `onAccent` on `accent`: `6.9:1`.

Do not lower contrast by applying opacity to text tokens. If a weaker visual state is needed, use the dedicated semantic token instead.

## 4. Typography

Use the system font stack. Do not add a custom font in Phase 1.

| Token | Size | Line height | Weight | Use |
|---|---:|---:|---:|---|
| `display` | 28 | 34 | 700 | Elapsed timer value and rare high-emphasis numeric content only |
| `title` | 24 | 30 | 700 | Screen title |
| `section` | 18 | 24 | 600 | Section heading |
| `body` | 15 | 21 | 400 | Standard labels/body text |
| `bodyStrong` | 15 | 21 | 600 | Row titles, emphasized labels |
| `caption` | 13 | 18 | 400 | Metadata, helper text |
| `micro` | 11 | 15 | 600 | Tab labels, compact status labels |

Rules:

- screen titles use `title`, never `display`;
- timer elapsed time may use `display` with tabular numerals when supported;
- buttons use `bodyStrong`;
- tab labels use `micro`;
- line height must not be reduced below the values above;
- layouts must survive Android font scaling without clipping critical actions; allow text to wrap where appropriate rather than reducing below these sizes.

## 5. Spacing, radii and density

### 5.1 Spacing scale

| Token | Value |
|---|---:|
| `space1` | 4 dp |
| `space2` | 8 dp |
| `space3` | 12 dp |
| `space4` | 16 dp |
| `space5` | 20 dp |
| `space6` | 24 dp |
| `space7` | 32 dp |

Primary layout rules:

- screen horizontal gutter: `16 dp`;
- header-to-first-section gap: `16 dp`;
- section-to-section gap: `20 dp`;
- section heading-to-content gap: `8 dp`;
- adjacent rows inside a grouped surface: `0 dp` gap with a 1 dp divider;
- standalone rows/cards: `8 dp` gap;
- compact metadata gap: `4 dp`;
- form field stack gap: `16 dp`.

### 5.2 Radius scale

| Token | Value | Use |
|---|---:|---|
| `radiusSm` | 8 dp | Pills/small controls where full pill is not used |
| `radiusMd` | 12 dp | Buttons, fields, rows, standard cards |
| `radiusLg` | 16 dp | Active timer card, modal/sheet internal groups |

Avoid excessive rounding. Standard project rows and text fields use `12 dp`, not large capsule shapes.

### 5.3 Touch and icon sizing

- minimum interactive touch target: `44 x 44 dp`;
- standard button height: `48 dp`;
- compact status pill height: `24 dp`;
- standard row minimum height: `56 dp`;
- project row minimum height: `68 dp`;
- bottom-tab icon: `22 dp`;
- standard inline icon: `20 dp`;
- compact metadata icon: `16 dp`;
- large empty-state icon: `24 dp` only; do not use oversized decorative illustrations in Phase 1.

## 6. Surface and elevation rules

The base style is flat and restrained.

- `background` is the default screen canvas;
- grouped content sits on `surface` with a 1 dp `border` where separation is necessary;
- standard rows do not use shadows;
- `surfaceElevated` may be used for sheets or the active timer card but still requires restrained elevation;
- Android elevation for ordinary elevated content: `1` to `2` maximum;
- modal/sheet elevation follows the platform primitive;
- never stack multiple shadowed cards to communicate ordinary hierarchy.

## 7. Iconography

Use one Expo-compatible vector icon family through the shared `AppIcon` abstraction.

Required navigation concepts:

- Today: calendar/today symbol;
- Projects: briefcase/folder-work symbol;
- Tasks: checklist/check-square symbol;
- Planning: timeline/calendar-range symbol;
- More: horizontal or vertical more symbol.

Required common concepts:

- settings: gear;
- start/resume: play;
- pause: pause;
- stop: square/stop-circle;
- expense: receipt/wallet;
- manual time: clock/edit-clock;
- back: arrow-back;
- disclosure: chevron-right;
- create/add: plus;
- error/warning: semantic status icon.

Never use `X`, emoji, Unicode characters, text arrows, or font-dependent glyphs as functional icon substitutes.

## 8. Component anatomy and states

### 8.1 `AppHeader`

**Purpose:** compact screen identity and optional contextual action.

Geometry:

- top content sits below Safe Area;
- minimum content height: `52 dp`;
- horizontal alignment uses the screen `16 dp` gutter;
- title uses `title`;
- optional secondary/date line uses `caption` + `textSecondary`;
- trailing icon action uses a `44 x 44 dp` `IconButton`.

Today variant:

- line 1: localized screen title (`Hoy` / `Today`);
- line 2: localized current day/date, e.g. `jueves, 17 sep` / `Thursday, Sep 17` using locale formatting rather than hardcoded templates;
- optional trailing settings action uses gear icon and accessible name.

States:

- no decorative container around the whole header;
- pressing trailing action uses `surfaceMuted` as pressed feedback;
- focus/accessibility highlight uses `focusRing`.

### 8.2 `BottomTabBar`

Geometry:

- five equal-width destinations;
- visual content height: `60 dp` plus device bottom safe-area inset;
- top border: 1 dp `border`;
- background: `surface`;
- icon: `22 dp`;
- icon-to-label gap: `2 dp` to `4 dp`;
- label: `micro`;
- no floating selected capsule in Phase 1.

Active state:

- icon and label use `accent`;
- optional 2 dp top indicator aligned to the active item may use `accent` if implementation remains visually restrained.

Inactive state:

- icon and label use `textMuted`.

Pressed state:

- item surface briefly uses `surfaceMuted`;
- label remains visible.

Accessibility:

- each item has tab role, localized label and selected state;
- do not rely on color alone: selected state is exposed semantically and may use the optional top indicator.

### 8.3 `PrimaryButton`

Geometry:

- height: `48 dp`;
- horizontal padding: `16 dp`;
- radius: `12 dp`;
- label: `bodyStrong`;
- optional leading icon: `20 dp`, 8 dp gap.

States:

- normal: `accent` background + `onAccent` content;
- pressed: `accentPressed` background;
- disabled: `disabledSurface` + `disabledText`;
- focus/accessibility highlight: 2 dp `focusRing` outside the control boundary;
- loading: preserve width and label position; replace/augment with progress indicator without resizing.

### 8.4 `SecondaryButton`

Geometry matches `PrimaryButton`.

States:

- normal: `surface` background, 1 dp `borderStrong`, `textPrimary` content;
- pressed: `surfaceMuted` background;
- disabled: `disabledSurface`, `disabledText`, standard `border`;
- focus: 2 dp `focusRing`.

A secondary button must not visually compete with the single primary action in the same group.

### 8.5 `IconButton`

Geometry:

- touch target: exactly or at least `44 x 44 dp`;
- visual icon: `20 dp` to `22 dp`;
- radius: `12 dp`;
- no persistent background unless the use case requires containment.

States:

- normal: icon `textSecondary`;
- pressed: `surfaceMuted` background;
- selected where applicable: `accentSoft` background + `accent` icon;
- disabled: `disabledText`;
- icon-only controls always require a localized accessible name.

### 8.6 `ProjectRow`

**Purpose:** scannable active-project selection without consumer-style oversized cards.

Geometry:

- minimum height: `68 dp`;
- padding: `12 dp` vertical, `14 dp` horizontal;
- radius: `12 dp` when standalone; when grouped, outer group owns the radius;
- background: `surface`;
- optional 1 dp `border` when standalone;
- entire row is tappable with minimum 44 dp hit area on all actionable sub-controls.

Anatomy:

1. main column, flexible width;
2. project name: `bodyStrong`, `textPrimary`, one line preferred, two lines maximum;
3. client/context: `caption`, `textSecondary`, one line;
4. optional metadata line: status / due date / lightweight effort indicator, `caption` or `micro`;
5. trailing affordance: `play` or `chevron-right` icon in `accent`, depending on the route semantics selected by the caller.

Today behavior:

- tapping the row enters Start Work with that project preselected;
- row must make this action clear through the trailing start/disclosure affordance and accessible label;
- no hidden swipe action in Phase 1.

States:

- pressed: `surfaceMuted`;
- selected/focused: 2 dp `focusRing` or platform accessibility highlight;
- archived/inactive projects do not appear in Today active-project list.

### 8.7 `ActiveTimerCard`

**Purpose:** highest-priority element when a timer exists.

Geometry:

- radius: `16 dp`;
- padding: `16 dp`;
- background: `surfaceElevated`;
- border: 1 dp `borderStrong`;
- optional leading 3 dp accent stripe using `accent` is allowed; no heavy shadow;
- internal vertical gaps: 4 / 8 / 12 dp according to content hierarchy.

Anatomy:

1. top row: state `StatusPill` + optional started-at metadata;
2. project name: `bodyStrong`;
3. client/context: `caption`, `textSecondary`;
4. elapsed time: `display`, tabular numerals where available;
5. optional task/activity metadata: `caption`, only if present;
6. actions row:
   - RUNNING: `Pause` secondary + `Stop` destructive/strong secondary;
   - PAUSED: `Resume` primary + `Stop` destructive/strong secondary.

Behavior:

- `STOP` remains available regardless of optional metadata;
- timer state must be conveyed by localized text/icon/state semantics, not only color;
- elapsed time does not change the card width or shift actions.

State visuals:

- RUNNING pill: `accentSoft` + `accent` + play/timer icon;
- PAUSED pill: `surfaceMuted` + `textSecondary` + pause icon;
- stop action uses `error` for icon/text/border but does not become a full red filled destructive block unless a later destructive-confirmation primitive requires it.

### 8.8 `EmptyState`

**Purpose:** explain absence and expose the next useful action without consuming the whole screen.

Geometry:

- inline within the relevant section;
- padding: `16 dp`;
- radius: `12 dp`;
- background: `surface`;
- 1 dp `border`;
- maximum icon size: `24 dp`.

Anatomy:

- icon;
- title `bodyStrong`;
- body `caption`, maximum 2–3 lines;
- one clear action, normally compact `PrimaryButton` or text-style action depending on importance.

Today no-project copy intent:

- title: no active projects;
- body: explain that a project is needed to start tracking;
- action: create project.

No generic dead-end text such as “Nothing here yet” without an action.

### 8.9 `SectionHeader`

Geometry:

- minimum height: `32 dp`;
- title: `section`;
- optional count/metadata: `caption`, `textMuted`;
- optional trailing action: `caption`/`bodyStrong` in `accent`, minimum 44 dp touch target even when visually small;
- bottom gap to content: `8 dp`.

### 8.10 `SelectionRow`

**Purpose:** recognizable form selector for task/activity/language/theme and similar choices.

Geometry:

- visible field label above row: `caption`, `textSecondary`;
- row minimum height: `52 dp`;
- horizontal padding: `14 dp`;
- background: `surface`;
- border: 1 dp `border`;
- radius: `12 dp`;
- value: `body`;
- trailing chevron: `20 dp`, `textMuted`.

States:

- normal: standard surface/border;
- pressed: `surfaceMuted`;
- focus: 2 dp `focusRing`;
- disabled: `disabledSurface` + `disabledText`;
- empty optional selector displays localized placeholder such as `Ninguna / None`, never an unlabeled blank rectangle.

### 8.11 `TextField`

Geometry:

- visible label above field: `caption`, `textSecondary`;
- single-line minimum height: `48 dp`;
- multiline description target height: `96 dp`, grows with content where platform behavior allows;
- horizontal padding: `14 dp`;
- radius: `12 dp`;
- standard border: 1 dp `border`;
- text: `body`.

States:

- focused: 2 dp `focusRing`, retain sufficient contrast;
- error: 1–2 dp `error` border plus proximal `caption` error message and semantic accessibility error state;
- disabled: `disabledSurface` + `disabledText`;
- placeholder uses `textMuted`, but field label remains visible.

### 8.12 `StatusPill`

Geometry:

- height: `24 dp`;
- horizontal padding: `8 dp`;
- icon optional: `14–16 dp`;
- text: `micro`;
- full pill radius allowed because this is a compact status element.

States must include text/icon semantics in addition to color.

Examples:

- running: accent soft + `En curso / Running`;
- paused: muted surface + `Pausado / Paused`;
- success/completed: success-tinted treatment + text;
- warning/blocked: warning-tinted treatment + text.

## 9. Today / Hoy exact composition

### 9.1 Shared screen structure

Use a vertical `ScrollView`/equivalent content region above the fixed bottom tab bar.

Content order:

```text
Safe area
AppHeader
16 dp
[ActiveTimerCard when timer exists]
[20 dp after timer card when present]
SectionHeader: Active projects / Proyectos activos
8 dp
Project list OR EmptyState
20 dp
Secondary actions group
Bottom content padding >= 24 dp + safe allowance
BottomTabBar
```

Screen horizontal padding is `16 dp`. Do not insert a full-width hero banner or decorative dashboard summary above the work controls.

### 9.2 Today — no active timer, no projects

Order:

1. `AppHeader` with title and localized date;
2. `SectionHeader` — `Proyectos activos / Active projects`;
3. `EmptyState`:
   - compact project/briefcase icon;
   - title: localized “No active projects” equivalent;
   - body explains that a project is required to begin tracking;
   - primary action: `Crear proyecto / Create project`;
4. secondary actions group:
   - `Añadir tiempo manual / Add manual time`;
   - `Registrar gasto / Add expense`;
5. bottom navigation.

Secondary actions are displayed as two compact rows/buttons, not large top-of-screen pills.

### 9.3 Today — active projects, no active timer

Order:

1. `AppHeader`;
2. `SectionHeader` — active projects;
3. compact list of `ProjectRow` items;
4. secondary actions group;
5. bottom navigation.

Project rows show, when available:

- project name;
- client/context;
- lightweight status/due/effort metadata;
- trailing start/disclosure affordance.

The first useful project action should be visible without scrolling on a typical Android handset when at least one project exists.

### 9.4 Today — running timer

Order:

1. `AppHeader`;
2. `ActiveTimerCard` immediately below the header;
3. `SectionHeader` + active project list remains available below;
4. secondary actions;
5. bottom navigation.

The timer card displays:

- `En curso / Running` status;
- project and client;
- elapsed time;
- optional task/activity only if available;
- `Pausar / Pause`;
- `Detener / Stop`.

Do not hide projects or primary navigation while a timer is running.

### 9.5 Today — paused timer

Composition matches running state, but:

- status is `Pausado / Paused`;
- primary timer action is `Reanudar / Resume`;
- `Detener / Stop` remains visible;
- paused status is expressed by label + icon, not only color.

## 10. Start Work / Iniciar trabajo exact composition

Start Work is a focused form, not a generic project picker.

Structure:

```text
Safe area
Back header
16 dp
Fixed project identity block
20 dp
Task selector (optional)
16 dp
Activity selector (optional)
16 dp
Description field (optional)
24 dp
Flexible content space / keyboard-safe scroll
Action footer
  PrimaryButton: Start Work / Iniciar trabajo
Safe area
```

### 10.1 Back header

- left `IconButton`: arrow-back, localized accessible label;
- centered/left-aligned title according to existing navigation convention, but use one convention consistently throughout the app;
- title: `Iniciar trabajo / Start Work` using `title` or compact navigation-title treatment if the route shell already provides one;
- no redundant close icon.

### 10.2 Fixed project identity block

This is not an editable selector on this screen.

It contains:

- small `caption` label: `Proyecto / Project`;
- project name `bodyStrong`;
- client/context `caption` when available;
- surface: `surfaceMuted` or standard `surface` with `border`;
- radius: `12 dp`;
- padding: `12 dp` to `14 dp`.

If changing project is required by existing behavior, use an explicit navigation/back action; do not make the identity block look like a blank selector unless it is truly interactive.

### 10.3 Optional task selector

- visible label: `Tarea · opcional / Task · optional`;
- `SelectionRow` with selected task or `Ninguna / None`;
- opening follows a native/Material picker/sheet pattern;
- recent/re-ranked tasks may be ordered according to existing functional requirements, without changing task semantics.

### 10.4 Optional activity selector

- visible label: `Actividad · opcional / Activity · optional`;
- `SelectionRow` with selected activity or `Ninguna / None`;
- native/Material picker/sheet interaction.

### 10.5 Optional description

- visible label: `Descripción · opcional / Description · optional`;
- multiline `TextField` target height `96 dp`;
- placeholder may clarify intended note, but label remains visible.

### 10.6 Primary action footer

- primary button height `48 dp`;
- horizontal footer padding `16 dp`;
- top divider/background may use `surface` + `border` if footer is sticky;
- button label `Iniciar trabajo / Start Work`;
- keyboard handling must keep the action reachable after dismissing or scrolling the field;
- do not disable the action because task/activity/description are empty;
- project is the only mandatory dimension.

### 10.7 Existing active timer conflict

Only when the existing application behavior detects a conflicting active timer:

- present a native/Material sheet/dialog using `surfaceElevated`;
- clearly identify the currently active project/session;
- expose only the actions supported by current business rules;
- never silently create a second open interval;
- `STOP` behavior must remain governed by existing timer semantics.

Do not show conflict UI in the normal Start Work path.

## 11. Localization layout rules

Spanish and English share the same layout implementation.

Rules:

- do not hardcode widths around English labels;
- primary/secondary button text may wrap only when absolutely necessary; prefer flexible width first;
- tab labels remain one line at standard Android font scale; the selected icon and accessibility state remain meaningful if larger accessibility font settings compress labels;
- `Planificación` is the longest primary tab label and must be used when validating tab spacing;
- dates/times/numbers/currencies are formatted by locale-aware utilities, not translated string concatenation;
- selector placeholders and accessibility labels are localized through the i18n layer.

## 12. Accessibility acceptance rules

Phase-1 components are not complete unless they satisfy all of the following:

- every interactive element has a semantic role;
- every icon-only control has a localized accessible name;
- minimum touch target is `44 x 44 dp`;
- focus/pressed/selected/disabled states are distinguishable without relying solely on color;
- timer RUNNING/PAUSED state includes text or accessible state information;
- destructive/error state includes icon/text/semantic state in addition to red color;
- text scaling must not hide Pause/Resume/Stop or Start Work;
- screen reader order follows the visual task order;
- errors are announced at or near the failing field/action;
- keyboard focus must not place a field or primary action permanently behind the keyboard.

## 13. Loading, error and feedback treatment for Phase 1

### Loading

- initialization/loading uses a compact progress treatment centered or inline within the affected content region;
- do not show skeleton cards unless data latency makes them materially useful;
- avoid replacing the entire app shell for routine local reads.

### Error

- use `error` icon/text and concise recovery copy;
- provide retry/recovery action when meaningful;
- offline state alone is not an error.

### Success/feedback

- routine local actions should not generate noisy success banners;
- use transient platform feedback only when confirmation is useful and does not interrupt the tracking flow.

## 14. Relationship to the canonical concept board

No reconstruction-specific visual deviation may override the approved Phase 1 composition without explicit Product Owner approval.

The authoritative visual order is:

1. `docs/design/phase1-ui-contract.md`;
2. `docs/assets/concepts/freelance-ops-v1-ui-concept.png`;
3. this blueprint as implementation guidance.

The exact component geometry, accessibility, localization and theme rules in this blueprint remain useful engineering constraints only where they are compatible with the canonical contract and concept.

In particular:

- do not replace the approved blue-led light-mode identity with a different brand direction;
- do not alter the persistent five-destination bottom shell shown by the approved concept;
- do not replace the approved screen compositions with generic CRUD/document layouts;
- dark mode must adapt the approved hierarchy rather than redefine it;
- any deliberate visual deviation must be documented and explicitly approved by the Product Owner before implementation proceeds.

## 15. Engineering acceptance checklist

The design-system implementation may claim conformance to this blueprint only when all of the following are true:

- [ ] Light and dark semantic token values match Section 3 exactly.
- [ ] Typography values match Section 4 exactly.
- [ ] Spacing/radius/touch-target values match Section 5 exactly.
- [ ] One stable vector icon abstraction is used; no text glyph substitutes remain in Phase-1 surfaces.
- [ ] `AppHeader`, `BottomTabBar`, `PrimaryButton`, `SecondaryButton`, `IconButton`, `ProjectRow`, `ActiveTimerCard`, `EmptyState`, `SectionHeader`, `SelectionRow`, `TextField`, and `StatusPill` follow the anatomy/state rules above.
- [ ] Today supports no-project, active-project, RUNNING and PAUSED compositions defined in Section 9.
- [ ] Start Work follows Section 10 and keeps task/activity/description optional.
- [ ] ES and EN render through one shared layout and localization layer.
- [ ] System/Light/Dark behavior does not alter application/domain data.
- [ ] Automated accessibility checks are supplemented by manual physical-device review.
- [ ] No material Phase-1 screen is merged before Product Owner visual approval on physical Android.

## 16. Self-review record

Self-review completed against UI-003 acceptance criteria:

- no `TBD` or `TODO` placeholders remain;
- every required semantic color token has an exact light and dark value;
- typography, spacing, radii, touch targets and icon sizes are exact;
- all twelve required component families include anatomy and state rules;
- Today covers empty, active-project, running-timer and paused-timer states;
- Start Work covers fixed project context and all optional enrichment fields;
- accessibility and contrast requirements are explicit;
- deliberate concept-board deviations are listed;
- no domain, persistence or timer semantics are changed.
