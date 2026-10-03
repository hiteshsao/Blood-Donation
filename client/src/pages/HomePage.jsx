import { useState, useEffect } from 'react';
import { 
  Droplet, 
  Server, 
  Database, 
  Cpu, 
  ShieldCheck, 
  Users, 
  Building2, 
  Hospital, 
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Layers,
  Activity,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios.js';

export const HomePage = () => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHealth = async (showToast = false) => {
    try {
      setLoading(true);
      const res = await api.get('/health');
      setHealthData(res.data);
      setError(null);
      if (showToast) {
        toast.success('Health check successful! Server is online.');
      }
    } catch (err) {
      setError(err.message);
      if (showToast) {
        toast.error(`Health check failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth(false);
  }, []);

  const roles = [
    {
      title: 'Individual Donors & Users',
      role: 'USER / DONOR',
      desc: 'Register, complete eligibility profiles, track donation history, and schedule blood donation appointments.',
      icon: Users,
      badge: 'bg-red-500/10 text-red-400 border-red-500/20',
      accent: 'border-red-500/30 hover:border-red-500/60',
    },
    {
      title: 'Hospitals & Medical Centers',
      role: 'HOSPITAL',
      desc: 'Submit urgent blood requests, manage recipient allocations, and coordinate with regional blood banks.',
      icon: Hospital,
      badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      accent: 'border-blue-500/30 hover:border-blue-500/60',
    },
    {
      title: 'Blood Banks',
      role: 'BLOOD_BANK',
      desc: 'Manage inventory levels across 8 blood groups, process incoming units, and fulfill hospital requisitions.',
      icon: Building2,
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      accent: 'border-emerald-500/30 hover:border-emerald-500/60',
    },
    {
      title: 'System Administrators',
      role: 'ADMIN',
      desc: 'Oversee multi-role users, audit logs, emergency broadcasts, complaint resolution, and analytics.',
      icon: ShieldCheck,
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      accent: 'border-amber-500/30 hover:border-amber-500/60',
    },
  ];

  const modules = [
    '1. Auth (JWT & Roles)',
    '2. User Profile',
    '3. Donor Registry',
    '4. Geo/Group Search',
    '5. Blood Requests',
    '6. Emergency Alerts',
    '7. Appointments',
    '8. Live Notifications',
    '9. Feedback & Complaints',
    '10. Admin Command Center',
    '11. Audit Log Middleware',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Hero Header */}
      <section className="text-center space-y-5 pt-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-950/50 border border-red-800/40 text-red-300 text-xs font-semibold uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          Enterprise Blood Donation Management System
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight">
          Saving Lives Through <span className="bg-gradient-to-r from-red-500 via-rose-500 to-amber-500 bg-clip-text text-transparent">Seamless Coordination</span>
        </h1>
        <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-400">
          A high-performance full-stack system linking donors, hospitals, and blood banks with real-time inventory, geo-search, and automated notifications.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <button
            onClick={() => fetchHealth(true)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium shadow-lg shadow-red-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Run Live Health Check
          </button>

          <a
            href="http://localhost:5000/api-docs"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition-colors"
          >
            <span>Explore Swagger OpenAPI</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* Live System Diagnostics Grid */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-800/80 gap-3">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-red-500" />
              Real-Time Backend Diagnostics
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live endpoint verification: <code className="text-red-400">GET /api/v1/health</code>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {error ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <AlertTriangle className="w-3.5 h-3.5" /> Offline ({error})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" /> All Services Operational
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
          {/* Status */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Server Status</span>
              <Server className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white capitalize">
              {healthData?.status || (loading ? 'Checking...' : 'Offline')}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Environment: <span className="text-slate-300 font-mono">{healthData?.environment || 'dev'}</span>
            </div>
          </div>

          {/* Database */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>MongoDB State</span>
              <Database className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white capitalize">
              {healthData?.database?.status || (loading ? 'Checking...' : 'Disconnected')}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              DB: <span className="text-slate-300 font-mono">{healthData?.database?.name || 'blood_donation_db'}</span>
            </div>
          </div>

          {/* Uptime */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Process Uptime</span>
              <Cpu className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white">
              {healthData?.uptime || '—'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Platform: <span className="text-slate-300 font-mono">{healthData?.system?.platform || 'node'}</span>
            </div>
          </div>

          {/* Memory */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Memory Heap</span>
              <Activity className="w-4 h-4 text-rose-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white">
              {healthData?.system?.memoryUsage?.heapUsed || '—'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              RSS: <span className="text-slate-300 font-mono">{healthData?.system?.memoryUsage?.rss || '—'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Roles Section */}
      <section className="space-y-6">
        <div className="text-center sm:text-left">
          <h2 className="text-2xl font-bold text-white flex items-center justify-center sm:justify-start gap-2">
            <Users className="w-6 h-6 text-red-500" />
            Role-Based Access Control Architecture
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Engineered with strict RBAC middlewares and dedicated route permissions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {roles.map((r, i) => {
            const Icon = r.icon;
            return (
              <div
                key={i}
                className={`p-5 rounded-2xl bg-slate-900/60 border transition-all duration-200 hover:-translate-y-1 ${r.accent}`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-white">
                    <Icon className="w-5 h-5 text-red-400" />
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${r.badge}`}>
                    {r.role}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-white mt-4">{r.title}</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">{r.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Backend Modules Overview */}
      <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-red-500" />
          <h2 className="text-lg font-bold text-white">Backend Layered Modules Roadmap</h2>
        </div>
        <p className="text-xs text-slate-400">
          Every module implements routes &rarr; controller &rarr; service &rarr; model with Joi validation:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
          {modules.map((mod, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-950/50 border border-slate-800 text-xs text-slate-300 font-medium"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span>{mod}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
