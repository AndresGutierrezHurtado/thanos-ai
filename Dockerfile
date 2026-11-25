FROM node:24-slim

WORKDIR /app

# Install all workspaces from the single root lockfile (better layer cache)
COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
# onnxruntime-node (via @chroma-core/default-embed) tries to download CUDA
# binaries on linux/x64; skip them, the CPU runtime is all we need
ENV ONNXRUNTIME_NODE_INSTALL_CUDA=skip
RUN npm ci

COPY . .

# Build the Next.js client, then drop build-only dependencies
RUN npm run build \
    && npm prune --omit=dev \
    && npm cache clean --force

# Writable dirs (mounted as volumes) owned by the unprivileged user
RUN mkdir -p server/public/media server/logs server/uploads \
    && chown -R node:node server/public server/logs server/uploads client/.next

ENV NODE_ENV=production
USER node
EXPOSE 3000

CMD ["npm", "start"]
