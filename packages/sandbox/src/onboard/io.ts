/**
 * Real terminal IO for the onboarding wizard.
 *
 * Emits the same ANSI-colored banner/ok/skip/warn/fail/ask lines that the
 * original `install/onboard.sh` produced, so a diff of stdout between the
 * bash and TS paths should be near-empty (modulo a few bash-only colors
 * already absent from some messages).
 */

import readline from "node:readline";
import type { IoDeps } from "./types.js";

const RED = "\x1b[0;31m";
const GREEN = "\x1b[0;32m";
const CYAN = "\x1b[0;36m";
const YELLOW = "\x1b[0;33m";
const NC = "\x1b[0m";
const B = "\x1b[1m";

export function banner(message: string): void {
  process.stdout.write(`\n${CYAN}==> ${message}${NC}\n`);
}

export function ok(message: string): void {
  process.stdout.write(`  ${GREEN}✓${NC} ${message}\n`);
}

export function skip(message: string): void {
  process.stdout.write(`  ${YELLOW}⊘${NC} ${message}\n`);
}

export function warn(message: string): void {
  process.stdout.write(`  ${YELLOW}!${NC} ${message}\n`);
}

export function fail(message: string): void {
  process.stdout.write(`  ${RED}✗${NC} ${message}\n`);
}

export function info(message: string): void {
  process.stdout.write(`${message}\n`);
}

export function raw(message: string): void {
  process.stdout.write(message);
}

export async function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await new Promise<string>((resolve) => {
      rl.question(`\n  ${B}${question}${NC} `, (answer) => resolve(answer.trim()));
    });
  } finally {
    rl.close();
  }
}

export async function waitForEnter(): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    await new Promise<void>((resolve) => {
      rl.question("", () => resolve());
    });
  } finally {
    rl.close();
  }
}

export function realIo(): IoDeps {
  return { banner, ok, skip, warn, fail, info, ask, waitForEnter, raw };
}

export const COLORS = { RED, GREEN, CYAN, YELLOW, NC, B } as const;
