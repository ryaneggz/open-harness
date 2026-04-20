export type RoadmapPhase = "now" | "next" | "later";
export type RoadmapCategory = "product" | "docs" | "security" | "registry" | "agent";
export type Complexity = "S" | "M" | "L";

export interface RoadmapItem {
  rank: number;
  title: string;
  description: string;
  category: RoadmapCategory;
  phase: RoadmapPhase;
  complexity: Complexity;
  signal: string;
  issueNumber?: number;
  dependencies?: string[];
}

// Populated by /strategic-proposal skill — do not edit manually
export const roadmap: RoadmapItem[] = [
  {
    rank: 1,
    title: "Multi-worktree heartbeats",
    description:
      "Four-PR series enabling heartbeats to run across multiple git worktrees concurrently. In-flight work.",
    category: "agent",
    phase: "now",
    complexity: "M",
    signal: "4 open PRs (#71, #73, #75, #77)",
    issueNumber: 71,
  },
  {
    rank: 2,
    title: "Branch protection + required status checks",
    description:
      "Enforce CI gates on development and main via GitHub branch protection; convert the /ci-status convention into a hard control.",
    category: "security",
    phase: "now",
    complexity: "S",
    signal: "infrastructure",
  },
  {
    rank: 3,
    title: "Test coverage baseline + CI enforcement",
    description:
      "Establish a measurable coverage floor so registry/auth work later cannot silently regress core areas.",
    category: "product",
    phase: "now",
    complexity: "S",
    signal: "infrastructure",
  },
  {
    rank: 4,
    title: "Architecture README + Mermaid diagrams",
    description:
      "Add Architecture section to README and wire Mermaid into the docs MDX pipeline. Bundles #81, #85, #83, #79.",
    category: "docs",
    phase: "now",
    complexity: "M",
    signal: "4 open issues (#81, #85, #83, #79)",
    issueNumber: 81,
  },
  {
    rank: 5,
    title: "Advisor/executor skill",
    description:
      "Codify the advisor-model rule as a reusable skill so stronger-model advisors can brief cheaper executors across multi-file tasks.",
    category: "agent",
    phase: "now",
    complexity: "S",
    signal: "#61",
    issueNumber: 61,
  },
  {
    rank: 6,
    title: "Mount ~/.claude into sandbox on provision",
    description:
      "Give agents access to host Claude config, MCP servers, and credentials without per-sandbox onboarding.",
    category: "agent",
    phase: "next",
    complexity: "S",
    signal: "#87",
    issueNumber: 87,
  },
  {
    rank: 7,
    title: "Agent CLI native binaries on container startup",
    description:
      "Ensure claude, codex, and pi binaries are installed on container boot rather than first-use.",
    category: "agent",
    phase: "next",
    complexity: "S",
    signal: "#65",
    issueNumber: 65,
  },
  {
    rank: 8,
    title: "Auth (Clerk or Supabase)",
    description:
      "Identity layer is a strict prerequisite for any user-submitted content, dashboard, or billing.",
    category: "security",
    phase: "next",
    complexity: "M",
    signal: "infrastructure",
    dependencies: ["Branch protection + required status checks"],
  },
  {
    rank: 9,
    title: "Security headers middleware",
    description:
      "CSP, HSTS, X-Frame-Options via Next.js middleware; standard hardening for a public cloudflared-exposed site.",
    category: "security",
    phase: "next",
    complexity: "S",
    signal: "infrastructure",
  },
  {
    rank: 10,
    title: "Rate limiting",
    description: "Abuse control for public endpoints exposed once auth lands.",
    category: "security",
    phase: "next",
    complexity: "M",
    signal: "infrastructure",
    dependencies: ["Auth (Clerk or Supabase)"],
  },
  {
    rank: 11,
    title: "CVE scanning in CI",
    description:
      "Trivy or Dependabot scanning of images and dependencies; hard gate before accepting user-submitted fork artifacts.",
    category: "security",
    phase: "next",
    complexity: "S",
    signal: "infrastructure",
  },
  {
    rank: 12,
    title: "Contributor onboarding guide",
    description:
      "Getting-started path for external forkers so the existing 2 forks can convert into real contributors. Depends on Architecture README.",
    category: "docs",
    phase: "next",
    complexity: "S",
    signal: "infrastructure",
    dependencies: ["Architecture README + Mermaid diagrams"],
  },
  {
    rank: 13,
    title: "Legal / ToS + Acceptable Use Policy",
    description:
      "Non-negotiable gate before accepting third-party fork submissions to any registry or showcase.",
    category: "docs",
    phase: "next",
    complexity: "M",
    signal: "infrastructure",
  },
  {
    rank: 14,
    title: "Fork moderation policy",
    description:
      "Defines takedown, abandonment, and abuse handling before the fork registry opens for submissions.",
    category: "docs",
    phase: "next",
    complexity: "S",
    signal: "infrastructure",
    dependencies: ["Legal / ToS + Acceptable Use Policy"],
  },
  {
    rank: 15,
    title: "Fork registry data model + submission flow",
    description:
      "Prisma schema and API for submitted forks (repo URL, owner, tier, description, license). Primary data layer for vision goal #2.",
    category: "registry",
    phase: "next",
    complexity: "L",
    signal: "#66",
    issueNumber: 66,
    dependencies: [
      "Auth (Clerk or Supabase)",
      "Legal / ToS + Acceptable Use Policy",
      "Fork moderation policy",
      "CVE scanning in CI",
    ],
  },
  {
    rank: 16,
    title: "Agent task telemetry",
    description:
      "Lightweight task-outcome ledger (start/end/status) so autonomy decisions stop being guesses.",
    category: "agent",
    phase: "next",
    complexity: "M",
    signal: "infrastructure",
  },
  {
    rank: 17,
    title: "Workspace snapshot + rollback",
    description:
      "Snapshot/rollback provider abstraction with Btrfs/ZFS host assumption. Larger than L in practice: filesystem lifecycle, concurrency, retention. Deferred until signal justifies the build.",
    category: "agent",
    phase: "later",
    complexity: "L",
    signal: "#60",
    issueNumber: 60,
  },
  {
    rank: 18,
    title: "Provisioning latency optimization",
    description:
      "Layer caching, pre-built bases, parallel compose. No user-reported baseline yet — revisit when telemetry shows cold-start as the bottleneck.",
    category: "agent",
    phase: "later",
    complexity: "M",
    signal: "0 reactions, speculative",
    dependencies: ["Agent task telemetry"],
  },
  {
    rank: 19,
    title: "Fork showcase public page",
    description:
      "Browsable /registry route listing submitted forks. Cannot showcase what does not exist; revisit once registry has real entries.",
    category: "product",
    phase: "later",
    complexity: "M",
    signal: "0 reactions, speculative",
    dependencies: ["Fork registry data model + submission flow"],
  },
  {
    rank: 20,
    title: "Searchable docs site + SEO",
    description:
      "Sidebar navigation, search, OG meta tags. Content must exist first (Architecture README + contributor guide) and SEO is negligible at current traffic.",
    category: "docs",
    phase: "later",
    complexity: "M",
    signal: "0 reactions, speculative",
    dependencies: ["Architecture README + Mermaid diagrams", "Contributor onboarding guide"],
  },
  {
    rank: 21,
    title: "Observability / metrics API",
    description:
      "Externally queryable metrics endpoint for dashboards and ops — distinct audience from internal agent telemetry.",
    category: "product",
    phase: "later",
    complexity: "M",
    signal: "infrastructure",
    dependencies: ["Agent task telemetry"],
  },
  {
    rank: 22,
    title: "Agent-workspace isolation",
    description:
      "Namespace-level isolation (user-ns, per-agent volumes, network policy). Security prerequisite for multi-tenant hosted mode.",
    category: "security",
    phase: "later",
    complexity: "L",
    signal: "infrastructure",
    dependencies: ["Auth (Clerk or Supabase)"],
  },
  {
    rank: 23,
    title: "Row-level security (RLS)",
    description:
      "Postgres-layer data-tier isolation between fork owners; builds on workspace isolation and auth.",
    category: "security",
    phase: "later",
    complexity: "L",
    signal: "infrastructure",
    dependencies: ["Auth (Clerk or Supabase)", "Agent-workspace isolation"],
  },
  {
    rank: 24,
    title: "GHCR metadata API integration",
    description:
      "Read-only API that reports image tags, digests, and sizes for listed forks — the plumbing marketplace listings will consume.",
    category: "registry",
    phase: "later",
    complexity: "M",
    signal: "infrastructure",
  },
  {
    rank: 25,
    title: "Subscription + licensing engine",
    description:
      "Stripe subscriptions + entitlement + license-key verification. Vision goal #3; only meaningful once hosted tier and isolation exist.",
    category: "product",
    phase: "later",
    complexity: "L",
    signal: "0 reactions, speculative",
    dependencies: ["Auth (Clerk or Supabase)", "Agent-workspace isolation"],
  },
  {
    rank: 26,
    title: "Pull-through caching proxy",
    description:
      "Enforcement chokepoint for entitlements; reprioritize once latency or egress costs become measurable.",
    category: "registry",
    phase: "later",
    complexity: "L",
    signal: "0 reactions, speculative",
    dependencies: ["Provisioning latency optimization"],
  },
  {
    rank: 27,
    title: "User dashboard (forks, billing, usage)",
    description:
      "Self-service surface for managing submitted forks and subscription. Meaningless until auth, telemetry, and the registry are live.",
    category: "product",
    phase: "later",
    complexity: "M",
    signal: "0 reactions, speculative",
    dependencies: [
      "Auth (Clerk or Supabase)",
      "Fork registry data model + submission flow",
      "Agent task telemetry",
      "Observability / metrics API",
    ],
  },
];
