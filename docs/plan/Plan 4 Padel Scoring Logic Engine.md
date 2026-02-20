# Plan 4 Padel Scoring Logic Engine

## Task Analysis
- Main objective: Complete Taskmaster Task 4 by implementing a deterministic `addPoint(state, team, historyStack?)` scoring engine that handles regular progression (0->15->30->40->Game), Deuce/Advantage transitions, game/set advancement, tie-break resolution at 6-6, and pre-update history snapshots for Undo support.
- Identified dependencies: Task 2 state model contracts in `utils/match-state.js`; shared score constants in `utils/scoring-constants.js`; snapshot/deep-copy behavior in `utils/history-stack.js`; Node test conventions already used under `tests/`.
- System impact: Core scoring behavior is centralized in `utils/scoring-engine.js` with broad behavioral coverage in `tests/scoring-engine.test.js`; no UI/layout changes and no persistence wiring changes are required in this task.

## Chosen Approach
- Proposed solution: Use one pure-state transition entrypoint (`addPoint`) with small helper functions for each rule domain (regular points, deuce/advantage, game/set finalization, tie-break handling, and history snapshot capture) so each branch is testable and side effects stay explicit.
- Justification for simplicity: Considered (A) deeply nested monolithic conditional logic, (B) introducing a generic finite-state-machine framework, and (C) a lightweight helper-driven transition pipeline; selected (C) because it keeps logic readable, aligns with current utility-module patterns, and avoids framework overhead while still preventing rule leakage between scoring modes.
- Components to be modified/created: `utils/scoring-engine.js` (core logic), `tests/scoring-engine.test.js` (coverage for all subrules), optional minimal compatibility touch in `utils/match-state.js` only if required by state shape parity.

## Implementation Steps
1. **4.1 Implement standard point progression logic**: define/consume the regular sequence (`0,15,30,40`), validate team input, increment scoring team points, and award game when scorer is already at 40 while opponent is below 40; reset points after game win.
2. **4.2 Implement deuce and advantage state handling**: add explicit branches for `40-40` -> `Ad`, `Ad + point` -> game, and `opponent scores against Ad` -> back to deuce (`40-40`), ensuring no accidental game increment on deuce reset.
3. **4.3 Implement game counting and set win conditions**: after each game win, increment both team game counters (`team*.games` and `currentSetStatus.team*Games`), check set win at `>=6` games with `>=2` margin, and reset set/game fields correctly when moving to next set.
4. **4.4 Implement tie-break logic**: detect tie-break mode at `6-6`, switch point counting to integers, and finalize set only when scorer reaches `>=7` with `>=2` margin (e.g., `7-5`, `8-6`); on tie-break set win, reset points/games and advance set number consistently.
5. **4.5 Integrate history stack snapshots before updates**: at the start of `addPoint`, deep-copy current state and push it to `historyStack` (when provided) before any mutation; proceed updates from a copied working state to preserve immutability and ensure Undo restores exact pre-point state.

## Validation
- Success criteria: standard progression tests pass; deuce/advantage transitions pass (advantage gain, loss, conversion); set logic passes for `6-0`, `6-4`, `6-5` (no set end), and `7-5`; tie-break tests pass for entry at `6-6` and wins at `7-0`, `7-5`, `8-6`; history tests confirm one snapshot per point and deep-copy restoration integrity.
- Checkpoints: pre-implementation assumptions check (state shape and constants are stable); during 4.1-4.2 verify no regressions in basic/deuce branches; during 4.3-4.4 verify set/tie-break invariants with focused tests before moving on; during 4.5 verify snapshot growth and immutability; post-implementation run full `npm run test` as QA gate.
- Risk mitigation and rollback notes: highest risk is rule-order conflicts between deuce/tie-break branches and snapshot timing; mitigate by adding/keeping branch-specific tests before refactors and preserving helper-level isolation; if a branch introduces scoring regression, rollback only the affected helper path in `utils/scoring-engine.js` while keeping the validated test suite as release gate.
