# 🚀 Task Manager - Production Deployment Scripts

## Quick Deploy Commands

### 1. Deploy Frontend to Vercel
```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Build locally to test
npm run build

# Deploy to Vercel
vercel --prod
```

### 2. Deploy Backend to Railway
```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Test locally
npm start

# Deploy to Railway
railway login
railway init
railway up
```

### 3. Deploy Backend to Render
```bash
# Push to GitHub first
git add .
git commit -m "Deploy to production"
git push origin main

# Then go to Render Dashboard and connect your repo
# Or use Render CLI:
render deploy
```

---

## Environment Setup Script

### Generate Secure Secrets
```bash
# Generate JWT Secret
openssl rand -base64 32

# Generate Refresh Token Secret
openssl rand -base64 32

# Copy these to your .env.production file
```

### Create Gmail App Password
1. Go to: https://myaccount.google.com/apppasswords
2. Create new app password
3. Copy to EMAIL_PASSWORD env variable

---

## Health Check Commands

### Test Backend API
```bash
# Replace with your actual backend URL
curl https://your-backend.railway.app/api/health

# Expected response:
# {"success":true,"message":"Server is running","timestamp":"..."}
```

### Test Frontend Build
```bash
cd frontend
npm run build
npm run preview
# Visit http://localhost:4173
```

---

## Database Setup

### MongoDB Atlas IP Whitelist
```bash
# For cloud deployments, whitelist all IPs:
# Go to MongoDB Atlas → Network Access → Add IP Address
# Add: 0.0.0.0/0 (Allow access from anywhere)
```

---

## Rollback Commands

### Rollback Frontend (Vercel)
```bash
# List deployments
vercel ls

# Promote a previous deployment
vercel promote <deployment-url>
```

### Rollback Backend (Railway)
```bash
# View deployments
railway logs

# Rollback to previous version in Railway Dashboard
```

---

## Monitoring Commands

### View Real-time Logs

**Railway:**
```bash
railway logs --follow
```

**Render:**
```bash
# View in dashboard or use CLI:
render logs -f
```

**Vercel:**
```bash
vercel logs --follow
```

---

## Quick Fixes

### Clear Cache and Redeploy
```bash
# Vercel
cd frontend
vercel --force

# Railway
cd backend
railway up --force
```

### Update Environment Variables
```bash
# Railway
railway variables set KEY=VALUE

# Vercel
vercel env add KEY production
# Then enter the value
```

---

## Pre-Deployment Checklist Script

Save as `pre-deploy-check.sh`:

```bash
#!/bin/bash

echo "🔍 Pre-Deployment Checklist"
echo "=========================="
echo ""

# Check if .env.production exists
if [ -f "frontend/.env.production" ]; then
    echo "✅ Frontend .env.production exists"
else
    echo "❌ Frontend .env.production missing!"
fi

if [ -f "backend/.env.production" ]; then
    echo "✅ Backend .env.production exists"
else
    echo "❌ Backend .env.production missing!"
fi

# Check if node_modules exist
if [ -d "frontend/node_modules" ]; then
    echo "✅ Frontend dependencies installed"
else
    echo "❌ Run: cd frontend && npm install"
fi

if [ -d "backend/node_modules" ]; then
    echo "✅ Backend dependencies installed"
else
    echo "❌ Run: cd backend && npm install"
fi

# Test frontend build
echo ""
echo "Testing frontend build..."
cd frontend
npm run build > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Frontend builds successfully"
else
    echo "❌ Frontend build failed!"
fi

cd ..

echo ""
echo "=========================="
echo "Review complete!"
```

Run with:
```bash
chmod +x pre-deploy-check.sh
./pre-deploy-check.sh
```

---

## Post-Deployment Test Script

Save as `test-deployment.sh`:

```bash
#!/bin/bash

# Update these with your actual URLs
BACKEND_URL="https://your-backend.railway.app"
FRONTEND_URL="https://your-app.vercel.app"

echo "🧪 Testing Deployment"
echo "===================="
echo ""

# Test backend health
echo "Testing backend health..."
response=$(curl -s -o /dev/null -w "%{http_code}" $BACKEND_URL/api/health)

if [ $response -eq 200 ]; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed (HTTP $response)"
fi

# Test frontend
echo "Testing frontend..."
response=$(curl -s -o /dev/null -w "%{http_code}" $FRONTEND_URL)

if [ $response -eq 200 ]; then
    echo "✅ Frontend is accessible"
else
    echo "❌ Frontend not accessible (HTTP $response)"
fi

echo ""
echo "===================="
echo "Tests complete!"
```

Run with:
```bash
chmod +x test-deployment.sh
./test-deployment.sh
```

---

## Emergency Shutdown

### Stop Backend (Railway)
```bash
railway down
```

### Delete Vercel Deployment
```bash
vercel rm <deployment-name>
```

---

## Backup Commands

### Backup MongoDB
```bash
# Install MongoDB tools
# Then run:
mongodump --uri="your_mongodb_uri" --out=./backup-$(date +%Y%m%d)
```

### Backup Environment Variables
```bash
# Export from Railway
railway variables > backup-env-railway.txt

# Export from Vercel
vercel env pull .env.vercel.backup
```

---

## CI/CD Pipeline (GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Deploy to Vercel
        run: |
          cd frontend
          npm install
          npx vercel --prod --token=${{ secrets.VERCEL_TOKEN }}

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Railway
        run: |
          cd backend
          npx @railway/cli deploy --token=${{ secrets.RAILWAY_TOKEN }}
```

---

**Last Updated:** February 2026
