import api from './axios';

export const authApi = {
  login: (email, fullName) =>
    api.post('/auth/login', { email, full_name: fullName }),

  getMe: () => api.get('/auth/me'),
};

export const roomsApi = {
  getAll: (params) => api.get('/rooms', { params }),

  search: (params) => api.get('/rooms/search', { params }),

  getById: (id) => api.get(`/rooms/${id}`),

  create: (data) => api.post('/rooms', data),

  update: (id, data) => api.put(`/rooms/${id}`, data),

  delete: (id) => api.delete(`/rooms/${id}`),
};

export const bookingsApi = {
  getMyBookings: (params) => api.get('/bookings', { params }),

  getFreezeStatus: () => api.get('/bookings/freeze-status'),

  getRoomBookings: (roomId, startDate, endDate) =>
    api.get(`/bookings/room/${roomId}`, { params: { start_date: startDate, end_date: endDate } }),

  getById: (id) => api.get(`/bookings/${id}`),

  create: (data) => api.post('/bookings', data),

  update: (id, data) => api.put(`/bookings/${id}`, data),

  cancel: (id, message = null) => api.delete(`/bookings/${id}`, { data: { message } }),
};

export const dashboardApi = {
  getMetrics: (params) => api.get('/dashboard/metrics', { params }),
  getReport:  (params) => api.get('/dashboard/report',  { params }),
  getCarMetrics: (params) => api.get('/dashboard/car-metrics', { params }),
  getCarReport:  (params) => api.get('/dashboard/car-report',  { params }),
};

export const adminApi = {
  getSettings: () => api.get('/admin/settings'),

  updateSettings: (data) => api.put('/admin/settings', data),

  updateBooking: (id, data) => api.patch(`/admin/bookings/${id}`, data),

  getBookings: (params) => api.get('/admin/bookings', { params }),

  getRules: () => api.get('/admin/rules'),

  updateRules: (rules) => api.put('/admin/rules', { rules }),

  getGuide: () => api.get('/admin/guide'),

  updateGuide: (guide) => api.put('/admin/guide', { guide }),

  getCarRules: () => api.get('/admin/car-rules'),

  updateCarRules: (rules) => api.put('/admin/car-rules', { rules }),

  getCarContactNote: () => api.get('/admin/car-contact-note'),

  updateCarContactNote: (note) => api.put('/admin/car-contact-note', { note }),

  getSiteLock: () => api.get('/admin/site-lock'),

  getUsers: (params) => api.get('/admin/users', { params }),

  searchUsers: (q) => api.get('/admin/users/search', { params: { q } }),

  findUserByEmail: (email) => api.post('/admin/users/by-email', { email }),

  setUserRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role }),

  promote: (email, role) => api.post('/admin/promote', { email, role }),

  banUser: (email) => api.post('/admin/ban', { email }),

  setUserStatus: (id, isActive) => api.patch(`/admin/users/${id}/status`, { is_active: isActive }),
};

export const wayfindingApi = {
  getAll: () => api.get('/wayfinding-paths'),

  save: (roomId, points) => api.put(`/wayfinding-paths/${roomId}`, { points }),

  remove: (roomId) => api.delete(`/wayfinding-paths/${roomId}`),

  removeAll: () => api.delete('/wayfinding-paths'),
};

export const roomShapesApi = {
  getAll: () => api.get('/room-shapes'),

  save: (roomId, points) => api.put(`/room-shapes/${roomId}`, { points }),

  remove: (roomId) => api.delete(`/room-shapes/${roomId}`),

  removeAll: () => api.delete('/room-shapes'),
};

export const mapAnnotationsApi = {
  getAll: () => api.get('/map-annotations'),

  create: (data) => api.post('/map-annotations', data),

  update: (id, data) => api.put(`/map-annotations/${id}`, data),

  remove: (id) => api.delete(`/map-annotations/${id}`),
};

export const carsApi = {
  getAll: (params) => api.get('/cars', { params }),

  getById: (id) => api.get(`/cars/${id}`),

  create: (data) => api.post('/cars', data),

  update: (id, data) => api.put(`/cars/${id}`, data),

  delete: (id) => api.delete(`/cars/${id}`),
};

export const carBookingsApi = {
  getBookings: (carId, startDate, endDate) =>
    api.get('/car-bookings', { params: { car_id: carId, start_date: startDate, end_date: endDate } }),

  create: (data) => api.post('/car-bookings', data),

  update: (id, data) => api.put(`/car-bookings/${id}`, data),

  cancel: (id, message = null) => api.delete(`/car-bookings/${id}`, { data: { message } }),
};

export const floorBackgroundsApi = {
  getAll: () => api.get('/floor-backgrounds'),

  upload: (location, floor, file) => {
    const formData = new FormData();
    formData.append('location', location);
    formData.append('floor', floor);
    formData.append('image', file);
    return api.post('/floor-backgrounds', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  remove: (location, floor) =>
    api.delete(`/floor-backgrounds/${encodeURIComponent(location)}/${encodeURIComponent(floor)}`),
};
