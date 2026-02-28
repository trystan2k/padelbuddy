# Plan 50: Migrate Settings, History, and History Detail Pages to New Layout System

## Task Analysis

**Main objective:**  
Refactor `page/settings.js`, `page/history.js`, and `page/history-detail.js` to use the new declarative layout system, replacing page-specific TOKENS constants with centralized design tokens, layout engine resolution, and reusable UI components while preserving scroll list functionality, navigation patterns, and all interactive behaviors (delete confirmations, empty states).

**Identified dependencies:**
- `utils/design-tokens.js` - Centralized TOKENS, getFontSize, toPercentage
- `utils/screen-utils.js` - getScreenMetrics, clamp, ensureNumber, getRoundSafeSectionInset
- `utils/layout-engine.js` - resolveLayout function
- `utils/layout-presets.js` - createStandardPageLayout (reference pattern)
- `utils/ui-components.js` - createBackground, createCard, createText, createButton

**System impact:**
- `page/settings.js` - Remove SETTINGS_TOKENS, migrate to layout schema
- `page/history.js` - Remove HISTORY_TOKENS, migrate to layout schema
- `page/history-detail.js` - Remove HISTORY_DETAIL_TOKENS, migrate to layout schema
- Visual output must remain identical
- All scroll lists, button handlers, and delete confirmations must function identically

---

## Chosen Approach

**Proposed solution:**  
Linear chain migration following the provided subtask breakdown. Each subtask produces a testable intermediate state with explicit validation checkpoints. The three pages share similar patterns (header + body with scroll list + footer), so a consistent schema structure is applied to all.

**Justification for simplicity:**
- Follows established patterns from already-migrated `page/index.js`
- Uses existing utility functions without modification
- Each page can be validated independently before proceeding
- Clear rollback points at each subtask completion
- Preserves all existing functionality through careful mapping of old values to new tokens

**Components to be modified:**
1. **page/settings.js** - Remove SETTINGS_TOKENS (42 lines), add imports, define SETTINGS_LAYOUT, refactor renderSettingsScreen
2. **page/history.js** - Remove HISTORY_TOKENS (37 lines), add imports, define HISTORY_LAYOUT, refactor renderHistoryScreen
3. **page/history-detail.js** - Remove HISTORY_DETAIL_TOKENS (25 lines), add imports, define HISTORY_DETAIL_LAYOUT, refactor renderDetailScreen

---

## Implementation Steps

### Step 1: Subtask 50.1 - Remove Legacy Dependencies and Add New Imports

**Action:** Remove page-specific TOKENS constants and add new imports in all three files.

#### 1.1 page/settings.js Changes

**Remove (lines 4-24):**
```javascript
// DELETE THIS ENTIRE BLOCK
const SETTINGS_TOKENS = Object.freeze({
  colors: {
    background: 0x000000,
    cardBackground: 0x111318,
    text: 0xffffff,
    mutedText: 0x7d8289,
    danger: 0xff0000
  },
  fontScale: {
    title: 0.065,
    item: 0.07,
    version: 0.055
  },
  spacingScale: {
    topInset: 0.035,
    bottomInset: 0.06,
    sideInset: 0.04,
    sectionGap: 0.015
  }
})

function clamp(value, min, max) { ... }
function ensureNumber(value, fallback) { ... }
```

**Add imports at top (after `import { APP_VERSION } ...`):**
```javascript
import { gettext } from 'i18n'
import { clearAllAppData } from '../utils/app-data-clear.js'
import { APP_VERSION } from '../utils/version.js'
import { TOKENS, getFontSize } from '../utils/design-tokens.js'
import { getScreenMetrics, clamp, ensureNumber } from '../utils/screen-utils.js'
import { resolveLayout } from '../utils/layout-engine.js'
import { createBackground, createText, createButton } from '../utils/ui-components.js'
```

#### 1.2 page/history.js Changes

**Remove (lines 4-40):**
```javascript
// DELETE THIS ENTIRE BLOCK
const HISTORY_TOKENS = Object.freeze({
  colors: { ... },
  fontScale: { ... },
  spacingScale: { ... }
})

function ensureNumber(value, fallback) { ... }
function clamp(value, min, max) { ... }
function formatDate(entry) { ... } // Keep formatDate!
```

**Add imports at top (after existing imports):**
```javascript
import { gettext } from 'i18n'
import { loadMatchHistory } from '../utils/match-history-storage.js'
import { TOKENS, getFontSize } from '../utils/design-tokens.js'
import { getScreenMetrics, clamp, ensureNumber } from '../utils/screen-utils.js'
import { resolveLayout } from '../utils/layout-engine.js'
import { createBackground, createCard, createText, createButton } from '../utils/ui-components.js'
```

**Note:** Keep `formatDate()` function - it's utility logic, not token-related.

