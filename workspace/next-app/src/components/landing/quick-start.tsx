import type { ReactNode } from "react";
import { CopyButton } from "./copy-button";

const setupCode = `# Clone the harness
git clone https://github.com/ryaneggz/next-postgres-shadcn.git
cd next-postgres-shadcn

# Install the CLI
npm run setup

# Provision — the agent handles everything
claude --permission-mode plan -p "Provision this harness"`;

const COMMANDS = new Set(["git", "npm", "claude"]);

function highlightLine(line: string, index: number): ReactNode {
  const trimmed = line.trimStart();

  if (trimmed.startsWith("#")) {
    return (
      <span key={index} className="text-emerald-600 dark:text-emerald-400 italic">
        {line}
      </span>
    );
  }

  if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
    return (
      <span key={index} className="text-amber-600 dark:text-amber-400">
        {line}
      </span>
    );
  }

  const tokens = line.split(/(\s+)/);
  let commandFound = false;
  let inString = false;

  return (
    <span key={index}>
      {tokens.map((token, i) => {
        if (/^\s+$/.test(token)) return token;

        if (inString || token.includes('"')) {
          if (token.includes('"')) inString = !inString;
          return (
            <span key={i} className="text-amber-600 dark:text-amber-400">
              {token}
            </span>
          );
        }

        if (!commandFound && COMMANDS.has(token)) {
          commandFound = true;
          return (
            <span key={i} className="font-semibold text-foreground">
              {token}
            </span>
          );
        }

        if (token.startsWith("-")) {
          return (
            <span key={i} className="text-sky-600 dark:text-sky-400">
              {token}
            </span>
          );
        }

        if (token === "&&" || token === "\\\\") {
          return (
            <span key={i} className="text-muted-foreground">
              {token}
            </span>
          );
        }

        if (token.includes("/") || token.startsWith("https:")) {
          return (
            <span key={i} className="text-amber-600 dark:text-amber-400">
              {token}
            </span>
          );
        }

        return token;
      })}
    </span>
  );
}

function TerminalBlock({ code, label }: { code: string; label: string }) {
  const lines = code.split("\n");
  return (
    <div className="relative overflow-hidden rounded-lg border border-border/50 bg-muted/50">
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2">
        <div className="h-3 w-3 rounded-full bg-red-500/20" />
        <div className="h-3 w-3 rounded-full bg-yellow-500/20" />
        <div className="h-3 w-3 rounded-full bg-green-500/20" />
        <span className="ml-2 text-xs text-muted-foreground">{label}</span>
      </div>
      <CopyButton text={code} />
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
        <code>
          {lines.map((line, i) => (
            <span key={i}>
              {highlightLine(line, i)}
              {i < lines.length - 1 ? "\n" : ""}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

const steps = [
  "Builds Docker image, starts PostgreSQL + sandbox container",
  "Generates SSH key — gives you the public key to add to GitHub",
  "Pauses for auth: cloudflared login, gh auth login",
  "After you confirm, configures tunnel + starts dev server",
];

export function QuickStart() {
  return (
    <div className="flex flex-col gap-4">
      <TerminalBlock code={setupCode} label="terminal" />

      <div className="rounded-lg border border-border/50 p-4">
        <p className="mb-3 text-sm font-medium">The agent will:</p>
        <ol className="space-y-1.5 text-sm text-muted-foreground">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-mono text-xs text-foreground">{i + 1}.</span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
