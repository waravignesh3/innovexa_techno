# Innovexa Techno - Portfolio Website

A full-stack portfolio website showcasing projects from GitHub repositories with real-time analytics and admin dashboard.

## 🚀 Features

- **GitHub Integration**: Automatically import projects from GitHub
- **Real-time Dashboard**: Live project statistics and analytics
- **Admin Panel**: Manage site content and GitHub synchronization
- **Responsive Design**: Built with React and Material-UI
- **MongoDB Integration**: Store project metadata and user data
- **Analytics Tracking**: Track visitor engagement

## 📋 Tech Stack

### Frontend
- React 19
- Vite (Build tool)
- Material-UI (UI Components)
- React Router (Navigation)
- Firebase (Analytics)

### Backend
- Node.js with Express
- MongoDB with Mongoose
- CORS enabled
- RESTful API

## 🛠️ Setup

### Prerequisites
- Node.js 24+
- MongoDB (Local or Atlas)
- GitHub account

### Installation

1. **Clone Repository**
```bash
git clone https://github.com/waravignesh3/innovexa-techno.git
cd innovexa-techno
```

2. **Backend Setup**
```bash
cd Backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and other settings
npm run dev
```

3. **Frontend Setup**
```bash
cd Frontend
npm install
npm run dev
```

### Environment Variables

Create `.env` in Backend directory:
```
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/dbname
ADMIN_PANEL_PASSWORD=your_admin_password
GITHUB_ACCESS_TOKEN=your_github_token (optional)
PORT=3000
NODE_ENV=development
```

## 📝 Available Scripts

### Backend
- `npm run dev` - Start development server
- `npm start` - Start production server

### Frontend
- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm start` - Serve production build

## 🌐 API Endpoints

### Public
- `GET /api/site-content` - Site content and projects
- `GET /api/github/projects` - GitHub projects list
- `GET /api/realtime/overview` - Dashboard overview

### Admin (Requires Authentication)
- `POST /api/admin/login` - Get admin token
- `GET /api/admin/dashboard` - Admin dashboard
- `POST /api/admin/github/sync` - Sync GitHub
- `PUT /api/admin/site-content` - Update content

## 🚀 Deployment

### Deploy to Render

1. Push to GitHub
2. Go to render.com
3. Create new Blueprint service
4. Connect your repository
5. Add environment variables
6. Deploy!

For detailed instructions, see [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md)

## 📊 Dashboard Features

- View all projects from GitHub
- Track real-time visitor analytics
- Manage GitHub sync settings
- Edit site content (home, about, contact, services)
- Monitor project status and progress

## 🔐 Security

- Admin authentication with tokens
- Environment variables for sensitive data
- CORS configuration
- Rate limiting on GitHub API calls

## 📄 License

ISC

## 👥 Authors

- Vigneshwara S
- Madhan Sankar

## 📧 Contact

- Email: innovexa.techno@gmail.com
- GitHub: @waravignesh3

---

**Ready to deploy? Check out [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) for step-by-step instructions.**
