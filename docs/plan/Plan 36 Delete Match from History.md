# Plan 36: Delete Match from History

## Task Analysis

### Main Objective
Implement functionality to delete individual matches from the match history by adding a delete button in the match details page (not the history list), with a double-tap confirmation mechanism to prevent accidental deletions.

### Identified Dependencies
- **Task 29**: Match history storage and viewing (must be complete)
- `page/history.js`: Existing match history list screen with SCROLL_LIST widget
- `page/history-detail.js`: Existing match details page that shows individual match information
- `utils/match-history-storage.js`: Existing history storage service with `loadMatchHistory()`, `saveMatchToHistory()`
- `assets/gtr-3/delete-icon.png` and `assets/gts-3/delete-icon.png`: Delete icon assets (already exist)
- `assets/gtr-3/chevron-icon.png` and `assets/gts-3/chevron-icon.png`: Chevron icon assets (already exist)
- `page/settings.js`: Reference implementation for double-tap confirmation pattern with BUTTON

### System Impact
- **Low Risk**: Changes are isolated to history page and details page
- **No Breaking Changes**: Existing navigation flow remains intact
- **Storage**: Deletes individual match entries from the history JSON file
- **UX Improvement**: Delete action is contextual (in detail view) rather than in the list

---

## Chosen Approach

### Proposed Solution
**Move delete functionality from history list to match details page:**
1. **History List (`page/history.js`)**: Replace delete icon with chevron icon (navigation indicator), remove all delete confirmation logic, simplify to just navigate to detail on tap
2. **Match Details Page (`page/history-detail.js`)**: Add delete button at the bottom, implement double-tap confirmation pattern (same as settings.js), after successful deletion navigate back to history list

### Justification for Simplicity
1. **Reuses Proven Pattern**: The double-tap confirmation is already implemented in `page/settings.js` for "Clear App Data"
2. **Contextual Delete**: Delete action in details page is more intuitive - user sees full match info before deleting
3. **Cleaner History List**: List is simplified to show matches with clear navigation indication (chevron)
4. **No New Assets**: Both chevron and delete icons already exist in assets folder
5. **Consistent UX**: Users already familiar with the confirmation pattern from Settings page
6. **Better Touch Targets**: Button in details page provides larger touch area for delete action

### Components to be Modified/Created

| Component | Action | Description |
|-----------|--------|-------------|
| `utils/match-history-storage.js` | Modify | Add `deleteMatchFromHistory(matchId)` function |
| `page/history.js` | Modify | Replace delete icon with chevron, remove confirmation logic |
| `page/history-detail.js` | Modify | Add delete button with double-tap confirmation |
| `page/i18n/en-US.po` | Modify | Add confirmation text translations |

---

## Implementation Steps

### Step 1: Add i18n Translation Strings
**File**: `page/i18n/en-US.po`

Add new translation keys for the delete confirmation:
```po
msgid "history.delete"
msgstr "Delete"

msgid "history.deleteConfirm"
msgstr "Tap Again to Delete"

msgid "history.deleted"
msgstr "Match deleted"
```

**Checkpoint**: Verify translations compile without errors.

---

### Step 2: Implement deleteMatchFromHistory Function
**File**: `utils/match-history-storage.js`

Add a new exported function that:
1. Accepts `matchId` parameter (string)
2. Loads existing history array
3. Filters out the match with matching `id`
4. Saves the updated history back to storage
5. Returns `true` on success, `false` on failure

```javascript
/**
 * Delete a specific match from history by ID.
 * @param {string} matchId - The ID of the match to delete
 * @returns {boolean} True if deleted successfully
 */
export function deleteMatchFromHistory(matchId) {
  if (!matchId || typeof matchId !== 'string') {
    return false
  }

  try {
    // Load existing history
    const history = loadMatchHistory()
    
    // Filter out the match to delete
    const filteredHistory = history.filter(entry => entry.id !== matchId)
    
    // If no match was removed, return false
    if (filteredHistory.length === history.length) {
      return false
    }
    
    // Save updated history
    const storageData = {
      matches: filteredHistory,
      schemaVersion: MATCH_HISTORY_SCHEMA_VERSION
    }
    
    const filename = keyToFilename(HISTORY_STORAGE_KEY)
    return saveToFile(filename, JSON.stringify(storageData))
  } catch {
    return false
  }
}
```

