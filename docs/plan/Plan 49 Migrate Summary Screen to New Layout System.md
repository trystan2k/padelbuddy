# Plan 49: Migrate Summary Screen to New Layout System

**Task ID**: 49  
**Priority**: High  
**Dependencies**: 40, 41, 42, 43, 44 (all completed)  
**Target File**: `page/summary.js`

---

## Task Analysis

### Main Objective
Refactor `page/summary.js` to use the new declarative layout system, replacing `SUMMARY_TOKENS` and inline position calculations with design tokens, layout engine resolution, and reusable UI components while maintaining scrollable set history functionality.

### Identified Dependencies
- `utils/design-tokens.js` - `TOKENS`, `getFontSize()`, `getColor()`, `toPercentage()`
- `utils/screen-utils.js` - `getScreenMetrics()`, `clamp()`, `ensureNumber()`, `getRoundSafeInset()`, `getRoundSafeSectionInset()`
- `utils/layout-engine.js` - `resolveLayout()`, `safeResolveLayout()`
- `utils/ui-components.js` - `createBackground()`, `createCard()`, `createText()`, `createButton()`
- `utils/layout-presets.js` - `createStandardPageLayout()`, `createPageWithFooterButton()`

### System Impact
- **Medium complexity**: The summary screen has ~250 lines of render logic with a scrollable list
- **Three-section layout**: Header (title, winner, score), Body (scrollable set history), Footer (home button)
- **SCROLL_LIST widget**: Requires pixel coordinates - must integrate with resolved layout bounds
- **Round screen geometry**: Header and body sections require safe inset calculations
- **Gesture handler**: Right swipe to navigate home must be preserved
- **Match persistence**: Auto-save to history on render must be preserved

---

## Chosen Approach

### Proposed Solution
**Full Declarative Schema Migration with Scroll List Integration** - Define a complete `SUMMARY_LAYOUT` schema with header/body/footer sections, using the layout engine for coordinate resolution. The SCROLL_LIST will receive its bounds from the resolved body section.

### Justification for Simplicity
1. **Consistency**: Aligns with already-migrated pages (index.js, game.js, setup.js)
2. **Maintainability**: Declarative schema is easier to understand and modify
3. **Separation of Concerns**: Layout logic separated from rendering logic
4. **Reusability**: Uses established ui-components factories
5. **Round Screen Support**: Layout engine handles safe insets automatically

### Components to be Modified/Created
| Component | Action | Description |
|-----------|--------|-------------|
| `SUMMARY_TOKENS` | DELETE | Remove legacy constant (lines 13-31) |
| `calculateRoundSafeSideInset()` | DELETE | Replaced by layout engine's round safe inset handling |
| `calculateRoundSafeSectionSideInset()` | DELETE | Replaced by layout engine's round safe inset handling |
| Imports | MODIFY | Add imports from new utility modules |
| `SUMMARY_LAYOUT` | CREATE | Define declarative layout schema |
| `renderSummaryScreen()` | REFACTOR | Use `resolveLayout()` and ui-components factories |
| Helper functions | KEEP | `cloneMatchState`, `ensureNumber`, `clamp`, `createSummaryViewModel`, etc. |

---

## Implementation Steps

### Step 1: Remove Legacy Dependencies (Subtask 49.1)

**Scope**: Clean up legacy code

**Actions**:
1. Delete `SUMMARY_TOKENS` constant (lines 13-31):
   ```javascript
   // DELETE THIS:
   const SUMMARY_TOKENS = Object.freeze({
     colors: {
       accent: 0x1eb98c,
       accentPressed: 0x1aa07a,
       background: 0x000000,
       buttonText: 0x000000,
       buttonSecondary: 0x24262b,
       buttonSecondaryPressed: 0x2d3036,
       buttonSecondaryText: 0xffffff,
       cardBackground: 0x000000,
       mutedText: 0x7d8289,
       text: 0xffffff
     },
     fontScale: {
       body: 0.08,
       button: 0.044,
       score: 0.11,
       subtitle: 0.036,
       title: 0.068,
       winner: 0.056
     },
     spacingScale: {
       bottomInset: 0.06,
       roundSideInset: 0.12,
       sectionGap: 0.02,
       sideInset: 0.07,
       topInset: 0.05
     }
   })
   ```

