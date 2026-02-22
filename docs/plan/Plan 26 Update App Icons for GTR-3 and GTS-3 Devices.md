# Plan 26 Update App Icons for GTR-3 and GTS-3 Devices

## Task Analysis
- Main objective: Replace placeholder app icons with production-quality icons that comply with Zepp OS design specifications for both GTR-3 (round) and GTS-3 (rectangular) device targets, improving app store presentation and user recognition.
- Identified dependencies:
  - Zepp OS icon design specification (248×248px with 4px transparent safe area)
  - Existing icon assets at `assets/gtr-3/icon.png` and `assets/gts-3/icon.png`
  - Design tooling for icon creation (e.g., Figma, Illustrator, or image editor)
  - `app.json` configuration references `"icon": "icon.png"` per target
- System impact: Low-risk asset replacement only; no code changes required. Icons are purely visual resources used in app listing and app drawer on the watch.

## Chosen Approach
- Proposed solution: Create a single 248×248px circular icon following Zepp OS design guidelines, then deploy identical copies to both device target folders (`assets/gtr-3/icon.png` and `assets/gts-3/icon.png`). Additionally, preserve a reference copy in `docs/images/icon-sample.png` for documentation purposes.
- Justification for simplicity:
  - **Rejected approach A (device-specific icons)**: Creating separate round/square-adapted icons would be overengineered since Zepp OS uses the same circular icon across all devices, applying device-specific masking automatically.
  - **Rejected approach B (multiple sizes)**: Generating multiple icon sizes (store icon vs app icon) is unnecessary for development builds; the 248×248px specification covers the primary use case.
  - **Selected approach**: Single source icon deployed to both targets ensures consistency, reduces maintenance burden, and follows Zepp OS conventions.
- Components to be modified/created:
  - `assets/gtr-3/icon.png` (replace)
  - `assets/gts-3/icon.png` (replace)
  - `docs/images/icon-sample.png` (new - reference copy)

## Implementation Steps

### 1. Preflight Verification
- Verify current icon assets exist and note their sizes (placeholder icons expected to be small, ~1-2KB)
- Confirm `app.json` references `icon.png` correctly for both targets
- Review Zepp OS icon specification requirements

### 2. Icon Design Requirements Checklist
Design a new icon following Zepp OS specifications:
- **Dimensions**: 248×248px total canvas
- **Content area**: 240×240px centered graphic
- **Safe area**: 4px transparent margin on all sides
- **Shape**: Circular background (no square/rectangular backgrounds)
- **Format**: PNG with transparency
- **Content restrictions**:
  - No solid black backgrounds
  - No partial transparency in graphics
  - Main graphic must not exceed circular background area
- **Theme**: Padel-themed design (paddle, ball, court elements) aligned with app branding

### 3. Create Icon Asset
- Design icon using image editing tool (Figma, Photoshop, or similar)
- Export as PNG-24 with transparency at 248×248px
- Verify file output meets specification (file size typically 10-50KB for quality icons)

### 4. Deploy Icons to Device Targets
- Replace `assets/gtr-3/icon.png` with new icon
- Replace `assets/gts-3/icon.png` with identical copy
- Verify both files have matching content (checksum comparison)

### 5. Add Documentation Reference
- Copy icon to `docs/images/icon-sample.png` for documentation purposes
- Ensures design reference is available for future updates or team members

### 6. Build and Visual Verification
- Run `zeus build` to verify build succeeds with new icons
- Launch GTR-3 simulator and verify icon displays correctly in app drawer
- Launch GTS-3 simulator and verify icon displays correctly in app drawer
- Check icon appearance against Zepp OS system icons for consistency

### 7. Commit Changes
- Stage all icon changes
- Commit with message: `chore: update device icons and add sample icon to docs`
- Verify commit includes all three file changes

## Validation
- Success criteria:
  - Both `assets/gtr-3/icon.png` and `assets/gts-3/icon.png` are replaced with new design
  - Icons are 248×248px PNG files with proper transparency
  - `docs/images/icon-sample.png` exists as reference copy
  - Build succeeds without errors (`zeus build`)
  - Icons render correctly in both GTR-3 and GTS-3 simulators
  - File size increase indicates proper design (from ~1.7KB placeholder to ~12KB+ production icon)

- Checkpoints:
  - **Pre-implementation**: Confirm placeholder icons exist and build works
  - **Post-design**: Verify icon meets 248×248px spec with 4px safe area
  - **Post-deployment**: Run `zeus build` and check for asset packaging errors
  - **Visual verification**: Inspect icon in both simulator environments
  - **Final regression**: Confirm app launches and functions identically to before

- Risks and mitigations:
  - **Risk**: Icon dimensions incorrect causing display issues
    - **Mitigation**: Use exact 248×248px canvas and verify with image properties
  - **Risk**: Transparency issues causing visual artifacts
    - **Mitigation**: Export as PNG-24 with alpha channel, test on dark/light backgrounds
  - **Risk**: Build failure due to corrupted asset
    - **Mitigation**: Verify PNG integrity before commit, use `zeus build` as validation gate
