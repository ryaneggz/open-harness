import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const distDir = join(import.meta.dirname, "../../dist");

const REQUIRED_DIST_FILES = [
	"main.js",
	"agent.js",
	"events.js",
	"slack.js",
	"log.js",
	"context.js",
	"sandbox.js",
	"store.js",
];

describe("dist integrity", () => {
	describe("required dist files exist", () => {
		for (const file of REQUIRED_DIST_FILES) {
			it(`dist/${file} exists`, () => {
				expect(existsSync(join(distDir, file))).toBe(true);
			});
		}
	});

	describe("dist files are not empty", () => {
		for (const file of REQUIRED_DIST_FILES) {
			it(`dist/${file} has content`, () => {
				const filePath = join(distDir, file);
				if (!existsSync(filePath)) {
					// Skip if file doesn't exist — the existence test will catch it
					return;
				}
				const content = readFileSync(filePath, "utf-8");
				expect(content.length).toBeGreaterThan(0);
			});
		}
	});

	describe("entry point structure (main.js)", () => {
		const mainPath = join(distDir, "main.js");

		it("starts with shebang #!/usr/bin/env node", () => {
			const content = readFileSync(mainPath, "utf-8");
			expect(content.startsWith("#!/usr/bin/env node")).toBe(true);
		});

		it("imports or requires agent.js", () => {
			const content = readFileSync(mainPath, "utf-8");
			const hasImport =
				content.includes('import "./agent.js"') ||
				content.includes('import * from "./agent.js"') ||
				content.includes('require("./agent.js")') ||
				content.includes("require('./agent.js')") ||
				content.includes("from \"./agent.js\"") ||
				content.includes("from './agent.js'");
			expect(hasImport).toBe(true);
		});

		it("imports or requires events.js", () => {
			const content = readFileSync(mainPath, "utf-8");
			const hasImport =
				content.includes('import "./events.js"') ||
				content.includes('import * from "./events.js"') ||
				content.includes('require("./events.js")') ||
				content.includes("require('./events.js')") ||
				content.includes("from \"./events.js\"") ||
				content.includes("from './events.js'");
			expect(hasImport).toBe(true);
		});
	});

	describe("tool status indicators (agent.js)", () => {
		const agentPath = join(distDir, "agent.js");

		it("does NOT contain tool result thread posts", () => {
			const content = readFileSync(agentPath, "utf-8");
			expect(content).not.toContain("tool result thread");
		});

		it("contains Slack emoji shortcodes for status indicators", () => {
			const content = readFileSync(agentPath, "utf-8");
			expect(content).toContain(":white_check_mark:");
			expect(content).toContain(":x:");
		});

		it("still uses isError for logging and icon selection", () => {
			const content = readFileSync(agentPath, "utf-8");
			expect(content).toContain("isError");
		});
	});

	describe("event thread support (events.js)", () => {
		const eventsPath = join(distDir, "events.js");

		it("contains threadTs references (at least 3 — immediate, one-shot, periodic)", () => {
			const content = readFileSync(eventsPath, "utf-8");
			const matches = content.match(/threadTs/g) ?? [];
			expect(matches.length).toBeGreaterThanOrEqual(3);
		});

		it("passes threadTs through to synthetic SlackEvent", () => {
			const content = readFileSync(eventsPath, "utf-8");

			// threadTs must flow from event parsing to the synthetic SlackEvent.
			// This can be via buildSyntheticEvent() or inline in execute().
			// Either way, "threadTs" must appear in the synthetic event object.
			const hasBuildFn = content.includes("buildSyntheticEvent");
			const hasInlineThreadTs = content.includes("syntheticEvent") &&
				content.includes("threadTs: event.threadTs");

			expect(hasBuildFn || hasInlineThreadTs).toBe(true);
		});
	});

	describe("thread parent routing (main.js)", () => {
		const mainPath = join(distDir, "main.js");

		it("contains threadParent variable", () => {
			const content = readFileSync(mainPath, "utf-8");
			expect(content).toContain("threadParent");
		});

		it("contains postInThread calls using threadParent", () => {
			const content = readFileSync(mainPath, "utf-8");
			// Verify at least one postInThread call passes threadParent
			const hasPostInThreadWithParent =
				content.includes("postInThread(event.channel, threadParent") ||
				content.includes("postInThread(event.channel,threadParent");
			expect(hasPostInThreadWithParent).toBe(true);
		});

		it("has multiple postInThread calls that route via threadParent", () => {
			const content = readFileSync(mainPath, "utf-8");
			// Count occurrences — there should be more than one (respond, replaceMessage, setTyping)
			const occurrences = (content.match(/postInThread/g) ?? []).length;
			expect(occurrences).toBeGreaterThanOrEqual(2);
		});
	});

	describe("ESM module format", () => {
		it("agent.js uses ESM imports (not CommonJS)", () => {
			const content = readFileSync(join(distDir, "agent.js"), "utf-8");
			const firstLine = content.split("\n")[0];
			// ESM starts with import, CJS starts with "use strict" or Object.defineProperty
			expect(firstLine).toMatch(/^import /);
		});

		it("events.js uses ESM imports (not CommonJS)", () => {
			const content = readFileSync(join(distDir, "events.js"), "utf-8");
			const firstLine = content.split("\n")[0];
			expect(firstLine).toMatch(/^import /);
		});

		it("main.js starts with shebang followed by ESM import", () => {
			const content = readFileSync(join(distDir, "main.js"), "utf-8");
			const lines = content.split("\n");
			expect(lines[0]).toBe("#!/usr/bin/env node");
			expect(lines[1]).toMatch(/^import /);
		});

		it("no dist file uses CommonJS exports pattern", () => {
			for (const file of REQUIRED_DIST_FILES) {
				const filePath = join(distDir, file);
				if (!existsSync(filePath)) continue;
				const content = readFileSync(filePath, "utf-8");
				expect(content).not.toContain('Object.defineProperty(exports, "__esModule"');
			}
		});
	});

	describe("build chain", () => {
		it("tsconfig.base.json exists at repo root", () => {
			const tsconfigPath = join(import.meta.dirname, "../../../../tsconfig.base.json");
			expect(existsSync(tsconfigPath)).toBe(true);
		});

		it("tsconfig.base.json targets ES2022 with Node16 modules", () => {
			const tsconfigPath = join(import.meta.dirname, "../../../../tsconfig.base.json");
			const content = JSON.parse(readFileSync(tsconfigPath, "utf-8"));
			expect(content.compilerOptions.target).toBe("ES2022");
			expect(content.compilerOptions.module).toBe("Node16");
		});
	});

	describe("provider configuration", () => {
		it("agent.js reads model from settings.json (not hardcoded anthropic)", () => {
			const content = readFileSync(join(distDir, "agent.js"), "utf-8");
			expect(content).toContain("readAgentDefaults");
			expect(content).not.toContain('getModel("anthropic"');
		});
	});
});