**Checkpoint**: Unit test the function with mock data to verify deletion logic.

---

### Step 3: Simplify History List Page
**File**: `page/history.js`

#### 3.1 Update Imports
Remove `deleteMatchFromHistory` from imports (keep only `loadMatchHistory`):
```javascript
import { gettext } from 'i18n'
import { loadMatchHistory } from '../utils/match-history-storage.js'
```

#### 3.2 Remove State Properties in onInit
Remove delete-related state properties:
```javascript
onInit(_params) {
  this.widgets = []
  this.historyEntries = []
  this.scrollList = null
  // REMOVE: this.deleteConfirmIndex = null
  // REMOVE: this.confirmTimeout = null

  try {
    this.historyEntries = loadMatchHistory()
  } catch {
    this.historyEntries = []
  }
}
```

#### 3.3 Simplify onDestroy
Remove timeout cleanup:
```javascript
onDestroy() {
  // REMOVE: if (this.confirmTimeout) { ... }
  this.clearWidgets()
}
```

#### 3.4 Remove Danger Color from HISTORY_TOKENS
Remove the `danger` color from tokens (no longer needed):
```javascript
const HISTORY_TOKENS = Object.freeze({
  colors: {
    accent: 0x1eb98c,
    accentPressed: 0x1aa07a,
    background: 0x000000,
    buttonText: 0x000000,
    buttonSecondary: 0x24262b,
    buttonSecondaryPressed: 0x2d3036,
    buttonSecondaryText: 0xffffff,
    cardBackground: 0x000000,
    // REMOVE: danger: 0xff0000
    mutedText: 0x7d8289,
    text: 0xffffff,
    winner: 0x1eb98c
  },
  // ... rest of tokens
})
```

#### 3.5 Remove updateListData and handleDeleteClick Methods
Delete these methods entirely:
- `updateListData(confirmIndex)` - No longer needed
- `handleDeleteClick(index)` - No longer needed

#### 3.6 Update SCROLL_LIST Configuration
Replace delete icon with chevron icon, simplify to single item config:

**Key Layout Changes**:
- Change icon from `'delete-icon.png'` to `'chevron-icon.png'`
- Remove `itemConfigDanger` (only need normal config)
- Simplify `item_click_func` to just navigate to detail

