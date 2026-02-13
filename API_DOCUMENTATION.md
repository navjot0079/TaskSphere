# API Documentation

Base URL: `http://localhost:5000/api`

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <access_token>
```

### Token Refresh

Access tokens expire after 15 minutes. Use the refresh token to get a new access token without requiring the user to log in again.

---

## Authentication Endpoints

### Register User
**POST** `/auth/register`

Create a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful. Please check your email for OTP.",
  "userId": "65a1b2c3d4e5f6g7h8i9j0k1"
}
```

---

### Verify OTP
**POST** `/auth/verify-otp`

Verify email with OTP code.

**Request Body:**
```json
{
  "userId": "65a1b2c3d4e5f6g7h8i9j0k1",
  "otp": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

---

### Login
**POST** `/auth/login`

Authenticate user and receive tokens.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "avatar": "https://..."
  }
}
```

---

### Refresh Token
**POST** `/auth/refresh-token`

Get new access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### Forgot Password
**POST** `/auth/forgot-password`

Request password reset link.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

---

### Reset Password
**POST** `/auth/reset-password`

Reset password with token from email.

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "password": "newpassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

---

## Task Endpoints

### Get All Tasks
**GET** `/tasks`

Get tasks with optional filters.

**Query Parameters:**
- `status` - Filter by status (todo, in-progress, review, completed)
- `priority` - Filter by priority (low, medium, high, urgent)
- `project` - Filter by project ID
- `assignedTo` - Filter by assigned user ID
- `search` - Search in title and description

**Response (200):**
```json
{
  "success": true,
  "tasks": [
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "title": "Design Homepage",
      "description": "Create wireframes and mockups",
      "status": "in-progress",
      "priority": "high",
      "dueDate": "2024-02-01T00:00:00.000Z",
      "createdBy": {...},
      "assignedTo": {...},
      "project": {...},
      "subtasks": [...],
      "tags": ["design", "ui"]
    }
  ]
}
```

---

### Create Task
**POST** `/tasks`

Create a new task.

**Request Body:**
```json
{
  "title": "Design Homepage",
  "description": "Create wireframes and mockups",
  "priority": "high",
  "status": "todo",
  "dueDate": "2024-02-01",
  "assignedTo": "65a1b2c3d4e5f6g7h8i9j0k1",
  "project": "65a1b2c3d4e5f6g7h8i9j0k2",
  "tags": ["design", "ui"],
  "subtasks": [
    { "title": "Research competitors" },
    { "title": "Create wireframes" }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "task": {...}
}
```

---

### Get Task by ID
**GET** `/tasks/:id`

Get single task details.

**Response (200):**
```json
{
  "success": true,
  "task": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "title": "Design Homepage",
    "description": "Create wireframes and mockups",
    "status": "in-progress",
    "priority": "high",
    "dueDate": "2024-02-01T00:00:00.000Z",
    "createdBy": {...},
    "assignedTo": {...},
    "project": {...},
    "subtasks": [...],
    "comments": [...],
    "loggedHours": 5.5,
    "tags": ["design", "ui"]
  }
}
```

---

### Update Task
**PUT** `/tasks/:id`

Update task details.

**Request Body:**
```json
{
  "title": "Updated Title",
  "status": "completed",
  "priority": "medium"
}
```

**Response (200):**
```json
{
  "success": true,
  "task": {...}
}
```

---

### Delete Task
**DELETE** `/tasks/:id`

Delete a task.

**Response (200):**
```json
{
  "success": true,
  "message": "Task deleted successfully"
}
```

---

### Start Time Tracking
**POST** `/tasks/:id/time/start`

Start tracking time on a task.

**Response (200):**
```json
{
  "success": true,
  "task": {...}
}
```

---

### Stop Time Tracking
**POST** `/tasks/:id/time/stop`

Stop time tracking and calculate duration.

**Response (200):**
```json
{
  "success": true,
  "task": {...},
  "sessionDuration": 2.5
}
```

---

### Add Comment
**POST** `/tasks/:id/comments`

Add a comment to a task.

**Request Body:**
```json
{
  "content": "This is looking great!"
}
```

