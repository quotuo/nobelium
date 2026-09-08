ARG NOTION_PAGE_ID
# Install dependencies only when needed
FROM node:24-slim AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack pnpm@8.15.9 install --frozen-lockfile

# Rebuild the source code only when needed
FROM node:24-slim AS builder
ARG NOTION_PAGE_ID
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN corepack pnpm@8.15.9 build

ENV NODE_ENV production

EXPOSE 3000

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry.
# ENV NEXT_TELEMETRY_DISABLED 1

CMD ["corepack", "pnpm@8.15.9", "start"]
