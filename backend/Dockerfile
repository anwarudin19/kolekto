FROM node:22-alpine AS base
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json ./
RUN pnpm config set strict-ssl false && pnpm install --no-frozen-lockfile

FROM deps AS build
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY prisma ./prisma
COPY src ./src
RUN pnpm prisma generate
RUN pnpm build

FROM node:22-alpine AS runner
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
WORKDIR /app
ENV NODE_ENV=production
RUN sed -i 's/https/http/g' /etc/apk/repositories && apk add --no-cache tzdata
ENV TZ=Asia/Jakarta
RUN corepack enable
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./
EXPOSE 3000
CMD ["sh", "-c", "pnpm prisma migrate deploy && node dist/src/main.js"]
