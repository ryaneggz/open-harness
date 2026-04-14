import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const BASE_COMPOSE = ".devcontainer/docker-compose.yml";
const CONFIG_PATH = ".openharness/config.json";
const ENV_FILE = ".devcontainer/.env";
const INIT_ENV = ".devcontainer/init-env.sh";

export interface SandboxOptions {
  name?: string;
}

export class SandboxConfig {
  readonly name: string;
  readonly composeFiles: string[];
  readonly envFile: string;

  constructor(opts: SandboxOptions = {}) {
    this.envFile = ENV_FILE;

    // Resolve name: explicit > .env file > init-env.sh fallback
    if (opts.name) {
      this.name = opts.name;
    } else {
      // Try running init-env.sh to generate .env, then read SANDBOX_NAME
      if (existsSync(INIT_ENV)) {
        try {
          execSync(`bash ${INIT_ENV}`, { stdio: "pipe" });
        } catch {
          // Ignore — .env may already exist
        }
      }
      this.name = readEnvName() ?? "sandbox";
    }

    // Build compose file list: base + overlays from config.json
    const files: string[] = [BASE_COMPOSE];
    if (existsSync(CONFIG_PATH)) {
      try {
        const raw = readFileSync(CONFIG_PATH, "utf-8");
        const config = JSON.parse(raw) as { composeOverrides?: string[] };
        if (Array.isArray(config.composeOverrides)) {
          for (const override of config.composeOverrides) {
            if (existsSync(override)) {
              files.push(override);
            }
          }
        }
      } catch {
        // Ignore parse errors — use base only
      }
    }
    // Auto-enable SSH overlay when HOST_SSH_DIR is set
    const sshOverlay = ".devcontainer/docker-compose.ssh.yml";
    if (!files.includes(sshOverlay) && existsSync(sshOverlay)) {
      const hostSshDir = process.env.HOST_SSH_DIR ?? readEnvVar(ENV_FILE, "HOST_SSH_DIR");
      if (hostSshDir) {
        files.push(sshOverlay);
      }
    }

    this.composeFiles = files;
  }
}

/**
 * Read a variable from a .env file.
 */
function readEnvVar(envPath: string, key: string): string | undefined {
  if (!existsSync(envPath)) return undefined;
  try {
    const content = readFileSync(envPath, "utf-8");
    const match = content.match(new RegExp(`^${key}=(.+)$`, "m"));
    return match?.[1]?.trim() || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Read SANDBOX_NAME from .devcontainer/.env
 */
function readEnvName(): string | undefined {
  return readEnvVar(ENV_FILE, "SANDBOX_NAME");
}
