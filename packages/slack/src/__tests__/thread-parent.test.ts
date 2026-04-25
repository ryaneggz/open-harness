import { describe, expect, it } from "vitest";

/**
 * Tests that createSlackContext routes to thread vs. channel correctly.
 *
 * Since issue #135, all main-message posting goes through `slack.safePost`,
 * which forwards `threadParent` as the `threadTs` field when no messageTs
 * exists yet. respondInThread still pins to the bot's own messageTs.
 */

async function readMainSource(): Promise<string> {
	const fs = await import("fs");
	const path = await import("path");
	return fs.readFileSync(path.join(import.meta.dirname, "..", "slack-context.ts"), "utf-8");
}

function block(source: string, startMarker: string, endMarker: string): string {
	const start = source.indexOf(startMarker);
	const end = source.indexOf(endMarker, start);
	return source.substring(start, end);
}

describe("createSlackContext threadParent routing", () => {
	it("computes threadParent = event.threadTs ?? event.ts", async () => {
		const source = await readMainSource();
		expect(source).toContain(
			"const threadParent = event.threadTs ?? (isEvent ? undefined : event.ts)",
		);
	});

	it("postMain forwards threadParent as threadTs when messageTs is absent", async () => {
		const source = await readMainSource();
		const postMainBlock = block(source, "const postMain = async", "// Flush new overflow");
		// The post-path branch must hand threadParent to safePost as threadTs.
		expect(postMainBlock).toContain("threadTs: messageTs ? undefined : threadParent");
		// And it must use safePost — never a direct postInThread or postMessage.
		expect(postMainBlock).not.toContain("slack.postInThread(");
		expect(postMainBlock).not.toContain("slack.postMessage(");
	});

	it("setTyping forwards threadParent as threadTs", async () => {
		const source = await readMainSource();
		const typingBlock = block(source, "setTyping: async", "uploadFile: async");
		expect(typingBlock).toContain("threadTs: threadParent");
		expect(typingBlock).toContain("slack.safePost(");
		expect(typingBlock).not.toContain("slack.postInThread(");
		expect(typingBlock).not.toContain("slack.postMessage(");
	});

	it("respondInThread pins to messageTs (bot reply), not threadParent", async () => {
		const source = await readMainSource();
		const inThreadBlock = block(source, "respondInThread: async", "setTyping: async");
		// New: routes via safePost with threadTs = messageTs.
		expect(inThreadBlock).toContain("threadTs: messageTs");
		expect(inThreadBlock).not.toContain("threadParent");
	});

	it("flushOverflow targets the bot's own messageTs as the thread parent", async () => {
		const source = await readMainSource();
		const flushBlock = block(source, "const flushOverflow = async", "return {");
		expect(flushBlock).toContain("threadTs: messageTs");
	});

	it("respond delegates to postMain + flushOverflow (no direct slack.postMessage / postInThread)", async () => {
		const source = await readMainSource();
		const respondBlock = block(source, "respond: async (text: string", "replaceMessage: async");
		expect(respondBlock).toContain("await postMain()");
		expect(respondBlock).toContain("await flushOverflow(false)");
		expect(respondBlock).not.toContain("slack.postMessage(");
		expect(respondBlock).not.toContain("slack.postInThread(");
		expect(respondBlock).not.toContain("slack.updateMessage(");
	});

	it("replaceMessage delegates to postMain + flushOverflow(true)", async () => {
		const source = await readMainSource();
		const replaceBlock = block(source, "replaceMessage: async", "respondInThread: async");
		expect(replaceBlock).toContain("await postMain()");
		expect(replaceBlock).toContain("await flushOverflow(true)");
		expect(replaceBlock).not.toContain("slack.postMessage(");
		expect(replaceBlock).not.toContain("slack.postInThread(");
		expect(replaceBlock).not.toContain("slack.updateMessage(");
	});

	it("replaceMessage logs final consolidated response via logBotResponse", async () => {
		const source = await readMainSource();
		const replaceBlock = block(source, "replaceMessage: async", "respondInThread: async");
		expect(replaceBlock).toContain(
			"slack.logBotResponse(event.channel, accumulatedText, messageTs)",
		);
	});

	it("SlackEvent interface includes threadTs field", async () => {
		const fs = await import("fs");
		const path = await import("path");
		const slackSource = fs.readFileSync(
			path.join(import.meta.dirname, "..", "slack.ts"),
			"utf-8",
		);
		const interfaceStart = slackSource.indexOf("export interface SlackEvent");
		const interfaceEnd = slackSource.indexOf("}", interfaceStart);
		const interfaceBlock = slackSource.substring(interfaceStart, interfaceEnd);
		expect(interfaceBlock).toContain("threadTs?: string");
	});
});
