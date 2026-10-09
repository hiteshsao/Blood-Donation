import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState(INITIAL_DEMO_NOTIFICATIONS);
  const [loading, setLoading] = useState(false);

  // Track emergency IDs that have already triggered a toast to prevent duplicate alerts
  const seenToastIdsRef = useRef(new Set());

  // Browser system desktop notifications
  const [browserPermission, setBrowserPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default'
  );

  const requestBrowserPermission = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const res = await Notification.requestPermission();
        setBrowserPermission(res);
        if (res === 'granted') {
          toast.success('Desktop emergency alerts enabled!');
        }
        return res;
      }
    } catch {
      // Notification API error or policy restriction
    }
  }, []);

  const showBrowserNotification = useCallback((title, body) => {
    try {
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        const notif = new Notification(title, {
          body,
          icon: '/favicon.ico',
        });
        notif.onclick = () => {
          window.focus();
          navigate('/emergency');
        };
      }
    } catch {
      // Ignored for non-secure contexts
    }
  }, [navigate]);

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
        data.forEach((n) => {
          const emId = n.meta?.emergencyId || n.data?.emergencyId || n.emergencyId;
          if (emId) seenToastIdsRef.current.add(emId.toString());
        });
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

    const showEmergencyToast = (formatted, emId) => {
      toast(
        (t) => (
          <div
            onClick={() => {
              toast.dismiss(t.id);
              navigate('/emergency');
            }}
            className="cursor-pointer select-none space-y-1"
          >
            <div className="flex items-center gap-1.5 font-black text-xs uppercase tracking-wider text-red-100">
              <span className="w-2 h-2 rounded-full bg-white animate-ping inline-block" />
              <span>🚨 {formatted.title || 'Emergency Blood Request'}</span>
            </div>
            <p className="text-xs text-white font-medium leading-relaxed">
              {formatted.message}
            </p>
            <span className="text-[11px] font-bold text-red-200 underline block pt-0.5">
              Click to view & respond on Emergency Hub →
            </span>
          </div>
        ),
        {
          id: emId ? `toast-emergency-${emId}` : undefined,
          duration: 7000,
          style: {
            background: '#991B1B',
            color: '#FFFFFF',
            borderRadius: '16px',
            padding: '14px 18px',
            boxShadow: '0 10px 30px -4px rgba(153, 27, 27, 0.4)',
            border: '1px solid #DC2626',
            cursor: 'pointer',
          },
        }
      );
    };

    const handleIncoming = (newNotif) => {
      if (!newNotif) return;

      const emId =
        newNotif.meta?.emergencyId ||
        newNotif.data?.emergencyId ||
        newNotif.emergencyId ||
        (newNotif.type === 'EMERGENCY_ALERT' || newNotif.type === 'EMERGENCY' ? newNotif._id : null);

      const isEmergency =
        newNotif.type === 'EMERGENCY' ||
        newNotif.type === 'EMERGENCY_ALERT' ||
        Boolean(emId);

      const formatted = {
        _id: newNotif._id || (emId ? `em-${emId}` : `notif-${Date.now()}`),
        id: newNotif._id || (emId ? `em-${emId}` : `notif-${Date.now()}`),
        title: newNotif.title || (isEmergency ? 'Emergency Blood Request' : 'New LifeDrop Alert'),
        message: newNotif.message || '',
        type: isEmergency ? 'EMERGENCY' : (newNotif.type || 'INFO'),
        isRead: false,
        emergencyId: emId ? emId.toString() : null,
        createdAt: newNotif.createdAt || new Date().toISOString(),
        ...newNotif,
      };

      if (isEmergency) {
        formatted.type = 'EMERGENCY';
      }

      // Pop toast notification and desktop notification (with deduplication)
      if (isEmergency && emId) {
        const emIdStr = emId.toString();
        if (!seenToastIdsRef.current.has(emIdStr)) {
          seenToastIdsRef.current.add(emIdStr);
          showEmergencyToast(formatted, emIdStr);
          showBrowserNotification(formatted.title, formatted.message);
        }
      } else if (isEmergency) {
        showEmergencyToast(formatted);
        showBrowserNotification(formatted.title, formatted.message);
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

      setNotifications((prev) => {
        // If an emergency notification with the same emergencyId already exists, deduplicate / update
        if (emId) {
          const emIdStr = emId.toString();
          const existingIdx = prev.findIndex((n) => {
            const existingEmId =
              n.emergencyId || n.meta?.emergencyId || n.data?.emergencyId;
            return existingEmId && existingEmId.toString() === emIdStr;
          });

          if (existingIdx !== -1) {
            // Upgrade temporary client item with real DB record if arrived
            if (newNotif._id && !newNotif._id.toString().startsWith('notif-') && !newNotif._id.toString().startsWith('em-')) {
              const updated = [...prev];
              updated[existingIdx] = {
                ...updated[existingIdx],
                ...formatted,
                _id: newNotif._id,
                id: newNotif._id,
              };
              return updated;
            }
            return prev;
          }
        }

        // Standard duplicate check by _id or id
        if (prev.some((n) => n._id === formatted._id || n.id === formatted.id)) {
          return prev;
        }

        return [formatted, ...prev];
      });
    };

    const handleEmergencyAlert = (data) => {
      if (!data) return;

      const emId = data.emergencyId || data._id || data.id;
      const bloodGroup = data.bloodGroup || '';
      const units = data.units || data.unitsRequired || 1;
      const hospitalName =
        data.hospitalName ||
        (typeof data.hospital === 'object' ? data.hospital?.name : data.hospital) ||
        'Hospital';
      const city = data.city ? ` in ${data.city}` : '';

      const title = 'Emergency Blood Request';
      const message =
        data.message ||
        `Immediate requirement for ${units} unit(s) of ${bloodGroup} at ${hospitalName}${city}.`;

      handleIncoming({
        _id: emId ? `em-${emId}` : `notif-${Date.now()}`,
        id: emId ? `em-${emId}` : `notif-${Date.now()}`,
        title,
        message,
        type: 'EMERGENCY',
        emergencyId: emId ? emId.toString() : null,
        meta: {
          emergencyId: emId ? emId.toString() : null,
          patientName: data.patientName,
          bloodGroup,
          units,
          hospitalName,
          city: data.city,
        },
        createdAt: data.createdAt || new Date().toISOString(),
      });
    };

    on('notification', handleIncoming);
    on('new_notification', handleIncoming);
    on('emergency_alert', handleEmergencyAlert);
    on('emergency:alert', handleEmergencyAlert);
    on('emergency:broadcast', handleEmergencyAlert);

    return () => {
      off('notification', handleIncoming);
      off('new_notification', handleIncoming);
      off('emergency_alert', handleEmergencyAlert);
      off('emergency:alert', handleEmergencyAlert);
      off('emergency:broadcast', handleEmergencyAlert);
    };
  }, [socket, on, off, navigate, showBrowserNotification]);

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
        browserPermission,
        requestBrowserPermission,
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
