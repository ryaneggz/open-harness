FROM debian:bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl wget sudo \
 && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash sandbox \
 && echo "sandbox ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/sandbox

COPY sandbox/ /sandbox/

USER sandbox
WORKDIR /home/sandbox

CMD ["bash"]
