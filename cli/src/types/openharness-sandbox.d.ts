declare module "@openharness/sandbox" {
  import type { ToolDefinition } from "@mariozechner/pi-coding-agent";

  export const sandboxTools: ToolDefinition[];
  export const listTool: ToolDefinition;
  export const buildTool: ToolDefinition;
  export const rebuildTool: ToolDefinition;
  export const runTool: ToolDefinition;
  export const shellTool: ToolDefinition;
  export const stopTool: ToolDefinition;
  export const cleanTool: ToolDefinition;
  export const pushTool: ToolDefinition;
  export const quickstartTool: ToolDefinition;
  export const heartbeatTool: ToolDefinition;
  export const worktreeTool: ToolDefinition;

  export interface SandboxOptions {
    name: string;
    branch?: string;
    baseBranch?: string;
    tag?: string;
    docker?: boolean;
    registry?: string;
  }

  export class SandboxConfig {
    constructor(opts: SandboxOptions);
    readonly name: string;
    readonly branch: string;
    readonly baseBranch: string;
    readonly tag: string;
    readonly docker: boolean;
    readonly registry: string;
    get image(): string;
    get worktreePath(): string;
    get projectRoot(): string;
  }
}
