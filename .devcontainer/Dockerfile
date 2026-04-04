FROM debian:bookworm-slim

# ─── System packages ────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssh-server ca-certificates curl wget sudo git jq gnupg \
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

# ─── Bun ────────────────────────────────────────────────────────────
RUN BUN_INSTALL=/usr/local curl -fsSL https://bun.sh/install | bash

# ─── uv ─────────────────────────────────────────────────────────────
RUN curl -LsSf https://astral.sh/uv/install.sh | env INSTALLER_NO_MODIFY_PATH=1 sh \
 && cp /root/.local/bin/uv /usr/local/bin/uv \
 && cp /root/.local/bin/uvx /usr/local/bin/uvx

# ─── Orchestrator user ─────────────────────────────────────────────
RUN useradd -m -s /bin/bash orchestrator \
 && echo "orchestrator:test1234" | chpasswd \
 && echo "orchestrator ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/orchestrator \
 && chmod 0440 /etc/sudoers.d/orchestrator \
 && groupadd -f docker && usermod -aG docker orchestrator

# Git safe.directory for bind-mounted project
RUN su - orchestrator -c "git config --global --add safe.directory /home/orchestrator/project"

# ─── SSH server ─────────────────────────────────────────────────────
RUN mkdir -p /run/sshd \
 && sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config \
 && sed -i 's/#PermitUserEnvironment no/PermitUserEnvironment yes/' /etc/ssh/sshd_config

# ─── Entrypoint ────────────────────────────────────────────────────
COPY .devcontainer/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

WORKDIR /home/orchestrator/project
EXPOSE 22

ENTRYPOINT ["entrypoint.sh"]
CMD ["/usr/sbin/sshd", "-D"]
