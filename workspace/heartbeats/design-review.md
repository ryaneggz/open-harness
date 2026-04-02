# Weekly Design Review

Perform a comprehensive review of the datacenter design artifacts. Run every Wednesday.

## Tasks

1. **Pull latest**: `cd ~/workspace/ai-datacenter-designer && git pull origin main`
2. **Run design-consistency skill**: Check all 14 plans for cross-document consistency
3. **Run model-review skill**: Review model_datacenter.py for code quality and plan alignment
4. **Check viewer**: Read viewer.html and verify it references current plan structure
5. **Identify improvement opportunities**: Pick the highest-impact issue found and create a plan
6. **If actionable improvement found**:
   - Create a feature branch: `design/<topic>`
   - Make the fix (documentation update, code refactor, viewer enhancement)
   - Commit and push
   - Log what was done to memory
7. **Log summary** to `memory/YYYY-MM-DD.md`:
   - Consistency check results
   - Model review results
   - Any changes made
   - Next week's priorities
8. If nothing needs attention, reply `HEARTBEAT_OK`
