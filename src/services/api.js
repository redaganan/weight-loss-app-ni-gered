import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('weightlossUserId');
      localStorage.removeItem('userAccountId');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export const getStoredUserId = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('weightlossUserId') || localStorage.getItem('userAccountId') || null;
};

export const storeUserSession = (userId, profile) => {
  if (typeof window === 'undefined') return;
  if (userId) {
    localStorage.setItem('weightlossUserId', userId);
    localStorage.setItem('userAccountId', userId);
  }
  if (profile) {
    localStorage.setItem('userPlanData', JSON.stringify(profile));
  }
};
