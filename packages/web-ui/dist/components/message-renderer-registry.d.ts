import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { TemplateResult } from "lit";
export type MessageRole = AgentMessage["role"];
export interface MessageRenderer<TMessage extends AgentMessage = AgentMessage> {
    render(message: TMessage): TemplateResult;
}
export declare function registerMessageRenderer<TRole extends MessageRole>(role: TRole, renderer: MessageRenderer<Extract<AgentMessage, {
    role: TRole;
}>>): void;
export declare function getMessageRenderer(role: MessageRole): MessageRenderer | undefined;
export declare function renderMessage(message: AgentMessage): TemplateResult | undefined;
//# sourceMappingURL=message-renderer-registry.d.ts.map