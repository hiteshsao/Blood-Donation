import React, { useState } from 'react';
import {
  MapPin,
  Bell,
  Droplet,
  Users,
  Building2,
  ClipboardList,
  Heart,
  ChevronDown,
  AlertCircle,
  Clock,
  CheckCircle2,
  Navigation,
  Sparkles,
  Phone,
  ShieldCheck,
  Search,
} from 'lucide-react';

export const CITIES = [
  'Raigarh, Chhattisgarh',
  'Raipur, Chhattisgarh',
  'Bilaspur, Chhattisgarh',
  'Ambikapur, Chhattisgarh',
  'Durg, Chhattisgarh',
];

export const SAMPLE_NEARBY_REQUESTS = [
  {
    id: 'req-1',
    bloodGroup: 'O+',
    urgency: 'CRITICAL',
    urgencyLabel: 'Urgency',
    urgencyColor: 'bg-red-600 text-white',
    hospitalName: 'Raigarh Civil Hospital',
    distanceKm: '1.2 km',
    units: 2,
    patientName: 'Sanjay Patel',
    timeAgo: '10m ago',
  },
  {
    id: 'req-2',
    bloodGroup: 'A-',
    urgency: 'HIGH',
    urgencyLabel: 'Urgency',
    urgencyColor: 'bg-amber-500 text-white',
    hospitalName: 'Kirodimal Govt Hospital',
    distanceKm: '3.4 km',
    units: 1,
    patientName: 'Anita Sharma',
    timeAgo: '25m ago',
  },
  {
    id: 'req-3',
    bloodGroup: 'B+',
    urgency: 'CRITICAL',
    urgencyLabel: 'Urgency',
    urgencyColor: 'bg-red-600 text-white',
    hospitalName: 'Fortis Escorts Clinic',
    distanceKm: '4.8 km',
    units: 3,
    patientName: 'Ramesh Gupta',
    timeAgo: '42m ago',
  },
  {
    id: 'req-4',
    bloodGroup: 'AB+',
    urgency: 'MODERATE',
    urgencyLabel: 'Standard',
    urgencyColor: 'bg-emerald-600 text-white',
    hospitalName: 'Apollo Hospital Raigarh',
    distanceKm: '6.1 km',
    units: 1,
    patientName: 'Priya Sen',
    timeAgo: '1h ago',
  },
];

