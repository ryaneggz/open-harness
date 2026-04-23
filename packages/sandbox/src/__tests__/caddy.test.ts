import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// In-memory fs mock so we can simulate .devcontainer/.env for detectMode.
const fs = new Map<string, string>();

vi.mock("node:fs", () => ({
  existsSync: (p: string) => fs.has(p),
  readFileSync: (p: string) => fs.get(p) ?? "",
  writeFileSync: (p: string, data: string) => {
    fs.set(p, data);
  },
  renameSync: (a: string, b: string) => {
    const v = fs.get(a);
    fs.delete(a);
    if (v !== undefined) fs.set(b, v);
  },
  mkdirSync: () => {},
}));

beforeEach(() => {
  fs.clear();
  delete process.env.PUBLIC_DOMAIN;
  delete process.env.ACME_EMAIL;
});

afterEach(() => {
  delete process.env.PUBLIC_DOMAIN;
  delete process.env.ACME_EMAIL;
});

const { detectMode, hostFor, renderCaddyfile, validateRouteName, writeCaddyfile } =
  await import("../lib/caddy.js");

describe("detectMode", () => {
  it("returns local when PUBLIC_DOMAIN is unset", () => {
    expect(detectMode()).toEqual({ mode: "local" });
  });

  it("returns remote when PUBLIC_DOMAIN is in process.env", () => {
    process.env.PUBLIC_DOMAIN = "harness.example.com";
    expect(detectMode()).toEqual({
      mode: "remote",
      publicDomain: "harness.example.com",
      acmeEmail: undefined,
    });
  });

  it("reads PUBLIC_DOMAIN from .devcontainer/.env when process.env unset", async () => {
    const { resolve } = await import("node:path");
    fs.set(resolve(".devcontainer/.env"), "PUBLIC_DOMAIN=harness.example.com\n");
    expect(detectMode()).toEqual({
      mode: "remote",
      publicDomain: "harness.example.com",
      acmeEmail: undefined,
    });
  });

  it("reads ACME_EMAIL from .env when set", async () => {
    const { resolve } = await import("node:path");
    fs.set(
      resolve(".devcontainer/.env"),
      "PUBLIC_DOMAIN=harness.example.com\nACME_EMAIL=you@example.com\n",
    );
    expect(detectMode()).toEqual({
      mode: "remote",
      publicDomain: "harness.example.com",
      acmeEmail: "you@example.com",
    });
  });

  it("prefers process.env over .env file", async () => {
    const { resolve } = await import("node:path");
    fs.set(resolve(".devcontainer/.env"), "PUBLIC_DOMAIN=old.example.com\n");
    process.env.PUBLIC_DOMAIN = "new.example.com";
    expect(detectMode().publicDomain).toBe("new.example.com");
  });
});

describe("validateRouteName", () => {
  it("accepts simple names", () => {
    expect(() => validateRouteName("docs")).not.toThrow();
    expect(() => validateRouteName("my-app")).not.toThrow();
    expect(() => validateRouteName("a1b2c3")).not.toThrow();
  });

  it("rejects names starting with digit", () => {
    expect(() => validateRouteName("1docs")).toThrow(/Invalid route name/);
  });

  it("rejects uppercase", () => {
    expect(() => validateRouteName("Docs")).toThrow(/Invalid route name/);
  });

  it("rejects overlong names", () => {
    expect(() => validateRouteName("a".repeat(40))).toThrow(/Invalid route name/);
  });

  it("rejects reserved names", () => {
    expect(() => validateRouteName("admin")).toThrow(/reserved/);
    expect(() => validateRouteName("www")).toThrow(/reserved/);
    expect(() => validateRouteName("gateway")).toThrow(/reserved/);
    expect(() => validateRouteName("api-internal")).toThrow(/reserved/);
  });
});

describe("hostFor", () => {
  it("local mode → <name>.<sandbox>.localhost", () => {
    const host = hostFor({ name: "docs", port: 8080, sandbox: "oh-local" }, { mode: "local" });
    expect(host).toBe("docs.oh-local.localhost");
  });

  it("remote mode → <name>.<sandbox>.<publicDomain>", () => {
    const host = hostFor(
      { name: "docs", port: 8080, sandbox: "oh-local" },
      { mode: "remote", publicDomain: "harness.example.com" },
    );
    expect(host).toBe("docs.oh-local.harness.example.com");
  });

  it("throws when remote mode has no publicDomain", () => {
    expect(() =>
      hostFor({ name: "docs", port: 8080, sandbox: "oh-local" }, { mode: "remote" }),
    ).toThrow(/publicDomain/);
  });
});

describe("renderCaddyfile", () => {
  it("local mode: emits tls internal and auto_https disable_redirects", () => {
    const out = renderCaddyfile([{ name: "docs", port: 8080, sandbox: "oh-local" }], {
      mode: "local",
    });
    expect(out).toContain("admin 0.0.0.0:2019");
    expect(out).toContain("auto_https disable_redirects");
    expect(out).toContain("docs.oh-local.localhost:443 {");
    expect(out).toContain("tls internal");
    expect(out).toContain("reverse_proxy oh-local:8080");
  });

  it("remote mode: emits email and no tls internal", () => {
    const out = renderCaddyfile([{ name: "docs", port: 8080, sandbox: "oh-local" }], {
      mode: "remote",
      publicDomain: "harness.example.com",
      acmeEmail: "you@example.com",
    });
    expect(out).toContain("email you@example.com");
    expect(out).not.toContain("tls internal");
    expect(out).not.toContain("auto_https disable_redirects");
    expect(out).toContain("docs.oh-local.harness.example.com {");
    expect(out).toContain("reverse_proxy oh-local:8080");
  });

  it("empty routes → still emits global block only", () => {
    const out = renderCaddyfile([], { mode: "local" });
    expect(out).toContain("admin 0.0.0.0:2019");
    expect(out).not.toContain("reverse_proxy");
  });

  it("multiple routes → each gets its own site block", () => {
    const out = renderCaddyfile(
      [
        { name: "docs", port: 8080, sandbox: "oh-local" },
        { name: "api", port: 3000, sandbox: "oh-local" },
      ],
      { mode: "local" },
    );
    expect(out).toMatch(/docs\.oh-local\.localhost:443 \{/);
    expect(out).toMatch(/api\.oh-local\.localhost:443 \{/);
    expect((out.match(/reverse_proxy/g) ?? []).length).toBe(2);
  });

  it("includes header warning that it is generated", () => {
    const out = renderCaddyfile([], { mode: "local" });
    expect(out).toMatch(/^# Generated/);
  });
});

describe("writeCaddyfile", () => {
  it("writes via tmp + rename to .openharness/Caddyfile", async () => {
    writeCaddyfile("content");
    const { resolve } = await import("node:path");
    const path = resolve(".openharness/Caddyfile");
    expect(fs.has(path)).toBe(true);
    expect(fs.get(path)).toBe("content");
    // tmp should be gone
    expect(fs.has(`${path}.tmp`)).toBe(false);
  });
});
