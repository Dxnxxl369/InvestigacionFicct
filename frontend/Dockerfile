FROM node:20-alpine AS build
WORKDIR /app
RUN npm install -g pnpm@9.15.9
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN pnpm build

FROM node:20-alpine
WORKDIR /app
RUN npm install -g pnpm@9.15.9
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.mjs ./next.config.mjs
EXPOSE 3000
CMD ["pnpm", "start"]
