// Configurazione backend per mobile.
// Priorita':
// 1) EXPO_PUBLIC_API_BASE_URL (override diretto)
// 2) EXPO_PUBLIC_API_TARGET=local|public con URL dedicati

const directApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const apiTarget = (process.env.EXPO_PUBLIC_API_TARGET || 'local').toLowerCase();

const localApiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL_LOCAL || 'http://localhost:8080';
const publicApiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL_PUBLIC ||
  'https://your-backend.example.com';

const selectedByTarget = apiTarget === 'public' ? publicApiBaseUrl : localApiBaseUrl;

export const API_BASE_URL = directApiBaseUrl || selectedByTarget;
export const API_TARGET = directApiBaseUrl
  ? 'custom'
  : apiTarget === 'public'
    ? 'public'
    : 'local';

