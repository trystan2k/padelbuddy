# UI System Documentation

> **Last Updated:** 2026-03-05  
> **Target Audience:** New developers joining the Padel Buddy project  
> **Time to Productivity:** ~30 minutes

---

## Table of Contents

- [Overview](#overview)
  - [Purpose and Scope](#purpose-and-scope)
  - [Architecture](#architecture)
  - [Quick Start Guide](#quick-start-guide)
  - [Round Screen Handling](#round-screen-handling)
- [Design Tokens](#design-tokens)
  - [Color Tokens](#color-tokens)
  - [Typography Tokens](#typography-tokens)
  - [Spacing Tokens](#spacing-tokens)
  - [Sizing Tokens](#sizing-tokens)
  - [Helper Functions](#helper-functions)
- [Layout System](#layout-system)
  - [Concepts](#concepts)
  - [Schema Structure](#schema-structure)
  - [Positioning Modes](#positioning-modes)
  - [Layout Presets](#layout-presets)
  - [Round Screen Adaptation](#round-screen-adaptation)
- [UI Components](#ui-components)
  - [createBackground()](#createbackground)
  - [createText()](#createtext)
  - [createButton()](#createbutton)
  - [createDivider()](#createdivider)
- [Screen Utilities](#screen-utilities)
  - [getScreenMetrics()](#getscreenmetrics)
  - [getRoundSafeSectionInset()](#getroundsafesectioninset)
  - [Utility Functions](#utility-functions)
- [Usage Guidelines](#usage-guidelines)
  - [Best Practices](#best-practices)
  - [Performance Tips](#performance-tips)
  - [Common Pitfalls](#common-pitfalls)
- [Examples](#examples)
  - [Example 1: Simple Page with Header and Footer](#example-1-simple-page-with-header-and-footer)
  - [Example 2: Form-like Layout with Options](#example-2-form-like-layout-with-options)
  - [Example 3: Settings Page with Scroll List](#example-3-settings-page-with-scroll-list)
  - [Example 4: Two-Column Layout](#example-4-two-column-layout)
- [Troubleshooting](#troubleshooting)

---

## Overview

### Purpose and Scope

This document provides comprehensive guidance on using the Padel Buddy app's UI system. The UI system consists of:

- **Design Tokens** - Centralized design values for colors, typography, spacing, and sizing
- **Layout Engine** - Declarative layout resolution for adaptive positioning
- **UI Components** - Reusable widget factory functions
- **Screen Utilities** - Helper functions for screen measurement and adaptation

The system is designed to:
- Ensure visual consistency across the app
- Support both square and round watch screens
- Enable rapid UI development with reusable components
- Make layouts maintainable and easy to modify

### Architecture

The UI system follows a layered architecture:

```
┌─────────────────────────────────────────┐
│         Page Implementation             │  ← Your code
├─────────────────────────────────────────┤
│  Layout Engine (resolveLayout)          │  ← Declarative positioning
├─────────────────────────────────────────┤
│  UI Components (createButton, etc.)     │  ← Widget factories
├─────────────────────────────────────────┤
│  Design Tokens (TOKENS)                 │  ← Design values
├─────────────────────────────────────────┤
│  Screen Utils (getScreenMetrics, etc.)  │  ← Screen adaptation
└─────────────────────────────────────────┘
```

**Data Flow:**
1. Screen Utils detect device dimensions and shape (square/round)
2. Design Tokens provide consistent design values
3. Layout Engine resolves declarative schemas to pixel coordinates
4. UI Components create widget configurations using tokens
5. Page implementations render widgets using resolved layouts

### Quick Start Guide

Here's a minimal working example that creates a simple page:

```javascript
import { createStandardPageLayout } from '../utils/layout-presets.js'
import { resolveLayout } from '../utils/layout-engine.js'
import { createBackground, createText } from '../utils/ui-components.js'
import { getScreenMetrics } from '../utils/screen-utils.js'

// 1. Define layout schema
const schema = createStandardPageLayout({
  hasHeader: true,
  hasFooter: false
})

// Add a title element to the header
schema.elements.title = {
  section: 'header',
  x: 'center',
  y: '30%',
  width: '100%',
  height: '50%',
  align: 'center',
  _meta: {
    type: 'text',
    style: 'pageTitle',
    text: 'My Page Title'
  }
}

// 2. Resolve layout to pixel coordinates
const metrics = getScreenMetrics()
const layout = resolveLayout(schema, metrics)

// 3. Create widgets
const bg = createBackground()
hmUI.createWidget(bg.widgetType, bg.config)

const titleEl = layout.elements.title
const titleConfig = createText({
  text: 'My Page Title',
  style: 'pageTitle',
  x: titleEl.x,
  y: titleEl.y,
  w: titleEl.w,
  h: titleEl.h
})
hmUI.createWidget(titleConfig.widgetType, titleConfig.config)
```

**That's it!** This creates a page with a background and centered title that adapts to any screen size.

### Round Screen Handling

The UI system automatically handles round screens (e.g., GTR 3) through:

1. **Detection** - `getScreenMetrics()` detects round screens
2. **Safe Insets** - Layout engine applies `roundSafeInset` to prevent content clipping
3. **Responsive Typography** - Font sizes scale based on screen width

**How it works:**
- Round screens have circular display areas
- Content near edges gets clipped on round screens
- The layout engine calculates safe inset values using circle geometry
- When `roundSafeInset: true`, sections are automatically inset from edges

**Example:**
```javascript
// On a 466x466 round screen, a section at y=0 with roundSafeInset=true
// will automatically have side insets calculated to prevent clipping

const schema = {
  sections: {
    header: {
      top: 0,
      height: '15%',
      roundSafeInset: true  // ← Auto-inset on round screens
    }
  }
}
```

---

## Design Tokens

Design tokens are centralized design values that ensure consistency. All tokens are defined in `utils/design-tokens.js`.

### Color Tokens

| Token | Hex Value | Use Case |
|-------|-----------|----------|
| `background` | `0x000000` | Screen background |
| `text` | `0xffffff` | Primary text |
| `mutedText` | `0x888888` | Secondary/hint text |
| `accent` | `0x1eb98c` | Brand accent color, primary buttons |
| `danger` | `0xff6d78` | Error messages, destructive actions |
| `primaryButton` | `0x1eb98c` | Primary button background |
| `primaryButtonText` | `0x000000` | Primary button text |
| `secondaryButton` | `0x24262b` | Secondary button background |
| `cardBackground` | `0x1a1c20` | Card/container backgrounds |
| `disabled` | `0x444444` | Disabled elements |
| `divider` | `0x333333` | Divider lines |

**Usage Example:**
```javascript
import { getColor, TOKENS } from '../utils/design-tokens.js'

// Using helper function (recommended)
const accentColor = getColor('colors.accent')  // Returns 0x1eb98c

// Direct access
const bgColor = TOKENS.colors.background  // Returns 0x000000
```

### Typography Tokens

Typography tokens are **ratios** that multiply by screen width to calculate font sizes.

| Token | Ratio | Calculation | Example (390px width) |
|-------|-------|-------------|----------------------|
| `pageTitle` | `0.0825` | `width × 0.0825` | 32px |
| `sectionTitle` | `0.068` | `width × 0.068` | 27px |
| `body` | `0.055` | `width × 0.055` | 21px |
| `bodyLarge` | `0.08` | `width × 0.08` | 31px |
| `score` | `0.15` | `width × 0.15` | 59px |
| `scoreDisplay` | `0.28` | `width × 0.28` | 109px |
| `caption` | `0.05` | `width × 0.05` | 20px |
| `button` | `0.05` | `width × 0.05` | 20px |
| `buttonLarge` | `0.075` | `width × 0.075` | 29px |

**Usage Example:**
```javascript
import { getFontSize } from '../utils/design-tokens.js'

// Get calculated font size
const titleSize = getFontSize('pageTitle')  // Returns Math.round(width * 0.0825)
const bodySize = getFontSize('body')        // Returns Math.round(width * 0.055)
```

### Spacing Tokens

Spacing tokens are **ratios** for consistent spacing across the app.

| Token | Ratio | Use Case |
|-------|-------|----------|
| `pageTop` | `0.05` | Top margin for page content |
| `pageBottom` | `0.06` | Bottom margin for page content |
| `pageSide` | `0.07` | Side margins (square screens) |
| `pageSideRound` | `0.12` | Side margins (round screens) |
| `sectionGap` | `0.02` | Gap between sections |
| `headerTop` | `0.04` | Header top offset |
| `headerToContent` | `0.06` | Gap between header and content |
| `footerBottom` | `0.07` | Footer bottom offset |

**Usage Example:**
```javascript
import { TOKENS, toPercentage } from '../utils/design-tokens.js'

// Convert to percentage string for layout engine
const topGap = toPercentage(TOKENS.spacing.pageTop)  // Returns '5%'
const sideGap = toPercentage(TOKENS.spacing.pageSide) // Returns '7%'
```

### Sizing Tokens

Sizing tokens define component dimensions (mix of absolute pixels and ratios).

| Token | Value | Type | Use Case |
|-------|-------|------|----------|
| `iconSmall` | `24` | px | Small icons |
| `iconMedium` | `32` | px | Medium icons |
| `iconLarge` | `48` | px | Large icons, touch targets |
| `buttonHeight` | `35` | px | Button height (layout engine) |
| `buttonHeightRatio` | `0.22` | ratio | Button height (screen height ratio) |
| `buttonHeightLarge` | `0.15` | ratio | Large button height |
| `buttonWidth` | `85` | % | Button width (percentage) |
| `buttonRadiusRatio` | `0.5` | ratio | Button corner radius |
| `cardRadiusRatio` | `0.07` | ratio | Card corner radius |
| `minTouchTarget` | `48` | px | Minimum touch target size |

**Usage Example:**
```javascript
import { TOKENS, toPercentage } from '../utils/design-tokens.js'

// Button width as percentage
const btnWidth = toPercentage(TOKENS.sizing.buttonWidth)  // Returns '85%'

// Icon size
const iconSize = TOKENS.sizing.iconLarge  // Returns 48
```

### Helper Functions

#### `getColor(path)`

Retrieves a color value using dot notation.

```javascript
import { getColor } from '../utils/design-tokens.js'

const accentColor = getColor('colors.accent')        // Returns 0x1eb98c
const textColor = getColor('colors.text')            // Returns 0xffffff
const bgColor = getColor('colors.background')        // Returns 0x000000

// Error handling
getColor('invalid.path')  // Throws Error
```

**Parameters:**
- `path` (string, required) - Dot-notation path like `'colors.tokenName'`

**Returns:** `number` - Hex color value

**Throws:** `Error` if path is invalid or color doesn't exist

---

#### `getFontSize(typographyKey)`

Calculates pixel font size for a typography token.

```javascript
import { getFontSize } from '../utils/design-tokens.js'

const titleSize = getFontSize('pageTitle')  // Returns Math.round(width * 0.0825)
const bodySize = getFontSize('body')        // Returns Math.round(width * 0.055)
const scoreSize = getFontSize('score')      // Returns Math.round(width * 0.15)
```

**Parameters:**
- `typographyKey` (string, required) - Typography token key (e.g., `'pageTitle'`, `'body'`)

**Returns:** `number` - Calculated font size in pixels (rounded)

**Throws:** `Error` if typography key doesn't exist

---

#### `toPercentage(value)`

Converts a numeric value to a percentage string.

```javascript
import { toPercentage } from '../utils/design-tokens.js'

toPercentage(0.15)   // Returns '15%'
toPercentage(15)     // Returns '15%'
toPercentage(85)     // Returns '85%'
```

**Parameters:**
- `value` (number, required) - Value to convert (0.15 or 15 both become '15%')

**Returns:** `string` - Percentage string (e.g., `'15%'`)

---

## Layout System

### Concepts

The layout system uses **declarative schemas** to define UI layouts, which are resolved to pixel coordinates by the layout engine.

**Key Concepts:**

1. **Sections** - Vertical regions of the screen (header, body, footer)
2. **Elements** - UI widgets positioned within sections
3. **Resolution** - Converting declarative schema to pixel coordinates
4. **Positioning** - Using percentages, pixels, references, and alignment

**Benefits:**
- Declarative: Describe *what* you want, not *how* to position it
- Adaptive: Automatically adjusts to screen size and shape
- Maintainable: Easy to modify and reason about
- Reusable: Presets provide common patterns

### Schema Structure

A layout schema has two main parts:

```javascript
const schema = {
  sections: {
    // Vertical regions (header, body, footer)
    header: { height: '15%', top: 0, roundSafeInset: true },
    body: { height: 'fill', after: 'header', gap: '5%' },
    footer: { height: '60px', bottom: 0 }
  },
  elements: {
    // UI widgets positioned within sections
    title: {
      section: 'header',
      x: 'center',
      y: '20%',
      width: '80%',
      height: '60%',
      _meta: { text: 'Page Title', style: 'pageTitle' }
    }
  }
}
```

**Sections Properties:**
- `height` - Section height (percentage, pixels, or 'fill')
- `top` - Top position (percentage, pixels, or reference)
- `bottom` - Bottom position (percentage, pixels, or reference)
- `after` - Position after another section (e.g., `'header'`)
- `gap` - Gap after referenced section (e.g., `'5%'`)
- `roundSafeInset` - Apply safe inset on round screens (default: `true`)
- `sideInset` - Explicit side inset value (overrides roundSafeInset)

**Elements Properties:**
- `section` - Parent section name
- `x` - Horizontal position (percentage, pixels, or 'center')
- `y` - Vertical position (percentage or pixels)
- `width` - Element width (percentage or pixels)
- `height` - Element height (percentage or pixels)
- `align` - Horizontal alignment ('left', 'center', 'right')
- `_meta` - Custom metadata (not used by layout engine)

### Positioning Modes

#### 1. Percentage Positioning

Positions elements relative to parent dimension.

```javascript
{
  y: '20%',        // 20% of parent section height
  height: '15%',   // 15% of parent section height
  width: '80%'     // 80% of parent section width
}
```

#### 2. Pixel Positioning

Absolute pixel values for fixed sizing.

```javascript
{
  height: '60px',  // Exactly 60 pixels
  y: '100px',      // 100 pixels from top
  width: '200px'   // Exactly 200 pixels
}
```

#### 3. Fill Mode

Section fills remaining vertical space.

```javascript
{
  sections: {
    header: { height: '15%', top: 0 },
    body: { height: 'fill', after: 'header' },  // Fills space between header and footer
    footer: { height: '60px', bottom: 0 }
  }
}
```

#### 4. Reference Positioning

Position sections relative to each other.

```javascript
{
  sections: {
    header: { height: '15%', top: 0 },
    content: { 
      height: '70%',
      after: 'header',  // Position after header section
      gap: '2%'         // 2% gap after header
    }
  }
}
```

#### 5. Center Alignment

Center elements horizontally or vertically.

```javascript
{
  x: 'center',        // Center horizontally
  align: 'center'     // Alternative: use align property
}
```

#### 6. Expression Positioning

Position using expressions with references.

```javascript
// Example 1: Position below another section
{
  top: 'header.bottom + 2%'      // 2% below header's bottom edge
}

// Example 2: Position above another section
{
  top: 'content.top - 10px'      // 10px above content's top edge
}
```

### Layout Presets

Layout presets are factory functions that create common layout schemas.

#### `createStandardPageLayout(options)`

Creates a standard 3-section layout (header, body, footer).

```javascript
import { createStandardPageLayout } from '../utils/layout-presets.js'
import { resolveLayout } from '../utils/layout-engine.js'

const schema = createStandardPageLayout({
  hasHeader: true,
  hasFooter: true,
  headerHeight: '15%',
  footerHeight: '60px',
  top: '5%',
  bottom: '7%',
  bodyGap: '6%',
  headerRoundSafeInset: true,
  bodyRoundSafeInset: true,
  footerRoundSafeInset: false
})

const layout = resolveLayout(schema)
// layout.sections.header: { x, y, w, h }
// layout.sections.body: { x, y, w, h }
// layout.sections.footer: { x, y, w, h }
```

**Parameters:**
- `hasHeader` (boolean, optional, default: `true`) - Include header section
- `hasFooter` (boolean, optional, default: `true`) - Include footer section
- `headerHeight` (number|string, optional) - Header height (default: `'16.5%'`)
- `footerHeight` (number|string, optional) - Footer height (default: `'10%'`)
- `top` (number|string, optional, default: `0`) - Top offset
- `bottom` (number|string, optional, default: `0`) - Bottom offset
- `bodyGap` (number|string, optional) - Gap between header and body
- `headerRoundSafeInset` (boolean, optional, default: `true`) - Header round screen inset
- `bodyRoundSafeInset` (boolean, optional, default: `true`) - Body round screen inset
- `footerRoundSafeInset` (boolean, optional, default: `false`) - Footer round screen inset

**Returns:** `Object` - Layout schema with sections and elements

---

#### `createPageWithFooterButton(options)`

Creates a standard layout with a centered icon button in the footer.

```javascript
import { createPageWithFooterButton } from '../utils/layout-presets.js'

const schema = createPageWithFooterButton({
  icon: 'home-icon.png',
  footerButtonName: 'homeButton',
  onClick: () => console.log('Clicked!'),
  hasHeader: true,
  headerHeight: '15%',
  footerHeight: '10%'
})

// schema.elements.homeButton is automatically created
```

**Parameters:**
- `icon` (string, optional, default: `'home-icon.png'`) - Icon filename
- `footerButtonName` (string, optional, default: `'footerButton'`) - Element name
- `onClick` (Function, optional) - Click handler (metadata only)
- All parameters from `createStandardPageLayout()`

**Returns:** `Object` - Layout schema with footer button element

---

#### `createScorePageLayout(options)`

Creates a layout optimized for scoreboard screens.

```javascript
import { createScorePageLayout } from '../utils/layout-presets.js'

const schema = createScorePageLayout({
  headerTop: '4%',
  headerHeight: '15%',
  scoreAreaGap: '6%',
  footerBottom: '7%',
  footerHeight: '5%',
  headerRoundSafeInset: false,
  scoreAreaRoundSafeInset: false,
  footerRoundSafeInset: false
})

// Creates: header, scoreArea (fill), footer
```

**Parameters:**
- `headerTop` (number|string, optional) - Header top offset
- `headerHeight` (number|string, optional, default: `'15%'`) - Header height
- `scoreAreaGap` (number|string, optional) - Gap between header and score area
- `footerBottom` (number|string, optional) - Footer bottom offset
- `footerHeight` (number|string, optional, default: `'5%'`) - Footer height
- `headerRoundSafeInset` (boolean, optional, default: `false`) - Header inset
- `scoreAreaRoundSafeInset` (boolean, optional, default: `false`) - Score area inset
- `footerRoundSafeInset` (boolean, optional, default: `false`) - Footer inset

**Returns:** `Object` - Layout schema with sections

---

#### `createTwoColumnLayout(parentSection)`

Creates left and right column elements within a parent section.

```javascript
import { createStandardPageLayout } from '../utils/layout-presets.js'
import { createTwoColumnLayout } from '../utils/layout-presets.js'

const schema = createStandardPageLayout({ hasFooter: false })

// Add two columns to body section
Object.assign(schema.elements, createTwoColumnLayout('body'))

// schema.elements now includes:
// - leftColumn: 50% width, left-aligned
// - rightColumn: 50% width, right-aligned
```

**Parameters:**
- `parentSection` (string, required) - Name of parent section

**Returns:** `Object` - Object with `leftColumn` and `rightColumn` elements

**Throws:** `Error` if parentSection is not a valid string

---

### Round Screen Adaptation

The layout engine automatically adapts layouts for round screens using circle geometry.

**How it works:**

1. **Detection:** `getScreenMetrics()` identifies round screens
2. **Inset Calculation:** Uses circle geometry to calculate safe areas
3. **Section Adaptation:** Applies `roundSafeInset` to sections

**Algorithm:**
```
centerX = width / 2
radius = width / 2
yFromCenter = y - (height / 2)
halfChord = √(radius² - yFromCenter²)
safeInset = centerX - halfChord + padding
```

**Example:**
```javascript
// On 466x466 round screen at y=0 (top edge)
getRoundSafeSectionInset(466, 466, 0, 100, 4)
// Returns ~237 (large inset at edge)

// At y=233 (center)
getRoundSafeSectionInset(466, 466, 233, 100, 4)
// Returns 4 (minimum at center)
```

**Usage in schemas:**
```javascript
{
  sections: {
    header: {
      top: 0,
      height: '15%',
      roundSafeInset: true  // Auto-inset on round screens
    },
    body: {
      height: 'fill',
      after: 'header',
      roundSafeInset: true  // Auto-inset on round screens
    }
  }
}
```

---

## UI Components

UI components are factory functions that return widget configuration objects for `hmUI.createWidget()`.

### `createBackground()`

Creates a full-screen background widget.

```javascript
import { createBackground } from '../utils/ui-components.js'

// Basic usage (default black background)
const bg = createBackground()
hmUI.createWidget(bg.widgetType, bg.config)

// Custom color
const customBg = createBackground({ color: 0x1a1c20 })
hmUI.createWidget(customBg.widgetType, customBg.config)
```

**Parameters:**
- `options.color` (number, optional) - Background color (default: `TOKENS.colors.background`)

**Returns:** `Object` with:
- `widgetType` - `hmUI.widget.FILL_RECT`
- `config` - Widget configuration object

---

### `createText()`

Creates a text widget with style-based sizing.

```javascript
import { createText } from '../utils/ui-components.js'

// Basic text
const title = createText({
  text: 'Page Title',
  style: 'pageTitle',
  y: 50
})
hmUI.createWidget(title.widgetType, title.config)

// Custom positioning and styling
const label = createText({
  text: 'Label Text',
  style: 'body',
  x: 20,
  y: 100,
  w: 300,
  h: 40,
  color: 0x888888,
  align_h: hmUI.align.LEFT
})
hmUI.createWidget(label.widgetType, label.config)

// Centered text with custom height
const centered = createText({
  text: 'Centered',
  style: 'sectionTitle',
  x: 0,
  y: 200,
  w: 390,
  h: 50,
  align_h: hmUI.align.CENTER_H
})
```

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `text` | string | ✅ Yes | - | Text content |
| `style` | string | ✅ Yes | - | Typography style (e.g., `'pageTitle'`, `'body'`) |
| `x` | number | No | `0` | X position |
| `y` | number | No | `0` | Y position |
| `w` | number | No | screen width | Width |
| `h` | number | No | calculated | Height (auto-calculated from style) |
| `color` | number | No | `TOKENS.colors.text` | Text color |
| `align_h` | string | No | `hmUI.align.CENTER_H` | Horizontal alignment |
| `align_v` | string | No | `hmUI.align.CENTER_V` | Vertical alignment |

**Returns:** `Object` with:
- `widgetType` - `hmUI.widget.TEXT`
- `config` - Widget configuration object

**Throws:** `Error` if `text` or `style` is missing

---

### `createButton()`

Creates a button widget with variant support.

```javascript
import { createButton } from '../utils/ui-components.js'

// Primary button (default)
const primaryBtn = createButton({
  text: 'Start Match',
  onClick: () => console.log('Clicked!'),
  y: 300
})
hmUI.createWidget(primaryBtn.widgetType, primaryBtn.config)

// Secondary button
const secondaryBtn = createButton({
  text: 'Cancel',
  variant: 'secondary',
  onClick: () => console.log('Cancelled'),
  y: 380
})

// Danger button
const dangerBtn = createButton({
  text: 'Reset',
  variant: 'danger',
  onClick: () => resetMatch(),
  y: 380
})

// Disabled button
const disabledBtn = createButton({
  text: 'Start',
  variant: 'primary',
  disabled: true,
  onClick: () => {},
  y: 300
})

// Icon button
const iconBtn = createButton({
  variant: 'icon',
  normal_src: 'icon.png',
  press_src: 'icon_pressed.png',
  onClick: () => console.log('Icon clicked'),
  x: 10,
  y: 10
})

// Custom-sized button
const customBtn = createButton({
  text: 'Custom',
  variant: 'primary',
  x: 50,
  y: 200,
  w: 200,
  h: 50,
  radius: 25,
  onClick: () => {}
})
```

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `text` | string | ✅ Yes* | - | Button text (*required for non-icon variants) |
| `onClick` | Function | ✅ Yes | - | Click handler |
| `variant` | string | No | `'primary'` | Button variant: `'primary'`, `'secondary'`, `'danger'`, `'icon'` |
| `x` | number | No | centered | X position |
| `y` | number | No | - | Y position |
| `w` | number | No | 85% of screen | Width |
| `h` | number | No | screen height × 0.22 | Height |
| `radius` | number | No | h × 0.5 | Corner radius |
| `disabled` | boolean | No | `false` | Disable button |
| `normal_src` | string | ✅ Yes** | - | Normal state image (**required for icon variant) |
| `press_src` | string | No | normal_src | Pressed state image |

**Button Variants:**
- **`primary`** - Green background (`0x1eb98c`), black text
- **`secondary`** - Dark gray background (`0x24262b`), white text
- **`danger`** - Red background (`0xff6d78`), white text
- **`icon`** - Image-based button with no background

**Returns:** `Object` with:
- `widgetType` - `hmUI.widget.BUTTON`
- `config` - Widget configuration object

**Throws:** `Error` if `onClick` is missing, or if `text` is missing for non-icon variants

---

### `createDivider()`

Creates a horizontal or vertical divider line.

```javascript
import { createDivider } from '../utils/ui-components.js'

// Horizontal divider (default: full screen width)
const hDivider = createDivider({ 
  x: 0, 
  y: 100 
})
hmUI.createWidget(hDivider.widgetType, hDivider.config)

// Horizontal divider with custom width
const customHDivider = createDivider({ 
  x: 20, 
  y: 100, 
  w: 350 
})

// Vertical divider
const vDivider = createDivider({ 
  x: 195, 
  y: 50, 
  h: 100, 
  orientation: 'vertical' 
})

// Custom thickness and color
const thickDivider = createDivider({
  x: 0,
  y: 200,
  w: 390,
  thickness: 2,
  color: 0x555555
})
```

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `x` | number | ✅ Yes | - | X position |
| `y` | number | ✅ Yes | - | Y position |
| `w` | number | No | screen width | Width (horizontal divider) |
| `h` | number | No | 1 | Height (vertical divider) |
| `thickness` | number | No | `1` | Line thickness |
| `color` | number | No | `TOKENS.colors.divider` | Divider color |
| `orientation` | string | No | `'horizontal'` | `'horizontal'` or `'vertical'` |

**Returns:** `Object` with:
- `widgetType` - `hmUI.widget.FILL_RECT`
- `config` - Widget configuration object

**Throws:** `Error` if `x` or `y` is missing

---

## Screen Utilities

Screen utilities provide essential functions for screen measurement and adaptation.

### `getScreenMetrics()`

Retrieves screen dimensions and detects round screens.

```javascript
import { getScreenMetrics } from '../utils/screen-utils.js'

const metrics = getScreenMetrics()
// metrics.width: 390 (GTS 3), 466 (GTR 3)
// metrics.height: 450 (GTS 3), 466 (GTR 3)
// metrics.isRound: false (GTS 3), true (GTR 3)

// Usage
if (metrics.isRound) {
  // Apply round screen adaptations
  const sideMargin = Math.round(metrics.width * 0.12)
}
```

**Returns:** `Object` with:
- `width` (number) - Screen width in pixels
- `height` (number) - Screen height in pixels
- `isRound` (boolean) - Whether screen is round

**Fallback:** Returns `{ width: 390, height: 450, isRound: false }` in test environments

---

### `getRoundSafeSectionInset()`

Calculates safe inset for round screens at a specific Y position.

```javascript
import { getRoundSafeSectionInset } from '../utils/screen-utils.js'

// Calculate inset for a section at y=100, height=150
const inset = getRoundSafeSectionInset(466, 466, 100, 150, 4)
// Returns maximum of insets at y=100 and y=250
```

**Note:** This function is typically used internally by the layout engine. For manual calculations, use `getRoundSafeSectionInset()`.

---

### Utility Functions

#### `clamp(value, min, max)`

Constrains a value within a range.

```javascript
import { clamp } from '../utils/screen-utils.js'

clamp(150, 0, 100)  // Returns 100
clamp(-10, 0, 100)  // Returns 0
clamp(50, 0, 100)   // Returns 50
```

---

#### `ensureNumber(value, fallback)`

Validates a numeric value with fallback.

```javascript
import { ensureNumber } from '../utils/screen-utils.js'

ensureNumber(42)          // Returns 42
ensureNumber('invalid')   // Returns 0
ensureNumber(null, 10)    // Returns 10
ensureNumber(NaN, 5)      // Returns 5
```

---

#### `pct(screenDimension, percentage)`

Converts percentage to pixels.

```javascript
import { pct } from '../utils/screen-utils.js'

pct(400, 0.1)   // Returns 40 (decimal format)
pct(400, 10)    // Returns 40 (percentage format)
pct(400, 50)    // Returns 200
```

Handles both 0-1 (decimal) and 0-100 (percentage) formats.

---

## Usage Guidelines

### Best Practices

#### 1. **Always Use Design Tokens**

✅ **Good:**
```javascript
import { getColor, getFontSize, TOKENS } from '../utils/design-tokens.js'

const color = getColor('colors.accent')
const fontSize = getFontSize('pageTitle')
const margin = TOKENS.spacing.pageTop
```

❌ **Bad:**
```javascript
const color = 0x1eb98c  // Magic number
const fontSize = 32     // Hardcoded size
```

**Why:** Tokens ensure consistency and make updates easier.

---

#### 2. **Define Layouts at Module Level**

✅ **Good:**
```javascript
// Define once at module level
const PAGE_LAYOUT = createStandardPageLayout()

Page({
  build() {
    const layout = resolveLayout(PAGE_LAYOUT)
    // Use layout
  }
})
```

❌ **Bad:**
```javascript
Page({
  build() {
    // Re-creates schema on every render
    const schema = createStandardPageLayout()
    const layout = resolveLayout(schema)
  }
})
```

**Why:** Module-level definitions are created once, improving performance.

---

#### 3. **Reuse Layout Presets**

✅ **Good:**
```javascript
const schema = createStandardPageLayout({ hasFooter: false })
schema.elements.customButton = { /* ... */ }
```

❌ **Bad:**
```javascript
const schema = {
  sections: {
    header: { height: '15%', top: 0, roundSafeInset: true },
    body: { height: 'fill', after: 'header', gap: '6%', roundSafeInset: true }
  },
  elements: {}
}
```

**Why:** Presets encapsulate best practices and reduce duplication.

---

#### 4. **Use Round Safe Insets**

✅ **Good:**
```javascript
{
  sections: {
    header: {
      top: 0,
      height: '15%',
      roundSafeInset: true  // Handles round screens automatically
    }
  }
}
```

❌ **Bad:**
```javascript
{
  sections: {
    header: {
      top: 0,
      height: '15%',
      roundSafeInset: false  // Content may clip on round screens
    }
  }
}
```

**Why:** Round screens have circular display areas; content near edges gets clipped.

---

#### 5. **Cache Resolved Layouts**

✅ **Good:**
```javascript
Page({
  onInit() {
    this.layout = resolveLayout(PAGE_LAYOUT)
  },
  
  build() {
    // Use cached layout
    const titleEl = this.layout.elements.title
  }
})
```

❌ **Bad:**
```javascript
Page({
  build() {
    // Resolves layout on every build
    const layout = resolveLayout(PAGE_LAYOUT)
  }
})
```

**Why:** Resolution involves calculations; cache results when possible.

---

### Performance Tips

1. **Define schemas at module level** - Created once, reused many times
2. **Cache resolved layouts** - Store in page instance during `onInit()`
3. **Use presets** - Optimized and tested patterns
4. **Avoid recalculating** - Don't re-resolve layouts unnecessarily
5. **Batch widget creation** - Create all widgets in a single pass

---

### Common Pitfalls

#### 1. **Not Using Tokens**

❌ **Problem:**
```javascript
const color = 0x1eb98c  // Hardcoded color
```

✅ **Solution:**
```javascript
import { getColor } from '../utils/design-tokens.js'
const color = getColor('colors.accent')
```

---

#### 2. **Manual Positioning**

❌ **Problem:**
```javascript
// Manual pixel calculations
const x = (390 - 200) / 2
const y = 450 * 0.3
```

✅ **Solution:**
```javascript
// Declarative layout
{
  x: 'center',
  y: '30%'
}
```

---

#### 3. **Ignoring Round Screens**

❌ **Problem:**
```javascript
roundSafeInset: false  // Content clips on round screens
```

✅ **Solution:**
```javascript
roundSafeInset: true  // Automatic adaptation
```

---

#### 4. **Re-creating Schemas**

❌ **Problem:**
```javascript
build() {
  const schema = createStandardPageLayout()  // Created on every build
}
```

✅ **Solution:**
```javascript
const PAGE_LAYOUT = createStandardPageLayout()  // Module level

Page({
  build() {
    const layout = resolveLayout(PAGE_LAYOUT)
  }
})
```

---

## Examples

### Example 1: Simple Page with Header and Footer

**File:** `page/index.js` (simplified)

This example shows a basic page with a header, body, and footer button.

```javascript
import { createPageWithFooterButton } from '../utils/layout-presets.js'
import { resolveLayout } from '../utils/layout-engine.js'
import { createBackground, createButton, createText } from '../utils/ui-components.js'
import { getScreenMetrics } from '../utils/screen-utils.js'
import { TOKENS, toPercentage } from '../utils/design-tokens.js'

// Define layout schema at module level
const PAGE_LAYOUT = createPageWithFooterButton({
  icon: 'setting-icon.png',
  footerButtonName: 'settingsButton',
  hasHeader: true,
  headerHeight: '22%',
  footerHeight: '5%',
  headerRoundSafeInset: false,
  bodyRoundSafeInset: false,
  footerRoundSafeInset: false
})

// Add page-specific elements
PAGE_LAYOUT.elements.pageTitle = {
  section: 'header',
  x: 'center',
  y: '55%',
  width: '100%',
  height: '40%',
  align: 'center',
  _meta: {
    type: 'text',
    style: 'pageTitle',
    text: 'Padel Buddy'
  }
}

PAGE_LAYOUT.elements.primaryButton = {
  section: 'body',
  x: 'center',
  y: '15%',
  width: toPercentage(TOKENS.sizing.buttonWidth),
  align: 'center',
  _meta: {
    type: 'button',
    variant: 'primary',
    text: 'Start New Game',
    onClick: 'handleStartGame'
  }
}

Page({
  onInit() {
    this.widgets = []
  },

  build() {
    const metrics = getScreenMetrics()
    const layout = resolveLayout(PAGE_LAYOUT, metrics)

    // Background
    const bg = createBackground()
    this.createWidget(bg.widgetType, bg.config)

    // Title
    const titleEl = layout.elements.pageTitle
    const titleConfig = createText({
      text: 'Padel Buddy',
      style: 'pageTitle',
      x: titleEl.x,
      y: titleEl.y,
      w: titleEl.w,
      h: titleEl.h
    })
    this.createWidget(titleConfig.widgetType, titleConfig.config)

    // Primary button
    const btnEl = layout.elements.primaryButton
    const btnConfig = createButton({
      text: 'Start New Game',
      variant: 'primary',
      x: btnEl.x,
      y: btnEl.y,
      w: btnEl.w,
      onClick: () => this.handleStartGame()
    })
    this.createWidget(btnConfig.widgetType, btnConfig.config)

    // Settings button (footer)
    const settingsEl = layout.elements.settingsButton
    const settingsConfig = createButton({
      variant: 'icon',
      normal_src: 'setting-icon.png',
      x: settingsEl.x,
      y: settingsEl.y,
      onClick: () => this.navigateToSettings()
    })
    this.createWidget(settingsConfig.widgetType, settingsConfig.config)
  },

  createWidget(type, config) {
    const widget = hmUI.createWidget(type, config)
    this.widgets.push(widget)
    return widget
  },

  handleStartGame() {
    console.log('Starting game...')
  },

  navigateToSettings() {
    hmApp.gotoPage({ url: 'page/settings' })
  }
})
```

**Key Points:**
- Layout schema defined at module level
- Uses `createPageWithFooterButton()` preset
- Resolves layout once in `build()`
- Creates widgets using component factories
- Follows standard header/body/footer structure

---

### Example 2: Form-like Layout with Options

**File:** `page/setup.js` (simplified)

This example shows option selection buttons and conditional rendering.

```javascript
import { createPageWithFooterButton } from '../utils/layout-presets.js'
import { resolveLayout } from '../utils/layout-engine.js'
import { createBackground, createButton, createText } from '../utils/ui-components.js'
import { getScreenMetrics } from '../utils/screen-utils.js'
import { TOKENS, toPercentage } from '../utils/design-tokens.js'

const SETUP_LAYOUT = createPageWithFooterButton({
  icon: 'goback-icon.png',
  footerButtonName: 'goBackButton',
  hasHeader: true,
  headerHeight: '15%',
  footerHeight: '5%',
  bodyRoundSafeInset: false,
  headerRoundSafeInset: false,
  footerRoundSafeInset: false
})

// Override body side inset
SETUP_LAYOUT.sections.body.sideInset = '7%'

// Add setup-specific elements
SETUP_LAYOUT.elements.title = {
  section: 'header',
  x: 'center',
  y: '30%',
  width: '100%',
  height: '50%',
  align: 'center',
  _meta: {
    type: 'text',
    style: 'pageTitle',
    text: 'Match Setup'
  }
}

SETUP_LAYOUT.elements.helperText = {
  section: 'body',
  x: 0,
  y: '5%',
  width: '100%',
  height: '10%',
  align: 'center',
  _meta: {
    type: 'text',
    style: 'bodyLarge',
    text: 'Select number of sets'
  }
}

SETUP_LAYOUT.elements.optionsRow = {
  section: 'body',
  x: 0,
  y: '22%',
  width: '100%',
  align: 'center',
  _meta: {
    type: 'optionsRow',
    options: [1, 3, 5],
    gap: '2.2%'
  }
}

SETUP_LAYOUT.elements.startButton = {
  section: 'body',
  x: 'center',
  y: '55%',
  width: toPercentage(TOKENS.sizing.buttonWidth),
  align: 'center',
  _meta: {
    type: 'button',
    variant: 'primary',
    text: 'Start Match'
  }
}

Page({
  onInit() {
    this.widgets = []
    this.selectedSetsToPlay = null
  },

  build() {
    const metrics = getScreenMetrics()
    const { width } = metrics
    const layout = resolveLayout(SETUP_LAYOUT, metrics)

    // Background
    const bg = createBackground()
    this.createWidget(bg.widgetType, bg.config)

    // Title
    const titleEl = layout.elements.title
    const titleConfig = createText({
      text: 'Match Setup',
      style: 'pageTitle',
      x: titleEl.x,
      y: titleEl.y,
      w: titleEl.w,
      h: titleEl.h
    })
    this.createWidget(titleConfig.widgetType, titleConfig.config)

    // Helper text
    const helperEl = layout.elements.helperText
    const helperConfig = createText({
      text: 'Select number of sets',
      style: 'bodyLarge',
      x: helperEl.x,
      y: helperEl.y,
      w: helperEl.w,
      h: helperEl.h,
      color: TOKENS.colors.mutedText
    })
    this.createWidget(helperConfig.widgetType, helperConfig.config)

    // Option buttons (1, 3, 5 sets)
    const optionsEl = layout.elements.optionsRow
    const options = [1, 3, 5]
    const gap = Math.round(width * 0.022)
    const buttonWidth = Math.round(
      (optionsEl.w - (options.length - 1) * gap) / options.length
    )

    options.forEach((setsToPlay, index) => {
      const isSelected = this.selectedSetsToPlay === setsToPlay
      const x = optionsEl.x + (buttonWidth + gap) * index
      const radius = Math.round(buttonWidth / 2)  // Circular buttons

      const btnConfig = createButton({
        text: `${setsToPlay} Set${setsToPlay > 1 ? 's' : ''}`,
        variant: isSelected ? 'primary' : 'secondary',
        x: x,
        y: optionsEl.y,
        w: buttonWidth,
        radius: radius,
        onClick: () => this.handleSelectSets(setsToPlay)
      })
      this.createWidget(btnConfig.widgetType, btnConfig.config)
    })

    // Start button (disabled if no selection)
    const startEl = layout.elements.startButton
    const canStart = this.selectedSetsToPlay !== null
    const startConfig = createButton({
      text: 'Start Match',
      variant: canStart ? 'primary' : 'secondary',
      x: startEl.x,
      y: startEl.y,
      w: startEl.w,
      disabled: !canStart,
      onClick: () => {
        if (canStart) this.handleStartMatch()
      }
    })
    this.createWidget(startConfig.widgetType, startConfig.config)

    // Go back button
    const goBackEl = layout.elements.goBackButton
    const goBackConfig = createButton({
      variant: 'icon',
      normal_src: 'goback-icon.png',
      x: goBackEl.x,
      y: goBackEl.y,
      onClick: () => this.navigateBack()
    })
    this.createWidget(goBackConfig.widgetType, goBackConfig.config)
  },

  handleSelectSets(setsToPlay) {
    this.selectedSetsToPlay = setsToPlay
    // Re-render to update button states
    this.build()
  },

  handleStartMatch() {
    console.log(`Starting match with ${this.selectedSetsToPlay} sets`)
  },

  createWidget(type, config) {
    const widget = hmUI.createWidget(type, config)
    this.widgets.push(widget)
    return widget
  },

  navigateBack() {
    hmApp.gotoPage({ url: 'page/index' })
  }
})
```

**Key Points:**
- Option buttons created dynamically in a loop
- Conditional styling based on selection state
- Disabled button state when no selection
- Circular button styling using radius
- Re-renders on selection change

---

### Example 3: Settings Page with Scroll List

**File:** `page/settings.js` (simplified)

This example shows a scroll list and complex item configurations.

```javascript
import { createStandardPageLayout } from '../utils/layout-presets.js'
import { resolveLayout } from '../utils/layout-engine.js'
import { createBackground, createButton, createText } from '../utils/ui-components.js'
import { getScreenMetrics, clamp } from '../utils/screen-utils.js'
import { getFontSize, TOKENS, toPercentage } from '../utils/design-tokens.js'

const SETTINGS_LAYOUT = {
  sections: createStandardPageLayout({
    top: toPercentage(TOKENS.spacing.pageTop),
    bottom: toPercentage(TOKENS.spacing.pageBottom),
    bodyGap: toPercentage(TOKENS.spacing.sectionGap),
    headerHeight: '10%',
    footerHeight: '10%',
    headerRoundSafeInset: false,
    bodyRoundSafeInset: false,
    footerRoundSafeInset: false
  }).sections,
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
        style: 'pageTitle'
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
        type: 'scrollList'
      }
    },
    goBackButton: {
      section: 'footer',
      x: 'center',
      y: 'center',
      width: TOKENS.sizing.iconLarge,
      height: TOKENS.sizing.iconLarge,
      align: 'center',
      _meta: {
        type: 'iconButton',
        icon: 'goback-icon.png'
      }
    }
  }
}

Page({
  onInit() {
    this.widgets = []
    this.scrollList = null
  },

  build() {
    const metrics = getScreenMetrics()
    const layout = resolveLayout(SETTINGS_LAYOUT, metrics)

    // Background
    const bg = createBackground()
    this.createWidget(bg.widgetType, bg.config)

    // Header title
    const headerSection = layout.sections.header
    const titleConfig = createText({
      text: 'Settings',
      style: 'pageTitle',
      x: headerSection.x,
      y: headerSection.y,
      w: headerSection.w,
      h: headerSection.h
    })
    this.createWidget(titleConfig.widgetType, titleConfig.config)

    // Scroll list
    const listEl = layout.elements.scrollList
    const rowHeight = clamp(
      Math.round(metrics.width * TOKENS.typography.body * 3.5),
      88,
      88
    )

    const itemTextSize = getFontSize('bodyLarge')
    const textH = Math.round(itemTextSize * 1.4)
    const textY = Math.round((rowHeight - textH) / 2)
    const padding = Math.round(metrics.width * 0.02)
    const textX = padding
    const textW = Math.round(listEl.w * 0.75)
    const iconSize = TOKENS.sizing.iconLarge
    const iconX = textX + textW + padding
    const iconY = Math.round((rowHeight - iconSize) / 2)

    // Item configurations
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
      image_view: [{
        x: iconX,
        y: iconY,
        w: iconSize,
        h: iconSize,
        key: 'icon'
      }],
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
      image_view: [{
        x: iconX,
        y: iconY,
        w: iconSize,
        h: iconSize,
        key: 'icon'
      }],
      image_view_count: 1
    }

    // Create scroll list
    this.scrollList = this.createWidget(hmUI.widget.SCROLL_LIST, {
      x: listEl.x,
      y: listEl.y,
      w: listEl.w,
      h: rowHeight * 4,
      item_space: 0,
      item_config: [itemConfigNormal, itemConfigDanger],
      item_config_count: 2,
      data_array: [
        { label: 'Previous Matches', icon: 'chevron-icon.png' },
        { label: 'Clear App Data', icon: 'delete-icon.png' }
      ],
      data_count: 2,
      item_click_func: (_list, index) => {
        this.handleItemClick(index)
      },
      data_type_config: [
        { start: 0, end: 0, type_id: 1 },
        { start: 1, end: 1, type_id: 1 }
      ],
      data_type_config_count: 2
    })

    // Footer button
    const goBackEl = layout.elements.goBackButton
    const goBackConfig = createButton({
      variant: 'icon',
      normal_src: 'goback-icon.png',
      x: goBackEl.x,
      y: goBackEl.y,
      onClick: () => this.navigateBack()
    })
    this.createWidget(goBackConfig.widgetType, goBackConfig.config)
  },

  handleItemClick(index) {
    if (index === 0) {
      console.log('Navigate to history')
    } else if (index === 1) {
      console.log('Clear data')
    }
  },

  createWidget(type, config) {
    const widget = hmUI.createWidget(type, config)
    this.widgets.push(widget)
    return widget
  },

  navigateBack() {
    hmApp.gotoPage({ url: 'page/index' })
  }
})
```

**Key Points:**
- Complex scroll list with multiple item types
- Item configurations with text and icons
- Click handler for list items
- Standard page layout with header/footer
- Uses `clamp()` for row height calculation

---

### Example 4: Two-Column Layout

This example shows how to create a two-column layout for comparison views.

```javascript
import { createStandardPageLayout, createTwoColumnLayout } from '../utils/layout-presets.js'
import { resolveLayout } from '../utils/layout-engine.js'
import { createBackground, createText } from '../utils/ui-components.js'
import { getScreenMetrics } from '../utils/screen-utils.js'

// Create base layout
const COMPARISON_LAYOUT = createStandardPageLayout({
  hasHeader: true,
  hasFooter: false,
  headerHeight: '15%',
  headerRoundSafeInset: true,
  bodyRoundSafeInset: true
})

// Add two columns to body section
Object.assign(COMPARISON_LAYOUT.elements, createTwoColumnLayout('body'))

// Add header title
COMPARISON_LAYOUT.elements.title = {
  section: 'header',
  x: 'center',
  y: '30%',
  width: '100%',
  height: '50%',
  align: 'center',
  _meta: {
    type: 'text',
    style: 'pageTitle',
    text: 'Score Comparison'
  }
}

Page({
  onInit() {
    this.widgets = []
  },

  build() {
    const metrics = getScreenMetrics()
    const layout = resolveLayout(COMPARISON_LAYOUT, metrics)

    // Background
    const bg = createBackground()
    this.createWidget(bg.widgetType, bg.config)

    // Title
    const titleEl = layout.elements.title
    const titleConfig = createText({
      text: 'Score Comparison',
      style: 'pageTitle',
      x: titleEl.x,
      y: titleEl.y,
      w: titleEl.w,
      h: titleEl.h
    })
    this.createWidget(titleConfig.widgetType, titleConfig.config)

    // Left column content
    const leftCol = layout.elements.leftColumn
    const leftConfig = createText({
      text: 'Team A',
      style: 'sectionTitle',
      x: leftCol.x,
      y: leftCol.y + 20,
      w: leftCol.w,
      h: 40,
      align_h: hmUI.align.CENTER_H
    })
    this.createWidget(leftConfig.widgetType, leftConfig.config)

    // Right column content
    const rightCol = layout.elements.rightColumn
    const rightConfig = createText({
      text: 'Team B',
      style: 'sectionTitle',
      x: rightCol.x,
      y: rightCol.y + 20,
      w: rightCol.w,
      h: 40,
      align_h: hmUI.align.CENTER_H
    })
    this.createWidget(rightConfig.widgetType, rightConfig.config)
  },

  createWidget(type, config) {
    const widget = hmUI.createWidget(type, config)
    this.widgets.push(widget)
    return widget
  }
})
```

**Key Points:**
- Uses `createTwoColumnLayout()` helper
- Columns split body section 50/50
- Each column is independent
- Useful for comparison views, side-by-side data

---

## Troubleshooting

### Common Errors

#### 1. **"Missing required parameter: text"**

**Cause:** `createText()` or `createButton()` called without required parameter.

**Solution:**
```javascript
// ❌ Missing text
const btn = createButton({ onClick: () => {} })

// ✅ Include text
const btn = createButton({ text: 'Click Me', onClick: () => {} })
```

---

#### 2. **"Unknown color token: xyz"**

**Cause:** Invalid color token name in `getColor()`.

**Solution:**
```javascript
// ❌ Invalid token
const color = getColor('colors.invalidColor')

// ✅ Valid token
const color = getColor('colors.accent')
```

Check available tokens in [Color Tokens](#color-tokens) section.

---

#### 3. **Layout elements have undefined coordinates**

**Cause:** Layout schema not resolved, or element name doesn't exist.

**Solution:**
```javascript
// ❌ Forgot to resolve
const layout = PAGE_LAYOUT  // Schema, not resolved

// ✅ Resolve first
const metrics = getScreenMetrics()
const layout = resolveLayout(PAGE_LAYOUT, metrics)
const element = layout.elements.myElement  // Now has x, y, w, h
```

---

#### 4. **Content clipped on round screens**

**Cause:** `roundSafeInset: false` or missing.

**Solution:**
```javascript
// ❌ No safe inset
{
  sections: {
    header: { height: '15%', top: 0 }
  }
}

// ✅ Enable safe inset
{
  sections: {
    header: { height: '15%', top: 0, roundSafeInset: true }
  }
}
```

---

### Debug Tips

#### 1. **Log resolved layouts**

```javascript
const layout = resolveLayout(schema)
console.log('Sections:', JSON.stringify(layout.sections, null, 2))
console.log('Elements:', JSON.stringify(layout.elements, null, 2))
```

#### 2. **Check screen metrics**

```javascript
const { width, height, isRound } = getScreenMetrics()
console.log(`Screen: ${width}x${height}, Round: ${isRound}`)
```

#### 3. **Verify token values**

```javascript
import { TOKENS, getColor, getFontSize } from '../utils/design-tokens.js'

console.log('Accent color:', getColor('colors.accent'))
console.log('Title size:', getFontSize('pageTitle'))
console.log('All tokens:', TOKENS)
```

#### 4. **Test on different devices**

- Test on square screens (GTS 3: 390×450)
- Test on round screens (GTR 3: 466×466)
- Use simulator or real devices

---

### Getting Help

1. **Check source files:**
   - `utils/design-tokens.js` - Token definitions
   - `utils/layout-engine.js` - Layout resolution
   - `utils/layout-presets.js` - Preset factories
   - `utils/ui-components.js` - Component factories

2. **Review real implementations:**
   - `page/index.js` - Home screen
   - `page/setup.js` - Form-like layout
   - `page/settings.js` - Scroll list
   - `page/game.js` - Complex layout

3. **Consult documentation:**
   - [GET_STARTED.md](./GET_STARTED.md) - Project setup
   - [CONTEXT.md](../CONTEXT.md) - Zepp OS context
   - Zepp OS docs: https://docs.zepp.com/docs/1.0/

---

## Next Steps

Now that you understand the UI system:

1. **Experiment** - Try creating a simple page using the Quick Start example
2. **Explore** - Review actual page implementations in `page/` directory
3. **Build** - Create your own page using the patterns from this guide
4. **Contribute** - Add new components or presets as needed

**Remember:**
- Always use design tokens for consistency
- Define layouts at module level for performance
- Use presets when possible
- Enable `roundSafeInset` for round screen support
- Cache resolved layouts to avoid recalculation

---

**Happy coding!** 🎾
