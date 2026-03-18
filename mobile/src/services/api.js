import axios from 'axios';
import { API_BASE_URL } from '../config';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

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

