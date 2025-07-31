# Obsidian Publishing System: Implementation Tasks

This document outlines the development tasks required to build the Obsidian Publishing System. It is designed to be used by the development team as a roadmap for implementation, testing, and deployment.

## Task Legend
-   **Dependencies:** Tasks that must be completed before this one can begin.
-   **Complexity:** A rough estimate of effort (Low, Medium, High).

---

### 1. Project Setup & Infrastructure

These tasks focus on creating a robust and scalable foundation for the project.

<br>

#### 1.1. Initialize Monorepo
-   **Description:** Set up a monorepo using npm workspaces to manage the `server`, `client` (Obsidian plugin), and `shared` packages.
-   **Acceptance Criteria:**
    -   A workspace configuration is setup at the root level
    -   The directory structure `client/`, `server/`, and `shared/` is created
    -   Dependencies can be managed at workspace level
-   **Dependencies:** None
-   **Complexity:** Medium
-   **Technical Considerations:** This setup is crucial for managing shared code and dependencies efficiently.

#### 1.2. Configure TypeScript and Linting
-   **Description:** Establish a root-level configuration for TypeScript, ESLint, and Prettier, with the ability for individual packages to extend or override settings.
-   **Acceptance Criteria:**
    -   A base `tsconfig.json` exists at the root. Each package has its own `tsconfig.json` that extends the base.
    -   Root `.eslintrc` and `.prettierrc` files are configured.
    -   `lint` and `format` scripts are added to the root `package.json`.
-   **Dependencies:** 1.1
-   **Complexity:** Medium
-   **Technical Considerations:** A consistent code style and quality gate are essential for maintainability.

---

### 2. Shared Types & Interfaces

Creating a dedicated package for shared types ensures consistency between the client and server.

<br>

#### 2.1. Define Core TypeScript Interfaces
-   **Description:** In the `shared/` directory, define and export all TypeScript interfaces that will be used by both the server and the client.
-   **Acceptance Criteria:**
    -   `Post`, `CreatePostRequest`, `CreatePostResponse`, `UpdatePostRequest` interfaces are defined
    -   `ApiErrorResponse` interface is defined for consistent error handling
    -   All types are exported from the package's entry point
-   **Dependencies:** 1.1
-   **Complexity:** Low
-   **Technical Considerations:** Keep these interfaces pure data contracts. Avoid including any logic or functions.

#### 2.2. Configure Type Compilation and Distribution
-   **Description:** Set up a build process for the `shared` package that compiles TypeScript to JavaScript and generates declaration files (`.d.ts`).
-   **Acceptance Criteria:**
    -   A `build` script in `shared/package.json` runs `tsc`
    -   The `server` and `client` packages can import types from `shared`
    -   Path mapping is configured correctly in both client and server tsconfig files
-   **Dependencies:** 2.1
-   **Complexity:** Low
-   **Technical Considerations:** Ensure proper path mapping for both local development and Docker environments.

---

### 3. Database & Backend Tasks

This section covers the entire server-side implementation.

<br>

#### 3.1. Implement SQLite Database Schema
-   **Description:** Create the SQLite database schema using `better-sqlite3`. This includes the `posts` table and triggers for automatic timestamp updates.
-   **Acceptance Criteria:**
    -   An initialization script creates the `posts` table with columns: `id`, `secret`, `title`, `content`, `created_at`, `updated_at`
    -   A SQL trigger is in place to automatically update the `updated_at` column on any row modification
    -   The server correctly connects to or creates the `.db` file on startup
    -   Database uses nanoid for public IDs and randomUUID for secrets
-   **Dependencies:** 1.1
-   **Complexity:** Medium
-   **Technical Considerations:** The schema script should be idempotent (i.e., safe to run multiple times). Use `CREATE TABLE IF NOT EXISTS`.

#### 3.2. Set Up Express Server and Middleware
-   **Description:** Initialize an Express.js application and configure the core middleware stack.
-   **Acceptance Criteria:**
    -   Express server is set up in `server/`
    -   Middleware for JSON body parsing, CORS, helmet security headers, and request logging is implemented
    -   A centralized error handling middleware is created and registered
    -   Rate limiting middleware is configured using express-rate-limit
