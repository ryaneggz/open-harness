import { ErrorCode } from "@slack/web-api";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SlackBot } from "../slack.js";

/**
 * Tests for SlackBot.safePost — the length-safe wrapper around
 * chat.postMessage / chat.update introduced for issue #135.
 *
 * safePost guarantees:
 * 1. msg_too_long triggers a halving retry on the SAME path
 *    (update stays on update; post stays on post).
 * 2. A second msg_too_long retries once more at exactly
 *    RETRY_FALLBACK_LENGTH = 900 chars.
 * 3. A third msg_too_long throws.
 * 4. Any non-msg_too_long error passes through unchanged.
 */

interface MockChat {
	postMessage: ReturnType<typeof vi.fn>;
	update: ReturnType<typeof vi.fn>;
	delete: ReturnType<typeof vi.fn>;
}

function tooLongError(): Error & { code: string; data: { error: string; ok: false } } {
	const err = new Error("An API error occurred: msg_too_long") as Error & {
		code: string;
		data: { error: string; ok: false };
	};
	err.code = ErrorCode.PlatformError;
	err.data = { error: "msg_too_long", ok: false };
	return err;
}

function rateLimitedError(): Error & { code: string; data: { error: string; ok: false } } {
	const err = new Error("An API error occurred: ratelimited") as Error & {
		code: string;
		data: { error: string; ok: false };
	};
	err.code = ErrorCode.PlatformError;
	err.data = { error: "ratelimited", ok: false };
	return err;
}

function makeBot(): { bot: SlackBot; chat: MockChat } {
	const chat: MockChat = {
		postMessage: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
	};

	// Construct against a stub config — never starts the socket client.
	const bot = new SlackBot({} as never, {
		appToken: "xapp-test",
		botToken: "xoxb-test",
		workingDir: "/tmp/safepost-test",
		store: {} as never,
	});
	// Swap in mock WebClient (private field, accessed via cast).
	(bot as unknown as { webClient: { chat: MockChat } }).webClient = { chat };
	return { bot, chat };
}

describe("SlackBot.safePost", () => {
	let bot: SlackBot;
	let chat: MockChat;

	beforeEach(() => {
		({ bot, chat } = makeBot());
	});

	it("post-path: returns Slack ts and the posted text on first-try success", async () => {
		chat.postMessage.mockResolvedValue({ ok: true, ts: "1234.5678" });

		const result = await bot.safePost({ channel: "C1", text: "hello" });

		expect(result).toEqual({ ts: "1234.5678", postedText: "hello" });
		expect(chat.postMessage).toHaveBeenCalledTimes(1);
		expect(chat.postMessage).toHaveBeenCalledWith({
			channel: "C1",
			thread_ts: undefined,
			text: "hello",
		});
		expect(chat.update).not.toHaveBeenCalled();
	});

	it("update-path: returns input ts (synthesized) on first-try success", async () => {
		chat.update.mockResolvedValue({ ok: true });

		const result = await bot.safePost({ channel: "C1", ts: "9999.0000", text: "hello" });

		expect(result).toEqual({ ts: "9999.0000", postedText: "hello" });
		expect(chat.update).toHaveBeenCalledTimes(1);
		expect(chat.update).toHaveBeenCalledWith({ channel: "C1", ts: "9999.0000", text: "hello" });
		expect(chat.postMessage).not.toHaveBeenCalled();
	});

	it("post-path: forwards threadTs as thread_ts", async () => {
		chat.postMessage.mockResolvedValue({ ok: true, ts: "1.1" });

		await bot.safePost({ channel: "C1", threadTs: "1234.0", text: "in thread" });

		expect(chat.postMessage).toHaveBeenCalledWith({
			channel: "C1",
			thread_ts: "1234.0",
			text: "in thread",
		});
	});

	it("update-path: stays on update on msg_too_long, never falls through to postMessage", async () => {
		chat.update.mockRejectedValueOnce(tooLongError());
		chat.update.mockResolvedValue({ ok: true });

		const longText = "x".repeat(5000);
		const result = await bot.safePost({ channel: "C1", ts: "1.0", text: longText });

		expect(chat.update).toHaveBeenCalledTimes(2);
		expect(chat.postMessage).not.toHaveBeenCalled();
		// Second call payload was halved to ~2500 chars.
		const secondCallText = chat.update.mock.calls[1][0].text as string;
		expect(secondCallText.length).toBeLessThanOrEqual(2500);
		expect(secondCallText.length).toBeGreaterThan(1000);
		expect(secondCallText).toMatch(/…$/);
		expect(result.ts).toBe("1.0");
		expect(result.postedText).toBe(secondCallText);
	});

	it("post-path: stays on post on msg_too_long, never accidentally calls update", async () => {
		chat.postMessage.mockRejectedValueOnce(tooLongError());
		chat.postMessage.mockResolvedValue({ ok: true, ts: "2.0" });

		const longText = "x".repeat(5000);
		const result = await bot.safePost({ channel: "C1", text: longText });

		expect(chat.postMessage).toHaveBeenCalledTimes(2);
		expect(chat.update).not.toHaveBeenCalled();
		const secondCallText = chat.postMessage.mock.calls[1][0].text as string;
		expect(secondCallText.length).toBeLessThanOrEqual(2500);
		expect(result.ts).toBe("2.0");
		expect(result.postedText).toBe(secondCallText);
	});

	it("two consecutive msg_too_long: third attempt is exactly 900 chars (with ellipsis)", async () => {
		chat.update
			.mockRejectedValueOnce(tooLongError())
			.mockRejectedValueOnce(tooLongError())
			.mockResolvedValue({ ok: true });

		const longText = "x".repeat(10000);
		const result = await bot.safePost({ channel: "C1", ts: "1.0", text: longText });

		expect(chat.update).toHaveBeenCalledTimes(3);
		const thirdCallText = chat.update.mock.calls[2][0].text as string;
		expect(thirdCallText.length).toBe(900);
		expect(thirdCallText).toMatch(/…$/);
		expect(result.postedText).toBe(thirdCallText);
	});

	it("three consecutive msg_too_long: throws", async () => {
		chat.update
			.mockRejectedValueOnce(tooLongError())
			.mockRejectedValueOnce(tooLongError())
			.mockRejectedValueOnce(tooLongError());

		const longText = "x".repeat(10000);
		await expect(bot.safePost({ channel: "C1", ts: "1.0", text: longText })).rejects.toThrow(
			/msg_too_long/,
		);
		expect(chat.update).toHaveBeenCalledTimes(3);
	});

	it("ratelimited (non-msg_too_long error): passes through, no retry", async () => {
		chat.update.mockRejectedValue(rateLimitedError());

		await expect(bot.safePost({ channel: "C1", ts: "1.0", text: "hi" })).rejects.toThrow(
			/ratelimited/,
		);
		expect(chat.update).toHaveBeenCalledTimes(1);
	});

	it("halving uses Math.floor and bounds at RETRY_FALLBACK_LENGTH (900)", async () => {
		// Start with text whose half is below 900 so first retry should clamp at 900.
		chat.update.mockRejectedValueOnce(tooLongError());
		chat.update.mockResolvedValue({ ok: true });

		const text = "x".repeat(1500); // half = 750, clamped to 900
		await bot.safePost({ channel: "C1", ts: "1.0", text });

		const secondCallText = chat.update.mock.calls[1][0].text as string;
		expect(secondCallText.length).toBe(900);
	});
});