export const MobileAppMockup = ({
  onOpenSOS,
  onOpenRequest,
  onOpenDonate,
  onOpenDonors,
  onOpenBloodBanks,
  onOpenRequestsList,
  onOpenNotifications,
  onOpenProfile,
  selectedCity,
  setSelectedCity,
}) => {
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [mobileTab, setMobileTab] = useState('home'); // 'home' | 'requests' | 'notifications' | 'profile'
  const [respondedRequests, setRespondedRequests] = useState({});

  const handleRespond = (id) => {
    setRespondedRequests((prev) => ({
      ...prev,
      [id]: prev[id] === 'ACCEPTED' ? null : 'ACCEPTED',
    }));
  };

  const filteredRequests = SAMPLE_NEARBY_REQUESTS.filter((req) => {
    if (activeFilter === 'ALL' || activeFilter === 'Green') return true;
    return req.bloodGroup === activeFilter;
  });

  return (
    <div className="lifedrop-phone-frame-wrapper flex justify-center items-center py-4">
      {/* Smartphone Device Shell */}
      <div className="lifedrop-phone-frame relative w-[385px] h-[780px] bg-[#0A0A0A] rounded-[52px] p-[12px] shadow-[0_25px_70px_rgba(198,40,40,0.22),0_12px_30px_rgba(0,0,0,0.35)] border-[4px] border-[#2A2A2A] ring-1 ring-white/10 select-none overflow-hidden flex flex-col">
        {/* Dynamic Island / Top Camera Notch */}
        <div className="absolute top-[16px] left-1/2 -translate-x-1/2 w-[116px] h-[26px] bg-black rounded-full z-50 flex items-center justify-between px-3 pointer-events-none">
          <div className="w-2.5 h-2.5 rounded-full bg-[#18181B] ring-1 ring-white/10" />
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#C62828] animate-pulse" />
            <span className="text-[10px] text-white/70 font-mono">SOS</span>
          </div>
        </div>

        {/* Side Button Accents */}
        <div className="absolute -left-[6px] top-[115px] w-[3px] h-[36px] bg-[#333] rounded-l-sm" />
        <div className="absolute -left-[6px] top-[165px] w-[3px] h-[50px] bg-[#333] rounded-l-sm" />
        <div className="absolute -left-[6px] top-[225px] w-[3px] h-[50px] bg-[#333] rounded-l-sm" />
        <div className="absolute -right-[6px] top-[160px] w-[3px] h-[65px] bg-[#333] rounded-r-sm" />

        {/* Inner Phone Screen */}
        <div className="lifedrop-screen-container relative w-full h-full bg-[#FDF8F8] rounded-[42px] overflow-hidden flex flex-col font-sans">
          {/* Subtle Heartbeat Pulse Background Line */}
          <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
            <svg
              className="absolute top-1/3 left-0 w-[600px] h-[200px] -translate-x-20 text-[#C62828]"
              viewBox="0 0 600 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0 100 L120 100 L150 40 L180 160 L210 70 L240 120 L270 100 L600 100"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Top Status Bar */}
          <div className="pt-3 px-6 pb-2 flex justify-between items-center text-[12px] font-semibold text-[#0F172A] z-40">
            <span>9:41</span>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[10px]">5G</span>
              <div className="w-5 h-2.5 border border-[#0F172A] rounded-sm p-[1px] flex items-center">
                <div className="h-full w-full bg-[#0F172A] rounded-xs" />
              </div>
            </div>
          </div>

          {/* App Header Bar */}
          <div className="px-5 pt-1 pb-3 flex items-center justify-between z-30">
            {/* Location Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setCityDropdownOpen(!cityDropdownOpen)}
                className="flex items-center gap-1.5 text-[#0F172A] hover:text-[#C62828] transition-colors focus:outline-none"
              >
                <div className="w-7 h-7 rounded-full bg-[#FFE5E5] flex items-center justify-center text-[#C62828]">
                  <MapPin size={15} className="fill-[#C62828]" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold leading-tight">
                      {selectedCity.split(',')[0]}
                    </span>
                    <ChevronDown size={13} className="text-[#64748B]" />
                  </div>
                  <span className="text-[10px] text-[#64748B] block leading-none">
                    {selectedCity.split(',')[1] || 'Chhattisgarh'}
                  </span>
                </div>
              </button>

              {/* City Dropdown Menu */}
              {cityDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-red-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
                    Select Operating City
                  </div>
                  {CITIES.map((city) => (
                    <button
                      key={city}
                      onClick={() => {
                        setSelectedCity(city);
                        setCityDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#FFF5F5] transition-colors ${
                        selectedCity === city
                          ? 'font-bold text-[#C62828] bg-[#FFF0F0]'
                          : 'text-[#334155]'
                      }`}
                    >
                      <span>{city}</span>
                      {selectedCity === city && <CheckCircle2 size={13} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notification Bell with Badge */}
            <button
              type="button"
              onClick={onOpenNotifications}
              className="relative w-9 h-9 rounded-full bg-white shadow-sm border border-red-50 flex items-center justify-center text-[#334155] hover:text-[#C62828] hover:border-red-200 transition-all"
              title="Notifications"
            >
              <Bell size={17} />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#C62828] rounded-full ring-2 ring-white animate-pulse" />
            </button>
          </div>

          {/* Scrollable Main Content */}
          <div className="flex-1 overflow-y-auto px-5 pb-24 space-y-4 no-scrollbar z-20">
            {/* ── 1. Hero Blood Service Card ── */}
            <div className="lifedrop-hero-card relative overflow-hidden rounded-[26px] p-5 text-white shadow-[0_12px_32px_rgba(198,40,40,0.32)]">
              {/* Background Gradient */}
              <div
                className="absolute inset-0 z-0"
                style={{
                  background: 'linear-gradient(135deg, #B71C1C 0%, #D32F2F 55%, #E53935 100%)',
                }}
              />

              {/* Decorative Subtle Circles */}
              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
              <div className="absolute right-12 -bottom-10 w-24 h-24 rounded-full bg-black/10 pointer-events-none" />

              {/* Content */}
              <div className="relative z-10 flex flex-col items-center text-center">
                {/* White Circle Icon Container with Blood Droplet */}
                <div className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center mb-2.5">
                  <svg
                    viewBox="0 0 100 115"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-7 h-7"
                  >
                    <path
                      d="M50 8 C50 8 16 48 16 74 C16 93 31.2 108 50 108 C68.8 108 84 93 84 74 C84 48 50 8 50 8 Z"
                      fill="#C62828"
                    />
                    <path
                      d="M20 74 L32 74 L37 62 L44 88 L49 68 L53 77 L57 74 L80 74"
                      stroke="#FFFFFF"
                      strokeWidth="6"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <h2 className="text-base font-extrabold tracking-wide uppercase text-white mb-0.5" style={{ letterSpacing: '0.04em' }}>
                  BLOOD SERVICE
                </h2>
                <p className="text-xs text-white/90 font-medium mb-4">
                  Every Drop Can Save a Life
                </p>

                {/* 2 Action Buttons: Request Blood & Donate Blood */}
                <div className="w-full flex items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={onOpenRequest}
                    className="flex-1 py-2 px-3 rounded-full border border-white/70 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-xs transition-all active:scale-95 shadow-xs"
                  >
                    Request Blood
                  </button>

                  <button
                    type="button"
                    onClick={onOpenDonate}
                    className="flex-1 py-2 px-3 rounded-full bg-white hover:bg-red-50 text-[#C62828] text-xs font-bold transition-all active:scale-95 shadow-md"
                  >
                    Donate Blood
                  </button>
                </div>
              </div>
            </div>

            {/* ── 2. Quick Access (4 Circular Buttons) ── */}
            <div>
              <div className="flex items-center justify-between mb-2 px-0.5">
                <span className="text-xs font-bold text-[#0F172A] tracking-tight">
                  Quick Access
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {/* 1. Nearby Donors */}
                <button
                  type="button"
                  onClick={onOpenDonors}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white hover:bg-red-50/50 border border-red-50 shadow-xs hover:shadow-sm transition-all group active:scale-95"
                >
                  <div className="w-11 h-11 rounded-full bg-[#FFE8E8] group-hover:bg-[#FFD7D7] flex items-center justify-center text-[#C62828] transition-colors shadow-inner">
                    <MapPin size={18} className="fill-[#C62828]" />
                  </div>
                  <span className="text-[11px] font-semibold text-[#1E293B] text-center leading-tight">
                    Nearby<br />Donors
                  </span>
                </button>

                {/* 2. Blood Banks */}
                <button
                  type="button"
                  onClick={onOpenBloodBanks}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white hover:bg-red-50/50 border border-red-50 shadow-xs hover:shadow-sm transition-all group active:scale-95"
                >
                  <div className="w-11 h-11 rounded-full bg-[#FFE8E8] group-hover:bg-[#FFD7D7] flex items-center justify-center text-[#C62828] transition-colors shadow-inner">
                    <Droplet size={18} className="fill-[#C62828]" />
                  </div>
                  <span className="text-[11px] font-semibold text-[#1E293B] text-center leading-tight">
                    Blood<br />Banks
                  </span>
                </button>

                {/* 3. My Requests */}
                <button
                  type="button"
                  onClick={onOpenRequestsList}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white hover:bg-red-50/50 border border-red-50 shadow-xs hover:shadow-sm transition-all group active:scale-95"
                >
                  <div className="w-11 h-11 rounded-full bg-[#FFE8E8] group-hover:bg-[#FFD7D7] flex items-center justify-center text-[#C62828] transition-colors shadow-inner">
                    <ClipboardList size={18} />
                  </div>
                  <span className="text-[11px] font-semibold text-[#1E293B] text-center leading-tight">
                    My<br />Requests
                  </span>
                </button>

                {/* 4. Notifications */}
                <button
                  type="button"
                  onClick={onOpenNotifications}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white hover:bg-red-50/50 border border-red-50 shadow-xs hover:shadow-sm transition-all group active:scale-95"
                >
                  <div className="w-11 h-11 rounded-full bg-[#FFE8E8] group-hover:bg-[#FFD7D7] flex items-center justify-center text-[#C62828] transition-colors shadow-inner">
                    <Bell size={18} />
                  </div>
                  <span className="text-[11px] font-semibold text-[#1E293B] text-center leading-tight">
                    Notifi-<br />cations
                  </span>
                </button>
              </div>
            </div>

            {/* ── 3. Nearby Blood Requests Section ── */}
            <div>
              <div className="flex items-center justify-between mb-2 px-0.5">
                <span className="text-xs font-bold text-[#0F172A] tracking-tight">
                  Nearby Blood Requests
                </span>
                <span className="text-xs text-[#94A3B8] font-bold tracking-widest cursor-pointer hover:text-[#C62828]">
                  •••
                </span>
              </div>

              {/* Request Cards (2 Columns matching mockup) */}
              <div className="grid grid-cols-2 gap-2.5 mb-2.5">
                {filteredRequests.slice(0, 2).map((req) => (
                  <div
                    key={req.id}
                    className="bg-white rounded-2xl p-3 border border-red-100/70 shadow-sm flex flex-col justify-between hover:shadow-md transition-all hover:border-red-200"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-full bg-[#C62828] text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                          {req.bloodGroup}
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-[#C62828]">
                          {req.units} Unit{req.units > 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Urgency Badge */}
                      <div className="mb-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${req.urgencyColor}`}>
                          {req.urgencyLabel}
                        </span>
                      </div>

                      {/* Distance & Hospital */}
                      <div className="space-y-0.5 mb-2.5">
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-[#0F172A] truncate">
                          <MapPin size={11} className="text-[#C62828] flex-shrink-0" />
                          <span className="truncate">{req.distanceKm}</span>
                        </div>
                        <p className="text-[10px] text-[#64748B] truncate pl-3.5">
                          {req.hospitalName}
                        </p>
                      </div>
                    </div>

                    {/* Respond Action Button */}
                    <button
                      type="button"
                      onClick={() => handleRespond(req.id)}
                      className={`w-full py-1.5 rounded-xl text-[11px] font-bold transition-all active:scale-95 ${
                        respondedRequests[req.id] === 'ACCEPTED'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-[#FFF0F0] text-[#C62828] hover:bg-[#C62828] hover:text-white'
                      }`}
                    >
                      {respondedRequests[req.id] === 'ACCEPTED' ? '✓ Accepted' : 'Respond'}
                    </button>
                  </div>
                ))}
              </div>

              {/* Blood Group Filter Chips (O+, A-, B+, Green/Available) */}
              <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
                {['ALL', 'O+', 'A-', 'B+', 'Green'].map((grp) => (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => setActiveFilter(grp)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex-shrink-0 ${
                      activeFilter === grp
                        ? grp === 'Green'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-[#C62828] text-white shadow-xs'
                        : grp === 'Green'
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-white text-[#475569] border border-slate-200 hover:border-red-300'
                    }`}
                  >
                    {grp === 'Green' ? 'Available' : grp === 'ALL' ? 'All Types' : grp}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── 4. Bottom Navigation Bar with Floating Center SOS Button ── */}
          <div className="absolute bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-red-100/60 px-4 py-2 z-40">
            <div className="flex items-center justify-between relative">
              {/* Home */}
              <button
                type="button"
                onClick={() => setMobileTab('home')}
                className={`flex flex-col items-center gap-0.5 flex-1 ${
                  mobileTab === 'home' ? 'text-[#C62828]' : 'text-[#94A3B8]'
                }`}
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                  </svg>
                </div>
                <span className="text-[10px] font-bold">Home</span>
              </button>

              {/* Requests */}
              <button
                type="button"
                onClick={() => {
                  setMobileTab('requests');
                  onOpenRequestsList();
                }}
                className={`flex flex-col items-center gap-0.5 flex-1 pr-3 ${
                  mobileTab === 'requests' ? 'text-[#C62828]' : 'text-[#94A3B8]'
                }`}
              >
                <ClipboardList size={18} />
                <span className="text-[10px] font-bold">Requests</span>
              </button>

              {/* Center Elevated Floating SOS Button */}
              <div className="relative -top-5 flex flex-col items-center">
                <button
                  type="button"
                  onClick={onOpenSOS}
                  className="lifedrop-sos-btn relative w-14 h-14 rounded-full bg-gradient-to-tr from-[#991B1B] via-[#C62828] to-[#EF4444] text-white flex flex-col items-center justify-center font-black tracking-wider shadow-[0_8px_24px_rgba(198,40,40,0.55)] hover:scale-105 active:scale-95 transition-all ring-4 ring-white"
                  title="Instant Emergency Blood SOS"
                >
                  {/* Pulsing ring animation */}
                  <span className="absolute -inset-1 rounded-full bg-red-500 opacity-40 animate-ping pointer-events-none" />
                  <span className="text-xs font-black leading-none tracking-widest">SOS</span>
                </button>
              </div>

              {/* Notifications */}
              <button
                type="button"
                onClick={() => {
                  setMobileTab('notifications');
                  onOpenNotifications();
                }}
                className={`flex flex-col items-center gap-0.5 flex-1 pl-3 ${
                  mobileTab === 'notifications' ? 'text-[#C62828]' : 'text-[#94A3B8]'
                }`}
              >
                <Bell size={18} />
                <span className="text-[10px] font-bold">Alerts</span>
              </button>

              {/* Profile */}
              <button
                type="button"
                onClick={() => {
                  setMobileTab('profile');
                  onOpenProfile();
                }}
                className={`flex flex-col items-center gap-0.5 flex-1 ${
                  mobileTab === 'profile' ? 'text-[#C62828]' : 'text-[#94A3B8]'
                }`}
              >
                <div className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px] font-bold">
                  👤
                </div>
                <span className="text-[10px] font-bold">Profile</span>
              </button>
            </div>

            {/* iPhone Home Indicator bar */}
            <div className="w-32 h-1 bg-slate-300 rounded-full mx-auto mt-2" />
          </div>
        </div>
      </div>
    </div>
  );
};