#### 1.3 page/history-detail.js Changes

**Remove (lines 4-35):**
```javascript
// DELETE THIS ENTIRE BLOCK
const HISTORY_DETAIL_TOKENS = Object.freeze({
  colors: { ... },
  fontScale: { ... },
  spacingScale: { ... }
})

function ensureNumber(value, fallback) { ... }
function clamp(value, min, max) { ... }
function formatDate(entry) { ... } // Keep formatDate!
function calculateRoundSafeSideInset(...) { ... } // DELETE - use getRoundSafeSectionInset from screen-utils
function calculateRoundSafeSectionSideInset(...) { ... } // DELETE - use getRoundSafeSectionInset from screen-utils
```

**Add imports at top:**
```javascript
import { gettext } from 'i18n'
import { deleteMatchFromHistory, loadMatchById } from '../utils/match-history-storage.js'
import { TOKENS, getFontSize } from '../utils/design-tokens.js'
import { getScreenMetrics, clamp, ensureNumber, getRoundSafeSectionInset } from '../utils/screen-utils.js'
import { resolveLayout } from '../utils/layout-engine.js'
import { createBackground, createCard, createText, createButton } from '../utils/ui-components.js'
```

**Verification:** All three files parse without errors. `npm run complete-check` passes.

---

### Step 2: Subtask 50.2 - Define Page Layout Schemas

**Action:** Create layout schema constants for all three pages following the pattern from `page/index.js`.

#### 2.1 Settings Page Layout Schema

**Add after imports in page/settings.js:**
```javascript
/**
 * Layout schema for the settings screen.
 * Uses declarative positioning resolved by layout-engine.
 */
const SETTINGS_LAYOUT = {
  sections: {
    header: {
      top: 0,
      height: '12%', // Title area
      roundSafeInset: true
    },
    body: {
      height: 'fill',
      after: 'header',
      gap: '2%',
      roundSafeInset: true
    },
    footer: {
      bottom: 0,
      height: '12%', // GoBack button area
      roundSafeInset: false // Centered icon handles positioning
    }
  },
  elements: {
    pageTitle: {
      section: 'header',
      x: 'center',
      y: '30%',
      width: '100%',
      height: '50%',
      align: 'center',
      _meta: {
        type: 'text',
        style: 'pageTitle',
        text: 'settings.title'
      }
    },
    scrollList: {
      section: 'body',
      x: 0,
      y: 0,
      width: '100%',
      height: '100%',
      align: 'center',
      _meta: {
        type: 'scrollList',
        // Config generated dynamically in render
      }
    },
    goBackButton: {
      section: 'footer',
      x: 'center',
      y: '20%',
      width: TOKENS.sizing.iconLarge, // 48px
      height: TOKENS.sizing.iconLarge,
      align: 'center',
      _meta: {
        type: 'iconButton',
        icon: 'goback-icon.png',
        onClick: 'navigateToHomePage'
      }
    }
  }
}
```

#### 2.2 History Page Layout Schema

**Add after imports in page/history.js:**
```javascript
/**
 * Layout schema for the history screen.
 * Uses declarative positioning resolved by layout-engine.
 */
const HISTORY_LAYOUT = {
  sections: {
    header: {
      top: 0,
      height: '12%',
      roundSafeInset: true
    },
    body: {
      height: 'fill',
      after: 'header',
      gap: '2%',
      roundSafeInset: true
    },
    footer: {
      bottom: 0,
      height: '12%',
      roundSafeInset: false
    }
  },
  elements: {
    pageTitle: {
      section: 'header',
      x: 'center',
      y: '30%',
      width: '100%',
      height: '50%',
      align: 'center',
      _meta: {
        type: 'text',
        style: 'pageTitle',
        text: 'history.title'
      }
    },
    scrollListCard: {
      section: 'body',
      x: 0,
      y: 0,
      width: '100%',
      height: '100%',
      align: 'center',
      _meta: {
        type: 'card',
        // Card background for scroll list
      }
    },
    emptyState: {
      section: 'body',
      x: 0,
      y: 0,
      width: '100%',
      height: '100%',
      align: 'center',
      _meta: {
        type: 'text',
        style: 'body',
        text: 'history.empty',
        color: TOKENS.colors.mutedText,
        conditional: 'isEmpty'
      }
    },
    goBackButton: {
      section: 'footer',
      x: 'center',
      y: '20%',
      width: TOKENS.sizing.iconLarge,
      height: TOKENS.sizing.iconLarge,
      align: 'center',
      _meta: {
        type: 'iconButton',
        icon: 'goback-icon.png',
        onClick: 'goBack'
      }
    }
  }
}
```

#### 2.3 History Detail Page Layout Schema

