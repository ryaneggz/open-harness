import { describe, it, expect } from "vitest";
import { SandboxConfig } from "../lib/config.js";
import {
  composeCmd,
  composeEnv,
  buildCmd,
  composeUp,
  composeDown,
  execCmd,
  pushCmd,
  psCmd,
} from "../lib/docker.js";

function makeConfig(overrides: Partial<import("../lib/config.js").SandboxOptions> = {}) {
  return new SandboxConfig({ name: "test-agent", ...overrides });
}

describe("docker command builders", () => {
  describe("composeCmd", () => {
    it("builds base compose command", () => {
      const config = makeConfig();
      const cmd = composeCmd(config);
      expect(cmd).toEqual(["docker", "compose", "-f", config.composeFile, "-p", "test-agent"]);
    });

    it("includes docker-in-docker overlay when docker=true", () => {
      const config = makeConfig({ docker: true });
      const cmd = composeCmd(config);
      expect(cmd).toContain("-f");
      expect(cmd).toContain(config.composeDockerFile);
    });
  });

  describe("composeEnv", () => {
    it("includes NAME", () => {
      const config = makeConfig();
      expect(composeEnv(config)).toEqual({ NAME: "test-agent" });
    });
  });

  describe("buildCmd", () => {
    it("builds docker build command", () => {
      const config = makeConfig();
      const cmd = buildCmd(config);
      expect(cmd[0]).toBe("docker");
      expect(cmd[1]).toBe("build");
      expect(cmd).toContain("-f");
      expect(cmd).toContain(config.dockerfilePath);
      expect(cmd).toContain("-t");
      expect(cmd).toContain(config.image);
      expect(cmd[cmd.length - 1]).toBe(config.projectRoot);
    });

    it("adds --no-cache flag", () => {
      const config = makeConfig();
      const cmd = buildCmd(config, true);
      expect(cmd).toContain("--no-cache");
    });
  });

  describe("composeUp", () => {
    it("appends up -d", () => {
      const config = makeConfig();
      const cmd = composeUp(config);
      expect(cmd.slice(-2)).toEqual(["up", "-d"]);
    });
  });

  describe("composeDown", () => {
    it("appends down", () => {
      const config = makeConfig();
      const cmd = composeDown(config);
      expect(cmd[cmd.length - 1]).toBe("down");
    });

    it("adds --rmi local flag", () => {
      const config = makeConfig();
      const cmd = composeDown(config, true);
      expect(cmd).toContain("--rmi");
      expect(cmd).toContain("local");
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
      const cmd = execCmd("my-sandbox", ["ls"], { workdir: "/home/sandbox/harness/workspace" });
      expect(cmd).toContain("-w");
      expect(cmd).toContain("/home/sandbox/harness/workspace");
    });

    it("adds -e env flags", () => {
      const cmd = execCmd("my-sandbox", ["bash"], { env: { HOME: "/home/sandbox" } });
      expect(cmd).toContain("-e");
      expect(cmd).toContain("HOME=/home/sandbox");
    });
  });

  describe("pushCmd", () => {
    it("builds docker push command", () => {
      const config = makeConfig();
      const cmd = pushCmd(config);
      expect(cmd).toEqual(["docker", "push", config.image]);
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
