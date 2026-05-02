# Innovex Techno - Deployment Guide for Render

## Project Structure
- **Frontend**: React + Vite application
- **Backend**: Node.js Express server with MongoDB integration
- **render.yaml**: Render deployment configuration

## Prerequisites
- MongoDB Atlas account with connection string
- Render account (render.com)
- GitHub token (optional, for private repos)

## Environment Variables

### Backend (.env)
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority
ADMIN_PANEL_PASSWORD=your_admin_password
GITHUB_ACCESS_TOKEN=your_github_token (optional)
PORT=3000
NODE_ENV=production
```

## Deployment Steps

### 1. Prepare for Deployment
1. Push all code to GitHub
2. Ensure `.env` file is in `.gitignore` (already configured)
3. Verify `render.yaml` is in the root directory

### 2. Create Services on Render

#### Option A: Using render.yaml (Recommended)
1. Go to render.com and sign in
2. Click "New +" → "Blueprint"
3. Connect your GitHub repository
4. Select the repository and branch
5. Render will auto-detect `render.yaml`
6. Add required environment variables:
   - `MONGO_URI`: Your MongoDB Atlas connection string
   - `ADMIN_PANEL_PASSWORD`: Admin password for the dashboard
   - `GITHUB_ACCESS_TOKEN`: (Optional) GitHub token for private repos

#### Option B: Manual Service Setup
Create two web services:

**Frontend Service:**
- Name: `innovex-techno-frontend`
- Runtime: Node
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Environment: Node 24

**Backend Service:**
- Name: `innovex-techno-backend`
- Runtime: Node
- Build Command: `npm install`
- Start Command: `npm start`
- Environment: Node 24
- Environment Variables:
  - `MONGO_URI`: Your MongoDB Atlas connection string
  - `ADMIN_PANEL_PASSWORD`: Admin password
  - `GITHUB_ACCESS_TOKEN`: (Optional)
  - `NODE_ENV`: production

### 3. Configure MongoDB Atlas
1. Go to MongoDB Atlas
2. Create a network access for Render's IP or allow 0.0.0.0/0 (not recommended for production)
3. Create a database user with strong password
4. Copy the connection string and add to Render environment variables

### 4. Deploy
1. Commit all changes to GitHub
2. Push to your deployment branch
3. Render will automatically detect changes and redeploy

## URLs After Deployment
- **Frontend**: `https://innovex-techno-frontend.onrender.com`
- **Backend**: `https://innovex-techno-backend.onrender.com`
- **Backend API**: `https://innovex-techno-backend.onrender.com/api/site-content`

## Backend Endpoints

### Public Endpoints
- `GET /` - Server status
- `GET /api/site-content` - Get site content and projects
- `GET /api/github/projects` - Get GitHub projects
- `GET /api/realtime/overview` - Get real-time dashboard data
- `POST /api/analytics/view` - Track page views

### Admin Endpoints (Protected)
- `POST /api/admin/login` - Admin login (returns token)
- `GET /api/admin/dashboard` - Admin dashboard data
- `POST /api/admin/github/sync` - Sync GitHub repositories
- `PUT /api/admin/site-content` - Update site content

### Auth Endpoints
- `POST /login` - User login
- `POST /signin` - User registration

## Troubleshooting

### Build Failures
- Check `npm install` completes without errors
- Verify Node version is 24+
- Check for syntax errors in code

### Runtime Errors
- Check environment variables are set correctly
- Verify MongoDB connection string
- Check logs in Render dashboard

### Frontend Not Loading
- Ensure build completes (`npm run build`)
- Check CORS settings in Backend
- Verify API endpoints in Frontend code

### Backend Connection Issues
- Verify MongoDB Atlas network access
- Check connection string format
- Ensure MONGO_URI includes all parameters

## Local Development

### Backend
```bash
cd Backend
npm install
npm run dev
```

### Frontend
```bash
cd Frontend
npm install
npm run dev
```

## Important Notes
1. Never commit `.env` file to GitHub
2. Use strong passwords for admin panel
3. Enable IP whitelisting for MongoDB in production
4. Keep GitHub tokens secure and rotate periodically
5. Monitor Render logs for errors
6. Set up monitoring/alerts for uptime

## Support
For issues, check:
- Render documentation: render.com/docs
- MongoDB documentation: mongodb.com/docs
- Express documentation: expressjs.com
- React/Vite documentation: vitejs.dev
