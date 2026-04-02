import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { listTool } from "./list.js";
import { buildTool } from "./build.js";
import { rebuildTool } from "./rebuild.js";
import { runTool } from "./run.js";
import { shellTool } from "./shell.js";
import { stopTool } from "./stop.js";
import { cleanTool } from "./clean.js";
import { pushTool } from "./push.js";
import { quickstartTool } from "./quickstart.js";
import { heartbeatTool } from "./heartbeat.js";
import { worktreeTool } from "./worktree.js";

export const sandboxTools: ToolDefinition[] = [
  listTool,
  quickstartTool,
  buildTool,
  rebuildTool,
  runTool,
  shellTool,
  stopTool,
  cleanTool,
  pushTool,
  heartbeatTool,
  worktreeTool,
];

export {
  listTool,
  buildTool,
  rebuildTool,
  runTool,
  shellTool,
  stopTool,
  cleanTool,
  pushTool,
  quickstartTool,
  heartbeatTool,
  worktreeTool,
};
