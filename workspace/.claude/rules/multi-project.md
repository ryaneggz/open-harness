# Multi-Project Isolation

## Registration Required

- EVERY testing operation MUST target a registered project slug
- Projects are registered in `uat/projects.json`
- Before testing, verify the slug exists in the registry
- If slug not found, prompt the user to register it with: slug, name, URL, login instructions

## Directory Structure

Each project gets an isolated directory under `uat/<slug>/`:

```
uat/<slug>/
  findings.json           # Active top-20 findings (source of truth)
  findings.md             # Human-readable report (regenerated from JSON)
  findings-archive.json   # Overflow beyond top 20
  test-plan.md            # Discovered pages and flows
  screenshots/            # Organized by date
    YYYY-MM-DD/
```

## Isolation Rules

- NEVER cross-contaminate findings between projects
- Each project's findings.json is independent — dedup only within the same project
- Screenshots go in the project's own directory, never in a shared location
- Test plans are per-project — flows discovered in one project don't apply to another
- Heartbeat reports iterate all projects but report each independently

## Project Registry Schema

```json
{
  "projects": [
    {
      "slug": "my-app",
      "name": "My Application",
      "url": "https://my-app.example.com",
      "login_instructions": "...",
      "created": "YYYY-MM-DD"
    }
  ]
}
```

## Self-Improvement

After each enforcement:
- If a project's directory structure is missing files, auto-create them
- If cross-contamination is detected, log it as a critical rule violation
- Track how many projects are active — if the list grows, consider per-project heartbeat schedules
