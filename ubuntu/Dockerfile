FROM debian:bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ca-certificates \
      curl \
      jq \
 && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 # Install GitHub CLI
 && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
      -o /usr/share/keyrings/githubcli-archive-keyring.gpg \
 && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
      > /etc/apt/sources.list.d/github-cli.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends gh \
 && rm -rf /var/lib/apt/lists/*

# Install agent-browser + Chromium with system deps
RUN npm install -g agent-browser \
 && npx playwright install-deps chromium

COPY package.json index.js /app/
RUN cd /app && npm install --production

# Create unprivileged user for command execution
RUN useradd -m -s /bin/bash executor \
 && chmod 700 /app

WORKDIR /home/executor

# Copy & enable entrypoint
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 3005
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