2. Delete `calculateRoundSafeSideInset()` function (lines 181-199):
   ```javascript
   // DELETE THIS ENTIRE FUNCTION:
   function calculateRoundSafeSideInset(width, height, yPosition, horizontalPadding) { ... }
   ```

3. Delete `calculateRoundSafeSectionSideInset()` function (lines 201-223):
   ```javascript
   // DELETE THIS ENTIRE FUNCTION:
   function calculateRoundSafeSectionSideInset(width, height, sectionTop, sectionHeight, horizontalPadding) { ... }
   ```

**Files Modified**: `page/summary.js`

**Validation**:
- [ ] `SUMMARY_TOKENS` removed - grep returns no references
- [ ] `calculateRoundSafeSideInset` removed - grep returns no references
- [ ] `calculateRoundSafeSectionSideInset` removed - grep returns no references
- [ ] Helper functions (`cloneMatchState`, `ensureNumber`, `clamp`, `isRecord`, etc.) remain intact
- [ ] `createSummaryViewModel()` remains intact

**Risk**: Low - these are isolated legacy components
**Mitigation**: Verify no other code references these deleted items

---

### Step 2: Add New Imports and Define SUMMARY_LAYOUT Schema (Subtask 49.2)

**Scope**: Establish new module imports and define layout schema

**Actions**:
1. Add new imports at top of file (after existing imports):
   ```javascript
   import { TOKENS, getFontSize, toPercentage } from '../utils/design-tokens.js'
   import { getScreenMetrics, clamp, ensureNumber } from '../utils/screen-utils.js'
   import { resolveLayout } from '../utils/layout-engine.js'
   import {
     createBackground,
     createCard,
     createText,
     createButton
   } from '../utils/ui-components.js'
   ```

2. Define `SUMMARY_LAYOUT` constant (after imports, before helper functions):
   ```javascript
   /**
    * Declarative layout schema for the Summary screen.
    * 
    * Structure:
    * - header: Title, winner text, score label, final score
    * - body: Set history with SCROLL_LIST
    * - footer: Home button
    */
   const SUMMARY_LAYOUT = {
     sections: {
       // Header section: Contains title, winner text, score
       header: {
         top: toPercentage(TOKENS.spacing.pageTop), // '5%'
         height: '36%', // Accommodates title + winner + score label + score value
         roundSafeInset: true // Enable round screen safe insets
       },
       // Body section: Set history (fills remaining space)
       body: {
         height: 'fill',
         after: 'header',
         gap: toPercentage(TOKENS.spacing.sectionGap), // '2%'
         roundSafeInset: true // Enable round screen safe insets
       },
       // Footer section: Home button (bottom-anchored)
       footer: {
         bottom: toPercentage(TOKENS.spacing.pageBottom), // '6%'
         height: '10%', // Button area height
         roundSafeInset: false // Centered icon doesn't need inset
       }
     },
     elements: {
       // ── Header Card Elements ────────────────────────────────────────────
       headerCard: {
         section: 'header',
         x: 0,
         y: 0,
         width: '100%',
         height: '100%',
         align: 'left',
         _meta: {
           type: 'card',
           radius: 'auto' // Use cardRadiusRatio
         }
       },
       // Title text ("Match Summary")
       titleText: {
         section: 'header',
         x: 0,
         y: '0%',
         width: '100%',
         height: '28%',
         align: 'center',
         _meta: {
           type: 'text',
           style: 'sectionTitle',
           color: 'mutedText',
           textKey: 'summary.title'
         }
       },
       // Winner text (e.g., "Team A Wins!")
       winnerText: {
         section: 'header',
         x: 0,
         y: '28%',
         width: '100%',
         height: '36%',
         align: 'center',
         _meta: {
           type: 'text',
           style: 'bodyLarge', // Using bodyLarge for winner text
           color: 'accent',
           textKey: 'winnerText' // Dynamic: viewModel.winnerText
         }
       },
       // Score label ("Final Score")
       scoreLabel: {
         section: 'header',
         x: 0,
         y: '64%',
         width: '100%',
         height: '18%',
         align: 'center',
         _meta: {
           type: 'text',
           style: 'caption',
           color: 'mutedText',
           textKey: 'summary.finalScoreLabel'
         }
       },
       // Final score value (e.g., "2-1")
       scoreValue: {
         section: 'header',
         x: 0,
         y: '82%',
         width: '100%',
         height: '18%',
         align: 'center',
         _meta: {
           type: 'text',
           style: 'score',
           color: 'text',
           textKey: 'finalSetsScore' // Dynamic: viewModel.finalSetsScore
         }
       },
       
       // ── Body Section Elements (Set History) ───────────────────────────────
       historyCard: {
         section: 'body',
         x: 0,
         y: 0,
         width: '100%',
         height: '100%',
         align: 'left',
         _meta: {
           type: 'card',
           radius: 'auto'
         }
       },
       historyTitle: {
         section: 'body',
         x: 0,
         y: '0%',
         width: '100%',
         height: '24%',
         align: 'center',
         _meta: {
           type: 'text',
           style: 'caption',
           color: 'mutedText',
           textKey: 'summary.setHistoryTitle'
         }
       },
       // Note: SCROLL_LIST is created programmatically within the body section
       // Its bounds are derived from: historyBodyY and historyBodyHeight
       
       // ── Footer Section Elements ──────────────────────────────────────────
       homeButton: {
         section: 'footer',
         x: 'center',
         y: 'center',
         width: TOKENS.sizing.iconLarge, // 48
         height: TOKENS.sizing.iconLarge, // 48
         align: 'center',
         _meta: {
           type: 'iconButton',
           icon: 'home-icon.png',
           onClick: 'handleNavigateHome'
         }
       }
     }
   }
   ```

