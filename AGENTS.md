# Freelance Ops — Agent Instructions

## Product source of truth

Before implementing product behavior, read the relevant approved documents:

- `docs/superpowers/specs/README.md`
- `docs/superpowers/specs/2026-09-16-freelance-ops-v1-design.md`
- `docs/superpowers/specs/2026-09-16-freelance-ops-v1-domain-model.md`
- `docs/superpowers/specs/2026-09-16-freelance-ops-v1-ui-ux.md`
- `docs/superpowers/specs/2026-09-16-freelance-ops-v1-quality-delivery.md`
- `docs/superpowers/specs/2026-09-17-freelance-ops-ui-rebuild.md`
- `docs/superpowers/plans/2026-09-16-slice0-slice1-implementation-plan.md`
- Visual reference: `docs/assets/concepts/freelance-ops-v1-ui-concept.jpg`

If an issue conflicts with an approved spec, stop and surface the conflict rather than silently changing product semantics.

For UI reconstruction work, the 2026-09-17 rebuild document is a delta over the existing approved V1 specs. Existing functional/domain rules remain authoritative unless a separate approved issue changes them.

## Architecture

Freelance Ops is Android-first, cross-platform, offline-first, and local-only in V1.

Required dependency direction:

```text
UI / routes
  -> application use cases
  -> domain contracts
  -> infrastructure adapters
  -> SQLite / filesystem
```

Rules:

- UI/routes must never execute SQL or receive a raw SQLite database handle.
- Domain code must not import Expo, React Native, SQLite, filesystem, or UI modules.
- Infrastructure implements domain/application interfaces; it does not define business semantics.
- TypeScript strict mode must remain enabled.
- Prefer small, focused files and explicit interfaces.
- Do not introduce backend, authentication, Firebase, Supabase, cloud sync, Docker, or mandatory online APIs in V1.
- Do not adopt experimental navigation APIs; use standard Expo Router primitives.

## Specialized agent routing

The repository defines specialized Codex profiles under `.codex/agents/`.

Use one primary implementation owner per coherent task. Do not dispatch multiple implementation agents to edit the same responsibility concurrently.

| Agent | Primary ownership | Must not own |
| --- | --- | --- |
| `product_designer` | information hierarchy, flow, density, visual review, design acceptance criteria | domain/business logic, production feature code |
| `design_system_engineer` | `src/ui/**`, theme/tokens, iconography, reusable primitives | feature business behavior, domain/infrastructure |
| `mobile_ui_engineer` | `app/**`, UI-facing feature screens/navigation | persistence/domain semantics, ad-hoc design-system replacements |
| `localization_accessibility_engineer` | ES/EN resources, locale formatting, language override, accessibility | independent feature redesign, storage-model changes |
| `qa_mobile_engineer` | UI/integration tests, Maestro, device regression, runbooks/evidence | product feature implementation except approved testability hooks |
| `tech_lead` | read-only architecture/integration/final technical review | production implementation, self-approval |

The ChatGPT conversation controller is the acting Tech Lead/controller for the program. It scopes work, chooses the implementation owner, coordinates dependencies, adjudicates conflicts, requests independent review, and owns merge readiness.

Implementers do not approve their own work.

## UI reconstruction constraints

While UI-002 / #24 is open:

- Primary tabs remain Today / Projects / Tasks / Planning / More.
- Spanish and English are both supported.
- Initial language follows device locale; unsupported locales fall back to Spanish; manual override is persisted.
- Theme supports System / Light / Dark, with System as default.
- Visual identity uses graphite + petroleum/teal.
- The interface must be compact, professional and productivity-oriented.
- Use real iconography; text glyph placeholders are not acceptable UI icons.
- Empty states must expose the next useful action.
- User-visible strings must use the localization layer once it exists.
- Do not change domain semantics under the guise of a visual rebuild.

## Visual approval gate

A materially changed screen is not merge-ready until all of the following apply:

1. required automated checks are green;
2. an independent review has no unresolved blocking findings;
3. the changed screen has been exercised on a physical Android device;
4. the Product Owner has explicitly approved the visual result on-device.

Compilation, unit tests, Maestro, screenshots, emulator inspection, or agent review do not substitute for Product Owner physical-device visual approval.

Do not merge a materially changed visual PR before that approval.

## Data integrity

- At most one work interval may be open globally.
- Time is derived from persisted UTC timestamps; do not store decimal hours as the source of truth.
- Money uses integer minor units; do not persist binary floating-point amounts as the monetary source of truth.
- Master data with history is archived rather than physically deleted.
- Critical state transitions must be transactional.
- Historical rates and FX values must remain stable once closed/billed.

## Privacy and repository hygiene

This repository is public. Never commit real customer, project, financial, or personal operational data.

Never commit:

- real time entries or client notes;
- actual private rates, budgets, invoices, exports, or billing closures;
- receipts or client documents;
- SQLite/database files;
- backups;
- credentials, tokens, API keys, or `.env` files.

Fixtures must be synthetic and obviously fake.

## Development workflow

- One coherent issue per branch/PR.
- Follow the issue acceptance criteria and the implementation plan.
- For behavior changes, write tests first unless the work is generated/configuration-only scaffolding.
- Before requesting review, run the issue-required verification commands.
- Do not weaken tests, strictness, lint rules, timeouts, or integrity checks merely to make CI pass.
- PR descriptions must state what changed, what was verified, and any known limitations.
- Keep REL-001 / #11 blocked until the UI reconstruction has passed its visual gates and the release reliability checks are rerun.