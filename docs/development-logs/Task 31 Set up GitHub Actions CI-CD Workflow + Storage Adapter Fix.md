---
title: Task 31 Set up GitHub Actions CI/CD Workflow + Storage Adapter Fix
type: note
permalink: development-logs/task-31-set-up-git-hub-actions-ci-cd-workflow-storage-adapter-fix
tags:
- task
- PAD-031
- ci
- github-actions
- bugfix
---

# Development Log: Task 31

## Metadata
- Task ID: 31
- Date (UTC): 2026-02-24T00:00:00Z
- Project: padelbuddy
- Branch: feature/PAD-031-github-actions-ci-cd-workflow
- Commit: n/a (not provided)
- PR: #25 (merged)

## Objective
- Set up a GitHub Actions CI/CD workflow for padelbuddy and fix a post-merge test flakiness caused by a storage adapter cache bug.

## Implementation Summary
- Created a GitHub Actions workflow (.github/workflows/ci.yml) that runs on push to main and pull_request with a Node.js matrix (18.x, 20.x).
- Adjusted project scripts and tracking so CI can run reproducibly: removed package-lock.json from .gitignore, regenerated package-lock.json, and added a format check script to package.json.
- Fixed a test flakiness bug in utils/match-storage.js by removing a persistent caching write-back that caused the runtime storage adapter to hold stale references across tests.
- Performed lint and formatting fixes (42 diagnostics across 15 files) so CI lint/format gates pass.

## Files Changed
- .github/workflows/ci.yml (CREATED)
- package.json (MODIFIED) — added "format:check": "biome format ."
- .gitignore (MODIFIED) — removed package-lock.json entry
- package-lock.json (ADDED / TRACKED)
- utils/match-storage.js (MODIFIED) — removed write-back of resolved runtime storage from save/load/clear to avoid caching stale storage closure
- Various files (15 files) with lint fixes across template literals, unused imports, unused parameters prefixed with `_`, optional chaining, and Number.isFinite conversion.

## Key Decisions
- Use Biome format check workaround: add "format:check" script rather than using Biome's `--check` flag which crashes with v2.4.4.
- Track package-lock.json in repo to ensure `npm ci` works reliably in CI.
- Avoid permanently caching resolved runtime storage in ZeppOsStorageAdapter to prevent test flakiness across runs that swap globalThis.hmFS.
- Run Zeus CLI install and zeus build only on Node 20.x runner to keep CI faster on older Node versions.

## Validation Performed
- mcp_basic-memory: Search for existing log before create: pass — no existing memory found for Task 31.
- CI pipeline (local/QA): Lint: 0 warnings after fixes.
- Test suite: 211/211 tests pass after fixes.
- Format: clean (format:check script passes after fixes).

## Root Cause Analysis (Bug Fix)
- Symptom: A test failed in CI only: "game access guard redirects to setup when persisted session is invalid JSON".
- Cause: ZeppOsStorageAdapter permanently cached `this.storage` reference after first resolution. Because matchStorage is a module-level singleton and tests swap `globalThis.hmFS` between runs, the adapter kept referencing the first test's file store through a stale closure.
- Fix: Removed the write-back assignment that set `this.storage` when resolving runtime storage in save(), load(), and clear(). Each call now re-evaluates `resolveRuntimeStorage()` and uses the current `globalThis.hmFS`.

## Risks and Follow-ups
- Risk: If `resolveRuntimeStorage()` is expensive, removing caching could have performance implications; however, the adapter is small and calls are infrequent relative to IO, and correctness in test/CI is higher priority.
- Follow-up: Consider memoizing per-runtime-instance (not module-global) if profiling shows regression, or add an explicit reset hook for test environments.
- Follow-up: Address non-blocking code review suggestions: npm audit threshold, concurrency policy, Zeus CLI version pinning.

## Notes
- CI configuration includes caching keyed on package-lock.json hash; ensure package-lock.json is kept updated on dependency changes.
- This log captures both the feature implementation and the subsequent bug fix as requested.