-   **Dependencies:** 1.1
-   **Complexity:** Medium
-   **Technical Considerations:** The logging middleware should provide structured JSON logs for production monitoring.

#### 3.3. Implement API Endpoints
-   **Description:** Implement the core API endpoints (`POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id`, `GET /health`).
-   **Acceptance Criteria:**
    -   `POST /`: Creates a new post. Returns `{id, secret, url}`
    -   `GET /:id`: Retrieves and renders a post. Returns HTML or JSON based on Accept header
    -   `PUT /:id`: Updates a post with Bearer token authentication
    -   `DELETE /:id`: Deletes a post with Bearer token authentication  
    -   `GET /health`: Returns system health status
    -   All endpoints use standardized error response format
-   **Dependencies:** 3.1, 3.2, 5.1, 5.3, 5.4
-   **Complexity:** High
-   **Technical Considerations:** Business logic should be separated into service/controller layers. Implement proper Bearer token validation.

#### 3.4. Implement Caching Layer
-   **Description:** Integrate `node-cache` to cache responses for the `GET /:id` endpoint.
-   **Acceptance Criteria:**
    -   A successful `GET` request for a specific ID populates the cache
    -   Subsequent requests for the same ID are served from the cache until TTL expires
    -   `PUT` and `DELETE` operations correctly invalidate the corresponding cache entry
    -   Both HTML and JSON responses are cached separately
-   **Dependencies:** 3.3
-   **Complexity:** Medium
-   **Technical Considerations:** The cache TTL should be configurable via environment variables.

#### 3.5. Implement Markdown Rendering and Sanitization
-   **Description:** Add server-side Markdown to HTML conversion with DOMPurify sanitization.
-   **Acceptance Criteria:**
    -   Raw Markdown content is stored in database without modification
    -   HTML rendering happens only when serving `GET /:id` requests with HTML Accept header
    -   DOMPurify sanitizes rendered HTML before sending to browser
    -   Markdown rendering supports basic syntax (headings, lists, links, code blocks)
-   **Dependencies:** 3.3
-   **Complexity:** Medium
-   **Technical Considerations:** Sanitize at render time, not storage time to preserve original content.

---

### 4. Frontend/Plugin Tasks

This section covers the Obsidian plugin implementation.

<br>

#### 4.1. Set Up Plugin Architecture
-   **Description:** Scaffold the basic Obsidian plugin structure, including `main.ts`, `manifest.json`, and `styles.css`.
-   **Acceptance Criteria:**
    -   The plugin loads successfully in Obsidian's development mode
    -   The `onload` and `onunload` methods are implemented correctly to register and clean up resources
    -   esbuild configuration outputs to project root for Obsidian compatibility
-   **Dependencies:** 1.1
-   **Complexity:** Medium
-   **Technical Considerations:** Ensure build output is compatible with Obsidian's plugin loading mechanism.

#### 4.2. Implement Settings Tab
-   **Description:** Create a settings tab for the plugin where users can configure the server URL.
-   **Acceptance Criteria:**
    -   The settings tab appears in Obsidian's settings window
    -   It contains input field for "Server URL" with default value
    -   Values are saved and loaded using Obsidian's `saveData` and `loadData` APIs
    -   Plugin validates URL format and shows appropriate error messages
-   **Dependencies:** 4.1
-   **Complexity:** Medium
-   **Technical Considerations:** This makes the plugin portable and enables self-hosting. Validate URL format to prevent configuration errors.

#### 4.3. Implement API Client Service
-   **Description:** Create a dedicated TypeScript class or module to handle all HTTP requests to the backend server.
-   **Acceptance Criteria:**
    -   The client uses the URL from plugin settings
    -   Methods exist for `publishPost`, `updatePost`, `deletePost`
    -   It correctly sets the `Authorization: Bearer <secret>` header for authenticated requests
    -   It handles network errors and non-2xx responses gracefully with user notifications
-   **Dependencies:** 4.2, 2.1
-   **Complexity:** Medium
-   **Technical Considerations:** Use modern fetch API with proper error handling and timeout configuration.