**Response (201):**
```json
{
  "success": true,
  "comment": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "content": "This is looking great!",
    "user": {...},
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## Project Endpoints

### Get All Projects
**GET** `/projects`

Get all projects accessible to the user.

**Response (200):**
```json
{
  "success": true,
  "projects": [
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "name": "Website Redesign",
      "description": "Complete redesign of company website",
      "owner": {...},
      "members": [...],
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-04-01T00:00:00.000Z",
      "status": "active",
      "taskCount": 12,
      "completionPercentage": 45
    }
  ]
}
```

---

### Create Project
**POST** `/projects`

Create a new project.

**Request Body:**
```json
{
  "name": "Website Redesign",
  "description": "Complete redesign of company website",
  "startDate": "2024-01-01",
  "endDate": "2024-04-01"
}
```

**Response (201):**
```json
{
  "success": true,
  "project": {...}
}
```

---

### Get Project by ID
**GET** `/projects/:id`

Get project details with members and tasks.

**Response (200):**
```json
{
  "success": true,
  "project": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "name": "Website Redesign",
    "description": "Complete redesign of company website",
    "owner": {...},
    "members": [
      {
        "user": {...},
        "role": "owner",
        "joinedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-04-01T00:00:00.000Z",
    "status": "active"
  }
}
```

---

### Add Project Member
**POST** `/projects/:id/members`

Add a member to the project.

**Request Body:**
```json
{
  "email": "member@example.com",
  "role": "member"
}
```

**Response (200):**
```json
{
  "success": true,
  "project": {...}
}
```

---

### Remove Project Member
**DELETE** `/projects/:id/members/:userId`

Remove a member from the project.

**Response (200):**
```json
{
  "success": true,
  "project": {...}
}
```

---

## Dashboard Endpoints

### Get Dashboard Stats
**GET** `/dashboard/stats`

Get dashboard statistics.

**Response (200):**
```json
{
  "success": true,
  "stats": {
    "total": 50,
    "completed": 25,
    "inProgress": 15,
    "overdue": 5,
    "completionRate": 50
  }
}
```

---

### Get Upcoming Tasks
**GET** `/dashboard/upcoming`

Get upcoming tasks (default: 7 days).

**Query Parameters:**
- `days` - Number of days to look ahead (default: 7)

**Response (200):**
```json
{
  "success": true,
  "tasks": [...]
}
```

---

### Get Charts Data
**GET** `/dashboard/charts`

Get data for dashboard charts.

**Query Parameters:**
- `type` - Chart type (status-distribution, priority-distribution, completion-trend)

**Response (200):**
```json
{
  "success": true,
  "data": [
    { "name": "Todo", "value": 10 },
    { "name": "In Progress", "value": 15 },
    { "name": "Review", "value": 5 },
    { "name": "Completed", "value": 20 }
  ]
}
```

---

## File Endpoints

### Upload File
**POST** `/files/upload`

Upload a file.

**Request:** multipart/form-data
- `file` - File to upload
- `taskId` (optional) - Associated task ID
- `projectId` (optional) - Associated project ID

**Response (201):**
```json
{
  "success": true,
  "file": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "originalName": "document.pdf",
    "fileName": "1642156800000-document.pdf",
    "mimeType": "application/pdf",
    "size": 1024000,
    "uploadedBy": {...}
  }
}
```

---

### Get All Files
**GET** `/files`

Get all files accessible to the user.

**Response (200):**
```json
{
  "success": true,
  "files": [...]
}
```

---

### Download File
**GET** `/files/:id/download`

Download a file.

**Response:** File stream

---

### Delete File
**DELETE** `/files/:id`

Delete a file.

**Response (200):**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

---

## Notification Endpoints

### Get Notifications
**GET** `/notifications`

Get user's notifications.

**Query Parameters:**
- `unread` - Filter by unread (true/false)

**Response (200):**
```json
{
  "success": true,
  "notifications": [
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "type": "task_assigned",
      "title": "New task assigned",
      "message": "You have been assigned to 'Design Homepage'",
      "isRead": false,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### Mark as Read
**PUT** `/notifications/:id/read`

Mark notification as read.

**Response (200):**
```json
{
  "success": true,
  "notification": {...}
}
```

---

### Mark All as Read
**PUT** `/notifications/read-all`

Mark all notifications as read.

**Response (200):**
```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```

---

## User Endpoints

### Get My Profile
**GET** `/users/me`

Get current user's profile.

**Response (200):**
```json
{
  "success": true,
  "user": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "avatar": "https://...",
    "phone": "+1234567890"
  }
}
```

---

### Update Profile
**PUT** `/users/profile`

Update user profile.

**Request Body:**
```json
{
  "name": "John Doe Updated",
  "phone": "+1234567890"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {...}
}
```

---

### Change Password
**PUT** `/users/change-password`

Change user password.

**Request Body:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## Admin Endpoints

### Get All Users (Admin Only)
**GET** `/users/admin/all`

Get all users in the system.

**Response (200):**
```json
{
  "success": true,
  "users": [...]
}
```

---

### Update User Role (Admin Only)
**PUT** `/users/admin/:userId/role`

Change a user's role.

**Request Body:**
```json
{
  "role": "manager"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {...}
}
```

---

### Delete User (Admin Only)
**DELETE** `/users/admin/:userId`

Delete a user account.

**Response (200):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

## Error Responses

All endpoints may return these error responses:

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Not authorized, token missing or invalid"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Not authorized to access this resource"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Server error",
  "error": "Error details..."
}
```

---

## WebSocket Events

Connect to Socket.io server at `http://localhost:5000`

### Client Events

**Join Task Room**
```javascript
socket.emit('task:join', { taskId: '65a1b2c3...' });
```

**Leave Task Room**
```javascript
socket.emit('task:leave', { taskId: '65a1b2c3...' });
```

**Send Chat Message**
```javascript
socket.emit('chat:send-message', {
  roomId: '65a1b2c3...',
  content: 'Hello team!'
});
```

**Typing Indicator**
```javascript
socket.emit('chat:typing', {
  roomId: '65a1b2c3...',
  userName: 'John Doe'
});
```

### Server Events

**Task Updated**
```javascript
socket.on('task:updated', (task) => {
  console.log('Task updated:', task);
});
```

**New Notification**
```javascript
socket.on('notification:new', (notification) => {
  console.log('New notification:', notification);
});
```

**Chat Message**
```javascript
socket.on('chat:message', (message) => {
  console.log('New message:', message);
});
```

**User Online/Offline**
```javascript
socket.on('user:status', ({ userId, status }) => {
  console.log(`User ${userId} is ${status}`);
});
```

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse:
- **Limit:** 100 requests per 15 minutes per IP
- **Response when exceeded:** 429 Too Many Requests

```json
{
  "success": false,
  "message": "Too many requests, please try again later"
}
```
