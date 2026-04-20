import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const publicApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

publicApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('publicToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

publicApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('publicToken');
      localStorage.removeItem('publicUser');

      const path = window.location.pathname;
      if (path !== '/user/login' && path !== '/user/signup' && path !== '/user/emergency') {
        window.location.href = '/user/login';
      }
    }
    return Promise.reject(error);
  }
);

export default publicApi;
