import axios from 'axios';

// Base API URL (proxied by Vite in dev to http://localhost:5000)
const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Attach JWT Bearer Token
api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem('accessToken') ||
      localStorage.getItem('lifedrop_access_token') ||
      localStorage.getItem('bloodlink_access_token') ||
      localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Token Expiration and Refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/refresh-token')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken =
        localStorage.getItem('lifedrop_refresh_token') || localStorage.getItem('bloodlink_refresh_token');

      if (!refreshToken) {
        isRefreshing = false;
        localStorage.removeItem('lifedrop_access_token');
        localStorage.removeItem('lifedrop_refresh_token');
        localStorage.removeItem('lifedrop_user');
        window.dispatchEvent(new Event('auth:unauthorized'));
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_BASE}/v1/auth/refresh-token`, {
          refreshToken,
        });

        const newAccessToken = data.accessToken;
        localStorage.setItem('lifedrop_access_token', newAccessToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        isRefreshing = false;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        localStorage.removeItem('lifedrop_access_token');
        localStorage.removeItem('lifedrop_refresh_token');
        localStorage.removeItem('lifedrop_user');
        window.dispatchEvent(new Event('auth:unauthorized'));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ── 1. AUTH API ──
export const authAPI = {
  login: (credentials) => api.post('/v1/auth/login', credentials),
  register: (userData) => api.post('/v1/auth/register', userData),
  verifyOtp: (payload) => api.post('/v1/auth/verify-otp', payload),
  resendOtp: (payload) => api.post('/v1/auth/resend-otp', payload),
  logout: () => api.post('/v1/auth/logout'),
};

// ── 2. USER PROFILE API (/api/v1/profile) ──
export const profileAPI = {
  getMe: () => api.get('/v1/profile/me'),
  updateMe: (profileData) => api.put('/v1/profile/me', profileData),
  updateAddress: (addressData) => api.put('/v1/profile/address', addressData),
  becomeDonor: (donorData) => api.post('/v1/profile/become-donor', donorData),
  toggleDonor: (isAvailable) => api.put('/v1/profile/donor-toggle', { isAvailable }),
  uploadPhoto: (formData) =>
    api.post('/v1/profile/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// ── 3. DONOR SERVICE API (/api/v1/donor) ──
export const donorAPI = {
  setAvailability: (isAvailable) => api.put('/v1/donor/availability', { isAvailable }),
  getEligibility: () => api.get('/v1/donor/eligibility'),
  getHistory: (params) => api.get('/v1/donor/history', { params }),
  getStats: () => api.get('/v1/donor/dashboard-stats'),
};

// ── 4. GEOSPATIAL SEARCH API (/api/v1/search) ──
export const searchAPI = {
  getDonors: (params) => api.get('/v1/search/donors', { params }),
  getBloodBanks: (params) => api.get('/v1/search/blood-banks', { params }),
  getAvailability: (params) => api.get('/v1/search/availability', { params }),
};

// ── 5. BLOOD REQUESTS API (/api/v1/requests) ──
export const requestAPI = {
  create: (requestData) => api.post('/v1/requests', requestData),
  getMyRequests: (params) => api.get('/v1/requests/my', { params }),
  getById: (id) => api.get(`/v1/requests/${id}`),
  cancel: (id, reason) => api.put(`/v1/requests/${id}/cancel`, { reason }),
  confirmReceived: (id, data) => api.post(`/v1/requests/${id}/confirm-received`, data),
};

// ── 6. EMERGENCY DISPATCH API (/api/v1/emergency) ──
export const emergencyAPI = {
  create: (emergencyData) => api.post('/v1/emergency', emergencyData),
  getNearby: (params) => api.get('/v1/emergency/nearby', { params }),
  respond: (id, response) => api.post(`/v1/emergency/${id}/respond`, { response }),
  getProgress: (id) => api.get(`/v1/emergency/${id}/progress`),
  escalate: (id) => api.post(`/v1/emergency/${id}/escalate`),
};

// ── 7. APPOINTMENTS API (/api/v1/appointments) ──
export const appointmentAPI = {
  getSlots: (bloodBankId, date, maxPerSlot) =>
    api.get('/v1/appointments/slots', { params: { bloodBankId, date, maxPerSlot } }),
  book: (data) => api.post('/v1/appointments', data),
  reschedule: (id, data) => api.put(`/v1/appointments/${id}/reschedule`, data),
  cancel: (id, cancellationReason) => api.put(`/v1/appointments/${id}/cancel`, { cancellationReason }),
  getMy: (params) => api.get('/v1/appointments/my', { params }),
  getBankAppointments: (params) => api.get('/v1/appointments/bank', { params }),
  complete: (id, data) => api.put(`/v1/appointments/${id}/complete`, data),
  noShow: (id) => api.put(`/v1/appointments/${id}/no-show`),
  triggerReminders: () => api.post('/v1/appointments/trigger-reminders'),
};

// ── 8. NOTIFICATIONS API (/api/v1/notifications) ──
export const notificationAPI = {
  getAll: (params) => api.get('/v1/notifications', { params }),
  getUnreadCount: () => api.get('/v1/notifications/unread-count'),
  markAsRead: (id) => api.put(`/v1/notifications/${id}/read`),
  markAllAsRead: () => api.put('/v1/notifications/read-all'),
  delete: (id) => api.delete(`/v1/notifications/${id}`),
};

// ── 9. HOSPITAL API (/api/v1/hospital) ──
export const hospitalAPI = {
  getProfile: () => api.get('/v1/hospital/profile'),
  updateProfile: (data) => api.put('/v1/hospital/profile', data),
  uploadLicense: (formData) =>
    api.post('/v1/hospital/license', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getRequests: (params) => api.get('/v1/hospital/requests', { params }),
  confirmReceived: (id, remarks) =>
    api.post(`/v1/hospital/requests/${id}/confirm-received`, { remarks }),
};

// ── 10. BLOOD BANK API (/api/v1/bloodbank) ──
export const bloodBankAPI = {
  getProfile: () => api.get('/v1/bloodbank/profile'),
  updateProfile: (data) => api.put('/v1/bloodbank/profile', data),
  getInventory: () => api.get('/v1/bloodbank/inventory'),
  updateGroupStock: (group, data) =>
    api.put(`/v1/bloodbank/inventory/${encodeURIComponent(group)}`, data),
  recordDonation: (data) => api.post('/v1/bloodbank/donations', data),
  issueUnits: (data) => api.post('/v1/bloodbank/issue', data),
  getHistory: (params) => api.get('/v1/bloodbank/history', { params }),
};

// ── 11. FEEDBACK & COMPLAINTS API (/api/v1/feedback) ──
export const feedbackAPI = {
  submit: (data) => api.post('/v1/feedback', data),
  getMy: (params) => api.get('/v1/feedback/my', { params }),
  getById: (id) => api.get(`/v1/feedback/${id}`),
  reply: (id, data) => api.post(`/v1/feedback/${id}/reply`, data),
  updateStatus: (id, data) => api.put(`/v1/feedback/${id}/status`, data),
};

// ── 12. ADMIN API (/api/v1/admin) ──
export const adminAPI = {
  // Stats
  getStats: () => api.get('/v1/admin/stats'),

  // Users
  getUsers: (params) => api.get('/v1/admin/users', { params }),
  verifyUser: (id) => api.put(`/v1/admin/users/${id}/verify`),
  blockUser: (id, reason) => api.put(`/v1/admin/users/${id}/block`, { reason }),
  unblockUser: (id) => api.put(`/v1/admin/users/${id}/unblock`),
  deleteUser: (id) => api.delete(`/v1/admin/users/${id}`),

  // Donors
  getDonors: (params) => api.get('/v1/admin/donors', { params }),
  verifyDonor: (id, data) => api.put(`/v1/admin/donors/${id}/verify`, data),
  approveDonor: (id, reason) => api.put(`/v1/admin/donors/${id}/approve`, { reason }),
  rejectDonor: (id, reason) => api.put(`/v1/admin/donors/${id}/reject`, { reason }),
  blockDonor: (id, reason) => api.put(`/v1/admin/donors/${id}/block`, { reason }),

  // Facilities
  getPendingFacilities: () => api.get('/v1/admin/facilities/pending'),
  getHospitals: (params) => api.get('/v1/admin/hospitals', { params }),
  getBloodBanks: (params) => api.get('/v1/admin/bloodbanks', { params }),
  verifyHospital: (id, data) => api.put(`/v1/admin/hospitals/${id}/verify`, data),
  verifyBloodBank: (id, data) => api.put(`/v1/admin/bloodbanks/${id}/verify`, data),

  // Inventory
  getInventory: (params) => api.get('/v1/admin/inventory', { params }),
  getAllInventory: (params) => api.get('/v1/admin/inventory', { params }),
  getLowStock: () => api.get('/v1/admin/inventory/low-stock'),
  overrideStock: (bankId, groupOrData, maybeData) => {
    if (typeof groupOrData === 'object' && groupOrData !== null) {
      const group = groupOrData.bloodGroup || 'O+';
      return api.put(`/v1/admin/inventory/${bankId}/${encodeURIComponent(group)}`, groupOrData);
    }
    return api.put(`/v1/admin/inventory/${bankId}/${encodeURIComponent(groupOrData)}`, maybeData);
  },

  // Requests
  getRequests: (params) => api.get('/v1/admin/requests', { params }),
  approveRequest: (id, note) => api.put(`/v1/admin/requests/${id}/approve`, { note }),
  rejectRequest: (id, reason) => api.put(`/v1/admin/requests/${id}/reject`, { reason }),
  assignDonor: (id, donorIdOrData) => {
    const donorId = typeof donorIdOrData === 'object' && donorIdOrData !== null ? donorIdOrData.donorId : donorIdOrData;
    return api.put(`/v1/admin/requests/${id}/assign`, { donorId });
  },
  assignDonorToRequest: (id, donorIdOrData) => {
    const donorId = typeof donorIdOrData === 'object' && donorIdOrData !== null ? donorIdOrData.donorId : donorIdOrData;
    return api.put(`/v1/admin/requests/${id}/assign`, { donorId });
  },
  changeRequestStatus: (id, statusOrData, note) => {
    if (typeof statusOrData === 'object' && statusOrData !== null) {
      return api.put(`/v1/admin/requests/${id}/status`, {
        status: statusOrData.status,
        note: statusOrData.note || '',
      });
    }
    return api.put(`/v1/admin/requests/${id}/status`, { status: statusOrData, note: note || '' });
  },

  // Emergency
  getLiveEmergencies: () => api.get('/v1/admin/emergency/live'),
  coordinateEmergency: (id, data) => api.post(`/v1/admin/emergency/${id}/coordinate`, data),

  // Donations
  getDonations: (params) => api.get('/v1/admin/donations', { params }),
  verifyDonation: (id) => api.put(`/v1/admin/donations/${id}/verify`),

  // Broadcast
  broadcast: (data) => api.post('/v1/admin/notifications/broadcast', data),

  // Complaints
  getComplaints: (params) => api.get('/v1/admin/complaints', { params }),
  assignComplaint: (id, adminId) => api.put(`/v1/admin/complaints/${id}/assign`, { adminId }),
  respondComplaint: (id, data) => api.post(`/v1/admin/complaints/${id}/respond`, data),
  resolveComplaint: (id, data) => api.put(`/v1/admin/complaints/${id}/resolve`, data),

  // Audit Logs
  getAuditLogs: (params) => api.get('/v1/admin/audit-logs', { params }),
  getAuditFilters: () => api.get('/v1/admin/audit-logs/filters'),
  getAuditLogById: (id) => api.get(`/v1/admin/audit-logs/${id}`),
};

// Compatibility aliases
export const userAPI = {
  getMe: profileAPI.getMe,
  updateMe: profileAPI.updateMe,
  uploadPhoto: profileAPI.uploadPhoto,
};

export default api;

