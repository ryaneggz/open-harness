import { CopyButton } from "./copy-button";

const quickStartCode = `git clone https://github.com/ryaneggz/open-harness.git && cd open-harness
npm run setup
openharness quickstart next-postgres-shadcn --base-branch main

# Start with compose overrides for PostgreSQL + port 3000
WTREE=".worktrees/agent/next-postgres-shadcn"
NAME=next-postgres-shadcn \\
  HARNESS_ROOT="$(realpath $WTREE)" \\
  HOST_WORKSPACE="$(realpath $WTREE)" \\
  docker compose \\
    -f "$WTREE/docker/docker-compose.yml" \\
    -f "$WTREE/docker/docker-compose.nextjs.yml" \\
    -p next-postgres-shadcn up -d

openharness shell next-postgres-shadcn
cd workspace/next-app && npm install && npm run dev`;

export function QuickStart() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      <h2 className="mb-2 text-center text-2xl font-bold tracking-tight sm:text-3xl">
        Quick Start
      </h2>
      <p className="mb-8 text-center text-muted-foreground">
        Clone, provision, and start developing in under 5 minutes.
      </p>
      <div className="relative mx-auto max-w-3xl overflow-hidden rounded-lg border border-border/50 bg-muted/50">
        <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2">
          <div className="h-3 w-3 rounded-full bg-red-500/20" />
          <div className="h-3 w-3 rounded-full bg-yellow-500/20" />
          <div className="h-3 w-3 rounded-full bg-green-500/20" />
          <span className="ml-2 text-xs text-muted-foreground">terminal</span>
        </div>
        <CopyButton text={quickStartCode} />
        <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
          <code>{quickStartCode}</code>
        </pre>
      </div>
    </section>
  );
}
