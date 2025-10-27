import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken } = response.data;
          localStorage.setItem('accessToken', accessToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  getCurrentUser: () => api.get('/auth/me'),
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
};

// Users
export const usersApi = {
  list: () => api.get('/users'),
  get: (id: string) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.patch(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
  bulkImport: (users: any[]) => api.post('/users/bulk-import', { users }),
};

// Devices
export const devicesApi = {
  list: () => api.get('/devices'),
  get: (id: string) => api.get(`/devices/${id}`),
  register: (data: any) => api.post('/devices/register', data),
  pair: (id: string) => api.post(`/devices/${id}/pair`),
  verifyPairing: (id: string, pairingToken: string) =>
    api.post(`/devices/${id}/verify-pairing`, { pairing_token: pairingToken }),
  deprovision: (id: string) => api.post(`/devices/${id}/deprovision`),
  delete: (id: string) => api.delete(`/devices/${id}`),
};

// Sessions
export const sessionsApi = {
  list: () => api.get('/sessions'),
  get: (id: string) => api.get(`/sessions/${id}`),
  create: (data: any) => api.post('/sessions/create', data),
  terminate: (id: string) => api.post(`/sessions/${id}/terminate`),
  cleanup: () => api.post('/sessions/cleanup'),
};

// Audit Logs
export const auditLogsApi = {
  list: (limit?: number, offset?: number) =>
    api.get('/audit-logs', { params: { limit, offset } }),
  listByUser: (userId: string, limit?: number) =>
    api.get(`/audit-logs/user/${userId}`, { params: { limit } }),
  listByResourceType: (resourceType: string, limit?: number) =>
    api.get(`/audit-logs/resource/${resourceType}`, { params: { limit } }),
};