**Add after imports in page/history-detail.js:**
```javascript
/**
 * Layout schema for the history detail screen.
 * Uses declarative positioning resolved by layout-engine.
 */
const HISTORY_DETAIL_LAYOUT = {
  sections: {
    header: {
      top: 0,
      height: '14%', // Larger for detail title
      roundSafeInset: true
    },
    scoreCard: {
      after: 'header',
      height: '35%', // Score display area
      roundSafeInset: true
    },
    setHistory: {
      height: 'fill',
      after: 'scoreCard',
      gap: '2%',
      roundSafeInset: true
    },
    footer: {
      bottom: 0,
      height: '12%',
      roundSafeInset: false
    }
  },
  elements: {
    pageTitle: {
      section: 'header',
      x: 'center',
      y: '30%',
      width: '100%',
      height: '50%',
      align: 'center',
      _meta: {
        type: 'text',
        style: 'pageTitle',
        text: 'history.detail.title'
      }
    },
    scoreCardBg: {
      section: 'scoreCard',
      x: 0,
      y: 0,
      width: '100%',
      height: '100%',
      align: 'center',
      _meta: {
        type: 'card'
      }
    },
    dateLabel: {
      section: 'scoreCard',
      x: 'center',
      y: '5%',
      width: '90%',
      height: '15%',
      align: 'center',
      _meta: {
        type: 'text',
        style: 'body',
        color: TOKENS.colors.mutedText,
        text: 'date' // Dynamic
      }
    },
    scoreText: {
      section: 'scoreCard',
      x: 'center',
      y: '25%',
      width: '90%',
      height: '40%',
      align: 'center',
      _meta: {
        type: 'text',
        style: 'score',
        text: 'score' // Dynamic
      }
    },
    winnerText: {
      section: 'scoreCard',
      x: 'center',
      y: '70%',
      width: '90%',
      height: '20%',
      align: 'center',
      _meta: {
        type: 'text',
        style: 'body',
        color: TOKENS.colors.accent,
        text: 'winner' // Dynamic
      }
    },
    setHistoryCard: {
      section: 'setHistory',
      x: 0,
      y: 0,
      width: '100%',
      height: '100%',
      align: 'center',
      _meta: {
        type: 'card'
      }
    },
    setHistoryTitle: {
      section: 'setHistory',
      x: 'center',
      y: '2%',
      width: '90%',
      height: '12%',
      align: 'center',
      _meta: {
        type: 'text',
        style: 'body',
        color: TOKENS.colors.mutedText,
        text: 'history.detail.setHistory'
      }
    },
    setHistoryList: {
      section: 'setHistory',
      x: 0,
      y: '15%',
      width: '100%',
      height: '80%',
      align: 'center',
      _meta: {
        type: 'scrollList'
      }
    },
    deleteButton: {
      section: 'footer',
      x: '25%', // Left side
      y: '20%',
      width: TOKENS.sizing.iconLarge,
      height: TOKENS.sizing.iconLarge,
      align: 'center',
      _meta: {
        type: 'iconButton',
        icon: 'delete-icon.png',
        confirmIcon: 'remove-icon.png',
        onClick: 'handleDeleteClick'
      }
    },
    goBackButton: {
      section: 'footer',
      x: '75%', // Right side
      y: '20%',
      width: TOKENS.sizing.iconLarge,
      height: TOKENS.sizing.iconLarge,
      align: 'center',
      _meta: {
        type: 'iconButton',
        icon: 'goback-icon.png',
        onClick: 'goBack'
      }
    }
  }
}
```

**Verification:** Schemas follow established pattern. All sections and elements have valid structure.

---

### Step 3: Subtask 50.3 - Migrate Settings Page

**Action:** Refactor `renderSettingsScreen()` to use layout engine and ui-components.

#### 3.1 Remove getScreenMetrics Method

The page-level `getScreenMetrics()` method is no longer needed since we import from screen-utils.

**Delete this method:**
```javascript
getScreenMetrics() {
  if (typeof hmSetting === 'undefined') {
    return { width: 390, height: 450 }
  }
  const { width, height } = hmSetting.getDeviceInfo()
  return {
    width: ensureNumber(width, 390),
    height: ensureNumber(height, 450)
  }
}
```

#### 3.2 Refactor renderSettingsScreen()

**Replace the entire `renderSettingsScreen()` method:**

