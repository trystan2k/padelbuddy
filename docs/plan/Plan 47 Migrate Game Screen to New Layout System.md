# Plan 47: Migrate Game Screen to New Layout System

**Task ID**: 47  
**Priority**: High  
**Dependencies**: 40, 41, 42, 44 (all completed)  
**Target File**: `page/game.js`

---

## Task Analysis

### Main Objective
Refactor `page/game.js` to use the new declarative layout system, replacing `GAME_TOKENS` and complex inline position calculations with design tokens, layout engine resolution, and reusable UI components.

### Identified Dependencies
- `utils/design-tokens.js` - TOKENS object with colors, typography, spacing, sizing
- `utils/screen-utils.js` - `getScreenMetrics()`, `getRoundSafeInset()`, `getRoundSafeSectionInset()`
- `utils/layout-engine.js` - `resolveLayout()` with sections and elements schema
- `utils/ui-components.js` - `createBackground()`, `createText()`, `createButton()`, `createDivider()`

### System Impact
- **High complexity**: The game screen is the most complex page with ~305 lines in `renderGameScreen()`
- **Two-column layout**: Team A (left) and Team B (right) score areas
- **Dynamic state handling**: Finished state shows winner message instead of score buttons
- **Round screen geometry**: Header requires safe inset calculations
- **Event handlers**: Score increment/decrement, home navigation must be preserved

---

## Chosen Approach

### Proposed Solution
**Full Declarative Schema Migration** - Define a complete `GAME_LAYOUT` schema with sections and elements, using the layout engine for coordinate resolution. Apply the established pattern from `page/index.js` and `page/setup.js`.

### Justification for Simplicity
1. **Consistency**: Aligns with already-migrated pages (index.js, setup.js)
2. **Maintainability**: Declarative schema is easier to understand and modify
3. **Separation of Concerns**: Layout logic separated from rendering logic
4. **Reusability**: Uses established ui-components factories

### Components to be Modified/Created
| Component | Action | Description |
|-----------|--------|-------------|
| `GAME_TOKENS` | DELETE | Remove legacy constant (lines 14-44) |
| `calculateRoundSafeSideInset()` | DELETE | Replaced by `getRoundSafeInset()` from screen-utils |
| `calculateRoundSafeSectionSideInset()` | DELETE | Replaced by `getRoundSafeSectionInset()` from screen-utils |
| Imports | MODIFY | Add imports from new utility modules |
| `GAME_LAYOUT` | CREATE | Define declarative layout schema |
| `renderGameScreen()` | REFACTOR | Use `resolveLayout()` and ui-components factories |

---

## Implementation Steps

### Step 1: Remove Legacy Dependencies and Add New Imports (Subtask 47.1)

**Scope**: Clean up legacy code and establish new module imports

**Actions**:
1. Delete `GAME_TOKENS` constant (lines 14-44)
2. Delete `calculateRoundSafeSideInset()` function (lines 76-92)
3. Delete `calculateRoundSafeSectionSideInset()` function (lines 94-114)
4. Add new imports at top of file:
   ```javascript
   import { TOKENS, getFontSize, getColor, toPercentage } from '../utils/design-tokens.js'
   import { resolveLayout } from '../utils/layout-engine.js'
   import { getScreenMetrics, getRoundSafeSectionInset } from '../utils/screen-utils.js'
   import {
     createBackground,
     createText,
     createButton,
     createDivider
   } from '../utils/ui-components.js'
   ```

**Validation**:
- [ ] `GAME_TOKENS` removed - search for references should return none
- [ ] `calculateRoundSafeSideInset` removed - search for references should return none
- [ ] `calculateRoundSafeSectionSideInset` removed - search for references should return none
- [ ] New imports added without syntax errors

**Rollback**: If import errors occur, verify utils modules export expected functions

---

### Step 2: Define GAME_LAYOUT Declarative Schema (Subtask 47.2)

**Scope**: Create the declarative layout schema for the game screen

