import { SandboxConfig } from "./config.js";

/**
 * Build the base `docker compose` command with env-file, project, and compose file flags.
 */
export function composeCmd(config: SandboxConfig): string[] {
  const cmd = ["docker", "compose", "--env-file", config.envFile];

  for (const file of config.composeFiles) {
    cmd.push("-f", file);
  }

  cmd.push("-p", config.name);
  return cmd;
}

/**
 * Environment variables to pass to docker compose.
 */
export function composeEnv(config: SandboxConfig): Record<string, string> {
  return { SANDBOX_NAME: config.name };
}

/**
 * Build the `docker compose up` command.
 *
 * @param config  Sandbox configuration.
 * @param opts.build          Append `--build` (default: true).
 * @param opts.forceRecreate  Append `--force-recreate` (default: false).
 */
export function composeUp(
  config: SandboxConfig,
  opts: { build?: boolean; forceRecreate?: boolean } = {},
): string[] {
  const cmd = [...composeCmd(config), "up", "-d"];
  if (opts.build ?? true) cmd.push("--build");
  if (opts.forceRecreate) cmd.push("--force-recreate");
  return cmd;
}

/**
 * Build the `docker compose down` command.
 */
export function composeDown(config: SandboxConfig, volumes = false): string[] {
  const cmd = [...composeCmd(config), "down"];
  if (volumes) {
    cmd.push("-v");
  }
  return cmd;
}

/**
 * Build a `docker exec` command.
 */
export function execCmd(
  name: string,
  command: string[],
  opts: {
    user?: string;
    interactive?: boolean;
    workdir?: string;
    env?: Record<string, string>;
  } = {},
): string[] {
  const cmd = ["docker", "exec"];

  if (opts.user) {
    cmd.push("--user", opts.user);
  }

  if (opts.interactive) {
    cmd.push("-it");
  }

  if (opts.workdir) {
    cmd.push("-w", opts.workdir);
  }

  if (opts.env) {
    for (const [key, value] of Object.entries(opts.env)) {
      cmd.push("-e", `${key}=${value}`);
    }
  }

  cmd.push(name, ...command);
  return cmd;
}

/**
 * Build a `docker ps` command filtered by compose service label.
 */
export function psCmd(): string[] {
  return [
    "docker",
    "ps",
    "--filter",
    "label=com.docker.compose.service=sandbox",
    "--format",
    "table {{.Names}}\t{{.Status}}\t{{.Image}}",
  ];
}
