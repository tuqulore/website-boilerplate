FROM node:24-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e as build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable
RUN pnpm install --frozen-lockfile
COPY postcss.config.js eleventy.config.js .env* ./
COPY src/ ./src
RUN pnpm build

FROM node:24-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e as install
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable
RUN pnpm install --frozen-lockfile --prod

FROM gcr.io/distroless/nodejs24-debian13@sha256:7cca079bad19303c78cd874a5da79832441985a216b767196507d69b8784a698
WORKDIR /app
ENV NODE_ENV=production
COPY serve.js ./
COPY --from=build /app/dist ./dist
COPY --from=install /app/node_modules ./node_modules

CMD ["serve.js"]