#### 4.4. Implement Local Data Management
-   **Description:** Create a system to track published posts locally within the plugin.
-   **Acceptance Criteria:**
    -   Plugin maintains mapping between local file paths and published post metadata
    -   Data is persisted using Obsidian's plugin data APIs
    -   System prevents duplicate publishing of the same note
    -   Supports tracking post IDs and secrets for updates/deletions
-   **Dependencies:** 4.1
-   **Complexity:** Medium
-   **Technical Considerations:** Use efficient data structures and implement proper data validation.

#### 4.5. Implement User Commands and UI
-   **Description:** Register plugin commands and context menu items for publishing workflow.
-   **Acceptance Criteria:**
    -   Commands are available in the Obsidian command palette: "Publish", "Update", "Delete", "Copy URL", "View Posts"
    -   Context menu items appear on markdown files in file explorer
    -   Editor menu includes publishing options
    -   Success/error notifications are shown using Obsidian's Notice API
    -   Modal dialog shows list of published posts
-   **Dependencies:** 4.3, 4.4
-   **Complexity:** High
-   **Technical Considerations:** Commands should be contextually appropriate (only show update/delete for already published notes).

---

### 5. Security & Performance Tasks

These tasks are critical for a production-ready system and should be integrated alongside feature development.

<br>

#### 5.1. Implement Rate Limiting
-   **Description:** Add rate limiting to the Express server to prevent abuse.
-   **Acceptance Criteria:**
    -   The `express-rate-limit` middleware is applied to all API endpoints
    -   Different limits for different endpoint types (stricter for POST/PUT/DELETE)
    -   Exceeding the rate limit returns a `429 Too Many Requests` error
    -   Rate limits are configurable via environment variables
-   **Dependencies:** 3.2
-   **Complexity:** Low
-   **Technical Considerations:** Balance security with usability. Start with reasonable limits.

#### 5.2. Configure CORS
-   **Description:** Configure the `cors` middleware to only allow requests from trusted origins.
-   **Acceptance Criteria:**
    -   CORS is configured to allow Obsidian app origins (`app://obsidian.md`, etc.)
    -   Public domain is included in allowed origins for browser access
    -   Proper headers are configured for preflight requests
-   **Dependencies:** 3.2
-   **Complexity:** Low
-   **Technical Considerations:** This is critical for preventing unauthorized cross-origin requests.

#### 5.3. Implement Input Validation
-   **Description:** Add validation for all incoming API request bodies and parameters.
-   **Acceptance Criteria:**
    -   Use `express-validator` or similar library to define validation schemas
    -   Invalid requests return `400 Bad Request` with descriptive error messages
    -   Validation covers required fields, data types, and content length limits
    -   SQL injection and XSS prevention measures are in place
-   **Dependencies:** 3.3
-   **Complexity:** Medium
-   **Technical Considerations:** Comprehensive input validation prevents many security issues and improves error messages.

#### 5.4. Implement Authentication Middleware
-   **Description:** Create middleware to validate Bearer tokens for protected endpoints.
-   **Acceptance Criteria:**
    -   Middleware extracts and validates Bearer tokens from Authorization header
    -   Protected endpoints (`PUT /:id`, `DELETE /:id`) require valid authentication
    -   Invalid or missing tokens return appropriate error responses
    -   Token validation includes checking against database secrets
-   **Dependencies:** 3.1, 3.2
-   **Complexity:** Medium
-   **Technical Considerations:** Ensure secure comparison of secrets to prevent timing attacks.

---

### 6. Testing Tasks

A comprehensive test suite ensures reliability and simplifies maintenance.

<br>

#### 6.1. Set Up Server Integration Tests
-   **Description:** Configure Jest and `supertest` for the server package to write integration tests for the API.
-   **Acceptance Criteria:**
    -   A `test` script is added to `server/package.json`
    -   Tests cover success and failure cases for all API endpoints
    -   Tests run against an in-memory or temporary test database
    -   Test coverage includes authentication, validation, and error handling
-   **Dependencies:** 3.3, 5.4
-   **Complexity:** High
-   **Technical Considerations:** Ensure test isolation and proper cleanup between tests.

