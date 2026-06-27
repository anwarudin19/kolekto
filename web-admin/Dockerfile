FROM node:22-alpine AS base
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm config set strict-ssl false && npm ci

FROM deps AS build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN sed -i 's/https/http/g' /etc/apk/repositories && apk add --no-cache tzdata
ENV TZ=Asia/Jakarta
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/next-env.d.ts ./next-env.d.ts
EXPOSE 3000
CMD ["node_modules/.bin/next", "start"]


