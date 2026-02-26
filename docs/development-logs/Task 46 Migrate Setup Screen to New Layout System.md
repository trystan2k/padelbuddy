---
title: Task 46 Migrate Setup Screen to New Layout System
type: note
permalink: development-logs/task-46-migrate-setup-screen-to-new-layout-system
---

# Development Log: Task 46

## Metadata

- Task ID: 46
- Date (UTC): 2026-02-26T00:00:00Z
- Project: padelbuddy
- Branch: n/a
- Commit: n/a

## Objective

- Refactor page/setup.js to use the new declarative layout system and update the UI based on user feedback.

## Implementation Summary

- Migrated the setup screen to the new layout system (SETUP_LAYOUT) replacing the previous token-based layout.
- Applied user-requested adjustments after initial implementation:
  1. Removed Card Container: removed createCard from imports and layout; elements now render directly on background.
  2. Button Height: aligned all buttons to use toPercentage(TOKENS.sizing.buttonHeight) (15%) and removed clamp() calls to use layout values directly.
  3. Bigger Font Sizes: title updated from 'sectionTitle' to 'pageTitle'; help text changed from 'body' to 'bodyLarge'.
  4. Title in Header Section: moved title element from body to header; header height changed from 10% to 20%; body element positions updated accordingly.

## Updated Layout Structure

```
SETUP_LAYOUT:
  sections:
    header: (20%) - contains title
    body: (fill) - contains helper text, option buttons, start button, error message
```

## Files Changed

- page/setup.js

## Key Decisions

- Removed the card wrapper to let elements render directly on the background for visual parity with the requested design.
- Standardized button sizing to the same layout-derived value used in pages/index.js for consistency.
- Increased prominence of the page title and help text by switching to larger typography tokens.
- Header expanded to 20% to accommodate the relocated title; body layout adjusted to fill remaining space.

## Validation Performed

- lint: pass - Lint checks completed successfully.
- format: pass - Formatting checks completed successfully.
- tests: pass - 292/292 tests passed.

## Risks and Follow-ups

- None identified during QA; monitor for visual regressions on devices with unusual aspect ratios.
- If additional typography adjustments are requested, follow up with a small visual polish PR.
