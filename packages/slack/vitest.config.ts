import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["packages/slack/src/__tests__/**/*.test.ts"],
		globals: true,
	},
});
