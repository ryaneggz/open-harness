# Heartbeat

<!--
  The agent reads this file periodically during heartbeat cycles.
  Add tasks below for the agent to check on each cycle.
  If empty (only headers/comments), the heartbeat is skipped to save API costs.
-->

## Tasks

### LinkedIn Ghostwriter
Draft one LinkedIn post per heartbeat cycle. Goal: grow Open Harness adoption and build authority for Ruska AI services (ruska.ai/services — SMB automation in Southern Utah).

1. Read iteration memory at `memory/linkedin-ghostwriter-iterations.md` and apply past learnings
2. Read the style guide at `.claude/skills/linkedin-ghostwriter/references/style-guide.md`
3. Read `.claude/skills/linkedin-ghostwriter/references/open-harness.md` for repo context and business goal
4. Read 2 reference posts from `.claude/skills/linkedin-ghostwriter/references/posts/` for voice calibration
5. Check queue at `.claude/skills/linkedin-ghostwriter/assets/drafts/queue.md`:
   - If pending topics exist, use the first one
   - If empty, generate a fresh topic from open-harness.md narrative angles (not in "## Done")
   - Rotate content pillars: Pain→Solution, Build Log, Steal My Workflow, Honest Reflection
6. Draft the post (50-200 words). MANDATORY checklist — post MUST have ALL of:
   - [ ] Link to `github.com/ryaneggz/open-harness` or quickstart command
   - [ ] At least one proof point (number, command, file name)
   - [ ] An engagement hook (question, challenge, or "steal this")
   - [ ] Connection to a specific Open Harness feature
   - [ ] A closer NOT used in any previous draft
7. Save to `.claude/skills/linkedin-ghostwriter/assets/drafts/YYYY-MM-DD-HH-MM.md`
8. Move topic to "## Done" with draft link
9. Seed next cycle: pick a topic from a DIFFERENT content pillar than this cycle, add to "## Pending"
10. Write iteration memory to `memory/linkedin-ghostwriter-iterations.md`:
    - Timestamp, topic, content pillar used
    - Mandatory checklist pass/fail (repo link? proof point? engagement hook? OH feature? unique closer?)
    - What went well / what to improve
    - Pillar balance check: are we rotating or clustering?
    - One concrete action for next cycle
