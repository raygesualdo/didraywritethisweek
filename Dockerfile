FROM node:20-bullseye-slim as builder

WORKDIR /app

RUN npm i -g pnpm@8.12.1
COPY . .
RUN pnpm install --frozen-lockfile

ENV NODE_ENV=production
RUN pnpm build

FROM node:20-bullseye-slim

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/build /app/build
COPY --from=builder /app/public /app/public
COPY --from=builder /app/package.json /app/package.json

CMD [ "npm", "start" ]
