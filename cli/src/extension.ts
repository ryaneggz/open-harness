/**
 * Open Harness core extension for Pi Agent.
 *
 * Loads the banner from .openharness/extensions/ if present.
 * Sandbox tools are provided by the @openharness/sandbox package.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (_pi: ExtensionAPI) {
  // Core extension — banner is auto-discovered from .openharness/extensions/
  // Sandbox tools are loaded via @openharness/sandbox Pi package
}
