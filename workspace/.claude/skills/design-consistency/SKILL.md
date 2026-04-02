---
name: design-consistency
description: |
  Validate that power, cooling, space, and cost figures are consistent across
  all 14 plan documents and the parametric model.
  TRIGGER when: before creating a PR, after editing any plan document,
  during design review heartbeats, or when user asks to check consistency.
---

# Design Consistency Check

Validate that specifications across all plan documents and the 3D model are internally consistent.

## Instructions

1. Read all 14 plan documents from ~/workspace/ai-datacenter-designer/plans/
2. Extract key figures from each document into a comparison table
3. Check all cross-document consistency gates

## Gates

| Gate | Rule | Check |
|---|---|---|
| **Power budget** | Total allocated power <= facility capacity per phase | Sum power allocations across plans, compare to 00-overview capacity |
| **Cooling capacity** | Cooling capacity >= 1.1x power load (safety margin) | Compare cooling plan totals to power plan totals |
| **Space allocation** | Total allocated sqft <= facility footprint per phase | Sum space claims across plans |
| **Cost coherence** | Line items sum to stated totals | Cross-check cost tables with summary |
| **Phase alignment** | Phase boundaries consistent across all docs | Same phase definitions in overview, phasing doc, and each subsystem plan |
| **Redundancy claims** | Stated redundancy levels achievable with specified equipment | N+1 means at least N+1 units specified |
| **PUE feasibility** | Claimed PUE achievable given cooling approach | PUE = Total Facility Power / IT Load |

## Output Format

```
DESIGN CONSISTENCY CHECK (as of YYYY-MM-DD)
=============================================
Power Budget:     [PASS/FAIL] Allocated X MW of Y MW capacity (Phase N)
Cooling Match:    [PASS/FAIL] Cooling X MW vs Power X MW (ratio: X.Xx)
Space Allocation: [PASS/FAIL] Allocated X sqft of Y sqft
Cost Coherence:   [PASS/FAIL] Line items sum to $X vs stated $Y
Phase Alignment:  [PASS/FAIL] N documents with consistent phase boundaries
Redundancy:       [PASS/FAIL] All claims verified
PUE Feasibility:  [PASS/FAIL] Calculated PUE: X.XX vs target < 1.10

Overall Gate: PASS/FAIL
Discrepancies: [list any specific conflicts found]
```
