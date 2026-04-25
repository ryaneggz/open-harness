import * as log from "./log.js";
import type { SlackBot, SlackEvent } from "./slack.js";
import type { ChannelStore } from "./store.js";

// ============================================================================
// Length limits & overflow design (issue #135)
// ============================================================================
//
// Slack's documented chat.postMessage text limit is 40K, but workspaces and
// apps can have much lower effective limits. In practice this workspace
// rejects payloads at ~3,000–4,000 chars with msg_too_long. We cap the main
// message at MAX_MAIN_LENGTH and spill anything beyond into thread replies
// of MAX_THREAD_CHUNK each. Headroom (~80 chars) for the working indicator
// and truncation footer keeps the wire payload comfortably under 3,000.
//
// `agent.ts` has its own SLACK_MAX_LENGTH = 40000 + splitForSlack() guard.
// Those are upstream-fork constants; we deliberately do NOT unify with
// MAX_MAIN_LENGTH (see .claude/rules/slack-package.md).

export const MAX_MAIN_LENGTH = 2900;
export const MAX_THREAD_CHUNK = 2900;
export const TRUNCATION_FOOTER = "\n\n_message truncated — full response in thread_";
export const WORKING_INDICATOR = " ...";
export const MAIN_BUDGET = MAX_MAIN_LENGTH - TRUNCATION_FOOTER.length - WORKING_INDICATOR.length;

export interface ContextChannelState {
	store: ChannelStore;
}

