import { Type } from "typebox";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { execCmd } from "../lib/docker.js";
import { run } from "../lib/exec.js";

export const RALPH_ACTIONS = ["prd", "setup", "run", "status", "reflect", "cleanup", "pr"] as const;

export const ralphTool: ToolDefinition = {
  name: "sandbox_ralph",
  label: "Ralph",
  description:
    "Ralph autonomous agent workflow. Actions: prd (generate PRD from plan), setup (convert PRD to prd.json + draft PR), run (start Ralph loop in tmux), status (show progress), reflect (update memory from session), cleanup (lint/format/test), pr (archive + undraft PR).",
  promptSnippet: "sandbox_ralph — Ralph workflow (prd|setup|run|status|reflect|cleanup|pr)",
  parameters: Type.Object({
    name: Type.String({ description: "Sandbox name" }),
    action: Type.Union(
      [
        Type.Literal("prd"),
        Type.Literal("setup"),
        Type.Literal("run"),
        Type.Literal("status"),
        Type.Literal("reflect"),
        Type.Literal("cleanup"),
        Type.Literal("pr"),
      ],
      { description: "Ralph action" },
    ),
    iterations: Type.Optional(
      Type.Number({
        default: 200,
        description: "Max iterations for ralph run (default: 200)",
      }),
    ),
  }),

  async execute(_toolCallId, params: Record<string, unknown>) {
    const name = params.name as string;
    const action = params.action as string;
    const iterations = (params.iterations as number) ?? 200;
    const steps: string[] = [];

    try {
      switch (action) {
        case "prd": {
          steps.push("Generating PRD from plan...");
          const cmd = execCmd(
            name,
            [
              "bash",
              "-c",
              'cd ~/harness/workspace && claude --dangerously-skip-permissions -p "Read the plan files in .claude/plans/ and generate a PRD using the /prd skill. Save to tasks/"',
            ],
            { user: "sandbox", workdir: "/home/sandbox/harness/workspace" },
          );
          run(cmd);
          steps.push("PRD generated. Check tasks/ for the output.");
          break;
        }

        case "setup": {
          steps.push("Converting PRD to prd.json...");
          const convertCmd = execCmd(
            name,
            [
              "bash",
              "-c",
              'cd ~/harness/workspace && claude --dangerously-skip-permissions -p "Convert the latest PRD in tasks/ to .ralph/prd.json using the /ralph skill"',
            ],
            { user: "sandbox", workdir: "/home/sandbox/harness/workspace" },
          );
          run(convertCmd);

          steps.push("Committing PRD + prd.json and creating draft PR...");
          const prCmd = execCmd(
            name,
            [
              "bash",
              "-c",
              `cd ~/harness/workspace && git add tasks/ .ralph/prd.json .ralph/progress.txt 2>/dev/null; git commit -m "task: add PRD and prd.json for ralph" && git push -u origin HEAD && gh pr create --draft --base development --title "feat: $(jq -r .description .ralph/prd.json | head -c 60)" --body "PRD and prd.json ready for Ralph execution" 2>&1 || echo "PR may already exist"`,
            ],
            { user: "sandbox", workdir: "/home/sandbox/harness/workspace" },
          );
          run(prCmd);
          steps.push("Draft PR created. Ready for ralph run.");
          break;
        }

        case "run": {
          steps.push(`Starting Ralph loop in tmux (${iterations} iterations)...`);
          const cmd = execCmd(
            name,
            [
              "bash",
              "-c",
              `tmux new-session -d -s ralph "cd ~/harness/workspace && .ralph/ralph.sh --tool claude ${iterations}"`,
            ],
            { user: "sandbox", workdir: "/home/sandbox/harness/workspace" },
          );
          run(cmd);
          steps.push("Ralph is running in tmux session 'ralph'.");
          steps.push(`  Attach: docker exec -it ${name} tmux attach -t ralph`);
          break;
        }

        case "status": {
          const cmd = execCmd(
            name,
            [
              "bash",
              "-c",
              `cd ~/harness/workspace && echo "=== Stories ===" && jq ".userStories[] | {id, title, passes}" .ralph/prd.json 2>/dev/null || echo "No prd.json found" && echo "" && echo "=== Progress (last 20 lines) ===" && tail -20 .ralph/progress.txt 2>/dev/null || echo "No progress.txt found" && echo "" && echo "=== tmux ===" && tmux has-session -t ralph 2>/dev/null && echo "Ralph tmux session: RUNNING" || echo "Ralph tmux session: NOT RUNNING"`,
            ],
            { user: "sandbox", workdir: "/home/sandbox/harness/workspace" },
          );
          run(cmd);
          break;
        }

        case "reflect": {
          steps.push("Reflecting on session — updating memory...");
          const cmd = execCmd(
            name,
            [
              "bash",
              "-c",
              `cd ~/harness/workspace && claude --dangerously-skip-permissions -p "Read .ralph/progress.txt and .ralph/prd.json. Focus on: what would make the NEXT session better? Update MEMORY.md with actionable patterns, approaches to reuse, mistakes to avoid, and codebase insights. Append a session log to memory/$(date +%Y-%m-%d).md. Commit memory updates."`,
            ],
            { user: "sandbox", workdir: "/home/sandbox/harness/workspace" },
          );
          run(cmd);
          steps.push("Memory updated with session reflections.");
          break;
        }

        case "cleanup": {
          steps.push("Running cleanup: stage and commit any pending changes...");
          const cmd = execCmd(
            name,
            [
              "bash",
              "-c",
              `cd ~/harness/workspace && git add -A && git diff --cached --quiet || git commit -m "task: cleanup before PR submission"`,
            ],
            { user: "sandbox", workdir: "/home/sandbox/harness/workspace" },
          );
          run(cmd);
          steps.push("Cleanup complete. (Project-specific lint/test should be added per PRD.)");
          break;
        }

        case "pr": {
          steps.push("Archiving ralph run...");
          const archiveCmd = execCmd(
            name,
            [
              "bash",
              "-c",
              `cd ~/harness/workspace && BRANCH=$(jq -r .branchName .ralph/prd.json 2>/dev/null | sed 's|ralph/||') && mkdir -p .ralph/archive/$BRANCH && cp .ralph/prd.json .ralph/progress.txt .ralph/archive/$BRANCH/ 2>/dev/null && git add .ralph/archive/ && git commit -m "task: archive ralph run for $BRANCH" 2>/dev/null || true`,
            ],
            { user: "sandbox", workdir: "/home/sandbox/harness/workspace" },
          );
          run(archiveCmd);

          steps.push("Validating all stories pass...");
          const prCmd = execCmd(
            name,
            [
              "bash",
              "-c",
              `cd ~/harness/workspace && ALL_PASS=$(jq "[.userStories[].passes] | all" .ralph/prd.json 2>/dev/null) && if [ "$ALL_PASS" = "true" ]; then git push && gh pr ready && echo "PR is now ready for review!"; else echo "Not all stories pass yet. Run 'openharness ralph status ${name}' to check."; exit 1; fi`,
            ],
            { user: "sandbox", workdir: "/home/sandbox/harness/workspace" },
          );
          run(prCmd);
          steps.push("PR taken out of draft.");
          break;
        }
      }
    } catch {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ralph ${action} failed for '${name}'. Is the container running?`,
          },
        ],
        details: undefined,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: steps.length > 0 ? steps.join("\n") : `Ralph ${action} completed for '${name}'.`,
        },
      ],
      details: undefined,
    };
  },
};
