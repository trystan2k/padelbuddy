---
title: Task 27 Refactor Tests to Use Synchronous Storage APIs.md
type: note
permalink: development-logs/task-27-refactor-tests-to-use-synchronous-storage-apis
tags:
- task
- tests
- hmFS
- refactor
---

# Development Log: Task 27

## Metadata
- Task ID: 27
- Date (UTC): 2026-02-22T16:33:47Z
- Project: padelscore
- Branch: n/a
- Commit: 77a370a23ecf2a39e7e20d78f0da294b67319a55
- Author: Thiago Mendonca

## Objective
- Align test suite with production storage implementation by refactoring tests to use synchronous Zepp OS hmFS file system APIs and simplify test logic.

## Implementation Summary
- Refactored test mocks and storage-related tests to use synchronous storage adapter methods matching Zepp OS hmFS (hmFS.SysProSetChars / hmFS.SysProGetChars).
- Replaced async/await patterns in tests with synchronous calls to reflect production behavior and prevent mismatches between test and runtime environments.
- Simplified several UI-focused tests by removing complex UI verification that depended on async flows no longer present in production.
- Removed confirmation timeout logic from home screen tests to mirror production code that no longer uses this flow.
- Updated storage tests to use hmFS-based mocks instead of settingsStorage to reflect actual runtime environment on Zepp OS.

## Files Changed
- tests/edge-case-handling.test.js — updated edge-case handling tests to use synchronous storage adapter and fixed mocks for hmFS behavior.
- tests/game-screen-layout.test.js — major simplification of layout-related tests; removed time-dependent UI assertions and adapted to sync storage API mocks.
- tests/home-screen.test.js — removed confirmation timeout logic; updated storage interactions to synchronous hmFS mocks.
- tests/match-storage.test.js — migrated persistence tests to use hmFS adapter; updated expected data flow and synchronous API calls.
- tests/setup-flow.test.js — aligned setup flow tests to use synchronous storage calls where applicable.
- tests/start-new-match-flow.test.js — simplified flow tests; replaced async storage usage with synchronous adapter methods.
- tests/storage.test.js — replaced settingsStorage mocks with hmFS synchronous mocks; adjusted assertions to match sync behavior.
- tests/summary-screen.test.js — simplified summary screen assertions and updated storage-related mocks.

## Key Decisions
- Use synchronous storage APIs in tests because production on Zepp OS uses synchronous hmFS file system calls (hmFS.SysProSetChars / hmFS.SysProGetChars). Matching test mocks to production reduces false positives/negatives and improves test reliability.
- Simplify UI assertions: removed complex UI verification that relied on asynchronous state and timeouts. Tests now focus on deterministic logic and storage verification, reducing flakiness.
- Replace settingsStorage mocks with hmFS to reflect actual runtime environment on Amazfit devices and ensure tests validate realistic behavior.

## Challenges Encountered
- Translating async test patterns to synchronous flows required revising many mocks and test setups to avoid awaiting non-existent promises.
- Ensuring test mocks faithfully replicate hmFS synchronous semantics (return values, error behavior) needed careful attention to edge cases (missing keys, corrupt data).
- Large simplification of game-screen tests required balancing coverage loss vs. improved reliability; some visual/UI timing behaviors cannot be effectively tested in the Node.js test environment and were removed.

## Validation Performed
- Code changes committed: 77a370a23ecf2a39e7e20d78f0da294b67319a55 (author: Thiago Mendonca)
- Files updated as listed above (8 test files; net -760 lines).
- QA gate command: npm run test — run locally as part of the change validation (developer executed tests against the refactored suite).
- Post-change verification: test suite executed and unstable/time-dependent assertions removed; overall test runtime and flakiness decreased (observed during developer validation).

## Risks and Follow-ups
- Risk: Some UI behaviors that depended on asynchronous timing or device-specific render timing were removed from tests; consider adding device-level integration tests on Zepp OS simulator or real devices to cover those cases.
- Follow-up: Add a small integration smoke test on the Zepp OS simulator that exercises home screen confirmation flows if those behaviors are reintroduced.
- Follow-up: Document the hmFS synchronous mock utilities used in tests for future contributors to reuse and extend.

## Notes
- This change reduces test complexity and makes unit tests more representative of the Zepp OS runtime environment.
- Keep an eye on any future production changes that reintroduce asynchronous storage behavior; tests should be revisited if that happens.
