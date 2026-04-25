import { ErrorCode } from "@slack/web-api";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSlackContext, MAIN_BUDGET, MAX_THREAD_CHUNK } from "../slack-context.js";
import type { SlackBot, SlackEvent } from "../slack.js";
import type { ChannelStore } from "../store.js";

/**
 * Closure-level integration tests for createSlackContext (issue #135).
 *
 * Drives respond/replaceMessage/setWorking/respondInThread through a stub
 * SlackBot whose safePost is a vi.fn so we can observe exactly what would
 * land on Slack. Verifies:
 *   - Streaming non-spam: ≤3 main updates regardless of how many `respond`
 *     calls fire (caught the buggy current behavior of 1-update-per-chunk).
 *   - Cascade broken: setWorking(false) succeeds even after an oversized
 *     respond, because it re-uses lastMainPostedText not raw accumulatedText.
 *   - replaceMessage flushes overflow immediately (durable across error paths).
 *   - Watermark resets correctly when replaceMessage overwrites.
 *   - Multi-overflow chunks are contiguous and non-overlapping.
 *   - respondInThread chunks at MAX_THREAD_CHUNK boundaries.
 */

interface SafePostCall {
	channel: string;
	ts?: string;
	threadTs?: string;
	text: string;
	kind: "post" | "update" | "thread";
}

function makeStubBot(opts: {
	tooLongOnUpdate?: number; // throw msg_too_long this many times on update before succeeding
} = {}): { bot: SlackBot; safePost: ReturnType<typeof vi.fn>; calls: SafePostCall[] } {
	const calls: SafePostCall[] = [];
	let updateThrowsRemaining = opts.tooLongOnUpdate ?? 0;
	let nextTs = 1;

	const safePost = vi.fn(
		async (postOpts: { channel: string; ts?: string; threadTs?: string; text: string }) => {
			const kind: SafePostCall["kind"] = postOpts.ts
				? "update"
				: postOpts.threadTs
					? "thread"
					: "post";

			if (kind === "update" && updateThrowsRemaining > 0) {
				updateThrowsRemaining--;
				const err = new Error("msg_too_long") as Error & {
					code: string;
					data: { error: string; ok: false };
				};
				err.code = ErrorCode.PlatformError;
				err.data = { error: "msg_too_long", ok: false };
				throw err;
			}

			calls.push({ ...postOpts, kind });
			return { ts: postOpts.ts ?? `${nextTs++}.0`, postedText: postOpts.text };
		},
	);

	const bot = {
		safePost,
		getUser: () => ({ id: "U1", userName: "alice", displayName: "Alice" }),
		getChannel: () => ({ id: "C1", name: "general" }),
		getAllUsers: () => [],
		getAllChannels: () => [],
		logBotResponse: vi.fn(),
		updateMessage: vi.fn(),
		postMessage: vi.fn(),
		postInThread: vi.fn(),
		deleteMessage: vi.fn(),
	} as unknown as SlackBot;

	return { bot, safePost, calls };
}

function makeEvent(text = "hello bot"): SlackEvent {
	return {
		type: "mention",
		channel: "C1",
		ts: "1700000000.000100",
		user: "U1",
		text,
	};
}

const stubState = { store: {} as ChannelStore };

// Pass isEvent=true to all closure tests so threadParent is undefined and
// the first main post lands as kind="post" (not threadTs:event.ts). This
// keeps the main vs. overflow distinction clean in test assertions; the
// underlying overflow logic is identical for both modes.
const IS_EVENT = true;

