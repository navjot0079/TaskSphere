# Task Manager SaaS - Production Ready

A complete, production-ready Task Manager SaaS application with modern UI, real-time features, and scalable architecture.

## 🚀 Features

### Core Features
- ✅ **Authentication** - JWT + Refresh Tokens, Email OTP Verification
- 📊 **Dashboard** - Analytics, Charts, Activity Feed
- ✏️ **Task Management** - CRUD, Kanban, Calendar, Gantt, Time Tracking
- 📁 **Projects** - Team Collaboration, Progress Tracking
- 💬 **Real-time Chat** - WebSocket-powered messaging
- 🔔 **Notifications** - Real-time alerts, Email reminders
- 📂 **File Manager** - Upload, Download, Preview
- 👤 **Profile Management** - Avatar, Settings, Theme
- 🛡️ **Admin Panel** - RBAC, User Management, Analytics
- 🎨 **Modern UI** - Tailwind CSS, Framer Motion animations
- 🌓 **Dark/Light Theme** - Toggle between themes

### Advanced Features
- 🤖 AI Task Suggestions
- ⏱️ Pomodoro Timer
- 📈 Productivity Scoring
- 📝 Activity Logs
- 📱 PWA Support
- 🎭 Micro-animations
- 💀 Loading Skeletons

## 📋 Tech Stack

### Frontend
- React 18 (Vite)
- Tailwind CSS
- Framer Motion
- Lucide React Icons
- Recharts
- Socket.io-client
- Axios

### Backend
- Node.js
- Express.js
- MongoDB + Mongoose
- JWT Authentication
- Socket.io
- Nodemailer
- Multer
- Bcrypt

## 🛠️ Installation

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Quick Start

1. **Clone the repository**
   ```bash
   cd Task_Manager
   ```

2. **Install all dependencies**
   ```bash
   npm run install-all
   ```

3. **Configure environment variables**

   Create `backend/.env`:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/taskmanager
   JWT_SECRET=your_super_secret_jwt_key_change_this
   JWT_REFRESH_SECRET=your_super_secret_refresh_key_change_this
   JWT_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d
   
   # Email Configuration (Gmail example)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-specific-password
   EMAIL_FROM=TaskManager <noreply@taskmanager.com>
   
   # Frontend URL
   FRONTEND_URL=http://localhost:5173
   
   # File Upload
   MAX_FILE_SIZE=10485760
   UPLOAD_PATH=./uploads
   
   # Node Environment
   NODE_ENV=development
   ```

   Create `frontend/.env`:
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_SOCKET_URL=http://localhost:5000
   ```

4. **Start the application**
   ```bash
   npm run dev
   ```

   This starts both frontend (http://localhost:5173) and backend (http://localhost:5000)

## 📁 Project Structure

```
Task_Manager/
├── backend/
│   ├── config/          # Database, email config
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Auth, RBAC, error handling
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Helper functions
│   ├── uploads/         # File storage
│   └── server.js        # Entry point
│
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API calls
│   │   ├── utils/       # Helpers
│   │   ├── hooks/       # Custom hooks
│   │   ├── context/     # React Context
│   │   └── App.jsx      # Root component
│   └── public/          # Static assets
│
└── package.json         # Root package file
```

## 🔐 Authentication

### User Roles
- **Admin** - Full system access
- **Manager** - Team and project management
- **User** - Standard access

### Default Credentials (Development)
```
Admin:
Email: admin@taskmanager.com
Password: Admin@123

Manager:
Email: manager@taskmanager.com
Password: Manager@123

User:
Email: user@taskmanager.com
Password: User@123
```

## 📡 API Documentation

Base URL: `http://localhost:5000/api`

### Authentication Endpoints
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login
- `POST /auth/verify-otp` - Verify email OTP
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password
- `POST /auth/refresh-token` - Refresh access token

### Task Endpoints
- `GET /tasks` - Get all tasks
- `POST /tasks` - Create task
- `GET /tasks/:id` - Get task by ID
- `PUT /tasks/:id` - Update task
- `DELETE /tasks/:id` - Delete task

### Project Endpoints
- `GET /projects` - Get all projects
- `POST /projects` - Create project
- `GET /projects/:id` - Get project details
- `PUT /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project

[More endpoints in API documentation...]

## 🎨 UI Components

### Reusable Components
- Button, Input, Select, Textarea
- Modal, Drawer, Dialog
- Toast notifications
- Loading skeletons
- Charts (Bar, Line, Pie, Area)
- Kanban board
- Calendar view
- Gantt chart
- File uploader
- Avatar
- Badge, Card, Tabs

## 🔌 WebSocket Events

### Client Events
- `join_room` - Join task/project room
- `send_message` - Send chat message
- `typing` - Typing indicator
- `task_update` - Broadcast task update

### Server Events
- `message` - New message received
- `notification` - New notification
- `user_status` - User online/offline
- `task_updated` - Task was updated

## 🧪 Testing

```bash
# Run backend tests
cd backend
npm test

# Run frontend tests
cd frontend
npm test
```

## 🚀 Deployment

### Backend Deployment (Example: Heroku)
```bash
cd backend
heroku create your-app-name
git push heroku main
```

### Frontend Deployment (Example: Vercel)
```bash
cd frontend
vercel deploy
```

### Environment Variables
Update all `.env` files with production values before deployment.

## 📝 License

MIT License - feel free to use this project for learning or commercial purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues or questions, please open an issue on GitHub.

---

**Built with ❤️ using React, Node.js, and MongoDB**
