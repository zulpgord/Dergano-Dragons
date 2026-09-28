import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Il backend viene sospeso dopo pochi minuti di inattività: il primo accesso
// dopo una pausa richiede ~30-60s di riavvio, durante i quali le richieste
// vanno in timeout o rispondono 502/503. Ritentiamo solo le GET: ripetere una
// POST creerebbe iscrizioni doppie.
const MAX_RETRIES = 3;
const WAKE_UP_STATUS = [502, 503, 504];

api.interceptors.response.use(undefined, async (error) => {
  const config = error.config;
  if (!config || config.method !== 'get') return Promise.reject(error);

  const serverAsleep = !error.response || WAKE_UP_STATUS.includes(error.response.status);
  if (!serverAsleep) return Promise.reject(error);

  config.__retryCount = (config.__retryCount || 0) + 1;
  if (config.__retryCount > MAX_RETRIES) return Promise.reject(error);

  await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** (config.__retryCount - 1)));
  return api(config);
});

// Auth endpoints
export const authAPI = {
  register: (email, password, name, privacyAccepted) =>
    api.post('/auth/register', { email, password, name, privacy_accepted: privacyAccepted }),
  login: (email, password) =>
    api.post('/auth/login', { email, password }),
  resetPassword: (email, newPassword) =>
    api.post('/auth/reset-password', { email, newPassword }),
  deleteMyAccount: () =>
    api.delete('/auth/me'),
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
  assignShift: (shiftId, seats = 1, hoursVolunteered = null) =>
    api.post('/assignments', { shift_id: shiftId, seats, hours_volunteered: hoursVolunteered }),
  adminAssignUser: (shiftId, userId, seats = 1) =>
    api.post(`/assignments/admin/${shiftId}`, { user_id: userId, seats }),
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
  updateUserName: (id, name) =>
    api.put(`/admin/users/${id}/name`, { name }),
  getStats: (params = {}) =>
    api.get('/admin/stats', { params }),
  getShiftStats: (params = {}) =>
    api.get('/admin/shift-stats', { params }),
  fixFutureShifts: () =>
    api.post('/admin/fix-shifts'),
};

// Groups endpoints
export const groupsAPI = {
  getGroups: () =>
    api.get('/groups'),
  createGroup: (name) =>
    api.post('/groups', { name }),
  deleteGroup: (id) =>
    api.delete(`/groups/${id}`),
  setMembers: (id, userIds) =>
    api.put(`/groups/${id}/members`, { user_ids: userIds }),
  sendEmail: (id, subject, message) =>
    api.post(`/groups/${id}/email`, { subject, message }),
};

// Contenuti editabili (es. informativa privacy)
export const contentAPI = {
  get: (key) =>
    api.get(`/content/${key}`),
  update: (key, content) =>
    api.put(`/content/${key}`, { content }),
};

// Schede personaggio (pagina /personaggi)
export const sheetsAPI = {
  getSheets: () =>
    api.get('/sheets'),
  download: (slug) =>
    api.get(`/sheets/${slug}/download`),
  update: (id, campi) =>
    api.put(`/sheets/${id}`, campi),
  setGroups: (id, groupIds) =>
    api.put(`/sheets/${id}/groups`, { group_ids: groupIds }),
  setUsers: (id, userIds) =>
    api.put(`/sheets/${id}/users`, { user_ids: userIds }),
  bulkVisibility: (ids, visibleToAll) =>
    api.post('/sheets/bulk-visibility', { ids, visible_to_all: visibleToAll }),
};

export default api;
