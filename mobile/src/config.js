// URL del backend.
// - Simulatore iOS/Android: http://localhost:8080
// - Dispositivo fisico con Expo Go: http://<IP_DEL_TUO_PC>:8080
// - Produzione: https://your-backend.example.com
//
// Puoi sovrascrivere questo valore creando un file .env con:
//   EXPO_PUBLIC_API_BASE_URL=http://192.168.1.X:8080

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080';

