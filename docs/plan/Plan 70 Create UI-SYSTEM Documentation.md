# Task Analysis

## Main Objective
Create a comprehensive UI system documentation file (`docs/UI-SYSTEM.md`) that provides new developers with practical, actionable guidance on using the Padel Buddy app's UI system, including design tokens, layout engine, UI components, and screen utilities.

## Identified Dependencies
- **Source files (all completed):**
  - `utils/design-tokens.js` - Centralized design values
  - `utils/layout-engine.js` - Declarative layout resolution
  - `utils/layout-presets.js` - Common page layout schemas
  - `utils/ui-components.js` - Reusable widget factories
  - `utils/screen-utils.js` - Screen measurement utilities
- **Reference implementations:**
  - `page/index.js` - Home screen usage examples
  - `page/setup.js` - Form-like layout examples
  - `page/game.js` and `page/game/ui-binding.js` - Complex layout examples
  - `page/summary.js`, `page/history.js`, `page/settings.js` - Standard page examples
- **Existing documentation:**
  - `docs/GET_STARTED.md` - Project setup
  - `docs/plan/Plan 42 Create Layout Engine with Declarative Resolution.md` - Layout engine reference

## System Impact
- **Low risk**: Documentation-only task, no code changes
- **High value**: Enables new developers to be productive quickly
- **Maintenance**: Documentation must be kept in sync with code changes
- **Adoption**: Success depends on clarity, accuracy, and practical examples

---

## Chosen Approach

### Proposed Solution
Create a **user-centric documentation structure with progressive disclosure**:

1. **Overview section** - Quick start concepts and architecture
2. **Practical tutorials** - Step-by-step usage examples
3. **Reference sections** - Comprehensive API documentation
4. **Best practices** - Guidelines and patterns

This approach follows how developers naturally learn:
- First understand "what" and "why" (Overview)
- Then learn "how" with examples (Tutorials)
- Finally, reference details when needed (Reference)

### Justification for Simplicity

**Why user-centric over file-centric:**
- ✅ Mirrors developer learning path
- ✅ Reduces cognitive load (concepts first, details later)
- ✅ Enables quick starts without reading everything
- ❌ File-centric requires jumping between sections to understand usage

**Why progressive disclosure:**
- ✅ New developers can build first screen in 10 minutes
- ✅ Advanced patterns available when needed
- ✅ Reduces overwhelm from comprehensive reference
- ❌ Flat structure forces readers to parse everything upfront

**Why practical examples over exhaustive documentation:**
- ✅ Copy-paste examples reduce friction
- ✅ Real code from actual pages builds confidence
- ✅ Shows integration patterns, not just isolated APIs
- ❌ Theoretical documentation requires translation to practice

### Components to Be Modified/Created

| Component | Action | File |
|-----------|--------|------|
| UI System Documentation | Create new file | docs/UI-SYSTEM.md |
| Plan document | Create new file | docs/plan/Plan 70 Create docs/UI-SYSTEM.md |

---

## Implementation Steps

### Step 1: Create Base File Structure and Overview Section (Subtask 70.1)

**Goal:** Establish the documentation foundation with clear navigation and context.

**Actions:**
1. Create `docs/UI-SYSTEM.md` with top-level structure:
   ```markdown
   # UI System Documentation
   
   ## Overview
   ### Purpose and Scope
   ### Architecture
   ### Quick Start Guide
   
   ## Design Tokens
   ## Layout System
   ## UI Components
   ## Screen Utilities
   ## Usage Guidelines
   ## Examples
   ```

2. Write **Overview** section:
   - **Purpose**: Explain this is the central UI reference for Padel Buddy
   - **Architecture**: Describe the layered system (Screen Utils → Design Tokens → Layout Engine → UI Components)
   - **Quick Start**: Provide a minimal working example that creates a simple page
   - **Round Screen Handling**: Explain automatic adaptation for round watches

**Validation:**
- ✅ File created at correct location
- ✅ Markdown renders correctly (check headings, code blocks)
- ✅ Overview provides clear context for new developers
- ✅ Quick Start example is copy-pasteable and complete

**Estimated time:** 15 minutes

---

### Step 2: Write Design Tokens Reference Section (Subtask 70.2)

**Goal:** Document all design tokens with clear explanations and usage examples.

