FROM node:20-bullseye-slim as builder

WORKDIR /app

RUN npm i -g pnpm@8.12.1
COPY . .
RUN pnpm install --frozen-lockfile

ENV NODE_ENV=production
RUN pnpm build
RUN pnpm prune --prod

FROM node:20-bullseye-slim

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /tmp/node_modules /app/node_modules
COPY --from=builder /tmp/build /app/build
COPY --from=builder /tmp/public /app/public
COPY --from=builder /tmp/package.json /app/package.json

CMD [ "npm", "start" ]
