import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const NotificationContext = createContext(null);

const INITIAL_DEMO_NOTIFICATIONS = [
  {
    _id: 'notif-demo-01',
    id: 'notif-demo-01',
    title: 'Emergency Blood Need: O-',
    message: 'Apollo Critical Care Unit requested 2 units of O- Negative blood in Mumbai.',
    type: 'EMERGENCY',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    _id: 'notif-demo-02',
    id: 'notif-demo-02',
    title: 'Donation Certificate Ready',
    message: 'Your certificate for the voluntary donation drive is now available for download.',
    type: 'CERTIFICATE',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    _id: 'notif-demo-03',
    id: 'notif-demo-03',
    title: 'Welcome to LifeDrop Transfusion Network',
    message: 'Your profile has been authenticated. Thank you for standing ready to save lives.',
    type: 'INFO',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, token } = useAuth();
  const { socket, on, off } = useSocket();

  const [notifications, setNotifications] = useState(INITIAL_DEMO_NOTIFICATIONS);
  const [loading, setLoading] = useState(false);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead && !n.read).length;
  }, [notifications]);

  // Fetch notifications from server
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    if (token?.startsWith('demo_token_')) {
      return;
    }

    setLoading(true);
    try {
      const res = await api.get('/notifications');
      const data = res.data?.data || res.data?.notifications || res.data;
      if (Array.isArray(data)) {
        setNotifications(data);
      }
    } catch {
      // Keep existing demo notifications if endpoint fails
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    } else {
      setNotifications(INITIAL_DEMO_NOTIFICATIONS);
    }
  }, [isAuthenticated, fetchNotifications]);

  // Real-time socket listener
  useEffect(() => {
    if (!socket) return;

    const handleIncoming = (newNotif) => {
      const formatted = {
        _id: newNotif._id || `notif-${Date.now()}`,
        id: newNotif._id || `notif-${Date.now()}`,
        title: newNotif.title || 'New LifeDrop Alert',
        message: newNotif.message || '',
        type: newNotif.type || 'INFO',
        isRead: false,
        createdAt: newNotif.createdAt || new Date().toISOString(),
        ...newNotif,
      };

      setNotifications((prev) => [formatted, ...prev]);

      // Pop toast notification
      if (formatted.type === 'EMERGENCY') {
        toast.error(`🚨 ${formatted.title}: ${formatted.message}`, {
          duration: 6000,
          style: {
            background: '#991B1B',
            color: '#FFFFFF',
            fontWeight: 'bold',
            borderRadius: '12px',
          },
        });
      } else {
        toast(`🩸 ${formatted.title}`, {
          icon: '🔔',
          duration: 4000,
          style: {
            background: '#FFFFFF',
            color: '#0F172A',
            border: '1px solid #FFE4E4',
            boxShadow: '0 8px 24px rgba(198, 40, 40, 0.12)',
          },
        });
      }
    };

    on('notification', handleIncoming);
    on('new_notification', handleIncoming);
    on('emergency:alert', (data) =>
      handleIncoming({
        title: 'Emergency Blood Request',
        message: data.message || `Immediate requirement for ${data.bloodGroup || 'Blood'} at ${data.hospital || 'Hospital'}`,
        type: 'EMERGENCY',
      })
    );

    return () => {
      off('notification', handleIncoming);
      off('new_notification', handleIncoming);
      off('emergency:alert', handleIncoming);
    };
  }, [socket, on, off]);

  const markAsRead = useCallback(async (id) => {
    setNotifications((prev) =>
      prev.map((n) => ((n._id === id || n.id === id) ? { ...n, isRead: true, read: true } : n))
    );

    if (token?.startsWith('demo_token_')) return;

    try {
      await api.put(`/notifications/${id}/read`);
    } catch {
      // Local state already updated
    }
  }, [token]);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true, read: true }))
    );

    if (token?.startsWith('demo_token_')) return;

    try {
      await api.put('/notifications/read-all');
    } catch {
      // Local state already updated
    }
  }, [token]);

  const clearNotification = useCallback(async (id) => {
    setNotifications((prev) => prev.filter((n) => n._id !== id && n.id !== id));
    if (token?.startsWith('demo_token_')) return;

    try {
      await api.delete(`/notifications/${id}`);
    } catch {
      // Local state updated
    }
  }, [token]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        clearNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;
