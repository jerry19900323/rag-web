import axios from 'axios';

export interface ApiErrorBody {
  error?: string;
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 15_000,
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('rag_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('rag_access_token');
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error: unknown, fallback = 'The request could not be completed.') {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.error || error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}
