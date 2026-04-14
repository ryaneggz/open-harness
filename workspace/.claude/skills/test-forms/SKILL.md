---
name: test-forms
description: |
  Test form validation: empty submit, invalid input, boundary values,
  submit success/error, multi-step forms, file upload.
  TRIGGER when: testing forms, input validation, or form submission.
argument-hint: "<project-slug> <form-page-url>"
---

# Test Forms

Test form validation, submission, and error handling for correctness and UX.

## Inputs

- **Project slug**: from parent context or `$ARGUMENTS`
- **Form page URL**: page containing the form to test
- **Login state**: from parent context (if form requires auth)

## Steps

1. Navigate to form page: `agent-browser open <url>`
2. Screenshot the form
3. Take accessibility snapshot: `agent-browser snapshot -i` to identify all fields

### Empty Submit
4. Click submit without filling any fields
5. Verify validation messages appear for required fields
6. Screenshot validation state — check messages are helpful and specific

### Invalid Data Per Field Type
7. Email fields: enter "notanemail" — verify email validation
8. Number fields: enter "abc" — verify number validation
9. Required fields: leave empty — verify required validation
10. Password fields: enter short/weak password — verify strength requirements
11. Screenshot each validation error

### Boundary Values
12. Test max length inputs — paste a very long string
13. Test min/max number values if applicable
14. Test special characters in text fields
15. Screenshot any unexpected behavior

### Valid Submit
16. Fill all fields with valid data
17. Screenshot before submit
18. Click submit
19. Verify success state (confirmation message, redirect, or data appears)
20. Screenshot after successful submit
21. Check for loading/disabled states during submission

### Multi-Step Forms (if applicable)
22. Test forward navigation between steps
23. Test backward navigation — does data persist?
24. Test skipping steps — is it prevented?
25. Screenshot each step

### File Upload (if applicable)
26. Test submit without selecting a file
27. Test with an unsupported file type
28. Test with a valid file
29. Screenshot each state

## Outputs

Return findings array in standard JSON schema.

## Guards

- `uat-testing.md`: screenshot before/after each submit
- `agent-browser.md`: wait for page load before capture

## Self-Improvement

After execution:
- Log which validation types were tested and which found issues
- If a form has no validation at all, that's likely a high-severity finding
- If multi-step or file upload patterns are common, consider splitting into sub-skills
- Flag steps that consistently find nothing for review
