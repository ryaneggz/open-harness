import { describe, it, expect, vi } from "vitest";

// Mock fs and child_process before importing anything that uses config
vi.mock("node:fs", () => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => ""),
}));

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

const { SandboxConfig } = await import("../lib/config.js");
const { composeCmd, composeEnv, composeUp, composeDown, execCmd, psCmd } =
  await import("../lib/docker.js");

function makeConfig(name = "test-agent") {
  return new SandboxConfig({ name });
}

describe("docker command builders", () => {
  describe("composeCmd", () => {
    it("builds base compose command with env-file and project name", () => {
      const config = makeConfig();
      const cmd = composeCmd(config);
      expect(cmd[0]).toBe("docker");
      expect(cmd[1]).toBe("compose");
      expect(cmd).toContain("--env-file");
      expect(cmd).toContain(".devcontainer/.env");
      expect(cmd).toContain("-f");
      expect(cmd).toContain(".devcontainer/docker-compose.yml");
      expect(cmd).toContain("-p");
      expect(cmd).toContain("test-agent");
    });

    it("includes all compose files from config", () => {
      // Config with explicit name always has at least the base compose file
      const config = makeConfig();
      const cmd = composeCmd(config);
      const fIndices = cmd.reduce<number[]>((acc, v, i) => (v === "-f" ? [...acc, i] : acc), []);
      expect(fIndices.length).toBeGreaterThanOrEqual(1);
      expect(cmd[fIndices[0] + 1]).toBe(".devcontainer/docker-compose.yml");
    });
  });

  describe("composeEnv", () => {
    it("includes SANDBOX_NAME", () => {
      const config = makeConfig();
      expect(composeEnv(config)).toEqual({ SANDBOX_NAME: "test-agent" });
    });
  });

  describe("composeUp", () => {
    it("appends up -d --build", () => {
      const config = makeConfig();
      const cmd = composeUp(config);
      expect(cmd.slice(-3)).toEqual(["up", "-d", "--build"]);
    });

    it("omits --build when build: false", () => {
      const config = makeConfig();
      const cmd = composeUp(config, { build: false });
      expect(cmd.slice(-2)).toEqual(["up", "-d"]);
      expect(cmd).not.toContain("--build");
    });

    it("appends --force-recreate when forceRecreate: true", () => {
      const config = makeConfig();
      const cmd = composeUp(config, { build: false, forceRecreate: true });
      expect(cmd.slice(-3)).toEqual(["up", "-d", "--force-recreate"]);
      expect(cmd).not.toContain("--build");
    });

    it("combines --build and --force-recreate", () => {
      const config = makeConfig();
      const cmd = composeUp(config, { build: true, forceRecreate: true });
      expect(cmd.slice(-4)).toEqual(["up", "-d", "--build", "--force-recreate"]);
    });
  });

  describe("composeDown", () => {
    it("appends down", () => {
      const config = makeConfig();
      const cmd = composeDown(config);
      expect(cmd[cmd.length - 1]).toBe("down");
    });

    it("adds -v flag for volume removal", () => {
      const config = makeConfig();
      const cmd = composeDown(config, true);
      expect(cmd).toContain("-v");
    });

    it("does not add -v flag by default", () => {
      const config = makeConfig();
      const cmd = composeDown(config);
      expect(cmd).not.toContain("-v");
    });
  });

  describe("execCmd", () => {
    it("builds basic exec command", () => {
      const cmd = execCmd("my-sandbox", ["bash", "--login"]);
      expect(cmd).toEqual(["docker", "exec", "my-sandbox", "bash", "--login"]);
    });

    it("adds --user flag", () => {
      const cmd = execCmd("my-sandbox", ["bash"], { user: "sandbox" });
      expect(cmd).toContain("--user");
      expect(cmd).toContain("sandbox");
    });

    it("adds -it flags for interactive", () => {
      const cmd = execCmd("my-sandbox", ["bash"], { interactive: true });
      expect(cmd).toContain("-it");
    });

    it("adds -w workdir flag", () => {
      const cmd = execCmd("my-sandbox", ["ls"], { workdir: "/home/sandbox/workspace" });
      expect(cmd).toContain("-w");
      expect(cmd).toContain("/home/sandbox/workspace");
    });

    it("adds -e env flags", () => {
      const cmd = execCmd("my-sandbox", ["bash"], { env: { HOME: "/home/sandbox" } });
      expect(cmd).toContain("-e");
      expect(cmd).toContain("HOME=/home/sandbox");
    });
  });

  describe("psCmd", () => {
    it("builds docker ps with sandbox filter", () => {
      const cmd = psCmd();
      expect(cmd[0]).toBe("docker");
      expect(cmd[1]).toBe("ps");
      expect(cmd).toContain("--filter");
      expect(cmd).toContain("label=com.docker.compose.service=sandbox");
    });
  });
});
