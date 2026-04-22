# Stage 1: builder
FROM node:22-alpine AS builder

# Install pnpm (keep in sync with root package.json "packageManager")
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

# Copy workspace manifests for dependency resolution
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./

# Copy all package manifests (needed for workspace:* resolution)
COPY packages/web-ui/package.json ./packages/web-ui/package.json
COPY packages/web-ui/example/package.json ./packages/web-ui/example/package.json
COPY packages/sandbox/package.json ./packages/sandbox/package.json
COPY packages/slack/package.json ./packages/slack/package.json
COPY docs/package.json ./docs/package.json

# Install dependencies for the example and its workspace deps
RUN pnpm install --filter pi-web-ui-example...

# Copy source for web-ui lib and example
COPY packages/web-ui/ ./packages/web-ui/
COPY packages/web-ui/example/ ./packages/web-ui/example/

# Build the web-ui library first, then the example
RUN pnpm --filter @openharness/web-ui build && \
    pnpm --filter pi-web-ui-example build

# Stage 2: serve with nginx
FROM nginx:alpine

# Copy built static files
COPY --from=builder /app/packages/web-ui/example/dist /usr/share/nginx/html

# nginx config for SPA client-side routing, with hardening + gzip for
# the static bundle (Lit + pdfjs + xlsx is large — gzip is a big win).
RUN printf 'server_tokens off;\n\
gzip on;\n\
gzip_comp_level 6;\n\
gzip_min_length 1024;\n\
gzip_proxied any;\n\
gzip_vary on;\n\
gzip_types\n\
    application/javascript\n\
    application/json\n\
    application/wasm\n\
    application/xml\n\
    image/svg+xml\n\
    text/css\n\
    text/plain;\n\
\n\
server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
\n\
    add_header X-Frame-Options "DENY" always;\n\
    add_header X-Content-Type-Options "nosniff" always;\n\
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;\n\
\n\
    location /assets/ {\n\
        expires 1y;\n\
        add_header Cache-Control "public, immutable";\n\
        try_files $uri =404;\n\
    }\n\
\n\
    location / {\n\
        try_files $uri /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
