FROM debian:bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates cron curl wget sudo gosu \
 && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash sandbox \
 && echo "sandbox ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/sandbox \
 && groupadd -f docker && usermod -aG docker sandbox \
 && echo "alias claude='/home/sandbox/install/tmux-agent.sh claude claude --dangerously-skip-permissions'" >> /home/sandbox/.bashrc \
 && echo "alias codex='/home/sandbox/install/tmux-agent.sh codex codex --full-auto'" >> /home/sandbox/.bashrc \
 && echo "alias pi='/home/sandbox/install/tmux-agent.sh pi pi'" >> /home/sandbox/.bashrc

COPY install/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
COPY --chown=sandbox:sandbox install/ /home/sandbox/install/
RUN chmod +x /home/sandbox/install/*.sh
COPY --chown=sandbox:sandbox .openharness/ /home/sandbox/.openharness/
COPY --chown=sandbox:sandbox workspace/ /home/sandbox/workspace/

WORKDIR /home/sandbox/workspace
ENTRYPOINT ["entrypoint.sh"]
CMD ["bash"]
