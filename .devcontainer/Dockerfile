FROM debian:bookworm-slim

ENV TZ=America/Denver

# ─── System packages ────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssh-server ca-certificates curl wget sudo gosu git jq gnupg \
    lsb-release nano ripgrep tmux unzip bash-completion procps less \
 && rm -rf /var/lib/apt/lists/*

# ─── Node.js 22.x ──────────────────────────────────────────────────
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && rm -rf /var/lib/apt/lists/*

# ─── GitHub CLI ─────────────────────────────────────────────────────
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
      -o /usr/share/keyrings/githubcli-archive-keyring.gpg \
 && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
      > /etc/apt/sources.list.d/github-cli.list \
 && apt-get update && apt-get install -y --no-install-recommends gh \
 && rm -rf /var/lib/apt/lists/*

# ─── Docker CLI + Compose ──────────────────────────────────────────
RUN install -m 0755 -d /etc/apt/keyrings \
 && curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc \
 && chmod a+r /etc/apt/keyrings/docker.asc \
 && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian bookworm stable" \
      > /etc/apt/sources.list.d/docker.list \
 && apt-get update && apt-get install -y --no-install-recommends docker-ce-cli docker-compose-plugin \
 && rm -rf /var/lib/apt/lists/*

# ─── Cloudflared ───────────────────────────────────────────────────
RUN curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
      -o /usr/share/keyrings/cloudflare-main.gpg \
 && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared bookworm main" \
      > /etc/apt/sources.list.d/cloudflared.list \
 && apt-get update && apt-get install -y --no-install-recommends cloudflared \
 && rm -rf /var/lib/apt/lists/*

# ─── Bun ────────────────────────────────────────────────────────────
RUN BUN_INSTALL=/usr/local curl -fsSL https://bun.sh/install | bash

# ─── uv ─────────────────────────────────────────────────────────────
RUN curl -LsSf https://astral.sh/uv/install.sh | env INSTALLER_NO_MODIFY_PATH=1 sh \
 && cp /root/.local/bin/uv /usr/local/bin/uv \
 && cp /root/.local/bin/uvx /usr/local/bin/uvx

# ─── pnpm (via corepack) ───────────────────────────────────────────
ENV PNPM_HOME="/usr/local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@latest --activate \
 && pnpm setup --force 2>/dev/null || true

# ─── Agent CLIs ─────────────────────────────────────────────────────
# Use npm (not pnpm) for global CLI installs. Agent CLI packages require
# postinstall scripts to download platform-native binaries; npm executes these
# by default without extra configuration.
RUN npm install -g @anthropic-ai/claude-code @openai/codex @mariozechner/pi-coding-agent \
 && claude --version && codex --version && pi --version

# ─── Sandbox user ──────────────────────────────────────────────────
RUN useradd -m -s /bin/bash sandbox \
 && echo "sandbox ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/sandbox \
 && chmod 0440 /etc/sudoers.d/sandbox \
 && groupadd -f docker && usermod -aG docker sandbox

# Ensure PNPM_HOME is on PATH for login shells (SSH, openharness shell)
RUN echo 'export PNPM_HOME="/usr/local/share/pnpm"' >> /home/sandbox/.profile \
 && echo 'export PATH="$PNPM_HOME:$PATH"' >> /home/sandbox/.profile

# Shell aliases for agent CLIs
RUN echo "alias claude='claude --dangerously-skip-permissions'" >> /home/sandbox/.bashrc \
 && echo "alias codex='codex --full-auto'" >> /home/sandbox/.bashrc \
 && echo "alias pi='pi'" >> /home/sandbox/.bashrc \
 && echo "alias mom='mom --sandbox=host ~/harness/workspace/.slack'" >> /home/sandbox/.bashrc

# Git safe.directory for bind-mounted project
RUN su - sandbox -c "git config --global --add safe.directory /home/sandbox/harness"

# Default working directory for interactive shells (SSH + terminal attach)
RUN echo 'cd ~/harness 2>/dev/null' >> /home/sandbox/.bashrc

# Image-level devcontainer config — VS Code reads this on "Attach to Running Container"
RUN mkdir -p /.devcontainer && echo '{"workspaceFolder":"/home/sandbox/harness","remoteUser":"sandbox"}' > /.devcontainer/devcontainer.json

# Labels for VS Code "Attach to Running Container"
LABEL devcontainer.metadata='[{"remoteUser":"sandbox","workspaceFolder":"/home/sandbox/harness"}]'

# ─── Copy install scripts + workspace (for CI; bind mount overrides at runtime)
COPY --chown=sandbox:sandbox install/ /home/sandbox/install/
RUN chmod +x /home/sandbox/install/*.sh
COPY --chown=sandbox:sandbox .openharness/ /home/sandbox/.openharness/
COPY --chown=sandbox:sandbox workspace/ /home/sandbox/harness/workspace/

# ─── Entrypoint ────────────────────────────────────────────────────
COPY .devcontainer/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

WORKDIR /home/sandbox/harness

ENTRYPOINT ["entrypoint.sh"]
CMD ["sleep", "infinity"]
