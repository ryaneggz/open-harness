import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const distDir = join(import.meta.dirname, "../../dist");

describe("dist integrity", () => {
	describe("required dist files exist and are non-empty", () => {
		it("dist/index.js exists and is non-empty", () => {
			const filePath = join(distDir, "index.js");
			expect(existsSync(filePath)).toBe(true);
			const content = readFileSync(filePath, "utf-8");
			expect(content.length).toBeGreaterThan(0);
		});

		it("dist/index.d.ts exists", () => {
			expect(existsSync(join(distDir, "index.d.ts"))).toBe(true);
		});

		it("dist/app.css exists", () => {
			expect(existsSync(join(distDir, "app.css"))).toBe(true);
		});
	});

	describe("export surface", () => {
		it("dist/index.js exports ChatPanel", () => {
			const content = readFileSync(join(distDir, "index.js"), "utf-8");
			expect(content).toContain("ChatPanel");
		});

		it("dist/index.d.ts declares ChatPanel", () => {
			const content = readFileSync(join(distDir, "index.d.ts"), "utf-8");
			expect(content).toContain("ChatPanel");
		});

		it("dist/index.d.ts declares SettingsStore", () => {
			const content = readFileSync(join(distDir, "index.d.ts"), "utf-8");
			expect(content).toContain("SettingsStore");
		});

		it("dist/index.d.ts declares SessionsStore", () => {
			const content = readFileSync(join(distDir, "index.d.ts"), "utf-8");
			expect(content).toContain("SessionsStore");
		});

		it("dist/index.d.ts declares AppStorage", () => {
			const content = readFileSync(join(distDir, "index.d.ts"), "utf-8");
			expect(content).toContain("AppStorage");
		});

		it("dist/index.d.ts declares setAppStorage", () => {
			const content = readFileSync(join(distDir, "index.d.ts"), "utf-8");
			expect(content).toContain("setAppStorage");
		});
	});

	describe("build chain", () => {
		it("tsconfig.build.json exists at package root", () => {
			const tsconfigPath = join(import.meta.dirname, "../../tsconfig.build.json");
			expect(existsSync(tsconfigPath)).toBe(true);
		});

		it("tsconfig.build.json targets ES2022", () => {
			const tsconfigPath = join(import.meta.dirname, "../../tsconfig.build.json");
			const content = JSON.parse(readFileSync(tsconfigPath, "utf-8"));
			expect(content.compilerOptions.target).toBe("ES2022");
		});

		it("app.css is non-empty (tailwind build succeeded)", () => {
			const cssPath = join(distDir, "app.css");
			const content = readFileSync(cssPath, "utf-8");
			expect(content.length).toBeGreaterThan(100);
		});
	});
});
