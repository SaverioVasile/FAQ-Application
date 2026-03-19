import axios from 'axios';
import { API_BASE_URL } from '../config';
import { addDebugLog } from './debugLog';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const method = (config.method || 'get').toUpperCase();
  const fullUrl = `${config.baseURL || ''}${config.url || ''}`;
  addDebugLog('API request', { method, url: fullUrl });
  return config;
});

api.interceptors.response.use(
  (response) => {
    const method = (response.config?.method || 'get').toUpperCase();
    const fullUrl = `${response.config?.baseURL || ''}${response.config?.url || ''}`;
    addDebugLog('API response', {
      method,
      status: response.status,
      url: fullUrl,
    });
    return response;
  },
  (error) => {
    const status = error?.response?.status;
    const method = (error?.config?.method || 'get').toUpperCase();
    const fullUrl = `${error?.config?.baseURL || ''}${error?.config?.url || ''}`;
    addDebugLog('API error', {
      method,
      status: status || 'NO_RESPONSE',
      url: fullUrl,
      message: error?.message || 'Unknown error',
    });
    return Promise.reject(error);
  },
);

export async function submitQuestionnaire(payload) {
  const { data } = await api.post('/api/submissions', payload);
  return data;
}

export async function fetchSubmissions() {
  const { data } = await api.get('/api/submissions');
  return data;
}

export async function requestSesEmailVerification(email) {
  const { data } = await api.post('/api/admin/ses-verify-email', { email });
  return data;
}

export async function fetchMailConfig() {
  const { data } = await api.get('/api/admin/mail-config');
  return data;
}

