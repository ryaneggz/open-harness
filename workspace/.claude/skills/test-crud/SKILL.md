---
name: test-crud
description: |
  Test CRUD operations: create, read, update, delete.
  Verify data persistence, optimistic UI, error recovery, empty states.
  TRIGGER when: testing create, read, update, delete, data operations, or database interactions.
argument-hint: "<project-slug> <crud-page-url>"
---

# Test CRUD

Test create, read, update, and delete operations for data integrity and UX.

## Inputs

- **Project slug**: from parent context or `$ARGUMENTS`
- **CRUD page URL**: page with CRUD operations (list view, detail view, or form)
- **Login state**: from parent context (if CRUD requires auth)

## Steps

1. Navigate to the CRUD page: `agent-browser open <url>`
2. Screenshot the initial state
3. Take accessibility snapshot: `agent-browser snapshot -i`

### Empty State
4. If no data exists, check the empty state
5. Verify it's user-friendly (not blank — has a message or call to action)
6. Screenshot the empty state

### Create
7. Find and click the "create" / "add" / "new" button
8. Fill the form with valid data
9. Screenshot before submit
10. Submit the form
11. Verify the new item appears in the list/view
12. Screenshot after creation
13. Verify success feedback (toast, message, or redirect)

### Read
14. Click on the created item to view its details
15. Verify all fields display correctly
16. Screenshot the detail view
17. Navigate back to the list — verify the item is still there

### Update
18. Find and click the "edit" button on the item
19. Change one or more fields
20. Screenshot before save
21. Save the changes
22. Verify changes are reflected in the view
23. Screenshot after update
24. Refresh the page — verify changes persisted (not just optimistic UI)

### Delete
25. Find and click the "delete" button
26. Verify a confirmation dialog appears (no accidental deletion)
27. Screenshot the confirmation dialog
28. Confirm deletion
29. Verify the item is removed from the list
30. Screenshot after deletion

### Error States
31. Try creating with duplicate/invalid data — verify error handling
32. If applicable, try deleting an item that has dependencies
33. Screenshot error states

## Outputs

Return findings array in standard JSON schema.

## Guards

- `uat-testing.md`: user story format required, screenshot evidence

## Self-Improvement

After execution:
- Log which CRUD operations existed vs. which were missing
- If delete has no confirmation dialog, that's a high-severity finding pattern
- If data doesn't persist after refresh, that's critical — note the pattern
- Track common CRUD anti-patterns across projects
