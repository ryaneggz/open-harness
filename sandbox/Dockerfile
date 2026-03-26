FROM debian:bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl wget sudo \
 && rm -rf /var/lib/apt/lists/*

CMD ["bash"]
