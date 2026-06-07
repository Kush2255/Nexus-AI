import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({ baseURL: BASE, timeout: 120_000 });

api.interceptors.response.use(
  r => r,
  e => { console.error('API', e.response?.status, e.config?.url); return Promise.reject(e); }
);

// ─── Chat ─────────────────────────────────────────────────────────────────────
export const chatAPI = {
  sendMessage:       (message: string, sessionId = '') =>
    api.post('/chat/message', { message, session_id: sessionId }),
  createSession:     (title = 'New Research Session') =>
    api.post('/chat/sessions', { title }),
  getSessions:       () => api.get('/chat/sessions'),
  getSessionMessages:(id: string) => api.get(`/chat/sessions/${id}/messages`),
  deleteSession:     (id: string) => api.delete(`/chat/sessions/${id}`),
};

// ─── Documents ────────────────────────────────────────────────────────────────
export const documentsAPI = {
  upload: (file: File, onProgress?: (e: any) => void) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/documents/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    });
  },
  list:   ()          => api.get('/documents/'),
  get:    (id: string) => api.get(`/documents/${id}`),
  delete: (id: string) => api.delete(`/documents/${id}`),
};

// ─── Agents ───────────────────────────────────────────────────────────────────
export const agentsAPI = {
  getStatus:   () => api.get('/agents/status'),
  getWorkflow: () => api.get('/agents/workflow'),
};

// ─── Reports ──────────────────────────────────────────────────────────────────
export const reportsAPI = {
  generate: (sessionId: string, query: string, findings: string) =>
    api.post('/reports/generate', { session_id: sessionId, query, findings }),
  list: () => api.get('/reports/'),
};

// ─── Analytics ────────────────────────────────────────────────────────────────
export const analyticsAPI = {
  getOverview: () => api.get('/analytics/overview'),
  getActivity: () => api.get('/analytics/activity'),
};

// ─── Export ───────────────────────────────────────────────────────────────────
export const exportAPI = {
  exportSession: (sessionId: string, format = 'markdown') =>
    api.post('/export/session', { session_id: sessionId, format }, { responseType: 'blob' }),
  exportReport: (reportId: string, format = 'markdown') =>
    api.get(`/export/report/${reportId}?format=${format}`, { responseType: 'blob' }),
};

export default api;
