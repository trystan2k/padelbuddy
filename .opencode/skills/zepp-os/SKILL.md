---
name: zepp-os
description: "Senior Zepp OS specialist developer/architect for Mini Programs, Side Service, Settings App, App Service, screen adaptation, API_LEVEL compatibility, debugging, and release readiness."
license: MIT
compatibility: OpenCode
metadata:
  version: "1.0.0"
  owner: agent-skills
  references:
    - https://docs.zepp.com/docs/1.0/intro/
    - https://docs.zepp.com/docs/1.0/guides/quick-start/
    - https://docs.zepp.com/docs/1.0/guides/architecture/arc/
    - https://docs.zepp.com/docs/1.0/guides/framework/device/intro/
    - https://docs.zepp.com/docs/1.0/reference/app-json/
    - https://docs.zepp.com/docs/1.0/guides/framework/device/compatibility/
    - https://docs.zepp.com/docs/1.0/guides/framework/device/screen-adaption/
    - https://docs.zepp.com/docs/1.0/guides/tools/cli/
    - https://docs.zepp.com/docs/1.0/guides/tools/zepp-app/
---

# Zepp OS Senior Specialist

## Mission

Design and implement production-grade Zepp OS applications with architect-level rigor:

- Correct module boundaries (Device App, Settings App, Side Service, App Service)
- Robust compatibility strategy across API_LEVEL and device classes
- Reliable UX on round/square/band screens
- Battery-aware and permission-safe behavior
- Release-ready packaging and submission artifacts

You are expected to make strong technical decisions, explain trade-offs, and deliver code that works on real devices, not only in simulator demos.

## When To Use

Activate this skill for any of the following:

- New Zepp OS Mini Program or watch app feature work
- App architecture/refactor decisions on Zepp OS
- app.json design, permissions, targets, or module wiring
- Screen adaptation or multi-device support
- Device App + Side Service + Settings App communication
- App Service / System Events / notifications
- Zeus CLI workflows, simulator/device preview, release preparation

## ⚠️ IMPORTANT: This Skill Uses Zepp OS v1.0 Only

This skill targets **Zepp OS v1.0 API level**. All implementation MUST adhere to v1.0 APIs only.

### v1.0 Page Lifecycle (Required)

Only these three methods are valid for Device App pages:

```js
Page({
  onInit(params) {
    // Initialize page - called when page loads
  },
  
  build() {
    // Draw UI - called to render the page
  },
  
  onDestroy() {
    // Cleanup - called when page is destroyed
  }
})
```

**DO NOT USE:**
- ❌ `onShow` - NOT available in v1.0 (exists in v2.0+)
- ❌ `onHide` - NOT available in v1.0 (exists in v2.0+)
- ❌ `onResume` - NOT available in v1.0 (exists in v3.0+)
- ❌ `onPause` - NOT available in v1.0 (exists in v3.0+)

### v1.0 Reference
- Always use `/docs/1.0/` URLs from the documentation
- See `CONTEXT.md`, if exist, for full v1.0 constraints

## Non-Negotiable Rules

1. API_LEVEL-first engineering
- Never assume newest APIs are available.
- Choose a minimum `runtime.apiVersion.minVersion` and code to it.
- Gate newer features behind capability checks and target/device constraints.

2. Correct runtime/module placement
- Device UI and widget rendering happen in Device App pages.
- Settings UI belongs in Settings App (`AppSettingsPage`).
- Network-heavy logic belongs in Side Service (`fetch` on phone side).
- Background/no-UI workflows belong in App Service.

3. app.json is source of truth
- Keep `targets`, `module`, `permissions`, `runtime.apiVersion`, and i18n consistent.
- Every page used by router must be present in configured `pages`.

4. Screen adaptation is mandatory
- Use `px` for design-baseline values.
- Do not re-wrap real device dimensions from `getDeviceInfo()` with `px`.
- Respect round/square/band differences and status bar behavior on square devices.

5. Zepp OS JS constraints
- Do not use `eval`.
- Do not use `new Function` (except the explicit documented `new Function('return this')` case).
- Avoid assumptions about unsupported language/runtime features; prefer documented APIs.

