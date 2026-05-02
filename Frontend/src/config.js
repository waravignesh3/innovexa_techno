// API Configuration
// Automatically detects backend URL based on environment

const getApiBaseUrl = () => {
  // In production, use the same origin (Render serves both frontend and backend)
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    // For Render deployment, backend is at different domain
    const isDevelopment = window.location.hostname.includes('localhost') || 
                         window.location.hostname.includes('127.0.0.1');
    
    if (!isDevelopment) {
      // Extract backend URL from environment or use relative path
      return window.location.origin.replace(/frontend/, 'backend');
    }
  }
  
  // In development, use localhost:3000
  return 'http://localhost:3000';
};

export const API_BASE_URL = getApiBaseUrl();

export const API_ENDPOINTS = {
  siteContent: '/api/site-content',
  gitHubProjects: '/api/github/projects',
  realtimeOverview: '/api/realtime/overview',
  analyticsView: '/api/analytics/view',
  adminLogin: '/api/admin/login',
  adminDashboard: '/api/admin/dashboard',
  adminSiteContent: '/api/admin/site-content',
  adminGithubSync: '/api/admin/github/sync',
};

export default {
  API_BASE_URL,
  API_ENDPOINTS,
};
