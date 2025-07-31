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
- `client/src/obsius.ts` - Core API client and post management
- `client/src/http.ts` - HTTP client wrapper with error handling
- `client/main.ts` - Obsidian plugin entry point
- `client/src/modals.ts` - UI components for post management

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
```

### Monorepo Commands (from root)
```bash
# Install all dependencies
npm run install-all

# Build both client and server
npm run build

# Run both in development mode
npm run dev

# Run tests
npm test
```

## Deployment

### Server Deployment
- Uses Docker Compose with Express.js app + Nginx + Let's Encrypt SSL
- Deploy with: `./deploy.sh` (handles SSL certificates automatically)
- Configuration via `.env` file and `docker-compose.yml`
- Health checks at `/health` endpoint

### Client Deployment
Plugin files must be copied to Obsidian's plugin directory:
```bash
# Files needed in plugins/obsius-publish/:
cp client/main.js client/manifest.json client/styles.css ~/.config/obsidian/plugins/obsius-publish/
```

## Key Technical Details

### Database
- SQLite database in `server/database/posts.db`
- Single `posts` table with ID, secret, title, content, timestamps
- 8-character short IDs for public URLs
- UUIDs for post modification/deletion secrets

### Security
- CORS configured for Obsidian app origins (`app://obsidian.md`)
- Helmet.js for security headers
- Input validation using express-validator
- Post access control via UUID secrets

### API Endpoints
- `POST /` - Create new post (returns {id, secret})
- `GET /:id` - View published post (HTML or JSON)
- `PUT /:id` - Update post (requires secret)
- `DELETE /:id` - Delete post (requires secret)
- `GET /health` - Health check

### Build Process
- **Client**: TypeScript → esbuild → single `main.js` file
- **Server**: TypeScript → tsc → Docker container
- **Shared**: Types compiled to both client and server dist folders

## Important Configuration

### Server Base URL
The client hardcodes the server URL in `client/src/obsius.ts`:
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

- Server has unit tests in `server/src/__tests__/`
- Uses Jest with TypeScript
- API integration tests with supertest
- Client testing done manually in Obsidian

## Docker Architecture

The server runs in a multi-container setup:
- **app**: Node.js Express server
- **nginx**: Reverse proxy with SSL termination
- **certbot**: Let's Encrypt SSL certificate management

## Common Gotchas

1. **Content-Type Checking**: Client HTTP wrapper checks for `application/json` substring, not exact match
2. **Build Output**: Client builds to project root, not client directory (configured in esbuild.config.mjs)
3. **CORS**: Must include Obsidian app origins, not just web origins
4. **TypeScript Paths**: Server needs both `../shared/*` and `./shared/*` paths for local and Docker environments
5. **Database Permissions**: SQLite file needs proper ownership for Docker containers (1001:1001)

## Monitoring

- Health endpoint: `https://domain.com/health`
- Docker logs: `docker-compose logs -f`
- Database size: `du -sh server/database/`
- Container stats: `docker stats`