**Actions:**
1. Add **Design Tokens Reference** section with subsections:
   - **Color Tokens** - Table of all colors with hex values and use cases
   - **Typography Tokens** - Table of text styles with size calculations
   - **Spacing Tokens** - Table of spacing values and when to use
   - **Sizing Tokens** - Table of component sizes (buttons, icons, etc.)

2. For each token category:
   - List all tokens with their values
   - Explain the calculation (e.g., "screen width × 0.0825")
   - Provide usage example with code snippet
   - Show helper functions (`getColor()`, `getFontSize()`, `toPercentage()`)

3. Add practical examples:
   ```javascript
   // Example: Using color tokens
   import { getColor } from '../utils/design-tokens.js'
   const accentColor = getColor('colors.accent') // 0x1eb98c
   
   // Example: Using typography tokens
   import { getFontSize } from '../utils/design-tokens.js'
   const titleSize = getFontSize('pageTitle') // Math.round(width * 0.0825)
   ```

**Validation:**
- ✅ All tokens from `utils/design-tokens.js` are documented
- ✅ Values match actual implementation
- ✅ Helper functions documented with signatures and examples
- ✅ Examples are copy-pasteable and accurate

**Estimated time:** 20 minutes

---

### Step 3: Write Layout System Documentation (Subtask 70.3)

**Goal:** Explain the declarative layout system so developers can create their own page layouts.

**Actions:**
1. Add **Layout System** section with subsections:
   - **Concepts** - Explain sections, elements, resolution process
   - **Schema Structure** - Document the schema format with examples
   - **Positioning Modes** - Explain percentage, pixel, fill, and reference-based positioning
   - **Layout Presets** - Document `createStandardPageLayout()`, `createScorePageLayout()`, `createTwoColumnLayout()`
   - **Round Screen Handling** - Explain `roundSafeInset` behavior

