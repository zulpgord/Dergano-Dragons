import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth endpoints
export const authAPI = {
  register: (email, password, name) =>
    api.post('/auth/register', { email, password, name }),
  login: (email, password) =>
    api.post('/auth/login', { email, password }),
  resetPassword: (email, newPassword) =>
    api.post('/auth/reset-password', { email, newPassword }),
};

// Shifts endpoints
export const shiftsAPI = {
  getShifts: (params = {}) =>
    api.get('/shifts', { params }),
  createShift: (shiftData) =>
    api.post('/shifts', shiftData),
  updateShift: (id, data) =>
    api.put(`/shifts/${id}`, data),
  cancelShift: (id) =>
    api.patch(`/shifts/${id}/cancel`),
  deleteShift: (id) =>
    api.delete(`/shifts/${id}`),
};

// Assignments endpoints
export const assignmentsAPI = {
  assignShift: (shiftId, hoursVolunteered = null) =>
    api.post('/assignments', { shift_id: shiftId, hours_volunteered: hoursVolunteered }),
  cancelAssignment: (id) =>
    api.delete(`/assignments/${id}`),
  getUserAssignments: () =>
    api.get('/assignments'),
};

// Locations endpoints
export const locationsAPI = {
  getLocations: () =>
    api.get('/locations'),
  createLocation: (data) =>
    api.post('/locations', data),
  updateLocation: (id, data) =>
    api.put(`/locations/${id}`, data),
};

// Admin endpoints
export const adminAPI = {
  getUsers: () =>
    api.get('/admin/users'),
  updateUserRole: (id, role) =>
    api.put(`/admin/users/${id}/role`, { role }),
  getStats: (params = {}) =>
    api.get('/admin/stats', { params }),
  getShiftStats: (params = {}) =>
    api.get('/admin/shift-stats', { params }),
  fixFutureShifts: () =>
    api.post('/admin/fix-shifts'),
};

export default api;
