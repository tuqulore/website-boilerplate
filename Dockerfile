FROM node:18-slim as build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --non-interactive --frozen-lockfile
COPY postcss.config.cjs tailwind.config.cjs eleventy.config.cjs .env* ./
COPY src/ ./src
COPY lib/ ./lib
RUN yarn build

FROM node:18-slim as install
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --non-interactive --frozen-lockfile --production

FROM gcr.io/distroless/nodejs:18
WORKDIR /app
ENV NODE_ENV=production
COPY serve.cjs ./
COPY --from=build /app/dist ./dist
COPY --from=install /app/node_modules ./node_modules

CMD ["serve.cjs"]
