import { claudeStep } from "./claude.js";
import { cloudflareStep } from "./cloudflare.js";
import { githubStep } from "./github.js";
import { llmStep } from "./llm.js";
import { slackStep } from "./slack.js";
import { sshStep } from "./ssh.js";
import type { Step } from "../types.js";

/** Execution order matches the bash script (llm → slack → ssh → github → cloudflare → claude). */
export const ALL_STEPS: readonly Step[] = [
  llmStep,
  slackStep,
  sshStep,
  githubStep,
  cloudflareStep,
  claudeStep,
] as const;

export { llmStep, slackStep, sshStep, githubStep, cloudflareStep, claudeStep };
