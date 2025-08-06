# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the Obsidian Publishing System - a monorepo containing both an Obsidian plugin (client) and a web publishing service (server) that allows users to publish markdown notes from Obsidian to the web. The system consists of:

- **Client**: Obsidian plugin for publishing notes
- **Server**: Express.js web service for hosting published content
- **Shared**: Common TypeScript types used by both components

## Architecture

### Monorepo Structure
```
├── client/          # Obsidian plugin (TypeScript + esbuild)
├── server/          # Express.js API server (TypeScript + Docker)
├── shared/          # Shared TypeScript interfaces
└── deployment/      # Docker compose, deployment scripts
```

### Data Flow
1. User publishes note via Obsidian plugin
2. Plugin sends HTTP request to server API
3. Server stores note in SQLite database
4. Server generates short URL for public access
5. Plugin receives URL and stores post metadata locally

### Key Components

**Client Architecture:**
- `client/main.ts` - Obsidian plugin entry point
- `client/src/http.ts` - HTTP client wrapper with error handling
- `client/src/modals.ts` - UI components for post management
- `client/src/settings.ts` - Plugin settings and configuration
- `client/src/types.ts` - Client-specific type definitions

**Server Architecture:**
- `server/src/app.ts` - Express application with CORS for Obsidian apps
- `server/src/routes/posts.ts` - REST API endpoints (POST, GET, PUT, DELETE)
- `server/src/models/` - Database models (SQLite with singleton pattern)
- `server/src/utils/` - ID generation and Markdown rendering
- `server/src/middleware/` - Error handling and logging

**Shared Types:**
- `shared/types.ts` - API request/response interfaces used by both client and server

## Development Commands

### Client (Obsidian Plugin)
```bash
# Development (auto-rebuild)
cd client && npm run dev

# Production build
cd client && npm run build

# Version bump (updates manifest.json and versions.json)
cd client && npm run version

# Install plugin dependencies
cd client && npm install
```

### Server (Web Service)
```bash
# Development with hot reload
cd server && npm run dev

# Build TypeScript
cd server && npm run build

# Production start
cd server && npm start

# Run tests
cd server && npm test

# Run tests in watch mode
cd server && npm run test:watch
```

### Monorepo Commands (from root)
```bash
# Install all dependencies
npm run install-all

# Build both client and server
npm run build

# Run both in development mode (using concurrently)
npm run dev

# Run server tests
npm test

# Individual component commands
npm run client:dev    # Client development
npm run client:build  # Client production build
npm run server:dev    # Server development
npm run server:build  # Server production build
npm run server:start  # Server production start
```

### Just Task Runner (Alternative)
```bash
# If Just is installed, you can use simplified commands:
just build    # Build both client and server
just dev      # Run development mode
just test     # Run tests
```

## Deployment

### Server Deployment
- Uses Docker Compose with Express.js app + Nginx reverse proxy
- Multiple deployment configurations available
- Health checks at `/health` endpoint
- Automated backup system

#### Deployment Commands
```bash
# Smart deployment (tries pre-built, falls back to source)
./deploy.sh

# Production deployment (uses pre-built Docker image)
./deploy.sh deploy-prod

# Development deployment (builds from source)
./deploy.sh deploy-dev

# Upgrade to specific version
VERSION=v1.2.3 ./deploy.sh upgrade

# Create backup
./deploy.sh backup

# Rollback to backup
./deploy.sh rollback ./backups/backup-20231201-120000.tar.gz

# View status and logs
./deploy.sh status
./deploy.sh logs
```

#### Server Packaging
```bash
# Build deployment package
./build-server-package.sh

# Release server package
./release-server.sh
```

### Client Deployment
#### Manual Installation
Plugin files must be copied to Obsidian's plugin directory:
```bash
# Files needed in plugins/obsidian-publish/:
cp client/main.js client/manifest.json client/styles.css ~/.config/obsidian/plugins/obsidian-publish/
```

#### Automated Installation
```bash
# Use installation script
curl -fsSL https://raw.githubusercontent.com/your-org/obsidian-publishing-system/master/install-client.sh | bash
```

## Key Technical Details

### Database
- SQLite database in `server/database/posts.db`
- Single `posts` table with ID, secret, title, content, timestamps
- 8-character short IDs for public URLs
- UUIDs for post modification/deletion secrets
- Singleton pattern with `getInstance()` method