2. Document **Schema Format**:
   ```javascript
   // Example schema structure
   const schema = {
     sections: {
       header: { height: '15%', top: 0, roundSafeInset: true },
       body: { height: 'fill', after: 'header', gap: '5%' },
       footer: { height: '60px', bottom: 0 }
     },
     elements: {
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

3. Document **Positioning Modes** with examples:
   - **Percentage**: `'15%'` - Relative to screen/section dimension
   - **Pixel**: `'60px'` - Absolute pixels
   - **Fill**: `'fill'` - Fills remaining space
   - **Center**: `'center'` - Centers horizontally/vertically
   - **Reference**: `{ after: 'header' }` - Positions relative to another section

4. Document **Layout Presets**:
   - `createStandardPageLayout()` - Header/body/footer structure
   - `createScorePageLayout()` - Game screen layout
   - `createTwoColumnLayout()` - Two-column layout
   - Show parameters and usage examples

5. Add **Standard Page Structure** example:
   ```javascript
   import { createStandardPageLayout } from '../utils/layout-presets.js'
   import { resolveLayout } from '../utils/layout-engine.js'
   
   const schema = createStandardPageLayout({
     hasHeader: true,
     hasFooter: true,
     headerHeight: '15%',
     footerHeight: '60px'
   })
   
   const layout = resolveLayout(schema)
   // layout.sections.header: { x, y, w, h }
   // layout.sections.body: { x, y, w, h }
   // layout.sections.footer: { x, y, w, h }
   ```

**Validation:**
- ✅ Schema structure clearly documented
- ✅ All positioning modes explained with examples
- ✅ All layout presets documented
- ✅ Round screen handling explained
- ✅ Examples match actual implementation

**Estimated time:** 30 minutes

---

### Step 4: Write UI Components Reference Section (Subtask 70.4)

**Goal:** Document each UI component factory function with parameters and practical examples.

**Actions:**
1. Add **UI Components Reference** section with subsections:
   - **createBackground()** - Full-screen background
   - **createText()** - Text widgets with styling
   - **createButton()** - Interactive buttons with variants
   - **createDivider()** - Horizontal/vertical dividers

2. For each component, document:
   - **Purpose**: What the component does
   - **Parameters**: Table with name, type, required/optional, default value
   - **Returns**: Widget configuration structure
   - **Example**: Real usage from actual pages
   - **Common patterns**: Typical use cases

3. **createBackground()** documentation:
   ```javascript
   import { createBackground } from '../utils/ui-components.js'
   
   // Basic usage
   const bg = createBackground()
   hmUI.createWidget(bg.widgetType, bg.config)
   
   // Custom color
   const customBg = createBackground({ color: 0x1a1c20 })
   ```

4. **createText()** documentation:
   ```javascript
   import { createText } from '../utils/ui-components.js'
   
   // Basic text
   const title = createText({
     text: 'Page Title',
     style: 'pageTitle',
     y: 50
   })
   hmUI.createWidget(title.widgetType, title.config)
   
   // Custom positioning and color
   const label = createText({
     text: 'Label',
     style: 'body',
     x: 20,
     y: 100,
     color: 0x888888,
     align_h: hmUI.align.LEFT
   })
   ```

5. **createButton()** documentation:
   ```javascript
   import { createButton } from '../utils/ui-components.js'
   
   // Primary button
   const primaryBtn = createButton({
     text: 'Start Match',
     onClick: () => router.push({ url: 'page/setup' }),
     y: 300
   })
   hmUI.createWidget(primaryBtn.widgetType, primaryBtn.config)
   
   // Secondary button
   const secondaryBtn = createButton({
     text: 'Cancel',
     variant: 'secondary',
     onClick: () => console.log('Cancelled'),
     y: 350
   })
   
   // Danger button
   const dangerBtn = createButton({
     text: 'Reset',
     variant: 'danger',
     onClick: () => resetMatch(),
     y: 350
   })
   
   // Icon button
   const iconBtn = createButton({
     variant: 'icon',
     normal_src: 'icon.png',
     press_src: 'icon_pressed.png',
     onClick: () => {},
     x: 10,
     y: 10
   })
   ```

6. **createDivider()** documentation:
   ```javascript
   import { createDivider } from '../utils/ui-components.js'
   
   // Horizontal divider
   const hDivider = createDivider({ x: 20, y: 100, w: 350 })
   hmUI.createWidget(hDivider.widgetType, hDivider.config)
   
   // Vertical divider
   const vDivider = createDivider({ 
     x: 195, 
     y: 50, 
     h: 100, 
     orientation: 'vertical' 
   })
   ```

**Validation:**
- ✅ All component factory functions documented
- ✅ Parameters match actual implementation
- ✅ Examples are copy-pasteable and accurate
- ✅ Common patterns covered
- ✅ Links to actual page examples (e.g., "See page/index.js for more examples")

**Estimated time:** 25 minutes

---

### Step 5: Write Screen Utilities, Usage Guidelines, and Examples Sections (Subtask 70.5)

**Goal:** Complete the documentation with utilities reference, best practices, and comprehensive examples.

**Actions:**
1. Add **Screen Utilities** section:
   - **getScreenMetrics()** - Get screen dimensions and round detection
   - **getRoundSafeInset()** - Calculate safe inset for round screens
   - **clamp()** - Clamp values to min/max range
   - **pct()** - Parse percentage strings
   - **ensureNumber()** - Provide fallback for numeric values

   ```javascript
   import { getScreenMetrics, getRoundSafeInset, clamp, pct } from '../utils/screen-utils.js'
   
   // Get screen dimensions
   const { width, height, isRound } = getScreenMetrics()
   
   // Get safe inset for round screens
   const inset = getRoundSafeInset(width, 0.12) // 12% of width
   
   // Clamp a value
   const clampedValue = clamp(value, 0, 100)
   
   // Parse percentage
   const percentage = pct('15%') // Returns 15
   ```

2. Add **Usage Guidelines** section:
   - **When to use design tokens** - Always use tokens for consistency
   - **Layout engine best practices** - Define schemas at module level, reuse presets
   - **Component composition** - Combine components for complex UIs
   - **Round screen considerations** - Always use `roundSafeInset` for side content
   - **Performance tips** - Avoid recalculating layouts, cache resolved layouts
   - **Common pitfalls** - Not using tokens, manual positioning, ignoring round screens

3. Add **Examples** section with complete working examples:
   - **Example 1: Simple Page with Header and Footer**
     - Complete code showing standard page layout
     - Link to `page/settings.js` for reference
   
   - **Example 2: Form-like Layout with Options**
     - Complete code showing option selection
     - Link to `page/setup.js` for reference
   
   - **Example 3: Complex Layout with Multiple Sections**
     - Complete code showing game screen layout
     - Link to `page/game/ui-binding.js` for reference
   
   - **Example 4: Two-Column Layout**
     - Complete code showing two-column layout
     - Use case: comparison views

4. Add **Troubleshooting** section:
   - Common errors and solutions
   - Debug tips (console.log resolved layouts)
   - How to test on round vs square screens

**Validation:**
- ✅ All screen utilities documented
- ✅ Usage guidelines are practical and actionable
- ✅ Examples are complete and runnable
- ✅ Links to actual page files are correct
- ✅ Troubleshooting section covers common issues

**Estimated time:** 25 minutes

---

## Validation

### Success Criteria
1. ✅ **File created**: `docs/UI-SYSTEM.md` exists as valid Markdown
2. ✅ **Design tokens documented**: All tokens from `utils/design-tokens.js` listed with values and usage
3. ✅ **Layout engine documented**: Schema, positioning modes, presets explained
4. ✅ **UI components documented**: Each widget factory function has entry with parameters and examples
5. ✅ **Screen utilities documented**: Functions described with examples
6. ✅ **Accuracy**: Token values and function parameters match current implementation
7. ✅ **Example code**: Code snippets match expected function signatures
8. ✅ **Links**: Links to `page/` examples resolve correctly
9. ✅ **Usability**: An unfamiliar developer can implement a simple page using only the doc

### Checkpoints

#### Checkpoint 1: After Step 1 (Overview Complete)
- [ ] File structure matches template
- [ ] Overview provides clear context
- [ ] Quick Start example is complete and runnable
- [ ] Round screen handling explained

#### Checkpoint 2: After Step 2 (Design Tokens Complete)
- [ ] All color tokens documented with hex values
- [ ] All typography tokens documented with calculations
- [ ] All spacing tokens documented
- [ ] All sizing tokens documented
- [ ] Helper functions documented with examples

#### Checkpoint 3: After Step 3 (Layout System Complete)
- [ ] Schema structure clearly documented
- [ ] All positioning modes explained
- [ ] All layout presets documented
- [ ] Round screen handling detailed
- [ ] Standard page structure example complete

#### Checkpoint 4: After Step 4 (UI Components Complete)
- [ ] `createBackground()` documented
- [ ] `createText()` documented
- [ ] `createButton()` documented with all variants
- [ ] `createDivider()` documented
- [ ] All examples are accurate and copy-pasteable

#### Checkpoint 5: After Step 5 (Complete Documentation)
- [ ] Screen utilities documented
- [ ] Usage guidelines are practical
- [ ] At least 4 complete examples provided
- [ ] Links to actual pages are correct
- [ ] Troubleshooting section exists

#### Final Validation: Usability Test
- [ ] Read documentation as if new to the project
- [ ] Can create a simple page without looking at source code
- [ ] All referenced functions and tokens are documented
- [ ] No broken links or missing examples

---

## Rollback and Mitigation

### Risk: Documentation becomes outdated
**Mitigation:**
- Add note in documentation header to update when code changes
- Include last updated date
- Link to source files for verification

### Risk: Examples don't match actual implementation
**Mitigation:**
- Copy examples directly from actual page files
- Test code snippets mentally against source
- Include source file references for verification

### Risk: Documentation is too long/complex
**Mitigation:**
- Use progressive disclosure (overview → examples → reference)
- Provide Quick Start for immediate productivity
- Use collapsible sections for detailed reference (if supported)

### Risk: New developers still struggle
**Mitigation:**
- Add "Next Steps" section linking to actual page implementations
- Provide "Common Patterns" section with real-world examples
- Include troubleshooting section for common issues

---

## Estimated Total Time
- Step 1: 15 minutes
- Step 2: 20 minutes
- Step 3: 30 minutes
- Step 4: 25 minutes
- Step 5: 25 minutes
- **Total: ~2 hours**

---

## Notes

### Design Decisions
1. **User-centric structure** over file-centric to match learning path
2. **Progressive disclosure** to avoid overwhelming new developers
3. **Practical examples** from actual pages to build confidence
4. **Comprehensive reference** for detailed lookups when needed

### Maintenance Considerations
- Update documentation when adding new tokens or components
- Keep examples in sync with page implementations
- Add new examples when new patterns emerge
- Review documentation during code reviews

### Success Metrics
- New developer can create first page in < 30 minutes
- Documentation reduces onboarding questions
- Examples are copied without modification
- No confusion about token or component usage