**Schema Structure**:
```javascript
const GAME_LAYOUT = {
  sections: {
    // Header: SETS and GAMES rows
    header: {
      top: toPercentage(TOKENS.spacing.headerTop), // '4%'
      height: '11%', // Two rows of ~5.5% each
      roundSafeInset: true // Enable round screen safe insets
    },
    // Score area: fills between header and footer
    scoreArea: {
      height: 'fill',
      after: 'header',
      gap: toPercentage(TOKENS.spacing.headerToContent), // '6%'
      roundSafeInset: false
    },
    // Footer: home button
    footer: {
      bottom: toPercentage(TOKENS.spacing.footerBottom), // '7%'
      height: '15%',
      roundSafeInset: false
    }
  },
  elements: {
    // Header elements
    setsLabel: {
      section: 'header',
      x: '5%',
      y: '0%',
      width: '42%',
      height: '50%',
      align: 'right',
      _meta: { type: 'text', style: 'body', color: 'mutedText', textKey: 'game.setsLabel' }
    },
    setsValue: {
      section: 'header',
      x: '48%',
      y: '0%',
      width: '52%',
      height: '50%',
      align: 'left',
      _meta: { type: 'text', style: 'body', color: 'accent', textKey: 'setsValue' }
    },
    gamesLabel: {
      section: 'header',
      x: '5%',
      y: '50%',
      width: '42%',
      height: '50%',
      align: 'right',
      _meta: { type: 'text', style: 'body', color: 'mutedText', textKey: 'game.gamesLabel' }
    },
    gamesValue: {
      section: 'header',
      x: '48%',
      y: '50%',
      width: '52%',
      height: '50%',
      align: 'left',
      _meta: { type: 'text', style: 'body', color: 'accent', textKey: 'gamesValue' }
    },
    
    // Score area elements (two-column layout)
    teamALabel: {
      section: 'scoreArea',
      x: '0%',
      y: '0%',
      width: '50%',
      height: '18%',
      align: 'center',
      _meta: { type: 'text', style: 'body', color: 'mutedText', text: 'A' }
    },
    teamBLabel: {
      section: 'scoreArea',
      x: '50%',
      y: '0%',
      width: '50%',
      height: '18%',
      align: 'center',
      _meta: { type: 'text', style: 'body', color: 'mutedText', text: 'B' }
    },
    teamAScore: {
      section: 'scoreArea',
      x: '0%',
      y: '18%',
      width: '50%',
      height: '50%',
      align: 'center',
      _meta: { type: 'scoreButton', team: 'teamA' }
    },
    teamBScore: {
      section: 'scoreArea',
      x: '50%',
      y: '18%',
      width: '50%',
      height: '50%',
      align: 'center',
      _meta: { type: 'scoreButton', team: 'teamB' }
    },
    divider: {
      section: 'scoreArea',
      x: 'center',
      y: '10%',
      width: 1,
      height: '75%',
      _meta: { type: 'divider', orientation: 'vertical' }
    },
    teamAMinus: {
      section: 'scoreArea',
      x: 'center',
      y: '76%',
      width: '18%',
      height: '24%',
      align: 'center',
      _meta: { type: 'minusButton', team: 'teamA', offsetX: '-50%' }
    },
    teamBMinus: {
      section: 'scoreArea',
      x: 'center',
      y: '76%',
      width: '18%',
      height: '24%',
      align: 'center',
      _meta: { type: 'minusButton', team: 'teamB', offsetX: '+50%' }
    },
    
    // Finished state elements (conditional)
    finishedLabel: {
      section: 'scoreArea',
      x: 'center',
      y: '0%',
      width: '100%',
      height: '25%',
      align: 'center',
      _meta: { type: 'text', style: 'body', color: 'mutedText', textKey: 'game.finishedLabel', conditional: 'isMatchFinished' }
    },
    finishedValue: {
      section: 'scoreArea',
      x: 'center',
      y: '25%',
      width: '100%',
      height: '75%',
      align: 'center',
      _meta: { type: 'text', style: 'scoreDisplay', color: 'accent', textKey: 'finishedMessage', conditional: 'isMatchFinished' }
    },
    
    // Footer elements
    homeButton: {
      section: 'footer',
      x: 'center',
      y: 'center',
      width: TOKENS.sizing.iconLarge,
      height: TOKENS.sizing.iconLarge,
      align: 'center',
      _meta: { type: 'iconButton', icon: 'home-icon.png', onClick: 'handleBackToHome' }
    }
  }
}
```

**Key Design Decisions**:
1. **Two-column layout**: Use percentage-based x positions (0%, 50%) for left/right columns
2. **Score buttons**: Large tappable area (50% height) centered in score area
3. **Divider**: Vertical divider at center, spanning score area
4. **Conditional elements**: Use `_meta.conditional` flag for finished state elements
5. **Round safe insets**: Only header section needs `roundSafeInset: true`

**Validation**:
- [ ] Schema compiles without syntax errors
- [ ] All elements reference valid sections
- [ ] Percentage values are strings with '%' suffix
- [ ] Pixel values are numbers (e.g., `width: 1` for divider)

---

### Step 3: Refactor renderGameScreen() with Layout Resolution (Subtask 47.3)

**Scope**: Replace inline calculations with layout engine resolution

