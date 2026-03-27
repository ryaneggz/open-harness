FROM debian:bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl wget sudo gosu \
 && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash sandbox \
 && echo "sandbox ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/sandbox \
 && groupadd -f docker && usermod -aG docker sandbox \
 && echo "alias claude='claude --dangerously-skip-permissions'" >> /home/sandbox/.bashrc \
 && echo "alias codex='codex --full-auto'" >> /home/sandbox/.bashrc \
 && echo "alias pi='pi'" >> /home/sandbox/.bashrc

COPY install/entrypoint.sh /usr/local/bin/entrypoint.sh
COPY --chown=sandbox:sandbox install/ /home/sandbox/install/
COPY --chown=sandbox:sandbox workspace/ /home/sandbox/workspace/

WORKDIR /home/sandbox/workspace
ENTRYPOINT ["entrypoint.sh"]
CMD ["bash"]
