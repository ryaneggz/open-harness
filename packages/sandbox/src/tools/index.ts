import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { listTool } from "./list.js";
import { runTool } from "./run.js";
import { shellTool } from "./shell.js";
import { stopTool } from "./stop.js";
import { cleanTool } from "./clean.js";
import { sandboxTool } from "./sandbox.js";
import { heartbeatTool } from "./heartbeat.js";
import { worktreeTool } from "./worktree.js";
import { onboardTool } from "./onboard.js";

export const sandboxTools: ToolDefinition[] = [
  listTool,
  sandboxTool,
  runTool,
  shellTool,
  stopTool,
  cleanTool,
  heartbeatTool,
  worktreeTool,
  onboardTool,
];

export {
  listTool,
  runTool,
  shellTool,
  stopTool,
  cleanTool,
  sandboxTool,
  heartbeatTool,
  worktreeTool,
  onboardTool,
};
