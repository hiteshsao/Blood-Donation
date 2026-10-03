import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Award,
  Info,
  Clock,
  Filter,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { Button, StatusBadge, EmptyState } from '../components/common';

export const NotificationsPage = () => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
  } = useNotifications();

  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'UNREAD' | 'EMERGENCY' | 'CERTIFICATE'

  const filtered = notifications.filter((item) => {
    if (activeFilter === 'UNREAD') return !item.isRead && !item.read;
    if (activeFilter === 'EMERGENCY') return item.type === 'EMERGENCY';
    if (activeFilter === 'CERTIFICATE') return item.type === 'CERTIFICATE';
    return true;
  });

  const getIconForType = (type) => {
    switch (type) {
      case 'EMERGENCY':
        return <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />;
      case 'CERTIFICATE':
        return <Award className="w-5 h-5 text-blue-600" />;
      default:
        return <Bell className="w-5 h-5 text-[#C62828]" />;
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="rounded-3xl bg-white border border-red-100 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-[#C62828] text-xs font-black mb-2">
            <Bell className="w-3.5 h-3.5" />
            <span>Real-Time Alert Dispatch Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Notifications & Dispatch Alerts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Stay updated with trauma alerts, matching requests, and donation milestones.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={markAllAsRead}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
          >
            Mark All as Read ({unreadCount})
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'ALL', label: `All Alerts (${notifications.length})` },
          { key: 'UNREAD', label: `Unread (${unreadCount})` },
          { key: 'EMERGENCY', label: 'Emergency Alerts' },
          { key: 'CERTIFICATE', label: 'Certificates' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveFilter(tab.key)}
            className={`
              px-4 py-2 rounded-2xl text-xs font-black transition-all whitespace-nowrap
              ${
                activeFilter === tab.key
                  ? 'bg-[#C62828] text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <EmptyState
            title="No Notifications Found"
            description="You're all caught up! No alerts match this filter criteria."
          />
        ) : (
          filtered.map((notif) => {
            const isUnread = !notif.isRead && !notif.read;
            const notifId = notif._id || notif.id;

            return (
              <div
                key={notifId}
                onClick={() => markAsRead(notifId)}
                className={`
                  p-5 sm:p-6 rounded-3xl border transition-all duration-200 flex items-start justify-between gap-4 cursor-pointer
                  ${
                    isUnread
                      ? 'bg-white border-red-200 shadow-sm ring-1 ring-red-100'
                      : 'bg-white/70 border-slate-100 opacity-80 hover:opacity-100'
                  }
                `}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`
                      p-3 rounded-2xl shrink-0 border
                      ${
                        notif.type === 'EMERGENCY'
                          ? 'bg-red-50 border-red-200'
                          : notif.type === 'CERTIFICATE'
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-slate-50 border-slate-200'
                      }
                    `}
                  >
                    {getIconForType(notif.type)}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                        {notif.title}
                      </h4>
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-[#C62828] shrink-0" />
                      )}
                    </div>

                    <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                      {notif.message}
                    </p>

                    <div className="mt-2.5 flex items-center gap-3 text-[11px] font-bold text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {notif.createdAt
                          ? new Date(notif.createdAt).toLocaleTimeString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Just now'}
                      </span>
                      {notif.type && (
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 uppercase text-[10px]">
                          {notif.type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearNotification(notifId);
                    }}
                    title="Delete Notification"
                    className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
