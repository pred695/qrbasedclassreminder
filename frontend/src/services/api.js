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

// Track whether a token refresh is in progress to avoid multiple simultaneous refreshes
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor with automatic token refresh on 401
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // If we get a 401 and it's not a refresh/login/logout request, try to refresh the token
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/api/admin/refresh') &&
      !originalRequest.url?.includes('/api/admin/login') &&
      !originalRequest.url?.includes('/api/admin/logout')
    ) {
      if (isRefreshing) {
        // Queue subsequent requests while refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axios.post(
          `${API_BASE_URL}/api/admin/refresh`,
          {},
          { withCredentials: true }
        );
        processQueue(null);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        // Refresh failed - clear auth state and redirect to login
        const { default: useAuthStore } = await import('@store/authStore');
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

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
