# Stage 1: builder
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate

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

# nginx config for SPA client-side routing
RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
