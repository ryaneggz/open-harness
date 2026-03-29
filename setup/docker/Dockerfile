FROM debian:bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates cron curl wget sudo gosu \
 && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash sandbox \
 && echo "sandbox ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/sandbox \
 && chmod 0440 /etc/sudoers.d/sandbox \
 && groupadd -f docker && usermod -aG docker sandbox \
 && printf "%s\n" \
      "alias claude='claude --dangerously-skip-permissions'" \
      "alias codex='codex --full-auto'" \
      "alias pi='pi'" \
      "[ -f /opt/open-harness/install/banner.sh ] && source /opt/open-harness/install/banner.sh" \
    > /etc/profile.d/open-harness.sh \
 && chmod 0644 /etc/profile.d/open-harness.sh

COPY setup/install/entrypoint.sh /usr/local/bin/entrypoint.sh
COPY --chown=sandbox:sandbox setup/install/ /opt/open-harness/install/

ENV PROJECT_ROOT=/home/sandbox
ENV INSTALL_ROOT=/opt/open-harness/install

WORKDIR /home/sandbox
ENTRYPOINT ["entrypoint.sh"]
CMD ["bash"]
