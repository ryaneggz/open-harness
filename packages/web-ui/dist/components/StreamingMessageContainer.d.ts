import type { AgentMessage, AgentTool } from "@mariozechner/pi-agent-core";
import type { ToolResultMessage } from "@mariozechner/pi-ai";
import { LitElement } from "lit";
export declare class StreamingMessageContainer extends LitElement {
    tools: AgentTool[];
    isStreaming: boolean;
    pendingToolCalls?: Set<string>;
    toolResultsById?: Map<string, ToolResultMessage>;
    onCostClick?: () => void;
    private _message;
    private _pendingMessage;
    private _updateScheduled;
    private _immediateUpdate;
    protected createRenderRoot(): HTMLElement | DocumentFragment;
    connectedCallback(): void;
    setMessage(message: AgentMessage | null, immediate?: boolean): void;
    render(): import("lit").TemplateResult<1> | undefined;
}
//# sourceMappingURL=StreamingMessageContainer.d.ts.map