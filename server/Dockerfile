# Multi-stage build for optimized production image
FROM node:18-alpine AS builder

# Build arguments for metadata
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION

# Set working directory
WORKDIR /app

# Copy package files first for better layer caching
COPY server/package*.json ./
COPY server/tsconfig.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci --silent && \
    npm cache clean --force

# Copy source code
COPY server/src ./src
COPY shared ./shared

# Build the application
RUN npm run build && \
    echo "Build completed successfully" && \
    ls -la dist/

# Production stage
FROM node:18-alpine AS production

# Build arguments for metadata
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION

# Add metadata labels
LABEL org.opencontainers.image.title="Obsidian Publishing Server"
LABEL org.opencontainers.image.description="Express.js server for Obsidian note publishing system"
LABEL org.opencontainers.image.version=${VERSION}
LABEL org.opencontainers.image.created=${BUILD_DATE}
LABEL org.opencontainers.image.revision=${VCS_REF}
LABEL org.opencontainers.image.source="https://github.com/your-org/obsidian-publishing-system"
LABEL org.opencontainers.image.url="https://github.com/your-org/obsidian-publishing-system"
LABEL org.opencontainers.image.documentation="https://github.com/your-org/obsidian-publishing-system/blob/main/README.md"
LABEL org.opencontainers.image.licenses="MIT"

# Install security updates and dumb-init
RUN apk update && \
    apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY server/package*.json ./

# Install only production dependencies
RUN npm ci --only=production --silent && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared

# Create necessary directories and set proper permissions
RUN mkdir -p /app/data /app/logs && \
    chown -R nodejs:nodejs /app && \
    chmod -R 755 /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').request({hostname:'localhost',port:3000,path:'/health',timeout:1000}).on('response',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1)).end()"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/src/app.js"]