**Key Design Decisions**:
1. **Header section**: 36% height to accommodate 4 stacked text elements with proper spacing
2. **Body section**: `height: 'fill'` to consume remaining space between header and footer
3. **Footer section**: 10% height, bottom-anchored for consistent button placement
4. **Round safe insets**: Header and body use `roundSafeInset: true`, footer uses `false` (centered icon)
5. **SCROLL_LIST bounds**: Derived programmatically from resolved body section minus title area
6. **Typography mapping**:
   - Title: `sectionTitle` (0.068 × width)
   - Winner: `bodyLarge` (0.08 × width) - larger for prominence
   - Score label: `caption` (0.036 × width)
   - Score value: `score` (0.11 × width) - largest
   - History title: `caption` (0.036 × width)
   - History rows: `body` (0.055 × width)

**Files Modified**: `page/summary.js`

**Validation**:
- [ ] Imports compile without errors
- [ ] `SUMMARY_LAYOUT` schema defined with valid structure
- [ ] All elements reference valid sections ('header', 'body', 'footer')
- [ ] Percentage values use string format ('36%', '100%')
- [ ] Pixel values use number format (TOKENS.sizing.iconLarge = 48)
- [ ] `toPercentage()` helper used for TOKENS-based values

**Risk**: Low - schema is declarative and isolated
**Mitigation**: Reference existing schemas in index.js and game.js for structure

---

### Step 3: Refactor Header Section with Layout Engine (Subtask 49.3)

**Scope**: Replace header rendering with layout engine resolution and ui-components

**Current Implementation** (lines 346-431 in renderSummaryScreen):
```javascript
// Current: Manual position calculations
const headerSideInset = resolveSectionSideInset(headerY, headerHeight)
const headerX = headerSideInset
const headerWidth = Math.max(1, width - headerSideInset * 2)
// ... manual widget creation
```

