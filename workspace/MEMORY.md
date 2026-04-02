# MEMORY.md — Long-Term Memory

## Decisions & Preferences

### Git Workflow
- Project: ~/workspace/ai-datacenter-designer/ (clone of shpeedle/ai-datacenter-designer)
- Default branch: main
- Feature branches: `design/<topic>` (e.g., `design/cooling-optimization`, `design/viewer-upgrade`)
- Commit format: `<type>: <description>` (feat, fix, docs, refactor)

### Design Parameters (from plans)
- Facility: 50MW initial (Phase 1), expandable to 200MW across 4 phases
- GPU count: ~20,000 total (NVIDIA GB200 NVL72 or equivalent)
- PUE target: < 1.10 (industry-leading, direct liquid cooling)
- Redundancy: Tier III+ minimum
- 14 plan documents in plans/ directory (00-overview through 13-phases)
- 3D model: model_datacenter.py (~700 lines, FreeCAD Python API)
- Viewer: viewer.html (HTML/CSS/JS interactive plan viewer)
- Output: STL files + dc_viewer.html in output/

### FreeCAD Status
- FreeCAD NOT installed in container
- Can review/refactor Python code but cannot execute to generate STL
- model_datacenter.py uses FreeCAD Part, Mesh modules

## Lessons Learned

_(populated as agent operates)_

## Project Context

### Repository Structure
```
ai-datacenter-designer/
├── README.md
├── model_datacenter.py       # FreeCAD Python script (~700 lines)
├── viewer.html               # Interactive plan viewer
├── plans/                    # 14 markdown design docs
│   ├── 00-overview.md        # Design overview, principles, dependency graph
│   ├── 01-site-selection.md  # Geographic, climate, utility considerations
│   ├── 02-power.md           # Grid connection, on-site generation, PDU design
│   ├── 03-cooling.md         # Direct liquid cooling, CDU placement, heat recovery
│   ├── 04-network.md         # InfiniBand fabric, switch topology, connectivity
│   ├── 05-compute.md         # GPU rack specs, containment, cabling
│   ├── 06-storage.md         # NVMe, NAS, archive tiers
│   ├── 07-layout.md          # Physical floor plan, aisle arrangement
│   ├── 08-redundancy.md      # HA design, fault tolerance, SLAs
│   ├── 09-security.md        # Physical, network, access control
│   ├── 10-sustainability.md  # Emissions, waste heat reuse, renewables
│   ├── 11-cost-model.md      # CapEx, OpEx, per-rack breakdowns
│   ├── 12-3d-visualization.md# 3D model details and export info
│   └── 13-phases.md          # Implementation roadmap
└── output/                   # Generated STL files + dc_viewer.html
```

### Key Constraints
- Power budget: 50MW Phase 1, 200MW at full build-out
- PUE target: < 1.10
- Cooling: Direct liquid cooling (air cooling cannot support >70 kW/rack density)
- Network: Full-bisection InfiniBand for all-to-all GPU communication
- Phasing: 4 phases, each independently operational (50MW self-contained halls)
- On-site power: 12 natural gas generators + utility grid