### Security & Middleware
- **CORS**: Configured for Obsidian app origins (`app://obsidian.md`, `obsidian://`, `app://`)
- **Helmet.js**: Security headers
- **Rate Limiting**: Public and API endpoint protection
- **Input Validation**: express-validator for request validation
- **Authentication**: API token-based auth for protected endpoints
- **Logging**: Winston with file rotation
- **Post Access Control**: UUID secrets for modification/deletion

### API Endpoints
- `POST /` - Create new post (returns {id, secret})
- `GET /:id` - View published post (HTML or JSON)
- `PUT /:id` - Update post (requires secret)
- `DELETE /:id` - Delete post (requires secret)
- `GET /health` - Health check and system status
- `GET /api/health` - API-specific health endpoint

### Build Process
- **Client**: TypeScript → esbuild → single `main.js` file (outputs to project root)
- **Server**: TypeScript → tsc → Docker container
- **Shared**: Types compiled to both client and server dist folders
- **Version Management**: Automated manifest.json and versions.json updates
- **ESLint**: Code quality checking with TypeScript support
- **Development**: Hot reload with nodemon (server) and esbuild watch (client)

## Important Configuration

### Server Base URL
The client configures the server URL in the main plugin file:
```typescript
const baseUrl = "https://share.141029.xyz";
```
Change this for different deployments.

### CORS Configuration
Server allows requests from Obsidian app origins in `server/src/app.ts`:
```typescript
origin: [
  'app://obsidian.md',
  'https://share.141029.xyz',
  /^obsidian:\/\//,
  /^app:\/\//
]
```

### TypeScript Path Mapping
Both client and server use path mapping for shared types:
```json
"paths": {
  "shared/*": ["../shared/*", "./shared/*"]
}
```

## Testing Strategy

- **Framework**: Jest with TypeScript (`ts-jest`)
- **API Testing**: Supertest for integration tests
- **Coverage**: Text, LCOV, and HTML reports
- **Test Files**: Located in `server/src/__tests__/`
  - `api.test.ts` - API endpoint testing
  - `auth.test.ts` - Authentication testing
  - `idGenerator.test.ts` - Utility function testing
- **Setup**: `src/__tests__/setup.ts` handles test environment
- **Client Testing**: Manual testing in Obsidian environment

### Running Tests
```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- api.test.ts
```

## Docker Architecture

The server runs in a multi-container setup:
- **app**: Node.js Express server (custom image: `candy0327/obsidian-publisher-server`)
- **nginx**: Reverse proxy with custom configurations
- **volumes**: Persistent data (`app_data`) and logs (`app_logs`)
- **networks**: Isolated bridge network (`app_network`)
- **health checks**: Built-in container health monitoring

### Docker Configurations
- `docker-compose.yml` - Unified configuration for all environments
- `server/Dockerfile` - Multi-stage build with security optimizations
- `server/nginx/nginx-cloudflare.conf` - Nginx configuration optimized for Cloudflare

## Common Gotchas

1. **Plugin Name**: Recently renamed from "obsius" to "obsidian" - ensure all references are updated
2. **Content-Type Checking**: Client HTTP wrapper checks for `application/json` substring, not exact match
3. **Build Output**: Client builds to project root, not client directory (configured in esbuild.config.mjs)
4. **CORS**: Must include Obsidian app origins (`app://obsidian.md`, `obsidian://`, `app://`), not just web origins
5. **TypeScript Paths**: Server needs both `../shared/*` and `./shared/*` paths for local and Docker environments
6. **Database Permissions**: SQLite file needs proper ownership for Docker containers (1001:1001)
7. **Rate Limiting**: Different limits for public endpoints vs API endpoints
8. **Environment Variables**: Docker Compose requires `version: '3.8'` for proper variable interpolation
9. **Plugin Directory**: Client installs to `~/.config/obsidian/plugins/obsidian-publish/` (not obsius-publish)
10. **Test Timeouts**: Jest configured with 10-second timeout and force exit

## Monitoring & Troubleshooting

### Health Checks
- Application health: `https://domain.com/health`
- API health: `https://domain.com/api/health`
- Container health: Built into Docker Compose

### Logging & Monitoring
```bash
# View real-time logs
docker-compose logs -f

# View specific service logs
docker-compose logs app
docker-compose logs nginx

# Check container status
docker-compose ps
docker stats

# Database monitoring
du -sh server/database/
ls -la server/database/

# System resources
docker system df
docker system prune  # Clean up unused resources
```

### Log Files
- Application logs: `server/logs/` (Winston file rotation)
- Container logs: `docker-compose logs`
- Nginx logs: Container stdout/stderr
- Backup logs: Created during deployment operations