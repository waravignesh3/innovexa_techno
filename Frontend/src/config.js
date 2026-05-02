// API Configuration
// Automatically detects backend URL based on environment

const getApiBaseUrl = () => {
  // In development, use localhost:3000
  if (typeof window === 'undefined') {
    return 'http://localhost:3000';
  }

  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('192.168');

  if (isLocalhost) {
    // Development environment
    return 'http://localhost:3000';
  }

  // Production on Render - use the actual backend URL
  if (hostname.includes('onrender.com')) {
    return 'https://innovexa-techno-1.onrender.com';
  }

  // Fallback for other production environments
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
