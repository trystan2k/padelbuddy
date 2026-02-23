## Task Analysis

- **Main objective**: Implement Task 29 - Match History Storage and Viewing - adding the ability to save completed matches, view a list of previous matches, and view match details. This feature enables players to track their match history directly on the watch.
- **Identified dependencies**: Existing `hmFS` file system operations in `utils/match-storage.js` and `utils/storage.js`, persisted match-session contract in `utils/match-state-schema.js`, runtime state conventions in `app.js` (`globalData.matchState`), existing page navigation patterns in `page/summary.js` using SCROLL_LIST widget, route registration in `app.json`, established Zepp page patterns, and i18n translation structure in `page/i18n/en-US.po`.
- **System impact**: High on match completion UX (new history storage + new screen), medium on storage layer (new persistent storage for history), medium on regression surface for match completion flow, and low on scoring-engine internals.

## Chosen Approach

- **Proposed solution**: Create a dedicated match history storage service using existing `hmFS` patterns, add "Previous Matches" button to Home Screen, create a new `page/history.js` screen with SCROLL_LIST for displaying matches, and integrate history save on match completion.
- **Justification for simplicity**: Deepthink analysis compared (A) individual files per match (rejected as complex directory management), (B) single history file with inline match data (chosen as simplest, leverages existing storage adapter patterns), and (C) database-like index + files approach (rejected as overengineered). Option B is the smallest reliable path because it reuses existing `ZeppOsStorageAdapter` and keeps all history in one file with minimal file I/O.
- **Components to be modified/created**:
  - `utils/match-history-storage.js` (new) - Match history storage service
  - `utils/match-history-types.js` (new) - Type definitions for match history
  - `page/history.js` (new) - Match history list screen
  - `page/history-detail.js` (new) - Individual match detail view (optional, can be inline)
  - `page/index.js` - Add "Previous Matches" button
  - `page/summary.js` - Trigger history save on match completion
  - `app.json` - Register history page routes for both targets
  - `page/i18n/en-US.po` - Add history-related translations

## Implementation Steps

### Phase 1: Storage Layer (Steps 1-4)

1. **Pre-implementation assumptions lock**: Confirm history data source is finished match state from `page/summary.js`, confirm storage format is JSON array in single file using existing `hmFS` patterns, confirm max limit is 50 matches with FIFO deletion, confirm match IDs are timestamp-based (`Date.now()`), and define non-goals (no editing/deleting individual matches, no sorting/filtering).

2. **Create Match History Types** (Step 1): Create `utils/match-history-types.js` with `MatchHistoryEntry` typedef including `id` (string), `completedAt` (timestamp), `teams` (team labels), `setsWon` (teamA/teamB scores), `setHistory` (array of set results), `winnerTeam` ('teamA' | 'teamB' | null), and `schemaVersion` for future migrations.

3. **Implement Match History Storage Service** (Step 2): Create `utils/match-history-storage.js` with:
   - `HISTORY_STORAGE_KEY` constant for file name
   - `MAX_HISTORY_ENTRIES` = 50 constant
   - `encodeUtf8()` / `decodeUtf8()` helpers (reuse from existing storage utils)
   - `saveMatchToHistory(matchState)` - validates match is finished, creates history entry with timestamp ID, loads existing history, appends new entry, enforces 50-match limit by removing oldest, saves to file
   - `loadMatchHistory()` - loads and parses history file, validates each entry, returns array (skip corrupted)
   - `loadMatchById(matchId)` - loads history and finds entry by ID
   - `clearMatchHistory()` - clears all history (for testing/reset)
   - Error handling: wrap file operations in try/catch, return safe defaults on failure

4. **Validation of Storage Layer** (Step 3): Test basic storage operations, verify 50-match limit enforcement, verify corrupted file handling (returns empty array), verify match ID uniqueness.

### Phase 2: Home Screen Integration (Steps 4-5)

5. **Update Home Screen with Previous Matches Button** (Step 4): Modify `page/index.js`:
   - Add "Previous Matches" button below existing buttons (or above Clear Data)
   - Add styling tokens following existing `HOME_TOKENS` pattern
   - Implement `handleViewHistory()` that navigates to `page/history`
   - Add i18n key `home.viewHistory` / `home.previousMatches`
   - Elevated risk: button placement crowding on small screens; mitigation: place between Resume Game and Clear Data buttons

