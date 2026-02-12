FROM debian:bookworm-slim

# Install all system deps via shared setup script (non-interactive for builds)
COPY setup.sh /tmp/setup.sh
RUN chmod +x /tmp/setup.sh && /tmp/setup.sh --non-interactive && rm /tmp/setup.sh

COPY package.json index.js /app/
RUN cd /app && npm install --production

# clawdius user already created by setup.sh — lock down /app
RUN chmod 700 /app

WORKDIR /home/clawdius

# Copy & enable entrypoint
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 3005
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
