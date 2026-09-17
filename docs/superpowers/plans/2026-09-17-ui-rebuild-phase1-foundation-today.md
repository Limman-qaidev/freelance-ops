# UI Rebuild Phase 1 — Foundation + Today Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the shared mobile UI foundation and the Today / Start Work journey so the physical Android app establishes the approved professional visual language before the remaining screens are reconstructed.

**Architecture:** Preserve all existing domain/application behavior and replace only presentation-layer structure. Add a typed local UI-preferences layer for language/theme, a shared theme/i18n foundation, reusable visual primitives, then rebuild the app shell and Today / Start Work screens on top. No task may bypass the existing application services or introduce raw SQLite access in UI code.

**Tech Stack:** Expo 57, React Native 0.86, TypeScript strict, Expo Router, Jest + React Native Testing Library, Expo Localization, AsyncStorage, Expo-compatible vector icons, Maestro for later release validation.

**Spec:** `docs/superpowers/specs/2026-09-17-freelance-ops-ui-rebuild.md`

## Global Constraints

- Android-first, offline-first, local-only V1.
- Preserve approved domain behavior and application-service contracts.
- Primary navigation remains Today / Projects / Tasks / Planning / More.
- Spanish and English must both be complete; device locale selects the initial language automatically; unsupported locale falls back to Spanish; user override persists.
- Theme modes are System / Light / Dark; System is default; user override persists.
- Visual identity is graphite + petroleum/teal; compact professional productivity UI.
- No broken glyphs or text-character icon substitutes.
- No materially changed screen becomes merge-ready without automated checks, independent review, physical Android exercise, and Product Owner visual approval.
- Do not commit real client/project/time/financial data.

---

### Task 1: Phase-1 visual blueprint

**Primary owner:** `product_designer`

**Files:**
- Create: `docs/design/ui-rebuild-phase1-visual-blueprint.md`
- Reference only: `docs/assets/concepts/freelance-ops-v1-ui-concept.jpg`
- Reference only: `docs/superpowers/specs/2026-09-17-freelance-ops-v1-ui-ux.md`
- Reference only: `docs/superpowers/specs/2026-09-17-freelance-ops-ui-rebuild.md`

**Interfaces:**
- Consumes: approved reconstruction decisions and the existing functional UI spec.
- Produces: exact visual tokens and component-state rules consumed by Tasks 3 and 4.

- [ ] **Step 1: Document the exact Phase-1 palette**

Use semantic token names rather than screen-specific colors. The blueprint must define light and dark values for at least:

```text
background
surface
surfaceElevated
surfaceMuted
textPrimary
textSecondary
textMuted
border
borderStrong
accent
accentPressed
accentSoft
onAccent
success
warning
error
```

Keep the identity graphite + petroleum/teal and verify WCAG-aware contrast for body text and primary controls.

- [ ] **Step 2: Define the type, spacing, radius and control-density scales**

The blueprint must specify values for:

```text
type: display, title, section, body, bodyStrong, caption, micro
spacing: 4, 8, 12, 16, 20, 24, 32
radius: 8, 12, 16
minimum touch target: 44dp
```

The intent is compact productivity density; do not reproduce the current oversized whitespace.

- [ ] **Step 3: Define Phase-1 component anatomy**

Document visual/state rules for:

```text
AppHeader
BottomTabBar
PrimaryButton
SecondaryButton
IconButton
ProjectRow
ActiveTimerCard
EmptyState
SectionHeader
SelectionRow
TextField
StatusPill
```

For every interactive component include normal, pressed, disabled and focus/accessibility behavior where applicable.

- [ ] **Step 4: Define Today and Start Work composition**

Today, no active timer:

```text
AppHeader(title=Hoy/Today, date, settings action)
Active projects section
  ProjectRow × N
Secondary actions
  Add manual time
  Add expense
BottomTabBar
```

Today, active timer:

```text
AppHeader
ActiveTimerCard(project, client, elapsed, state, Pause/Resume, Stop)
Active projects section remains reachable below
Secondary actions
BottomTabBar
```

Start Work:

```text
Back header + project identity
Task optional selector
Activity optional selector
Description optional field
Primary Start Work CTA
Existing-active-timer conflict sheet only when required by existing behavior
```

- [ ] **Step 5: Self-review against the concept board and specs**

The document must explicitly list any deliberate deviation from the concept board. If there is no deviation, state that no functional deviation is introduced.

- [ ] **Step 6: Commit**

```bash
git add docs/design/ui-rebuild-phase1-visual-blueprint.md
git commit -m "docs: define phase 1 visual blueprint"
```

---

### Task 2: Locale and persisted UI preferences foundation

**Primary owner:** `localization_accessibility_engineer`

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/preferences/ui-preferences.ts`
- Create: `src/i18n/translations.ts`
- Create: `src/i18n/i18n-provider.tsx`
- Create: `src/i18n/use-i18n.ts`
- Create: `__tests__/i18n/i18n-provider.test.tsx`
- Create: `__tests__/preferences/ui-preferences.test.ts`

**Interfaces:**
- Consumes: `expo-localization` device locale; AsyncStorage persistence.
- Produces:

```ts
export type SupportedLanguage = 'es' | 'en';
export type ThemePreference = 'system' | 'light' | 'dark';

