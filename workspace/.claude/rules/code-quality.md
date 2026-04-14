# Findings Output Quality

- Every finding in `findings.json` MUST pass schema validation: id, title, severity, category, status, user_story, steps_to_reproduce, screenshot, viewport, page_url, found_date are all required fields
- User stories MUST follow the format: `As a [user type], I [action], but [observed] instead of [expected]. Impact: [level].`
- Steps to reproduce MUST be numbered, specific, and reproducible — no vague instructions like "interact with the page"
- Screenshot paths MUST follow the naming convention: `uat/<slug>/screenshots/YYYY-MM-DD/<flow>-<step>-<viewport>.png`
- Severity classification MUST match the criteria in `findings-management.md` — do not inflate or deflate
- Findings markdown report (`findings.md`) MUST be regenerated from JSON after every change — never edit it manually
- Deduplication check MUST run before registering any new finding