### Phase 3: Match History Screen (Steps 6-8)

6. **Create Match History Screen** (Step 5): Create `page/history.js`:
   - Follow existing page lifecycle (`onInit`/`onShow`/`build`/`onDestroy`)
   - Use screen metrics and styling patterns from `page/summary.js`
   - Implement `HISTORY_TOKENS` for colors, fonts, spacing
   - Load history via `loadMatchHistory()` on `onShow`
   - Display empty state message when no history (`history.empty`)
   - Use SCROLL_LIST widget for match list:
     - Each row shows: date/time, teams, final score, winner indicator
     - Row height ~60px, item_config with type_id 1
   - Add "Back to Home" button at bottom
   - Implement navigation back to Home

7. **Implement Match Detail View** (Step 6): Either:
   - Option A (simpler): Show full details inline in SCROLL_LIST rows (expandable or just more verbose)
   - Option B (chosen): Navigate to detail view on row tap - create `page/history-detail.js` showing complete match info (teams, all sets, winner, date/time)
   - Decision: Use Option B for cleaner UI; create `page/history-detail.js` with match details

8. **Route Registration** (Step 7): Update `app.json`:
   - Add `page/history` to gtr-3 and gts-3 page arrays
   - Add `page/history-detail` to gtr-3 and gts-3 page arrays

### Phase 4: Integration & Edge Cases (Steps 9-11)

9. **Integrate History Save on Match Completion** (Step 8): Modify `page/summary.js`:
   - Import `saveMatchToHistory` from `utils/match-history-storage.js`
   - Call `saveMatchToHistory(this.finishedMatchState)` after match finishes and before/after displaying summary
   - Add error handling - don't block summary display if history save fails
   - Elevated risk: duplicate saves if user revisits summary; mitigation: check if match already saved (by timestamp + teams) or save only on first summary load

10. **Handle Edge Cases** (Step 9):
    - **Empty history**: Show friendly "No matches played yet" message with icon/text
    - **Corrupted history file**: Catch parse errors, return empty array, log error
    - **Storage limit reached**: Implement FIFO - when >50 matches, remove oldest (first in array)
    - **Invalid match data in history**: Validate each entry with schema, skip invalid
    - **File system errors**: Graceful degradation - don't crash app, show empty state

11. **Add Translations** (Step 10): Update `page/i18n/en-US.po` with:
    - `home.previousMatches` / `home.viewHistory`
    - `history.title` - "Match History"
    - `history.empty` - "No matches yet"
    - `history.matchDate` - date format template
    - `history.winner` - "Winner"
    - `history.back` - "Back"
    - `history.detail.title` - "Match Details"

### Phase 5: Testing (Step 12)

12. **Add Tests and QA Gate** (Step 11): Create `tests/match-history-storage.test.js`:
    - Test `saveMatchToHistory` with valid finished match
    - Test `loadMatchHistory` returns array
    - Test `loadMatchById` returns correct match
    - Test 50-match limit enforcement
    - Test corrupted file handling
    - Test empty history handling
    - Run `npm run test` to verify no regressions

## Validation

- **Success criteria**:
  - Match history storage service functions correctly (`saveMatchToHistory`, `loadMatchHistory`, `loadMatchById`)
  - Home screen displays "Previous Matches" button
  - Match history screen shows list of completed matches using SCROLL_LIST
  - Tapping a match shows details
  - Maximum 50 matches enforced with oldest deletion
  - Empty history shows friendly message
  - Corrupted storage doesn't crash app
  - Match completion triggers history save automatically

- **Checkpoints**:
  - Pre-implementation checkpoint (after Step 1): Confirm assumptions, data structure, storage format
  - Implementation checkpoint A (after Step 3): Storage layer tests pass
  - Implementation checkpoint B (after Step 5-6): History screen renders with test data
  - Implementation checkpoint C (after Step 8-9): Integration with summary screen, edge cases handled
  - Post-implementation checkpoint (after Step 11-12): Full test suite passes, `npm run test` succeeds

- **Rollback Notes**:
  - If SCROLL_LIST rendering has issues on round devices, fall back to simple list with fixed items
  - If history save fails silently, add console logging for debugging
  - If storage file grows too large, consider compressing or limiting setHistory depth
