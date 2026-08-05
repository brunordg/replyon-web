# syntax=docker/dockerfile:1

# --- Stage 1: build ---
FROM node:22-alpine AS build
WORKDIR /workspace

# package.json não tem campo "packageManager" pinando a versão do pnpm, então
# instala explícito via npm em vez de depender do corepack resolver uma versão.
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
# Sobrescreve o preset default (cloudflare-module, herdado de @lovable.dev/vite-tanstack-config)
# para gerar um servidor Node standalone. Confirmado localmente: com essa env,
# .output/nitro.json reporta preset "node-server" e entry server/index.mjs.
RUN NITRO_PRESET=node-server pnpm build

# --- Stage 2: runtime ---
FROM node:22-alpine AS runtime
WORKDIR /app

RUN addgroup -S replyon && adduser -S replyon -G replyon
COPY --from=build /workspace/.output ./
RUN chown -R replyon:replyon /app
USER replyon

ENV PORT=3000
EXPOSE 3000
CMD ["node", "server/index.mjs"]
