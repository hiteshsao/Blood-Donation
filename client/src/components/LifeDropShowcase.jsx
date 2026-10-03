import React from 'react';
import {
  LifeDropLogo,
} from './LifeDropLogo';
import {
  MobileAppMockup,
  CITIES,
} from './MobileAppMockup';
import {
  Users,
  ShieldCheck,
  Headphones,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Heart,
  Droplet,
  Smartphone,
  ExternalLink,
  Flame,
  Activity,
  Layers,
} from 'lucide-react';

export const LifeDropShowcase = ({
  onOpenSOS,
  onOpenRequest,
  onOpenDonate,
  onOpenDonors,
  onOpenBloodBanks,
  onOpenRequestsList,
  onOpenNotifications,
  onOpenProfile,
  onSwitchToDashboard,
  selectedCity,
  setSelectedCity,
}) => {
  const citiesList = ['Raigarh', 'Raipur', 'Bilaspur', 'Ambikapur', 'Durg'];

  return (
    <div className="lifedrop-showcase-page min-h-screen bg-[#FFF8F8] text-[#0F172A] flex flex-col font-sans relative overflow-x-hidden">
      {/* Decorative Subtle EKG Wave Background Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.035] overflow-hidden z-0">
        <svg
          className="w-full h-full text-[#C62828]"
          viewBox="0 0 1440 800"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 400 L300 400 L340 280 L380 520 L420 340 L450 440 L480 400 L800 400 L840 250 L880 550 L920 320 L950 450 L990 400 L1440 400"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Top Banner / Navigation Bar */}
      <header className="relative z-20 border-b border-red-100/70 bg-white/80 backdrop-blur-md sticky top-0 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <LifeDropLogo size="default" showTagline={true} />
          <span className="hidden md:inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#FFEAEA] text-[#C62828] border border-red-200/50">
            Emergency Dispatch System
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenSOS}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-[#991B1B] to-[#C62828] text-white text-xs font-black shadow-md hover:shadow-lg active:scale-95 transition-all"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>EMERGENCY SOS</span>
          </button>

          <button
            type="button"
            onClick={onSwitchToDashboard}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-300 hover:border-[#C62828] hover:bg-[#FFF5F5] text-xs font-bold text-[#0F172A] transition-all"
          >
            <Layers size={14} className="text-[#C62828]" />
            <span>Web Dashboard</span>
          </button>
        </div>
      </header>

      {/* Main Split Section: Smartphone Frame on Left, Presentation Showcase on Right */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* ── LEFT COLUMN: The Interactive Smartphone Mockup ── */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="text-center mb-2 lg:hidden">
              <span className="text-xs font-bold tracking-widest text-[#C62828] uppercase">
                Interactive Preview
              </span>
              <h2 className="text-xl font-extrabold text-[#0F172A]">
                Try the LifeDrop Mobile App
              </h2>
            </div>

            <MobileAppMockup
              onOpenSOS={onOpenSOS}
              onOpenRequest={onOpenRequest}
              onOpenDonate={onOpenDonate}
              onOpenDonors={onOpenDonors}
              onOpenBloodBanks={onOpenBloodBanks}
              onOpenRequestsList={onOpenRequestsList}
              onOpenNotifications={onOpenNotifications}
              onOpenProfile={onOpenProfile}
              selectedCity={selectedCity}
              setSelectedCity={setSelectedCity}
            />
          </div>

          {/* ── RIGHT COLUMN: Marketing Showcase & Features Layout ── */}
          <div className="lg:col-span-7 flex flex-col space-y-8">
            {/* Top Brand & Headlines */}
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100/80 text-[#C62828] text-xs font-extrabold tracking-wide uppercase">
                <Flame size={13} className="fill-[#C62828]" />
                <span>Next-Gen Life-Saving Network</span>
              </div>

              <div className="flex items-center gap-3">
                <LifeDropLogo size="large" />
              </div>

              <h1 className="text-4xl sm:text-5xl font-black text-[#0F172A] tracking-tight uppercase" style={{ fontFamily: '"Outfit", "Plus Jakarta Sans", sans-serif' }}>
                APP HOME SCREEN
              </h1>

              <p className="text-xl sm:text-2xl font-bold text-[#C62828] tracking-tight" style={{ fontFamily: '"Outfit", "Plus Jakarta Sans", sans-serif' }}>
                Every Drop Counts. Every Life Saved.
              </p>

              <p className="text-sm text-[#64748B] max-w-xl leading-relaxed">
                Connect directly with voluntary blood donors, accredited hospital blood banks, and critical emergency dispatches in real-time across Chhattisgarh and nationwide.
              </p>
            </div>

            {/* ── 3 Key Feature Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Card 1: Smart Matching */}
              <div className="bg-white rounded-2xl p-4 shadow-[0_8px_24px_rgba(198,40,40,0.06)] border border-red-50 hover:shadow-md hover:border-red-200 transition-all flex flex-col justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#FFF0F0] flex items-center justify-center text-[#C62828] mb-3">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#0F172A] mb-0.5">
                    Smart Matching
                  </h3>
                  <p className="text-xs text-[#64748B] font-medium">
                    Find donors instantly
                  </p>
                </div>
              </div>

              {/* Card 2: Verified & Trusted */}
              <div className="bg-white rounded-2xl p-4 shadow-[0_8px_24px_rgba(198,40,40,0.06)] border border-red-50 hover:shadow-md hover:border-red-200 transition-all flex flex-col justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#FFF0F0] flex items-center justify-center text-[#C62828] mb-3">
                  <ShieldCheck size={24} className="text-[#C62828]" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#0F172A] mb-0.5">
                    Verified & Trusted
                  </h3>
                  <p className="text-xs text-[#64748B] font-medium">
                    Emergency Alerts
                  </p>
                </div>
              </div>

              {/* Card 3: 24x7 Support */}
              <div className="bg-white rounded-2xl p-4 shadow-[0_8px_24px_rgba(198,40,40,0.06)] border border-red-50 hover:shadow-md hover:border-red-200 transition-all flex flex-col justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#FFF0F0] flex items-center justify-center text-[#C62828] mb-3">
                  <Headphones size={24} className="text-[#C62828]" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#0F172A] mb-0.5">
                    24×7 Support
                  </h3>
                  <p className="text-xs text-[#64748B] font-medium">
                    24×7 Support
                  </p>
                </div>
              </div>
            </div>

            {/* ── How It Works Horizontal Flow ── */}
            <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-[0_8px_24px_rgba(198,40,40,0.04)] space-y-3">
              <h3 className="text-base font-extrabold text-[#0F172A]">
                How It Works
              </h3>

              <div className="flex items-center justify-between gap-1 overflow-x-auto py-1 no-scrollbar text-xs font-bold text-[#1E293B]">
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="w-5 h-5 rounded-full bg-[#C62828] text-white flex items-center justify-center text-[10px] font-black">
                    1
                  </span>
                  <span>Register</span>
                </div>

                <span className="text-[#94A3B8] font-bold">➔</span>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="w-5 h-5 rounded-full bg-[#C62828] text-white flex items-center justify-center text-[10px] font-black">
                    2
                  </span>
                  <span>Search/Match</span>
                </div>

                <span className="text-[#94A3B8] font-bold">➔</span>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="w-5 h-5 rounded-full bg-[#C62828] text-white flex items-center justify-center text-[10px] font-black">
                    3
                  </span>
                  <span>Connect</span>
                </div>

                <span className="text-[#94A3B8] font-bold">➔</span>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="w-5 h-5 rounded-full bg-[#C62828] text-white flex items-center justify-center text-[10px] font-black">
                    4
                  </span>
                  <span className="text-[#C62828] font-extrabold">Donate & Save a Life</span>
                </div>
              </div>
            </div>

            {/* ── Available in Cities Section ── */}
            <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-[0_8px_24px_rgba(198,40,40,0.04)] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1.5">
                <span className="text-xs font-black tracking-wider text-[#0F172A] uppercase">
                  AVAILABLE IN CITIES
                </span>
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#334155]">
                  {citiesList.map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => setSelectedCity(`${city}, Chhattisgarh`)}
                      className={`px-3 py-1 rounded-full transition-all ${
                        selectedCity.startsWith(city)
                          ? 'bg-[#C62828] text-white shadow-xs'
                          : 'bg-[#FFF2F2] text-[#C62828] hover:bg-[#FFE5E5]'
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chhattisgarh State Map Outline Graphic */}
              <div className="flex-shrink-0 w-24 h-24 relative flex items-center justify-center bg-[#FFF5F5] rounded-2xl border border-red-100 p-2">
                <svg
                  viewBox="0 0 100 120"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full h-full drop-shadow-xs"
                >
                  {/* Stylized State Polygon */}
                  <path
                    d="M48 10 L65 20 L75 35 L70 55 L85 70 L75 95 L55 110 L40 105 L30 85 L35 60 L25 45 L35 25 Z"
                    fill="#E2E8F0"
                    stroke="#CBD5E1"
                    strokeWidth="2"
                  />
                  {/* Highlighted Raigarh / Active Region in Red */}
                  <path
                    d="M50 40 L68 45 L65 65 L48 60 Z"
                    fill="#C62828"
                    stroke="#991B1B"
                    strokeWidth="1.5"
                  />
                  <circle cx="58" cy="52" r="3" fill="#FFFFFF" />
                </svg>
                <span className="absolute bottom-1 right-2 text-[9px] font-bold text-[#C62828]">
                  CG Map
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Red Bottom Banner: ONE APP. ONE MISSION. SAVE LIVES. ── */}
      <footer className="relative z-20 bg-gradient-to-r from-[#991B1B] via-[#C62828] to-[#B71C1C] text-white py-5 px-6 mt-auto shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="space-y-0.5">
            <h4 className="text-xl sm:text-2xl font-black tracking-wide uppercase" style={{ fontFamily: '"Outfit", "Plus Jakarta Sans", sans-serif' }}>
              ONE APP. ONE MISSION. SAVE LIVES.
            </h4>
            <p className="text-xs text-white/80 font-medium">
              Join thousands of everyday heroes making blood emergency shortages a thing of the past.
            </p>
          </div>

          {/* App Store & Google Play Badges */}
          <div className="flex items-center gap-3">
            {/* Google Play Store Badge Mockup */}
            <div className="bg-black/90 hover:bg-black text-white px-3.5 py-1.5 rounded-xl border border-white/20 flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 transition-all">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M3.6 1.8L13.8 12 3.6 22.2c-.4-.4-.6-.9-.6-1.5V3.3c0-.6.2-1.1.6-1.5zm11.3 11.3l2.8-2.8-11.8-6.8 9 9.6zm2.8-2.8l2.9 1.7c.8.5.8 1.3 0 1.7l-2.9 1.7-2.8-2.8 2.8-2.3zm-2.8 2.8l-9 9.6 11.8-6.8-2.8-2.8z" />
              </svg>
              <div className="text-left">
                <span className="text-[9px] uppercase tracking-wider block leading-tight text-white/70">
                  GET IT ON
                </span>
                <span className="text-xs font-bold leading-tight block">Google Play</span>
              </div>
            </div>

            {/* Apple App Store Badge Mockup */}
            <div className="bg-black/90 hover:bg-black text-white px-3.5 py-1.5 rounded-xl border border-white/20 flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 transition-all">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M18.7 19.5c-.8 1.2-1.7 2.4-3 2.5-1.3.1-1.8-.7-3.3-.7s-2 .7-3.3.7c-1.3-.1-2.2-1.3-3-2.5-1.7-2.4-3-6.9-1.2-9.9 1-1.6 2.7-2.6 4.4-2.6 1.3 0 2.5.9 3.3.9.8 0 2.3-1.1 3.9-.9 1.4.1 2.6.7 3.4 1.8-3.1 1.8-2.6 5.8.6 7.1-.6 1.5-1.3 2.9-2.8 4.6zM15.5 6.4c.6-.8 1.1-1.9.9-3-.9.1-2.1.6-2.7 1.4-.6.7-1.1 1.9-.9 2.9 1.1.1 2.1-.5 2.7-1.3z" />
              </svg>
              <div className="text-left">
                <span className="text-[9px] uppercase tracking-wider block leading-tight text-white/70">
                  Download on the
                </span>
                <span className="text-xs font-bold leading-tight block">App Store</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
