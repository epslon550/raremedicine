import axios from 'axios';

const isLocal = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const api = axios.create({
  baseURL: isLocal ? 'http://localhost:5000/api' : (import.meta.env.VITE_API_URL || 'http://localhost:5000/api'),
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to attach JWT token dynamically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
