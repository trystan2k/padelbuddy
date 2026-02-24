## Task Analysis

- **Main objective**: Create a Settings page with SCROLL_LIST widget containing "Previous Matches" and "Clear App Data" items, implement data clearing functionality, and reorganize navigation on Home Screen.

- **Identified dependencies**:
  - Zepp OS v1.0 API
  - SCROLL_LIST widget (hmUI.widget.SCROLL_LIST)
  - chevron-icon.png and delete-icon.png assets (already exist in assets/)
  - Storage utilities (match-storage.js, match-history-storage.js)
  - i18n system for translations

- **System impact**:
  - New Settings page at setting/index.js
  - Modified Home Screen (page/index.js) - remove Previous Matches and Clear App Data buttons
  - New utility function for clearing all app data
  - Navigation flow changes

## Chosen Approach

- **Proposed solution**: Create a Settings page using the Settings App module (AppSettingsPage) with SCROLL_LIST widget. The Settings page is appropriate because:
  1. It's already configured in app.json at setting/index
  2. Settings pages are designed for configuration/utility functions
  3. Follows Zepp OS conventions for settings-like functionality

- **Justification for simplicity**:
  1. Reuse existing SCROLL_LIST implementation patterns from history.js
  2. Use existing icons (chevron-icon.png, delete-icon.png)
  3. Leverage existing storage clearing methods from match-storage.js and match-history-storage.js
  4. Minimal changes to Home Screen - just remove the two buttons and keep the existing settings icon

- **Components to be modified/created**:
  1. Create: `setting/index.js` - Settings page with SCROLL_LIST
  2. Create: `utils/app-data-clear.js` - Utility for clearing all app data
  3. Modify: `page/index.js` - Remove Previous Matches and Clear App Data buttons
  4. Modify: `setting/i18n/en-US.po` - Add settings page translations

## Implementation Steps

### Step 1: Create app data clearing utility
- Create `utils/app-data-clear.js` with `clearAllAppData()` function
- Review all storage keys:
  - ACTIVE_MATCH_SESSION_STORAGE_KEY (match-storage.js)
  - HISTORY_STORAGE_KEY (match-history-storage.js)
- Implement:
  - Clear in-memory data structures (globalData reset)
  - Remove files from filesystem using hmFS.remove()
  - Clear any remaining storage keys
  - Log confirmation message
  - Return to Home Screen after clearing
- Export function for use by Settings page

### Step 2: Create Settings page with SCROLL_LIST
- Modify `setting/index.js` (currently placeholder)
- Implement AppSettingsPage with:
  - SCROLL_LIST widget containing 2 items
  - Item 1: "Previous Matches" with chevron-icon.png
  - Item 2: "Clear App Data" with delete-icon.png
- Use design tokens similar to history.js for consistency
- Handle item click events:
  - Previous Matches: navigate to page/history
  - Clear App Data: call clearAllAppData()

### Step 3: Add Settings page translations
- Add to `setting/i18n/en-US.po`:
  - settings.title
  - settings.previousMatches
  - settings.clearAppData
  - settings.clearDataConfirm

### Step 4: Update Home Screen
- Modify `page/index.js`:
  - Remove Previous Matches button (currently using home.previousMatches)
  - Remove Clear App Data button (currently using home.clearData)
  - Keep existing Settings icon button (already navigates to setting/index)

### Step 5: Verify navigation works
- Test: Settings icon → Settings page
- Test: Settings page → Previous Matches → History page
- Test: Settings page → Clear App Data → Home Screen

## Validation

- **Success criteria**:
  1. Settings page displays SCROLL_LIST with 2 items
  2. Clicking "Previous Matches" navigates to match history
  3. Clicking "Clear App Data" clears all storage and returns to Home
  4. Home Screen no longer has Previous Matches and Clear App Data buttons
  5. Settings icon on Home Screen navigates to Settings page
  6. All i18n strings are properly displayed

- **Checkpoints**:
  1. Pre-implementation: Verify assets exist (chevron-icon.png, delete-icon.png)
  2. During implementation: Test SCROLL_LIST renders correctly on simulator
  3. Post-implementation: Run `npm run complete-check` for QA gate
  4. Manual verification: Test on real device if possible

## Technical Details

### Storage Keys to Clear
```javascript
// From utils/storage.js
const MATCH_STATE_STORAGE_KEY = 'padel-buddy.match-state'

// From utils/match-history-storage.js
const HISTORY_STORAGE_KEY = 'padel-buddy.match-history'
```

### SCROLL_LIST Configuration
- Use item_config with type_id for each list item
- Use image_view for icons (chevron, delete)
- Use text_view for item labels
- Use item_click_func callback for navigation

### Navigation Pattern
- Use `hmApp.gotoPage({ url: 'page/history' })` for Previous Matches
- Use `hmApp.gotoPage({ url: 'page/index' })` for returning home

### Global Data Cleanup
- Reset getApp().globalData to clear in-memory state
- Clear matchHistory, matchState, pendingHomeMatchState, etc.