**New Implementation**:
```javascript
renderSummaryScreen() {
  if (typeof hmUI === 'undefined') {
    return
  }

  // Get screen metrics and resolve layout
  const metrics = getScreenMetrics()
  const layout = resolveLayout(SUMMARY_LAYOUT, metrics)

  // Create view model from match state
  const viewModel = createSummaryViewModel(this.finishedMatchState)

  this.clearWidgets()

  // ── Background ────────────────────────────────────────────────────────
  const bg = createBackground()
  this.createWidget(bg.widgetType, bg.config)

  // ── Header Section ─────────────────────────────────────────────────────
  this.renderHeaderSection(layout, viewModel)

  // ── Body Section (Set History) ─────────────────────────────────────────
  this.renderBodySection(layout, viewModel, metrics)

  // ── Footer Section ─────────────────────────────────────────────────────
  this.renderFooterSection(layout)
}

/**
 * Renders the header section with title, winner text, and score.
 */
renderHeaderSection(layout, viewModel) {
  const headerSection = layout.sections.header
  const elements = SUMMARY_LAYOUT.elements

  // Header card background
  const headerCardConfig = createCard({
    x: headerSection.x,
    y: headerSection.y,
    w: headerSection.w,
    h: headerSection.h
  })
  this.createWidget(headerCardConfig.widgetType, headerCardConfig.config)

  // Title text ("Match Summary")
  const titleEl = layout.elements.titleText
  const titleMeta = elements.titleText._meta
  if (titleEl) {
    const titleConfig = createText({
      text: gettext(titleMeta.textKey),
      style: titleMeta.style,
      x: headerSection.x,
      y: headerSection.y + Math.round(headerSection.h * 0.0),
      w: headerSection.w,
      h: Math.round(headerSection.h * 0.28),
      color: TOKENS.colors[titleMeta.color]
    })
    this.createWidget(titleConfig.widgetType, titleConfig.config)
  }

  // Winner text (dynamic)
  const winnerEl = layout.elements.winnerText
  const winnerMeta = elements.winnerText._meta
  if (winnerEl) {
    const winnerConfig = createText({
      text: viewModel.winnerText,
      style: winnerMeta.style,
      x: headerSection.x,
      y: headerSection.y + Math.round(headerSection.h * 0.28),
      w: headerSection.w,
      h: Math.round(headerSection.h * 0.36),
      color: TOKENS.colors[winnerMeta.color]
    })
    this.createWidget(winnerConfig.widgetType, winnerConfig.config)
  }

  // Score label ("Final Score")
  const scoreLabelEl = layout.elements.scoreLabel
  const scoreLabelMeta = elements.scoreLabel._meta
  if (scoreLabelEl) {
    const scoreLabelConfig = createText({
      text: gettext(scoreLabelMeta.textKey),
      style: scoreLabelMeta.style,
      x: headerSection.x,
      y: headerSection.y + Math.round(headerSection.h * 0.64),
      w: headerSection.w,
      h: Math.round(headerSection.h * 0.18),
      color: TOKENS.colors[scoreLabelMeta.color]
    })
    this.createWidget(scoreLabelConfig.widgetType, scoreLabelConfig.config)
  }

  // Score value (dynamic)
  const scoreValueEl = layout.elements.scoreValue
  const scoreValueMeta = elements.scoreValue._meta
  if (scoreValueEl) {
    const scoreValueConfig = createText({
      text: viewModel.finalSetsScore,
      style: scoreValueMeta.style,
      x: headerSection.x,
      y: headerSection.y + Math.round(headerSection.h * 0.82),
      w: headerSection.w,
      h: Math.round(headerSection.h * 0.18),
      color: TOKENS.colors[scoreValueMeta.color]
    })
    this.createWidget(scoreValueConfig.widgetType, scoreValueConfig.config)
  }
}
```

**Files Modified**: `page/summary.js`

**Validation**:
- [ ] Header card renders with rounded corners
- [ ] Title text displays "Match Summary" (localized)
- [ ] Winner text displays team winner (e.g., "Team A Wins!")
- [ ] Score label displays "Final Score" (localized)
- [ ] Score value displays final sets score (e.g., "2-1")
- [ ] All text elements use TOKENS colors
- [ ] Round screen: header not cut off at edges

**Risk**: Low - straightforward text/card rendering
**Mitigation**: Verify color token names exist in TOKENS.colors

---

### Step 4: Refactor Body Section with Scrollable Set History (Subtask 49.4)

**Scope**: Replace body rendering with layout engine resolution and preserve SCROLL_LIST functionality

**Current Implementation** (lines 432-570 in renderSummaryScreen):
```javascript
// Current: Manual position calculations for history section
const historySideInset = resolveSectionSideInset(historyY, historyHeight)
const historyX = historySideInset
const historyWidth = Math.max(1, width - historySideInset * 2)
// ... SCROLL_LIST creation with manual bounds
```

