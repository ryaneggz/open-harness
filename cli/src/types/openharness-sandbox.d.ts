declare module "@openharness/sandbox" {
  import type { ToolDefinition } from "@mariozechner/pi-coding-agent";

  export const sandboxTools: ToolDefinition[];
  export const listTool: ToolDefinition;
  export const runTool: ToolDefinition;
  export const shellTool: ToolDefinition;
  export const stopTool: ToolDefinition;
  export const cleanTool: ToolDefinition;
  export const sandboxTool: ToolDefinition;
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

  export function composeCmd(config: SandboxConfig): string[];
  export function composeEnv(config: SandboxConfig): Record<string, string>;
  export function composeUp(config: SandboxConfig): string[];
  export function composeDown(config: SandboxConfig, volumes?: boolean): string[];
  export function execCmd(
    name: string,
    command: string[],
    opts?: { user?: string; interactive?: boolean; workdir?: string; env?: Record<string, string> },
  ): string[];
  export function psCmd(): string[];

  export interface RunOptions {
    cwd?: string;
    env?: Record<string, string>;
    stdio?: "inherit" | "pipe";
  }
  export function run(cmd: string[], opts?: RunOptions): void;
  export function runSafe(cmd: string[], opts?: RunOptions): boolean;
  export function capture(cmd: string[], opts?: Omit<RunOptions, "stdio">): string;
}
