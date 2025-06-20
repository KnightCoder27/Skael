
import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { auth } from '@/lib/firebase'; // Import Firebase auth instance

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API_BASE_URL && process.env.NODE_ENV === 'development') {
  // This console.warn will only appear in development if the URL is missing
  console.warn("Warning: NEXT_PUBLIC_API_BASE_URL is not defined. API calls may fail or point to an incorrect backend.");
}

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const token = await currentUser.getIdToken(true);
        config.headers.Authorization = `Bearer ${token}`;
      } catch (error) {
        // Silently handle token refresh errors in production
        // Optionally, log to a dedicated error monitoring service if needed
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // In production, avoid logging full error objects to the console
    // Instead, rely on specific error handling in components or use an error monitoring service
    return Promise.reject(error);
  }
);

export default apiClient;