**New renderGameScreen() Structure**:
```javascript
renderGameScreen() {
  if (typeof hmUI === 'undefined') {
    return
  }

  if (!this.isSessionAccessGranted) {
    return
  }

  const matchState = this.getRuntimeMatchState()
  const viewModel = createScoreViewModel(matchState, {
    persistedMatchState: this.persistedSessionState
  })
  const isMatchFinished = viewModel.status === 'finished'

  // Get screen metrics and resolve layout
  const metrics = getScreenMetrics()
  const layout = resolveLayout(GAME_LAYOUT, metrics)

  this.clearWidgets()

  // Background
  const bg = createBackground()
  this.createWidget(bg.widgetType, bg.config)

  // Render header elements
  this.renderHeaderElements(layout, viewModel)
  
  // Render score area (active or finished state)
  if (isMatchFinished) {
    this.renderFinishedState(layout, viewModel)
  } else {
    this.renderActiveState(layout, viewModel)
  }
  
  // Render footer
  this.renderFooterElements(layout)
}
```

**Helper Methods to Create**:
1. `renderHeaderElements(layout, viewModel)` - Renders SETS and GAMES rows
2. `renderActiveState(layout, viewModel)` - Renders team labels, scores, divider, minus buttons
3. `renderFinishedState(layout, viewModel)` - Renders finished label and winner message
4. `renderFooterElements(layout)` - Renders home button

**Validation**:
- [ ] `resolveLayout()` returns valid sections and elements
- [ ] Background renders correctly
- [ ] No inline position calculations remain

---

### Step 4: Implement Two-Column Score Area Layout (Subtask 47.4)

**Scope**: Implement the two-column layout for team scores with proper alignment

**renderActiveState() Implementation**:
```javascript
renderActiveState(layout, viewModel) {
  const { width } = getScreenMetrics()
  const scoreArea = layout.sections.scoreArea
  
  // Team labels
  this.renderTeamLabel(layout.elements.teamALabel, 'A')
  this.renderTeamLabel(layout.elements.teamBLabel, 'B')
  
  // Score buttons (tappable)
  this.renderScoreButton(layout.elements.teamAScore, viewModel.teamA.points, 'teamA')
  this.renderScoreButton(layout.elements.teamBScore, viewModel.teamB.points, 'teamB')
  
  // Divider
  this.renderDivider(layout.elements.divider, scoreArea)
  
  // Minus buttons
  this.renderMinusButton(layout.elements.teamAMinus, 'teamA', scoreArea, width)
  this.renderMinusButton(layout.elements.teamBMinus, 'teamB', scoreArea, width)
}
```

**Score Button Implementation**:
```javascript
renderScoreButton(element, points, team) {
  if (!element) return
  
  const scoreBtn = createButton({
    x: element.x,
    y: element.y,
    w: element.w,
    h: element.h,
    variant: 'secondary',
    text: String(points),
    onClick: () => this.handleAddPointForTeam(team),
    radius: 0 // Flat score buttons
  })
  
  // Override text size to use scoreDisplay typography
  scoreBtn.config.text_size = getFontSize('scoreDisplay')
  scoreBtn.config.color = TOKENS.colors.text
  
  this.createWidget(scoreBtn.widgetType, scoreBtn.config)
}
```

**Minus Button Implementation**:
```javascript
renderMinusButton(element, team, scoreArea, screenWidth) {
  if (!element) return
  
  const halfWidth = Math.round(screenWidth / 2)
  const buttonWidth = Math.round(screenWidth * 0.18)
  const offsetX = team === 'teamA' ? 0 : halfWidth
  const buttonX = offsetX + Math.round((halfWidth - buttonWidth) / 2)
  
  const minusBtn = createButton({
    x: buttonX,
    y: element.y,
    w: buttonWidth,
    h: element.h,
    variant: 'secondary',
    text: '−',
    onClick: () => this.handleRemovePointForTeam(team)
  })
  
  // Override for minus button styling
  minusBtn.config.text_size = getFontSize('buttonLarge')
  minusBtn.config.color = TOKENS.colors.danger
  
  this.createWidget(minusBtn.widgetType, minusBtn.config)
}
```

**Validation**:
- [ ] Team A elements positioned in left column (x: 0-50%)
- [ ] Team B elements positioned in right column (x: 50-100%)
- [ ] Divider centered between columns
- [ ] Score buttons use `scoreDisplay` typography
- [ ] Click handlers fire correctly for both teams

---

### Step 5: Handle Round Screen Geometry, Dynamic State, and Button Events (Subtask 47.5)

**Scope**: Ensure round screen support, finished state handling, and event preservation

**Round Screen Handling**:
- Header section uses `roundSafeInset: true` in schema
- Layout engine automatically applies `getRoundSafeSectionInset()` for round screens
- No manual inset calculations needed

