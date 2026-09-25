FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY . .
RUN npm ci
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app /app
RUN npm prune --omit=dev && mkdir -p /app/uploads && chown -R node:node /app
USER node
EXPOSE 3000 4000
CMD ["node","apps/api/src/server.js"]
FROM nginx:1.27-alpine AS gateway
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html/admin
COPY deploy/nginx-docker.conf /etc/nginx/conf.d/default.conf