**New Implementation**:
```javascript
/**
 * Renders the body section with set history scroll list.
 */
renderBodySection(layout, viewModel, metrics) {
  const bodySection = layout.sections.body
  const elements = SUMMARY_LAYOUT.elements

  // History card background
  const historyCardConfig = createCard({
    x: bodySection.x,
    y: bodySection.y,
    w: bodySection.w,
    h: bodySection.h
  })
  this.createWidget(historyCardConfig.widgetType, historyCardConfig.config)

  // History title ("Set History")
  const historyTitleEl = layout.elements.historyTitle
  const historyTitleMeta = elements.historyTitle._meta
  const historyTitleHeight = Math.round(bodySection.h * 0.24)
  
  if (historyTitleEl) {
    const historyTitleConfig = createText({
      text: gettext(historyTitleMeta.textKey),
      style: historyTitleMeta.style,
      x: bodySection.x,
      y: bodySection.y,
      w: bodySection.w,
      h: historyTitleHeight,
      color: TOKENS.colors[historyTitleMeta.color]
    })
    this.createWidget(historyTitleConfig.widgetType, historyTitleConfig.config)
  }

  // SCROLL_LIST for set history
  // Calculate bounds within the body section (below title)
  const historyBodyY = bodySection.y + historyTitleHeight
  const historyBodyHeight = Math.max(1, bodySection.h - historyTitleHeight)
  const historyRowHeight = clamp(
    Math.round(metrics.width * TOKENS.typography.body * 2.2),
    28,
    56
  )

  // Build data array for SCROLL_LIST
  const scrollDataArray = viewModel.historyLines.map((line) => ({ line }))

  // Create SCROLL_LIST widget
  this.createWidget(hmUI.widget.SCROLL_LIST, {
    x: bodySection.x,
    y: historyBodyY,
    w: bodySection.w,
    h: historyBodyHeight,
    item_space: 0,
    item_config: [
      {
        type_id: 1,
        item_height: historyRowHeight,
        item_bg_color: TOKENS.colors.cardBackground,
        item_bg_radius: 0,
        text_view: [
          {
            x: 0,
            y: 0,
            w: bodySection.w,
            h: historyRowHeight,
            key: 'line',
            color: TOKENS.colors.text,
            text_size: getFontSize('body')
          }
        ],
        text_view_count: 1
      }
    ],
    item_config_count: 1,
    data_array: scrollDataArray,
    data_count: scrollDataArray.length
  })
}
```

**Key Design Decisions**:
1. **SCROLL_LIST bounds**: Derived from body section coordinates minus title height
2. **Row height**: Calculated using `TOKENS.typography.body * 2.2` (same as current)
3. **Data array**: Built from `viewModel.historyLines` (preserved from current)
4. **Item styling**: Uses `TOKENS.colors.cardBackground` and `TOKENS.colors.text`
5. **Font size**: Uses `getFontSize('body')` for consistency

**Files Modified**: `page/summary.js`

**Validation**:
- [ ] History card renders with rounded corners
- [ ] History title displays "Set History" (localized)
- [ ] SCROLL_LIST renders within body bounds
- [ ] Scroll works for long history lists
- [ ] Row text uses body typography
- [ ] Round screen: scroll area not cut off at edges
- [ ] Empty state shows "No set history" message

**Risk**: Medium - SCROLL_LIST requires precise pixel coordinates
**Mitigation**: Verify bodySection coordinates are correct before SCROLL_LIST creation

---

### Step 5: Refactor Footer and Complete Token Integration (Subtask 49.5)

**Scope**: Replace footer rendering and verify all TOKENS usage

**Current Implementation** (lines 571-585 in renderSummaryScreen):
```javascript
// Current: Manual button positioning
const homeIconSize = 48
const homeIconX = Math.round((width - homeIconSize) / 2)
const homeIconY = actionsSectionY + Math.round((buttonHeight - homeIconSize) / 2)
// ... BUTTON creation
```

**New Implementation**:
```javascript
/**
 * Renders the footer section with home button.
 */
renderFooterSection(layout) {
  const footerSection = layout.sections.footer
  const elements = SUMMARY_LAYOUT.elements

  // Home icon button (centered in footer)
  const homeButtonEl = layout.elements.homeButton
  const homeButtonMeta = elements.homeButton._meta

  if (homeButtonEl) {
    const homeBtn = createButton({
      x: homeButtonEl.x,
      y: homeButtonEl.y,
      variant: 'icon',
      normal_src: homeButtonMeta.icon,
      press_src: homeButtonMeta.icon,
      onClick: () => this.handleNavigateHome()
    })
    this.createWidget(homeBtn.widgetType, homeBtn.config)
  }
}
```

