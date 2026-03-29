#!/usr/bin/env bash
# Login banner for the coding agent sandbox
# Sourced from /etc/profile.d/open-harness.sh on interactive login

CYAN='\033[0;36m'
GREEN='\033[0;32m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m'

printf "\n"
printf "${CYAN}${BOLD}  ╔══════════════════════════════════════════════╗${NC}\n"
printf "${CYAN}${BOLD}  ║         Coding Agent Sandbox                 ║${NC}\n"
printf "${CYAN}${BOLD}  ╚══════════════════════════════════════════════╝${NC}\n"
printf "\n"
printf "${BOLD}  Environment${NC}\n"
printf "  %-14s %s\n" "User:" "sandbox (passwordless sudo)"
printf "  %-14s %s\n" "OS:" "Debian Bookworm"
printf "  %-14s %s\n" "Home:" "~/ ($(echo ~))"
printf "  %-14s %s\n" "Project:" "${PROJECT_ROOT:-/home/sandbox} (bind-mounted sandbox worktree)"
printf "  %-14s %s\n" "Runtime:" "${INSTALL_ROOT:-/opt/open-harness/install}"
printf "\n"
printf "${BOLD}  Quick Start${NC}\n"
printf "  %-14s %s\n" "cd ~" "Go to the mounted project root"
printf "  %-14s %s\n" "claude" "Launch Claude Code agent"
printf "  %-14s %s\n" "codex" "Launch OpenAI Codex agent"
printf "  %-14s %s\n" "pi" "Launch Pi Coding Agent"
printf "\n"
printf "${BOLD}  Tools${NC}\n"
printf "  node npm bun uv gh docker tmux git rg jq nano\n"
printf "\n"
printf "${BOLD}  Key Files ${DIM}(in ~/)${NC}\n"
printf "  %-20s %s\n" "CLAUDE.md / AGENTS.md" "Agent instructions (symlinked)"
printf "  %-20s %s\n" "SOUL.md" "Agent persona & boundaries"
printf "  %-20s %s\n" "MEMORY.md" "Long-term memory index"
printf "  %-20s %s\n" "heartbeats.conf" "Scheduled task config"
printf "\n"
printf "${BOLD}  Tips${NC}\n"
printf "  ${DIM}-${NC} Work inside ${BOLD}~/${NC} — the managed sandbox worktree is bind-mounted there\n"
printf "  ${DIM}-${NC} Your shell starts in ${BOLD}~${NC}; runtime scripts live in ${BOLD}/opt/open-harness/install${NC}\n"
printf "  ${DIM}-${NC} Use ${BOLD}uv${NC} for Python, ${BOLD}bun${NC} or ${BOLD}npm${NC} for JS/TS\n"
printf "  ${DIM}-${NC} Full sudo access for installing extra packages\n"
if [ -S /var/run/docker.sock ]; then
  printf "  ${DIM}-${NC} Docker socket is mounted — you can manage containers\n"
else
  printf "  ${DIM}-${NC} Docker socket is not mounted by default; use ${BOLD}oh create <name> --docker${NC} when needed\n"
fi
printf "\n"
