import axios from 'axios';

/**
 * LifeDrop Centralized Axios API Client
 * Configured with baseURL, Bearer auth header injection, and
 * automatic token rotation & request replay on HTTP 401.
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Concurrency lock and retry queue for token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Retrieve active access token from standard storage keys
 */
export const getStoredAccessToken = () => {
  return (
    localStorage.getItem('accessToken') ||
    localStorage.getItem('lifedrop_access_token') ||
    localStorage.getItem('bloodlink_access_token') ||
    localStorage.getItem('token') ||
    null
  );
};

/**
 * Retrieve active refresh token from standard storage keys
 */
export const getStoredRefreshToken = () => {
  return (
    localStorage.getItem('refreshToken') ||
    localStorage.getItem('lifedrop_refresh_token') ||
    localStorage.getItem('bloodlink_refresh_token') ||
    null
  );
};

/**
 * Persist tokens to local storage across recognized keys
 */
export const saveStoredTokens = ({ accessToken, refreshToken }) => {
  if (accessToken) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('lifedrop_access_token', accessToken);
    localStorage.setItem('bloodlink_access_token', accessToken);
    localStorage.setItem('token', accessToken);
  }
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('lifedrop_refresh_token', refreshToken);
    localStorage.setItem('bloodlink_refresh_token', refreshToken);
  }
};

/**
 * Clear stored auth tokens on logout or session expiration
 */
export const clearStoredTokens = () => {
  ['accessToken', 'lifedrop_access_token', 'bloodlink_access_token', 'token'].forEach((k) =>
    localStorage.removeItem(k)
  );
  ['refreshToken', 'lifedrop_refresh_token', 'bloodlink_refresh_token'].forEach((k) =>
    localStorage.removeItem(k)
  );
  ['user', 'lifedrop_user', 'bloodlink_user'].forEach((k) => localStorage.removeItem(k));
};

// Request Interceptor: Attach Access Token
api.interceptors.request.use(
  (config) => {
    const token = getStoredAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Auto-refresh on 401 and replay queued requests
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Avoid loops on login, register, or refresh endpoints
    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/register') ||
      originalRequest?.url?.includes('/auth/refresh-token');

    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const currentRefreshToken = getStoredRefreshToken();

      if (!currentRefreshToken) {
        isRefreshing = false;
        clearStoredTokens();
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        return Promise.reject(error);
      }

      try {
        // Attempt token rotation with refresh token
        const refreshResponse = await axios.post(
          `${API_BASE}/auth/refresh-token`,
          { refreshToken: currentRefreshToken },
          { withCredentials: true }
        );

        const newAccessToken =
          refreshResponse.data?.accessToken || refreshResponse.data?.data?.accessToken;
        const newRefreshToken =
          refreshResponse.data?.refreshToken || refreshResponse.data?.data?.refreshToken;

        if (!newAccessToken) {
          throw new Error('No access token received from refresh endpoint');
        }

        saveStoredTokens({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken || currentRefreshToken,
        });

        api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        isRefreshing = false;

        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        isRefreshing = false;
        clearStoredTokens();
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