export interface UiPreferences {
  language: SupportedLanguage | null;
  theme: ThemePreference;
}

export function loadUiPreferences(): Promise<UiPreferences>;
export function saveLanguageOverride(language: SupportedLanguage | null): Promise<void>;
export function saveThemePreference(theme: ThemePreference): Promise<void>;

export function useI18n(): {
  language: SupportedLanguage;
  t: (key: TranslationKey) => string;
  setLanguage: (language: SupportedLanguage | null) => Promise<void>;
};
```

- [ ] **Step 1: Add compatible dependencies**

Run:

```bash
npx expo install expo-localization @react-native-async-storage/async-storage
```

Do not hand-pick versions that conflict with Expo 57.

- [ ] **Step 2: Write failing preference tests**

Cover default values, persisted `es`, persisted `en`, persisted theme mode, and clearing a language override.

Example expectation:

```ts
expect(await loadUiPreferences()).toEqual({ language: null, theme: 'system' });
```

- [ ] **Step 3: Implement the UI preferences adapter**

Use exactly these storage keys:

```ts
const LANGUAGE_KEY = 'freelance-ops:language';
const THEME_KEY = 'freelance-ops:theme';
```

Invalid stored values must fall back safely rather than propagate arbitrary strings.

- [ ] **Step 4: Write failing i18n tests**

Verify:

```text
device es-* -> es when no override
device en-* -> en when no override
unsupported device locale -> es
manual en override -> en
manual es override -> es
clear override -> device-derived language
```

- [ ] **Step 5: Implement typed translations and provider**

`translations.ts` must expose one key set shared by both languages. Do not allow Spanish and English dictionaries to drift structurally.

Phase-1 keys must cover navigation, Today, Start Work, shared actions, empty states, timer states, accessibility labels, and Settings labels required by the language/theme controls.

- [ ] **Step 6: Run focused verification**

```bash
npx jest __tests__/preferences/ui-preferences.test.ts __tests__/i18n/i18n-provider.test.tsx --runInBand
npm run typecheck
npm run lint
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/preferences src/i18n __tests__/preferences __tests__/i18n
git commit -m "feat: add locale and UI preference foundation"
```

---

### Task 3: Theme, iconography and reusable visual primitives

**Primary owner:** `design_system_engineer`

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Replace: `src/ui/theme/tokens.ts`
- Create: `src/ui/theme/theme.ts`
- Create: `src/ui/theme/theme-provider.tsx`
- Create: `src/ui/theme/use-theme.ts`
- Create: `src/ui/components/app-icon.tsx`
- Replace: `src/ui/components/action-button.tsx`
- Replace: `src/ui/components/screen-shell.tsx`
- Create: `src/ui/components/icon-button.tsx`
- Create: `src/ui/components/app-header.tsx`
- Create: `src/ui/components/section-header.tsx`
- Create: `src/ui/components/project-row.tsx`
- Create: `src/ui/components/active-timer-card.tsx`
- Create: `src/ui/components/empty-state.tsx`
- Create: `__tests__/ui/design-system.test.tsx`

**Interfaces:**
- Consumes: Task 1 blueprint; `ThemePreference` persistence contract from Task 2.
- Produces:

```ts
export type ResolvedThemeMode = 'light' | 'dark';
export function useTheme(): {
  preference: ThemePreference;
  resolved: ResolvedThemeMode;
  theme: AppTheme;
  setThemePreference: (preference: ThemePreference) => Promise<void>;
};
```

- [ ] **Step 1: Add Expo-compatible icon package if it is not already transitively available**

Run:

```bash
npx expo install @expo/vector-icons
```

Use named vector icons through `AppIcon`; never use `X`, emoji, Unicode glyphs, or platform-dependent characters as icon substitutes.

- [ ] **Step 2: Write failing theme/provider tests**

Cover system-light, system-dark, explicit light, explicit dark and persisted preference changes.

- [ ] **Step 3: Implement semantic tokens from the approved blueprint**

Screen code must not import raw palette constants directly. It consumes `useTheme().theme` semantic values.

- [ ] **Step 4: Write failing primitive-component tests**

At minimum verify accessibility roles/labels, disabled state, 44dp minimum targets for icon buttons, and translated text passed by callers rather than embedded English strings.

- [ ] **Step 5: Implement the component set**

Do not add business logic. `ProjectRow` accepts display data and callbacks; `ActiveTimerCard` accepts timer display state and callbacks. Application services remain owned by screens/features.

- [ ] **Step 6: Run focused verification**

```bash
npx jest __tests__/ui/design-system.test.tsx --runInBand
npm run typecheck
npm run lint
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/ui __tests__/ui/design-system.test.tsx
git commit -m "feat: establish mobile design system"
```

---

### Task 4: App shell, navigation and Today / Start Work reconstruction

**Primary owner:** `mobile_ui_engineer`

**Files:**
- Modify: `app/_layout.tsx`
- Modify: `app/(tabs)/_layout.tsx`
- Replace presentation only: `app/(tabs)/index.tsx`
- Replace presentation only: `app/start-work.tsx`
- Update: `__tests__/ui/today.test.tsx`
- Update: `__tests__/ui/start-work.test.tsx`
- Update: `__tests__/navigation-smoke.test.tsx`

**Interfaces:**
- Consumes: Task 2 `I18nProvider/useI18n`; Task 3 `ThemeProvider/useTheme` and visual primitives.
- Preserves: existing `clientService`, `projectService`, `timeTrackingService`, task/activity selection and active-timer conflict semantics.

- [ ] **Step 1: Write failing navigation-shell tests**

Assert five labeled tabs in the active language and real icon components for:

```text
Today / Hoy
Projects / Proyectos
Tasks / Tareas
Planning / Planificación
More / Más
```

- [ ] **Step 2: Integrate providers at the root**

Provider order must keep existing database/application initialization intact and add UI providers around rendered routes, not around raw database creation.

- [ ] **Step 3: Replace the tab presentation**

Use icon + label for every tab. Maintain standard Expo Router tab primitives; do not adopt experimental navigation APIs.

- [ ] **Step 4: Write failing Today tests for visual-information states**

Cover:

```text
no projects -> actionable Create project empty state
active projects -> compact project rows
active timer RUNNING -> timer card + Pause + Stop
active timer PAUSED -> timer card + Resume + Stop
secondary actions -> manual time + expense
```

Existing functional service assertions must remain.

- [ ] **Step 5: Rebuild Today using design-system primitives**

Keep data-loading and timer behavior intact. Replace the oversized current layout with the approved hierarchy from Task 1.

- [ ] **Step 6: Write failing Start Work tests for the reconstructed flow**

Verify project context is clear, only project is mandatory, task/activity/description are optional, primary CTA is prominent, and the existing active-timer conflict remains conditional.

- [ ] **Step 7: Rebuild Start Work presentation without changing business semantics**

No raw SQLite, no new timer rules, no duplicate active interval paths.

- [ ] **Step 8: Run full automated verification**

```bash
npm run typecheck
npm run lint
npm run test:ci
```

Expected: zero failures.

- [ ] **Step 9: Commit**

```bash
git add app __tests__
git commit -m "feat: rebuild Today and Start Work UI"
```

---

### Task 5: Independent QA and physical Android approval gate

**Primary owner:** `qa_mobile_engineer`

**Files:**
- Create: `docs/qa/ui-rebuild-phase1-checklist.md`
- Update only if selectors require it: `e2e/maestro/critical-timer-flow.yaml`

**Interfaces:**
- Consumes: complete Phase-1 branch.
- Produces: independent PASS/FAIL report and the exact physical-device checklist used by the Product Owner.

- [ ] **Step 1: Run automated regression**

```bash
npm ci
npm run typecheck
npm run lint
npm run test:ci
```

Record exact suite/test counts in the QA document.

- [ ] **Step 2: Audit language coverage**

No user-visible Phase-1 string may remain hardcoded in only one language. Verify Spanish and English independently.

- [ ] **Step 3: Audit theme coverage**

Verify System, Light and Dark. Check text/control contrast, status visibility and icon visibility in both resolved themes.

- [ ] **Step 4: Audit accessibility**

Check semantic roles/labels for primary actions, tabs, timer actions and icon-only buttons; check minimum touch targets and no information conveyed only by color.

- [ ] **Step 5: Exercise on a physical Android device**

The Product Owner must be guided through exactly these states:

```text
1. fresh Today with no projects
2. Today with at least two synthetic active projects
3. Start Work with one project preselected
4. running timer Today state
5. paused timer Today state
6. Spanish UI
7. English UI
8. light theme
9. dark theme
```

Use synthetic data only.

- [ ] **Step 6: Product Owner visual gate**

The QA document must contain one of:

```text
VISUAL GATE: APPROVED BY PRODUCT OWNER
```

or

```text
VISUAL GATE: REJECTED — <specific findings>
```

A rejected gate blocks merge. The implementer receives concrete findings and the loop repeats.

- [ ] **Step 7: Commit QA evidence**

```bash
git add docs/qa e2e/maestro/critical-timer-flow.yaml
git commit -m "test: record phase 1 UI rebuild validation"
```

---

## Tech Lead integration rules

- Task 1 must complete before Task 3.
- Task 2 and Task 3 may overlap only after Task 1 has fixed the visual blueprint; files must not overlap except dependency metadata, which the Tech Lead reconciles.
- Task 4 starts only after Tasks 2 and 3 are independently reviewed.
- Task 5 is independent review; it must not implement feature fixes itself.
- Every task receives one primary owner and a separate reviewer.
- The Tech Lead resolves cross-task conflicts and owns merge readiness.
- After the Phase-1 Product Owner visual gate passes, create separate plans/issues for Projects, Tasks, Planning and More using the approved Phase-1 system; do not redesign those foundations independently.
