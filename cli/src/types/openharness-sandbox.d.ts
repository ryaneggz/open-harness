declare module "@openharness/sandbox" {
  import type { ToolDefinition } from "@mariozechner/pi-coding-agent";

  export const sandboxTools: ToolDefinition[];
  export const listTool: ToolDefinition;
  export const runTool: ToolDefinition;
  export const shellTool: ToolDefinition;
  export const stopTool: ToolDefinition;
  export const cleanTool: ToolDefinition;
  export const quickstartTool: ToolDefinition;
  export const heartbeatTool: ToolDefinition;
  export const worktreeTool: ToolDefinition;
  export const onboardTool: ToolDefinition;

  export interface SandboxOptions {
    name?: string;
  }

  export class SandboxConfig {
    constructor(opts?: SandboxOptions);
    readonly name: string;
    readonly composeFiles: string[];
    readonly envFile: string;
  }
}
