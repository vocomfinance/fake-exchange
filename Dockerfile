FROM node:19-alpine as base
RUN npm install -g pnpm

FROM base as builder
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install

COPY . .

ENV HOST=127.0.0.1
ENV RPC_PORT=3000
ENV EVENTS_PORT=3001

EXPOSE ${RPC_PORT} ${EVENTS_PORT}

RUN ls

ENTRYPOINT ["pnpm", "start"]
