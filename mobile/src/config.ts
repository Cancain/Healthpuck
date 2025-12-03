// @ts-ignore
export const API_BASE_URL = __DEV__
  ? 'http://192.168.83.164:3001'
  : 'https://healthpuck.fly.dev';

export const API_ENDPOINTS = {
  LOGIN: '/api/auth/login',
  ME: '/api/auth/me',
  HEART_RATE: '/api/heart-rate',
} as const;
