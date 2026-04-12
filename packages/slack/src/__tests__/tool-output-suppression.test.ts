import { describe, expect, it } from "vitest";

describe("tool status indicators", () => {
	// Helper: read agent.ts and extract tool_execution_end handler block
	async function getHandlerBlock(): Promise<string> {
		const fs = await import("fs");
		const path = await import("path");
		const source = fs.readFileSync(
			path.join(import.meta.dirname, "..", "agent.ts"),
			"utf-8",
		);
		const startIdx = source.indexOf('event.type === "tool_execution_end"');
		const endIdx = source.indexOf('event.type === "message_start"', startIdx);
		return source.substring(startIdx, endIdx);
	}

	it("does NOT post tool results to thread", async () => {
		const block = await getHandlerBlock();
		expect(block).not.toContain('"tool result thread"');
		expect(block).not.toContain("enqueueMessage");
	});

	it("does NOT append error text to main message", async () => {
		const block = await getHandlerBlock();
		expect(block).not.toContain('"tool error"');
	});

	it("posts status indicator with tool status queue label", async () => {
		const block = await getHandlerBlock();
		expect(block).toContain('"tool status"');
	});

	it("uses Slack emoji shortcodes for status icons", async () => {
		const block = await getHandlerBlock();
		expect(block).toContain(":white_check_mark:");
		expect(block).toContain(":x:");
	});

	it("preserves tool start progress indicator", async () => {
		const fs = await import("fs");
		const path = await import("path");
		const source = fs.readFileSync(
			path.join(import.meta.dirname, "..", "agent.ts"),
			"utf-8",
		);
		const startIdx = source.indexOf('event.type === "tool_execution_start"');
		const endIdx = source.indexOf('event.type === "tool_execution_end"');
		const block = source.substring(startIdx, endIdx);
		expect(block).toContain("ctx.respond(`_→ ${label}_`");
	});

	it("preserves file logging for both success and error", async () => {
		const block = await getHandlerBlock();
		expect(block).toContain("log.logToolError(logCtx");
		expect(block).toContain("log.logToolSuccess(logCtx");
	});
});