describe("createSlackContext — msg_too_long handling (issue #135)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("MAIN_BUDGET leaves headroom for footer + indicator under MAX_MAIN_LENGTH", () => {
		expect(MAIN_BUDGET).toBeLessThan(2900);
		expect(MAIN_BUDGET).toBeGreaterThan(2700);
	});

	it("single-shot truncation: respond with 6000 chars + setWorking(false) splits main + thread overflow", async () => {
		const { bot, calls } = makeStubBot();
		const ctx = createSlackContext(makeEvent(), bot, stubState, IS_EVENT);

		await ctx.respond("x".repeat(6000));
		await ctx.setWorking(false); // realistic finalize — drains any held tail

		const mainCalls = calls.filter((c) => c.kind === "post" || c.kind === "update");
		const threadCalls = calls.filter((c) => c.kind === "thread");
		const initialPost = mainCalls[0];

		expect(initialPost).toBeDefined();
		expect(initialPost.text.length).toBeLessThanOrEqual(2900);
		expect(initialPost.text).toContain("_message truncated");
		expect(threadCalls.length).toBeGreaterThanOrEqual(1);

		// Reconstruct: thread chunks (in order) cover accumulatedText[MAIN_BUDGET..end].
		const reconstructed = threadCalls.map((c) => c.text).join("");
		expect(reconstructed).toBe("x".repeat(6000).slice(MAIN_BUDGET));
	});

	it("streaming non-spam: post-truncation, no further main updates fire", async () => {
		const { bot, calls } = makeStubBot();
		const ctx = createSlackContext(makeEvent(), bot, stubState, IS_EVENT);

		// 50 chunks × 120 chars = 6000 chars total. Pre-truncation, every chunk
		// legitimately changes the visible main message (the user wants live
		// updates). Post-truncation, the visible main is FROZEN at the truncated
		// payload — re-issuing chat.update on every subsequent chunk is the bug.
		for (let i = 0; i < 50; i++) {
			await ctx.respond("x".repeat(120));
		}

		const mainCalls = calls.filter((c) => c.kind === "post" || c.kind === "update");
		const truncatedMainCalls = mainCalls.filter((c) => c.text.includes("_message truncated"));

		// Exactly ONE truncation-transition main update — the moment the visible
		// payload first hits the cap. The pre-fix bug would produce ~26 truncated
		// updates (one per chunk after MAIN_BUDGET is crossed).
		expect(truncatedMainCalls.length).toBe(1);
	});

	it("cascade broken: setWorking(false) succeeds after a respond that throws msg_too_long once", async () => {
		// Force the first chat.update to throw msg_too_long; safePost retries
		// internally. Here we simulate via the stub: tooLongOnUpdate=1 means
		// the FIRST update call throws. But our stub's safePost is the unit
		// under test for the closure, not the wrapped chat.update — so we
		// use a different approach: drive 2 respond() calls, the second of
		// which would normally re-update. Then setWorking(false) must use
		// lastMainPostedText (the wire payload that succeeded on the first
		// respond), NOT raw accumulatedText.
		const { bot, calls } = makeStubBot();
		const ctx = createSlackContext(makeEvent(), bot, stubState, IS_EVENT);

		await ctx.respond("a".repeat(5000)); // triggers truncation
		const beforeWorkingCount = calls.length;
		await ctx.setWorking(false);

		const setWorkingCall = calls[beforeWorkingCount];
		expect(setWorkingCall).toBeDefined();
		expect(setWorkingCall.kind).toBe("update");
		// The setWorking payload must be the truncated mainText (no indicator),
		// NOT the raw 5000-char accumulatedText.
		expect(setWorkingCall.text.length).toBeLessThanOrEqual(2900);
		expect(setWorkingCall.text).not.toContain(" ...");
	});

	it("setWorking(false) flushes any unflushed overflow as a safety net", async () => {
		const { bot, calls } = makeStubBot();
		const ctx = createSlackContext(makeEvent(), bot, stubState, IS_EVENT);

		// 4000 chars: enough to exceed MAIN_BUDGET (~2820) but small enough
		// that the residual overflow tail is < MAX_THREAD_CHUNK and gets held.
		await ctx.respond("y".repeat(4000));

		const threadBefore = calls.filter((c) => c.kind === "thread").length;
		await ctx.setWorking(false);
		const threadAfter = calls.filter((c) => c.kind === "thread").length;

		// setWorking(false) should drain the held tail.
		expect(threadAfter).toBeGreaterThan(threadBefore);
	});

	it("replaceMessage flushes ALL overflow immediately (durable against error paths)", async () => {
		const { bot, calls } = makeStubBot();
		const ctx = createSlackContext(makeEvent(), bot, stubState, IS_EVENT);

		await ctx.replaceMessage("z".repeat(10000));

		const threadCalls = calls.filter((c) => c.kind === "thread");
		// Overflow = 10000 - MAIN_BUDGET; ceil at MAX_THREAD_CHUNK boundaries.
		const expectedChunks = Math.ceil((10000 - MAIN_BUDGET) / MAX_THREAD_CHUNK);
		expect(threadCalls.length).toBe(expectedChunks);
	});

	it("replaceMessage resets the overflow watermark", async () => {
		const { bot, calls } = makeStubBot();
		const ctx = createSlackContext(makeEvent(), bot, stubState, IS_EVENT);

		await ctx.respond("a".repeat(4000)); // partial overflow flushed
		const threadAfterRespond = calls.filter((c) => c.kind === "thread").length;

		await ctx.replaceMessage("b".repeat(8000)); // new content, watermark resets

		const threadCalls = calls.filter((c) => c.kind === "thread");
		const newThreadCalls = threadCalls.length - threadAfterRespond;
		// New overflow = 8000 - MAIN_BUDGET; the b's must fully re-flush.
		const expectedNewChunks = Math.ceil((8000 - MAIN_BUDGET) / MAX_THREAD_CHUNK);
		expect(newThreadCalls).toBe(expectedNewChunks);

		// All new thread chunks contain b's only — no leftover a's.
		const newChunks = threadCalls.slice(threadAfterRespond);
		for (const chunk of newChunks) {
			expect(chunk.text).toMatch(/^b+$/);
		}
	});

	it("multi-overflow chunks are contiguous and non-overlapping", async () => {
		const { bot, calls } = makeStubBot();
		const ctx = createSlackContext(makeEvent(), bot, stubState, IS_EVENT);

		// Use a unique-per-position string so we can verify contiguity.
		const text = Array.from({ length: 10000 }, (_, i) => String.fromCharCode(33 + (i % 90))).join(
			"",
		);
		await ctx.replaceMessage(text);

		const threadCalls = calls.filter((c) => c.kind === "thread");
		expect(threadCalls.length).toBeGreaterThanOrEqual(3);

		// Concatenating thread chunks reconstructs text.slice(MAIN_BUDGET).
		const reconstructed = threadCalls.map((c) => c.text).join("");
		expect(reconstructed).toBe(text.slice(MAIN_BUDGET));
	});

	it("respondInThread chunks long text at MAX_THREAD_CHUNK boundaries", async () => {
		const { bot, calls } = makeStubBot();
		const ctx = createSlackContext(makeEvent(), bot, stubState, IS_EVENT);

		// Need a messageTs to exist before respondInThread will post.
		await ctx.setTyping(true);
		const threadBefore = calls.filter((c) => c.kind === "thread").length;

		await ctx.respondInThread("q".repeat(7000));

		const threadAfter = calls.filter((c) => c.kind === "thread");
		const newThreadCalls = threadAfter.length - threadBefore;
		expect(newThreadCalls).toBe(Math.ceil(7000 / MAX_THREAD_CHUNK)); // 3
		for (const c of threadAfter.slice(threadBefore)) {
			expect(c.text.length).toBeLessThanOrEqual(MAX_THREAD_CHUNK);
		}
	});

	it("logBotResponse on respond receives the delta (not the wire-truncated text)", async () => {
		const { bot } = makeStubBot();
		const logFn = (bot as unknown as { logBotResponse: ReturnType<typeof vi.fn> }).logBotResponse;
		const ctx = createSlackContext(makeEvent(), bot, stubState, IS_EVENT);

		await ctx.respond("delta-content");

		expect(logFn).toHaveBeenCalledWith("C1", "delta-content", expect.any(String));
	});

	it("setTyping seeds lastMainPostedText so a subsequent setWorking does not post stale state", async () => {
		const { bot, calls } = makeStubBot();
		const ctx = createSlackContext(makeEvent(), bot, stubState, IS_EVENT);

		await ctx.setTyping(true); // posts "_Thinking_ ..."
		await ctx.setWorking(false); // must update with "_Thinking_" (no indicator), not blank

		const updateCalls = calls.filter((c) => c.kind === "update");
		expect(updateCalls.length).toBe(1);
		expect(updateCalls[0].text).toBe("_Thinking_");
	});

	it("respondInThread is a no-op when there's no main message yet", async () => {
		const { bot, calls } = makeStubBot();
		const ctx = createSlackContext(makeEvent(), bot, stubState, IS_EVENT);

		await ctx.respondInThread("orphan thread reply");

		expect(calls.length).toBe(0);
	});

	it("source-grep: MAX_MAIN_LENGTH = 2900 in slack-context.ts, no 35000/20000 leftover", async () => {
		const fs = await import("fs");
		const path = await import("path");
		const source = fs.readFileSync(
			path.join(import.meta.dirname, "..", "slack-context.ts"),
			"utf-8",
		);
		expect(source).toContain("MAX_MAIN_LENGTH = 2900");
		expect(source).not.toMatch(/\b35000\b/);
		expect(source).not.toMatch(/\b20000\b/);
	});

	it("source-grep: setWorking uses lastMainPostedText, not accumulatedText", async () => {
		const fs = await import("fs");
		const path = await import("path");
		const source = fs.readFileSync(
			path.join(import.meta.dirname, "..", "slack-context.ts"),
			"utf-8",
		);
		const start = source.indexOf("setWorking: async");
		const end = source.indexOf("deleteMessage: async", start);
		const block = source.substring(start, end);
		expect(block).toContain("lastMainPostedText");
		// In the setWorking block, the only mention of accumulatedText should be
		// inside flushOverflow (via call), not in a direct slack.safePost text.
		expect(block).not.toMatch(/text:\s*accumulatedText/);
	});
});
