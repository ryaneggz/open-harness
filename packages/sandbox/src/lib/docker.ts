import { SandboxConfig } from "./config.js";

/**
 * Build the base `docker compose` command with project and file flags.
 */
export function composeCmd(config: SandboxConfig): string[] {
  const cmd = ["docker", "compose", "-f", config.composeFile, "-p", config.name];

  if (config.docker) {
    cmd.push("-f", config.composeDockerFile);
  }

  return cmd;
}

/**
 * Environment variables to pass to docker compose.
 */
export function composeEnv(config: SandboxConfig): Record<string, string> {
  return { NAME: config.name };
}

/**
 * Build the `docker build` command.
 */
export function buildCmd(config: SandboxConfig, noCache = false): string[] {
  const cmd = ["docker", "build", "-f", config.dockerfilePath, "-t", config.image];

  if (noCache) {
    cmd.push("--no-cache");
  }

  cmd.push(config.projectRoot);
  return cmd;
}

/**
 * Build the `docker compose up -d` command.
 */
export function composeUp(config: SandboxConfig): string[] {
  return [...composeCmd(config), "up", "-d"];
}

/**
 * Build the `docker compose down` command.
 */
export function composeDown(config: SandboxConfig, rmi = false): string[] {
  const cmd = [...composeCmd(config), "down"];
  if (rmi) {
    cmd.push("--rmi", "local");
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
 * Build the `docker push` command.
 */
export function pushCmd(config: SandboxConfig): string[] {
  return ["docker", "push", config.image];
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