```javascript
// Layout calculations for chevron icon
const iconSize = Math.round(rowHeight * 0.5)
const iconPad = Math.round(width * 0.02)
const iconX = listWidth - iconSize - iconPad
const iconY = Math.round((rowHeight - iconSize) / 2)

// Adjusted positions to make room for icon
const dateX = Math.round(width * 0.02)
const dateWidth = Math.round(listWidth * 0.45)
const scoreX = Math.round(listWidth * 0.5)
const scoreWidth = iconX - scoreX - iconPad

// Build data for SCROLL_LIST with chevron icon
const scrollDataArray = this.historyEntries.map((entry) => {
  const dateStr = formatDate(entry)
  const scoreStr = `${entry.setsWonTeamA}-${entry.setsWonTeamB}`

  return {
    date: dateStr,
    score: scoreStr,
    icon: 'chevron-icon.png'  // Changed from delete-icon.png
  }
})

// Single item config (no danger state needed)
const itemConfig = {
  type_id: 1,
  item_height: rowHeight,
  item_bg_color: HISTORY_TOKENS.colors.cardBackground,
  item_bg_radius: 0,
  text_view: [
    // Date - left side, white
    {
      x: dateX,
      y: Math.round((rowHeight - Math.round(width * HISTORY_TOKENS.fontScale.date)) / 2),
      w: dateWidth,
      h: Math.round(width * HISTORY_TOKENS.fontScale.date),
      key: 'date',
      color: HISTORY_TOKENS.colors.text,
      text_size: Math.round(width * HISTORY_TOKENS.fontScale.date)
    },
    // Score - center, accent color
    {
      x: scoreX,
      y: Math.round((rowHeight - Math.round(width * HISTORY_TOKENS.fontScale.score)) / 2),
      w: scoreWidth,
      h: Math.round(width * HISTORY_TOKENS.fontScale.score),
      key: 'score',
      color: HISTORY_TOKENS.colors.accent,
      text_size: Math.round(width * HISTORY_TOKENS.fontScale.score)
    }
  ],
  text_view_count: 2,
  image_view: [
    { x: iconX, y: iconY, w: iconSize, h: iconSize, key: 'icon' }
  ],
  image_view_count: 1
}

// SCROLL_LIST - simplified with single config
this.scrollList = this.createWidget(hmUI.widget.SCROLL_LIST, {
  x: listX,
  y: listY,
  w: listWidth,
  h: listHeight,
  item_space: 2,
  item_config: [itemConfig],
  item_config_count: 1,
  data_array: scrollDataArray,
  data_count: scrollDataArray.length,
  item_click_func: (_list, index) => {
    // Always navigate to detail
    this.handleHistoryItemClick(index)
  },
  data_type_config: [{ start: 0, end: scrollDataArray.length - 1, type_id: 1 }],
  data_type_config_count: 1
})
```

**Checkpoint**: Verify chevron icon appears on each row and navigation to detail works.

---

### Step 4: Add Delete Functionality to History Detail Page
**File**: `page/history-detail.js`

#### 4.1 Add Import for Delete Function
```javascript
import { gettext } from 'i18n'
import { loadMatchById, deleteMatchFromHistory } from '../utils/match-history-storage.js'
```

#### 4.2 Add Delete-Related State Properties
Add in onInit:
```javascript
onInit(params) {
  this.widgets = []
  this.matchEntry = null
  this.deleteConfirmMode = false  // NEW: Track delete confirmation state
  this.confirmTimeout = null       // NEW: Timeout for auto-reset
  this.parseParams(params)
  this.renderDetailScreen()
}
```

#### 4.3 Add Cleanup in onDestroy
```javascript
onDestroy() {
  if (this.confirmTimeout) {
    clearTimeout(this.confirmTimeout)
    this.confirmTimeout = null
  }
  this.clearWidgets()
}
```

#### 4.4 Add Delete Handler Method
```javascript
handleDeleteClick() {
  if (!this.matchEntry) return

  if (this.deleteConfirmMode) {
    // Second tap - execute deletion
    this.deleteConfirmMode = false
    if (this.confirmTimeout) {
      clearTimeout(this.confirmTimeout)
      this.confirmTimeout = null
    }

    // Perform deletion
    const success = deleteMatchFromHistory(this.matchEntry.id)

    if (success) {
      // Navigate back to history list
      this.goBack()
    } else {
      // Deletion failed - re-render to reset button state
      this.renderDetailScreen()
    }
  } else {
    // First tap - enter confirm mode
    this.deleteConfirmMode = true
    this.renderDetailScreen()

    // Auto-reset after 3 seconds
    this.confirmTimeout = setTimeout(() => {
      this.deleteConfirmMode = false
      this.confirmTimeout = null
      this.renderDetailScreen()
    }, 3000)
  }
}
```

#### 4.5 Add Danger Color to HISTORY_DETAIL_TOKENS
```javascript
const HISTORY_DETAIL_TOKENS = Object.freeze({
  colors: {
    accent: 0x1eb98c,
    accentPressed: 0x1aa07a,
    background: 0x000000,
    buttonSecondary: 0x24262b,
    buttonSecondaryPressed: 0x2d3036,
    buttonSecondaryText: 0xffffff,
    cardBackground: 0x000000,
    danger: 0xff0000,  // NEW: Red for delete confirmation
    mutedText: 0x7d8289,
    text: 0xffffff
  },
  // ... rest of tokens
})
```