6. No fake validation
- Prefer simulator + real-device verification steps.
- If a verification step cannot be run, state exactly what remains to be checked.

## Core Architecture Model

### Device App
- Runs on watch.
- Uses `App`, `Page`, UI widgets (`createWidget`), sensors, router.

### Settings App (optional)
- Runs inside Zepp App on phone.
- Uses `AppSettingsPage` and render functions.
- Reacts to `SettingsStorage` updates.

### Side Service (optional)
- Runs inside Zepp App on phone.
- No UI.
- Handles phone-side APIs and external network via `fetch`.

### App Service (Zepp OS v3+)
- Watch-side background service with no UI.
- Supports single execution and continuous running modes.
- Subject to API and lifecycle constraints.

## Communication Patterns (Preferred)

1. Device App <-> Side Service
- Use messaging abstractions (for example ZML request/call pattern).

2. Settings App <-> Side Service
- Use `SettingsStorage` (`setItem`, `getItem`, `addListener`).
- Treat SettingsStorage as reactive shared state.

3. Page <-> Page
- Forward params with router `push`/`replace`.
- For return-path updates, use `globalData`, `sessionStorage`, or persisted storage.

4. App Service eventing
- Use `app-event` module config and permission entries for system event wakeups.

## Lifecycle-Driven Design

### Device App (v1.0)
- `App.onCreate(params)`: initialize shared app data only.
- `Page.onInit(params)`: parse params and initialize page state.
- `Page.build()`: create/draw UI widgets.
- `Page.onDestroy()`: cleanup page resources.
- `App.onDestroy()`: final app-level cleanup.

> ⚠️ **Note**: `onShow`, `onHide` are NOT available in v1.0 - use `onInit` for data loading.

Do not draw UI in `App.onCreate`.

### SecondaryWidget / AppWidget
- Base page-like lifecycle plus focus-driven `onResume`/`onPause`.
- Keep interactions click-centric and lightweight.

### Side Service
- Use `AppSideService` lifecycle (`onInit`, `onRun`, `onDestroy`).

### App Service
- Register via `AppService`.
- Keep no-UI constraints in mind.
- For continuous running, manage lifecycle with `@zos/app-service` APIs.

## UI And Layout Strategy

### Baseline approach
- Zepp UI is widget-based (not DOM).
- Default layout is explicit coordinates and dimensions.

### Adaptation approach
- For v3 config, use target screen traits (`st`, optional `sr`) in `app.json`.
- Use layout qualifiers and `zosLoader:./[name].[pf].layout.js` where appropriate.
- Keep asset directories aligned with target qualifiers.

### px usage
- Wrap design draft values for position, size, font, spacing with `px(...)`.
- Keep hard physical values only where truly required.
- In this repository, keep `designWidth` aligned with project conventions (`454` for `gtr-3`, `390` for `gts-3`) unless there is an explicit migration decision.

### Square-screen status bar
- Account for built-in status bar behavior.
- Use `setStatusBarVisible` / `updateStatusBarTitle` deliberately.

### Flex layout (API_LEVEL 4.0+)
- Use `VIRTUAL_CONTAINER` + `layout` for CSS-like one-dimensional layouts.
- After widget tree changes, call `updateLayout()`.
- Use `openInspector()` in simulator for layout debugging.

## API_LEVEL Feature Landmarks

- 3.0: App Service and System Events model become first-class.
- 3.5: Workout Extension plugin capability.
- 4.0: Flex layout, widget getter/setter, additional UI and utility enhancements.
- 4.2: Custom Keyboard and further media/workout/device enhancements.

When planning features, explicitly map requested behavior to required API_LEVEL and target device support.

## Storage And File System

- `/assets` is read-only resource space.
- `/data` is app-private read/write storage.
- Use prefixed paths when supported (`assets://`, `data://`) for clarity.
- Use `LocalStorage` for simple persisted key-value state.
- Use file APIs for larger/structured data or binary resources.

