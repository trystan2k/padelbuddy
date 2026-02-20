# Plan 2: Data Model & State Management Design

## Task Analysis
- Main objective: Build the Task 2 foundation for scoring state by defining a canonical `MatchState`, deterministic undo snapshots, and shared scoring constants so Task 3/4/5 can plug in without refactors.
- Identified dependencies: Subtask 2.2 depends on 2.1 in `.taskmaster/tasks/tasks.json:103`; project is JavaScript with `checkJs` enabled (`jsconfig.json:5`), so interface design should use JSDoc typing (not TS migration); runtime targets `minVersion: 1.0.0` (`app.json:22`), so keep compatibility-safe APIs.
- System impact: New domain modules only (no UI/routing/app config changes), but high downstream impact because this becomes the contract for persistence (`settingsStorage`) and scoring/undo logic.

## Chosen Approach
- Proposed solution: Implement pure JS state modules under `utils/state/` using JSDoc typedef interfaces, frozen constants/enums, and an array-backed history stack with deep-copy snapshots via JSON serialization.
- Justification for simplicity: Rejected full TypeScript migration (too much setup for current repo), and rejected implementing full state machine now (belongs to Task 4). Chosen path is smallest viable architecture that still enforces shape consistency and undo safety.
- Components to be modified/created: `utils/state/scoring_constants.js` (2.3 constants/enums), `utils/state/match_state.js` (2.1 interfaces + initial factory), `utils/state/history_stack.js` (2.2 deep-copy stack), `utils/state/index.js` (stable exports). No required edits to `app.json` or `page/index.js` for this task.

## Implementation Steps
1. Define the canonical state contract from PRD and Task 2: include team points/games, set phase/tie-break info, match status, and `updatedAt`; keep it JSON-serializable only (plain objects, arrays, primitives).
2. Implement subtask 2.3 first in `utils/state/scoring_constants.js`: scoring sequence (`0,15,30,40`) plus symbolic values for `AD` and `GAME`, and frozen enums for team IDs and match/set statuses.
3. Implement subtask 2.1 in `utils/state/match_state.js`: JSDoc typedefs (`TeamScore`, `SetState`, `MatchState`) and `createInitialMatchState()` returning a zeroed active-state object using constants from step 2.
4. Implement subtask 2.2 in `utils/state/history_stack.js`: `push`, `pop`, `peek`, `size`, `clear`; `push` stores deep copies and `pop` returns independent copies; empty stack returns `null`/no-op-friendly value.
5. Add `utils/state/index.js` barrel exports so Task 3/4/5 import from one path and avoid churn.
6. Validate subtask behavior immediately after each file: initial state snapshot correctness, deep-copy immutability (mutating source does not mutate history), and import accessibility.
7. Run Zepp OS constraint checks: ensure no unsupported APIs (e.g., `structuredClone`), no Node-only dependencies in runtime modules, and state remains serialization-safe for future `settingsStorage`.
8. Final readiness pass for dependency flow: confirm contracts are sufficient for Task 3 persistence and Task 4/5 scoring+undo without redesign.  
   Risk/mitigation note: if JSON clone becomes a hotspot during later integration, mitigate with a specialized manual clone for `MatchState`; rollback path is keeping same API and swapping clone internals only.

## Validation
- Success criteria: Definition of done = (a) `MatchState` shape exists and initializes with expected zero/active defaults, (b) history stack deep-copy push/pop works without reference leaks, (c) scoring constants cover `0,15,30,40,Ad,Game`, (d) modules are reusable through `utils/state/index.js`, (e) implementation remains compatible with `app.json` runtime constraints and supports PRD acceptance paths for add/remove/resume in downstream tasks.
- Checkpoints: Pre-check assumptions (JS + `checkJs`, no TS toolchain); in-flight checks after steps 2/3/4 (constant values, factory shape, deep-copy behavior, empty stack behavior); post-check regression (app boots unchanged, no config regressions, downstream smoke imports pass). Zepp risk checkpoint: monitor history growth under repeated scoring; if memory pressure appears on watch, add explicit stack cap with documented undo-depth limit.
