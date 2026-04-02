import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SandboxConfig } from "../lib/config.js";

describe("SandboxConfig", () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.BRANCH;
    delete process.env.BASE_BRANCH;
    delete process.env.TAG;
    delete process.env.DOCKER;
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it("resolves defaults from name", () => {
    const config = new SandboxConfig({ name: "my-agent" });
    expect(config.name).toBe("my-agent");
    expect(config.branch).toBe("agent/my-agent");
    expect(config.baseBranch).toBe("development");
    expect(config.tag).toBe("latest");
    expect(config.docker).toBe(false);
    expect(config.registry).toBe("ghcr.io/ryaneggz");
  });

  it("derives image from registry, name, and tag", () => {
    const config = new SandboxConfig({ name: "blog-writer", tag: "v2" });
    expect(config.image).toBe("ghcr.io/ryaneggz/blog-writer:v2");
  });

  it("derives worktree path from branch", () => {
    const config = new SandboxConfig({ name: "zoho-crm" });
    expect(config.worktreePath).toBe(".worktrees/agent/zoho-crm");
  });

  it("accepts custom branch", () => {
    const config = new SandboxConfig({ name: "cli", branch: "feat/cli" });
    expect(config.branch).toBe("feat/cli");
    expect(config.worktreePath).toBe(".worktrees/feat/cli");
  });

  it("reads BRANCH from env var", () => {
    process.env.BRANCH = "custom/branch";
    const config = new SandboxConfig({ name: "test" });
    expect(config.branch).toBe("custom/branch");
  });

  it("reads BASE_BRANCH from env var", () => {
    process.env.BASE_BRANCH = "main";
    const config = new SandboxConfig({ name: "test" });
    expect(config.baseBranch).toBe("main");
  });

  it("reads TAG from env var", () => {
    process.env.TAG = "nightly";
    const config = new SandboxConfig({ name: "test" });
    expect(config.tag).toBe("nightly");
  });

  it("reads DOCKER from env var", () => {
    process.env.DOCKER = "true";
    const config = new SandboxConfig({ name: "test" });
    expect(config.docker).toBe(true);
  });

  it("explicit options override env vars", () => {
    process.env.BRANCH = "env-branch";
    process.env.TAG = "env-tag";
    const config = new SandboxConfig({ name: "test", branch: "opt-branch", tag: "opt-tag" });
    expect(config.branch).toBe("opt-branch");
    expect(config.tag).toBe("opt-tag");
  });

  it("accepts custom registry", () => {
    const config = new SandboxConfig({ name: "test", registry: "docker.io/myorg" });
    expect(config.image).toBe("docker.io/myorg/test:latest");
  });

  it("falls back to repo root for projectRoot when worktree does not exist", () => {
    const config = new SandboxConfig({ name: "nonexistent" });
    expect(config.projectRoot).toBe(".");
  });

  it("derives dockerfile and compose paths from projectRoot", () => {
    const config = new SandboxConfig({ name: "test" });
    const root = config.projectRoot;
    expect(config.dockerfilePath).toBe(`${root}/docker/Dockerfile`);
    expect(config.composeFile).toBe(`${root}/docker/docker-compose.yml`);
    expect(config.composeDockerFile).toBe(`${root}/docker/docker-compose.docker.yml`);
  });
});
