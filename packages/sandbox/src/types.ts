/**
 * Local type definitions for openharness sandbox tools.
 *
 * These types are intentionally defined locally rather than imported from
 * `@mariozechner/pi-coding-agent` so the package can evolve independently.
 * The shapes mirror the public surface area of pi's `ToolDefinition` that
 * openharness actually uses, while remaining structurally compatible so
 * tools defined here can still be registered with pi's extension runtime
 * (see `extensions/sandbox.ts`).
 */

import type { Static, TSchema } from "typebox";

/** Single text item returned by a tool result. Matches pi-ai's `TextContent`. */
export interface ToolTextContent {
  type: "text";
  text: string;
  textSignature?: string;
}

/** Single image item returned by a tool result. Matches pi-ai's `ImageContent`. */
export interface ToolImageContent {
  type: "image";
  data: string;
  mimeType: string;
}

/** Content returned by a tool. */
export type ToolResultContent = ToolTextContent | ToolImageContent;

/** Final or partial result produced by a tool. */
export interface ToolResult<TDetails = unknown> {
  /** Text or image content returned to the model. */
  content: ToolResultContent[];
  /** Arbitrary structured details for logs or UI rendering. */
  details: TDetails;
  /**
   * Hint that the agent should stop after the current tool batch.
   * Early termination only happens when every finalized tool result in the
   * batch sets this to true.
   */
  terminate?: boolean;
}

/** Callback used by tools to stream partial execution updates. */
export type ToolUpdateCallback<TDetails = unknown> = (partialResult: ToolResult<TDetails>) => void;

/**
 * Tool definition consumed by the openharness CLI and the agent runtime.
 *
 * Parameter schemas are TypeBox `Type.Object(...)` definitions. Only the
 * fields openharness uses are required here; additional optional fields
 * accepted by the upstream pi-coding-agent runtime (e.g. `renderShell`,
 * `prepareArguments`, `executionMode`, `renderCall`, `renderResult`,
 * `promptGuidelines`) are intentionally not modeled. Tool definitions
 * authored against this interface remain structurally compatible with
 * pi's `ToolDefinition<TParams, TDetails, TState>` because the omitted
 * fields are all optional.
 */
export interface ToolDefinition<TParams extends TSchema = TSchema, TDetails = unknown> {
  /** Tool name (used in LLM tool calls). */
  name: string;
  /** Human-readable label for UI. */
  label: string;
  /** Description shown to the LLM. */
  description: string;
  /** Optional one-line snippet for the "Available tools" prompt section. */
  promptSnippet?: string;
  /** Parameter schema (TypeBox). */
  parameters: TParams;
  /**
   * Execute the tool.
   *
   * The trailing parameters (`signal`, `onUpdate`, `ctx`) are typed loosely
   * so tools defined here can be consumed by the pi-coding-agent runtime
   * without forcing openharness to depend on its richer context types.
   */
  execute(
    toolCallId: string,
    params: Static<TParams>,
    ...rest: unknown[]
  ): Promise<ToolResult<TDetails>>;
}
