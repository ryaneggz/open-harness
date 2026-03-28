# Open Harness vs OpenClaw — Positioning Guide

## What They Are

**OpenClaw** (339k stars): Personal AI assistant platform. Gateway-based control plane that connects to messaging channels (WhatsApp, Telegram, Slack, Discord, iMessage, etc.). Runs on your devices. Consumer/prosumer focused. Built by Peter Steinberger and community.

**Open Harness** (2 stars, growing): Isolated Docker sandboxes for AI coding agents. Runs Claude Code, Codex, Pi Agent in disposable containers with persistent memory. Developer/business focused. Built by Ryan Eggleston.

## Key Differences

| Dimension | OpenClaw | Open Harness |
|-----------|----------|-------------|
| **Primary use** | Personal AI assistant (chat, messaging) | AI agent execution environment (coding, automation) |
| **Architecture** | Gateway + channels + skills | Docker sandbox + agent CLI + heartbeat |
| **Isolation** | Optional sandboxing (`sandbox.mode`) | Sandboxed by default (every agent runs in its own container) |
| **Agent runtime** | Pi agent (RPC mode) | Any CLI agent: Claude Code, Codex, Pi Agent |
| **Memory** | Session-based, workspace skills | File-based: SOUL.md, MEMORY.md, daily logs, cross-session persistence |
| **Autonomous work** | Cron + webhooks | Heartbeat system (timer-based proactive task execution) |
| **Multi-agent** | Session routing per channel | Named sandboxes (NAME=research, NAME=frontend) running in parallel |
| **Setup complexity** | `openclaw onboard` (Node 24, config JSON, channel pairing) | `make NAME=dev quickstart` (Docker only, 3 commands) |
| **Target user** | Power users wanting a personal AI assistant | Developers & businesses needing sandboxed agent automation |
| **Infrastructure** | Runs on host or remote Linux | Runs in Docker containers (host stays clean) |

## Why Open Harness is a Better Fit for Business Automation

### 1. Isolation-First Architecture
OpenClaw runs on your host by default — "tools run on the host for the main session, so the agent has full access." Open Harness runs EVERYTHING in a disposable Docker container. Agent goes rogue? `make NAME=dev rebuild`. No risk to host.

### 2. Agent-Agnostic
OpenClaw is built around its own Pi agent runtime. Open Harness runs ANY agent CLI — Claude Code, Codex, Pi Agent — in the same sandbox. No lock-in to one runtime.

### 3. Simpler Setup for Business Deployments
OpenClaw requires Node 24, channel pairing, config JSON, model auth. Open Harness requires Docker and Make. Three commands from clone to running agent.

### 4. Built for Background Automation
OpenClaw's cron is an add-on feature. Open Harness's heartbeat system is a first-class citizen — agents wake up, check a task list, do work, log learnings, and go back to sleep. This is purpose-built for SMB automation (invoice processing at 3am, guest check-in handling overnight, etc.).

### 5. Persistent Identity Across Sessions
OpenClaw has session-based context with workspace skills. Open Harness has a durable identity system: SOUL.md (who the agent is), MEMORY.md (what it remembers), daily logs (what it learned today). Agents aren't chat windows — they're persistent collaborators.

### 6. Multi-Sandbox for Multi-Client
Need to run automations for 5 different SMB clients? `make NAME=client-a quickstart`, `make NAME=client-b quickstart`. Each gets its own isolated container, workspace, and agent sessions. OpenClaw would need separate gateway instances with more complex config.

### 7. Open Source Infrastructure vs. Open Source Product
OpenClaw is an open-source product (personal assistant). Open Harness is open-source infrastructure (sandbox for running any agent). You build ON Open Harness, not IN it.

## Where OpenClaw Wins

- **Multi-channel messaging**: WhatsApp, Telegram, Slack, Discord, iMessage — OpenClaw is unmatched here
- **Consumer UX**: macOS app, iOS app, Android app, voice wake, Talk Mode
- **Community & ecosystem**: 339k stars, 5,400+ skills, massive contributor base
- **Voice**: Built-in voice wake + talk mode on macOS/iOS/Android
- **Canvas**: Agent-driven visual workspace

## Narrative Angles for LinkedIn Posts

### "Why I Chose Open Harness Over OpenClaw for Client Work"
OpenClaw is amazing for personal use. But when I'm building automations for business clients, I need:
- Isolation (client data in its own container)
- Agent-agnostic (best tool for the job, not one runtime)
- Background execution (heartbeat, not chat)
- Multi-tenant (one sandbox per client)

### "OpenClaw for Chat. Open Harness for Work."
OpenClaw connects your AI to your messaging apps. Open Harness gives your AI a safe place to run. Different tools, different jobs. I use both.

### "The Sandbox Problem OpenClaw Solved Wrong"
OpenClaw added sandboxing as an opt-in security feature. Open Harness was born sandboxed. When your agent has `--dangerously-skip-permissions`, the container IS the safety net.

## How They Can Work Together

OpenClaw + Open Harness is actually a powerful combination:
- **OpenClaw** handles the communication layer (receive messages from clients via WhatsApp/Slack)
- **Open Harness** handles the execution layer (agent does the actual work in a sandbox)
- Pi Agent runs inside Open Harness as one of the available agent runtimes
- Open issue #1 on Open Harness: "Make Pi Agent default for HEARTBEAT"