#### 4.6 Modify Button Section in renderDetailScreen
Replace or modify the go back button section to include a delete button:

**Option A: Two Buttons Side by Side**
```javascript
// Button layout - two buttons side by side
const buttonWidth = Math.round(width * 0.4)
const buttonHeight = clamp(Math.round(height * 0.09), 44, 52)
const buttonY = height - bottomInset - buttonHeight
const buttonGap = Math.round(width * 0.04)

// Delete button (left)
const deleteButtonX = Math.round((width - buttonWidth * 2 - buttonGap) / 2)
const deleteColor = this.deleteConfirmMode 
  ? HISTORY_DETAIL_TOKENS.colors.danger 
  : HISTORY_DETAIL_TOKENS.colors.buttonSecondary
const deleteText = this.deleteConfirmMode 
  ? gettext('history.deleteConfirm') 
  : gettext('history.delete')

this.createWidget(hmUI.widget.BUTTON, {
  x: deleteButtonX,
  y: buttonY,
  w: buttonWidth,
  h: buttonHeight,
  text: deleteText,
  text_size: Math.round(width * HISTORY_DETAIL_TOKENS.fontScale.button),
  normal_color: deleteColor,
  press_color: deleteColor,
  click_func: () => this.handleDeleteClick()
})

// Go back button (right)
const goBackButtonX = deleteButtonX + buttonWidth + buttonGap
this.createWidget(hmUI.widget.BUTTON, {
  x: goBackButtonX,
  y: buttonY,
  w: buttonWidth,
  h: buttonHeight,
  text: gettext('common.goBack'),
  text_size: Math.round(width * HISTORY_DETAIL_TOKENS.fontScale.button),
  normal_color: HISTORY_DETAIL_TOKENS.colors.buttonSecondary,
  press_color: HISTORY_DETAIL_TOKENS.colors.buttonSecondaryPressed,
  click_func: () => this.goBack()
})
```

**Option B: Single Delete Button (Replace Go Back)**
```javascript
// Single delete button at bottom
const buttonWidth = Math.round(width * 0.7)
const buttonHeight = clamp(Math.round(height * 0.09), 44, 52)
const buttonX = Math.round((width - buttonWidth) / 2)
const buttonY = height - bottomInset - buttonHeight

const deleteColor = this.deleteConfirmMode 
  ? HISTORY_DETAIL_TOKENS.colors.danger 
  : HISTORY_DETAIL_TOKENS.colors.buttonSecondary
const deleteText = this.deleteConfirmMode 
  ? gettext('history.deleteConfirm') 
  : gettext('history.delete')

this.createWidget(hmUI.widget.BUTTON, {
  x: buttonX,
  y: buttonY,
  w: buttonWidth,
  h: buttonHeight,
  text: deleteText,
  text_size: Math.round(width * HISTORY_DETAIL_TOKENS.fontScale.button),
  normal_color: deleteColor,
  press_color: deleteColor,
  click_func: () => this.handleDeleteClick()
})
```

**Checkpoint**: Verify delete button appears and confirmation pattern works correctly.

---

### Step 5: Add i18n for Common Go Back (if using Option A)
**File**: `page/i18n/en-US.po`

If using two-button layout, add common go back translation:
```po
msgid "common.goBack"
msgstr "Go Back"
```

---

### Step 6: Test Edge Cases

| Test Case | Expected Behavior |
|-----------|-------------------|
| Navigate to match detail | Detail page shows match info correctly |
| Tap delete button | Button text changes to "Tap Again to Delete", turns red |
| Second tap within 3s | Match deleted, navigates back to history list |
| Tap delete, wait 3s | Confirm state auto-cancels, button resets |
| Delete match, go back to list | Match no longer appears in list |
| Delete all matches | Empty state shown in history list |
| Delete non-existent match | Function returns false, no crash |
| Navigate away during confirm | Timeout cleaned up in onDestroy |

