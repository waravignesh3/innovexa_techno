# Deployment Checklist for Render

## ✅ Pre-Deployment Tasks

### 1. Code Quality
- [ ] All code committed to GitHub
- [ ] No console errors in frontend (`npm run lint`)
- [ ] Backend starts without errors
- [ ] No hardcoded secrets in code

### 2. Environment Configuration
- [ ] .env file created with all required variables:
  - [ ] MONGO_URI (MongoDB Atlas connection string)
  - [ ] ADMIN_PANEL_PASSWORD (strong password)
  - [ ] GITHUB_ACCESS_TOKEN (optional, for private repos)
  - [ ] PORT (3000)
  - [ ] NODE_ENV (production)
- [ ] .env file is in .gitignore
- [ ] .env.example created with template

### 3. Dependencies
- [ ] `npm install` runs successfully in Backend
- [ ] `npm install` runs successfully in Frontend
- [ ] No peer dependency warnings
- [ ] All imports resolve correctly

### 4. Build Configuration
- [ ] Frontend: `npm run build` completes successfully
- [ ] Frontend dist/ folder contains index.html
- [ ] Backend: No build step needed (uses node server.js directly)
- [ ] render.yaml configured correctly with both services

### 5. MongoDB Setup
- [ ] MongoDB Atlas cluster created
- [ ] Database user created with secure password
- [ ] Network Access configured (allow Render IPs or 0.0.0.0/0)
- [ ] Connection string format: `mongodb+srv://username:password@cluster...`

### 6. GitHub Configuration
- [ ] Repository is public or team has access
- [ ] Main branch is protected if needed
- [ ] All files committed (no staged changes)
- [ ] Latest code pushed to GitHub

### 7. Render Configuration
- [ ] Account created on render.com
- [ ] render.yaml file in project root
- [ ] Services configuration verified:
  - [ ] Frontend: rootDir=Frontend, startCommand=npm start
  - [ ] Backend: rootDir=Backend, startCommand=npm start
- [ ] Environment variables prepared for Render dashboard

## 🚀 Deployment Steps

### Step 1: Connect Repository to Render
1. Log in to render.com
2. Click "New +" → "Blueprint"
3. Select "Connect" for GitHub
4. Choose repository
5. Choose main/master branch

### Step 2: Verify Configuration
1. Render auto-detects render.yaml
2. Review all services listed
3. Verify build and start commands

### Step 3: Add Environment Variables
For Backend service:
```
MONGO_URI = <your-mongodb-connection-string>
ADMIN_PANEL_PASSWORD = <your-secure-password>
GITHUB_ACCESS_TOKEN = <optional>
PORT = 3000
NODE_ENV = production
```

Frontend doesn't need environment variables.

### Step 4: Deploy
1. Click "Create Blueprint"
2. Wait for both services to build and start
3. Check logs for any errors

### Step 5: Verify Deployment
- [ ] Frontend service shows "Live"
- [ ] Backend service shows "Live"
- [ ] No error messages in logs
- [ ] Visit frontend URL - page loads
- [ ] Test backend API: `https://backend-url.onrender.com/api/site-content`

## 📱 After Deployment

### Testing
- [ ] Frontend loads without 404 errors
- [ ] Can navigate between pages
- [ ] Admin panel is accessible (if applicable)
- [ ] API endpoints respond correctly
- [ ] GitHub projects load

### Monitoring
- [ ] Set up Render notifications for failures
- [ ] Check logs regularly for errors
- [ ] Monitor database connection
- [ ] Test GitHub sync functionality

### Maintenance
- [ ] Update render.yaml if adding services
- [ ] Keep dependencies updated
- [ ] Monitor MongoDB usage/costs
- [ ] Backup important data

## 🆘 Troubleshooting

### Build Fails
- Check Node version requirements
- Verify all dependencies install locally
- Look for syntax errors

### Runtime Errors
- Check environment variables in Render dashboard
- Verify MongoDB Atlas connection
- Check backend logs for API errors

### Frontend Not Loading
- Verify build completes (check dist/ folder)
- Check CORS headers from backend
- Test API endpoint directly

### GitHub Sync Issues
- Verify GitHub owners configuration
- Check GitHub API rate limits
- Verify GitHub token if used

## 📞 Support Resources

- Render Docs: https://render.com/docs
- Express Docs: https://expressjs.com
- React Docs: https://react.dev
- MongoDB Docs: https://docs.mongodb.com
- Vite Docs: https://vitejs.dev

---

**Once all checkboxes are complete, your project is ready to deploy!**
