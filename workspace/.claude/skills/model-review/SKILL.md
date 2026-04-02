---
name: model-review
description: |
  Review model_datacenter.py for code quality, parametric correctness,
  and alignment with plan specifications.
  TRIGGER when: before creating a PR that touches the model, during
  code review heartbeats, or when user asks about model quality.
---

# Model Review

Review the FreeCAD parametric model for code quality and specification alignment.

## Instructions

1. Read ~/workspace/ai-datacenter-designer/model_datacenter.py
2. Read relevant plan documents for dimensional/parameter references
3. Evaluate against all review criteria

## Review Criteria

| Criterion | Check |
|---|---|
| **Parameter extraction** | All magic numbers extracted to named constants at top of file |
| **Plan alignment** | Dimensions match specifications in plan documents |
| **Modularity** | Functions are single-responsibility, < 50 lines each |
| **Error handling** | Invalid parameters caught before geometry generation |
| **Documentation** | All functions have docstrings with units |
| **Naming** | Variables use descriptive names with units (e.g., rack_height_mm) |
| **Scaling** | Model scales correctly across phase 1 (50MW) to phase 4 (200MW) |

## Output Format

```
MODEL REVIEW (as of YYYY-MM-DD)
==================================
Parameters:     [PASS/WARN/FAIL] X magic numbers remain
Plan Alignment: [PASS/WARN/FAIL] N dimensions verified, M mismatches
Modularity:     [PASS/WARN/FAIL] X functions, Y over 50 lines
Error Handling: [PASS/WARN/FAIL] X parameter validations present
Documentation:  [PASS/WARN/FAIL] X/Y functions documented
Naming:         [PASS/WARN/FAIL] X variables missing units
Scaling:        [PASS/WARN/FAIL] Phase scaling logic verified

Issues Found: [list with severity and file locations]
```
