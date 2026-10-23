# Démo Propriétaire Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver a standalone browser-only interactive owner demo in the sibling Arrachid-Demo folder.
**Architecture:** Copy the current React interface. Export only fictional JSON fixtures from a freshly generated development dataset; implement reads and explicit state mutations in a local simulator. Provide direct owner context and a reset control.
**Tech Stack:** Existing React 19, TypeScript 5.7, Vite 6, Vitest and Playwright.
**Spec:** design.md. User approved execution and requested a separate sibling folder.

## Global Constraints
- No login, pairing, PIN prompts, backend, database or external business services at runtime.
- French UI and identifiers; integer quantities and money.
- Preserve the original application and keep the demo independently pushable.
- Root for Vercel is this standalone folder, build npm run build, output dist.

## Review Focus
- Invalid or unavailable browser storage must not prevent opening the demo.
- Unsupported actions must fail explicitly, never claim success.
- Changes must survive reload and reset must remove only demo-owned data.
- Fresh direct navigation must load owner screens without network API calls.
- Browser document links must show demo previews or clear limitations.

## Task 1: Standalone interface and fictional fixtures
- [x] Copy frontend sources without caches, secrets, generated output or original authentication tests.
- [x] Generate a fresh fictional dataset; export JSON contracts only to src/demo/donnees.json.
- [x] Add simulator tests for owner access, missing routes, mutations, persistence, storage failure and reset; run and confirm failure.

## Task 2: Local simulator and direct owner access
- [x] Implement src/demo/moteur.ts with explicit GET/POST handling, validated integer inputs, local persistence and idempotent commands.
- [x] Connect src/api/client.ts to the simulator and retain read caching.
- [x] Replace authentication/server providers only in the demo; keep real owner permissions.
- [x] Replace PIN prompts and Quitter with demo confirmation/reset; show a fictional-data banner.
- [x] Support supplier/reception/lab, bureau and reference edits; unsupported services explain limitations.
- [x] Run simulator tests and TypeScript/build, repair contract mismatches.

## Task 3: Browser verification and delivery
- [x] Verify owner routes and creation/edit/reset flows with Playwright, without mocked network APIs; capture errors and API requests.
- [x] Provide document previews or explicit demo explanations for binary/server routes.
- [x] Add vercel.json SPA fallback, .gitignore and README with local/Vercel/Git instructions and simulation limits.
- [x] Copy the complete standalone deliverable to ../Arrachid-Demo; verify build/tests there with independent dependencies.
- [x] Perform independent final code review and repair material issues; record checks in AVANCEMENT.md.

## Vérification finale — 23 octobre 2026

Exécution dans le dossier final avec ses propres dépendances : 15 tests du simulateur et 6 tests navigateur réussis, lint sans erreur, compilation TypeScript et Vite réussie. Vérification du tableau de bord compilé, du document de lot n° 12 et du rechargement d’un lien profond réussie. Revue indépendante : les deux défauts identifiés (catalogue des articles et nouveaux bacs) ont été corrigés avec tests de régression.
