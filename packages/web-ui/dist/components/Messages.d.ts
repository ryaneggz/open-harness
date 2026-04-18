import type { AssistantMessage as AssistantMessageType, ImageContent, TextContent, ToolCall, ToolResultMessage as ToolResultMessageType, UserMessage as UserMessageType } from "@mariozechner/pi-ai";
import { LitElement, type TemplateResult } from "lit";
import type { Attachment } from "../utils/attachment-utils.js";
import "./ThinkingBlock.js";
import type { AgentTool } from "@mariozechner/pi-agent-core";
export type UserMessageWithAttachments = {
    role: "user-with-attachments";
    content: string | (TextContent | ImageContent)[];
    timestamp: number;
    attachments?: Attachment[];
};
export interface ArtifactMessage {
    role: "artifact";
    action: "create" | "update" | "delete";
    filename: string;
    content?: string;
    title?: string;
    timestamp: string;
}
declare module "@mariozechner/pi-agent-core" {
    interface CustomAgentMessages {
        "user-with-attachments": UserMessageWithAttachments;
        artifact: ArtifactMessage;
    }
}
export declare class UserMessage extends LitElement {
    message: UserMessageWithAttachments | UserMessageType;
    protected createRenderRoot(): HTMLElement | DocumentFragment;
    connectedCallback(): void;
    render(): TemplateResult<1>;
}
export declare class AssistantMessage extends LitElement {
    message: AssistantMessageType;
    tools?: AgentTool<any>[];
    pendingToolCalls?: Set<string>;
    hideToolCalls: boolean;
    toolResultsById?: Map<string, ToolResultMessageType>;
    isStreaming: boolean;
    hidePendingToolCalls: boolean;
    onCostClick?: () => void;
    protected createRenderRoot(): HTMLElement | DocumentFragment;
    connectedCallback(): void;
    render(): TemplateResult<1>;
}
export declare class ToolMessageDebugView extends LitElement {
    callArgs: any;
    result?: ToolResultMessageType;
    hasResult: boolean;
    protected createRenderRoot(): HTMLElement | DocumentFragment;
    connectedCallback(): void;
    private pretty;
    render(): TemplateResult<1>;
}
export declare class ToolMessage extends LitElement {
    toolCall: ToolCall;
    tool?: AgentTool<any>;
    result?: ToolResultMessageType;
    pending: boolean;
    aborted: boolean;
    isStreaming: boolean;
    protected createRenderRoot(): HTMLElement | DocumentFragment;
    connectedCallback(): void;
    render(): TemplateResult;
}
export declare class AbortedMessage extends LitElement {
    protected createRenderRoot(): HTMLElement | DocumentFragment;
    connectedCallback(): void;
    protected render(): unknown;
}
import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { Message } from "@mariozechner/pi-ai";
/**
 * Convert attachments to content blocks for LLM.
 * - Images become ImageContent blocks
 * - Documents with extractedText become TextContent blocks with filename header
 */
export declare function convertAttachments(attachments: Attachment[]): (TextContent | ImageContent)[];
/**
 * Check if a message is a UserMessageWithAttachments.
 */
export declare function isUserMessageWithAttachments(msg: AgentMessage): msg is UserMessageWithAttachments;
/**
 * Check if a message is an ArtifactMessage.
 */
export declare function isArtifactMessage(msg: AgentMessage): msg is ArtifactMessage;
/**
 * Default convertToLlm for web-ui apps.
 *
 * Handles:
 * - UserMessageWithAttachments: converts to user message with content blocks
 * - ArtifactMessage: filtered out (UI-only, for session reconstruction)
 * - Standard LLM messages (user, assistant, toolResult): passed through
 */
export declare function defaultConvertToLlm(messages: AgentMessage[]): Message[];
//# sourceMappingURL=Messages.d.ts.map