**Complete renderSummaryScreen() After Refactor**:
```javascript
renderSummaryScreen() {
  if (typeof hmUI === 'undefined') {
    return
  }

  // Get screen metrics and resolve layout
  const metrics = getScreenMetrics()
  const layout = resolveLayout(SUMMARY_LAYOUT, metrics)

  // Create view model from match state
  const viewModel = createSummaryViewModel(this.finishedMatchState)

  this.clearWidgets()

  // ── Background ────────────────────────────────────────────────────────
  const bg = createBackground()
  this.createWidget(bg.widgetType, bg.config)

  // ── Header Section ─────────────────────────────────────────────────────
  this.renderHeaderSection(layout, viewModel)

  // ── Body Section (Set History) ─────────────────────────────────────────
  this.renderBodySection(layout, viewModel, metrics)

  // ── Footer Section ─────────────────────────────────────────────────────
  this.renderFooterSection(layout)
}
```

**Remove Page-level getScreenMetrics() method**:
```javascript
// DELETE THIS METHOD (now using imported getScreenMetrics):
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

**Final Verification Checklist**:
- [ ] All `SUMMARY_TOKENS.colors.*` replaced with `TOKENS.colors.*`
- [ ] All `SUMMARY_TOKENS.fontScale.*` replaced with `getFontSize()` calls
- [ ] All `SUMMARY_TOKENS.spacingScale.*` replaced with `TOKENS.spacing.*`
- [ ] No inline hex color values (e.g., `0x1eb98c`)
- [ ] No hardcoded pixel values except where using TOKENS.sizing constants
- [ ] `createBackground()` uses default TOKENS.colors.background
- [ ] `createCard()` uses default TOKENS.colors.cardBackground

**Files Modified**: `page/summary.js`

**Validation**:
- [ ] Home button displays centered in footer
- [ ] Home button navigates to index page on tap
- [ ] Right swipe gesture navigates to home (preserved)
- [ ] No SUMMARY_TOKENS references remain
- [ ] No calculateRoundSafeSideInset references remain
- [ ] All colors use TOKENS.colors
- [ ] All font sizes use getFontSize()

**Risk**: Low - footer is simple icon button
**Mitigation**: Verify createButton 'icon' variant works correctly

---

## Validation

### Success Criteria
1. **Build passes**: `npm run complete-check` returns no errors
2. **Visual parity**: Round and square screen layouts render without clipping
3. **Functional parity**: All existing functionality works identically
4. **Token integration**: All styling uses TOKENS (no hardcoded values)
5. **Scroll functionality**: Set history scroll list works within body bounds
6. **Navigation**: Home button and right swipe gesture work correctly

### Checkpoints

#### Pre-Implementation
- [ ] All dependency tasks (40, 41, 42, 43, 44) confirmed complete
- [ ] New utility modules exist and export expected functions
- [ ] Reference pages (index.js, game.js) use expected pattern
- [ ] Current summary.js tests pass (if any)

#### During Implementation
- [ ] After Step 1: SUMMARY_TOKENS and legacy functions removed, file compiles
- [ ] After Step 2: New imports added, SUMMARY_LAYOUT schema defined
- [ ] After Step 3: Header section renders with new layout system
- [ ] After Step 4: Body section with SCROLL_LIST renders correctly
- [ ] After Step 5: Footer section renders, all TOKENS integrated

#### Post-Implementation
- [ ] `npm run complete-check` passes
- [ ] Visual QA on round screen (GTR 3 simulator)
- [ ] Visual QA on square screen (GTS 3 simulator)
- [ ] Winner text displays correctly
- [ ] Final score displays correctly
- [ ] Set history scroll list works
- [ ] Empty history state displays "No set history"
- [ ] Home button navigates to index
- [ ] Right swipe gesture navigates to home
- [ ] Match saves to history on summary display

### Test Commands
```bash
# Build verification
npm run complete-check

