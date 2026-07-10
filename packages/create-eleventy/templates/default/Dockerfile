FROM node:24-slim@sha256:cb4e8f7c443347358b7875e717c29e27bf9befc8f5a26cf18af3c3dec80e58c5 as build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable
RUN pnpm install --frozen-lockfile
COPY postcss.config.js eleventy.config.js .env* ./
COPY src/ ./src
RUN pnpm build

FROM node:24-slim@sha256:cb4e8f7c443347358b7875e717c29e27bf9befc8f5a26cf18af3c3dec80e58c5 as install
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable
RUN pnpm install --frozen-lockfile --prod

FROM gcr.io/distroless/nodejs24-debian13@sha256:ac0daf5d207757b275f3df0de9b296675500e773cc447c65afd66a948d5bf013
WORKDIR /app
ENV NODE_ENV=production
COPY serve.js ./
COPY --from=build /app/dist ./dist
COPY --from=install /app/node_modules ./node_modules

CMD ["serve.js"]