export function createSlackContext(
	event: SlackEvent,
	slack: SlackBot,
	state: ContextChannelState,
	isEvent?: boolean,
) {
	let messageTs: string | null = null;
	const threadMessageTs: string[] = [];
	let accumulatedText = "";
	let lastMainPostedText = ""; // exact wire payload of the last successful main post (no indicator)
	let mainTruncated = false; // sticky once main is capped
	let overflowFlushedEnd = 0; // ABSOLUTE char index into accumulatedText already flushed to thread
	let isWorking = true;
	let updatePromise = Promise.resolve();
	const threadParent = event.threadTs ?? (isEvent ? undefined : event.ts);

	const user = slack.getUser(event.user);

	// Extract event filename for status message
	const eventFilename = isEvent ? event.text.match(/^\[EVENT:([^:]+):/)?.[1] : undefined;

	// Compute the wire-payload main text from current accumulatedText.
	const computeMainText = (): string => {
		if (accumulatedText.length <= MAIN_BUDGET) return accumulatedText;
		return accumulatedText.slice(0, MAIN_BUDGET) + TRUNCATION_FOOTER;
	};

	// Post or update the main message with the current accumulatedText.
	// Sets messageTs / lastMainPostedText / mainTruncated on success.
	// Returns true if a write was issued (false = suppressed no-op).
	const postMain = async (): Promise<boolean> => {
		const mainText = computeMainText();
		if (messageTs && mainText === lastMainPostedText) {
			// No-op suppression: streaming chunks past MAIN_BUDGET don't change
			// what the user sees on the main message. Skip the chat.update.
			return false;
		}
		const willTruncate = accumulatedText.length > MAIN_BUDGET;
		const displayText = isWorking ? mainText + WORKING_INDICATOR : mainText;
		const result = await slack.safePost({
			channel: event.channel,
			ts: messageTs ?? undefined,
			threadTs: messageTs ? undefined : threadParent,
			text: displayText,
		});
		messageTs = result.ts;
		lastMainPostedText = mainText;
		if (willTruncate && !mainTruncated) {
			log.logInfo(
				`[${event.channel}] ✂ truncated main to ${MAX_MAIN_LENGTH}, full response in thread`,
			);
		}
		mainTruncated = willTruncate;
		return true;
	};

	// Flush new overflow to thread. `drain=true` posts everything outstanding
	// (used by replaceMessage and setWorking-false); `drain=false` only flushes
	// while at least MAX_THREAD_CHUNK of UNFLUSHED OVERFLOW is buffered
	// (streaming non-spam — small tails wait for finalize).
	const flushOverflow = async (drain: boolean): Promise<void> => {
		if (!messageTs) return;
		while (true) {
			const start = Math.max(MAIN_BUDGET, overflowFlushedEnd);
			if (start >= accumulatedText.length) break;
			const unflushedOverflow = accumulatedText.length - start;
			if (!drain && unflushedOverflow < MAX_THREAD_CHUNK) break;
			const chunk = accumulatedText.slice(start, start + MAX_THREAD_CHUNK);
			const result = await slack.safePost({
				channel: event.channel,
				threadTs: messageTs,
				text: chunk,
			});
			threadMessageTs.push(result.ts);
			overflowFlushedEnd = start + chunk.length;
		}
	};

	return {
		message: {
			text: event.text,
			rawText: event.text,
			user: event.user,
			userName: user?.userName,
			channel: event.channel,
			ts: event.ts,
			attachments: (event.attachments || []).map((a) => ({ local: a.local })),
		},
		channelName: slack.getChannel(event.channel)?.name,
		store: state.store,
		channels: slack.getAllChannels().map((c) => ({ id: c.id, name: c.name })),
		users: slack
			.getAllUsers()
			.map((u) => ({ id: u.id, userName: u.userName, displayName: u.displayName })),

		respond: async (text: string, shouldLog = true) => {
			updatePromise = updatePromise.then(async () => {
				try {
					accumulatedText = accumulatedText ? `${accumulatedText}\n${text}` : text;
					await postMain();
					await flushOverflow(false);
					if (shouldLog && messageTs) {
						slack.logBotResponse(event.channel, text, messageTs);
					}
				} catch (err) {
					log.logWarning("Slack respond error", err instanceof Error ? err.message : String(err));
				}
			});
			await updatePromise;
		},

		replaceMessage: async (text: string) => {
			updatePromise = updatePromise.then(async () => {
				try {
					accumulatedText = text;
					overflowFlushedEnd = 0; // re-flush from scratch against new content
					await postMain();
					await flushOverflow(true); // immediate full flush — durable against error paths
					if (messageTs) {
						slack.logBotResponse(event.channel, accumulatedText, messageTs);
					}
				} catch (err) {
					log.logWarning(
						"Slack replaceMessage error",
						err instanceof Error ? err.message : String(err),
					);
				}
			});
			await updatePromise;
		},

		respondInThread: async (text: string) => {
			updatePromise = updatePromise.then(async () => {
				try {
					if (!messageTs) return;
					for (let offset = 0; offset < text.length; offset += MAX_THREAD_CHUNK) {
						const chunk = text.slice(offset, offset + MAX_THREAD_CHUNK);
						const result = await slack.safePost({
							channel: event.channel,
							threadTs: messageTs,
							text: chunk,
						});
						threadMessageTs.push(result.ts);
					}
				} catch (err) {
					log.logWarning(
						"Slack respondInThread error",
						err instanceof Error ? err.message : String(err),
					);
				}
			});
			await updatePromise;
		},

		setTyping: async (isTyping: boolean) => {
			if (isTyping && !messageTs) {
				updatePromise = updatePromise.then(async () => {
					try {
						if (!messageTs) {
							const seed = eventFilename ? `_Starting event: ${eventFilename}_` : "_Thinking_";
							accumulatedText = seed;
							const result = await slack.safePost({
								channel: event.channel,
								threadTs: threadParent,
								text: seed + WORKING_INDICATOR,
							});
							messageTs = result.ts;
							lastMainPostedText = seed;
						}
					} catch (err) {
						log.logWarning(
							"Slack setTyping error",
							err instanceof Error ? err.message : String(err),
						);
					}
				});
				await updatePromise;
			}
		},

		uploadFile: async (filePath: string, title?: string) => {
			await slack.uploadFile(event.channel, filePath, title);
		},

		setWorking: async (working: boolean) => {
			updatePromise = updatePromise.then(async () => {
				try {
					isWorking = working;
					if (messageTs) {
						// Use the cached truncated wire payload — never raw accumulatedText,
						// which would re-trigger msg_too_long and cascade.
						const displayText = isWorking
							? lastMainPostedText + WORKING_INDICATOR
							: lastMainPostedText;
						await slack.safePost({
							channel: event.channel,
							ts: messageTs,
							text: displayText,
						});
					}
					// Safety net: drain any unflushed overflow when work completes.
					if (!working) {
						await flushOverflow(true);
					}
				} catch (err) {
					log.logWarning(
						"Slack setWorking error",
						err instanceof Error ? err.message : String(err),
					);
				}
			});
			await updatePromise;
		},

		deleteMessage: async () => {
			updatePromise = updatePromise.then(async () => {
				// Delete thread messages first (in reverse order)
				for (let i = threadMessageTs.length - 1; i >= 0; i--) {
					try {
						await slack.deleteMessage(event.channel, threadMessageTs[i]);
					} catch {
						// Ignore errors deleting thread messages
					}
				}
				threadMessageTs.length = 0;
				// Then delete main message
				if (messageTs) {
					await slack.deleteMessage(event.channel, messageTs);
					messageTs = null;
				}
			});
			await updatePromise;
		},
	};
}
