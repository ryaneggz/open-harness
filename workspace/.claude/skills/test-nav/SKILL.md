---
name: test-nav
description: |
  Test navigation: all links resolve, breadcrumbs, footer links,
  404 handling, back/forward behavior.
  TRIGGER when: testing navigation, links, routing, or 404 pages.
argument-hint: "<project-slug> <start-page-url>"
---

# Test Navigation

Test that all navigation elements work correctly and no links are broken.

## Inputs

- **Project slug**: from parent context or `$ARGUMENTS`
- **Start page URL**: page to begin navigation testing from
- **Login state**: from parent context (if pages require auth)

## Steps

1. Navigate to start page: `agent-browser open <url>`
2. Take accessibility snapshot: `agent-browser snapshot -i` to discover all links
3. Screenshot the page with navigation visible

### Primary Navigation
4. Click each top-level navigation link
5. For each: verify it loads without error (no 404, no 500, no blank page)
6. Screenshot any broken links
7. Check active state indicator highlights correctly

### Footer Links
8. Scroll to footer
9. Click each footer link — verify they resolve correctly
10. Screenshot any broken links

### Breadcrumbs (if present)
11. Navigate to a deep page
12. Verify breadcrumb trail is accurate
13. Click each breadcrumb segment — verify correct navigation
14. Screenshot the breadcrumb behavior

### 404 Page
15. Navigate to a known-bad URL (e.g., `/this-page-does-not-exist`)
16. Verify a 404 page is shown (not blank or generic error)
17. Check 404 page is user-friendly (has nav back, search, or home link)
18. Screenshot the 404 page

### Browser History
19. Navigate through several pages
20. Click browser back — verify correct page loads
21. Click browser forward — verify correct page loads
22. Note any pages that break back/forward behavior

## Outputs

Return findings array in standard JSON schema.

## Guards

- `agent-browser.md`: wait for page load before capture
- `uat-testing.md`: screenshot evidence for all broken links

## Self-Improvement

After execution:
- Log total links checked vs. broken
- If broken link rate is high (>10%), note it as a systemic issue
- If 404 page is missing entirely, that's a high-severity finding pattern
- Flag navigation checks that consistently pass for review
