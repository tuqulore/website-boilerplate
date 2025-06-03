FROM node:22-slim@sha256:2f3571619daafc6b53232ebf2fcc0817c1e64795e92de317c1684a915d13f1a5 as build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable
RUN pnpm install --frozen-lockfile
COPY postcss.config.mjs eleventy.config.mjs .env* ./
COPY src/ ./src
COPY lib/ ./lib
RUN pnpm build

FROM node:22-slim@sha256:2f3571619daafc6b53232ebf2fcc0817c1e64795e92de317c1684a915d13f1a5 as install
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable
RUN pnpm install --frozen-lockfile

FROM gcr.io/distroless/nodejs:18@sha256:b534f9b5528e69baa7e8caf7bcc1d93ecf59faa15d289221decf5889a2ed3877
WORKDIR /app
ENV NODE_ENV=production
COPY serve.cjs ./
COPY --from=build /app/dist ./dist
COPY --from=install /app/node_modules ./node_modules

CMD ["serve.cjs"]
