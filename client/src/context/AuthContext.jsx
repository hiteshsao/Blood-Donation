import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import api, {
  getStoredAccessToken,
  saveStoredTokens,
  clearStoredTokens,
} from '../api/axios';

const AuthContext = createContext(null);

export const DEMO_USERS = {
  admin: {
    _id: 'demo-admin-id-01',
    id: 'demo-admin-id-01',
    name: 'Administrator Chief',
    email: 'admin@lifedrop.org',
    role: 'ADMIN',
    bloodGroup: 'O+',
    city: 'Mumbai',
    phone: '+91 98000 00001',
    status: 'ACTIVE',
    isEmailVerified: true,
    isVerified: true,
  },
  donor: {
    _id: 'demo-donor-id-02',
    id: 'demo-donor-id-02',
    name: 'Vikram Malhotra',
    email: 'donor.oneg@test.com',
    role: 'DONOR',
    bloodGroup: 'O-',
    city: 'Mumbai',
    phone: '+91 98765 43210',
    status: 'ACTIVE',
    isEmailVerified: true,
    isVerified: true,
    isDonor: true,
    donorProfile: {
      isAvailable: true,
      isVerified: true,
      verificationStatus: 'VERIFIED',
      bloodGroup: 'O-',
      totalDonations: 8,
      lastDonationDate: '2026-07-01T00:00:00.000Z',
    },
  },
  hospital: {
    _id: 'demo-hospital-id-03',
    id: 'demo-hospital-id-03',
    name: 'Dr. Ananya Sen',
    email: 'icu.doctor@test.com',
    role: 'HOSPITAL',
    hospitalName: 'Apollo City Hospital',
    bloodGroup: 'B+',
    city: 'Mumbai',
    phone: '+91 98765 43211',
    status: 'ACTIVE',
    isEmailVerified: true,
    isVerified: true,
  },
  bloodbank: {
    _id: 'demo-bank-id-04',
    id: 'demo-bank-id-04',
    name: 'RedCross Central Bank',
    email: 'director@redcrossbank.org',
    role: 'BLOOD_BANK',
    bloodBankName: 'RedCross Blood Center',
    city: 'Mumbai',
    phone: '+91 98765 43212',
    status: 'ACTIVE',
    isEmailVerified: true,
    isVerified: true,
  },
  user: {
    _id: 'demo-user-id-05',
    id: 'demo-user-id-05',
    name: 'Rahul Sharma',
    email: 'rahul.sharma@example.com',
    role: 'USER',
    bloodGroup: 'A+',
    city: 'Mumbai',
    phone: '+91 98765 43213',
    status: 'ACTIVE',
    isEmailVerified: true,
    isVerified: true,
  },
  pending_facility: {
    _id: 'demo-pending-id-06',
    id: 'demo-pending-id-06',
    name: 'Metro Trauma Care Hospital',
    email: 'compliance@metrotrauma.org',
    role: 'HOSPITAL',
    hospitalName: 'Metro Trauma Care Hospital',
    licenseNumber: 'MH-MUM-2026-PENDING',
    city: 'Mumbai',
    phone: '+91 98000 77777',
    status: 'PENDING',
    verificationStatus: 'PENDING',
    isEmailVerified: true,
    isVerified: false,
  },
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user') || localStorage.getItem('lifedrop_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => getStoredAccessToken());
  const [loading, setLoading] = useState(true);

  // Sync user state to localStorage
  const saveUserSession = useCallback((userData, tokenData) => {
    setUser(userData);
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('lifedrop_user', JSON.stringify(userData));
    } else {
      localStorage.removeItem('user');
      localStorage.removeItem('lifedrop_user');
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

    // Check if demo token
    if (currentToken.startsWith('demo_token_')) {
      const roleKey = currentToken.replace('demo_token_', '');
      const demoData = DEMO_USERS[roleKey] || DEMO_USERS.user;
      setUser(demoData);
      setLoading(false);
      return demoData;
    }

    try {
      const res = await api.get('/auth/me');
      const userData = res.data?.user || res.data?.data?.user || res.data?.data;
      if (userData) {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('lifedrop_user', JSON.stringify(userData));
        return userData;
      }
    } catch (err) {
      // If server error or token expired, keep local user if offline, or clear if 401
      if (err.response?.status === 401) {
        saveUserSession(null, null);
      }
    } finally {
      setLoading(false);
    }
    return null;
  }, [saveUserSession]);

  useEffect(() => {
    fetchCurrentUser();

    const handleUnauthorized = () => {
      saveUserSession(null, null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [fetchCurrentUser, saveUserSession]);

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

      saveUserSession(loggedUser, { accessToken, refreshToken });
      return { success: true, user: loggedUser };
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

  // Instant 1-Click Demo Login
  const loginAsDemo = (roleKey = 'donor') => {
    const demo = DEMO_USERS[roleKey] || DEMO_USERS.donor;
    const demoToken = `demo_token_${roleKey}`;
    saveUserSession(demo, { accessToken: demoToken, refreshToken: 'demo_refresh' });
    return demo;
  };

  // Register
  const register = async (userData) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', userData);
      return res.data;
    } catch (err) {
      if (!err.response) {
        return {
          success: true,
          message: `Verification code sent to ${userData.email}. (Demo Code: 123456)`,
          demoOtp: '123456',
        };
      }
      throw new Error(err.response?.data?.message || 'Registration failed.');
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
        saveUserSession(data.user, { accessToken: data.accessToken, refreshToken: data.refreshToken });
      }
      return data;
    } catch (err) {
      if (!err.response && otp === '123456') {
        const verifiedUser = {
          _id: `user-${Date.now()}`,
          name: email.split('@')[0],
          email,
          role: 'DONOR',
          bloodGroup: 'O+',
          status: 'ACTIVE',
          isEmailVerified: true,
          isVerified: true,
        };
        const demoToken = 'demo_token_donor';
        saveUserSession(verifiedUser, { accessToken: demoToken, refreshToken: 'demo_refresh' });
        return { success: true, user: verifiedUser, message: 'Account verified successfully!' };
      }
      throw new Error(err.response?.data?.message || 'Invalid or expired OTP.');
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
      if (!err.response) {
        return { success: true, message: 'Password reset code sent. (Demo OTP: 123456)' };
      }
      throw new Error(err.response?.data?.message || 'Failed to process forgot password request.');
    }
  };

  // Reset Password
  const resetPassword = async ({ email, otp, newPassword }) => {
    try {
      const res = await api.post('/auth/reset-password', { email, otp, newPassword });
      return res.data;
    } catch (err) {
      if (!err.response && otp === '123456') {
        return { success: true, message: 'Password reset successfully!' };
      }
      throw new Error(err.response?.data?.message || 'Failed to reset password.');
    }
  };

  // Logout
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Non-blocking
    } finally {
      saveUserSession(null, null);
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
      login,
      loginAsDemo,
      register,
      verifyOtp,
      forgotPassword,
      resetPassword,
      logout,
      updateUser,
      refreshUser: fetchCurrentUser,
    }),
    [user, role, token, loading, isAuthenticated, fetchCurrentUser]
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
