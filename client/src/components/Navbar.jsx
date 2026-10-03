import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LifeDropLogo } from './LifeDropLogo';
import {
  MapPin,
  ChevronDown,
  Menu,
  X,
  User,
  Clock,
  Building2,
  Droplet,
  LogOut,
  LogIn,
  PlusCircle,
  Radio,
  Search,
  CheckCircle2,
  ShieldCheck,
  Bell,
} from 'lucide-react';

const CITIES = [
  'Raigarh, Chhattisgarh',
  'Raipur, Chhattisgarh',
  'Bilaspur, Chhattisgarh',
  'Ambikapur, Chhattisgarh',
  'Durg, Chhattisgarh',
];

export const Navbar = ({
  activePage,
  setActivePage,
  onOpenAuth,
  onOpenSOS,
  onOpenNotifications,
  selectedCity = 'Raigarh, Chhattisgarh',
  setSelectedCity,
}) => {
  const { user, donorProfile, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);

  const safeCity = selectedCity || 'Raigarh, Chhattisgarh';

  const handleNavClick = (page) => {
    setActivePage(page);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-red-100 sticky top-0 z-40 shadow-xs font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
        {/* Left: Brand Logo & Tagline */}
        <div className="flex items-center gap-6">
          <div
            className="cursor-pointer"
            onClick={() => handleNavClick('home')}
          >
            <LifeDropLogo size="default" showTagline={false} />
          </div>

          {/* Location Selector Pill (Desktop) */}
          <div className="hidden lg:relative lg:inline-block">
            <button
              type="button"
              onClick={() => setCityDropdownOpen(!cityDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFF5F5] hover:bg-[#FFEAEA] text-xs font-bold text-[#0F172A] border border-red-100 transition-all"
            >
              <MapPin size={13} className="text-[#C62828]" />
              <span>{safeCity.split(',')[0]}</span>
              <ChevronDown size={12} className="text-[#64748B]" />
            </button>

            {cityDropdownOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-52 bg-white rounded-2xl shadow-xl border border-red-100 py-1.5 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1 text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
                  Operating Location
                </div>
                {CITIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setSelectedCity(c);
                      setCityDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#FFF5F5] ${
                      selectedCity === c ? 'font-bold text-[#C62828] bg-[#FFF0F0]' : 'text-[#334155]'
                    }`}
                  >
                    <span>{c}</span>
                    {selectedCity === c && <CheckCircle2 size={13} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center / Right: Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-xs font-bold">
          <button
            onClick={() => handleNavClick('home')}
            className={`px-3 py-2 rounded-full transition-all ${
              activePage === 'home'
                ? 'bg-[#FFF0F0] text-[#C62828]'
                : 'text-[#334155] hover:text-[#C62828] hover:bg-red-50/50'
            }`}
          >
            Home
          </button>

          <button
            onClick={() => handleNavClick('donors')}
            className={`px-3 py-2 rounded-full transition-all ${
              activePage === 'donors'
                ? 'bg-[#FFF0F0] text-[#C62828]'
                : 'text-[#334155] hover:text-[#C62828] hover:bg-red-50/50'
            }`}
          >
            Find Donors
          </button>

          <button
            onClick={() => handleNavClick('bloodbanks')}
            className={`px-3 py-2 rounded-full transition-all ${
              activePage === 'bloodbanks'
                ? 'bg-[#FFF0F0] text-[#C62828]'
                : 'text-[#334155] hover:text-[#C62828] hover:bg-red-50/50'
            }`}
          >
            Blood Banks
          </button>

          <button
            onClick={() => handleNavClick('requests')}
            className={`px-3 py-2 rounded-full transition-all ${
              activePage === 'requests'
                ? 'bg-[#FFF0F0] text-[#C62828]'
                : 'text-[#334155] hover:text-[#C62828] hover:bg-red-50/50'
            }`}
          >
            Blood Requests
          </button>

          {isAuthenticated && (
            <>
              <button
                onClick={() => handleNavClick('profile')}
                className={`px-3 py-2 rounded-full transition-all ${
                  activePage === 'profile'
                    ? 'bg-[#FFF0F0] text-[#C62828]'
                    : 'text-[#334155] hover:text-[#C62828] hover:bg-red-50/50'
                }`}
              >
                My Profile
              </button>

              <button
                onClick={() => handleNavClick('history')}
                className={`px-3 py-2 rounded-full transition-all ${
                  activePage === 'history'
                    ? 'bg-[#FFF0F0] text-[#C62828]'
                    : 'text-[#334155] hover:text-[#C62828] hover:bg-red-50/50'
                }`}
              >
                History
              </button>

              <button
                onClick={() => handleNavClick('hospitals')}
                className={`px-3 py-2 rounded-full transition-all ${
                  activePage === 'hospitals'
                    ? 'bg-[#FFF0F0] text-[#C62828]'
                    : 'text-[#334155] hover:text-[#C62828] hover:bg-red-50/50'
                }`}
              >
                Hospitals
              </button>

              <button
                onClick={() => handleNavClick('inventory')}
                className={`px-3 py-2 rounded-full transition-all ${
                  activePage === 'inventory'
                    ? 'bg-[#FFF0F0] text-[#C62828]'
                    : 'text-[#334155] hover:text-[#C62828] hover:bg-red-50/50'
                }`}
              >
                Inventory
              </button>
            </>
          )}

          <button
            onClick={() => handleNavClick('facility-signup')}
            className={`px-3 py-2 rounded-full transition-all ${
              activePage === 'facility-signup'
                ? 'bg-[#FFF0F0] text-[#C62828]'
                : 'text-[#334155] hover:text-[#C62828] hover:bg-red-50/50'
            }`}
          >
            Facility Portal
          </button>

          {/* SOS Trigger */}
          <button
            type="button"
            onClick={onOpenSOS}
            className="ml-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#991B1B] via-[#C62828] to-[#EF4444] text-white text-xs font-black shadow-sm hover:shadow-md active:scale-95 transition-all flex items-center gap-1.5"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>SOS BROADCAST</span>
          </button>

          {/* Notifications Bell */}
          <button
            type="button"
            onClick={onOpenNotifications}
            title="Notifications"
            className="relative p-2 rounded-full text-slate-600 hover:text-[#C62828] hover:bg-red-50/80 transition-colors ml-1"
          >
            <Bell size={18} />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#C62828] border-2 border-white animate-pulse" />
          </button>

          {/* Auth Button */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 ml-1">
              <button
                onClick={() => handleNavClick('profile')}
                className="flex items-center gap-1.5 p-1 pr-2 rounded-full hover:bg-red-50/60 transition-all text-left"
                title="View Profile"
              >
                {user?.bloodGroup && (
                  <span className="w-7 h-7 rounded-full bg-[#C62828] text-white font-extrabold text-[11px] flex items-center justify-center shadow-2xs shrink-0">
                    {user.bloodGroup}
                  </span>
                )}
                <div className="hidden lg:block">
                  <span className="text-xs font-bold text-[#0F172A] block leading-tight truncate max-w-[110px]">
                    {user?.name?.split(' ')[0] || 'User'}
                  </span>
                  <span className="text-[10px] font-extrabold text-[#C62828] uppercase leading-tight">
                    {user?.role || 'DONOR'}
                  </span>
                </div>
              </button>

              <button
                onClick={logout}
                title="Sign out"
                className="p-1.5 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="ml-1 px-4 py-2 rounded-full bg-[#FFF0F0] hover:bg-[#C62828] text-[#C62828] hover:text-white border border-red-200 hover:border-[#C62828] font-bold text-xs shadow-2xs active:scale-95 transition-all flex items-center gap-1.5"
            >
              <User size={14} />
              <span>Sign In</span>
            </button>
          )}
        </nav>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            onClick={onOpenSOS}
            className="px-3 py-1.5 rounded-full bg-[#C62828] text-white text-[11px] font-black shadow-xs flex items-center gap-1"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            <span>SOS</span>
          </button>

          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative p-1.5 text-slate-700 hover:text-[#C62828]"
            title="Notifications"
          >
            <Bell size={19} />
            <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-[#C62828]" />
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-700 hover:text-[#C62828] focus:outline-none"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-red-100 px-4 py-4 space-y-2 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-xs font-bold text-[#64748B]">Operating City:</span>
            <select
              value={safeCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="text-xs font-bold text-[#C62828] bg-[#FFF5F5] px-2.5 py-1 rounded-lg border border-red-200"
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col space-y-1 text-sm font-bold text-[#0F172A]">
            <button
              onClick={() => handleNavClick('home')}
              className={`text-left px-3 py-2 rounded-xl ${activePage === 'home' ? 'bg-[#FFF0F0] text-[#C62828]' : ''}`}
            >
              Home
            </button>
            <button
              onClick={() => handleNavClick('donors')}
              className={`text-left px-3 py-2 rounded-xl ${activePage === 'donors' ? 'bg-[#FFF0F0] text-[#C62828]' : ''}`}
            >
              Find Donors
            </button>
            <button
              onClick={() => handleNavClick('bloodbanks')}
              className={`text-left px-3 py-2 rounded-xl ${activePage === 'bloodbanks' ? 'bg-[#FFF0F0] text-[#C62828]' : ''}`}
            >
              Blood Banks & Inventory
            </button>
            <button
              onClick={() => handleNavClick('requests')}
              className={`text-left px-3 py-2 rounded-xl ${activePage === 'requests' ? 'bg-[#FFF0F0] text-[#C62828]' : ''}`}
            >
              Blood Requests
            </button>

            {isAuthenticated ? (
              <>
                <button
                  onClick={() => handleNavClick('profile')}
                  className={`text-left px-3 py-2 rounded-xl ${activePage === 'profile' ? 'bg-[#FFF0F0] text-[#C62828]' : ''}`}
                >
                  My Profile
                </button>
                <button
                  onClick={() => handleNavClick('history')}
                  className={`text-left px-3 py-2 rounded-xl ${activePage === 'history' ? 'bg-[#FFF0F0] text-[#C62828]' : ''}`}
                >
                  Donation History
                </button>
                <button
                  onClick={() => handleNavClick('hospitals')}
                  className={`text-left px-3 py-2 rounded-xl ${activePage === 'hospitals' ? 'bg-[#FFF0F0] text-[#C62828]' : ''}`}
                >
                  Hospitals
                </button>
                <button
                  onClick={() => handleNavClick('inventory')}
                  className={`text-left px-3 py-2 rounded-xl ${activePage === 'inventory' ? 'bg-[#FFF0F0] text-[#C62828]' : ''}`}
                >
                  Blood Inventory
                </button>
                <button
                  onClick={logout}
                  className="text-left px-3 py-2 rounded-xl text-red-600 flex items-center gap-1.5"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={() => {
                    handleNavClick('facility-signup');
                  }}
                  className="w-full py-2.5 rounded-xl bg-red-50 text-[#C62828] text-center font-bold text-xs"
                >
                  Facility Portal Signup
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth();
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#C62828] text-white text-center font-bold text-xs shadow-md"
                >
                  Sign In to Account
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
