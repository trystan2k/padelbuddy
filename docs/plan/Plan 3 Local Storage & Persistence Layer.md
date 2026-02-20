# Plan 3 Local Storage & Persistence Layer

## Task Analysis
- Main objective: implement a focused persistence utility for Task #3 that provides `saveState(state)` and `loadState()` for `MatchState`, using Zepp OS `settingsStorage` JSON persistence with safe null fallback on missing/corrupted data.
- Dependency context: Task #2 outputs are already in place (`utils/match-state.js`, `utils/history-stack.js`, `app.js` initialization); Task #3 should depend only on that state shape, not on scoring/UI logic.
- System impact: add one new utility module under `utils/` and one dedicated unit test file under `tests/`; keep `app.json` unchanged (storage permission already present), and keep UI/navigation integration out of scope.
- File discovery strategy: use `.taskmaster/tasks/tasks.json` for acceptance details, inspect state model in `utils/match-state.js`, confirm wiring boundaries in `app.js` and `page/index.js`, and follow test conventions from `tests/match-state.test.js` and `tests/history-stack.test.js`.
- Scope guard: do not implement scoring logic, undo flow, UI behavior, lifecycle autosave hooks, or routing changes.

## Chosen Approach
- Create a dedicated persistence module (`utils/storage.js`) with a stable storage key and two exports: `saveState(state)` and `loadState()`.
- Keep design simple to match existing utility-first architecture and deliver exactly subtasks 3.1/3.2.
- Components to modify/create:
  - `utils/storage.js` (new persistence layer)
  - `tests/storage.test.js` (Node tests with stubbed storage behavior)
  - no runtime integration changes in `app.js` / `page/index.js` for this task.
- Zepp-specific fit: keep API-level assumptions aligned with app runtime, place shared persistence in `utils/`, and avoid any screen adaptation impact.

## Implementation Steps
1. Confirm baseline contract in `.taskmaster/tasks/tasks.json`: `saveState` serializes and writes; `loadState` returns parsed object or `null` for missing/corrupt values.
2. Add `utils/storage.js` with:
   - a single namespaced storage key constant,
   - `saveState(state)` -> `JSON.stringify(state)` then persist,
   - `loadState()` -> read, return `null` if empty, parse in `try/catch`, return `null` on parse failure.
3. Keep serialization strict to current `MatchState` shape from `utils/match-state.js` (no migrations/versioning in Task #3).
4. Add `tests/storage.test.js` for:
   - valid save writes JSON to expected key,
   - missing key returns `null`,
   - valid JSON returns parsed object,
   - malformed JSON returns `null` without throwing.
5. Ensure no unintended integration drift by keeping `app.js` and page files unchanged.
6. Run regression checks to keep Task #2 tests green.

## Validation
- Success criteria:
  - `saveState(state)` persists JSON for provided `MatchState`.
  - `loadState()` returns object for valid stored JSON.
  - `loadState()` returns `null` when storage is empty or payload is corrupted/invalid.
  - Existing state model/history tests remain green.
- Checkpoints:
  - Pre-implementation assumptions check: storage permission present and no existing storage module conflict.
  - During implementation check #1: contract review of `utils/storage.js`.
  - During implementation check #2: run `tests/storage.test.js` and confirm scenarios pass.
  - Post-implementation regression: run full `npm test`.
  - Post-implementation manual smoke note for later integration tasks: verify save/reopen/resume in simulator/device once wiring exists.
