# 🚀 Getting Started - Task Manager SaaS

Welcome! Your complete production-ready Task Manager SaaS application is ready to run.

## 📋 Quick Start (3 Steps)

### Step 1: Install Dependencies (2 minutes)

Open your terminal in the project root directory and run:

```bash
npm run install-all
```

This installs dependencies for:
- Root project
- Backend server
- Frontend application

### Step 2: Configure Environment Variables (3 minutes)

#### Backend Configuration

Create `backend/.env` file with these settings:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database (Choose one option)
# Option A - Local MongoDB
MONGODB_URI=mongodb://localhost:27017/task-manager

# Option B - MongoDB Atlas (Cloud)
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/task-manager

# JWT Secrets (IMPORTANT: Change these!)
JWT_SECRET=your_very_long_random_secret_min_32_characters_abc123xyz
JWT_REFRESH_SECRET=your_very_long_random_refresh_secret_min_32_characters_xyz789
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Email Configuration (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-digit-app-password
EMAIL_FROM=Task Manager <noreply@taskmanager.com>

# Frontend URL
CLIENT_URL=http://localhost:5173

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
```

#### Frontend Configuration

Create `frontend/.env` file:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### Step 3: Setup Database & Start Server (1 minute)

#### A. Start MongoDB (Local Only)

**Windows:**
```bash
net start MongoDB
```

**Mac:**
```bash
brew services start mongodb-community
```

**Linux:**
```bash
sudo systemctl start mongod
```

#### B. Seed Database (Recommended)

```bash
cd backend
npm run seed
```

This creates test accounts:
- **Admin**: admin@taskmanager.com / Admin@123
- **Manager**: manager@taskmanager.com / Manager@123
- **User**: user@taskmanager.com / User@123

And sample projects and tasks.

#### C. Start Application

From the root directory:

```bash
npm run dev
```

This starts:
- ✅ Backend API → http://localhost:5000
- ✅ Frontend App → http://localhost:5173

## 🎉 You're Ready!

Open your browser and go to:
```
http://localhost:5173
```

**Login with:**
- Email: `admin@taskmanager.com`
- Password: `Admin@123`

## 🏗️ What You Can Do

### As Admin
- ✅ Manage all users
- ✅ View system statistics
- ✅ Change user roles
- ✅ Access admin panel
- ✅ All features below

### As Manager
- ✅ Create and manage projects
- ✅ Add team members
- ✅ Assign tasks
- ✅ View team analytics
- ✅ All features below

### As User
- ✅ View and manage your tasks
- ✅ Track time on tasks
- ✅ Chat with team
- ✅ Upload files
- ✅ Receive notifications
- ✅ Customize profile
- ✅ Toggle dark/light theme

## 📱 Features to Explore

1. **Dashboard** - View your task statistics and charts
2. **Tasks** - Create, edit, filter, and search tasks
3. **Task Details** - Add comments, subtasks, track time
4. **Projects** - Create projects and add team members
5. **Chat** - Real-time messaging with your team
6. **Files** - Upload and manage files
7. **Profile** - Update your profile and settings
8. **Admin Panel** (Admin only) - Manage users and system

## 🔧 Troubleshooting

### MongoDB Connection Error?

**Local MongoDB:**
1. Check MongoDB is running
2. Verify connection string in `backend/.env`

**MongoDB Atlas:**
1. Check cluster is active
2. Whitelist your IP address
3. Verify username/password

### Email Not Working?

1. Enable Gmail 2-Factor Authentication
2. Go to Google Account → Security → App Passwords
3. Generate app password for "Mail"
4. Use the 16-digit password in `EMAIL_PASSWORD`

### Port Already in Use?

**Change the port:**
Edit `backend/.env`:
```env
PORT=5001
```

**Or kill the process:**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <process_id> /F

# Mac/Linux
lsof -ti:5000 | xargs kill -9
```

### Frontend Not Loading?

1. Check backend is running
2. Verify `VITE_API_URL` in `frontend/.env`
3. Clear browser cache
4. Try: `cd frontend && npm run dev`

## 📚 Documentation

Your project includes:

1. **README.md** - Complete project overview
2. **SETUP.md** - Detailed setup instructions
3. **API_DOCUMENTATION.md** - All API endpoints
4. **PROJECT_SUMMARY.md** - What's included
5. **CHANGELOG.md** - Version history

## 🎨 Customization

### Change Branding

**Colors** - Edit `frontend/tailwind.config.js`:
```javascript
theme: {
  colors: {
    primary: {...}, // Your brand color
  }
}
```

**Logo** - Replace in `frontend/src/components/layout/Sidebar.jsx`

**Email Templates** - Edit `backend/utils/email.js`

### Add Features

The codebase is modular and well-structured:
- Models: `backend/models/`
- Controllers: `backend/controllers/`
- Routes: `backend/routes/`
- Pages: `frontend/src/pages/`
- Components: `frontend/src/components/`

## 🚀 Deployment

When ready for production:

### Backend

**Heroku:**
```bash
cd backend
heroku create your-app-name
git push heroku main
```

**Railway/Render:**
- Connect GitHub repo
- Set environment variables
- Deploy automatically

### Frontend

**Vercel:**
```bash
cd frontend
vercel
```

**Netlify:**
- Connect GitHub repo
- Build command: `npm run build`
- Publish directory: `dist`

### Database

**MongoDB Atlas** (Recommended for production):
1. Create cluster
2. Update `MONGODB_URI` in production .env
3. Whitelist deployment IPs

## 📊 Project Statistics

- **Total Files**: 100+
- **Lines of Code**: 15,000+
- **Backend Endpoints**: 50+
- **Frontend Pages**: 15
- **UI Components**: 7
- **Database Models**: 9

## 🎓 Learn from This Project

This project demonstrates:
- ✅ Full-stack MERN development
- ✅ RESTful API design
- ✅ JWT authentication
- ✅ Real-time communication (WebSocket)
- ✅ File handling
- ✅ Email integration
- ✅ Modern React patterns
- ✅ State management
- ✅ Responsive design
- ✅ Security best practices

## 💡 Tips

1. **Development**: Keep backend and frontend terminals open
2. **Testing**: Use the seeded test accounts
3. **Debugging**: Check browser console and backend logs
4. **API Testing**: Use Postman or Thunder Client
5. **Real-time**: Open app in multiple browser tabs to see live updates

## 📞 Need Help?

1. Check documentation files
2. Review code comments
3. Check backend logs for errors
4. Check browser console for frontend errors
5. Verify environment variables are set

## 🎉 Enjoy!

You now have a complete, production-ready Task Manager application!

**What's next?**
- ✅ Explore all features
- ✅ Customize to your needs
- ✅ Add your own features
- ✅ Deploy to production
- ✅ Show it to the world!

---

**Happy Coding! 🚀**

*Built with ❤️ using React, Node.js, and MongoDB*
