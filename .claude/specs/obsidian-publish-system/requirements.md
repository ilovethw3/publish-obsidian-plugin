# Obsidian Publishing System - Requirements Specification

## 1. Introduction

This document outlines the functional and non-functional requirements for the Obsidian Publishing System. The system enables users to publish Markdown notes from their Obsidian vault to a public-facing web server, manage these published notes, and share them via a short URL.

The system is a monorepo project comprising three main components:
*   **Client**: An Obsidian plugin that provides the user interface and logic for publishing notes.
*   **Server**: An Express.js web service that handles API requests, stores note data, and serves the published content.
*   **Shared**: A package of common TypeScript types used by both the client and server to ensure data consistency.

## 2. Functional Requirements

### 2.1. User Stories

#### 2.1.1. Publishing a New Note

*   **As a user**, I want to publish a new note from Obsidian to the web service.
*   **So that** I can share it with others via a public URL.

**Acceptance Criteria:**
1.  The user can trigger a "Publish" action from within Obsidian (e.g., via a command palette command or a context menu on a file).
2.  The client sends the current note's title and content to the server's `POST /` endpoint.
3.  The server validates the request and stores the note in the database.
4.  The server generates a unique, 8-character public ID and a separate UUID secret for future modifications.
5.  The server returns the public ID and the secret to the client.
6.  The client stores this metadata (ID, secret, and file path) locally to track the published state of the note.
7.  The client displays a success notification to the user, including the public URL (e.g., `https://share.141029.xyz/<id>`).

#### 2.1.2. Viewing a Published Note

*   **As anyone with the link**, I want to view a published note in a web browser.
*   **So that** I can read the content shared by the user.

**Acceptance Criteria:**
1.  Accessing `https://share.141029.xyz/<id>` in a browser sends a `GET` request to the server.
2.  The server retrieves the note from the database using the provided ID.
3.  The server renders the note's Markdown content as HTML.
4.  The rendered HTML is returned to the browser with a `200 OK` status.
5.  If the ID does not exist, the server returns a `404 Not Found` error.

#### 2.1.3. Updating a Published Note

*   **As a user**, I want to update an already published note with new content from Obsidian.
*   **So that** the public URL reflects my latest changes.

**Acceptance Criteria:**
1.  The user can trigger an "Update" action for a note that has already been published.
2.  The client retrieves the stored ID and secret for the note.
3.  The client sends the updated title and content to the server's `PUT /:id` endpoint, including the secret for authorization.
4.  The server validates that the secret matches the one stored for the given ID.
5.  If authorized, the server updates the note's content and title in the database.
6.  The server returns a `200 OK` success response.
7.  If the secret is invalid or missing, the server returns a `403 Forbidden` or `401 Unauthorized` error.
8.  The client displays a success notification to the user.

#### 2.1.4. Deleting a Published Note

*   **As a user**, I want to delete a published note from the web service.
*   **So that** it is no longer publicly accessible.

**Acceptance Criteria:**
1.  The user can trigger a "Delete" action for a published note.
2.  The client retrieves the stored ID and secret for the note.
3.  The client sends a request to the server's `DELETE /:id` endpoint, including the secret for authorization.
4.  The server validates the secret and, if authorized, deletes the note from the database.
5.  The server returns a `204 No Content` success response.
6.  If the secret is invalid, the server returns a `403 Forbidden` or `401 Unauthorized` error.
7.  The client removes the locally stored metadata for the note.
8.  The client displays a success notification to the user.

## 3. Non-functional Requirements

*   **Performance**:
    *   API response times for all endpoints (POST, PUT, DELETE) should be under 500ms on average.
    *   `GET /:id` page load time for a published note should be under 1 second.
*   **Reliability**:
    *   The web service should have an uptime of 99.9%.
    *   The system must include a `/health` endpoint that can be used by monitoring services to check application status.
*   **Scalability**:
    *   The server architecture must be stateless to allow for horizontal scaling, with the SQLite database being the single stateful component.
*   **Usability**:
    *   The Obsidian plugin interface must be intuitive and seamlessly integrate with the Obsidian user experience.
    *   Notifications for success and failure states must be clear and informative.

## 4. API Requirements

The server shall expose a RESTful API. All endpoints should return JSON, except for the public-facing `GET /:id` which returns HTML.

#### `POST /`
*   **Description**: Creates a new published note.
*   **Request Body**:
    ```json
    {
      "title": "string",
      "content": "string"
    }
    ```
