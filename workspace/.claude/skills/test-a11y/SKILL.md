---
name: test-a11y
description: |
  Test accessibility (WCAG A/AA): keyboard navigation, focus indicators,
  ARIA attributes, alt text, heading hierarchy, color contrast,
  screen reader landmarks.
  TRIGGER when: testing accessibility, a11y, WCAG, keyboard nav, or screen reader support.
argument-hint: "<project-slug> <page-url>"
---

# Test A11y

Run WCAG A/AA accessibility audit on a page using agent-browser accessibility snapshots.

## Inputs

- **Project slug**: from parent context or `$ARGUMENTS`
- **Page URL**: specific page to audit
- **Login state**: from parent context (if page requires auth)

## Steps

1. Navigate to page: `agent-browser open <url>`
2. Take accessibility snapshot: `agent-browser snapshot -i`
3. Take compact snapshot: `agent-browser snapshot -c`
4. Screenshot the page

### Heading Hierarchy
5. Check heading structure from compact snapshot
6. Verify h1 exists and appears before h2
7. Check for skipped heading levels (e.g., h1 -> h3 with no h2)
8. Verify only one h1 per page

### Image Alt Text
9. Identify all images from the snapshot
10. Check each image for alt attribute
11. Verify alt text is descriptive (not just "image" or empty)
12. Decorative images should have `alt=""`
13. Screenshot any images with missing/inadequate alt text

### Keyboard Navigation
14. Press Tab repeatedly to navigate through the page
15. Verify focus indicator is visible on each interactive element
16. Check tab order follows visual layout (logical, not random)
17. Verify no keyboard traps (can tab into AND out of every element)
18. Screenshot any elements with missing focus indicators

### ARIA Landmarks
19. Check for landmark roles: main, nav, header/banner, footer/contentinfo
20. Verify at least `main` and `nav` landmarks exist
21. Check labels for multiple landmarks of the same type

### Form Labels
22. Identify all form inputs from the snapshot
23. Verify every input has an associated label
24. Check that labels are descriptive
25. Screenshot any unlabeled inputs

### Color Contrast
26. Examine text against backgrounds in the screenshot
27. Flag any text that appears low-contrast (light gray on white, etc.)
28. Pay special attention to placeholder text and disabled states

### Skip Navigation
29. Check for a "skip to content" link (first focusable element)
30. If header is long, absence of skip link is a finding

### Modal/Dialog Focus
31. If modals exist, open one
32. Verify focus moves into the modal
33. Verify focus is trapped within the modal while open
34. Verify focus returns to trigger element when closed

## Outputs

Return findings array in standard JSON schema with `"category": "accessibility"`.

## Guards

- `uat-testing.md`: every violation needs screenshot evidence

## Self-Improvement

After execution:
- Log violations by type (heading, alt, focus, contrast, ARIA, landmarks, labels)
- Track which check types find the most issues on this project
- If a check type consistently finds nothing across 3+ pages, note the clean area
- If a new accessibility pattern is found, add steps to cover it
