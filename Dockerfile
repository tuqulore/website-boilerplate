FROM node:22-slim@sha256:6bba748696297138f802735367bc78fea5cfe3b85019c74d2a930bc6c6b2fac4 as build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --non-interactive --frozen-lockfile
COPY postcss.config.cjs tailwind.config.cjs eleventy.config.cjs .env* ./
COPY src/ ./src
COPY lib/ ./lib
RUN yarn build

FROM node:22-slim@sha256:6bba748696297138f802735367bc78fea5cfe3b85019c74d2a930bc6c6b2fac4 as install
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --non-interactive --frozen-lockfile --production

FROM gcr.io/distroless/nodejs:18@sha256:b534f9b5528e69baa7e8caf7bcc1d93ecf59faa15d289221decf5889a2ed3877
WORKDIR /app
ENV NODE_ENV=production
COPY serve.cjs ./
COPY --from=build /app/dist ./dist
COPY --from=install /app/node_modules ./node_modules

CMD ["serve.cjs"]