```javascript
renderSettingsScreen() {
  if (typeof hmUI === 'undefined') {
    return
  }

  const metrics = getScreenMetrics()
  const layout = resolveLayout(SETTINGS_LAYOUT, metrics)

  this.clearWidgets()

  // Background
  const bg = createBackground()
  this.createWidget(bg.widgetType, bg.config)

  // Page Title
  const titleEl = layout.elements.pageTitle
  const titleMeta = SETTINGS_LAYOUT.elements.pageTitle._meta
  if (titleEl) {
    const titleConfig = createText({
      text: gettext(titleMeta.text),
      style: titleMeta.style,
      x: titleEl.x,
      y: titleEl.y,
      w: titleEl.w,
      h: titleEl.h
    })
    this.createWidget(titleConfig.widgetType, titleConfig.config)
  }

  // Scroll List
  const listEl = layout.elements.scrollList
  if (listEl) {
    const listMeta = SETTINGS_LAYOUT.elements.scrollList._meta
    
    // Calculate row height based on available space
    const rowHeight = Math.floor(listEl.h / 3.57)
    const listHeight = rowHeight * 3 + 2
    
    // Text sizing
    const itemTextSize = getFontSize('body')
    const versionTextSize = getFontSize('caption')
    const textH = Math.round(itemTextSize * 1.4)
    const textY = Math.round((rowHeight - textH) / 2)
    
    // Icon sizing
    const iconSize = TOKENS.sizing.iconMedium // 32px
    const iconPad = Math.round(metrics.width * 0.02)
    const iconX = listEl.w - iconSize - iconPad
    const iconY = Math.round((rowHeight - iconSize) / 2)
    
    // Text positioning
    const textX = iconPad
    const textW = iconX - textX - Math.round(iconPad / 2)
    
    // Version text (centered, smaller)
    const versionTextH = Math.round(versionTextSize * 1.4)
    const versionTextY = Math.round((rowHeight - versionTextH) / 2)

    // Item configs: type_id 1 = normal, type_id 2 = danger (red), type_id 3 = version (muted)
    const itemConfigNormal = {
      type_id: 1,
      item_height: rowHeight,
      item_bg_color: TOKENS.colors.background,
      item_bg_radius: 0,
      text_view: [{
        x: textX,
        y: textY,
        w: textW,
        h: textH,
        key: 'label',
        color: TOKENS.colors.text,
        text_size: itemTextSize
      }],
      text_view_count: 1,
      image_view: [{ x: iconX, y: iconY, w: iconSize, h: iconSize, key: 'icon' }],
      image_view_count: 1
    }

    const itemConfigDanger = {
      type_id: 2,
      item_height: rowHeight,
      item_bg_color: TOKENS.colors.background,
      item_bg_radius: 0,
      text_view: [{
        x: textX,
        y: textY,
        w: textW,
        h: textH,
        key: 'label',
        color: TOKENS.colors.danger,
        text_size: itemTextSize
      }],
      text_view_count: 1,
      image_view: [{ x: iconX, y: iconY, w: iconSize, h: iconSize, key: 'icon' }],
      image_view_count: 1
    }

    const itemConfigVersion = {
      type_id: 3,
      item_height: rowHeight,
      item_bg_color: TOKENS.colors.background,
      item_bg_radius: 0,
      text_view: [{
        x: 0,
        y: versionTextY,
        w: listEl.w,
        h: versionTextH,
        key: 'version',
        color: TOKENS.colors.mutedText,
        text_size: versionTextSize
      }],
      text_view_count: 1,
      image_view: [],
      image_view_count: 0
    }

    // Create scroll list
    this.scrollList = this.createWidget(hmUI.widget.SCROLL_LIST, {
      x: listEl.x,
      y: listEl.y,
      w: listEl.w,
      h: listHeight,
      item_space: 2,
      item_config: [itemConfigNormal, itemConfigDanger, itemConfigVersion],
      item_config_count: 3,
      data_array: [
        { label: gettext('settings.previousMatches'), icon: 'chevron-icon.png' },
        { label: gettext('settings.clearAppData'), icon: 'delete-icon.png' },
        { version: `${gettext('settings.version')} ${APP_VERSION}` }
      ],
      data_count: 3,
      item_click_func: (_list, index) => {
        this.handleListItemClick(index)
      },
      data_type_config: [
        { start: 0, end: 0, type_id: 1 },
        { start: 1, end: 1, type_id: 1 },
        { start: 2, end: 2, type_id: 3 }
      ],
      data_type_config_count: 3
    })
  }

  // Go back button
  const goBackEl = layout.elements.goBackButton
  const goBackMeta = SETTINGS_LAYOUT.elements.goBackButton._meta
  if (goBackEl) {
    const goBackBtn = createButton({
      x: goBackEl.x,
      y: goBackEl.y,
      variant: 'icon',
      normal_src: goBackMeta.icon,
      onClick: () => this.navigateToHomePage()
    })
    this.createWidget(goBackBtn.widgetType, goBackBtn.config)
  }
}
```

**Verification:** 
- `npm run complete-check` passes
- Settings page renders on round and square simulators
- Menu items display correctly
- Scroll works
- GoBack navigates to home
- Clear-confirm delete works (tap once shows confirm, tap again deletes)

---

### Step 4: Subtask 50.4 - Migrate History Page

