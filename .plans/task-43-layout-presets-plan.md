# Task #43: Layout Presets Utility - Implementation Plan

## Overview
Create `utils/layout-presets.js` containing factory functions that return layout schemas for common page patterns following a strict 3-section structure (header, body, footer) with consistent spacing and round-safe inset handling.

## Dependencies
- `utils/design-tokens.js` - TOKENS.spacing values
- `utils/layout-engine.js` - Schema format compatibility with resolveLayout()
- `utils/screen-utils.js` - Helper functions (indirectly via layout-engine)

## Target File
`utils/layout-presets.js`

## API Design

### 1. createStandardPageLayout(options)

**Purpose:** Returns a layout schema with header, body, and footer sections.

**Parameters:**
```javascript
{
  hasHeader: true,           // Include header section
  hasFooter: true,           // Include footer section
  headerHeight: undefined,   // Override header height (default: TOKENS.typography.pageTitle * 2)
  footerHeight: undefined    // Override footer height (default: TOKENS.typography.button * 2)
}
```

**Schema Output:**
```javascript
{
  sections: {
    header: {
      top: 'pageTop',              // Uses TOKENS spacing ratio
      height: headerHeight,        // Calculated from options or default
      roundSafeInset: true
    },
    body: {
      after: 'header',             // Positioned after header
      gap: 'headerToContent',      // Uses TOKENS spacing ratio
      height: 'fill',              // Fills remaining space
      roundSafeInset: true
    },
    footer: {
      bottom: 'footerBottom',      // Uses TOKENS spacing ratio
      height: footerHeight,        // Calculated from options or default
      roundSafeInset: false        // Icon centering handles positioning
    }
  }
}
```

### 2. createPageWithFooterButton(options)

**Purpose:** Returns standard layout with an icon button in the footer.

**Parameters:**
```javascript
{
  icon: 'home-icon.png',     // Icon for footer button
  onClick: undefined,        // Click handler callback
  // ...inherites all createStandardPageLayout options
}
```

**Schema Output:**
- Extends createStandardPageLayout schema
- Adds footer button element definition
- Button centered in footer area

### 3. createTwoColumnLayout(parentSection)

**Purpose:** Returns a schema with leftColumn and rightColumn sections nested under parentSection.

**Parameters:**
```javascript
parentSection: string       // Section name to nest columns under (e.g., 'body')
```

**Schema Output:**
```javascript
{
  sections: {
    leftColumn: {
      section: parentSection,    // Nested under parent
      width: '50%',
      height: '100%',
      roundSafeInset: true
    },
    rightColumn: {
      section: parentSection,    // Nested under parent
      width: '50%',
      height: '100%',
      roundSafeInset: true
    }
  }
}
```

## Implementation Steps

### Step 1: File Creation & Imports
- Create `utils/layout-presets.js`
- Import TOKENS from `./design-tokens.js`
- Set up JSDoc documentation

### Step 2: Helper Functions
- Create `getPixelValue(ratio, dimension)` - Convert ratio to pixels
- Create default options merger

### Step 3: createStandardPageLayout Implementation
- Handle hasHeader/hasFooter flags
- Calculate header/footer heights from TOKENS
- Build sections object with proper schema format
- Handle conditional sections (no header/footer)

### Step 4: createPageWithFooterButton Implementation
- Extend createStandardPageLayout
- Add footer button element
- Center button in footer

### Step 5: createTwoColumnLayout Implementation
- Create left/right column sections
- Set 50% width for each
- Nest under specified parent section

### Step 6: Export & Testing
- Export all factory functions
- Verify schema compatibility with layout-engine.resolveLayout()

## Token Integration

All spacing values must reference TOKENS.spacing:
- `pageTop` (0.05) - Top margin ratio
- `pageBottom` (0.06) - Bottom margin ratio  
- `headerToContent` (0.06) - Gap between header and content
- `footerBottom` (0.07) - Footer bottom position

Typography tokens for heights:
- `pageTitle` (0.0825) - For header height calculation
- `button` (0.05) - For footer height calculation

## Schema Compatibility

Schemas must be consumable by `layout-engine.resolveLayout()`:
- Sections use: top, bottom, after, gap, height, roundSafeInset
- Height values: number (px), percentage ('10%'), or 'fill'
- Position references: 'sectionName.property' (e.g., 'header.bottom')

## Edge Cases

1. **No header** - Body starts from pageTop
2. **No footer** - Body extends to pageBottom
3. **No header & no footer** - Body fills entire page
4. **Round screens** - roundSafeInset handles bezel safe areas

## File Structure

```
utils/
├── layout-presets.js      # NEW FILE
├── design-tokens.js       # Existing - TOKENS source
├── layout-engine.js       # Existing - Schema consumer
└── screen-utils.js        # Existing - Helper utilities
```

## Acceptance Criteria

- [ ] Factory functions return valid schema objects
- [ ] All spacing uses TOKENS values
- [ ] roundSafeInset correctly set for body (true) and footer (false)
- [ ] Schemas resolve without errors in layout-engine
- [ ] Two-column layout creates 50/50 split
- [ ] Footer button is centered in footer area
- [ ] All functions have JSDoc documentation

## Risk Mitigation

1. **Schema format mismatch** - Verify against layout-engine tests
2. **Token access errors** - Use safe access with defaults
3. **Round screen issues** - Test with round screen metrics
