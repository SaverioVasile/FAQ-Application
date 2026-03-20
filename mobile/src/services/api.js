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

export async function fetchSesVerificationStatus(email) {
  addDebugLog('SES status request', { email });
  const { data } = await api.get('/api/admin/ses-verification-status', {
    params: { email },
  });
  addDebugLog('SES status response', {
    email,
    status: data?.status,
    rawStatus: data?.rawStatus,
  });
  return data;
}

export async function requestSesEmailVerification(email) {
  addDebugLog('SES verify request', { email });
  const { data } = await api.post('/api/admin/ses-verify-email', { email });
  addDebugLog('SES verify response', { email, message: data?.message || '' });
  return data;
}

export async function resendSubmissionEmail(submissionId) {
  addDebugLog('Resend email request', { submissionId });
  const { data } = await api.post(`/api/submissions/${submissionId}/resend-email`);
  addDebugLog('Resend email response', {
    submissionId,
    emailSent: data?.emailSent,
    message: data?.message || '',
  });
  return data;
}

export async function fetchMailConfig() {
  const { data } = await api.get('/api/admin/mail-config');
  return data;
}

export function extractApiMessage(err, fallback) {
  return err?.response?.data?.message || fallback;
}

