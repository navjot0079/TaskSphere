# Quick Setup Guide

## Prerequisites
- Node.js v18 or higher
- MongoDB (local installation or MongoDB Atlas account)
- Git
- A code editor (VS Code recommended)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
# From the root directory
npm run install-all
```

This command will install dependencies for:
- Root project
- Backend
- Frontend

### 2. Setup MongoDB

**Option A: Local MongoDB**
- Install MongoDB Community Edition
- Start MongoDB service:
  ```bash
  # Windows
  net start MongoDB
  
  # Mac/Linux
  sudo systemctl start mongod
  ```

**Option B: MongoDB Atlas (Cloud)**
- Create a free account at https://www.mongodb.com/cloud/atlas
- Create a new cluster
- Get your connection string
- Whitelist your IP address

### 3. Configure Environment Variables

**Backend (.env)**

Create `backend/.env` file:

```env
# Server
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/task-manager
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/task-manager

# JWT
JWT_SECRET=your_very_long_and_random_secret_key_here_min_32_characters
JWT_REFRESH_SECRET=another_very_long_and_random_secret_key_here_min_32_characters
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Email (Gmail Setup)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-digit-app-password
EMAIL_FROM=Task Manager <noreply@taskmanager.com>

# URLs
CLIENT_URL=http://localhost:5173

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
```

**Frontend (.env)**

Create `frontend/.env` file:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### 4. Gmail App Password Setup (for Email Verification)

1. Go to your Google Account settings
2. Enable 2-Factor Authentication
3. Go to Security → App Passwords
4. Generate a new app password for "Mail"
5. Copy the 16-digit password
6. Use this password in `EMAIL_PASSWORD` in backend `.env`

### 5. Seed the Database (Optional but Recommended)

```bash
cd backend
npm run seed
```

This will create:
- 4 test users (Admin, Manager, 2 Users)
- 3 sample projects
- 10 sample tasks

**Test Credentials:**
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

### 6. Start the Application

**Development Mode (Both servers simultaneously):**
```bash
# From root directory
npm run dev
```

This starts:
- Backend API: http://localhost:5000
- Frontend: http://localhost:5173

**Or start them separately:**

```bash
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm run client
```

### 7. Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

Login with one of the test accounts or register a new account.

## Common Issues & Solutions

### Issue: MongoDB Connection Error

**Solution:**
- Check if MongoDB is running
- Verify MONGODB_URI is correct
- Check network connection (for Atlas)
- Whitelist IP in Atlas

### Issue: Email Not Sending

**Solution:**
- Verify Gmail app password
- Check 2FA is enabled
- Ensure EMAIL_USER and EMAIL_PASSWORD are correct
- Check spam folder

### Issue: CORS Errors

**Solution:**
- Ensure CLIENT_URL in backend .env matches frontend URL
- Check backend CORS configuration

### Issue: Port Already in Use

**Solution:**
- Change PORT in backend .env
- Or kill the process using the port:
  ```bash
  # Windows
  netstat -ano | findstr :5000
  taskkill /PID <PID> /F
  
  # Mac/Linux
  lsof -ti:5000 | xargs kill -9
  ```

### Issue: npm install fails

**Solution:**
- Clear npm cache: `npm cache clean --force`
- Delete node_modules and package-lock.json
- Run `npm install` again
- Ensure Node.js version is 18+

## Project Structure Overview

```
Task_Manager/
├── backend/               # Node.js/Express backend
│   ├── config/           # Database, email config
│   ├── controllers/      # Route controllers
│   ├── middleware/       # Auth, validation, error handling
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   ├── utils/           # Utilities, helpers
│   ├── uploads/         # Uploaded files
│   ├── .env            # Environment variables (create this)
│   └── server.js       # Entry point
│
├── frontend/             # React frontend
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/      # Page components
│   │   ├── context/    # React Context
│   │   ├── services/   # API services
│   │   ├── utils/      # Helper functions
│   │   └── App.jsx     # Root component
│   ├── .env           # Environment variables (create this)
│   └── vite.config.js # Vite configuration
│
└── package.json        # Root package.json
```

## Next Steps

1. **Explore Features**
   - Create tasks and projects
   - Try the chat feature
   - Upload files
   - Test notifications
   - Switch between light/dark themes

2. **Customize**
   - Update branding and colors in `tailwind.config.js`
   - Modify email templates in `backend/utils/email.js`
   - Add custom features as needed

3. **Deploy**
   - Follow deployment guides for your platform
   - Update environment variables for production
   - Setup production database
   - Configure domain and SSL

## Support

If you encounter any issues:
1. Check the README.md for detailed documentation
2. Review backend logs in the terminal
3. Check browser console for frontend errors
4. Ensure all environment variables are set correctly

## Development Tips

- Use the React DevTools browser extension
- Enable MongoDB logging for debugging
- Use Postman/Thunder Client to test APIs
- Check network tab for API calls
- Use VS Code REST Client extension for API testing

---

🎉 **You're all set! Happy coding!**
