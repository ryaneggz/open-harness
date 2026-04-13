import { homedir } from "os";
import { join } from "path";

/** Resolve the openharness agent config directory (env var > default). */
export function resolveAgentDir(): string {
	return process.env.OPENHARNESS_CODING_AGENT_DIR
		|| process.env.PI_CODING_AGENT_DIR
		|| join(homedir(), ".openharness", "agent");
}

/** Resolve the legacy .pi agent config directory. */
export function resolveLegacyAgentDir(): string {
	return join(homedir(), ".pi", "agent");
}