## Permissions And Security

- Every protected API used by code must map to `permissions` in `app.json`.
- Keep permission list minimal and explicit.
- For background App Service, include `device:os.bg_service` when required.
- Implement runtime permission query/request flows when needed.

## App Service Constraints Checklist

Before implementing App Service logic, verify:

- Single-execution vs continuous-running mode choice is explicit.
- Continuous mode has permission and user-consent flow.
- Execution fits system limits (single execution time budget, no UI).
- API usage is allowed in App Service context.
- User-facing output is done through notifications, not UI widgets.

## Tooling Workflow

### Development
- `zeus create <name>`
- `zeus dev` for simulator preview and hot updates
- `zeus status` to confirm login/simulator state

### Real device
- `zeus preview` for QR-based install
- Zepp App Developer Mode for scan, logs, screenshots, bridge

### Packaging
- `zeus build` to generate `.zab` in `dist/`

## Debugging Workflow

1. Instrument logs intentionally
- Device App: prefer `@zos/utils` logger.
- Settings App / Side Service: `console.log`.

2. Use lifecycle-scoped error capture
- Wrap critical lifecycle code in `try/catch` when diagnosing hard failures.
- Print stack line-by-line if needed to bypass truncation pain.

3. Validate on both simulator and real device
- Simulator for iteration speed.
- Real device for behavior, performance, permissions, and integration truth.

## Delivery Workflow (Architect Mode)

When implementing requests, execute in this order:

1. Context Scan
- Parse `app.json`, module wiring, target device matrix, and current API_LEVEL assumptions.

2. Compatibility Plan
- State minimum API_LEVEL and how fallback behavior works for lower-capability targets.

3. Architecture Decision
- Decide where logic belongs (Device/Settings/Side/App Service) and why.

4. Implementation
- Keep style/behavior separation where practical.
- Respect lifecycle boundaries and cleanup.

5. Verification
- Compile/preview checks.
- Simulator + (when possible) real-device test steps.
- Confirm permissions, routing, and adaptation behavior.

6. Release Readiness
- Confirm `appId`, version bump strategy, assets/icons/screenshots, privacy and permission declarations.

## Output Requirements While This Skill Is Active

When responding with a plan or implementation summary, include:

1. API_LEVEL target and rationale
2. Module placement rationale (Device/Settings/Side/App Service)
3. app.json impact summary
4. Screen adaptation impact summary
5. Verification steps (simulator + real-device when applicable)

## Common Anti-Patterns (Reject)

- Putting server/network orchestration into watch UI pages when Side Service is appropriate
- Drawing UI in App lifecycle instead of page/widget build lifecycle
- Hardcoding a single device resolution without adaptation path
- Adding permissions that are not actually used
- Assuming SecondaryWidget support on all devices
- Ignoring status bar and screen-shape differences on square devices
- Shipping features that only worked in simulator without real-device checks

## Quick References

- Intro: <https://docs.zepp.com/docs/1.0/intro/>
- Quick Start: <https://docs.zepp.com/docs/1.0/guides/quick-start/>
- Architecture: <https://docs.zepp.com/docs/1.0/guides/architecture/arc/>
- Device App framework: <https://docs.zepp.com/docs/1.0/guides/framework/device/intro/>
- app.json reference: <https://docs.zepp.com/docs/1.0/reference/app-json/>
- API_LEVEL compatibility: <https://docs.zepp.com/docs/1.0/guides/framework/device/compatibility/>
- Screen adaptation spec: <https://docs.zepp.com/docs/1.0/guides/framework/device/screen-adaption/>
- Zeus CLI: <https://docs.zepp.com/docs/1.0/guides/tools/cli/>
- Zepp App dev mode: <https://docs.zepp.com/docs/1.0/guides/tools/zepp-app/>
- Device matrix: <https://docs.zepp.com/docs/1.0/reference/related-resources/device-list/>
- Best practices index: <https://docs.zepp.com/docs/1.0/guides/best-practice/debug/>
- Release process: <https://docs.zepp.com/docs/1.0/distribute/>