---

## Validation

### Success Criteria
1. ✅ History list shows chevron icon (navigation indicator) on each row
2. ✅ Tapping history row navigates to match detail page
3. ✅ Match detail page shows delete button at bottom
4. ✅ First tap on delete button changes text to "Tap Again to Delete" and turns red
5. ✅ Second tap within 3 seconds deletes match and navigates back to history list
6. ✅ Auto-cancel after 3 seconds if no second tap
7. ✅ Deleted match doesn't reappear after app restart (persistent deletion)
8. ✅ Empty state shown when all matches deleted
9. ✅ No crashes on file system errors

### Checkpoints

| Phase | Checkpoint | Verification Method |
|-------|------------|---------------------|
| Pre-implementation | Task 29 complete, icons exist | File inspection |
| Step 1 | i18n strings added | `grep` for new msgid |
| Step 2 | deleteMatchFromHistory function compiles | Build succeeds |
| Step 3 | Chevron icon visible in history list | Simulator visual check |
| Step 3 | Navigation to detail works | Manual test |
| Step 4 | Delete button visible in detail page | Simulator visual check |
| Step 4 | Confirm state shows red button | Simulator visual check |
| Step 4 | Deletion removes from storage | Manual test, restart app |
| Post-implementation | All test cases pass | Manual test matrix |

### Rollback Notes
If issues arise:
1. **Revert `page/history.js`**: Restore delete icon and confirmation logic if needed
2. **Revert `page/history-detail.js`**: Remove delete button and confirmation logic
3. **Revert `utils/match-history-storage.js`**: Remove `deleteMatchFromHistory` function
4. **Revert `page/i18n/en-US.po`**: Remove added translation keys

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Button layout issues on round screens | Low | Medium | Use percentage-based positioning, test on round devices |
| Touch target too small | Low | Low | Ensure button height ≥44px |
| Race condition on rapid taps | Low | Low | State tracking in handleDeleteClick |
| File corruption during save | Low | High | Graceful error handling, return false |
| Confirm timeout not cleaned up | Low | Low | Clear in onDestroy |
| User confusion about navigation | Low | Low | Chevron icon clearly indicates navigation |

---

## Subtask Mapping

| Subtask | Implementation Step |
|---------|---------------------|
| 36.1 Add Delete Icon to Match History List UI | **CHANGED**: Now adds chevron icon to history list (Step 3.6) |
| 36.2 Implement deleteMatchFromHistory Function | Step 2 |
| 36.3 Implement Delete Confirmation Dialog | **CHANGED**: Now in details page with button (Step 4.4, 4.6) |
| 36.4 Wire Delete Icon Click Event Handler | **CHANGED**: Now delete button click in details page (Step 4.4) |
| 36.5 Refresh UI After Successful Deletion | Step 4.4 (navigate back to list) |
| 36.6 Implement Error Handling and User Feedback | Step 2 (function), Step 4.4 (handler) |
| 36.7 Testing and Documentation Updates | Step 6 |

---

## Key Changes from Original Plan

| Aspect | Original Plan | Updated Plan |
|--------|--------------|--------------|
| Delete location | History list (per-row) | Match details page (button) |
| History list icon | Delete icon | Chevron icon (navigation indicator) |
| Confirmation UI | Row text changes to red | Button text/color changes |
| Confirmation trigger | Tap on row | Tap on dedicated delete button |
| Post-delete action | Re-render list | Navigate back to list |
| Complexity | Higher (SCROLL_LIST state management) | Lower (simple button state) |

---

## Estimated Effort
- **Implementation**: 2-3 hours
- **Testing**: 1 hour
- **Total**: 3-4 hours
