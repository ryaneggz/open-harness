import { existsSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_REGISTRY = "ghcr.io/ryaneggz";
const DEFAULT_BASE_BRANCH = "development";
const DEFAULT_TAG = "latest";

export interface SandboxOptions {
  name: string;
  branch?: string;
  baseBranch?: string;
  tag?: string;
  docker?: boolean;
  registry?: string;
}

export class SandboxConfig {
  readonly name: string;
  readonly branch: string;
  readonly baseBranch: string;
  readonly tag: string;
  readonly docker: boolean;
  readonly registry: string;

  constructor(opts: SandboxOptions) {
    this.name = opts.name;
    this.branch = opts.branch ?? process.env.BRANCH ?? `agent/${opts.name}`;
    this.baseBranch = opts.baseBranch ?? process.env.BASE_BRANCH ?? DEFAULT_BASE_BRANCH;
    this.tag = opts.tag ?? process.env.TAG ?? DEFAULT_TAG;
    this.docker = opts.docker ?? process.env.DOCKER === "true";
    this.registry = opts.registry ?? DEFAULT_REGISTRY;
  }

  get image(): string {
    return `${this.registry}/${this.name}:${this.tag}`;
  }

  get worktreePath(): string {
    return `.worktrees/${this.branch}`;
  }

  get worktreeAbsPath(): string {
    return resolve(process.cwd(), this.worktreePath);
  }

  get projectRoot(): string {
    const worktree = this.worktreePath;
    if (existsSync(resolve(process.cwd(), worktree, "docker", "Dockerfile"))) {
      return worktree;
    }
    return ".";
  }

  get projectRootAbs(): string {
    return resolve(process.cwd(), this.projectRoot);
  }

  get dockerfilePath(): string {
    return `${this.projectRoot}/docker/Dockerfile`;
  }

  get composeFile(): string {
    return `${this.projectRoot}/docker/docker-compose.yml`;
  }

  get composeDockerFile(): string {
    return `${this.projectRoot}/docker/docker-compose.docker.yml`;
  }
}
