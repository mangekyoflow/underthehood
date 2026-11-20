# ==========================================
# Stage 1: Build Application
# ==========================================
FROM node:24-alpine AS builder

WORKDIR /app

# Install dependencies needed for node-gyp if necessary
RUN apk add --no-cache libc6-compat

# Leverage Docker layer caching for dependencies
COPY package*.json ./

RUN npm ci

# Copy application source code and configurations
COPY . .

# Compile TypeScript and bundle with Vite
RUN npm run build

# ==========================================
# Stage 2: Production Nginx Server
# ==========================================
FROM nginx:alpine-slim AS runner

# Copy custom Nginx configuration with SPA fallback, security headers, and gzip
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy production static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Built-in container healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
