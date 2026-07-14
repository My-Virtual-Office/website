# =============================================================================
# Virtual Office React web client (Create React App build -> nginx).
#
# The client calls the backend with same-origin relative paths, so nginx
# reverse-proxies /api/* (REST + STOMP-over-WebSocket) to the gateway. See
# nginx.conf for the WebSocket keep-alive + cache-control directives.
#
# In docker-compose this is expressed as:
#   build: { context: ./website, dockerfile: Dockerfile }
# =============================================================================

# ---- build stage ----
FROM node:18-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci || npm install
COPY . .
ENV GENERATE_SOURCEMAP=false
RUN npm run build

# ---- runtime stage ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
