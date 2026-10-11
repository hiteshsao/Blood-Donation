import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  ShieldAlert,
  Building2,
  Package,
  ClipboardList,
  Radio,
  ArrowRight,
  TrendingUp,
  Download,
  HeartHandshake,
  Droplet,
  Activity,
  Clock,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { StatCard, Button } from '../../components/common';
import { adminAPI } from '../../services/api';

const LOW_STOCK_THRESHOLD = 10;
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: '...',
    totalDonors: '...',
    pendingFacilities: '...',
    activeEmergencies: '...',
    totalAvailableStock: '...',
    monthlyDonations: '...',
    totalRequests: '...',
    pendingRequests: '...',
  });

  const [stockByGroup, setStockByGroup] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchAdminStats = async () => {
      try {
        const res = await adminAPI.getStats();
        const data = res.data?.data ?? res.data;
        if (!isMounted) return;

        if (data) {
          const totals = data.totals ?? {};
          const pendingApprovals = data.pendingApprovals ?? {};
          const stock = data.stockByGroup ?? {};

          const usersCount = totals.users ?? data.totalUsers;
          const donorsCount = totals.donors ?? data.totalDonors;
          const emergenciesCount = data.activeEmergencies ?? totals.emergencies;

          const hasPendingApprovals =
            pendingApprovals.hospitals !== undefined || pendingApprovals.bloodBanks !== undefined;
          const pendingCount = hasPendingApprovals
            ? (pendingApprovals.hospitals ?? 0) + (pendingApprovals.bloodBanks ?? 0)
            : (data.pendingFacilities ?? null);

          const stockValues = Object.values(stock);
          const stockSum =
            stockValues.length > 0
              ? stockValues.reduce((acc, curr) => acc + (Number(curr) || 0), 0)
              : (data.totalAvailableStock ?? null);

          const monthlyDonations = data.monthlyDonations ?? totals.donations;
          const totalRequests = totals.requests ?? data.totalRequests;
          const pendingRequests = pendingApprovals.requests ?? data.pendingRequests;

          setStats({
            totalUsers: usersCount !== undefined && usersCount !== null ? String(usersCount) : '--',
            totalDonors: donorsCount !== undefined && donorsCount !== null ? String(donorsCount) : '--',
            pendingFacilities:
              pendingCount !== undefined && pendingCount !== null ? `${pendingCount} Facilities` : '--',
            activeEmergencies:
              emergenciesCount !== undefined && emergenciesCount !== null ? `${emergenciesCount} Active` : '--',
            totalAvailableStock:
              stockSum !== undefined && stockSum !== null ? `${stockSum} Units` : '--',
            monthlyDonations:
              monthlyDonations !== undefined && monthlyDonations !== null ? String(monthlyDonations) : '--',
            totalRequests:
              totalRequests !== undefined && totalRequests !== null ? String(totalRequests) : '--',
            pendingRequests:
              pendingRequests !== undefined && pendingRequests !== null ? String(pendingRequests) : '--',
          });

          setStockByGroup(stock);
        } else {
          setStats({
            totalUsers: '--',
            totalDonors: '--',
            pendingFacilities: '--',
            activeEmergencies: '--',
            totalAvailableStock: '--',
            monthlyDonations: '--',
            totalRequests: '--',
            pendingRequests: '--',
          });
          setStockByGroup({});
        }
      } catch (err) {
        if (!isMounted) return;
        console.warn('Failed to load admin dashboard stats:', err);
        setStats({
          totalUsers: '--',
          totalDonors: '--',
          pendingFacilities: '--',
          activeEmergencies: '--',
          totalAvailableStock: '--',
          monthlyDonations: '--',
          totalRequests: '--',
          pendingRequests: '--',
        });
        setStockByGroup({});
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAdminStats();

    return () => {
      isMounted = false;
    };
  }, []);

  const stockChartData = useMemo(() => {
    return BLOOD_GROUPS.map((group) => {
      const units = Number(stockByGroup[group] ?? 0);
      const status = units < 5 ? 'CRITICAL' : units < LOW_STOCK_THRESHOLD ? 'LOW' : 'ADEQUATE';
      return {
        group,
        units,
        threshold: LOW_STOCK_THRESHOLD,
        status,
      };
    });
  }, [stockByGroup]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* ── TOP HERO COMMAND BANNER ── */}
      <div className="rounded-3xl bg-[#1E293B] border border-slate-800 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="space-y-2 relative z-10 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">
              Live National Command Center
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 uppercase">
              Admin Mode
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Transfusion Network Oversight
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">
            Centralized orchestration terminal for facility compliance audits, emergency trauma dispatch,
            inventory safety buffers, and regulatory reporting.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <Link to="/admin/reports">
            <Button
              variant="primary"
              size="md"
              leftIcon={<Download className="w-4 h-4" />}
            >
              Export Reports
            </Button>
          </Link>
          <Link to="/admin/broadcast">
            <Button
              variant="outline"
              size="md"
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              leftIcon={<Radio className="w-4 h-4" />}
            >
              Broadcast Alert
            </Button>
          </Link>
        </div>

        <Droplet className="absolute -right-6 -bottom-8 w-60 h-60 text-white/5 pointer-events-none" />
      </div>

      {/* ── PRIMARY KPI CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total User Directory"
          value={stats.totalUsers}
          subtitle="Registered participants"
          icon={<Users className="w-5 h-5 text-blue-500" />}
          color="blue"
        />
        <StatCard
          title="Verified Donors"
          value={stats.totalDonors}
          subtitle="Active on call registry"
          icon={<HeartHandshake className="w-5 h-5 text-emerald-500" />}
          color="emerald"
        />
        <StatCard
          title="Pending Approvals"
          value={stats.pendingFacilities}
          subtitle="Hospitals & Blood Banks"
          icon={<Building2 className="w-5 h-5 text-amber-500" />}
          color="amber"
        />
        <StatCard
          title="Live Emergencies"
          value={stats.activeEmergencies}
          subtitle="Real-time trauma dispatch"
          icon={<ShieldAlert className="w-5 h-5 text-red-500" />}
          color="red"
        />
      </div>

      {/* ── CHARTS ROW 1: MONTHLY DONATIONS & REQUESTS OVERVIEW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donations this month card */}
        <div className="bg-[#1E293B] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Monthly Donations
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Voluntary contributions logged during the current month.
            </p>
          </div>

          <div className="py-4">
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Donations this month: {stats.monthlyDonations}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              Monthly trend data coming soon
            </span>
          </div>
        </div>

        {/* Requests overview card */}
        <div className="bg-[#1E293B] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-400" />
              Requisitions Overview
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Live hospital clinical requisitions and dispatch demand.
            </p>
          </div>

          <div className="py-4">
            <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Requests: total {stats.totalRequests}, pending approvals {stats.pendingRequests}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              Detailed status breakdown coming soon
            </span>
          </div>
        </div>
      </div>

      {/* ── CHARTS ROW 2: BLOOD STOCK BY GROUP BAR CHART ── */}
      <div className="bg-[#1E293B] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-red-500" />
              Blood Reserve Stock by Group vs Safety Threshold
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Red markers signify critical groups operating below the safety buffer.
            </p>
          </div>

          <Link to="/admin/inventory">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Manage All Bank Inventory
            </Button>
          </Link>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stockChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="group" stroke="#94A3B8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderColor: '#334155',
                  borderRadius: '16px',
                  color: '#F8FAFC',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="units" radius={[8, 8, 0, 0]} name="Available Units">
                {stockChartData.map((entry, index) => {
                  const color =
                    entry.status === 'CRITICAL'
                      ? '#EF4444'
                      : entry.status === 'LOW'
                      ? '#F59E0B'
                      : '#10B981';
                  return <Cell key={`bar-${index}`} fill={color} />;
                })}
              </Bar>
              <Bar dataKey="threshold" fill="#475569" radius={[4, 4, 0, 0]} name="Buffer Threshold" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── QUICK ACTION TERMINALS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/admin/facilities"
          className="p-5 rounded-2xl bg-[#1E293B] border border-slate-800 hover:border-red-900 transition-all group flex items-start justify-between"
        >
          <div className="space-y-1">
            <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider block">
              12 Pending
            </span>
            <h4 className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">
              Facility Audits
            </h4>
            <p className="text-xs text-slate-400 font-medium">Approve or reject hospitals.</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-red-400 group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          to="/admin/emergency"
          className="p-5 rounded-2xl bg-[#1E293B] border border-slate-800 hover:border-red-900 transition-all group flex items-start justify-between"
        >
          <div className="space-y-1">
            <span className="text-[10px] font-black text-red-400 uppercase tracking-wider block">
              Real-Time
            </span>
            <h4 className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">
              Live Emergency Beacon
            </h4>
            <p className="text-xs text-slate-400 font-medium">Coordinate trauma dispatch.</p>
          </div>
          <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
        </Link>

        <Link
          to="/admin/complaints"
          className="p-5 rounded-2xl bg-[#1E293B] border border-slate-800 hover:border-red-900 transition-all group flex items-start justify-between"
        >
          <div className="space-y-1">
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider block">
              Support Desk
            </span>
            <h4 className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">
              Grievance Tickets
            </h4>
            <p className="text-xs text-slate-400 font-medium">Respond and resolve complaints.</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-red-400 group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          to="/admin/audit-logs"
          className="p-5 rounded-2xl bg-[#1E293B] border border-slate-800 hover:border-red-900 transition-all group flex items-start justify-between"
        >
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Security
            </span>
            <h4 className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">
              Audit Trail Logs
            </h4>
            <p className="text-xs text-slate-400 font-medium">Inspect all system mutations.</p>
          </div>
          <ClipboardList className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
        </Link>
      </div>
    </div>
  );
};

export default AdminDashboard;
