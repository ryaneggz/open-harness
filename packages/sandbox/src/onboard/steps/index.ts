import { claudeStep } from "./claude.js";
import { cloudflareStep } from "./cloudflare.js";
import { githubStep } from "./github.js";
import { llmStep } from "./llm.js";
import { slackStep } from "./slack.js";
import { sshStep } from "./ssh.js";
import type { Step } from "../types.js";

/**
 * Execution order: llm → github → slack → ssh → cloudflare → claude.
 *
 * GitHub runs second (right after LLM) so that its credentials are in place
 * before anything else, and — crucially — before SSH. `gh auth login` can
 * generate and upload an SSH key itself, which lets the ssh step fast-path
 * in the common case. See .claude/specs/onboard-github-before-ssh.md.
 */
export const ALL_STEPS: readonly Step[] = [
  llmStep,
  githubStep,
  slackStep,
  sshStep,
  cloudflareStep,
  claudeStep,
] as const;

export { llmStep, slackStep, sshStep, githubStep, cloudflareStep, claudeStep };
