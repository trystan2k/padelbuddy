---
title: Task 25 Implement Screen Keep-Awake During Active Game.md
type: note
permalink: development-logs/task-25-implement-screen-keep-awake-during-active-game.md
tags:
- task
- development-log
- Task 25
---

# Development Log: Task 25 Implement Screen Keep-Awake During Active Game

## Metadata
- Task ID: 25
- Date (UTC): 2026-02-22T12:29:02Z
- Project: padelscore
- Branch: n/a
- Commit: 8dcc9f33cf2a1c0941ec2820ad13947f024ce1e0
- Author: Thiago Mendonca

## Objective
- Prevent the watch from returning to the watchface while an active game is in progress by keeping the screen awake during gameplay.

## Implementation Summary
- Implemented a two-tier screen management approach:
  - App-level: on app startup (app.onCreate) we call hmSetting.setScreenKeep(true) to prefer the app relaunching instead of returning to the watchface when the screen turns off.
  - Page-level: in the game page, onShow sets the bright-screen control to maximum (hmSetting.setBrightScreenCtrl(0)) to keep the screen lit during gameplay; onDestroy restores the default behavior (hmSetting.setBrightScreenCtrl(-1)).
- All hmSetting calls are wrapped in try-catch blocks to handle simulator environments and devices that may not expose these APIs.

## Files Changed
- app.js — Added app-level screen keep setting in onCreate to prefer app relaunch.
- page/game.js — On show: set bright screen to maximum; on destroy: cancel/restore bright screen control. Protected API calls with try-catch.

## Key Decisions
- Two-tier approach (global preference + page-scoped control) to cover both relaunch behavior and active brightness during gameplay.
- Wrap hmSetting usage in try-catch to avoid crashes in simulator or on devices lacking the API.
- Restrict the aggressive keep-awake behavior to the active game page lifecycle (onShow/onDestroy) to reduce unnecessary battery drain.

## Validation Performed
- Static verification of code changes and commit contents (commit 8dcc9f33...).
- Simulator verification: entering and exiting the game page did not produce uncaught exceptions due to hmSetting calls because of try-catch guards.
- Post-deployment recommendation: perform manual validation on physical devices (e.g., GTR/GTS family) to verify that the screen remains on during an active match and that normal screen timeout is restored after exiting the game.

## Risks and Follow-ups
- Battery usage increase while screen is kept on — consider adding a user-facing setting to opt into keep-awake or limit maximum duration.
- Some devices/OS builds may behave differently with hmSetting APIs — collect device-specific logs if users report issues.
- Consider telemetry to measure how often keep-awake is triggered and battery impact over time.

## Notes
- Commit message: "feat: keep screen on during game to prevent watchface return"
- APIs used: hmSetting.setScreenKeep(true), hmSetting.setBrightScreenCtrl(0), hmSetting.setBrightScreenCtrl(-1)
