FROM debian:bookworm-slim

ENV TZ=America/Denver

# ─── System packages ────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssh-server ca-certificates curl wget sudo gosu git jq gnupg \
    lsb-release nano ripgrep tmux unzip bash-completion procps less \
    iproute2 zsh \
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

# ─── Orchestrator user ────────────────────────────────────────────────
RUN useradd -u 1000 -m -s /bin/zsh orchestrator \
 && echo "orchestrator ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/orchestrator \
 && chmod 0440 /etc/sudoers.d/orchestrator \
 && groupadd -f docker && usermod -aG docker orchestrator

# ─── oh-my-zsh + plugins ───────────────────────────────────────────
# Install as orchestrator so $HOME resolves and files land with correct ownership.
# RUNZSH/CHSH=no keeps the installer from trying to exec zsh or re-run chsh.
RUN su - orchestrator -c "RUNZSH=no CHSH=no KEEP_ZSHRC=yes sh -c \"\$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)\" --unattended" \
 && su - orchestrator -c "git clone --depth 1 https://github.com/zsh-users/zsh-autosuggestions         /home/orchestrator/.oh-my-zsh/custom/plugins/zsh-autosuggestions" \
 && su - orchestrator -c "git clone --depth 1 https://github.com/zsh-users/zsh-syntax-highlighting     /home/orchestrator/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting" \
 && su - orchestrator -c "git clone --depth 1 https://github.com/zsh-users/zsh-history-substring-search /home/orchestrator/.oh-my-zsh/custom/plugins/zsh-history-substring-search"

# Default tmux config for orchestrator user
COPY --chown=orchestrator:orchestrator install/.tmux.conf /home/orchestrator/.tmux.conf

# Default .zshrc for orchestrator user (overrides the oh-my-zsh template)
COPY --chown=orchestrator:orchestrator install/.zshrc /home/orchestrator/.zshrc

# Ensure PNPM_HOME is on PATH for login shells (SSH, openharness shell).
# bash reads .profile; zsh reads .zprofile — mirror the exports into both.
RUN printf '%s\n' \
      'export PNPM_HOME="/usr/local/share/pnpm"' \
      'export PATH="$PNPM_HOME:$PATH"' \
      | tee -a /home/orchestrator/.profile /home/orchestrator/.zprofile \
 && chown orchestrator:orchestrator /home/orchestrator/.profile /home/orchestrator/.zprofile

# Shell aliases for agent CLIs (bash fallback — .zshrc ships with these baked in)
RUN echo "alias claude='claude --dangerously-skip-permissions'" >> /home/orchestrator/.bashrc \
 && echo "alias codex='codex --full-auto'" >> /home/orchestrator/.bashrc \
 && echo "alias pi='pi'" >> /home/orchestrator/.bashrc \
 && echo "alias mom='mom --sandbox=host ~/harness/workspace/.slack'" >> /home/orchestrator/.bashrc

# Git safe.directory for bind-mounted project
RUN su - orchestrator -c "git config --global --add safe.directory /home/orchestrator/harness"

# Default working directory for interactive shells (SSH + terminal attach, bash fallback)
RUN echo 'cd ~/harness 2>/dev/null' >> /home/orchestrator/.bashrc

# Image-level devcontainer config — VS Code reads this on "Attach to Running Container"
RUN mkdir -p /.devcontainer && echo '{"workspaceFolder":"/home/orchestrator/harness","remoteUser":"orchestrator"}' > /.devcontainer/devcontainer.json

# Labels for VS Code "Attach to Running Container"
LABEL devcontainer.metadata='[{"remoteUser":"orchestrator","workspaceFolder":"/home/orchestrator/harness"}]'

# ─── Copy install scripts + workspace (for CI; bind mount overrides at runtime)
COPY --chown=orchestrator:orchestrator install/ /home/orchestrator/install/
RUN chmod +x /home/orchestrator/install/*.sh
COPY --chown=orchestrator:orchestrator .openharness/ /home/orchestrator/.openharness/
COPY --chown=orchestrator:orchestrator workspace/ /home/orchestrator/harness/workspace/

# ─── Entrypoint ────────────────────────────────────────────────────
COPY .devcontainer/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

WORKDIR /home/orchestrator/harness

ENTRYPOINT ["entrypoint.sh"]
CMD ["sleep", "infinity"]
