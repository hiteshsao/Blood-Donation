import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Droplet, Heart, Shield, PhoneCall, AlertCircle, Menu, X, ArrowRight, User as UserIcon, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common';

export const PublicLayout = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'How It Works', path: '/#how-it-works' },
    { label: 'Find Donors', path: '/donors' },
    { label: 'Blood Requests', path: '/requests' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF8F8] text-slate-900 font-sans selection:bg-red-200 selection:text-red-900">
      {/* 24/7 Emergency Alert Banner */}
      <div className="bg-gradient-to-r from-[#991B1B] to-[#C62828] text-white px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-3">
        <span className="inline-flex items-center gap-1.5 bg-red-800/80 px-2 py-0.5 rounded-full uppercase tracking-wider text-[10px]">
          <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
          Live Network
        </span>
        <span>
          National Emergency Transfusion Helpline: <strong>108 / 104</strong> (24x7 Toll-Free)
        </span>
      </div>

      {/* Main Public Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-red-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#991B1B] to-[#C62828] text-white flex items-center justify-center shadow-md shadow-red-900/20 group-hover:scale-105 transition-transform duration-200">
              <Droplet className="w-6 h-6 fill-white" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-slate-900 flex items-center">
                Life<span className="text-[#C62828]">Drop</span>
              </span>
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest -mt-1">
                Transfusion Network
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.label}
                  to={link.path}
                  className={`
                    px-4 py-2 rounded-xl text-sm font-bold transition-all
                    ${
                      isActive
                        ? 'bg-red-50 text-[#C62828]'
                        : 'text-slate-600 hover:text-[#C62828] hover:bg-red-50/50'
                    }
                  `}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Direct Emergency SOS Trigger */}
            <Link to="/requests?urgency=CRITICAL">
              <Button
                variant="sos"
                size="sm"
                className="shadow-sm"
                leftIcon={<AlertCircle className="w-4 h-4" />}
              >
                Emergency SOS
              </Button>
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <Link to={user?.role === 'ADMIN' ? '/admin' : '/dashboard'}>
                  <Button
                    variant="primary"
                    size="sm"
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Dashboard ({user?.role})
                  </Button>
                </Link>
                <button
                  onClick={logout}
                  title="Logout"
                  className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">
                    Register
                  </Button>
                </Link>
                <Link
                  to="/admin/login"
                  className="text-xs font-bold text-slate-400 hover:text-[#C62828] px-2 py-1 transition-colors"
                  title="Official Administrator Entrance"
                >
                  <Shield className="w-4 h-4 inline-block mr-1" />
                  Admin
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Toggle */}
          <div className="md:hidden flex items-center gap-2">
            <Link to="/requests?urgency=CRITICAL">
              <span className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-black text-xs uppercase animate-pulse">
                SOS
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-red-100 px-4 pt-3 pb-6 space-y-3">
            <div className="space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-base font-bold text-slate-700 hover:bg-red-50 hover:text-[#C62828]"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2">
              {isAuthenticated ? (
                <>
                  <Link
                    to={user?.role === 'ADMIN' ? '/admin' : '/dashboard'}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block"
                  >
                    <Button variant="primary" size="md" fullWidth>
                      Open Dashboard
                    </Button>
                  </Link>
                  <Button variant="ghost" size="md" fullWidth onClick={logout}>
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="block">
                    <Button variant="secondary" size="md" fullWidth>
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="block">
                    <Button variant="primary" size="md" fullWidth>
                      Register Account
                    </Button>
                  </Link>
                  <Link
                    to="/admin/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-center text-xs font-bold text-slate-500 py-1"
                  >
                    Administrator Portal
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Global Comprehensive Footer */}
      <footer className="bg-white border-t border-red-100 pt-16 pb-12 mt-20 text-slate-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-100">
            {/* Col 1: Brand Info */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#991B1B] to-[#C62828] text-white flex items-center justify-center shadow-md">
                  <Droplet className="w-5 h-5 fill-white" />
                </div>
                <span className="text-xl font-black text-slate-900">
                  Life<span className="text-[#C62828]">Drop</span>
                </span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
                Next-generation clinical blood donation and transfusion orchestration platform.
                Connecting voluntary donors, certified blood banks, and trauma centers in real-time.
              </p>
              <div className="flex items-center gap-3 text-xs font-bold text-[#C62828]">
                <Heart className="w-4 h-4 fill-[#C62828]" />
                <span>Every Drop Counts. Every Second Matters.</span>
              </div>
            </div>

            {/* Col 2: Navigation */}
            <div>
              <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-4">
                Platform
              </h5>
              <ul className="space-y-2 text-sm font-medium">
                <li><Link to="/donors" className="hover:text-[#C62828]">Find Donors</Link></li>
                <li><Link to="/requests" className="hover:text-[#C62828]">Blood Requests</Link></li>
                <li><Link to="/register" className="hover:text-[#C62828]">Register as Donor</Link></li>
                <li><Link to="/register?role=HOSPITAL" className="hover:text-[#C62828]">Hospital Onboarding</Link></li>
                <li><Link to="/register?role=BLOOD_BANK" className="hover:text-[#C62828]">Blood Bank Network</Link></li>
              </ul>
            </div>

            {/* Col 3: Compatibility */}
            <div>
              <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-4">
                Emergency Guide
              </h5>
              <div className="text-xs space-y-2 bg-[#FFF8F8] p-3.5 rounded-xl border border-red-100">
                <p>
                  <strong className="text-[#C62828]">O- Negative:</strong> Universal red cell donor for all patients.
                </p>
                <p>
                  <strong className="text-[#C62828]">AB+ Positive:</strong> Universal recipient of all blood groups.
                </p>
              </div>
            </div>

            {/* Col 4: Contacts & Emergency */}
            <div>
              <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-4">
                Emergency 24x7
              </h5>
              <ul className="space-y-3 text-xs font-bold">
                <li className="flex items-center gap-2 text-red-600">
                  <PhoneCall className="w-4 h-4" />
                  <span>National Helpline: 108 / 104</span>
                </li>
                <li className="flex items-center gap-2 text-slate-600">
                  <Shield className="w-4 h-4" />
                  <span>NABH & CDSCO Standard Compliant</span>
                </li>
                <li>
                  <Link
                    to="/admin/login"
                    className="inline-block text-[#C62828] hover:underline"
                  >
                    Hospital Admin Access →
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-medium">
            <p>© {new Date().getFullYear()} LifeDrop Transfusion Network. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <span className="hover:text-slate-600 cursor-pointer">Privacy Policy</span>
              <span className="hover:text-slate-600 cursor-pointer">Terms of Service</span>
              <span className="hover:text-slate-600 cursor-pointer">Clinical Ethics</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
