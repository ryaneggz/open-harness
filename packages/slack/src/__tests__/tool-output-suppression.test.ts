import { describe, expect, it } from "vitest";

/**
 * These tests validate the tool output suppression logic by testing
 * the behavioral contract: only error tool results produce thread messages.
 *
 * The actual event handler in agent.ts is tightly coupled to AgentSession,
 * so we test the contract through code structure assertions and the
 * exported helper functions.
 */

describe("tool output suppression contract", () => {
	it("agent.ts has error-only guard on thread message posting", async () => {
		// Read the source file and verify the structural change:
		// The queue.enqueueMessage for tool results must be inside an if (agentEvent.isError) block
		const fs = await import("fs");
		const path = await import("path");
		const agentSource = fs.readFileSync(
			path.join(import.meta.dirname, "..", "agent.ts"),
			"utf-8",
		);

		// Find the tool_execution_end handler
		const toolEndIdx = agentSource.indexOf('event.type === "tool_execution_end"');
		expect(toolEndIdx).toBeGreaterThan(-1);

		// Extract the handler block (up to next event type check)
		const nextEventIdx = agentSource.indexOf('event.type === "message_start"', toolEndIdx);
		const handlerBlock = agentSource.substring(toolEndIdx, nextEventIdx);

		// The enqueueMessage call for "tool result thread" must exist
		const enqueueIdx = handlerBlock.indexOf('queue.enqueueMessage(threadMessage, "thread", "tool result thread"');
		expect(enqueueIdx).toBeGreaterThan(-1);

		// Find the if block that guards the enqueue call
		// Walk backwards from enqueueMessage to find the enclosing if statement
		const beforeEnqueue = handlerBlock.substring(0, enqueueIdx);
		const lastIfIdx = beforeEnqueue.lastIndexOf("if (agentEvent.isError)");
		expect(lastIfIdx).toBeGreaterThan(-1);

		// Verify there's no unconditional enqueueMessage for thread results
		// (i.e., the only "tool result thread" enqueue is inside an isError guard)
		const lines = handlerBlock.split("\n");
		let insideErrorGuard = false;
		let foundUnguardedEnqueue = false;

		for (const line of lines) {
			if (line.includes("if (agentEvent.isError)")) {
				insideErrorGuard = true;
			}
			if (line.includes('queue.enqueueMessage(threadMessage, "thread", "tool result thread"')) {
				if (!insideErrorGuard) {
					foundUnguardedEnqueue = true;
				}
			}
		}

		expect(foundUnguardedEnqueue).toBe(false);
	});

	it("error thread messages use error icon (✗), not success icon (✓)", async () => {
		const fs = await import("fs");
		const path = await import("path");
		const agentSource = fs.readFileSync(
			path.join(import.meta.dirname, "..", "agent.ts"),
			"utf-8",
		);

		// Inside the error-guarded block, the thread message should use ✗
		const toolEndIdx = agentSource.indexOf('event.type === "tool_execution_end"');
		const nextEventIdx = agentSource.indexOf('event.type === "message_start"', toolEndIdx);
		const handlerBlock = agentSource.substring(toolEndIdx, nextEventIdx);

		// Find the threadMessage construction within the isError guard
		expect(handlerBlock).toContain("`*✗ ${agentEvent.toolName}*`");
		// Should NOT have the old ternary pattern for thread messages
		expect(handlerBlock).not.toContain('agentEvent.isError ? "✗" : "✓"');
	});

	it("tool start progress indicator is preserved (not removed)", async () => {
		const fs = await import("fs");
		const path = await import("path");
		const agentSource = fs.readFileSync(
			path.join(import.meta.dirname, "..", "agent.ts"),
			"utf-8",
		);

		// The tool_execution_start handler should still post the progress label
		const toolStartIdx = agentSource.indexOf('event.type === "tool_execution_start"');
		const toolEndIdx = agentSource.indexOf('event.type === "tool_execution_end"');
		const startBlock = agentSource.substring(toolStartIdx, toolEndIdx);

		expect(startBlock).toContain("ctx.respond(`_→ ${label}_`");
	});

	it("file logging is preserved for both success and error", async () => {
		const fs = await import("fs");
		const path = await import("path");
		const agentSource = fs.readFileSync(
			path.join(import.meta.dirname, "..", "agent.ts"),
			"utf-8",
		);

		const toolEndIdx = agentSource.indexOf('event.type === "tool_execution_end"');
		const nextEventIdx = agentSource.indexOf('event.type === "message_start"', toolEndIdx);
		const handlerBlock = agentSource.substring(toolEndIdx, nextEventIdx);

		// Both logging calls must be present and unconditional relative to each other
		expect(handlerBlock).toContain("log.logToolError(logCtx");
		expect(handlerBlock).toContain("log.logToolSuccess(logCtx");
	});
});
