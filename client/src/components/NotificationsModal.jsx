import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  CheckCircle2,
  Clock,
  Trash2,
  CheckCheck,
  AlertTriangle,
  Mail,
  MessageSquare,
  Smartphone,
  RefreshCw,
} from 'lucide-react';
import { notificationAPI } from '../services/api';
import toast from 'react-hot-toast';

const DEFAULT_DEMO_NOTIFICATIONS = [
  {
    _id: 'notif-1',
    id: 'notif-1',
    type: 'EMERGENCY_ALERT',
    title: '🚨 EMERGENCY: Blood Needed Immediately (O+)',
    message: 'Urgent requirement for 2 unit(s) of O+ at Raigarh Civil Hospital (~1.2 km away). Your blood type is a compatible match! Please respond ASAP.',
    channels: ['IN_APP', 'EMAIL', 'SMS'],
    isRead: false,
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    meta: { bloodGroup: 'O+', units: 2, hospitalName: 'Raigarh Civil Hospital' },
  },
  {
    _id: 'notif-2',
    id: 'notif-2',
    type: 'REQUEST_CREATED',
    title: 'Blood Request Submitted',
    message: 'Your request for 2 unit(s) of B+ has been submitted successfully (Status: PENDING).',
    channels: ['IN_APP', 'EMAIL'],
    isRead: false,
    createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    meta: { bloodGroup: 'B+', units: 2, patientName: 'ICU Trauma Patient' },
  },
  {
    _id: 'notif-3',
    id: 'notif-3',
    type: 'APPOINTMENT_CONFIRMED',
    title: 'Donation Slot Confirmed',
    message: 'Your appointment at Central Blood Bank is scheduled for tomorrow at 10:30 AM.',
    channels: ['IN_APP', 'SMS'],
    isRead: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    meta: { bloodBank: 'Central Blood Bank', slot: '10:30 AM' },
  },
];

export const NotificationsModal = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState(DEFAULT_DEMO_NOTIFICATIONS);
  const [filterUnread, setFilterUnread] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(2);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationAPI.getAll({ unread: filterUnread, limit: 30 });
      if (res?.data?.notifications && res.data.notifications.length > 0) {
        setNotifications(res.data.notifications);
        if (typeof res.data.pagination?.unreadCount === 'number') {
          setUnreadCount(res.data.pagination.unreadCount);
        }
      }
    } catch (err) {
      // Fallback silently to in-memory notifications for offline/demo personas
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, filterUnread]);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
    } catch (e) {
      // Local fallback
    }
    setNotifications((prev) =>
      prev.map((n) => (n._id === id || n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      toast.success('All notifications marked as read');
    } catch (e) {
      // Local fallback
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleDelete = async (id) => {
    try {
      await notificationAPI.delete(id);
      toast.success('Notification removed');
    } catch (e) {
      // Local fallback
    }
    setNotifications((prev) => prev.filter((n) => n._id !== id && n.id !== id));
  };

  if (!isOpen) return null;

  const filteredList = filterUnread
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-red-100 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#991B1B] via-[#C62828] to-[#D32F2F] text-white p-5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-xs">
              <Bell size={18} className="fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight">Notification Center</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-white text-[#C62828] text-[10px] font-black uppercase shadow-2xs">
                    {unreadCount} New
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white/80 font-medium">
                Universal Multi-Channel Alerts (In-App • Email • SMS)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilterUnread(false)}
              className={`px-3 py-1 rounded-full font-bold transition-all ${
                !filterUnread
                  ? 'bg-[#C62828] text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilterUnread(true)}
              className={`px-3 py-1 rounded-full font-bold transition-all ${
                filterUnread
                  ? 'bg-[#C62828] text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Unread Only
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchNotifications}
              disabled={loading}
              title="Refresh"
              className="p-1.5 text-slate-500 hover:text-[#C62828] rounded-full hover:bg-slate-200 transition-colors"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-[#C62828] hover:bg-red-50 rounded-full transition-colors"
              >
                <CheckCheck size={13} />
                <span>Mark all read</span>
              </button>
            )}
          </div>
        </div>

        {/* Notification List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 divide-y divide-slate-100">
          {filteredList.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <CheckCircle2 size={36} className="mx-auto mb-2 text-emerald-500 opacity-60" />
              <p className="text-xs font-bold text-slate-700">You are all caught up!</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                No {filterUnread ? 'unread ' : ''}notifications at the moment.
              </p>
            </div>
          ) : (
            filteredList.map((item) => {
              const notifId = item._id || item.id;
              const isEmergency =
                item.type?.includes('EMERGENCY') || item.title?.includes('EMERGENCY');

              return (
                <div
                  key={notifId}
                  className={`pt-3 first:pt-0 rounded-2xl p-3.5 transition-all ${
                    !item.isRead
                      ? isEmergency
                        ? 'bg-red-50/70 border border-red-200 shadow-2xs'
                        : 'bg-[#FFF8F8] border border-red-100 shadow-2xs'
                      : 'bg-white border border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <span className="text-sm">
                        {isEmergency ? '🚨' : item.type?.includes('APPOINTMENT') ? '📅' : '🩸'}
                      </span>
                      <div>
                        <h4
                          className={`text-xs font-bold leading-snug ${
                            isEmergency ? 'text-red-950 font-black' : 'text-[#0F172A]'
                          }`}
                        >
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                          {item.message}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {!item.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(notifId)}
                          title="Mark as read"
                          className="p-1 text-slate-400 hover:text-emerald-600 rounded-full hover:bg-emerald-50 transition-colors"
                        >
                          <CheckCircle2 size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notifId)}
                        title="Delete notification"
                        className="p-1 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Channel & Metadata Bar */}
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] uppercase font-bold text-slate-400">
                        Channels:
                      </span>
                      {(item.channels || ['IN_APP']).map((ch) => (
                        <span
                          key={ch}
                          className="px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200 text-[9px] font-bold flex items-center gap-1"
                        >
                          {ch === 'IN_APP' && <Bell size={9} className="text-red-600" />}
                          {ch === 'EMAIL' && <Mail size={9} className="text-blue-600" />}
                          {ch === 'SMS' && <Smartphone size={9} className="text-emerald-600" />}
                          {ch}
                        </span>
                      ))}
                    </div>

                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock size={10} />
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Just now'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