**Action:** Refactor `renderHistoryScreen()` to use layout engine and ui-components.

#### 4.1 Remove getScreenMetrics Method

Same as Settings - delete the page-level `getScreenMetrics()` method.

#### 4.2 Refactor renderHistoryScreen()

**Replace the entire `renderHistoryScreen()` method:**

```javascript
renderHistoryScreen() {
  if (typeof hmUI === 'undefined') {
    return
  }

  const metrics = getScreenMetrics()
  const layout = resolveLayout(HISTORY_LAYOUT, metrics)

  this.clearWidgets()

  // Background
  const bg = createBackground()
  this.createWidget(bg.widgetType, bg.config)

  // Page Title
  const titleEl = layout.elements.pageTitle
  const titleMeta = HISTORY_LAYOUT.elements.pageTitle._meta
  if (titleEl) {
    const titleConfig = createText({
      text: gettext(titleMeta.text),
      style: titleMeta.style,
      x: titleEl.x,
      y: titleEl.y,
      w: titleEl.w,
      h: titleEl.h
    })
    this.createWidget(titleConfig.widgetType, titleConfig.config)
  }

  // Body content - either empty state or scroll list
  const listEl = layout.elements.scrollListCard
  
  if (this.historyEntries.length === 0) {
    // Empty state
    const emptyMeta = HISTORY_LAYOUT.elements.emptyState._meta
    const emptyConfig = createText({
      text: gettext(emptyMeta.text),
      style: emptyMeta.style,
      x: listEl.x,
      y: listEl.y,
      w: listEl.w,
      h: listEl.h,
      color: emptyMeta.color
    })
    this.createWidget(emptyConfig.widgetType, emptyConfig.config)
  } else {
    // Card background for list
    const cardConfig = createCard({
      x: listEl.x,
      y: listEl.y,
      w: listEl.w,
      h: listEl.h,
      color: TOKENS.colors.background // Match original behavior
    })
    this.createWidget(cardConfig.widgetType, cardConfig.config)

    // Calculate row height for 2 visible items
    const rowHeight = Math.floor(listEl.h / 2.35)
    const listHeight = rowHeight * 2 + Math.round(rowHeight * 0.1)

    // Font sizes
    const dateTextSize = getFontSize('body')
    const scoreTextSize = getFontSize('score')

    // Icon sizing (fixed 48px)
    const iconSize = TOKENS.sizing.iconLarge
    const iconPad = Math.round(metrics.width * 0.02)
    const iconX = listEl.w - iconSize - iconPad
    const iconY = Math.round((rowHeight - iconSize) / 2)

    // Text positioning (same Y and H as icon for centering)
    const textY = iconY
    const textH = iconSize
    const dateX = Math.round(metrics.width * 0.02)
    const dateWidth = Math.round(listEl.w * 0.45)
    const scoreX = Math.round(listEl.w * 0.5)
    const scoreWidth = iconX - scoreX - iconPad

    // Build data array
    const scrollDataArray = this.historyEntries.map((entry) => ({
      date: formatDate(entry),
      score: `${entry.setsWonTeamA}-${entry.setsWonTeamB}`,
      icon: 'chevron-icon.png'
    }))

    // Single item config
    const itemConfig = {
      type_id: 1,
      item_height: rowHeight,
      item_bg_color: TOKENS.colors.background,
      item_bg_radius: 0,
      text_view: [
        {
          x: dateX,
          y: textY,
          w: dateWidth,
          h: textH,
          key: 'date',
          color: TOKENS.colors.text,
          text_size: dateTextSize
        },
        {
          x: scoreX,
          y: textY,
          w: scoreWidth,
          h: textH,
          key: 'score',
          color: TOKENS.colors.accent,
          text_size: scoreTextSize
        }
      ],
      text_view_count: 2,
      image_view: [{ x: iconX, y: iconY, w: iconSize, h: iconSize, key: 'icon' }],
      image_view_count: 1
    }

    // Create scroll list
    this.scrollList = this.createWidget(hmUI.widget.SCROLL_LIST, {
      x: listEl.x,
      y: listEl.y,
      w: listEl.w,
      h: listHeight,
      item_space: 2,
      item_config: [itemConfig],
      item_config_count: 1,
      data_array: scrollDataArray,
      data_count: scrollDataArray.length,
      item_click_func: (_list, index) => {
        this.handleHistoryItemClick(index)
      }
    })
  }

  // Go back button
  const goBackEl = layout.elements.goBackButton
  const goBackMeta = HISTORY_LAYOUT.elements.goBackButton._meta
  if (goBackEl) {
    const goBackBtn = createButton({
      x: goBackEl.x,
      y: goBackEl.y,
      variant: 'icon',
      normal_src: goBackMeta.icon,
      onClick: () => this.goBack()
    })
    this.createWidget(goBackBtn.widgetType, goBackBtn.config)
  }
}
```

