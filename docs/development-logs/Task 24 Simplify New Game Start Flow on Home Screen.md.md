---
title: Task 24 Simplify New Game Start Flow on Home Screen.md
type: note
permalink: development-logs/task-24-simplify-new-game-start-flow-on-home-screen.md
---

# Development Log: Task 24 Simplify New Game Start Flow on Home Screen

## Metadata
- Task ID: 24
- Date (UTC): 2026-02-22T11:46:32Z
- Project: padelscore
- Branch: n/a
- Commit: b18e8e80cab73c4c946f9d0f9c521f6e3e90c310
- Author: Thiago Mendonca

## Objective
- Reduce friction on the Home Screen by removing the hard-reset confirmation when starting a new game so users can begin a new match immediately.

## Implementation Summary
- Removed the intermediate confirmation UI and timer that required the user to confirm starting a new game.
- Simplified the Home Screen start flow so the "Start New Game" action immediately initializes a new game session and resets match state.
- Deleted unused state and timer logic related to the confirmation flow (approximately 71 lines removed in the single modified file).

## Files Changed
- page/index.js
  - Purpose: Home screen UI and start-new-game logic. The file previously contained the confirmation modal/timer and related state; those lines were removed and the start handler now proceeds immediately.

## Key Decisions
- UX simplification: remove confirmation step to reduce friction for frequent users (primary rationale).
- Preserve safety by ensuring the start-new-game handler performs the same state reset deterministically; no additional side-effects were added.
- Single-file change: minimize scope to the Home Screen logic (page/index.js) to reduce regression surface.

## Challenges Encountered
- Ensuring no residual references to removed timer/state remained (required careful scan of page/index.js to remove all related handlers and bindings).
- Regressions risk: confirmation removal changes user flow expectations; mitigated by smoke testing on simulator and manual verification.

## Validation Performed
- Code review of page/index.js diff to confirm only confirmation-related state/timer logic removed and that the start handler initializes game state correctly.
- Manual QA on Zepp OS simulator: verified that tapping "Start New Game" immediately starts a new game and no confirmation/modal appears.
- Smoke check (local): built/run in the simulator and exercised the start/reset flow; no crashes observed.

## Risks and Follow-ups
- Risk: users accustomed to confirmation may trigger accidental resets. Follow-up: monitor user feedback and consider an opt-in confirmation setting if accidental starts are reported.
- Follow-up: add automated UI test covering start-new-game flow if/when UI test infra is available.

## Commit Reference
- Commit: b18e8e80cab73c4c946f9d0f9c521f6e3e90c310
- Message: "refactor: remove hard reset confirmation for starting new game"
