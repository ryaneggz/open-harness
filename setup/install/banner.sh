#!/usr/bin/env bash
# Login banner for the coding agent sandbox
# Sourced from .bashrc on interactive login

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
printf "  %-14s %s\n" "Project:" "${PROJECT_ROOT:-/workspace} (bind-mounted repo root)"
printf "  %-14s %s\n" "Runtime:" "${INSTALL_ROOT:-/opt/open-harness/install}"
printf "\n"
printf "${BOLD}  Quick Start${NC}\n"
printf "  %-14s %s\n" "cd /workspace" "Go to the mounted project root"
printf "  %-14s %s\n" "claude" "Launch Claude Code agent"
printf "  %-14s %s\n" "codex" "Launch OpenAI Codex agent"
printf "  %-14s %s\n" "pi" "Launch Pi Coding Agent"
printf "\n"
printf "${BOLD}  Tools${NC}\n"
printf "  node npm bun uv gh docker tmux git rg jq nano\n"
printf "\n"
printf "${BOLD}  Key Files ${DIM}(in /workspace/)${NC}\n"
printf "  %-20s %s\n" "CLAUDE.md / AGENTS.md" "Agent instructions (symlinked)"
printf "  %-20s %s\n" "SOUL.md" "Agent persona & boundaries"
printf "  %-20s %s\n" "MEMORY.md" "Long-term memory index"
printf "  %-20s %s\n" "heartbeats.conf" "Scheduled task config"
printf "\n"
printf "${BOLD}  Tips${NC}\n"
printf "  ${DIM}-${NC} Work inside ${BOLD}/workspace/${NC} — the full project is bind-mounted\n"
printf "  ${DIM}-${NC} Home stays clean at ${BOLD}~/ ${NC}; runtime scripts live outside it\n"
printf "  ${DIM}-${NC} Use ${BOLD}uv${NC} for Python, ${BOLD}bun${NC} or ${BOLD}npm${NC} for JS/TS\n"
printf "  ${DIM}-${NC} Full sudo access for installing extra packages\n"
printf "  ${DIM}-${NC} Docker socket is mounted — you can manage containers\n"
printf "\n"