**Verification:**
- `npm run complete-check` passes
- History page renders on round and square simulators
- Empty state shows when no matches exist
- Scroll list populates with matches
- Items navigate to detail page
- GoBack returns to settings

---

### Step 5: Subtask 50.5 - Migrate History Detail Page and Validate

**Action:** Refactor `renderDetailScreen()` to use layout engine and ui-components.

#### 5.1 Remove getScreenMetrics and Round-Safe Calculation Methods

**Delete these methods:**
```javascript
getScreenMetrics() { ... }
calculateRoundSafeSideInset(...) { ... }
calculateRoundSafeSectionSideInset(...) { ... }
```

These are replaced by imported functions from `screen-utils.js`.

#### 5.2 Update parseParams() - No Changes Required

The `parseParams()` method handles URL parameter parsing and doesn't use tokens.

#### 5.3 Update updateDeleteButtonIcon()

This method recreates the delete button when toggling confirm mode. Update to use the layout:

```javascript
updateDeleteButtonIcon(isConfirmMode) {
  if (typeof hmUI === 'undefined') return

  const metrics = getScreenMetrics()
  const layout = resolveLayout(HISTORY_DETAIL_LAYOUT, metrics)
  
  // Get button position from layout
  const deleteEl = layout.elements.deleteButton
  if (!deleteEl) return

  // Delete old button
  if (this.deleteButton) {
    hmUI.deleteWidget(this.deleteButton)
    this.deleteButton = null
  }

  // Create new button with updated icon
  const deleteMeta = HISTORY_DETAIL_LAYOUT.elements.deleteButton._meta
  this.deleteButton = hmUI.createWidget(hmUI.widget.BUTTON, {
    x: deleteEl.x,
    y: deleteEl.y,
    w: deleteEl.w,
    h: deleteEl.h,
    normal_src: isConfirmMode ? deleteMeta.confirmIcon : deleteMeta.icon,
    press_src: isConfirmMode ? deleteMeta.confirmIcon : deleteMeta.icon,
    click_func: () => this.handleDeleteClick()
  })
}
```

#### 5.4 Refactor renderDetailScreen()

**Replace the entire `renderDetailScreen()` method:**