*   **Success Response (201 Created)**:
    ```json
    {
      "id": "string", // 8-character public ID
      "secret": "string" // UUID for modification
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: If the request body is malformed or missing required fields.
    *   `500 Internal Server Error`: If the server fails to create the post or generate IDs.

#### `GET /:id`
*   **Description**: Retrieves a published note for viewing.
*   **Request Headers**: `Accept` header can be used to request `application/json` to get raw data.
*   **Success Response (200 OK)**:
    *   If `Accept` header contains `application/json`:
        ```json
        {
          "id": "string",
          "title": "string",
          "content": "string",
          "createdAt": "string", // ISO 8601
          "updatedAt": "string"  // ISO 8601
        }
        ```
    *   Otherwise, returns `text/html` content.
*   **Error Responses**:
    *   `404 Not Found`: If no post with the given `id` exists.

#### `PUT /:id`
*   **Description**: Updates an existing published note.
*   **Request Headers**:
    *   `Authorization: Bearer <secret>`: The UUID secret is required for authorization.
*   **Request Body**:
    ```json
    {
      "title": "string",
      "content": "string"
    }
    ```
*   **Success Response (200 OK)**:
    ```json
    {
      "message": "Post updated successfully."
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: Malformed request body.
    *   `401 Unauthorized`: Missing or invalid `Authorization` header.
    *   `403 Forbidden`: The provided secret does not match the post's secret.
    *   `404 Not Found`: The post `id` does not exist.

#### `DELETE /:id`
*   **Description**: Deletes a published note.
*   **Request Headers**:
    *   `Authorization: Bearer <secret>`: The UUID secret is required for authorization.
*   **Success Response (204 No Content)**: Empty body.
*   **Error Responses**:
    *   `401 Unauthorized`: Missing or invalid `Authorization` header.
    *   `403 Forbidden`: The provided secret does not match the post's secret.
    *   `404 Not Found`: The post `id` does not exist.

#### `GET /health`
*   **Description**: Health check endpoint for monitoring.
*   **Success Response (200 OK)**:
    ```json
    {
      "status": "ok",
      "timestamp": "string" // ISO 8601
    }
    ```

## 5. Database Requirements

*   **System**: SQLite.
*   **Database File**: Located at `server/database/posts.db`.
*   **Schema**: A single table named `posts`.

| Column      | Data Type     | Constraints                               | Description                               |
|-------------|---------------|-------------------------------------------|-------------------------------------------|
| `id`        | `TEXT`        | `PRIMARY KEY`, `NOT NULL`, `UNIQUE`       | The 8-character public-facing short ID.   |
| `secret`    | `TEXT`        | `NOT NULL`, `UNIQUE`                      | The UUID used for authorizing modifications. |
| `title`     | `TEXT`        | `NOT NULL`                                | The title of the note.                    |
| `content`   | `TEXT`        | `NOT NULL`                                | The Markdown content of the note.         |
| `createdAt` | `TEXT`        | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP`   | The timestamp of creation (ISO 8601).     |
| `updatedAt` | `TEXT`        | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP`   | The timestamp of the last update (ISO 8601). |

## 6. Deployment Requirements

*   **Containerization**: The server application and its dependencies must be containerized using Docker.
*   **Orchestration**: Docker Compose will be used to manage the multi-container setup.
*   **Services**:
    1.  `app`: The Node.js/Express.js application container.
    2.  `nginx`: An Nginx container acting as a reverse proxy.
    3.  `certbot`: A Certbot container for managing Let's Encrypt SSL certificates.
*   **Networking**:
    *   Nginx will expose ports 80 and 443 to the host.
    *   The `app` service will only be accessible from within the Docker network by Nginx.
*   **SSL**: Nginx will handle SSL termination. Certificates will be automatically provisioned and renewed by Certbot.
*   **Configuration**:
    *   System configuration (domain name, etc.) will be managed via a `.env` file at the project root.
    *   The deployment process will be automated via a `deploy.sh` script.

## 7. Client Plugin Requirements

*   **Framework**: The plugin must be built for Obsidian.md.
*   **Build Process**: TypeScript code will be bundled into a single `main.js` file using `esbuild`.
*   **Configuration**:
    *   The server base URL is currently hardcoded in `client/src/obsius.ts`. This **should be made configurable** via the plugin's settings tab in Obsidian to allow users to self-host the server.
*   **UI/UX**:
    *   The plugin must add commands to the Obsidian command palette for `Publish`, `Update Published Note`, and `Delete Published Note`.
    *   The plugin should use Obsidian's native modal UI components for user interactions and confirmations.
    *   The plugin must use Obsidian's notice API to display transient success or error messages.
*   **State Management**:
    *   The plugin must maintain a local file (e.g., a JSON file in the plugin's configuration directory) to map Obsidian file paths to their corresponding public ID and secret. This prevents re-publishing the same note and enables updates/deletions.

## 8. Security Requirements

*   **Authentication**: Modification and deletion of posts must be authenticated. This is achieved by requiring the `secret` UUID to be passed as a Bearer Token in the `Authorization` header.
*   **Data in Transit**: All communication between the client and server must be encrypted using TLS/SSL.
*   **CORS**: The server must be configured with a strict Cross-Origin Resource Sharing (CORS) policy that only allows requests from known Obsidian origins (e.g., `app://obsidian.md`) and the public-facing domain.
*   **Input Validation**: All user-supplied data received by the API must be rigorously validated and sanitized on the server-side to prevent XSS, SQL injection, and other payload-based attacks.
*   **Security Headers**: The server must use Helmet.js or an equivalent library to set secure HTTP headers (e.g., `X-Content-Type-Options`, `Strict-Transport-Security`).

## 9. Monitoring Requirements

*   **Logging**:
    *   The server application must log all incoming HTTP requests (method, path, status code, response time).
    *   All application errors and exceptions must be logged with a stack trace and relevant context.
    *   Logs should be written to `stdout`/`stderr` to be easily collected by Docker's logging driver.
*   **Health Checks**:
    *   The `GET /health` endpoint must be implemented to provide a simple, reliable way for external services to check if the application is running.
*   **Alerting**:
    *   A basic alerting strategy should be in place. At a minimum, the system operator should be alerted if the health check endpoint fails for a sustained period.
*   **Metrics**:
    *   Basic container-level metrics (CPU, memory, network I/O) should be monitored using `docker stats` or a similar tool.