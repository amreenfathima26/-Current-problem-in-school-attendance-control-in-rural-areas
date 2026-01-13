import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refresh = localStorage.getItem('refresh_token');
        if (refresh) {
          const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
            refresh: refresh,
          });

          const { access } = response.data;
          localStorage.setItem('access_token', access);

          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (username, password) =>
    api.post('/auth/login/', { username, password }).then(res => res.data),

  logout: (refresh) =>
    api.post('/auth/logout/', { refresh }).then(res => res.data),

  getProfile: () =>
    api.get('/auth/profile/').then(res => res.data),

  updateProfile: (data) =>
    api.put('/auth/profile/update/', data).then(res => res.data),
};

// Students API
export const studentsAPI = {
  getStudents: (params) =>
    api.get('/users/students/', { params }).then(res => res.data),

  getStudent: (id) =>
    api.get(`/users/students/${id}/`).then(res => res.data),

  createStudent: (data) =>
    api.post('/users/students/', data).then(res => res.data),

  updateStudent: (id, data) =>
    api.put(`/users/students/${id}/`, data).then(res => res.data),

  deleteStudent: (id) =>
    api.delete(`/users/students/${id}/`).then(res => res.data),

  bulkImportStudents: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/users/students/bulk-import/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data);
  },
};

// Attendance API
export const attendanceAPI = {
  getDailyAttendance: (date) =>
    api.get('/attendance/daily/', { params: { date } }).then(res => res.data),

  getAttendanceRecords: (params) =>
    api.get('/attendance/records/', { params }).then(res => res.data),

  createAttendanceRecord: (data) =>
    api.post('/attendance/records/', data).then(res => res.data),

  updateAttendanceRecord: (id, data) =>
    api.put(`/attendance/records/${id}/`, data).then(res => res.data),

  deleteAttendanceRecord: (id) =>
    api.delete(`/attendance/records/${id}/`).then(res => res.data),

  recordRFIDAttendance: (cardId) =>
    api.post('/attendance/record/', { card_id: cardId }).then(res => res.data),

  // Face Recognition APIs
  markAttendanceFace: (imageFile) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    return api.post('/attendance/face/record/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data);
  },

  registerStudentWithFace: (studentData, imageFile) => {
    const formData = new FormData();
    Object.keys(studentData).forEach(key => formData.append(key, studentData[key]));
    formData.append('image', imageFile);
    return api.post('/attendance/face/student/register/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data);
  },

  uploadDataset: (zipFile, taskId, onProgress) => {
    const formData = new FormData();
    formData.append('dataset', zipFile);
    if (taskId) {
      formData.append('task_id', taskId);
    }
    return api.post('/attendance/face/dataset/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      }
    }).then(res => res.data);
  },

  getUploadProgress: (taskId) =>
    api.get(`/attendance/face/dataset/progress/?task_id=${taskId}`).then(res => res.data),

  trainModel: () =>
    api.post('/attendance/face/model/train/').then(res => res.data),

  getModelStatus: () =>
    api.get('/attendance/face/model/status/').then(res => res.data),

  getEnrolledStudents: () =>
    api.get('/attendance/face/enrolled-students/').then(res => res.data),

  getAttendanceStats: (period) =>
    api.get('/attendance/stats/', { params: { period } }).then(res => res.data),

  getStudentAttendanceHistory: (studentId) =>
    api.get(`/attendance/students/${studentId}/history/`).then(res => res.data),

  getAttendanceSummaries: (params) =>
    api.get('/attendance/summaries/', { params }).then(res => res.data),

  getAttendanceAlerts: () =>
    api.get('/attendance/alerts/').then(res => res.data),
};

// RFID Cards API
export const rfidAPI = {
  getRFIDCards: (params) =>
    api.get('/users/rfid-cards/', { params }).then(res => res.data),

  getRFIDCard: (id) =>
    api.get(`/users/rfid-cards/${id}/`).then(res => res.data),

  createRFIDCard: (data) =>
    api.post('/users/rfid-cards/', data).then(res => res.data),

  updateRFIDCard: (id, data) =>
    api.put(`/users/rfid-cards/${id}/`, data).then(res => res.data),

  deleteRFIDCard: (id) =>
    api.delete(`/users/rfid-cards/${id}/`).then(res => res.data),
};

// Reports API
export const reportsAPI = {
  generateDailyReport: (date) =>
    api.get(`/reports/daily/${date}/`, { responseType: 'blob' }).then(res => res.data),

  generateMonthlyReport: (month, year) =>
    api.get(`/reports/monthly/${year}/${month}/`, { responseType: 'blob' }).then(res => res.data),

  generateStudentReport: (studentId) =>
    api.get(`/reports/student/${studentId}/`, { responseType: 'blob' }).then(res => res.data),

  exportAttendanceExcel: (params) =>
    api.get('/reports/export/excel/', { params, responseType: 'blob' }).then(res => res.data),
};

// Schools API
export const schoolsAPI = {
  getSchools: () =>
    api.get('/users/schools/').then(res => res.data),

  getSchool: (id) =>
    api.get(`/users/schools/${id}/`).then(res => res.data),

  createSchool: (data) =>
    api.post('/users/schools/', data).then(res => res.data),

  updateSchool: (id, data) =>
    api.put(`/users/schools/${id}/`, data).then(res => res.data),

  deleteSchool: (id) =>
    api.delete(`/users/schools/${id}/`).then(res => res.data),
};

// Admin User Management API
export const usersManagementAPI = {
  getAllUsers: () =>
    api.get('/users/users/').then(res => res.data),

  createUser: (data) =>
    api.post('/users/users/', data).then(res => res.data),

  deleteUser: (id) =>
    api.delete(`/users/users/${id}/`).then(res => res.data),

  updateUser: (id, data) =>
    api.put(`/users/users/${id}/update/`, data).then(res => res.data),

  toggleUserStatus: (id) =>
    api.post(`/users/users/${id}/toggle-status/`).then(res => res.data),

  resetUserPassword: (userId, password) =>
    api.post(`/users/${userId}/reset_password/`, { password }),
};

export const settingsAPI = {
  getSettings: async () => {
    const response = await api.get('/core/settings/');
    return response.data;
  },
  updateSettings: async (settingsData) => {
    // settingsData should be FormData object
    const response = await api.put('/core/settings/', settingsData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

export default api;
