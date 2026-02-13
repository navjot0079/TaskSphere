import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add request interceptor to add token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor to handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If error is 401 and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refreshToken');

                if (!refreshToken) {
                    throw new Error('No refresh token');
                }

                // Try to refresh token
                const { data } = await axios.post(`${API_URL}/auth/refresh-token`, {
                    refreshToken,
                });

                // Save new access token
                localStorage.setItem('accessToken', data.accessToken);

                // Retry original request with new token
                originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                // Refresh failed, logout user
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;

// API methods

// Auth
export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    verifyOTP: (data) => api.post('/auth/verify-otp', data),
    resendOTP: (data) => api.post('/auth/resend-otp', data),
    login: (data) => api.post('/auth/login', data),
    logout: () => api.post('/auth/logout'),
    forgotPassword: (data) => api.post('/auth/forgot-password', data),
    resetPassword: (data) => api.post('/auth/reset-password', data),
    getMe: () => api.get('/auth/me'),
};

// Tasks
export const taskAPI = {
    getTasks: (params) => api.get('/tasks', { params }),
    getTask: (id) => api.get(`/tasks/${id}`),
    createTask: (data) => api.post('/tasks', data),
    updateTask: (id, data) => api.put(`/tasks/${id}`, data),
    deleteTask: (id) => api.delete(`/tasks/${id}`),
    getStats: () => api.get('/tasks/stats'),
    addSubtask: (id, data) => api.post(`/tasks/${id}/subtasks`, data),
    updateSubtask: (id, subtaskId, data) => api.put(`/tasks/${id}/subtasks/${subtaskId}`, data),
    startTimeTracking: (id) => api.post(`/tasks/${id}/time-tracking/start`),
    stopTimeTracking: (id, data) => api.post(`/tasks/${id}/time-tracking/stop`, data),
};

// Projects
export const projectAPI = {
    getProjects: (params) => api.get('/projects', { params }),
    getProject: (id) => api.get(`/projects/${id}`),
    createProject: (data) => api.post('/projects', data),
    updateProject: (id, data) => api.put(`/projects/${id}`, data),
    deleteProject: (id) => api.delete(`/projects/${id}`),
    inviteMember: (id, data) => api.post(`/projects/${id}/invite`, data),
    acceptInvite: (id) => api.post(`/projects/${id}/accept-invite`),
    addMember: (id, data) => api.post(`/projects/${id}/members`, data),
    removeMember: (id, userId) => api.delete(`/projects/${id}/members/${userId}`),
    updateMemberRole: (id, userId, data) => api.put(`/projects/${id}/members/${userId}`, data),
    getMessages: (id, params) => api.get(`/projects/${id}/messages`, { params }),
    sendMessage: (id, data) => api.post(`/projects/${id}/messages`, data),
    markMessageAsRead: (id, messageId) => api.put(`/projects/${id}/messages/${messageId}/read`),
    deleteMessage: (id, messageId) => api.delete(`/projects/${id}/messages/${messageId}`),
};

// Notifications
export const notificationAPI = {
    getNotifications: (params) => api.get('/notifications', { params }),
    markAsRead: (id) => api.put(`/notifications/${id}/read`),
    markAllAsRead: () => api.put('/notifications/read-all'),
    deleteNotification: (id) => api.delete(`/notifications/${id}`),
    getUnreadCount: () => api.get('/notifications/unread-count'),
};

// Files
export const fileAPI = {
    uploadFile: (formData) => api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
    getFiles: (params) => api.get('/files', { params }),
    getFile: (id) => api.get(`/files/${id}`),
    downloadFile: (id) => api.get(`/files/${id}/download`, { responseType: 'blob' }),
    deleteFile: (id) => api.delete(`/files/${id}`),
    getStats: () => api.get('/files/stats'),
};

// Dashboard
export const dashboardAPI = {
    getStats: (params) => api.get('/dashboard/stats', { params }),
    getActivity: (params) => api.get('/dashboard/activity', { params }),
    getCharts: (params) => api.get('/dashboard/charts', { params }),
    getSuggestions: () => api.get('/dashboard/suggestions'),
    getUpcoming: (params) => api.get('/dashboard/upcoming', { params }),
    getOverdue: () => api.get('/dashboard/overdue'),
    getTeamPerformance: () => api.get('/dashboard/team-performance'),
};

// Users
export const userAPI = {
    getProfile: () => api.get('/users/profile'),
    updateProfile: (data) => api.put('/users/profile', data),
    updateNotificationSettings: (data) => api.put('/users/notification-settings', data),
    changePassword: (data) => api.put('/users/change-password', data),
    uploadAvatar: (formData) => api.post('/users/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
    getAllUsers: (params) => api.get('/users', { params }),
    getUsersForChat: (params) => api.get('/users/chat-users', { params }),
    getSystemStats: () => api.get('/users/system-stats'),
    getUserById: (id) => api.get(`/users/${id}`),
    updateUserRole: (id, data) => api.put(`/users/${id}/role`, data),
    toggleUserActive: (id) => api.put(`/users/${id}/toggle-active`),
    deleteUser: (id) => api.delete(`/users/${id}`),
    getUserActivity: (id, params) => api.get(`/users/${id}/activity`, { params }),
};

// Chat
export const chatAPI = {
    getConversations: () => api.get('/chat/conversations'),
    getMessages: (userId, params) => api.get(`/chat/messages/${userId}`, { params }),
    sendMessage: (data) => api.post('/chat/messages', data),
    markAsRead: (userId) => api.put(`/chat/messages/${userId}/read`),
    deleteMessage: (messageId) => api.delete(`/chat/messages/${messageId}`),
    getUnreadCount: () => api.get('/chat/unread-count'),
};