```javascript
renderDetailScreen() {
  if (typeof hmUI === 'undefined') {
    return
  }

  const metrics = getScreenMetrics()
  const layout = resolveLayout(HISTORY_DETAIL_LAYOUT, metrics)

  this.clearWidgets()

  // Background
  const bg = createBackground()
  this.createWidget(bg.widgetType, bg.config)

  // Page Title
  const titleEl = layout.elements.pageTitle
  const titleMeta = HISTORY_DETAIL_LAYOUT.elements.pageTitle._meta
  if (titleEl) {
    const titleConfig = createText({
      text: gettext(titleMeta.text),
      style: titleMeta.style,
      x: titleEl.x,
      y: titleEl.y,
      w: titleEl.w,
      h: titleEl.h
    })
    this.createWidget(titleConfig.widgetType, titleConfig.config)
  }

  if (!this.matchEntry) {
    // No match found - show error message
    const scoreCardEl = layout.elements.scoreCardBg
    const errorConfig = createText({
      text: gettext('history.detail.notFound'),
      style: 'body',
      x: scoreCardEl.x,
      y: scoreCardEl.y,
      w: scoreCardEl.w,
      h: Math.round(scoreCardEl.h * 0.5),
      color: TOKENS.colors.mutedText
    })
    this.createWidget(errorConfig.widgetType, errorConfig.config)
  } else {
    // Score card background
    const scoreCardEl = layout.elements.scoreCardBg
    const scoreCardConfig = createCard({
      x: scoreCardEl.x,
      y: scoreCardEl.y,
      w: scoreCardEl.w,
      h: scoreCardEl.h,
      color: TOKENS.colors.background
    })
    this.createWidget(scoreCardConfig.widgetType, scoreCardConfig.config)

    // Date label
    const dateEl = layout.elements.dateLabel
    const dateStr = formatDate(this.matchEntry)
    const dateConfig = createText({
      text: dateStr,
      style: 'body',
      x: dateEl.x,
      y: dateEl.y,
      w: dateEl.w,
      h: dateEl.h,
      color: TOKENS.colors.mutedText
    })
    this.createWidget(dateConfig.widgetType, dateConfig.config)

    // Score text
    const scoreEl = layout.elements.scoreText
    const scoreConfig = createText({
      text: `${this.matchEntry.setsWonTeamA} - ${this.matchEntry.setsWonTeamB}`,
      style: 'score',
      x: scoreEl.x,
      y: scoreEl.y,
      w: scoreEl.w,
      h: scoreEl.h
    })
    this.createWidget(scoreConfig.widgetType, scoreConfig.config)

    // Winner text
    const winnerEl = layout.elements.winnerText
    const winnerText = this.matchEntry.winnerTeam === 'teamA'
      ? `${this.matchEntry.teamALabel} ${gettext('history.detail.wins')}`
      : this.matchEntry.winnerTeam === 'teamB'
        ? `${this.matchEntry.teamBLabel} ${gettext('history.detail.wins')}`
        : gettext('history.detail.draw')
    const winnerConfig = createText({
      text: winnerText,
      style: 'body',
      x: winnerEl.x,
      y: winnerEl.y,
      w: winnerEl.w,
      h: winnerEl.h,
      color: TOKENS.colors.accent
    })
    this.createWidget(winnerConfig.widgetType, winnerConfig.config)

    // Set history section
    if (this.matchEntry.setHistory && this.matchEntry.setHistory.length > 0) {
      // Set history card background
      const setHistoryCardEl = layout.elements.setHistoryCard
      const setHistoryCardConfig = createCard({
        x: setHistoryCardEl.x,
        y: setHistoryCardEl.y,
        w: setHistoryCardEl.w,
        h: setHistoryCardEl.h,
        color: TOKENS.colors.background
      })
      this.createWidget(setHistoryCardConfig.widgetType, setHistoryCardConfig.config)

      // Set history title
      const setTitleEl = layout.elements.setHistoryTitle
      const setTitleConfig = createText({
        text: gettext('history.detail.setHistory'),
        style: 'body',
        x: setTitleEl.x,
        y: setTitleEl.y,
        w: setTitleEl.w,
        h: setTitleEl.h,
        color: TOKENS.colors.mutedText
      })
      this.createWidget(setTitleConfig.widgetType, setTitleConfig.config)

      // Set history scroll list
      const setListEl = layout.elements.setHistoryList
      const setRowHeight = Math.round(metrics.height * 0.07)
      const setTextSize = getFontSize('body')

      const setsDataArray = this.matchEntry.setHistory.map((set) => ({
        setInfo: `Set ${set.setNumber}:  ${set.teamAGames} - ${set.teamBGames}`
      }))

      this.createWidget(hmUI.widget.SCROLL_LIST, {
        x: setListEl.x,
        y: setListEl.y,
        w: setListEl.w,
        h: setListEl.h,
        item_space: 2,
        item_config: [{
          type_id: 1,
          item_height: setRowHeight,
          item_bg_color: TOKENS.colors.background,
          item_bg_radius: 0,
          text_view: [{
            x: Math.round(metrics.width * 0.02),
            y: Math.round((setRowHeight - setTextSize) / 2),
            w: Math.round(setListEl.w * 0.9),
            h: setTextSize,
            key: 'setInfo',
            color: TOKENS.colors.text,
            text_size: setTextSize
          }],
          text_view_count: 1
        }],
        item_config_count: 1,
        data_array: setsDataArray,
        data_count: setsDataArray.length
      })
    }
  }

  // Delete button (left side)
  const deleteEl = layout.elements.deleteButton
  const deleteMeta = HISTORY_DETAIL_LAYOUT.elements.deleteButton._meta
  if (deleteEl) {
    this.deleteButton = this.createWidget(hmUI.widget.BUTTON, {
      x: deleteEl.x,
      y: deleteEl.y,
      w: deleteEl.w,
      h: deleteEl.h,
      normal_src: deleteMeta.icon,
      press_src: deleteMeta.icon,
      click_func: () => this.handleDeleteClick()
    })
  }

  // Go back button (right side)
  const goBackEl = layout.elements.goBackButton
  const goBackMeta = HISTORY_DETAIL_LAYOUT.elements.goBackButton._meta
  if (goBackEl) {
    const goBackBtn = createButton({
      x: goBackEl.x,
      y: goBackEl.y,
      variant: 'icon',
      normal_src: goBackMeta.icon,
      onClick: () => this.goBack()
    })
    this.createWidget(goBackBtn.widgetType, goBackBtn.config)
  }
}
```

**Verification:**
- `npm run complete-check` passes
- History detail renders on round and square simulators
- Match details display correctly
- Set history scroll list works
- Delete button toggles to confirm mode on first tap
- Delete executes on second tap (returns to history list)
- GoBack returns to history list

---

## Validation

### Success Criteria

