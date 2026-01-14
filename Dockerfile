# ============================================
# Multi-stage Dockerfile for Node.js 24
# Maximum Security | Minimal Space
# ============================================

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:24-alpine AS deps

# Security: Run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

# Install only production dependencies needed for Prisma
RUN apk add --no-cache \
    openssl \
    libc6-compat

WORKDIR /app

# Copy dependency files
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install dependencies with clean install for reproducible builds
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Generate Prisma Client
RUN npx prisma generate

# ============================================
# Stage 2: Builder
# ============================================
FROM node:24-alpine AS builder

WORKDIR /app

# Copy dependency files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci --ignore-scripts && \
    npm cache clean --force

# Copy source code
COPY src ./src
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Generate Prisma Client for build
RUN npx prisma generate

# Build the application
RUN npm run build

# ============================================
# Stage 3: Production Runtime
# ============================================
FROM node:24-alpine AS runner

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init openssl libc6-compat

# Security: Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

WORKDIR /app

# Set production environment
ENV NODE_ENV=production \
    PORT=3000

# Copy production dependencies from deps stage
COPY --from=deps --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=appuser:nodejs /app/prisma ./prisma

# Copy built application from builder stage
COPY --from=builder --chown=appuser:nodejs /app/dist ./dist
COPY --from=builder --chown=appuser:nodejs /app/package*.json ./

# Security: Switch to non-root user
USER appuser

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/server.js"]
