
import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { auth } from '@/lib/firebase'; // Import Firebase auth instance

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
  console.error("Error: NEXT_PUBLIC_API_BASE_URL is not defined in your .env.local file. API calls will fail.");
}

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL || '', // Fallback to empty string if not set, but will likely cause issues
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add Firebase ID token to requests
// Temporarily commented out to isolate token issues from AuthContext
/*
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const token = await currentUser.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
        console.log("apiClient Interceptor: Token added to headers.");
      } catch (error) {
        console.error('apiClient Interceptor: Error getting Firebase ID token:', error);
        // Optionally handle token refresh errors or redirect to login
      }
    } else {
      console.log("apiClient Interceptor: No current user, no token added.");
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);
*/

// Generic error handler for responses (optional, but good practice)
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle specific error codes or log them
    if (error.response) {
      console.error('API Error Response:', error.response.data, error.response.status, error.response.headers);
    } else if (error.request) {
      console.error('API Error Request:', error.request);
    } else {
      console.error('API Error Message:', error.message);
    }
    // It's important to return a rejected promise so that calling code can catch it
    return Promise.reject(error);
  }
);

export default apiClient;
