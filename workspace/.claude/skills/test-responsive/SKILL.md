---
name: test-responsive
description: |
  Test responsive layout across 3 viewports: desktop (1920x1080),
  tablet (768x1024), mobile (375x812). Check for layout breakage,
  text overflow, touch targets, image scaling.
  TRIGGER when: testing responsive, mobile, tablet, viewport, or layout.
argument-hint: "<project-slug> <page-url>"
---

# Test Responsive

Test that pages render correctly across desktop, tablet, and mobile viewports.

## Inputs

- **Project slug**: from parent context or `$ARGUMENTS`
- **Page URL**: specific page to test
- **Login state**: from parent context (if page requires auth)

## Steps

For each viewport in order: desktop (1920x1080), tablet (768x1024), mobile (375x812):

1. Set viewport: `agent-browser set viewport <width> <height>`
2. Navigate to page (or refresh): `agent-browser open <url>`
3. Wait for page load
4. Screenshot: `uat/<slug>/screenshots/YYYY-MM-DD/<page>-<viewport>.png`

### Layout Checks
5. Check for horizontal scrollbar — indicates layout overflow
6. Check that content doesn't extend beyond viewport width
7. Verify main content area uses available width appropriately

### Text Checks
8. Check for text truncation — is critical info cut off?
9. Check for text overflow outside containers
10. Verify font sizes are readable at each viewport

### Navigation
11. On mobile: verify navigation collapses to hamburger/drawer
12. On tablet: check if navigation adapts or stays desktop-style
13. Test opening/closing mobile navigation if applicable

### Touch Targets (mobile/tablet)
14. Check interactive elements are minimum 44x44px on touch viewports
15. Verify buttons and links have adequate spacing
16. Check that hover-only interactions have touch alternatives

### Images
17. Check images scale appropriately — no overflow, not too small
18. Verify images don't cause layout shift on load
19. Check for images that disappear entirely at small viewports

### Modals/Dialogs
20. If modals exist, open one at each viewport
21. Verify modal fits within the viewport
22. Check that modal content is scrollable if it overflows

## Outputs

Return findings array in standard JSON schema with viewport noted.

## Guards

- `agent-browser.md`: viewport naming convention (`<flow>-<step>-<viewport>.png`)
- `uat-testing.md`: screenshot at every viewport

## Self-Improvement

After execution:
- Log which viewport finds the most issues (usually mobile)
- If a specific element breaks at every viewport, it's likely a CSS issue — note pattern
- If mobile is consistently clean, reduce mobile checks in future runs
- Track which layout patterns cause the most issues across projects
