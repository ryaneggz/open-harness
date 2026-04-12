import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";

// Mock fs and child_process before importing config
vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockExecSync = vi.mocked(execSync);

// Import after mocks are set up
const { SandboxConfig } = await import("../lib/config.js");

describe("SandboxConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no files exist
    mockExistsSync.mockReturnValue(false);
  });

  it("uses explicit name when provided", () => {
    const config = new SandboxConfig({ name: "my-sandbox" });
    expect(config.name).toBe("my-sandbox");
  });

  it("falls back to 'sandbox' when no name can be resolved", () => {
    const config = new SandboxConfig();
    expect(config.name).toBe("sandbox");
  });

  it("reads SANDBOX_NAME from .env when init-env.sh exists", () => {
    mockExistsSync.mockImplementation((path) => {
      if (String(path) === ".devcontainer/init-env.sh") return true;
      if (String(path) === ".devcontainer/.env") return true;
      return false;
    });
    mockReadFileSync.mockReturnValue("SANDBOX_NAME=open-harness\n");

    const config = new SandboxConfig();
    expect(config.name).toBe("open-harness");
    expect(mockExecSync).toHaveBeenCalledWith("bash .devcontainer/init-env.sh", { stdio: "pipe" });
  });

  it("always includes base compose file", () => {
    const config = new SandboxConfig({ name: "test" });
    expect(config.composeFiles[0]).toBe(".devcontainer/docker-compose.yml");
  });

  it("appends overlays from config.json when they exist", () => {
    mockExistsSync.mockImplementation((path) => {
      const p = String(path);
      if (p === ".openharness/config.json") return true;
      if (p === ".devcontainer/docker-compose.docker.yml") return true;
      if (p === ".devcontainer/docker-compose.cloudflared.yml") return true;
      return false;
    });
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        composeOverrides: [
          ".devcontainer/docker-compose.docker.yml",
          ".devcontainer/docker-compose.cloudflared.yml",
          ".devcontainer/docker-compose.missing.yml",
        ],
      }),
    );

    const config = new SandboxConfig({ name: "test" });
    expect(config.composeFiles).toEqual([
      ".devcontainer/docker-compose.yml",
      ".devcontainer/docker-compose.docker.yml",
      ".devcontainer/docker-compose.cloudflared.yml",
    ]);
  });

  it("skips overlays that do not exist on disk", () => {
    mockExistsSync.mockImplementation((path) => {
      if (String(path) === ".openharness/config.json") return true;
      return false;
    });
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        composeOverrides: [".devcontainer/docker-compose.missing.yml"],
      }),
    );

    const config = new SandboxConfig({ name: "test" });
    expect(config.composeFiles).toEqual([".devcontainer/docker-compose.yml"]);
  });

  it("handles malformed config.json gracefully", () => {
    mockExistsSync.mockImplementation((path) => {
      if (String(path) === ".openharness/config.json") return true;
      return false;
    });
    mockReadFileSync.mockReturnValue("not valid json");

    const config = new SandboxConfig({ name: "test" });
    expect(config.composeFiles).toEqual([".devcontainer/docker-compose.yml"]);
  });

  it("sets envFile to .devcontainer/.env", () => {
    const config = new SandboxConfig({ name: "test" });
    expect(config.envFile).toBe(".devcontainer/.env");
  });
});
