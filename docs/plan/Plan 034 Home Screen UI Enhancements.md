# Task Analysis
- **Main objective**: Enhance the Home Screen UI for the Padel Buddy Zepp OS app with button modifications, new settings navigation, and improved responsive design
- **Identified dependencies**: 
  - Zepp OS v1.0 API compatibility
  - Existing HOME_TOKENS design system in page/index.js
  - Existing test suite in tests/home-screen.test.js
  - Settings page at setting/index.js
- **System impact**: 
  - UI changes to home screen (page/index.js)
  - Test updates required (tests/home-screen.test.js)
  - No impact on game logic or data storage

## Chosen Approach

### Proposed Solution
A minimal, clean approach that:
1. Removes unused buttons (Previous Matches, Clear App Data) to simplify the UI
2. Enlarges and equalizes the two primary action buttons for better touch targets
3. Adds a settings gear icon button using the existing widget patterns
4. Enhances design tokens for consistent spacing and sizing across screen types

### Justification for Simplicity
- **Reuses existing patterns**: Leverages the established HOME_TOKENS design system
- **Minimal new code**: Uses existing widget creation patterns already proven in the codebase
- **Low risk**: Changes are isolated to the home screen rendering logic
- **Test-aware**: Tests will need updating but the pattern is already established

### Components to Be Modified/Created

| Component | Action | File |
|-----------|--------|------|
| Home Screen | Modify renderHomeScreen() | page/index.js |
| Design Tokens | Add new spacing/icon tokens | page/index.js |
| Tests | Update button label assertions | tests/home-screen.test.js |
| Gear Icon Asset | Create new icon file | assets/gtr-3/settings.png, assets/gts-3/settings.png |

## Implementation Steps

### Step 1: Analyze Current Layout and Define New Button Dimensions
- Current button heights: startButtonHeight = height * 0.14, secondaryButtonHeight = height * 0.12
- New uniform button height: height * 0.16 (increased for better touch target)
- Current button width: width * 0.62
- New button width: width * 0.70 (slightly wider for better proportions)
- Gap between buttons: height * 0.04 (reduced from 0.05)

### Step 2: Update Design Tokens (HOME_TOKENS)
Add new tokens for:
- Icon button sizing and positioning
- Updated button dimensions
- New spacing between main buttons and settings icon

```javascript
// New tokens to add:
buttonSize: {
  height: 0.16,      // 16% of screen height (larger touch target)
  width: 0.70,       // 70% of screen width  
  radiusRatio: 0.5,  // half of height for rounded corners
  gap: 0.04          // gap between buttons
},
settingsIcon: {
  size: 48,          // absolute pixel size for icon
  xOffset: -30       // right offset from center
}
```

### Step 3: Modify renderHomeScreen() Function
Remove:
- Previous Matches button (lines ~417-432 in current code)
- Clear App Data button (lines ~439-456 in current code)

Modify:
- Start New Game button: set h to new uniform height, update y position
- Resume Game button: set h to same uniform height, update y position, show only if hasSavedGame

Add:
- Settings icon button positioned after the main buttons (or below them)
- Navigate to 'setting/index' on click

### Step 4: Add Settings Navigation Handler
Add a new method or use inline navigation:
```javascript
navigateToSettings() {
  if (typeof hmApp === 'undefined' || typeof hmApp.gotoPage !== 'function') {
    return false
  }
  try {
    hmApp.gotoPage({ url: 'setting/index' })
    return true
  } catch {
    return false
  }
}
```

### Step 5: Create Gear Icon Assets
Create simple gear icon PNG files:
- assets/gtr-3/settings.png (for Round screens, 48x48px)
- assets/gts-3/settings.png (for Square screens, 48x48px)

Or use a simpler approach: create a circular button with a text symbol

### Step 6: Update Tests
Modify tests/home-screen.test.js:
- Update getVisibleButtonLabels assertions to remove 'home.previousMatches' and 'home.clearData'
- Add test for settings icon button presence
- Add test for settings navigation

### Step 7: Verify Screen Adaptation
Test calculations for both screen types:
- **gtr-3 (Round)**: width=454, height=454
  - Button height: 454 * 0.16 = ~72px
  - Button width: 454 * 0.70 = ~317px
- **gts-3 (Square)**: width=390, height=450
  - Button height: 450 * 0.16 = ~72px
  - Button width: 390 * 0.70 = ~273px

## Validation

### Pre-Implementation Checks
- [ ] Verify current page/index.js renders correctly on simulator
- [ ] Confirm existing tests pass before modifications
- [ ] Document current button positions for reference

### During Implementation Checks
- [ ] Design tokens follow existing HOME_TOKENS structure
- [ ] Button dimensions use responsive units (percentage of screen)
- [ ] Settings icon click handler correctly navigates to settings page

### Post-Implementation Verification
- [ ] Run `npm run test` - all tests pass
- [ ] Verify button layout in Zepp OS Simulator (gtr-3 and gts-3)
- [ ] Confirm Start New Game button starts new match flow
- [ ] Confirm Resume Game button (when active game exists) resumes correctly
- [ ] Confirm Settings button navigates to settings page
- [ ] Verify no regression: Previous Matches and Clear Data buttons are removed

## Screen Adaptation Considerations

### Round vs Square Screen Layout

The existing `getScreenMetrics()` function already handles device detection:
```javascript
getScreenMetrics() {
  const { width, height } = hmSetting.getDeviceInfo()
  return { width, height }
}
```

**Layout Strategy:**
1. Use percentage-based dimensions for all UI elements
2. Center buttons horizontally using: `x = Math.round((width - buttonWidth) / 2)`
3. Stack buttons vertically with consistent gaps
4. Position settings icon at bottom-right or centered below main buttons

**Recommended Layout for Round Screens:**
- Logo at top (10% from top)
- Title below logo
- Start New Game button at ~35% from top
- Resume Game button below (if active game)
- Settings icon small, positioned at bottom center

**Recommended Layout for Square Screens:**
- Same vertical rhythm as round
- Slightly narrower buttons relative to width (already handled by percentage)

## Design Token Usage Guidelines

### Existing Pattern (to follow)
```javascript
const HOME_TOKENS = Object.freeze({
  colors: { ... },
  fontScale: { ... },
  spacingScale: { ... }
})
```

### New Tokens Structure
```javascript
const HOME_TOKENS = Object.freeze({
  colors: {
    background: 0x000000,
    primaryButton: 0x1eb98c,
    // ... existing colors
  },
  fontScale: {
    button: 0.055,
    // ... existing scales
  },
  spacingScale: {
    contentTop: 0.10,
    // ... existing spacing
  },
  // NEW: Button sizing tokens
  buttonSize: {
    height: 0.16,
    width: 0.70,
    gap: 0.04
  },
  // NEW: Icon sizing
  iconSize: {
    settings: 48
  }
})
```

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Icon asset not found | Use fallback: create circular button with TEXT widget showing "⚙" |
| Tests failing | Update assertions to match new button layout |
| Screen overflow on small screens | Use percentage-based calculations, test on both targets |
| Navigation not working | Add null checks for hmApp and gotoPage |

## Rollback Plan
If issues arise:
1. Keep backup of original page/index.js
2. Revert to using original button dimensions if touch targets are too large
3. If icon approach fails, use text-based settings button instead
4. Tests can be reverted to original assertions if UI changes are rolled back
