// API Configuration
// Automatically detects backend URL based on environment.
// On Vercel, set VITE_API_BASE_URL in Project Settings → Environment Variables (production).

const PRODUCTION_API = 'https://innovexa-techno-1.onrender.com';

const getApiBaseUrl = () => {
  const fromEnv = import.meta.env.VITE_API_BASE_URL;
  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    return fromEnv.replace(/\/$/, '');
  }

  if (typeof window === 'undefined') {
    return 'http://localhost:3000';
  }

  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('192.168');

  if (isLocalhost) {
    return 'http://localhost:3000';
  }

  if (hostname.includes('onrender.com')) {
    return PRODUCTION_API;
  }

  if (hostname.endsWith('vercel.app') || hostname.includes('.vercel.app')) {
    return PRODUCTION_API;
  }

  return PRODUCTION_API;
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
