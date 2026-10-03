import React, { useState, useEffect } from 'react';
import { LifeDropLogo } from '../components/LifeDropLogo';
import {
  MapPin,
  Bell,
  Droplet,
  Users,
  Building2,
  Hospital,
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
  ArrowRight,
  Headphones,
  Radio,
  Flame,
  Activity,
  Layers,
  Lock,
  PlusCircle,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { searchAPI, emergencyAPI } from '../services/api';

const BLOOD_GROUPS = ['ALL', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

const CITIES = [
  'Raigarh, Chhattisgarh',
  'Raipur, Chhattisgarh',
  'Bilaspur, Chhattisgarh',
  'Ambikapur, Chhattisgarh',
  'Durg, Chhattisgarh',
];

const INITIAL_REQUESTS = [
  {
    id: 'req-1',
    bloodGroup: 'O+',
    urgency: 'CRITICAL',
    urgencyLabel: 'Urgent SOS',
    urgencyColor: 'bg-red-600 text-white',
    hospitalName: 'Raigarh Civil Hospital',
    distanceKm: '1.2 km away',
    city: 'Raigarh',
    units: 2,
    patientName: 'Sanjay Patel',
    timeAgo: '8m ago',
    unitsAccepted: 1,
  },
  {
    id: 'req-2',
    bloodGroup: 'A-',
    urgency: 'HIGH',
    urgencyLabel: 'High Priority',
    urgencyColor: 'bg-amber-500 text-white',
    hospitalName: 'Kirodimal Govt Hospital',
    distanceKm: '3.4 km away',
    city: 'Raigarh',
    units: 1,
    patientName: 'Anita Sharma',
    timeAgo: '22m ago',
    unitsAccepted: 0,
  },
  {
    id: 'req-3',
    bloodGroup: 'B+',
    urgency: 'CRITICAL',
    urgencyLabel: 'Critical Trauma',
    urgencyColor: 'bg-red-600 text-white',
    hospitalName: 'Fortis Escorts Clinic',
    distanceKm: '4.8 km away',
    city: 'Raigarh',
    units: 3,
    patientName: 'Ramesh Gupta',
    timeAgo: '35m ago',
    unitsAccepted: 2,
  },
  {
    id: 'req-4',
    bloodGroup: 'O-',
    urgency: 'CRITICAL',
    urgencyLabel: 'Universal Needed',
    urgencyColor: 'bg-red-600 text-white',
    hospitalName: 'Apollo Hospital Raigarh',
    distanceKm: '5.6 km away',
    city: 'Raigarh',
    units: 2,
    patientName: 'Kavita Verma',
    timeAgo: '48m ago',
    unitsAccepted: 0,
  },
  {
    id: 'req-5',
    bloodGroup: 'AB+',
    urgency: 'MODERATE',
    urgencyLabel: 'Scheduled Surgery',
    urgencyColor: 'bg-emerald-600 text-white',
    hospitalName: 'Sanjeevani Care Hospital',
    distanceKm: '6.9 km away',
    city: 'Raigarh',
    units: 1,
    patientName: 'Deepak Sahu',
    timeAgo: '1h ago',
    unitsAccepted: 1,
  },
];

export const LifeDropWebHome = ({
  onOpenSOS,
  onOpenRequest,
  onOpenDonate,
  onOpenDonors,
  onOpenBloodBanks,
  onNavigate,
  selectedCity = 'Raigarh, Chhattisgarh',
  setSelectedCity,
}) => {
  const safeCity = selectedCity || 'Raigarh, Chhattisgarh';
  const [activeGroupFilter, setActiveGroupFilter] = useState('ALL');
  const [requests, setRequests] = useState(INITIAL_REQUESTS);
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [respondedRequests, setRespondedRequests] = useState({});

  const handleRespond = (id) => {
    setRespondedRequests((prev) => {
      const isAlready = prev[id] === 'ACCEPTED';
      if (!isAlready) {
        toast.success('Pledge recorded! Hospital coordination team has been notified.');
      }
      return {
        ...prev,
        [id]: isAlready ? null : 'ACCEPTED',
      };
    });
  };

  const filteredRequests = requests.filter((r) => {
    if (activeGroupFilter === 'ALL') return true;
    return r.bloodGroup === activeGroupFilter;
  });

  return (
    <div className="w-full flex flex-col font-sans">
      {/* ── 1. PROFESSIONAL WEBSITE HERO BANNER ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#FFF5F5] via-[#FFF8F8] to-[#FFF0F0] border-b border-red-100 py-12 md:py-20 px-4 sm:px-6 lg:px-8">
        {/* Subtle EKG Heartbeat waveform background graphic */}
        <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
          <svg
            className="w-full h-full text-[#C62828]"
            viewBox="0 0 1440 400"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0 200 L350 200 L390 120 L430 300 L470 160 L500 240 L530 200 L950 200 L990 110 L1030 320 L1070 150 L1100 230 L1130 200 L1440 200"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-100/90 text-[#C62828] text-xs font-black tracking-wider uppercase border border-red-200 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-[#C62828] animate-ping" />
                <span>Next-Gen Emergency Blood Coordination</span>
              </div>

              {/* Title & Subtitle */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#0F172A] tracking-tight leading-[1.1]">
                Every Drop Counts.{' '}
                <span className="text-[#C62828] block sm:inline">
                  Every Life Saved.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-[#64748B] max-w-2xl font-normal leading-relaxed mx-auto lg:mx-0">
                Connect directly with verified voluntary blood donors, accredited hospital blood banks, and instant emergency dispatches across Chhattisgarh and nationwide.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5 pt-2">
                <button
                  type="button"
                  onClick={onOpenSOS}
                  className="px-6 py-3 rounded-full bg-gradient-to-r from-[#991B1B] via-[#C62828] to-[#EF4444] text-white text-sm font-extrabold shadow-[0_10px_25px_rgba(198,40,40,0.35)] hover:shadow-xl active:scale-95 transition-all flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span>EMERGENCY SOS BROADCAST</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenRequest}
                  className="px-6 py-3 rounded-full bg-white hover:bg-red-50 text-[#C62828] border-2 border-[#C62828] text-sm font-bold shadow-xs active:scale-95 transition-all flex items-center gap-2"
                >
                  <Droplet size={17} className="fill-[#C62828]" />
                  <span>Request Blood</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenDonate}
                  className="px-5 py-3 rounded-full bg-[#FFF0F0] hover:bg-[#FFE5E5] text-[#0F172A] border border-red-200 text-sm font-bold active:scale-95 transition-all flex items-center gap-2"
                >
                  <Heart size={16} className="text-[#C62828]" />
                  <span>Become a Donor</span>
                </button>
              </div>

              {/* Operating Location Picker Pill */}
              <div className="pt-2 flex items-center justify-center lg:justify-start gap-2 text-xs font-semibold text-[#64748B]">
                <MapPin size={15} className="text-[#C62828]" />
                <span>Showing availability for:</span>
                <div className="relative inline-block">
                  <button
                    type="button"
                    onClick={() => setCityDropdownOpen(!cityDropdownOpen)}
                    className="font-bold text-[#C62828] bg-white px-3 py-1 rounded-full border border-red-200 shadow-2xs hover:bg-red-50 flex items-center gap-1 transition-all"
                  >
                    <span>{selectedCity}</span>
                    <ChevronDown size={13} />
                  </button>

                  {cityDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-2xl shadow-xl border border-red-100 py-1.5 z-50 animate-in fade-in zoom-in-95">
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
            </div>

            {/* Right Card / Interactive Feature Showcase */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-[0_20px_50px_rgba(198,40,40,0.12)] border border-red-100 space-y-5 relative">
                {/* Header within Card */}
                <div className="flex items-center justify-between pb-4 border-b border-red-100/70">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#FFF0F0] text-[#C62828] flex items-center justify-center font-black">
                      <Droplet size={22} className="fill-[#C62828]" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-[#0F172A]">
                        Live Coordination Hub
                      </h3>
                      <p className="text-xs text-[#64748B]">Real-time emergency status</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                    ONLINE
                  </span>
                </div>

                {/* Live Counter Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-[#FFF8F8] border border-red-100/80">
                    <span className="text-[11px] font-bold text-[#64748B] block">Verified Donors</span>
                    <span className="text-2xl font-black text-[#C62828]">2,480+</span>
                    <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">● 142 Active Now</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#FFF8F8] border border-red-100/80">
                    <span className="text-[11px] font-bold text-[#64748B] block">Blood Banks</span>
                    <span className="text-2xl font-black text-[#0F172A]">48 Units</span>
                    <span className="text-[10px] text-[#64748B] font-semibold block mt-0.5">Across Chhattisgarh</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#FFF8F8] border border-red-100/80">
                    <span className="text-[11px] font-bold text-[#64748B] block">Escalation Timer</span>
                    <span className="text-2xl font-black text-[#C62828]">15 Min</span>
                    <span className="text-[10px] text-[#64748B] font-semibold block mt-0.5">Auto Radius Widening</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#FFF8F8] border border-red-100/80">
                    <span className="text-[11px] font-bold text-[#64748B] block">Match Speed</span>
                    <span className="text-2xl font-black text-emerald-600">&lt; 3 Sec</span>
                    <span className="text-[10px] text-[#64748B] font-semibold block mt-0.5">Biological Matrix</span>
                  </div>
                </div>

                {/* Instant Action CTA */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onOpenDonors}
                    className="w-full py-2.5 rounded-xl bg-[#FFF0F0] hover:bg-[#C62828] text-[#C62828] hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 group"
                  >
                    <span>Search Verified Donors in {safeCity.split(',')[0]}</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. QUICK ACCESS SERVICES SECTION (From original poster design) ── */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-8 space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-[#C62828]">
            Quick Access Services
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A]">
            Everything You Need, One Click Away
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B]">
            Directly connect with nearby donors, view hospital blood inventories, and track active cases.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Service 1: Nearby Donors */}
          <div
            onClick={onOpenDonors}
            className="cursor-pointer bg-white rounded-3xl p-5 border border-red-100 shadow-[0_8px_24px_rgba(198,40,40,0.06)] hover:shadow-lg hover:border-red-300 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#FFEAEA] group-hover:bg-[#C62828] text-[#C62828] group-hover:text-white flex items-center justify-center mb-4 transition-colors">
                <MapPin size={22} className="fill-current" />
              </div>
              <h3 className="text-base font-extrabold text-[#0F172A] mb-1">
                Nearby Donors
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Find compatible, verified, and available voluntary donors within your custom search radius.
              </p>
            </div>
            <div className="pt-4 flex items-center text-xs font-bold text-[#C62828]">
              <span>Explore Donors</span>
              <ArrowRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Service 2: Blood Banks */}
          <div
            onClick={onOpenBloodBanks}
            className="cursor-pointer bg-white rounded-3xl p-5 border border-red-100 shadow-[0_8px_24px_rgba(198,40,40,0.06)] hover:shadow-lg hover:border-red-300 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#FFEAEA] group-hover:bg-[#C62828] text-[#C62828] group-hover:text-white flex items-center justify-center mb-4 transition-colors">
                <Droplet size={22} className="fill-current" />
              </div>
              <h3 className="text-base font-extrabold text-[#0F172A] mb-1">
                Blood Banks & Stock
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Check live unit inventories across all 8 blood groups at certified regional blood banks.
              </p>
            </div>
            <div className="pt-4 flex items-center text-xs font-bold text-[#C62828]">
              <span>View Inventory</span>
              <ArrowRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Service 3: My Requests */}
          <div
            onClick={() => onNavigate('history')}
            className="cursor-pointer bg-white rounded-3xl p-5 border border-red-100 shadow-[0_8px_24px_rgba(198,40,40,0.06)] hover:shadow-lg hover:border-red-300 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#FFEAEA] group-hover:bg-[#C62828] text-[#C62828] group-hover:text-white flex items-center justify-center mb-4 transition-colors">
                <ClipboardList size={22} />
              </div>
              <h3 className="text-base font-extrabold text-[#0F172A] mb-1">
                Track Blood Requests
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Follow real-time status updates through PENDING, DONOR_ASSIGNED, to FULFILLED.
              </p>
            </div>
            <div className="pt-4 flex items-center text-xs font-bold text-[#C62828]">
              <span>Track Status</span>
              <ArrowRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Service 4: Emergency SOS */}
          <div
            onClick={onOpenSOS}
            className="cursor-pointer bg-gradient-to-br from-white to-[#FFF0F0] rounded-3xl p-5 border-2 border-red-300 shadow-[0_8px_24px_rgba(198,40,40,0.12)] hover:shadow-xl hover:border-[#C62828] transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#C62828] text-white flex items-center justify-center mb-4 shadow-md group-hover:scale-105 transition-transform">
                <Radio size={22} className="animate-pulse" />
              </div>
              <h3 className="text-base font-extrabold text-[#0F172A] mb-1 flex items-center gap-1.5">
                <span>Emergency SOS</span>
                <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-black">
                  CRITICAL
                </span>
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Simultaneously dispatch alerts to all compatible donors within radius with automated 15-minute escalation.
              </p>
            </div>
            <div className="pt-4 flex items-center text-xs font-bold text-[#C62828]">
              <span>Trigger Dispatch</span>
              <ArrowRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. NEARBY BLOOD REQUESTS LIVE FEED (From the poster) ── */}
      <section className="py-12 bg-[#FFF8F8] border-y border-red-100 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C62828] uppercase tracking-wider mb-1">
                <Activity size={14} />
                <span>Live Community Dispatch</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A]">
                Nearby Blood Requests in {safeCity.split(',')[0]}
              </h2>
              <p className="text-xs sm:text-sm text-[#64748B] mt-1">
                Urgent hospital requests awaiting donor pledge and acceptance.
              </p>
            </div>

            {/* Blood Group Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {BLOOD_GROUPS.map((grp) => (
                <button
                  key={grp}
                  type="button"
                  onClick={() => setActiveGroupFilter(grp)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    activeGroupFilter === grp
                      ? 'bg-[#C62828] text-white shadow-xs'
                      : 'bg-white text-[#475569] border border-slate-200 hover:border-red-200'
                  }`}
                >
                  {grp === 'ALL' ? 'All Blood Types' : grp}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-3xl p-5 border border-red-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar of Card */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-11 h-11 rounded-2xl bg-[#C62828] text-white font-black text-sm flex items-center justify-center shadow-xs">
                        {req.bloodGroup}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[#0F172A] block leading-tight">
                          Patient: {req.patientName}
                        </span>
                        <span className="text-[11px] text-[#64748B] flex items-center gap-1">
                          <Clock size={11} />
                          {req.timeAgo}
                        </span>
                      </div>
                    </div>

                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${req.urgencyColor}`}>
                      {req.urgencyLabel}
                    </span>
                  </div>

                  {/* Hospital & Location */}
                  <div className="p-3 bg-[#FFF8F8] rounded-2xl border border-red-50 space-y-1 mb-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F172A]">
                      <Hospital size={14} className="text-[#C62828] flex-shrink-0" />
                      <span className="truncate">{req.hospitalName}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-[#64748B]">
                      <MapPin size={12} className="text-[#C62828] flex-shrink-0" />
                      <span>{req.distanceKm} • {req.city}</span>
                    </div>
                  </div>

                  {/* Progress / Units */}
                  <div className="flex items-center justify-between text-xs font-semibold text-[#64748B] mb-4">
                    <span>Units Required: <strong>{req.units} Units</strong></span>
                    <span className="text-emerald-700 font-bold">
                      {req.unitsAccepted}/{req.units} Fulfilled
                    </span>
                  </div>
                </div>

                {/* Respond Action */}
                <button
                  type="button"
                  onClick={() => handleRespond(req.id)}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all active:scale-98 flex items-center justify-center gap-1.5 shadow-xs ${
                    respondedRequests[req.id] === 'ACCEPTED'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#FFF0F0] text-[#C62828] hover:bg-[#C62828] hover:text-white'
                  }`}
                >
                  {respondedRequests[req.id] === 'ACCEPTED' ? (
                    <>
                      <CheckCircle2 size={15} />
                      <span>Donation Pledged ✓</span>
                    </>
                  ) : (
                    <>
                      <Heart size={15} />
                      <span>Pledge Donation</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. HOW IT WORKS SECTION (From poster design) ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-[#C62828]">
            Simple & Transparent
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A]">
            How LifeDrop Works
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B]">
            Four simple steps from request to verified life-saving donation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          {/* Step 1 */}
          <div className="bg-white rounded-3xl p-6 border border-red-100 shadow-[0_8px_24px_rgba(198,40,40,0.04)] text-center relative group hover:border-red-300 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-[#C62828] text-white font-black text-lg flex items-center justify-center mx-auto mb-4 shadow-sm">
              1
            </div>
            <h3 className="text-base font-extrabold text-[#0F172A] mb-1.5">
              Register & Screen
            </h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Sign up as a donor, complete the instant 30-second eligibility screening, and set your location.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-3xl p-6 border border-red-100 shadow-[0_8px_24px_rgba(198,40,40,0.04)] text-center relative group hover:border-red-300 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-[#C62828] text-white font-black text-lg flex items-center justify-center mx-auto mb-4 shadow-sm">
              2
            </div>
            <h3 className="text-base font-extrabold text-[#0F172A] mb-1.5">
              Smart Compatibility
            </h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Our automated biological algorithm matches compatible blood groups within distance radius.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-3xl p-6 border border-red-100 shadow-[0_8px_24px_rgba(198,40,40,0.04)] text-center relative group hover:border-red-300 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-[#C62828] text-white font-black text-lg flex items-center justify-center mx-auto mb-4 shadow-sm">
              3
            </div>
            <h3 className="text-base font-extrabold text-[#0F172A] mb-1.5">
              Instant Alert & Connect
            </h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Donors receive immediate push notifications, SMS, and email dispatches to accept or decline.
            </p>
          </div>

          {/* Step 4 */}
          <div className="bg-white rounded-3xl p-6 border border-red-100 shadow-[0_8px_24px_rgba(198,40,40,0.04)] text-center relative group hover:border-red-300 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-[#C62828] text-white font-black text-lg flex items-center justify-center mx-auto mb-4 shadow-sm">
              4
            </div>
            <h3 className="text-base font-extrabold text-[#0F172A] mb-1.5">
              Donate & Save Life
            </h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Visit the accredited hospital or center, complete donation, and automatically update request to Fulfilled.
            </p>
          </div>
        </div>
      </section>

      {/* ── 5. AVAILABLE IN CITIES SECTION ── */}
      <section className="py-14 bg-[#FFF5F5] border-t border-red-100 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-center lg:text-left">
            <span className="text-xs font-black uppercase tracking-wider text-[#C62828]">
              REGIONAL COVERAGE
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A]">
              Active LifeDrop Network in Chhattisgarh
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] max-w-xl">
              Connecting district hospitals, certified blood centers, and voluntary emergency donor networks across all major urban zones.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-2">
              {CITIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedCity(c)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                    selectedCity === c
                      ? 'bg-[#C62828] text-white shadow-md scale-105'
                      : 'bg-white text-[#334155] border border-red-100 hover:bg-[#FFEAEA]'
                  }`}
                >
                  📍 {c.split(',')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Visual Badge Card */}
          <div className="bg-white rounded-3xl p-6 border border-red-100 shadow-md flex items-center gap-6 max-w-md w-full">
            <div className="w-16 h-16 rounded-2xl bg-[#FFEAEA] text-[#C62828] flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={32} />
            </div>
            <div>
              <h4 className="text-sm font-black text-[#0F172A]">
                100% Verified Healthcare Nodes
              </h4>
              <p className="text-xs text-[#64748B] mt-0.5">
                Every hospital and blood bank is vetted with government license numbers and authenticated JWT coordination.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. RED BOTTOM BANNER (ONE APP. ONE MISSION. SAVE LIVES.) ── */}
      <footer className="bg-gradient-to-r from-[#991B1B] via-[#C62828] to-[#B71C1C] text-white py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="space-y-1">
            <h3 className="text-2xl sm:text-3xl font-black tracking-wide uppercase">
              ONE APP. ONE MISSION. SAVE LIVES.
            </h3>
            <p className="text-xs sm:text-sm text-white/80 font-medium">
              Join thousands of everyday heroes making blood emergency shortages a thing of the past.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onOpenSOS}
              className="px-5 py-2.5 rounded-full bg-white text-[#C62828] hover:bg-red-50 text-xs font-black shadow-md active:scale-95 transition-all"
            >
              TRIGGER SOS DISPATCH
            </button>

            <button
              type="button"
              onClick={onOpenDonate}
              className="px-5 py-2.5 rounded-full bg-black/20 hover:bg-black/30 border border-white/40 text-white text-xs font-bold active:scale-95 transition-all"
            >
              REGISTER AS DONOR
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto border-t border-white/20 mt-6 pt-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-white/70">
          <span>© 2026 LifeDrop Blood Coordination Platform. All rights reserved.</span>
          <span className="mt-1 sm:mt-0">Clinical Grade Real-Time Emergency Network</span>
        </div>
      </footer>
    </div>
  );
};
