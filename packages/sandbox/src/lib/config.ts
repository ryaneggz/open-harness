import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
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
  /**
   * Add a compose override path to .openharness/config.json (idempotent).
   * Creates the file (and parent directory) if they do not exist.
   */
  static addOverride(path: string): void {
    let config: { composeOverrides: string[] } = { composeOverrides: [] };
    if (existsSync(CONFIG_PATH)) {
      try {
        const raw = readFileSync(CONFIG_PATH, "utf-8");
        const parsed = JSON.parse(raw) as { composeOverrides?: string[] };
        config = {
          composeOverrides: Array.isArray(parsed.composeOverrides) ? parsed.composeOverrides : [],
        };
      } catch {
        // Ignore parse errors — start fresh
      }
    }
    if (config.composeOverrides.includes(path)) {
      return; // already present — idempotent no-op
    }
    config.composeOverrides.push(path);
    SandboxConfig._writeConfig(config);
  }

  /**
   * Remove a compose override path from .openharness/config.json (idempotent).
   * No-op if the path is not present or the file does not exist.
   */
  static removeOverride(path: string): void {
    if (!existsSync(CONFIG_PATH)) return;
    let config: { composeOverrides: string[] } = { composeOverrides: [] };
    try {
      const raw = readFileSync(CONFIG_PATH, "utf-8");
      const parsed = JSON.parse(raw) as { composeOverrides?: string[] };
      config = {
        composeOverrides: Array.isArray(parsed.composeOverrides) ? parsed.composeOverrides : [],
      };
    } catch {
      return; // Unparseable — nothing to remove
    }
    const filtered = config.composeOverrides.filter((p) => p !== path);
    if (filtered.length === config.composeOverrides.length) {
      return; // not present — idempotent no-op
    }
    SandboxConfig._writeConfig({ composeOverrides: filtered });
  }

  /**
   * Write or replace a KEY=value line in .devcontainer/.env (idempotent).
   * Creates the file if it does not exist.
   */
  static upsertEnvVar(key: string, value: string): void {
    const envDir = dirname(ENV_FILE);
    if (!existsSync(envDir)) {
      mkdirSync(envDir, { recursive: true });
    }
    let content = "";
    if (existsSync(ENV_FILE)) {
      content = readFileSync(ENV_FILE, "utf-8");
    }
    // Strip any existing KEY=... line (handles trailing \r)
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    content = content.replace(new RegExp(`^${escaped}=.*\r?\n?`, "m"), "");
    // Normalise: ensure content ends with exactly one newline (or is empty)
    if (content.length > 0 && !content.endsWith("\n")) {
      content += "\n";
    }
    content += `${key}=${value}\n`;
    writeFileSync(ENV_FILE, content, "utf-8");
  }

  /**
   * Atomically write config to CONFIG_PATH via a tmp file + rename.
   * Creates parent directory if needed.
   */
  private static _writeConfig(config: { composeOverrides: string[] }): void {
    const dir = dirname(CONFIG_PATH);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const tmp = `${CONFIG_PATH}.tmp`;
    writeFileSync(tmp, JSON.stringify(config, null, 2) + "\n", "utf-8");
    renameSync(tmp, CONFIG_PATH);
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
