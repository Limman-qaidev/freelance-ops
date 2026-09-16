# Freelance Ops

Offline-first mobile operations app for freelance work: time tracking, project control, expenses, billing preparation, reporting, and resilience.

## Current status

Implementation has started with **FND-001**, the Expo application foundation. Product behavior is defined in `docs/superpowers/specs/` and the executable implementation plan is in `docs/superpowers/plans/`.

## Stack

- Expo / React Native
- Expo Router
- TypeScript strict
- Android-first, cross-platform
- SQLite local persistence (introduced in FND-003)

## Local setup

```bash
npm ci
npm run typecheck
npm run lint
npm start
```

For Android:

```bash
npm run android
```

## Architecture

UI routes depend on application use cases, which depend on domain contracts. Infrastructure adapters implement persistence/filesystem concerns. UI code must never issue SQL directly.

See `AGENTS.md` for repository rules and source-of-truth documents.

## Privacy

This is a public repository. Do not commit real client data, time records, rates, budgets, receipts, exports, databases, backups, or secrets.
