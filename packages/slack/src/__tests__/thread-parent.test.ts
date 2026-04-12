import { describe, expect, it } from "vitest";

/**
 * Tests that createSlackContext uses threadParent (event.threadTs ?? event.ts)
 * for all postInThread calls, validating the thread response support.
 */

describe("createSlackContext threadParent routing", () => {
	it("computes threadParent = event.threadTs ?? event.ts", async () => {
		const fs = await import("fs");
		const path = await import("path");
		const mainSource = fs.readFileSync(
			path.join(import.meta.dirname, "..", "main.ts"),
			"utf-8",
		);

		// The threadParent computation must exist
		expect(mainSource).toContain("const threadParent = event.threadTs ?? event.ts");
	});

	it("uses threadParent in respond postInThread call", async () => {
		const fs = await import("fs");
		const path = await import("path");
		const mainSource = fs.readFileSync(
			path.join(import.meta.dirname, "..", "main.ts"),
			"utf-8",
		);

		// Find the respond handler
		const respondIdx = mainSource.indexOf("respond: async (text: string");
		const replaceIdx = mainSource.indexOf("replaceMessage: async");
		const respondBlock = mainSource.substring(respondIdx, replaceIdx);

		// Must use threadParent, not event.ts
		expect(respondBlock).toContain("slack.postInThread(event.channel, threadParent,");
		expect(respondBlock).not.toContain("slack.postInThread(event.channel, event.ts,");
	});

	it("uses threadParent in replaceMessage postInThread call", async () => {
		const fs = await import("fs");
		const path = await import("path");
		const mainSource = fs.readFileSync(
			path.join(import.meta.dirname, "..", "main.ts"),
			"utf-8",
		);

		// Find the replaceMessage handler
		const replaceIdx = mainSource.indexOf("replaceMessage: async");
		const respondInThreadIdx = mainSource.indexOf("respondInThread: async");
		const replaceBlock = mainSource.substring(replaceIdx, respondInThreadIdx);

		expect(replaceBlock).toContain("slack.postInThread(event.channel, threadParent,");
		expect(replaceBlock).not.toContain("slack.postInThread(event.channel, event.ts,");
	});

	it("uses threadParent in setTyping postInThread call", async () => {
		const fs = await import("fs");
		const path = await import("path");
		const mainSource = fs.readFileSync(
			path.join(import.meta.dirname, "..", "main.ts"),
			"utf-8",
		);

		// Find the setTyping handler
		const typingIdx = mainSource.indexOf("setTyping: async");
		const uploadIdx = mainSource.indexOf("uploadFile: async");
		const typingBlock = mainSource.substring(typingIdx, uploadIdx);

		expect(typingBlock).toContain("slack.postInThread(event.channel, threadParent,");
		expect(typingBlock).not.toContain("slack.postInThread(event.channel, event.ts,");
	});

	it("respondInThread still uses messageTs (bot reply), not threadParent", async () => {
		const fs = await import("fs");
		const path = await import("path");
		const mainSource = fs.readFileSync(
			path.join(import.meta.dirname, "..", "main.ts"),
			"utf-8",
		);

		// Find the respondInThread handler
		const respondInThreadIdx = mainSource.indexOf("respondInThread: async");
		const setTypingIdx = mainSource.indexOf("setTyping: async");
		const respondInThreadBlock = mainSource.substring(respondInThreadIdx, setTypingIdx);

		// respondInThread posts UNDER the bot's own message, not under the thread parent
		expect(respondInThreadBlock).toContain("slack.postInThread(event.channel, messageTs,");
		expect(respondInThreadBlock).not.toContain("slack.postInThread(event.channel, threadParent,");
	});

	it("SlackEvent interface includes threadTs field", async () => {
		const fs = await import("fs");
		const path = await import("path");
		const slackSource = fs.readFileSync(
			path.join(import.meta.dirname, "..", "slack.ts"),
			"utf-8",
		);

		// Find the SlackEvent interface
		const interfaceStart = slackSource.indexOf("export interface SlackEvent");
		const interfaceEnd = slackSource.indexOf("}", interfaceStart);
		const interfaceBlock = slackSource.substring(interfaceStart, interfaceEnd);

		expect(interfaceBlock).toContain("threadTs?: string");
	});
});
