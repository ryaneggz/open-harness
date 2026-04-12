import { describe, expect, it } from "vitest";
import { extractToolResultText, formatToolArgsForSlack } from "../agent.js";

describe("extractToolResultText", () => {
	it("returns string result directly", () => {
		expect(extractToolResultText("hello world")).toBe("hello world");
	});

	it("extracts text from content array", () => {
		const result = {
			content: [
				{ type: "text", text: "line 1" },
				{ type: "text", text: "line 2" },
			],
		};
		expect(extractToolResultText(result)).toBe("line 1\nline 2");
	});

	it("skips non-text content parts", () => {
		const result = {
			content: [
				{ type: "image", data: "base64..." },
				{ type: "text", text: "only this" },
			],
		};
		expect(extractToolResultText(result)).toBe("only this");
	});

	it("falls back to JSON.stringify for unknown shapes", () => {
		const result = { foo: "bar" };
		expect(extractToolResultText(result)).toBe('{"foo":"bar"}');
	});

	it("handles null", () => {
		expect(extractToolResultText(null)).toBe("null");
	});

	it("handles empty content array by falling back to JSON", () => {
		const result = { content: [] };
		expect(extractToolResultText(result)).toBe('{"content":[]}');
	});

	it("handles content array with only non-text parts by falling back to JSON", () => {
		const result = {
			content: [{ type: "image", data: "abc" }],
		};
		expect(extractToolResultText(result)).toBe(JSON.stringify(result));
	});
});

describe("formatToolArgsForSlack", () => {
	it("formats simple string args", () => {
		const result = formatToolArgsForSlack("bash", { command: "ls -la" });
		expect(result).toBe("ls -la");
	});

	it("skips label arg", () => {
		const result = formatToolArgsForSlack("bash", { label: "list files", command: "ls" });
		expect(result).toBe("ls");
	});

	it("formats path with offset and limit", () => {
		const result = formatToolArgsForSlack("read", {
			path: "/src/index.ts",
			offset: 10,
			limit: 20,
		});
		expect(result).toBe("/src/index.ts:10-30");
	});

	it("formats path without offset/limit", () => {
		const result = formatToolArgsForSlack("read", { path: "/src/index.ts" });
		expect(result).toBe("/src/index.ts");
	});

	it("skips standalone offset and limit keys", () => {
		const result = formatToolArgsForSlack("read", {
			path: "/src/index.ts",
			offset: 10,
			limit: 20,
		});
		// Only the path line with range, no separate offset/limit lines
		expect(result).toBe("/src/index.ts:10-30");
		expect(result).not.toContain("\n");
	});

	it("JSON-stringifies non-string values", () => {
		const result = formatToolArgsForSlack("tool", { config: { verbose: true } });
		expect(result).toBe('{"verbose":true}');
	});

	it("joins multiple args with newlines", () => {
		const result = formatToolArgsForSlack("bash", {
			command: "echo hello",
			description: "print greeting",
		});
		expect(result).toBe("echo hello\nprint greeting");
	});
});
