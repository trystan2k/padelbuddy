---
title: Task 45 Migrate Home Screen to New Layout System
type: note
permalink: development-logs/task-45-migrate-home-screen-to-new-layout-system
---

# Development Log: 45

## Metadata
- Task ID: 45
- Date (UTC): 2026-02-26T12:02:14Z
- Project: padelbuddy
- Branch: feature/PAD-45-migrate-home-screen-to-new-layout-system
- Commit: n/a

## Objective
- Migrate the Home Screen to the new declarative layout system.

## Implementation Summary
- Refactored page/index.js to use the new declarative layout system.
- Removed legacy HOME_TOKENS and local getScreenMetrics method.
- Added new imports: design-tokens, screen-utils, layout-engine, ui-components.
- Created INDEX_LAYOUT schema with header (22%), body (fill), footer (15%).
- Configured five layout elements: logo, pageTitle, primaryButton, secondaryButton, settingsButton.
- Refactored renderHomeScreen() to use resolveLayout() and factories: createBackground, createText, createButton.
- Preserved all handlers: Start New Game, Resume Game, Settings.

## Files Changed
- page/index.js

## Key Decisions
- Adopted the new declarative layout engine for consistency across screens.
- Kept handlers intact to ensure behavioral parity; visual adjustments only.
- Footer and header size percentages chosen for visual balance on target devices.

## Validation Performed
- Lint: pass - 58 files
- Format: pass - 58 files
- Tests: pass - 292/292

## Risks and Follow-ups
- Minor: Settings button dimensions flagged in code review; follow-up to adjust sizing if design requires.
- Follow-up: Monitor runtime on smaller screen models; adjust header/footer percentages if needed.

