FROM node:26-slim@sha256:abe7e5a82b61a8ef67b315b85497c9e65173387ccf2f4a029248184b8e020be5 as build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable
RUN pnpm install --frozen-lockfile
COPY postcss.config.js eleventy.config.js .env* ./
COPY src/ ./src
RUN pnpm build

FROM node:26-slim@sha256:abe7e5a82b61a8ef67b315b85497c9e65173387ccf2f4a029248184b8e020be5 as install
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable
RUN pnpm install --frozen-lockfile --prod

FROM gcr.io/distroless/nodejs24-debian13@sha256:235cae47d37e0ba4ab70a723ed0bfd4f619c04d16d4226371d5d0c71a52f9211
WORKDIR /app
ENV NODE_ENV=production
COPY serve.js ./
COPY --from=build /app/dist ./dist
COPY --from=install /app/node_modules ./node_modules

CMD ["serve.js"]
