FROM debian:bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates cron curl wget sudo gosu \
 && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash sandbox \
 && echo "sandbox ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/sandbox \
 && groupadd -f docker && usermod -aG docker sandbox \
 && echo "alias claude='claude --dangerously-skip-permissions'" >> /home/sandbox/.bashrc \
 && echo "alias codex='codex --full-auto'" >> /home/sandbox/.bashrc \
 && echo "alias pi='pi'" >> /home/sandbox/.bashrc \
 && echo '[ -f /opt/open-harness/install/banner.sh ] && source /opt/open-harness/install/banner.sh' >> /home/sandbox/.bashrc

COPY setup/install/entrypoint.sh /usr/local/bin/entrypoint.sh
COPY --chown=sandbox:sandbox setup/install/ /opt/open-harness/install/

ENV PROJECT_ROOT=/workspace
ENV INSTALL_ROOT=/opt/open-harness/install

WORKDIR /workspace
ENTRYPOINT ["entrypoint.sh"]
CMD ["bash"]
