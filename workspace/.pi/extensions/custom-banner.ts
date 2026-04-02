/**
 * Custom Banner Extension
 *
 * Replaces the built-in startup header with a user-configurable banner.
 * Configuration is read from `.pi/banner.json` (project) or
 * `~/.pi/agent/banner.json` (global).
 *
 * Commands:
 *   /banner      — Toggle between custom banner and built-in header
 *   /banner-edit — Interactively edit banner text lines
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { truncateToWidth } from "@mariozechner/pi-tui";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BannerConfig {
	enabled: boolean;
	lines: string[];
	color: string;
	bold: boolean;
	subtitle?: string;
	subtitleColor?: string;
}

// ---------------------------------------------------------------------------
// Defaults & paths
// ---------------------------------------------------------------------------

const PROJECT_CONFIG = ".pi/banner.json";
const GLOBAL_CONFIG_DIR = process.env.OPENHARNESS_CODING_AGENT_DIR || process.env.PI_CODING_AGENT_DIR || join(process.env.HOME!, ".pi", "agent");
const GLOBAL_CONFIG = join(GLOBAL_CONFIG_DIR, "banner.json");

const DEFAULT_CONFIG: BannerConfig = {
	enabled: true,
	lines: [
		"┌───────────────────────────────────┐",
		"│      ⚙  Open Harness  ⚙          │",
		"└───────────────────────────────────┘",
	],
	color: "accent",
	bold: true,
	subtitle: "AI-Powered Sandbox Orchestrator",
	subtitleColor: "muted",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadConfig(cwd: string): { config: BannerConfig; path: string } | null {
	const projectPath = join(cwd, PROJECT_CONFIG);
	if (existsSync(projectPath)) {
		try {
			const config = JSON.parse(readFileSync(projectPath, "utf-8")) as BannerConfig;
			return { config, path: projectPath };
		} catch {
			// Fall through to global
		}
	}

	if (existsSync(GLOBAL_CONFIG)) {
		try {
			const config = JSON.parse(readFileSync(GLOBAL_CONFIG, "utf-8")) as BannerConfig;
			return { config, path: GLOBAL_CONFIG };
		} catch {
			return null;
		}
	}

	return null;
}

function saveConfig(filePath: string, config: BannerConfig): void {
	const dir = dirname(filePath);
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
	writeFileSync(filePath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

function applyBanner(ctx: ExtensionContext, config: BannerConfig): void {
	if (!config.enabled) {
		ctx.ui.setHeader(undefined);
		return;
	}

	ctx.ui.setHeader((_tui, theme) => ({
		render(width: number): string[] {
			const result: string[] = [""];
			for (const line of config.lines) {
				let styled = theme.fg(config.color as any, line);
				if (config.bold) styled = theme.bold(styled);
				result.push(truncateToWidth(styled, width));
			}
			if (config.subtitle) {
				const subColor = (config.subtitleColor || "muted") as any;
				result.push(theme.fg(subColor, config.subtitle));
			}
			result.push("");
			return result;
		},
		invalidate() {},
	}));
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI) {
	let currentConfig: BannerConfig | null = null;
	let configPath: string | null = null;

	// --- Startup: load config & apply header ---
	pi.on("session_start", async (_event, ctx) => {
		if (!ctx.hasUI) return;

		const result = loadConfig(ctx.cwd);
		if (result) {
			currentConfig = result.config;
			configPath = result.path;
		} else {
			// Create default config in project
			currentConfig = { ...DEFAULT_CONFIG };
			configPath = join(ctx.cwd, PROJECT_CONFIG);
			saveConfig(configPath, currentConfig);
			ctx.ui.notify("Created default .pi/banner.json", "info");
		}

		applyBanner(ctx, currentConfig);
	});

	// --- /banner: toggle custom ↔ built-in ---
	pi.registerCommand("banner", {
		description: "Toggle between custom banner and built-in header",
		handler: async (_args, ctx) => {
			if (!currentConfig || !configPath) {
				ctx.ui.notify("No banner config loaded", "error");
				return;
			}

			currentConfig.enabled = !currentConfig.enabled;
			saveConfig(configPath, currentConfig);
			applyBanner(ctx, currentConfig);

			ctx.ui.notify(
				currentConfig.enabled ? "Custom banner enabled" : "Built-in header restored",
				"info",
			);
		},
	});

	// --- /banner-edit: edit banner lines interactively ---
	pi.registerCommand("banner-edit", {
		description: "Edit banner text lines",
		handler: async (_args, ctx) => {
			if (!currentConfig || !configPath) {
				ctx.ui.notify("No banner config loaded", "error");
				return;
			}

			const currentText = currentConfig.lines.join("\n");
			const edited = await ctx.ui.editor("Edit banner lines (one per line):", currentText);

			if (edited === undefined || edited === null) {
				ctx.ui.notify("Banner edit cancelled", "info");
				return;
			}

			const newLines = edited.split("\n");
			if (newLines.length === 0 || (newLines.length === 1 && newLines[0] === "")) {
				ctx.ui.notify("Banner cannot be empty", "warning");
				return;
			}

			currentConfig.lines = newLines;
			currentConfig.enabled = true;
			saveConfig(configPath, currentConfig);
			applyBanner(ctx, currentConfig);

			ctx.ui.notify("Banner updated", "success");
		},
	});
}
