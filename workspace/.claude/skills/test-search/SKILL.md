---
name: test-search
description: |
  Test search, filter, sort, pagination, empty states,
  no-results handling, URL parameter persistence.
  TRIGGER when: testing search, filter, sort, pagination, or list views.
argument-hint: "<project-slug> <search-page-url>"
---

# test-search

Test search, filter, sort, and pagination functionality. Verify results accuracy, empty states, URL parameter persistence, and loading behavior.

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| `project-slug` | yes | Project identifier used to resolve config |
| `search-page-url` | yes | URL of the page with search, filter, sort, or pagination |
| `login-state` | no | If `authenticated`, assumes the agent is already logged in before navigating |

## Steps

1. **Navigate to the search/list page.** Run `agent-browser navigate <search-page-url>`. Take a screenshot: `agent-browser screenshot search-initial`. Take an accessibility snapshot: `agent-browser snapshot -i` to discover search inputs, filter controls, sort options, and pagination elements.
2. **Test search with a known term.** Enter a search term that is expected to return results (based on visible data or known test data). Submit the search. Verify:
   - Results appear and are relevant to the search term.
   - The result count or total is displayed (if applicable).
   - The search term is reflected in the input field.
   Screenshot: `agent-browser screenshot search-valid-results`.
3. **Test search with no results.** Enter a gibberish search term (e.g., `xyzzy99999qqq`). Submit the search. Verify:
   - A "no results" message is displayed.
   - The message is user-friendly (not a blank page, not a raw error).
   - A suggestion to modify the search or clear filters is shown (if applicable).
   Screenshot: `agent-browser screenshot search-no-results`.
4. **Test filters (if present).** For each filter control (dropdowns, checkboxes, date ranges, toggles):
   - Apply the filter.
   - Verify the results update to match the filter criteria.
   - Verify the active filter is visually indicated (badge, highlight, chip).
   - Verify the result count changes appropriately.
   Screenshot after each filter: `agent-browser screenshot search-filter-<filter-name>`.
5. **Test combining filters.** Apply two or more filters simultaneously. Verify:
   - Results satisfy ALL active filters (AND logic, unless the UI specifies OR).
   - Each active filter is shown and individually removable.
   Screenshot: `agent-browser screenshot search-combined-filters`.
6. **Test sort (if present).** For each sort option (e.g., newest, oldest, A-Z, Z-A, price low-high):
   - Click the sort control.
   - Verify the result order changes according to the sort criterion.
   - Verify the active sort option is visually indicated.
   Screenshot: `agent-browser screenshot search-sort-<sort-name>`.
7. **Test pagination (if present).** If the list has pagination controls:
   - Click "Next" or page 2. Verify new items load and page 1 items are no longer shown.
   - Click "Previous" or page 1. Verify original items return.
   - Click the last page. Verify it loads with items (not empty).
   - Verify the current page indicator is correct.
   Screenshot: `agent-browser screenshot search-pagination-page-<n>`.
8. **Check URL parameter persistence.** After applying search, filters, and sort:
   - Inspect the URL for query parameters (e.g., `?q=term&filter=value&sort=newest&page=2`).
   - Verify that search term, filters, sort, and page number are reflected in the URL.
   Screenshot the URL bar state: `agent-browser screenshot search-url-params`.
9. **Test page refresh with parameters.** With search/filter/sort parameters in the URL, refresh the page: `agent-browser navigate <current-url-with-params>`. Verify:
   - The search term is restored in the input field.
   - Filters are restored to their active state.
   - Sort order is preserved.
   - Pagination returns to the same page.
   Screenshot: `agent-browser screenshot search-refresh-restored`.
10. **Test clearing search and filters.** If a "Clear" / "Reset" button exists:
    - Click it.
    - Verify all filters are removed, search input is cleared, sort returns to default.
    - Verify the result list shows the default/unfiltered view.
    If no clear button exists, manually clear the search input and remove each filter. Verify same behavior. Screenshot: `agent-browser screenshot search-cleared`.
11. **Check loading states.** During search submission and filter changes:
    - Verify a loading indicator appears (spinner, skeleton, progress bar).
    - Verify the UI does not flash or flicker during the transition.
    - Verify results do not show stale data from a previous query.
12. **Test edge cases.**
    - Search with special characters (`<script>`, `' OR 1=1`, `%00`). Verify no errors and input is sanitized.
    - Search with very long input (500+ characters). Verify no layout breakage.
    - Rapidly change filters or submit searches. Verify no race conditions (wrong results displayed).
    Screenshot any issues: `agent-browser screenshot search-edge-<case>`.

## Outputs

Produce a `findings` array. Each element follows this schema:

```json
{
  "id": "search-<sequential-number>",
  "skill": "test-search",
  "project": "<project-slug>",
  "severity": "critical | high | medium | low",
  "component": "search | filter | sort | pagination | url-params",
  "title": "Short description of the finding",
  "description": "Detailed explanation of what was observed vs. expected",
  "step": <step-number>,
  "screenshot": "<path-to-screenshot>",
  "url": "<page-url-at-time-of-finding>",
  "timestamp": "<ISO-8601>"
}
```

Severity guide:
- **critical**: Search returns no results for valid terms, filters cause crash, pagination shows duplicate or missing items, XSS vulnerability via search input.
- **high**: No "no results" state (blank page), filters do not update results, sort does not change order, URL params lost on refresh.
- **medium**: Loading states missing, combined filters behave incorrectly (OR instead of AND), pagination count is wrong, clear/reset does not fully reset.
- **low**: Minor loading flicker, filter indicator styling inconsistency, sort default not clearly indicated, cosmetic issues in pagination controls.

## Guard

Constraints enforced by:
- `.claude/rules/uat-testing.md` — testing standards, finding severity definitions

## Self-Improvement

After each execution of this skill:

1. **Log step outcomes.** For each step, record whether it found an issue or passed clean.
2. **Flag inactive steps.** If a step has passed clean for 3+ consecutive runs across any project, flag it as a candidate for removal or demotion to a "spot check" cadence.
3. **Add new patterns.** If a finding reveals a pattern not covered by the current steps (e.g., infinite scroll instead of pagination, typeahead/autocomplete, faceted search, saved searches, recent searches), append a new numbered step to this skill targeting that pattern.
4. **Update severity calibration.** If findings at a given severity are consistently overridden during review, adjust the severity guide above.
