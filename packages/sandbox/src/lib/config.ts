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
    this.composeFiles = files;
  }
}

/**
 * Read SANDBOX_NAME from .devcontainer/.env
 */
function readEnvName(): string | undefined {
  if (!existsSync(ENV_FILE)) return undefined;
  try {
    const content = readFileSync(ENV_FILE, "utf-8");
    const match = content.match(/^SANDBOX_NAME=(.+)$/m);
    return match?.[1]?.trim() || undefined;
  } catch {
    return undefined;
  }
}
