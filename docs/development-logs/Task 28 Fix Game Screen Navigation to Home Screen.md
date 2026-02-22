---
title: Task 28 Fix Game Screen Navigation to Home Screen
type: note
permalink: development-logs/task-28-fix-game-screen-navigation-to-home-screen
tags:
- task:28
- development-log
---

# Development Log: 28

## Metadata
- Task ID: 28
- Date (UTC): 2026-02-22T12:34:00Z
- Project: padelbuddy
- Branch: n/a
- Commit: n/a

## Objective
- Fix navigation from Game and Summary screens so the 'Return to Home' button and swipe/range gestures navigate directly to the Home Screen (page/index) and preserve state where required.

## Implementation Summary
- Removed usage of undocumented onBack() lifecycle handler (original implementation removed).
- Implemented documented gesture-based navigation using hmApp.registerGestureEvent(callback) and hmApp.unregisterGestureEvent().
- page/game.js:
  - Removed: onBack() handler (undocumented API).
  - Added: registerGestureHandler() method which registers a gesture handler via hmApp.registerGestureEvent(callback).
  - Added: unregisterGestureHandler() method which calls hmApp.unregisterGestureEvent() for cleanup during onDestroy.
  - Behavior: RIGHT gesture saves game state and navigates to Home; other gestures return false to preserve default behavior.
- page/summary.js:
  - Added: registerGestureHandler() method using hmApp.registerGestureEvent(callback).
  - Added: unregisterGestureHandler() method for cleanup.
  - Behavior: RIGHT gesture navigates to Home (match finished so no state save required).
- tests/game-screen-layout.test.js:
  - Removed: 5 tests that asserted onBack behavior.
  - Added: 5 tests validating gesture handler registration, RIGHT gesture behavior, non-RIGHT gestures returning false, unregister on onDestroy, and graceful behavior when hmApp is unavailable.

## Files Changed
- page/game.js
- page/summary.js
- tests/game-screen-layout.test.js

## Key Decisions
- Removed reliance on undocumented onBack() lifecycle handler (not part of Zepp OS v1.0) to avoid compatibility and maintenance risk.
- Adopted documented hmApp.registerGestureEvent(...) and hmApp.unregisterGestureEvent() APIs from Zepp OS v1.0 to handle swipe gestures and ensure forward compatibility.
- Decision rationale: use only documented APIs per project requirement and Zepp OS v1.0 compatibility constraints.

## Validation Performed
- npm test: all 191 tests pass - PASS
- QA Gate: PASS
- Code Review: APPROVED
- Tests added/updated in tests/game-screen-layout.test.js validated gesture behavior and cleanup.

## Acceptance Criteria
- Return to Home button navigates directly to Home Screen: ✅
- Swipe RIGHT gesture navigates directly to Home Screen: ✅
- State preservation works (save before navigation on game page): ✅
- Resume Game functionality works: ✅
- Uses only documented Zepp OS v1.0 APIs: ✅

## Risks and Follow-ups
- Ensure hmApp API availability on older or customized device images; added defensive tests to avoid runtime exceptions when hmApp is missing.
- Monitor for any platform-specific gesture behavior differences across devices; file a follow-up ticket if inconsistencies are observed in the field.
