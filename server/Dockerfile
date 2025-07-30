# Use Node.js LTS version with Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY server/package*.json ./
COPY server/tsconfig.json ./

# Install dependencies
RUN npm install --omit=dev && npm cache clean --force

# Copy source code
COPY server/src ./src
COPY shared ./shared

# Create necessary directories and set permissions
RUN mkdir -p /app/data /app/logs && \
    chown -R nodejs:nodejs /app

# Build the application
RUN npm run build

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').request({hostname:'localhost',port:3000,path:'/health',timeout:1000}).on('response',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1)).end()"

# Start the application
CMD ["npm", "start"]