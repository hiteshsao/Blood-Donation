import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
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

    // Check if demo token
    if (currentToken.startsWith('demo_token_')) {
      const roleKey = currentToken.replace('demo_token_', '');
      const demoData = DEMO_USERS[roleKey] || DEMO_USERS.user;
      setUser(demoData);
      const dp = demoData.donorProfile || null;
      setDonorProfile(dp);
      if (dp) {
        localStorage.setItem('donorProfile', JSON.stringify(dp));
        localStorage.setItem('lifedrop_donor_profile', JSON.stringify(dp));
      } else {
        localStorage.removeItem('donorProfile');
        localStorage.removeItem('lifedrop_donor_profile');
      }
      setLoading(false);
      return demoData;
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
      // If server error or token expired, keep local user if offline, or clear if 401
      if (err.response?.status === 401) {
        saveUserSession(null, null, null);
      }
    } finally {
      setLoading(false);
    }
    return null;
  }, [saveUserSession]);

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

  // Instant 1-Click Demo Login
  const loginAsDemo = (roleKey = 'donor') => {
    const demo = DEMO_USERS[roleKey] || DEMO_USERS.donor;
    const demoToken = `demo_token_${roleKey}`;
    saveUserSession(demo, { accessToken: demoToken, refreshToken: 'demo_refresh' }, demo.donorProfile || null);
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
        saveUserSession(data.user, { accessToken: data.accessToken, refreshToken: data.refreshToken }, data.donorProfile || data.user?.donorProfile || null);
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
          donorProfile: {
            isAvailable: true,
            isVerified: true,
            verificationStatus: 'VERIFIED',
            bloodGroup: 'O+',
            totalDonations: 0,
            lastDonationDate: null,
          },
        };
        const demoToken = 'demo_token_donor';
        saveUserSession(verifiedUser, { accessToken: demoToken, refreshToken: 'demo_refresh' }, verifiedUser.donorProfile);
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
      loginAsDemo,
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
