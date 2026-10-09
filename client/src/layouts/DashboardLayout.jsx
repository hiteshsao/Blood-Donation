import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Droplet,
  Home,
  Users,
  GitPullRequest,
  History,
  Building2,
  Package,
  AlertTriangle,
  Bell,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Check,
  Clock,
  Sparkles,
  ExternalLink,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { StatusBadge, ConfirmDialog } from '../components/common';
import GlobalEmergencyPopup from '../components/GlobalEmergencyPopup';

export const DashboardLayout = () => {
  const { user, role, logout } = useAuth();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    browserPermission,
    requestBrowserPermission,
  } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const profileRef = useRef(null);
  const notifRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute navigation items by role
  const userRole = (role || user?.role || 'USER').toUpperCase();

  const getNavigationForRole = () => {
    switch (userRole) {
      case 'DONOR':
        return [
          { label: 'Dashboard', path: '/dashboard', icon: <Home className="w-5 h-5" /> },
          { label: 'Find Blood & Banks', path: '/find-blood', icon: <Droplet className="w-5 h-5" /> },
          { label: 'Book Appointment', path: '/appointments', icon: <Calendar className="w-5 h-5" /> },
          { label: 'Emergency Alerts', path: '/emergency', icon: <AlertTriangle className="w-5 h-5" /> },
          { label: 'Active Requests', path: '/requests', icon: <GitPullRequest className="w-5 h-5" /> },
          { label: 'Donation History', path: '/history', icon: <History className="w-5 h-5" /> },
          { label: 'Notifications', path: '/notifications', icon: <Bell className="w-5 h-5" /> },
          { label: 'Feedback & Support', path: '/feedback', icon: <MessageSquare className="w-5 h-5" /> },
          { label: 'My Profile', path: '/profile', icon: <UserIcon className="w-5 h-5" /> },
        ];
      case 'HOSPITAL':
        return [
          { label: 'Hospital Hub', path: '/dashboard', icon: <Building2 className="w-5 h-5" /> },
          { label: 'Create Blood Request', path: '/requests', icon: <GitPullRequest className="w-5 h-5" /> },
          { label: 'Find Donors & Banks', path: '/find-blood', icon: <Users className="w-5 h-5" /> },
          { label: 'Emergency Dispatch', path: '/emergency', icon: <AlertTriangle className="w-5 h-5" /> },
          { label: 'Notifications', path: '/notifications', icon: <Bell className="w-5 h-5" /> },
          { label: 'Feedback & Support', path: '/feedback', icon: <MessageSquare className="w-5 h-5" /> },
          { label: 'Hospital Profile', path: '/profile', icon: <UserIcon className="w-5 h-5" /> },
        ];
      case 'BLOOD_BANK':
        return [
          { label: 'Bank Overview', path: '/dashboard', icon: <Building2 className="w-5 h-5" /> },
          { label: 'Blood Inventory', path: '/inventory', icon: <Package className="w-5 h-5" /> },
          { label: 'Appointments', path: '/appointments', icon: <Calendar className="w-5 h-5" /> },
          { label: 'Verified Collections', path: '/history', icon: <History className="w-5 h-5" /> },
          { label: 'Active Requests', path: '/requests', icon: <GitPullRequest className="w-5 h-5" /> },
          { label: 'Emergency Network', path: '/emergency', icon: <AlertTriangle className="w-5 h-5" /> },
          { label: 'Notifications', path: '/notifications', icon: <Bell className="w-5 h-5" /> },
          { label: 'Feedback & Support', path: '/feedback', icon: <MessageSquare className="w-5 h-5" /> },
          { label: 'Facility Profile', path: '/profile', icon: <UserIcon className="w-5 h-5" /> },
        ];
      case 'ADMIN':
        return [
          { label: 'Admin Command Center', path: '/admin', icon: <Sparkles className="w-5 h-5" /> },
          { label: 'User Directory', path: '/admin/users', icon: <Users className="w-5 h-5" /> },
          { label: 'Facilities Network', path: '/admin/facilities', icon: <Building2 className="w-5 h-5" /> },
          { label: 'All Inventory', path: '/admin/inventory', icon: <Package className="w-5 h-5" /> },
          { label: 'Emergency Dispatch', path: '/emergency', icon: <AlertTriangle className="w-5 h-5" /> },
          { label: 'Reports & Analytics', path: '/admin/reports', icon: <History className="w-5 h-5" /> },
          { label: 'Notifications', path: '/notifications', icon: <Bell className="w-5 h-5" /> },
          { label: 'User Feedback', path: '/feedback', icon: <MessageSquare className="w-5 h-5" /> },
        ];
      default: // USER
        return [
          { label: 'Dashboard', path: '/dashboard', icon: <Home className="w-5 h-5" /> },
          { label: 'Find Blood', path: '/find-blood', icon: <Droplet className="w-5 h-5" /> },
          { label: 'Request Blood', path: '/requests', icon: <GitPullRequest className="w-5 h-5" /> },
          { label: 'Book Appointment', path: '/appointments', icon: <Calendar className="w-5 h-5" /> },
          { label: 'Emergency Alerts', path: '/emergency', icon: <AlertTriangle className="w-5 h-5" /> },
          { label: 'Notifications', path: '/notifications', icon: <Bell className="w-5 h-5" /> },
          { label: 'Feedback & Support', path: '/feedback', icon: <MessageSquare className="w-5 h-5" /> },
          { label: 'My Profile', path: '/profile', icon: <UserIcon className="w-5 h-5" /> },
        ];
    }
  };

  const navItems = getNavigationForRole();

  const handleLogout = async () => {
    await logout();
    setLogoutConfirmOpen(false);
    navigate('/login');
  };

  const handleNotificationClick = (item) => {
    markAsRead(item._id || item.id);
    setNotifDropdownOpen(false);
    if (
      item.type === 'EMERGENCY' ||
      item.type === 'EMERGENCY_ALERT' ||
      item.meta?.emergencyId ||
      item.emergencyId
    ) {
      navigate('/emergency');
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8F8] flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Modern Role-Aware Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-red-100 flex flex-col
          transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand Header */}
        <div className="h-20 px-6 border-b border-red-100 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#991B1B] to-[#C62828] text-white flex items-center justify-center shadow-md shadow-red-900/20">
              <Droplet className="w-5 h-5 fill-white" />
            </div>
            <div>
              <span className="text-xl font-black text-slate-900 tracking-tight">
                Life<span className="text-[#C62828]">Drop</span>
              </span>
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest -mt-1">
                {userRole} Portal
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Quick Identity Pill */}
        <div className="p-4 mx-4 mt-4 rounded-2xl bg-gradient-to-r from-red-50/60 to-rose-50/30 border border-red-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#C62828] text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden">
              <h5 className="text-sm font-bold text-slate-900 truncate">
                {user?.name || 'Authorized Member'}
              </h5>
              <div className="flex items-center gap-1.5 mt-0.5">
                <StatusBadge status={userRole} size="xs" />
                {user?.bloodGroup && (
                  <span className="text-[10px] font-extrabold text-red-700 bg-red-100/80 px-1.5 py-0.2 rounded">
                    {user.bloodGroup}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.label}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-150
                  ${
                    isActive
                      ? 'bg-gradient-to-r from-[#C62828] to-[#B71C1C] text-white shadow-md shadow-red-900/20'
                      : 'text-slate-600 hover:text-[#C62828] hover:bg-red-50/60'
                  }
                `}
              >
                <span className={isActive ? 'text-white' : 'text-slate-400'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer with SOS trigger and Sign Out */}
        <div className="p-4 border-t border-red-100 space-y-2">
          <Link
            to="/requests?urgency=CRITICAL"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-black text-xs uppercase tracking-wider shadow-sm hover:brightness-105"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Emergency SOS</span>
          </Link>

          <button
            type="button"
            onClick={() => setLogoutConfirmOpen(true)}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main App Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-red-100 sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight capitalize">
                {location.pathname.replace(/^\//, '').replace(/-/g, ' ') || 'Dashboard'}
              </h2>
              <p className="text-xs text-slate-400 font-medium hidden sm:block">
                Welcome back, {user?.name?.split(' ')[0] || 'User'}
              </p>
            </div>
          </div>

          {/* Right Action Icons: Notification Bell + Profile Menu */}
          <div className="flex items-center gap-3">
            {/* Notification Bell Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                aria-label="Notifications"
                className="relative p-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:bg-red-50/50 hover:text-[#C62828] transition-colors focus:outline-none"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#C62828] text-white text-[10px] font-black flex items-center justify-center shadow-md animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popup Menu */}
              {notifDropdownOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-red-100 overflow-hidden z-50 animate-in zoom-in-95 duration-150">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-red-50/50 to-white">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-slate-900">Notifications</h4>
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllAsRead}
                        className="text-xs font-bold text-[#C62828] hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  {browserPermission === 'default' && (
                    <div className="px-4 py-2 bg-red-50/80 border-b border-red-100 flex items-center justify-between gap-2 text-xs">
                      <span className="text-slate-700 font-medium text-[11px]">Desktop emergency alerts</span>
                      <button
                        type="button"
                        onClick={requestBrowserPermission}
                        className="px-2.5 py-1 bg-[#C62828] text-white rounded-lg font-bold text-[10px] hover:bg-red-700 transition-colors shadow-sm"
                      >
                        Enable
                      </button>
                    </div>
                  )}

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-50 p-2">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.slice(0, 6).map((item) => {
                        const isEm =
                          item.type === 'EMERGENCY' ||
                          item.type === 'EMERGENCY_ALERT' ||
                          Boolean(item.meta?.emergencyId || item.emergencyId);

                        return (
                          <div
                            key={item._id || item.id}
                            onClick={() => handleNotificationClick(item)}
                            className={`
                              p-3 rounded-2xl cursor-pointer transition-colors
                              ${
                                isEm
                                  ? 'border-l-4 border-red-600 bg-red-50/70 hover:bg-red-50'
                                  : !item.isRead
                                  ? 'bg-red-50/40 hover:bg-red-50'
                                  : 'hover:bg-slate-50'
                              }
                            `}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <h5 className={`text-xs font-bold leading-tight ${isEm ? 'text-red-900' : 'text-slate-900'}`}>
                                {isEm ? '🚨 ' : ''}{item.title}
                              </h5>
                              <span className="text-[10px] text-slate-400 shrink-0">
                                {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                              {item.message}
                            </p>
                            {isEm && (
                              <span className="text-[10px] font-bold text-[#C62828] mt-1 inline-block">
                                Respond to SOS →
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="p-2 border-t border-slate-100 bg-red-50/20 text-center">
                    <Link
                      to="/notifications"
                      onClick={() => setNotifDropdownOpen(false)}
                      className="text-xs font-bold text-[#C62828] hover:underline block py-1"
                    >
                      View All Notifications →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Menu Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl border border-slate-200 hover:border-red-200 transition-colors focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#991B1B] to-[#C62828] text-white font-black text-xs flex items-center justify-center">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-slate-900 leading-none">
                    {user?.name || 'Account'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    {userRole}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Profile Dropdown Card */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-3 w-64 bg-white rounded-3xl shadow-2xl border border-red-100 overflow-hidden z-50 animate-in zoom-in-95 duration-150">
                  <div className="p-4 border-b border-slate-100 bg-red-50/30">
                    <p className="text-xs font-black text-slate-900">{user?.name}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email}</p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <StatusBadge status={userRole} size="xs" />
                      {user?.bloodGroup && (
                        <span className="text-[10px] font-black text-white bg-[#C62828] px-2 py-0.5 rounded-full">
                          {user.bloodGroup}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-2 space-y-1 text-sm font-bold text-slate-700">
                    <Link
                      to="/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-red-50/70 hover:text-[#C62828] transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-slate-400" />
                      <span>Account Profile</span>
                    </Link>

                    {userRole === 'ADMIN' && (
                      <Link
                        to="/admin"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-purple-700 hover:bg-purple-50 transition-colors"
                      >
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        <span>Admin Console</span>
                      </Link>
                    )}

                    <div className="pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          setLogoutConfirmOpen(true);
                        }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Nested Page Content Canvas */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={logoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        onConfirm={handleLogout}
        title="Sign Out of LifeDrop?"
        message="Are you sure you wish to end your current session? You will need to sign in again to access patient registries and donation logs."
        confirmText="Sign Out"
        cancelText="Stay Signed In"
        isDestructive={false}
      />

      {/* Global Real-Time Emergency Popup for Donors */}
      <GlobalEmergencyPopup />
    </div>
  );
};

export default DashboardLayout;
