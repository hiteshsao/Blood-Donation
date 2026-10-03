import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Droplet,
  Heart,
  Shield,
  Activity,
  ArrowRight,
  PhoneCall,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  Users,
  Building2,
  AlertTriangle,
} from 'lucide-react';
import { Button, StatCard } from '../components/common';
import { useAuth } from '../context/AuthContext';

export const Landing = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('O-');

  // Compatibility matrix
  const COMPATIBILITY = {
    'O-': { canGiveTo: 'All Blood Types (Universal Donor)', canReceiveFrom: 'O-' },
    'O+': { canGiveTo: 'O+, A+, B+, AB+', canReceiveFrom: 'O+, O-' },
    'A-': { canGiveTo: 'A-, A+, AB-, AB+', canReceiveFrom: 'A-, O-' },
    'A+': { canGiveTo: 'A+, AB+', canReceiveFrom: 'A+, A-, O+, O-' },
    'B-': { canGiveTo: 'B-, B+, AB-, AB+', canReceiveFrom: 'B-, O-' },
    'B+': { canGiveTo: 'B+, AB+', canReceiveFrom: 'B+, B-, O+, O-' },
    'AB-': { canGiveTo: 'AB-, AB+', canReceiveFrom: 'AB-, A-, B-, O-' },
    'AB+': { canGiveTo: 'AB+ Only', canReceiveFrom: 'All Types (Universal Recipient)' },
  };

  const currentCompat = COMPATIBILITY[selectedBloodGroup] || COMPATIBILITY['O-'];

  return (
    <div className="space-y-24 pb-16 overflow-hidden">
      {/* ── 1. HERO SECTION ── */}
      <section className="relative pt-12 sm:pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Soft background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-red-200/40 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="text-center max-w-3xl mx-auto space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-100/80 border border-red-200 text-[#C62828] text-xs font-black tracking-wide">
            <span className="w-2 h-2 rounded-full bg-[#C62828] animate-ping" />
            <span>NABH & CDSCO Certified Clinical Transfusion Network</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
            Every Drop Counts.{' '}
            <span className="bg-gradient-to-r from-[#991B1B] via-[#C62828] to-[#EF4444] bg-clip-text text-transparent">
              Every Life Saved.
            </span>
          </h1>

          <p className="text-base sm:text-xl text-slate-600 font-medium leading-relaxed max-w-2xl mx-auto">
            A real-time intelligent network connecting voluntary blood donors, trauma centers, and certified
            blood banks within seconds during critical emergencies.
          </p>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/donors" className="w-full sm:w-auto">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                rightIcon={<Search className="w-4 h-4" />}
              >
                Find Donors Near Me
              </Button>
            </Link>

            <Link to="/register?role=DONOR" className="w-full sm:w-auto">
              <Button
                variant="secondary"
                size="lg"
                fullWidth
                leftIcon={<Heart className="w-4 h-4 fill-red-600 text-red-600" />}
              >
                Register as a Donor
              </Button>
            </Link>

            <Link to="/requests?urgency=CRITICAL" className="w-full sm:w-auto">
              <Button
                variant="sos"
                size="lg"
                fullWidth
                leftIcon={<AlertTriangle className="w-4 h-4" />}
              >
                Emergency SOS
              </Button>
            </Link>
          </div>

          {/* Mini EKG Waveform */}
          <div className="pt-6 flex items-center justify-center gap-3 text-xs font-bold text-slate-400">
            <span className="w-12 h-[2px] bg-red-200" />
            <span className="flex items-center gap-1.5 text-red-700">
              <Activity className="w-4 h-4 animate-pulse text-[#C62828]" />
              Over 28,450 Verified Units Dispatched This Month
            </span>
            <span className="w-12 h-[2px] bg-red-200" />
          </div>
        </div>

        {/* ── INTERACTIVE BLOOD COMPATIBILITY WIDGET ── */}
        <div className="mt-14 max-w-4xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-red-100 shadow-xl shadow-red-900/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Droplet className="w-5 h-5 text-[#C62828] fill-[#C62828]" />
                Interactive Blood Compatibility Engine
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Select your blood group to see clinical compatibility rules instantly.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {Object.keys(COMPATIBILITY).map((bg) => (
                <button
                  key={bg}
                  type="button"
                  onClick={() => setSelectedBloodGroup(bg)}
                  className={`
                    w-10 h-10 rounded-xl font-black text-xs transition-all duration-150
                    ${
                      selectedBloodGroup === bg
                        ? 'bg-[#C62828] text-white shadow-md shadow-red-900/30 scale-105'
                        : 'bg-red-50/70 text-slate-700 hover:bg-red-100 hover:text-[#C62828]'
                    }
                  `}
                >
                  {bg}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6">
            <div className="p-4 rounded-2xl bg-[#FFF8F8] border border-red-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Group {selectedBloodGroup} Can Donate Red Cells To:
              </p>
              <h4 className="text-base font-black text-slate-900 mt-1">
                {currentCompat.canGiveTo}
              </h4>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Group {selectedBloodGroup} Can Safely Receive From:
              </p>
              <h4 className="text-base font-black text-emerald-900 mt-1">
                {currentCompat.canReceiveFrom}
              </h4>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. IMPACT STATS ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-10">
          <h2 className="text-xs font-black text-[#C62828] uppercase tracking-widest">
            Clinical Network Scale
          </h2>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            Real-Time Life-Saving Metrics
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Voluntary Donors"
            value="124,580+"
            subtitle="Registered & Active in Network"
            icon={<Users className="w-6 h-6" />}
            trend="+18% this month"
            color="red"
          />
          <StatCard
            title="Avg Emergency Time"
            value="11.4 mins"
            subtitle="From SOS alert to donor match"
            icon={<Clock className="w-6 h-6" />}
            trend="-3.2 mins faster"
            trendDirection="up"
            color="emerald"
          />
          <StatCard
            title="Certified Blood Banks"
            value="1,420"
            subtitle="Connected with live inventory"
            icon={<Building2 className="w-6 h-6" />}
            trend="100% Verified"
            color="blue"
          />
          <StatCard
            title="Fulfilled Transfusions"
            value="89,940+"
            subtitle="Verified emergency units issued"
            icon={<Heart className="w-6 h-6" />}
            trend="99.2% success rate"
            color="amber"
          />
        </div>
      </section>

      {/* ── 3. HOW IT WORKS ── */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="text-xs font-black text-[#C62828] uppercase tracking-widest">
            Streamlined Protocol
          </h2>
          <h3 className="text-3xl font-black text-slate-900 mt-1">
            How LifeDrop Works in 3 Steps
          </h3>
          <p className="text-sm text-slate-500 font-medium mt-2">
            Engineered to remove bureaucracy and save lives with verified donor-recipient routing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="p-8 rounded-3xl bg-white border border-red-100 shadow-sm relative group hover:border-red-300 transition-all duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#C62828] font-black text-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              01
            </div>
            <h4 className="text-lg font-black text-slate-900">Post or Trigger SOS</h4>
            <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">
              Submit a blood requirement or trigger an emergency SOS with patient blood group, units,
              and hospital coordinates.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-8 rounded-3xl bg-white border border-red-100 shadow-sm relative group hover:border-red-300 transition-all duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#C62828] font-black text-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              02
            </div>
            <h4 className="text-lg font-black text-slate-900">Geospatial Matching</h4>
            <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">
              Our automated dispatch alerts all verified compatible donors within a 15km radius and checks
              real-time bank stocks.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-8 rounded-3xl bg-white border border-red-100 shadow-sm relative group hover:border-red-300 transition-all duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#C62828] font-black text-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              03
            </div>
            <h4 className="text-lg font-black text-slate-900">Verified Transfusion</h4>
            <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">
              The donor checks in, units are collected, medical audits verify the transfer, and an immutable
              certificate is generated.
            </p>
          </div>
        </div>
      </section>

      {/* ── 4. CTA BANNER ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-[#991B1B] via-[#C62828] to-[#B71C1C] text-white p-8 sm:p-14 relative overflow-hidden shadow-2xl shadow-red-950/20">
          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-black uppercase tracking-wider backdrop-blur-sm">
              Join the Voluntary Movement
            </span>
            <h3 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              Ready to Stand Up as a Guardian of Life in Your City?
            </h3>
            <p className="text-sm sm:text-base text-red-100 font-medium">
              A single donation saves up to 3 adult lives or 6 neonatal patients. Register in less than 2 minutes.
            </p>
            <div className="pt-4 flex flex-wrap gap-4">
              <Link to="/register">
                <Button
                  variant="secondary"
                  size="lg"
                  className="bg-white text-[#C62828] hover:bg-red-50 border-none shadow-lg"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Create Donor Account
                </Button>
              </Link>
              <Link to="/requests">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white text-white hover:bg-white/10"
                >
                  View Active Blood Requests
                </Button>
              </Link>
            </div>
          </div>

          <Droplet className="absolute -right-8 -bottom-10 w-72 h-72 text-white/10 pointer-events-none" />
        </div>
      </section>
    </div>
  );
};

export default Landing;
