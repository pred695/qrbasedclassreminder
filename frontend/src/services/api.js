import axios from 'axios';

// In production, use relative URLs (proxied through Vercel rewrites)
// In development, use the local backend URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const errorResponse = {
      message: error.response?.data?.error?.message || error.message || 'An error occurred',
      code: error.response?.data?.error?.code || error.code,
      status: error.response?.status,
      data: error.response?.data,
    };

    console.error('API Error:', errorResponse);
    return Promise.reject(errorResponse);
  }
);

export default apiClient;
