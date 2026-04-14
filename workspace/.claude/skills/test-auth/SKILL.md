---
name: test-auth
description: |
  Test authentication flows: login, logout, registration, password reset,
  session persistence, protected route access.
  TRIGGER when: testing auth, login page, registration, or session management.
argument-hint: "<project-slug> <auth-page-url>"
---

# Test Auth

Test all authentication flows for correctness, security, and user experience.

## Inputs

- **Project slug**: from parent context or `$ARGUMENTS`
- **Auth page URL**: login page URL (or auto-discovered from test-plan.md)
- **Login state**: credentials from MEMORY.md or user-provided

## Steps

1. Navigate to login page: `agent-browser open <url>`
2. Screenshot the login page
3. Take accessibility snapshot: `agent-browser snapshot -i`

### Login — Valid Credentials
4. Fill username/email and password fields using refs from snapshot
5. Screenshot before submit
6. Click submit
7. Verify redirect to dashboard/home — check URL and page content
8. Screenshot after login success

### Login — Invalid Credentials
9. Navigate back to login page
10. Fill invalid credentials (wrong password)
11. Submit and verify error message appears
12. Screenshot the error state — verify message is helpful (not just "Error")

### Logout
13. Find and click logout button/link
14. Verify redirect to login page or home
15. Screenshot after logout

### Registration (if exists)
16. Navigate to registration page, screenshot
17. Test empty submit — verify validation messages
18. Test with invalid email format
19. Test with weak password — verify strength requirements
20. Test successful registration with valid data
21. Screenshot each state

### Password Reset (if exists)
22. Navigate to password reset page
23. Test with valid email — verify confirmation message
24. Test with invalid/unregistered email — verify appropriate response
25. Screenshot each state

### Protected Routes
26. Logout first (ensure unauthenticated state)
27. Navigate directly to a protected route (e.g., /dashboard, /settings)
28. Verify redirect to login page
29. Screenshot the redirect behavior

### Session Persistence
30. Login with valid credentials
31. Navigate to several pages — verify auth state persists
32. Note if "remember me" checkbox exists and test its behavior

## Outputs

Return findings array in standard JSON schema with `"category": "broken-flow"` or `"ux-issue"`.

## Guards

- `multi-project.md`: must target a registered project
- `uat-testing.md`: screenshot before/after, user story format, evidence required

## Self-Improvement

After execution:
- Log which auth flows existed vs. which were missing
- If login always succeeds on first try, this project's auth is solid — note in MEMORY.md
- If a new auth pattern is found (e.g., OAuth, MFA), add steps to handle it
- Flag steps that consistently find nothing across 3+ runs for review
