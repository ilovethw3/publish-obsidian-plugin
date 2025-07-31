# Obsidian Publishing System

[![Build Status](https://img.shields.io/github/actions/workflow/status/your-username/your-repo/ci.yml?branch=main)](https://github.com/your-username/your-repo/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933.svg?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com/)

A secure, self-hosted system to publish your [Obsidian](https://obsidian.md/) notes directly to the web. This project provides a client (Obsidian plugin) and a server (Express.js) to give you full control over your published content.

## Key Features

- **Self-Hosted & Private**: You own your data. Deploy the server on your own infrastructure.
- **One-Click Publishing**: Seamlessly publish notes from the Obsidian interface.
- **Secure by Design**: Authenticate with bearer tokens and enforce HTTPS.
- **Durable Public Links**: Generates short, stable 8-character IDs for public notes.
- **Update & Delete**: Easily update existing notes or remove them from the web.
- **Monorepo Architecture**: A clean, modern monorepo structure using TypeScript for the client, server, and shared types.

## Quick Start

The fastest way to get the server running is with Docker.

1. Clone this repository:
   ```bash
   git clone https://github.com/your-username/your-repo.git
   cd your-repo
   ```
2. Configure your environment. Copy the example `.env` file:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set your `DOMAIN` and `LETSENCRYPT_EMAIL`.
3. Initialize database and permissions:
   ```bash
   mkdir -p ./server/database
   touch ./server/database/posts.db
   sudo chown -R 1001:1001 ./server/database
   ```
4. Run the server using Docker Compose:
   ```bash
   ./deploy.sh
   ```
5. Install the Obsidian plugin from the latest release in your vault.
6. Configure the plugin with your server URL in the plugin settings.

## Architecture Overview

The system is a monorepo containing three main components:

- **`client/`**: The Obsidian plugin written in TypeScript. It uses `esbuild` for a fast and lightweight build process. It communicates with the server via a RESTful API.
- **`server/`**: An Express.js server written in TypeScript. It handles API requests, manages the SQLite database, and serves the published notes.
- **`shared/`**: A package containing shared TypeScript types and interfaces used by both the client and server to ensure consistency.

### Data Flow

1. **Publishing**: From the Obsidian client, you publish a note. The plugin sends the note's content to the server's `POST /` endpoint.
2. **Authentication**: Every API request uses Bearer token authentication with UUID secrets.
3. **Storage**: The server generates a unique 8-character public ID and a private UUID for the note, stores the content in an SQLite database, and returns the public URL.
4. **Viewing**: Anyone with the public URL can view the note via the `GET /:id` endpoint. The server retrieves the content from the database, renders it as HTML, and serves it.
5. **Caching**: Published notes are cached in memory with a configurable TTL to reduce database load and improve performance.

## Installation

You can install the server via Docker (recommended) or manually.

### Method 1: Docker (Recommended)

This is the simplest and most reliable method for production.

1. Ensure Docker and Docker Compose are installed.
2. Clone the repository.
3. Create and configure your `.env` file:
   ```bash
   cp .env.example .env
   nano .env
   ```
   Set your `DOMAIN` and `LETSENCRYPT_EMAIL`.
4. Initialize database with correct permissions:
   ```bash
   mkdir -p ./server/database
   touch ./server/database/posts.db
   sudo chown -R 1001:1001 ./server/database
   ```
5. Deploy the system:
   ```bash
   ./deploy.sh
   ```

### Method 2: Manual Installation

1. Ensure Node.js (v18+) and npm are installed.
2. Clone the repository and navigate to the server directory:
   ```bash
   git clone https://github.com/your-username/your-repo.git
   cd your-repo/server
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create and configure the database:
   ```bash
   mkdir -p database
   touch database/posts.db
   ```
5. Build the TypeScript source:
   ```bash
   npm run build
   ```
6. Run the server:
   ```bash
   npm start
   ```

## Configuration

### Server Configuration (`.env`)

The server is configured using environment variables.

```ini
# Your domain name
DOMAIN=your-domain.com

# Email for Let's Encrypt notifications
LETSENCRYPT_EMAIL=your-email@example.com

# CORS origin (usually https://your-domain.com)
CORS_ORIGIN=https://your-domain.com

# Node environment
NODE_ENV=production
```

### Client (Plugin) Configuration

In Obsidian's settings for the Publishing System plugin:

1. **Server URL**: The full HTTPS URL of your deployed server (e.g., `https://your-domain.com`)
2. The plugin will handle authentication automatically using Bearer tokens

## Usage Examples

### Publishing a New Note
- **Command Palette**: Press `Ctrl/Cmd + P`, search for "Publish current note", and execute it
- **Context Menu**: Right-click on a file in the file explorer and select "Publish to Obsius"
- **Editor Menu**: Right-click in the editor and select "Publish to Obsius"

### Updating a Published Note
Use any of the publishing methods on an already-published note. The plugin automatically detects existing posts and updates them.

### Getting the Public URL
- **Context Menu**: Right-click on a published file and select "Copy Obsius URL"
- **Command Palette**: Search for "Copy Obsius URL"

### Deleting a Published Note
- **Context Menu**: Right-click on a published file and select "Remove from Obsius"
- **Command Palette**: Search for "Remove from Obsius"

### Viewing All Published Posts
- **Command Palette**: Search for "View published posts" to see a modal with all your published notes

## API Documentation

The server exposes a simple RESTful API. Most endpoints use Bearer token authentication.

### `POST /`
Publishes a new note or updates an existing one.

**Headers**: `Authorization: Bearer <SECRET_TOKEN>`

**Body**:
```json
{
  "title": "Your Note Title",
  "content": "# Your Note Title\n\nThis is the content."
}
```

**Success Response (200 OK)**:
```json
{
  "id": "a1b2c3d4",
  "secret": "uuid-secret-key",
  "url": "https://your-domain.com/a1b2c3d4"
}
```

### `GET /:id`
Retrieves the HTML content of a published note. This is a public endpoint.

**Parameters**: `:id` is the 8-character public ID.

### `PUT /:id`
Updates an existing published note.

**Headers**: `Authorization: Bearer <SECRET_TOKEN>`

**Body**: Same as POST

### `DELETE /:id`
Deletes a published note.

**Headers**: `Authorization: Bearer <SECRET_TOKEN>`

**Success Response**: 204 No Content

### `GET /health`
Health check endpoint.

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-07-30T10:00:00.000Z"
}
```

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/your-repo.git
   cd your-repo
   ```

2. Install dependencies:
   ```bash
   npm run install-all
   ```

3. **Run the Server in Development**:
   ```bash
   cd server
   npm run dev
   ```
   The server will run on `http://localhost:3000` with hot-reloading.

4. **Develop the Plugin**:
   ```bash
   cd client
   npm run dev
   ```
   This will build the plugin and watch for changes. For development, symlink the project directory to your Obsidian plugins folder.

5. **Run Both Together**:
   ```bash
   npm run dev
   ```

## Deployment Guide

For production deployment, see the comprehensive [DEPLOYMENT.md](DEPLOYMENT.md) guide which covers:

- Docker architecture with nginx reverse proxy
- SSL certificate management with Let's Encrypt
- Database backup and maintenance procedures
- Security considerations and best practices
- Monitoring and troubleshooting

### Quick Production Deployment

```bash
# Clone and configure
git clone <repository_url>
cd publish-obsidian-plugin
cp .env.example .env
nano .env  # Set DOMAIN and LETSENCRYPT_EMAIL

# Initialize database
mkdir -p ./server/database
touch ./server/database/posts.db
sudo chown -R 1001:1001 ./server/database

# Deploy with SSL
./deploy.sh
```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a new feature branch (`git checkout -b feature/my-new-feature`)
3. Make your changes and commit them (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/my-new-feature`)
5. Open a pull request

### Development Guidelines

- Follow TypeScript best practices
- Add tests for new features
- Update documentation as needed
- Ensure Docker builds work correctly
- Test the plugin in Obsidian before submitting

## Security

This system is designed with security in mind:

- **HTTPS Enforcement**: All communications must use HTTPS in production
- **Bearer Token Authentication**: API endpoints protected with UUID secrets
- **CORS Configuration**: Strict CORS policy for Obsidian app origins
- **Input Validation**: Server-side validation of all inputs
- **No Hardcoded Secrets**: All secrets configured via environment variables

For security issues, please email security@your-domain.com rather than opening a public issue.

## License and Credits

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

Built with these incredible open-source technologies:
- [Obsidian](https://obsidian.md/)
- [TypeScript](https://www.typescriptlang.org/)
- [Express.js](https://expressjs.com/)
- [SQLite](https://www.sqlite.org/)
- [Docker](https://www.docker.com/)
- [esbuild](https://esbuild.github.io/)
- [DOMPurify](https://github.com/cure53/DOMPurify)
- [marked](https://marked.js.org/)

---

**Need help?** Check out the [CLIENT_DEPLOYMENT.md](CLIENT_DEPLOYMENT.md) for detailed plugin installation instructions, or [DEPLOYMENT.md](DEPLOYMENT.md) for server deployment guidance.