**Finished State Rendering**:
```javascript
renderFinishedState(layout, viewModel) {
  const finishedLabelEl = layout.elements.finishedLabel
  const finishedValueEl = layout.elements.finishedValue
  
  // Finished label
  if (finishedLabelEl) {
    const labelConfig = createText({
      text: gettext('game.finishedLabel'),
      style: 'body',
      x: finishedLabelEl.x,
      y: finishedLabelEl.y,
      w: finishedLabelEl.w,
      h: finishedLabelEl.h,
      color: TOKENS.colors.mutedText
    })
    this.createWidget(labelConfig.widgetType, labelConfig.config)
  }
  
  // Winner message
  if (finishedValueEl) {
    const valueConfig = createText({
      text: getFinishedMessage(viewModel),
      style: 'scoreDisplay',
      x: finishedValueEl.x,
      y: finishedValueEl.y,
      w: finishedValueEl.w,
      h: finishedValueEl.h,
      color: TOKENS.colors.accent
    })
    this.createWidget(valueConfig.widgetType, valueConfig.config)
  }
}
```

**Event Handler Preservation**:
| Handler | Action | Status |
|---------|--------|--------|
| `handleAddPointForTeam('teamA')` | Team A score tap | Preserve |
| `handleAddPointForTeam('teamB')` | Team B score tap | Preserve |
| `handleRemovePointForTeam('teamA')` | Team A minus tap | Preserve |
| `handleRemovePointForTeam('teamB')` | Team B minus tap | Preserve |
| `handleBackToHome()` | Home icon tap | Preserve |

**Validation**:
- [ ] Round screen: header not cut off, elements within safe area
- [ ] Square screen: layout fills space appropriately
- [ ] Finished state shows winner message centered
- [ ] All click handlers fire correctly
- [ ] State persists when navigating away/back

---

## Validation

### Success Criteria
1. **Build passes**: `npm run complete-check` returns no errors
2. **Visual parity**: Round and square screen layouts render without clipping
3. **Functional parity**: All existing functionality works identically
4. **Typography**: Score uses `scoreDisplay` font via `getFontSize('scoreDisplay')`
5. **State persistence**: Navigating away/back preserves score
6. **No regressions**: Existing game functionality unaffected

### Checkpoints

#### Pre-Implementation
- [ ] All dependency tasks (40, 41, 42, 44) confirmed complete
- [ ] New utility modules exist and export expected functions
- [ ] Reference pages (index.js, setup.js) use expected pattern

#### During Implementation
- [ ] After Step 1: File compiles with new imports, no GAME_TOKENS references
- [ ] After Step 2: Schema defined, no syntax errors
- [ ] After Step 3: renderGameScreen() uses resolveLayout()
- [ ] After Step 4: Two-column layout renders correctly
- [ ] After Step 5: All states and events work correctly

#### Post-Implementation
- [ ] `npm run complete-check` passes
- [ ] Visual QA on round screen (GTR 3 simulator)
- [ ] Visual QA on square screen (GTS 3 simulator)
- [ ] Score increment/decrement works
- [ ] Home navigation works
- [ ] Finished state displays correctly
- [ ] State persists across navigation

### Test Commands
```bash
# Build verification
npm run complete-check

# Manual testing checklist:
# 1. Launch app on round screen simulator
# 2. Start new match
# 3. Tap Team A score - increments
# 4. Tap Team A minus - decrements
# 5. Tap Team B score - increments
# 6. Tap Team B minus - decrements
# 7. Complete match to finished state
# 8. Verify winner message displays
# 9. Tap home icon - returns to home
# 10. Resume match - state preserved
# 11. Repeat on square screen simulator
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Two-column layout misalignment | Medium | High | Use percentage-based positioning, test on both screen types |
| Round screen header clipping | Low | Medium | Schema uses `roundSafeInset: true` for header section |
| Event handler binding issues | Low | High | Preserve exact handler references, test all interactions |
| Typography mismatch | Low | Low | Use `getFontSize('scoreDisplay')` explicitly |
| State loss during refactor | Low | Critical | Don't modify state management, only rendering |

---

## Estimated Effort

| Subtask | Estimated Time | Complexity |
|---------|----------------|------------|
| 47.1 - Remove legacy, add imports | 15 min | Low |
| 47.2 - Define GAME_LAYOUT schema | 45 min | Medium |
| 47.3 - Refactor renderGameScreen() | 30 min | Medium |
| 47.4 - Implement two-column layout | 45 min | High |
| 47.5 - Handle edge cases | 30 min | Medium |
| **Total** | **2.75 hours** | |

---

## Notes

- This is the most complex page migration in the layout system refactor
- The two-column layout pattern established here can be reused for similar layouts
- Finished state handling demonstrates conditional rendering in the declarative schema
- The `createTwoColumnLayout()` function mentioned in task context doesn't exist in layout-engine.js; using element-based two-column positioning instead
