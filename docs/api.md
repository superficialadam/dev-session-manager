# Dev Session Manager API

The Dev Session Manager provides a REST API for managing development sessions via HTTP requests. The API allows you to create, list, restart, and delete development sessions programmatically.

## Base URL

```
http://localhost:7777/api
```

(Assuming the dashboard runs on port 7777)

## Authentication

No authentication required for local development.

## Endpoints

### List Sessions

Retrieve a list of all active development sessions with full details.

- **URL:** `/sessions`
- **Method:** `GET`
- **Response:**
  - **Status:** 200 OK
  - **Body:**
    ```json
    {
      "sessions": [
        {
          "name": "feature-auth",
          "repo": "my-project",
          "branch": "feature/auth",
          "worktree": "/home/user/CODE/worktrees/feature-auth",
          "agent": "opencode",
          "tmux_session": "feature-auth",
          "ttyd_port": 7700,
          "opencode_port": 4100,
          "nvim_port": 6100,
          "created_at": "2024-01-15T10:30:00Z",
          "status": "idle",
          "last_activity": "2024-01-15T12:00:00Z",
          "tmux_exists": true,
          "attached": false,
          "agent_state": "idle"
        }
      ]
    }
    ```
  - **Error Response:**
    ```json
    {
      "error": "Failed to list sessions"
    }
    ```

### Create Session

Create a new development session with the specified repository and branch.

- **URL:** `/sessions`
- **Method:** `POST`
- **Request Body:**
  ```json
  {
    "repo": "repository-name",
    "branch": "branch-name",
    "agent": "opencode"  // optional, defaults to configured agent
  }
  ```
- **Response:**
  - **Status:** 200 OK
  - **Body:**
    ```json
    {
      "message": "Session created successfully",
      "output": "Command output..."
    }
    ```
  - **Error Response:**
    ```json
    {
      "error": "Failed to create session",
      "details": "Error message"
    }
    ```

### Delete Session

Delete an existing development session.

- **URL:** `/sessions/{session-name}`
- **Method:** `DELETE`
- **Response:**
  - **Status:** 200 OK
  - **Body:**
    ```json
    {
      "message": "Session deleted successfully",
      "output": "Command output..."
    }
    ```
  - **Error Response:**
    ```json
    {
      "error": "Failed to delete session",
      "details": "Error message"
    }
    ```

### Restart Session

Restart components of an existing development session.

- **URL:** `/sessions/{session-name}`
- **Method:** `POST`
- **Request Body:**
  ```json
  {
    "action": "restart",
    "agent": "opencode",  // optional, restart agent
    "nvim": true          // optional, restart nvim
  }
  ```
  If neither `agent` nor `nvim` is specified, both will be restarted.
- **Response:**
  - **Status:** 200 OK
  - **Body:**
    ```json
    {
      "message": "Session restarted successfully",
      "output": "Command output..."
    }
    ```
  - **Error Response:**
    ```json
    {
      "error": "Failed to perform action",
      "details": "Error message"
    }
    ```

## Error Codes

- `400 Bad Request` - Invalid request parameters
- `500 Internal Server Error` - Server or command execution error

## Examples

### Create a Session

```bash
curl -X POST http://localhost:7777/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"repo":"my-project","branch":"develop","agent":"opencode"}'
```

### List Sessions

```bash
curl http://localhost:7777/api/sessions
```

### Restart Agent in Session

```bash
curl -X POST http://localhost:7777/api/sessions/my-session \
  -H "Content-Type: application/json" \
  -d '{"action":"restart","agent":"opencode"}'
```

### Delete a Session

```bash
curl -X DELETE http://localhost:7777/api/sessions/my-session
```

## Notes

- The API executes the underlying `dev-*` bash scripts.
- Session creation may take time as it sets up worktrees and dependencies.
- Ensure the dashboard server is running (`npm run dev` in `packages/dashboard`).
- All responses are in JSON format.