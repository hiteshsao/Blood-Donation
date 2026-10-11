import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  Droplet,
  Users,
  GitPullRequest,
  Clock,
  Calendar,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Building2,
  Activity,
  Bell,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StatCard, StatusBadge, Button } from '../components/common';
import HospitalDashboardPage from './HospitalDashboardPage';
import BloodBankDashboardPage from './BloodBankDashboardPage';
import PendingVerificationScreen from '../components/facility/PendingVerificationScreen';
import { requestAPI, emergencyAPI, profileAPI } from '../services/api';

export const DashboardOverview = () => {
  const { user, role, donorProfile, setDonorProfile } = useAuth();
  const userRole = (role || user?.role || 'USER').toUpperCase();
  const userId = user?._id || user?.id;

  // State for real API data
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState(false);
  const [activeRequestsCount, setActiveRequestsCount] = useState(null);
  const [totalRequestsCount, setTotalRequestsCount] = useState(null);

  const [emergenciesLoading, setEmergenciesLoading] = useState(true);
  const [emergenciesError, setEmergenciesError] = useState(false);
  const [activeEmergenciesCount, setActiveEmergenciesCount] = useState(null);
  const [totalEmergenciesCount, setTotalEmergenciesCount] = useState(null);

  const [donorProfileLoading, setDonorProfileLoading] = useState(false);
  const [donorProfileData, setDonorProfileData] = useState(donorProfile || user?.donorProfile || null);

  const hasFetchedProfile = useRef(false);

  useEffect(() => {
    const next = donorProfile || user?.donorProfile || null;
    if (next) {
      setDonorProfileData((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    }
  }, [donorProfile, user?.donorProfile]);

  useEffect(() => {
    // If pending facility or dedicated portal, skip fetching user dashboard metrics
    if (
      user?.status === 'PENDING' ||
      user?.verificationStatus === 'PENDING' ||
      userRole === 'HOSPITAL' ||
      userRole === 'BLOOD_BANK'
    ) {
      return;
    }

    let isMounted = true;

    const fetchDashboardData = async () => {
      // 1. Fetch user blood requests (Active Requests stat)
      setRequestsLoading(true);
      setRequestsError(false);
      try {
        const res = await requestAPI.getMyRequests();
        if (!isMounted) return;
        const list = res.data?.requests || res.data?.data || (Array.isArray(res.data) ? res.data : []);
        const total = res.data?.pagination?.total ?? list.length;
        const nonActiveStatuses = ['FULFILLED', 'RECEIVED', 'CANCELLED', 'REJECTED'];
        const active = list.filter(
          (r) => !nonActiveStatuses.includes(String(r.status || '').toUpperCase())
        ).length;
        setActiveRequestsCount(active);
        setTotalRequestsCount(total);
      } catch (err) {
        if (!isMounted) return;
        console.warn('Failed to load user blood requests:', err);
        setRequestsError(true);
      } finally {
        if (isMounted) setRequestsLoading(false);
      }

      // 2. Fetch user emergency requests (Emergency Requests stat)
      setEmergenciesLoading(true);
      setEmergenciesError(false);
      try {
        const res = emergencyAPI.getMine ? await emergencyAPI.getMine() : await emergencyAPI.getMy();
        if (!isMounted) return;
        const list = res.data?.emergencies || res.data?.data || (Array.isArray(res.data) ? res.data : []);
        const active = list.filter((e) => {
          const status = String(e.status || '').toUpperCase();
          return status === 'ACTIVE' || status === 'DONORS_ASSIGNED';
        }).length;
        setActiveEmergenciesCount(active);
        setTotalEmergenciesCount(list.length);
      } catch (err) {
        if (!isMounted) return;
        console.warn('Failed to load user emergency requests:', err);
        setEmergenciesError(true);
      } finally {
        if (isMounted) setEmergenciesLoading(false);
      }

      // 3. Fetch up-to-date donor profile only if local donorProfile does not exist yet and hasn't been fetched
      const localProfile = donorProfile || user?.donorProfile;
      if (!localProfile && !hasFetchedProfile.current) {
        hasFetchedProfile.current = true;
        setDonorProfileLoading(true);
        try {
          const res = await profileAPI.getMe();
          if (!isMounted) return;
          const profile = res.data?.donorProfile || res.data?.user?.donorProfile || res.data?.profile;
          if (profile) {
            setDonorProfileData((prev) => (JSON.stringify(prev) === JSON.stringify(profile) ? prev : profile));
            if (setDonorProfile && JSON.stringify(donorProfile) !== JSON.stringify(profile)) {
              setDonorProfile(profile);
            }
          }
        } catch (err) {
          if (!isMounted) return;
          console.warn('Failed to load donor profile data:', err);
          if (err.response?.status === 429) {
            setRequestsError(true);
          }
        } finally {
          if (isMounted) setDonorProfileLoading(false);
        }
      }
    };

    fetchDashboardData();

    return () => {
      isMounted = false;
    };
  }, [userId, userRole, user?.status, user?.verificationStatus]);

  // 1. Dedicated Verification Screen if Account Status is PENDING
  if (user?.status === 'PENDING' || user?.verificationStatus === 'PENDING') {
    return <PendingVerificationScreen />;
  }

  // 2. Dedicated Verified Hospital Portal
  if (userRole === 'HOSPITAL') {
    return <HospitalDashboardPage />;
  }

  // 3. Dedicated Verified Blood Bank Portal
  if (userRole === 'BLOOD_BANK') {
    return <BloodBankDashboardPage />;
  }

  const activeDonorProfile = donorProfile || donorProfileData || user?.donorProfile;
  const hasDonorProfile = Boolean(activeDonorProfile);

  const getStats = () => {
    if (userRole === 'HOSPITAL') {
      return [
        { title: 'Active Emergency Requests', value: '2 Pending', subtitle: 'High-priority surgical cases', icon: <AlertTriangle className="w-5 h-5 text-red-600" />, color: 'red' },
        { title: 'Units Received', value: '64 Units', subtitle: 'Past 30 days transfusion intake', icon: <Droplet className="w-5 h-5 text-emerald-600" />, color: 'emerald' },
        { title: 'Matched Donors', value: '18 Nearby', subtitle: 'Within 10km radius of facility', icon: <Users className="w-5 h-5 text-blue-600" />, color: 'blue' },
        { title: 'Facility Status', value: 'NABH Cleared', subtitle: 'Accreditation active', icon: <Building2 className="w-5 h-5 text-amber-600" />, color: 'amber' },
      ];
    }

    if (userRole === 'BLOOD_BANK') {
      return [
        { title: 'Available Units', value: '382 Units', subtitle: 'Across 8 standard blood groups', icon: <Droplet className="w-5 h-5 text-red-600" />, color: 'red' },
        { title: 'Low Stock Alerts', value: 'O- & B-', subtitle: 'Below critical safety buffer', icon: <AlertTriangle className="w-5 h-5 text-amber-600" />, color: 'amber' },
        { title: 'Units Collected', value: '115 Units', subtitle: 'This week from registered donors', icon: <Heart className="w-5 h-5 text-emerald-600" />, color: 'emerald' },
        { title: 'Hospital Orders', value: '12 In Progress', subtitle: 'Awaiting dispatch confirmation', icon: <GitPullRequest className="w-5 h-5 text-blue-600" />, color: 'blue' },
      ];
    }

    // Active Requests stat value & subtitle
    let activeReqVal = '...';
    let activeReqSub = 'Loading requests...';
    if (!requestsLoading) {
      if (requestsError) {
        activeReqVal = '--';
        activeReqSub = 'Failed to load requests';
      } else {
        activeReqVal = `${activeRequestsCount ?? 0} Open`;
        activeReqSub = `Total ${totalRequestsCount ?? 0} requests`;
      }
    }

    // Decision based on useAuth() donorProfile instead of role === 'DONOR'
    if (hasDonorProfile) {
      const dp = activeDonorProfile;

      // Total Donations
      let totalDonationsVal = '...';
      let totalDonationsSub = 'Lifetime voluntary contributions';
      if (!donorProfileLoading || dp) {
        if (dp && typeof dp.totalDonations === 'number') {
          totalDonationsVal = `${dp.totalDonations} ${dp.totalDonations === 1 ? 'Unit' : 'Units'}`;
        } else {
          totalDonationsVal = '--';
          totalDonationsSub = 'No donation history';
        }
      }

      // Next Eligible Date
      let nextEligibleVal = '...';
      let nextEligibleSub = 'Rest period status';
      if (!donorProfileLoading || dp) {
        if (dp?.nextEligibleDate) {
          const eligibleDate = new Date(dp.nextEligibleDate);
          if (!isNaN(eligibleDate.getTime())) {
            if (eligibleDate <= new Date()) {
              nextEligibleVal = 'Eligible now';
              nextEligibleSub = 'Rest period completed';
            } else {
              nextEligibleVal = eligibleDate.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });
              nextEligibleSub = 'Rest period underway';
            }
          } else {
            nextEligibleVal = '--';
          }
        } else if (dp && (dp.totalDonations === 0 || !dp.lastDonationDate)) {
          nextEligibleVal = 'Eligible now';
          nextEligibleSub = 'Ready for donation';
        } else {
          nextEligibleVal = '--';
        }
      }

      // Verification Status
      let verificationVal = '...';
      let verificationSub = 'Profile verification status';
      if (!donorProfileLoading || dp) {
        const rawStatus = dp?.verificationStatus || (dp?.isVerified ? 'VERIFIED' : null) || user?.verificationStatus;
        if (rawStatus) {
          verificationVal = String(rawStatus).charAt(0).toUpperCase() + String(rawStatus).slice(1).toLowerCase();
          verificationSub = String(rawStatus).toUpperCase() === 'VERIFIED' ? 'Medical fitness cleared' : 'Verification underway';
        } else {
          verificationVal = '--';
        }
      }

      return [
        {
          title: 'Total Donations',
          value: totalDonationsVal,
          subtitle: totalDonationsSub,
          icon: <Heart className="w-5 h-5 text-red-600" />,
          color: 'red',
        },
        {
          title: 'Next Eligible Date',
          value: nextEligibleVal,
          subtitle: nextEligibleSub,
          icon: <Calendar className="w-5 h-5 text-blue-600" />,
          color: 'blue',
        },
        {
          title: 'Verification Status',
          value: verificationVal,
          subtitle: verificationSub,
          icon: <ShieldCheck className="w-5 h-5 text-amber-600" />,
          color: 'amber',
        },
        {
          title: 'Active Requests',
          value: activeReqVal,
          subtitle: activeReqSub,
          icon: <GitPullRequest className="w-5 h-5 text-emerald-600" />,
          color: 'emerald',
        },
      ];
    }

    // Normal User Cards (when donorProfile is absent)
    let emergencyVal = '...';
    let emergencySub = 'Loading broadcasts...';
    if (!emergenciesLoading) {
      if (emergenciesError) {
        emergencyVal = '--';
        emergencySub = 'Failed to load broadcasts';
      } else {
        emergencyVal = `${activeEmergenciesCount ?? 0} Active`;
        emergencySub = `Total ${totalEmergenciesCount ?? 0} broadcasts`;
      }
    }

    return [
      {
        title: 'Active Requests',
        value: activeReqVal,
        subtitle: activeReqSub,
        icon: <GitPullRequest className="w-5 h-5 text-red-600" />,
        color: 'red',
      },
      {
        title: 'Emergency Requests',
        value: emergencyVal,
        subtitle: emergencySub,
        icon: <AlertTriangle className="w-5 h-5 text-emerald-600" />,
        color: 'emerald',
      },
      {
        title: 'Blood Group',
        value: user?.bloodGroup || 'Not set',
        subtitle: user?.bloodGroup ? 'Registered blood classification' : 'Update in profile settings',
        icon: <Droplet className="w-5 h-5 text-blue-600" />,
        color: 'blue',
      },
      {
        title: 'Helpline Access',
        value: '24x7 Ready',
        subtitle: 'Dial 108 or 104 in emergencies',
        icon: <Activity className="w-5 h-5 text-amber-600" />,
        color: 'amber',
      },
    ];
  };

  const stats = getStats();

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#991B1B] via-[#C62828] to-[#B71C1C] text-white p-6 sm:p-8 relative overflow-hidden shadow-xl shadow-red-950/10">
        <div className="relative z-10 max-w-xl space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-white/20 text-[11px] font-black uppercase tracking-wider backdrop-blur-sm">
              {hasDonorProfile ? 'DONOR' : userRole} Transfusion Hub
            </span>
            {user?.bloodGroup && (
              <span className="px-2.5 py-0.5 rounded-full bg-white text-[#C62828] text-xs font-black">
                Group {user.bloodGroup}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            Welcome back, {user?.name || 'Valued Member'}
          </h1>

          <p className="text-xs sm:text-sm text-red-100 font-medium leading-relaxed">
            Your profile is active on the LifeDrop network in <strong className="text-white">{user?.city || 'Chhattisgarh'}</strong>.
            All transfusion requests and compatible donor matches are updated in real time.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <Link to="/requests">
              <Button
                variant="secondary"
                size="sm"
                className="bg-white text-[#C62828] hover:bg-red-50 border-none shadow-md"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                {hasDonorProfile ? 'Find Active Blood Requests' : 'Create Blood Request'}
              </Button>
            </Link>

            <Link to="/donors">
              <Button
                variant="outline"
                size="sm"
                className="border-white text-white hover:bg-white/10"
              >
                Search Compatible Donors
              </Button>
            </Link>
          </div>
        </div>

        <Droplet className="absolute -right-6 -bottom-8 w-56 h-56 text-white/10 pointer-events-none" />
      </div>

      {/* Real-Time Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((s) => (
          <StatCard
            key={s.title}
            title={s.title}
            value={s.value}
            subtitle={s.subtitle}
            icon={s.icon}
            color={s.color}
          />
        ))}
      </div>

      {/* Action Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Links Card */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-red-100 shadow-sm space-y-4">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C62828]" />
            Quick Clinical Operations
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <Link
              to="/find-blood"
              className="p-4 rounded-2xl border border-slate-100 bg-[#FFF8F8] hover:border-red-200 transition-all flex items-start gap-3.5 group"
            >
              <div className="p-2.5 rounded-xl bg-white text-[#C62828] shadow-sm border border-red-100 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Find Blood & Donors</h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Filter verified donors and nearby blood banks by group and city.
                </p>
              </div>
            </Link>

            <Link
              to="/requests"
              className="p-4 rounded-2xl border border-slate-100 bg-[#FFF8F8] hover:border-red-200 transition-all flex items-start gap-3.5 group"
            >
              <div className="p-2.5 rounded-xl bg-white text-[#C62828] shadow-sm border border-red-100 group-hover:scale-105 transition-transform">
                <GitPullRequest className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Blood Requests & Timeline</h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Track live clinical fulfillment status and hospital receipt.
                </p>
              </div>
            </Link>

            <Link
              to="/appointments"
              className="p-4 rounded-2xl border border-slate-100 bg-[#FFF8F8] hover:border-red-200 transition-all flex items-start gap-3.5 group"
            >
              <div className="p-2.5 rounded-xl bg-white text-[#C62828] shadow-sm border border-red-100 group-hover:scale-105 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Book Donation Slot</h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Reserve a donation slot at certified blood banks or manage appointments.
                </p>
              </div>
            </Link>

            <Link
              to="/emergency"
              className="p-4 rounded-2xl border border-slate-100 bg-[#FFF8F8] hover:border-red-200 transition-all flex items-start gap-3.5 group"
            >
              <div className="p-2.5 rounded-xl bg-white text-[#C62828] shadow-sm border border-red-100 group-hover:scale-105 transition-transform">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Emergency Alerts</h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Respond to active hospital trauma alerts in real-time.
                </p>
              </div>
            </Link>

            <Link
              to="/history"
              className="p-4 rounded-2xl border border-slate-100 bg-[#FFF8F8] hover:border-red-200 transition-all flex items-start gap-3.5 group"
            >
              <div className="p-2.5 rounded-xl bg-white text-[#C62828] shadow-sm border border-red-100 group-hover:scale-105 transition-transform">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Donation History & Certs</h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  View past donations, download and print clinical certificates.
                </p>
              </div>
            </Link>

            <Link
              to="/profile"
              className="p-4 rounded-2xl border border-slate-100 bg-[#FFF8F8] hover:border-red-200 transition-all flex items-start gap-3.5 group"
            >
              <div className="p-2.5 rounded-xl bg-white text-[#C62828] shadow-sm border border-red-100 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Profile & Eligibility</h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Update location, toggle donor availability & view next eligible date.
                </p>
              </div>
            </Link>

            <Link
              to="/notifications"
              className="p-4 rounded-2xl border border-slate-100 bg-[#FFF8F8] hover:border-red-200 transition-all flex items-start gap-3.5 group"
            >
              <div className="p-2.5 rounded-xl bg-white text-[#C62828] shadow-sm border border-red-100 group-hover:scale-105 transition-transform">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Alerts & Notifications</h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Stay updated with trauma alerts, matching requests, and milestones.
                </p>
              </div>
            </Link>

            <Link
              to="/feedback"
              className="p-4 rounded-2xl border border-slate-100 bg-[#FFF8F8] hover:border-red-200 transition-all flex items-start gap-3.5 group"
            >
              <div className="p-2.5 rounded-xl bg-white text-[#C62828] shadow-sm border border-red-100 group-hover:scale-105 transition-transform">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Feedback & Grievances</h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Submit ratings or report complaints and track admin resolution.
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Emergency SOS Quick Dispatch Panel */}
        <div className="bg-gradient-to-br from-red-500 to-rose-700 text-white rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-lg shadow-red-950/20">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-[10px] font-black uppercase tracking-wider backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              24/7 Red Alert
            </span>

            <h3 className="text-xl font-black tracking-tight leading-snug">
              Immediate Patient Transfusion Emergency?
            </h3>

            <p className="text-xs text-red-100 font-medium leading-relaxed">
              Broadcast an immediate notification to all available donors in your immediate radius and
              dispatch nearby hospital blood banks.
            </p>
          </div>

          <div className="pt-6">
            <Link to="/emergency">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                className="bg-white text-red-700 hover:bg-red-50 border-none font-black shadow-lg"
              >
                Trigger SOS Broadcast
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
