# Plan 1 Project Initialization & Configuration

## Task Analysis
- Main objective: Complete Taskmaster Task 1 by finalizing Zepp app bootstrap and configuration so the app builds and launches as a blank/default screen on both round and square simulators.
- Identified dependencies: Existing scaffold already present (`app.json`, `app.js`, `page/index.js`, `app-side/index.js`, `setting/index.js`); Zepp CLI + simulator availability; valid Zepp storage permission key for API 1.x; real production `appId` may still be pending from Zepp Console.
- System impact: Low-to-medium, config-first changes concentrated in `app.json`, plus minimal structure updates (`utils/` and any missing target asset folder under `assets/`); no scoring logic/UI complexity yet.

## Chosen Approach
- Proposed solution: Incrementally update the current scaffold (do not recreate project), mapping work directly to subtasks 1.1-1.5 and validating after each phase before moving on.
- Justification for simplicity: Considered (A) re-running `zeus create`, (B) patching existing scaffold, (C) adding early responsive abstractions; selected (B) because it avoids destructive overwrite and keeps scope to required initialization, while (A) and (C) are higher risk/overengineered for Task 1.
- Components to be modified/created: `app.json` (metadata, permissions, targets, design widths), `utils/` (create if missing), `assets/<round-target>/icon.png` (if required by added round target), optional short responsive convention note in `docs/GET_STARTED.md` to enforce px/rpx guidance for next tasks.

## Implementation Steps
1. **Preflight and guardrails**: Confirm scaffold is already initialized, preserve current `page/` convention (do not rename to `pages/`), and snapshot current `app.json` content before edits for fast rollback.
2. **[1.1] Initialize structure (non-destructive)**: Keep existing Zepp module layout (`page/`, `app-side/`, `setting/`), create `utils/` directory if absent, and ensure `assets/` contains icon folders for all configured targets.
3. **[1.2] Configure metadata in `app.json`**: Set final `app.appName`, `app.version.code`, `app.version.name`, and `i18n.en-US.appName`; keep `appId` as real console ID if available, otherwise keep placeholder and mark replacement decision explicitly in handoff notes.
4. **[1.3] Add storage permission**: Update `permissions` in `app.json` with the Zepp-documented storage permission key used for local persistence (`settingsStorage` path planned in Task 3), keeping permission scope minimal.
5. **[1.4] Round viewport config**: Add one supported round target block in `app.json` with same module paths as square target and `designWidth` for round baseline (454-style baseline per task intent), and add matching round icon asset path if packaging requires target-specific icon folder.
6. **[1.5] Square + responsive baseline**: Keep/verify square target config (`390x450-amazfit-gts-3`, `designWidth: 390`) and define responsive unit rule for future pages (use `designWidth` + rpx/relative sizing convention documented briefly for implementation consistency).
7. **Implementation-specialist handoff package**: Deliver a short execution report with (a) exact files changed, (b) target keys used for round/square, (c) final permission key chosen, (d) any placeholder decisions (especially `appId`), and (e) simulator verification notes for both form factors.

## Validation
- Success criteria: `zeus build` succeeds; app launches on one round and one square simulator target without crash; default/blank page from `page/index` renders on both.
- Checkpoints: Pre-check assumptions (`page/` convention retained, no full re-init) before Step 2; after Step 2 verify directory presence only; after Steps 3-4 validate `app.json` structure and build parse; after Step 5 run round simulator smoke test; after Step 6 run square simulator smoke test and confirm parity; final regression rerun build + both launch checks; risks/mitigations: invalid permission/target key or missing target asset can break build, mitigate by incremental single-change validation and immediate rollback to last known-good `app.json` snapshot before retry.