#### 6.2. Set Up Plugin Unit Tests
-   **Description:** Configure the client package with `jest-environment-obsidian` to enable unit testing of plugin logic.
-   **Acceptance Criteria:**
    -   Jest is configured with `jest-environment-obsidian`
    -   Modular mocks for Obsidian API are created (App, Vault, Notice, etc.)
    -   Unit tests cover API client service, settings management, and command logic
    -   Tests verify error handling and user notification flows
-   **Dependencies:** 4.3, 4.4, 4.5
-   **Complexity:** High
-   **Technical Considerations:** Focus on testing business logic rather than Obsidian API integration details.

---

### 7. Deployment & DevOps Tasks

These tasks prepare the application for production deployment.

<br>

#### 7.1. Containerize the Server Application
-   **Description:** Create a `Dockerfile` for the server application.
-   **Acceptance Criteria:**
    -   The `Dockerfile` builds a production-ready, optimized container image
    -   Multi-stage builds are used to minimize final image size
    -   Container runs as non-root user for security
    -   Proper health check is configured
-   **Dependencies:** 3.1, 3.2
-   **Complexity:** Medium
-   **Technical Considerations:** Optimize for security, size, and startup time.

#### 7.2. Create Docker Compose Orchestration
-   **Description:** Create a `docker-compose.yml` file to orchestrate the server, Nginx, and SSL certificate management.
-   **Acceptance Criteria:**
    -   `docker-compose up` starts all required services
    -   Volumes are configured for database persistence and SSL certificates
    -   Environment variable management is properly configured
    -   Services have proper dependency relationships and restart policies
-   **Dependencies:** 7.1, 7.3
-   **Complexity:** Medium
-   **Technical Considerations:** Include Certbot for automatic SSL certificate management.

#### 7.3. Configure Nginx Reverse Proxy
-   **Description:** Write comprehensive Nginx configuration file.
-   **Acceptance Criteria:**
    -   Nginx handles SSL termination with automatic certificate renewal
    -   HTTP requests are redirected to HTTPS
    -   `client_max_body_size` is set appropriately (25M+) to allow large notes
    -   Proper security headers are configured
    -   Request forwarding to Node.js app includes proper headers
-   **Dependencies:** 7.1
-   **Complexity:** Medium
-   **Technical Considerations:** The `client_max_body_size` setting is critical to prevent 413 errors.

#### 7.4. Create Deployment Scripts
-   **Description:** Create automated deployment scripts for production setup.
-   **Acceptance Criteria:**
    -   `deploy.sh` script handles full deployment workflow
    -   Script includes health checks and rollback capabilities
    -   SSL certificate initial setup and renewal is automated
    -   Backup and restore procedures are documented and scripted
-   **Dependencies:** 7.2, 7.3
-   **Complexity:** Medium
-   **Technical Considerations:** Scripts should be idempotent and include proper error handling.

---

### 8. Documentation & Quality Assurance

High-quality documentation is essential for long-term project health.

<br>

#### 8.1. Write Code-Level Documentation
-   **Description:** Add comprehensive code documentation across all packages.
-   **Acceptance Criteria:**
    -   All exported functions, classes, and interfaces have TSDoc/JSDoc comments
    -   Complex business logic includes inline explanations
    -   API endpoints are documented with parameter descriptions and examples
    -   Database schema and migrations are documented
-   **Dependencies:** All development tasks
-   **Complexity:** Medium
-   **Technical Considerations:** This can be done incrementally as features are developed.

#### 8.2. Update Project Documentation
-   **Description:** Create comprehensive user and deployment documentation.
-   **Acceptance Criteria:**
    -   `README.md` provides clear project overview and quick start guide
    -   `DEPLOYMENT.md` includes step-by-step production deployment instructions
    -   `CLIENT_DEPLOYMENT.md` covers plugin installation and configuration
    -   All documentation is accurate and includes troubleshooting sections
-   **Dependencies:** 7.4, All implementation tasks
-   **Complexity:** Medium
-   **Technical Considerations:** Documentation should be accessible to both technical and non-technical users.

---

This task breakdown provides a comprehensive roadmap for implementing the Obsidian Publishing System. Each task includes clear acceptance criteria and technical considerations to guide the development process.