# Freelance Ops — Agent Instructions

## Product source of truth

Before implementing product behavior, read the relevant approved documents:

- `docs/superpowers/specs/README.md`
- `docs/superpowers/specs/2026-09-16-freelance-ops-v1-design.md`
- `docs/superpowers/specs/2026-09-16-freelance-ops-v1-domain-model.md`
- `docs/superpowers/specs/2026-09-16-freelance-ops-v1-ui-ux.md`
- `docs/superpowers/specs/2026-09-16-freelance-ops-v1-quality-delivery.md`
- `docs/superpowers/plans/2026-09-16-slice0-slice1-implementation-plan.md`
- Visual reference: `docs/assets/concepts/freelance-ops-v1-ui-concept.jpg`

If an issue conflicts with an approved spec, stop and surface the conflict rather than silently changing product semantics.

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
- Do not weaken tests, strictness, lint rules, or integrity checks merely to make CI pass.
- PR descriptions must state what changed, what was verified, and any known limitations.

## FND-001 scope note

The initial scaffold intentionally contains placeholder tab screens only. Do not add SQLite, project CRUD, timers, real data, or commercial logic until their dedicated issues.
