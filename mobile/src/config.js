// Configurazione backend per mobile.
// Priorita':
// 1) EXPO_PUBLIC_API_BASE_URL (override diretto)
// 2) EXPO_PUBLIC_API_TARGET=local|public con URL dedicati

const directApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const requestedApiTarget = process.env.EXPO_PUBLIC_API_TARGET?.toLowerCase();

const localApiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL_LOCAL || 'http://localhost:8080';
const publicApiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL_PUBLIC ||
  'https://your-backend.example.com';

const hasLocalUrlFromEnv = !!process.env.EXPO_PUBLIC_API_BASE_URL_LOCAL;
const hasPublicUrlFromEnv = !!process.env.EXPO_PUBLIC_API_BASE_URL_PUBLIC;
const apiTarget =
  requestedApiTarget || (hasPublicUrlFromEnv && !hasLocalUrlFromEnv ? 'public' : 'local');

const selectedByTarget = apiTarget === 'public' ? publicApiBaseUrl : localApiBaseUrl;

export const API_BASE_URL = directApiBaseUrl || selectedByTarget;
export const API_TARGET = directApiBaseUrl
  ? 'custom'
  : apiTarget === 'public'
    ? 'public'
    : 'local';

const showDebugOverlayEnv = process.env.EXPO_PUBLIC_SHOW_DEBUG_OVERLAY;
export const SHOW_DEBUG_OVERLAY =
  showDebugOverlayEnv != null
    ? showDebugOverlayEnv.toLowerCase() === 'true'
    : __DEV__;