# Manual testing checklist:
# 1. Launch app on round screen simulator (GTR 3)
# 2. Start new match, play to completion
# 3. Navigate to summary screen
# 4. Verify header: title, winner text, final score
# 5. Verify body: set history scroll list
# 6. Scroll history list (if multiple sets)
# 7. Tap home icon - returns to home
# 8. Swipe right - returns to home
# 9. Check match saved in history
# 10. Repeat on square screen simulator (GTS 3)
# 11. Test with empty set history
# 12. Test with tie-break sets
```

### Visual QA Checklist

#### Round Screen (GTR 3 - 466×466)
- [ ] Header card not cut off at edges
- [ ] Body card not cut off at edges
- [ ] Scroll list items fully visible
- [ ] Home button centered
- [ ] All text readable

#### Square Screen (GTS 3 - 390×450)
- [ ] Header card fills width appropriately
- [ ] Body card fills width appropriately
- [ ] Scroll list items fully visible
- [ ] Home button centered
- [ ] All text readable

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| SCROLL_LIST bounds incorrect | Medium | High | Calculate bounds from resolved layout sections, verify with logging |
| Round screen clipping | Low | Medium | Layout engine handles roundSafeInset automatically |
| Typography mismatch | Low | Low | Use getFontSize() with correct style keys |
| Gesture handler breaks | Low | Medium | Don't modify registerGestureHandler/unregisterGestureHandler |
| Match history not saved | Low | High | Don't modify refreshFinishedMatchState persistence logic |
| Empty history state broken | Low | Medium | Preserve createSummaryViewModel history lines logic |

---

## Token Mapping Reference

### Colors (SUMMARY_TOKENS → TOKENS)
| Legacy | New | Value |
|--------|-----|-------|
| `SUMMARY_TOKENS.colors.accent` | `TOKENS.colors.accent` | 0x1eb98c |
| `SUMMARY_TOKENS.colors.background` | `TOKENS.colors.background` | 0x000000 |
| `SUMMARY_TOKENS.colors.cardBackground` | `TOKENS.colors.cardBackground` | 0x1a1c20 |
| `SUMMARY_TOKENS.colors.mutedText` | `TOKENS.colors.mutedText` | 0x888888 |
| `SUMMARY_TOKENS.colors.text` | `TOKENS.colors.text` | 0xffffff |

**Note**: `cardBackground` in SUMMARY_TOKENS was 0x000000 (black), but TOKENS.colors.cardBackground is 0x1a1c20 (dark gray). This is intentional - the new design tokens use a subtle card background.

### Typography (SUMMARY_TOKENS → getFontSize)
| Legacy | New Style | Ratio |
|--------|-----------|-------|
| `fontScale.title (0.068)` | `getFontSize('sectionTitle')` | 0.068 |
| `fontScale.winner (0.056)` | `getFontSize('bodyLarge')` | 0.08 |
| `fontScale.subtitle (0.036)` | `getFontSize('caption')` | 0.036 |
| `fontScale.score (0.11)` | `getFontSize('score')` | 0.11 |
| `fontScale.body (0.08)` | `getFontSize('body')` | 0.055 |

**Note**: Typography ratios have slight differences. The winner text uses `bodyLarge` (0.08) which is larger than legacy `winner` (0.056) for better visibility. Body text uses `body` (0.055) which is smaller than legacy `body` (0.08).

### Spacing (SUMMARY_TOKENS → TOKENS)
| Legacy | New | Value |
|--------|-----|-------|
| `spacingScale.topInset (0.05)` | `TOKENS.spacing.pageTop` | 0.05 |
| `spacingScale.bottomInset (0.06)` | `TOKENS.spacing.pageBottom` | 0.06 |
| `spacingScale.sectionGap (0.02)` | `TOKENS.spacing.sectionGap` | 0.02 |
| `spacingScale.sideInset (0.07)` | `TOKENS.spacing.pageSide` | 0.07 |
| `spacingScale.roundSideInset (0.12)` | `TOKENS.spacing.pageSideRound` | 0.12 |

---

## Estimated Effort

| Subtask | Estimated Time | Complexity |
|---------|----------------|------------|
| 49.1 - Remove legacy dependencies | 15 min | Low |
| 49.2 - Add imports, define schema | 30 min | Medium |
| 49.3 - Refactor header section | 30 min | Medium |
| 49.4 - Refactor body with scroll list | 45 min | High |
| 49.5 - Refactor footer, token integration | 20 min | Low |
| Testing & QA | 30 min | Medium |
| **Total** | **2.8 hours** | |

---

## Notes

- The SCROLL_LIST widget is the key complexity - it requires pixel coordinates that must be derived from the resolved layout
- The layout engine's `roundSafeInset: true` feature replaces the manual `calculateRoundSafeSectionSideInset()` function
- The `createCard()` factory uses `TOKENS.sizing.cardRadiusRatio` for rounded corners automatically
- Winner text typography change from 0.056 to 0.08 (bodyLarge) improves readability
- Card background color change from pure black (0x000000) to dark gray (0x1a1c20) adds subtle depth
- The Page's `getScreenMetrics()` method is removed since we now import `getScreenMetrics()` from screen-utils.js
- Gesture handlers and match persistence logic are unchanged - only rendering is refactored