| Criterion | Verification Method |
|-----------|---------------------|
| Build verification | `npm run complete-check` passes with no errors |
| Settings: menu items display | Visual inspection on simulator |
| Settings: scroll works | Manual test - scroll through items |
| Settings: goBack navigates | Tap goBack button → navigates to home |
| Settings: clear-confirm delete works | Tap clear → shows confirm → tap again → deletes + toast |
| History: scroll list populates | Create matches → view history list |
| History: empty state shows | Clear all data → view history → see empty message |
| History: goBack works | Tap goBack → returns to settings |
| History Detail: details render correctly | Tap history item → view detail page |
| History Detail: set history scroll works | View match with multiple sets |
| History Detail: goBack returns to list | Tap goBack → returns to history |
| History Detail: delete-confirm works | Tap delete → shows confirm → tap again → deletes |
| Round screen: titles not cut off | Visual QA on round simulator |
| Square screen: spacing preserved | Visual QA on square simulator |
| Visual appearance unchanged | Compare before/after screenshots |

### Checkpoints

| Checkpoint | Subtask | Verification |
|------------|---------|--------------|
| C1: Imports added | 50.1 | Files parse without errors |
| C2: Tokens removed | 50.1 | No references to *_TOKENS constants |
| C3: Schemas defined | 50.2 | `resolveLayout()` returns valid layout |
| C4: Settings migrated | 50.3 | All Settings tests pass |
| C5: History migrated | 50.4 | All History tests pass |
| C6: History Detail migrated | 50.5 | All Detail tests pass |
| C7: Final validation | 50.5 | Complete visual QA on both screen shapes |

### Rollback Notes

- **Subtask 50.1-50.2**: Low risk - code not yet used, can revert imports/schemas
- **Subtask 50.3**: Medium risk - keep backup of original `renderSettingsScreen()` as comment
- **Subtask 50.4**: Medium risk - keep backup of original `renderHistoryScreen()` as comment
- **Subtask 50.5**: Medium risk - keep backup of original `renderDetailScreen()` as comment

If any subtask fails validation:
1. Revert the specific file changes using git
2. Review the error/issue
3. Fix and re-apply changes

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Layout positions differ from original | Compare pixel values with legacy calculations |
| SCROLL_LIST behavior differs | Test scroll functionality thoroughly on both screen shapes |
| Round screen safe inset issues | Test on round simulator (GTR 3) - verify no content cutoff |
| Delete confirm flow broken | Test double-tap delete on both History and History Detail |
| Empty state not showing | Test History page with no matches |
| Color mismatches | Verify TOKENS.colors matches old *_TOKENS.colors values |
| Font size differences | Use getFontSize() with correct style tokens |

---

## Color Token Mapping

For reference, the old tokens map to the new centralized tokens:

| Old Token | New Token |
|-----------|-----------|
| `SETTINGS_TOKENS.colors.background` | `TOKENS.colors.background` (0x000000) |
| `SETTINGS_TOKENS.colors.cardBackground` | `TOKENS.colors.cardBackground` (0x1a1c20) |
| `SETTINGS_TOKENS.colors.text` | `TOKENS.colors.text` (0xffffff) |
| `SETTINGS_TOKENS.colors.mutedText` | `TOKENS.colors.mutedText` (0x888888) |
| `SETTINGS_TOKENS.colors.danger` | `TOKENS.colors.danger` (0xff6d78) |
| `HISTORY_TOKENS.colors.accent` | `TOKENS.colors.accent` (0x1eb98c) |

**Note:** Some colors may have slight variations. The new centralized tokens are the source of truth.

---

## Typography Token Mapping

| Old fontScale | New typography token |
|---------------|---------------------|
| `fontScale.title` (0.065) | `typography.pageTitle` (0.0825) |
| `fontScale.item` (0.07) | `typography.body` (0.055) |
| `fontScale.version` (0.055) | `typography.caption` (0.05) |
| `fontScale.score` (0.095) | `typography.score` (0.15) |
| `fontScale.date` (0.068) | `typography.sectionTitle` (0.068) |
| `fontScale.body` (0.055) | `typography.body` (0.055) |

**Note:** Font sizes may have slight variations. The new centralized tokens are the source of truth. Visual QA should verify readability.

---

## Estimated Effort

| Subtask | Effort |
|---------|--------|
| 50.1 - Remove legacy + add imports | 20 min |
| 50.2 - Define layout schemas | 30 min |
| 50.3 - Migrate Settings page | 45 min |
| 50.4 - Migrate History page | 45 min |
| 50.5 - Migrate History Detail + validation | 60 min |
| **Total** | **~3.5 hours** |

---

## Files Modified

| File | Change Type |
|------|-------------|
| `page/settings.js` | Modified |
| `page/history.js` | Modified |
| `page/history-detail.js` | Modified |

## Files Referenced (No Changes)

| File | Purpose |
|------|---------|
| `utils/design-tokens.js` | Import TOKENS, getFontSize |
| `utils/screen-utils.js` | Import getScreenMetrics, clamp, ensureNumber |
| `utils/layout-engine.js` | Import resolveLayout |
| `utils/layout-presets.js` | Reference pattern for schema structure |
| `utils/ui-components.js` | Import createBackground, createCard, createText, createButton |
