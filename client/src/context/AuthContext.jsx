import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, {
  getStoredAccessToken,
  saveStoredTokens,
  clearStoredTokens,
} from '../api/axios';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user') || localStorage.getItem('lifedrop_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [donorProfile, setDonorProfile] = useState(() => {
    try {
      const savedDp = localStorage.getItem('donorProfile') || localStorage.getItem('lifedrop_donor_profile');
      if (savedDp) return JSON.parse(savedDp);
      const savedUser = localStorage.getItem('user') || localStorage.getItem('lifedrop_user');
      const parsed = savedUser ? JSON.parse(savedUser) : null;
      return parsed?.donorProfile || null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => getStoredAccessToken());
  const [loading, setLoading] = useState(true);

  // Track session expiration toast flag & user login state
  const sessionExpiredRef = useRef(false);
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Stable donorProfile setter with JSON equality check
  const setDonorProfileStable = useCallback((newProfile) => {
    setDonorProfile((prev) => {
      const resolved = typeof newProfile === 'function' ? newProfile(prev) : newProfile;
      if (JSON.stringify(prev) === JSON.stringify(resolved)) return prev;
      if (resolved) {
        localStorage.setItem('donorProfile', JSON.stringify(resolved));
        localStorage.setItem('lifedrop_donor_profile', JSON.stringify(resolved));
      } else {
        localStorage.removeItem('donorProfile');
        localStorage.removeItem('lifedrop_donor_profile');
      }
      return resolved;
    });
  }, []);

  // Sync user state to localStorage
  const saveUserSession = useCallback((userData, tokenData, donorProfileData) => {
    userRef.current = userData;
    if (userData) {
      sessionExpiredRef.current = false;
    }
    setUser(userData);
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('lifedrop_user', JSON.stringify(userData));
    } else {
      localStorage.removeItem('user');
      localStorage.removeItem('lifedrop_user');
    }

    const resolvedDonorProfile = donorProfileData !== undefined
      ? donorProfileData
      : (userData?.donorProfile || null);

    setDonorProfile(resolvedDonorProfile);
    if (resolvedDonorProfile) {
      localStorage.setItem('donorProfile', JSON.stringify(resolvedDonorProfile));
      localStorage.setItem('lifedrop_donor_profile', JSON.stringify(resolvedDonorProfile));
    } else {
      localStorage.removeItem('donorProfile');
      localStorage.removeItem('lifedrop_donor_profile');
    }

    if (tokenData?.accessToken) {
      setToken(tokenData.accessToken);
      saveStoredTokens(tokenData);
    } else if (tokenData === null) {
      setToken(null);
      clearStoredTokens();
    }
  }, []);

  // Fetch current user details from /api/v1/auth/me
  const fetchCurrentUser = useCallback(async () => {
    const currentToken = getStoredAccessToken();
    if (!currentToken) {
      setLoading(false);
      return null;
    }

    try {
      const res = await api.get('/auth/me');
      const userData = res.data?.user || res.data?.data?.user || res.data?.data;
      const dpData = res.data?.donorProfile ?? res.data?.data?.donorProfile ?? userData?.donorProfile ?? null;
      if (userData) {
        setUser(userData);
        setDonorProfile(dpData);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('lifedrop_user', JSON.stringify(userData));
        if (dpData) {
          localStorage.setItem('donorProfile', JSON.stringify(dpData));
          localStorage.setItem('lifedrop_donor_profile', JSON.stringify(dpData));
        } else {
          localStorage.removeItem('donorProfile');
          localStorage.removeItem('lifedrop_donor_profile');
        }
        return userData;
      }
    } catch (err) {
      const status = err.response?.status;
      const responseData = err.response?.data;
      const rawMsg =
        (typeof responseData === 'string'
          ? responseData
          : responseData?.message || responseData?.error) || '';
      const isSuspendedOrBlocked =
        typeof rawMsg === 'string' && /suspended|blocked/i.test(rawMsg);

      if (status === 403 || isSuspendedOrBlocked) {
        saveUserSession(null, null, null);
        toast.error('Your account has been suspended. Contact support.', {
          id: 'account-suspended',
        });
        if (navigate) {
          navigate('/login');
        } else if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      } else if (status === 401) {
        saveUserSession(null, null, null);
      }
    } finally {
      setLoading(false);
    }
    return null;
  }, [saveUserSession, navigate]);

  useEffect(() => {
    fetchCurrentUser();

    const handleUnauthorized = () => {
      const wasLoggedIn = Boolean(userRef.current);
      saveUserSession(null, null, null);

      const isLoginPage =
        typeof window !== 'undefined' &&
        (window.location.pathname === '/login' ||
         window.location.pathname === '/admin/login' ||
         window.location.pathname.includes('/login'));

      if (wasLoggedIn && !isLoginPage && !sessionExpiredRef.current) {
        sessionExpiredRef.current = true;
        toast.error('Session expired. Please login again.');
      }
    };

    const handleSuspended = (e) => {
      e?.preventDefault?.();
      saveUserSession(null, null, null);
      toast.error('Your account has been suspended. Contact support.', {
        id: 'account-suspended',
      });
      if (navigate) {
        navigate('/login');
      } else if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    window.addEventListener('auth:suspended', handleSuspended);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
      window.removeEventListener('auth:suspended', handleSuspended);
    };
  }, [fetchCurrentUser, saveUserSession, navigate]);

  // Standard Login
  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const data = res.data?.data || res.data;
      const loggedUser = data.user;
      const accessToken = data.accessToken;
      const refreshToken = data.refreshToken;

      if (!loggedUser || !accessToken) {
        throw new Error(data.message || 'Login failed. Invalid response structure.');
      }

      let dp = data.donorProfile || loggedUser.donorProfile || null;
      saveUserSession(loggedUser, { accessToken, refreshToken }, dp);
      sessionExpiredRef.current = false;

      // If donorProfile was not attached directly on login payload, try fetching /auth/me
      if (!dp) {
        try {
          const meRes = await api.get('/auth/me');
          if (meRes.data?.donorProfile) {
            dp = meRes.data.donorProfile;
            setDonorProfile(dp);
            localStorage.setItem('donorProfile', JSON.stringify(dp));
            localStorage.setItem('lifedrop_donor_profile', JSON.stringify(dp));
          }
        } catch {
          // Non-blocking
        }
      }

      return { success: true, user: loggedUser, donorProfile: dp };
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Login failed. Please check credentials.';
      const error = new Error(msg);
      error.response = err.response;
      error.requiresVerification = err.response?.data?.requiresVerification;
      error.email = err.response?.data?.email;
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Register
  const register = async (userData) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', userData);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Registration failed.';
      toast.error(msg, { id: msg });
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const verifyOtp = async (email, otp, type = 'REGISTRATION') => {
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { email, otp, type });
      const data = res.data?.data || res.data;
      if (data?.accessToken && data?.user) {
        saveUserSession(
          data.user,
          { accessToken: data.accessToken, refreshToken: data.refreshToken },
          data.donorProfile || data.user?.donorProfile || null
        );
      }
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Invalid or expired OTP.';
      toast.error(msg, { id: msg });
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password
  const forgotPassword = async (email) => {
    try {
      const res = await api.post('/auth/forgot-password', { email });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to process forgot password request.';
      toast.error(msg, { id: msg });
      throw new Error(msg);
    }
  };

  // Reset Password
  const resetPassword = async ({ email, otp, newPassword }) => {
    try {
      const res = await api.post('/auth/reset-password', { email, otp, newPassword });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to reset password.';
      toast.error(msg, { id: msg });
      throw new Error(msg);
    }
  };

  // Logout
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Non-blocking
    } finally {
      saveUserSession(null, null, null);
    }
  };

  // Update profile locally & optionally via API
  const updateUser = (patchData) => {
    setUser((prev) => {
      const updated = { ...prev, ...patchData };
      localStorage.setItem('user', JSON.stringify(updated));
      localStorage.setItem('lifedrop_user', JSON.stringify(updated));
      return updated;
    });

    if (patchData?.donorProfile !== undefined) {
      setDonorProfile(patchData.donorProfile);
      if (patchData.donorProfile) {
        localStorage.setItem('donorProfile', JSON.stringify(patchData.donorProfile));
        localStorage.setItem('lifedrop_donor_profile', JSON.stringify(patchData.donorProfile));
      } else {
        localStorage.removeItem('donorProfile');
        localStorage.removeItem('lifedrop_donor_profile');
      }
    }
  };

  const role = useMemo(() => user?.role || null, [user]);
  const isAuthenticated = useMemo(() => !!user && !!token, [user, token]);

  const value = useMemo(
    () => ({
      user,
      role,
      token,
      loading,
      isAuthenticated,
      donorProfile,
      setDonorProfile: setDonorProfileStable,
      login,
      register,
      verifyOtp,
      forgotPassword,
      resetPassword,
      logout,
      updateUser,
      refreshUser: fetchCurrentUser,
    }),
    [user, role, token, loading, isAuthenticated, donorProfile, setDonorProfileStable, fetchCurrentUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
