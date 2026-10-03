import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldAlert,
  Users,
  HeartHandshake,
  Building2,
  Package,
  GitPullRequest,
  Radio,
  FileBarChart,
  ClipboardList,
  LogOut,
  Menu,
  X,
  Droplet,
  ExternalLink,
  Activity,
  Bell,
  Heart,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { ConfirmDialog } from '../components/common';

export const AdminLayout = () => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const adminNav = [
    { label: 'Overview & Stats', path: '/admin', icon: <Activity className="w-4 h-4" /> },
    { label: 'User Registry', path: '/admin/users', icon: <Users className="w-4 h-4" /> },
    { label: 'Donors Verification', path: '/admin/donors', icon: <HeartHandshake className="w-4 h-4" /> },
    { label: 'Hospitals & Blood Banks', path: '/admin/facilities', icon: <Building2 className="w-4 h-4" /> },
    { label: 'Inventory Control', path: '/admin/inventory', icon: <Package className="w-4 h-4" /> },
    { label: 'Blood Requests', path: '/admin/requests', icon: <GitPullRequest className="w-4 h-4" /> },
    { label: 'Live Emergencies', path: '/admin/emergency', icon: <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" /> },
    { label: 'Donations Audit', path: '/admin/donations', icon: <Heart className="w-4 h-4" /> },
    { label: 'Broadcast Announcements', path: '/admin/broadcast', icon: <Radio className="w-4 h-4" /> },
    { label: 'Reports & Exports', path: '/admin/reports', icon: <FileBarChart className="w-4 h-4" /> },
    { label: 'Complaints & Grievances', path: '/admin/complaints', icon: <MessageSquare className="w-4 h-4" /> },
    { label: 'Audit Trail Logs', path: '/admin/audit-logs', icon: <ClipboardList className="w-4 h-4" /> },
  ];

  const handleLogout = async () => {
    await logout();
    setLogoutConfirmOpen(false);
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex font-sans">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Admin Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 w-72 bg-[#1E293B] border-r border-slate-800 flex flex-col
          transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand */}
        <div className="h-20 px-6 border-b border-slate-800 flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 to-[#C62828] text-white flex items-center justify-center shadow-lg shadow-red-900/40">
              <Droplet className="w-5 h-5 fill-white" />
            </div>
            <div>
              <span className="text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                Life<span className="text-red-500">Drop</span>
                <span className="px-1.5 py-0.5 rounded bg-red-950/80 border border-red-800/80 text-[10px] font-black text-red-400 uppercase">
                  Admin
                </span>
              </span>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest -mt-0.5">
                Central Operations
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {adminNav.map((item) => {
            const isActive =
              item.path === '/admin'
                ? location.pathname === '/admin'
                : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.label}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150
                  ${
                    isActive
                      ? 'bg-gradient-to-r from-red-600 to-[#C62828] text-white shadow-md shadow-red-950/50'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
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

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <Link
            to="/"
            target="_blank"
            className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Public Portal</span>
            </span>
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">Live</span>
          </Link>

          <button
            type="button"
            onClick={() => setLogoutConfirmOpen(true)}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-950/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Admin Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Admin Content Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Command Bar */}
        <header className="h-20 bg-[#1E293B]/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:bg-slate-800"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div>
              <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                <span>Administrative Console</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                {user?.name || 'Chief Administrator'} ({user?.email || 'admin@lifedrop.org'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span>Network Active: All Hubs Synchronized</span>
            </div>

            <button
              type="button"
              onClick={() => setLogoutConfirmOpen(true)}
              className="p-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content Canvas */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      <ConfirmDialog
        isOpen={logoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        onConfirm={handleLogout}
        title="Exit Admin Console?"
        message="Ending your administrative session will revoke active operational elevation tokens."
        confirmText="Sign Out"
        cancelText="Cancel"
      />
    </div>
  );
};

export default AdminLayout;
