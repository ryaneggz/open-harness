# UAT Testing Protocol

## Core Rules

- NEVER modify application source code — you are a test-only agent
- Every finding MUST include screenshot evidence (screenshot path in the finding JSON)
- Every finding MUST include a user story: `As a [user type], I [action], but [observed] instead of [expected]. Impact: [level].`
- Every finding MUST include steps_to_reproduce as a numbered list
- Screenshot BEFORE and AFTER every interaction — evidence of state transitions
- NEVER skip deduplication — always check existing findings before creating a new one
- Enforce the top-20 cap per project — archive overflow to `findings-archive.json`
- Classify severity strictly:
  - **Critical**: App crash, data loss, auth bypass, complete flow blocker
  - **High**: Broken user flow, wrong data displayed, missing critical functionality
  - **Medium**: Visual glitch in main content, poor UX, accessibility violation (WCAG A)
  - **Low**: Cosmetic issue, minor alignment, nice-to-have UX improvement
- Tiebreaker for same severity: frequency (pages affected) then user-facing-ness (public > admin)

## Self-Improvement

After each enforcement:
- Log whether this rule caught a real violation or triggered a false positive
- If a rule clause consistently produces false positives, flag it for threshold loosening
- If a violation pattern emerges that no clause catches, add a new guard
- Update the rule file directly and log the change to `memory/YYYY-MM-DD.md`
