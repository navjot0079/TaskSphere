# 🚀 DEPLOYMENT GUIDE - Task Manager

## 📋 Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
4. [Backend Deployment (Railway/Render)](#backend-deployment-railway-render)
5. [Environment Variables](#environment-variables)
6. [Post-Deployment Testing](#post-deployment-testing)
7. [Troubleshooting](#troubleshooting)

---

## 🏗 Architecture Overview

```
┌─────────────────┐
│  Frontend (SPA) │  ← Deployed on Vercel
│  React + Vite   │
└────────┬────────┘
         │ HTTPS/WSS
         ↓
┌─────────────────┐
│  Backend (API)  │  ← Deployed on Railway/Render
│  Express + WS   │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  MongoDB Atlas  │  ← Cloud Database
└─────────────────┘
```

**Why this architecture?**
- ✅ Vercel is optimized for React/Vite frontends
- ✅ Railway/Render support WebSocket (Socket.IO)
- ✅ MongoDB Atlas is already cloud-ready

---

## ✅ Prerequisites

### 1. Accounts Required
- [x] **Vercel Account** (https://vercel.com/signup)
- [x] **Railway Account** (https://railway.app/) OR **Render Account** (https://render.com/)
- [x] **MongoDB Atlas** (Already configured)
- [x] **GitHub Account** (for deployments)

### 2. Required Tools
```bash
# Install Vercel CLI globally
npm install -g vercel

# Install Railway CLI (if using Railway)
npm install -g @railway/cli
```

### 3. Update Your Secrets
Before deploying, change these in `.env.production`:
- `JWT_SECRET` - Generate with: `openssl rand -base64 32`
- `JWT_REFRESH_SECRET` - Generate with: `openssl rand -base64 32`
- Email credentials (use App Password for Gmail)

---

## 🎨 Frontend Deployment (Vercel)

### Option 1: Deploy via Vercel CLI (Recommended)

```bash
# Navigate to frontend directory
cd frontend

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

### Option 2: Deploy via GitHub (Continuous Deployment)

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Connect to Vercel:**
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Select `frontend` as the root directory
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Output directory: `dist`

3. **Set Environment Variables in Vercel Dashboard:**
   ```
   VITE_API_URL=https://your-backend-url.railway.app/api
   VITE_SOCKET_URL=https://your-backend-url.railway.app
   ```
   
   ⚠️ **Important:** You'll add the backend URL after deploying the backend!

4. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete
   - Note your Vercel URL: `https://your-app.vercel.app`

---

## 🚂 Backend Deployment (Railway - RECOMMENDED)

### Why Railway?
- ✅ WebSocket support out of the box
- ✅ Free tier available
- ✅ Persistent storage
- ✅ Automatic HTTPS

### Deployment Steps:

1. **Create Railway Account:**
   - Visit https://railway.app/
   - Sign up with GitHub

2. **Deploy Backend:**
   ```bash
   # Navigate to backend directory
   cd backend

   # Install Railway CLI
   npm install -g @railway/cli

   # Login to Railway
   railway login

   # Initialize project
   railway init

   # Deploy
   railway up
   ```

3. **Set Environment Variables:**
   Go to Railway Dashboard → Your Project → Variables:
   ```bash
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=your_mongodb_atlas_uri
   JWT_SECRET=your_generated_secret
   JWT_REFRESH_SECRET=your_generated_refresh_secret
   JWT_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASSWORD=your_app_password
   EMAIL_FROM=TaskManager <noreply@taskmanager.com>
   ADMIN_EMAIL=admin@example.com
   FRONTEND_URL=https://your-app.vercel.app
   MAX_FILE_SIZE=10485760
   UPLOAD_PATH=./uploads
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

4. **Get Your Backend URL:**
   - Railway will provide a URL like: `https://your-app.up.railway.app`
   - Copy this URL!

5. **Update Frontend Environment Variables:**
   - Go back to Vercel Dashboard
   - Update env variables:
     ```
     VITE_API_URL=https://your-app.up.railway.app/api
     VITE_SOCKET_URL=https://your-app.up.railway.app
     ```
   - Redeploy frontend: `vercel --prod`

---

## 🎯 Alternative: Backend Deployment (Render)

### Deployment Steps:

1. **Create Render Account:**
   - Visit https://render.com/
   - Sign up with GitHub

2. **Create New Web Service:**
   - Click "New +"
   - Select "Web Service"
   - Connect your GitHub repository
   - Root directory: `backend`
   - Build command: `npm install`
   - Start command: `npm start`

3. **Set Environment Variables:**
   Same as Railway (see above)

4. **Deploy:**
   - Click "Create Web Service"
   - Wait for deployment
   - Note your Render URL: `https://your-app.onrender.com`

---

## 🔐 Environment Variables Reference

### Frontend (.env.production)
```bash
VITE_API_URL=https://your-backend-url/api
VITE_SOCKET_URL=https://your-backend-url
```

### Backend (Production)
```bash
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<generated-secret>
JWT_REFRESH_SECRET=<generated-secret>
FRONTEND_URL=https://your-app.vercel.app
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=<app-password>
# ... (see full list above)
```

---

## 🧪 Post-Deployment Testing

### 1. Test Backend API
```bash
# Health check
curl https://your-backend-url.railway.app/api/health

# Should return:
{
  "success": true,
  "message": "Server is running",
  "timestamp": "..."
}
```

### 2. Test Frontend
1. Visit: `https://your-app.vercel.app`
2. Try to register a new account
3. Check email for OTP
4. Login and test features

### 3. Test WebSocket Connection
1. Open browser console
2. Look for: `✅ Socket connected`
3. Test real-time chat

### 4. Test Features Checklist
- [ ] User registration with OTP
- [ ] User login
- [ ] Create task
- [ ] Create project
- [ ] Real-time chat
- [ ] Real-time notifications
- [ ] File upload
- [ ] Admin panel (if admin)

---

## 🐛 Troubleshooting

### Issue: Frontend can't connect to backend
**Solution:**
- Check CORS settings in backend
- Verify `FRONTEND_URL` in backend env variables
- Ensure backend is running

### Issue: WebSocket connection fails
**Solution:**
- Check `VITE_SOCKET_URL` in frontend env
- Ensure backend supports WebSocket (Railway/Render do)
- Check browser console for errors

### Issue: Database connection failed
**Solution:**
- Verify `MONGODB_URI` is correct
- Check MongoDB Atlas IP whitelist (allow 0.0.0.0/0 for cloud deployments)
- Ensure database user has proper permissions

### Issue: Email not sending
**Solution:**
- Use Gmail App Password (not regular password)
- Generate at: https://myaccount.google.com/apppasswords
- Enable 2FA first

### Issue: Build fails on Vercel
**Solution:**
```bash
# Clear cache and rebuild
vercel --force

# Check build logs for specific errors
```

### Issue: "Module not found" errors
**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## 📊 Monitoring & Logs

### View Backend Logs
**Railway:**
```bash
railway logs
```

**Render:**
- Go to Dashboard → Your Service → Logs

### View Frontend Errors
- Vercel Dashboard → Your Project → Deployments → View Logs

---

## 🔄 Continuous Deployment

Once connected to GitHub:
1. Push to `main` branch
2. Vercel auto-deploys frontend
3. Railway/Render auto-deploys backend

```bash
git add .
git commit -m "Update feature"
git push origin main
```

---

## 📝 Important Notes

1. **File Uploads:** Currently stored locally. For production, integrate:
   - Cloudinary (images)
   - AWS S3 (any files)

2. **Database Backups:** Set up automated backups in MongoDB Atlas

3. **Monitoring:** Add error tracking:
   - Sentry (recommended)
   - LogRocket

4. **Performance:** Add CDN for static assets

5. **Security:** 
   - Never commit `.env` files
   - Use strong JWT secrets
   - Keep dependencies updated

---

## 🎉 You're Done!

Your Task Manager is now live at:
- **Frontend:** `https://your-app.vercel.app`
- **Backend:** `https://your-backend-url.railway.app`

---

## 💡 Next Steps

1. Set up custom domain
2. Configure email DNS (SPF, DKIM)
3. Add SSL certificate (automatic with Vercel/Railway)
4. Set up monitoring and alerts
5. Create backup strategy

---

## 📞 Support

If you encounter issues:
1. Check logs first
2. Review environment variables
3. Test API endpoints manually
4. Check network tab in browser DevTools

---

**Last Updated:** February 2026
