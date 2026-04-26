import React from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import styles from "./index.module.css";

const QUICKSTART = `git clone https://github.com/ryaneggz/open-harness.git
cd open-harness
pnpm install
pnpm build
oh onboard
oh sandbox create
oh shell`;

const AGENTS = [
  "Claude Code",
  "Codex",
  "Gemini",
  "Pi",
];

const WHY = [
  "Docker isolation — every agent runs in its own container; no dependency conflicts, no shared state between runs.",
  "Parallel agents — run Claude, Codex, Gemini, and Pi simultaneously across independent worktrees from a single harness.",
  "One harness for many CLIs — one install, one set of commands, any agent CLI you need.",
];

export default function Home(): React.ReactElement {
  return (
    <Layout
      title="Mifune Open Harness"
      description="Run Claude, Codex, Gemini, and Pi side-by-side from one Docker-powered agent harness."
    >
      {/* 1. Hero */}
      <section className={styles.hero}>
        <div className={styles.container}>
          <h1 className={styles.heroTitle}>Mifune Open Harness</h1>
          <p className={styles.heroSubtitle}>
            Open Harness is a Docker-powered agent harness for running Claude,
            Codex, Gemini, and Pi side-by-side across isolated worktrees and
            sandboxes.
          </p>
          <div className={styles.heroButtons}>
            <Link className="button button--primary button--lg" to="/docs/quickstart">
              Get started
            </Link>
            <Link
              className="button button--secondary button--lg"
              href="https://github.com/ryaneggz/open-harness"
            >
              View on GitHub
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Quickstart command */}
      <section className={styles.sectionAlt}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Quickstart</h2>
          <pre className={styles.codeBlock}>
            <code>{QUICKSTART}</code>
          </pre>
        </div>
      </section>

      {/* 3. Supported agents */}
      <section className={styles.section}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Supported agents</h2>
          <div className={styles.agentGrid}>
            {AGENTS.map((name) => (
              <div key={name} className={styles.agentCard}>
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Why Open Harness */}
      <section className={styles.sectionAlt}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Why Open Harness</h2>
          <ul className={styles.whyList}>
            {WHY.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* 5. Architecture preview */}
      <section className={styles.section}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Architecture preview</h2>
          <div className={styles.archSummary}>
            <p>
              One container hosts N git worktrees. A single orchestrator daemon
              manages sandbox lifecycle — provision, shell, clean — while each
              agent CLI runs in an isolated worktree with its own environment.
            </p>
            <p>
              Agents share nothing by default: separate filesystem paths, separate
              environment variables, separate process trees. The harness wires
              them together through a common CLI surface.
            </p>
            <p>
              The result is a reproducible, auditable multi-agent workspace you
              can spin up in one command and tear down just as fast.
            </p>
            <Link className={styles.archLink} to="/docs/architecture/overview">
              Read the architecture docs
            </Link>
          </div>
        </div>
      </section>

      {/* 6. Links */}
      <section className={styles.sectionAlt}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Links</h2>
          <div className={styles.linkGrid}>
            <Link
              className={styles.linkCard}
              href="https://github.com/ryaneggz/open-harness"
            >
              GitHub repo
            </Link>
            <Link
              className={styles.linkCard}
              href="https://github.com/ryaneggz/open-harness/blob/main/LICENSE"
            >
              License (MIT)
            </Link>
            <Link className={styles.linkCard} to="/docs">
              Docs
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
