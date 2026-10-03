import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Lock,
  ArrowRight,
  Droplet,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Input } from '../components/common';
import { useAuth } from '../context/AuthContext';

export const AdminLogin = () => {
  const navigate = useNavigate();
  const { login, loginAsDemo } = useAuth();

  const [email, setEmail] = useState('admin@lifedrop.org');
  const [password, setPassword] = useState('Password@123');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleDemoAdmin = () => {
    loginAsDemo('admin');
    toast.success('Elevated to Administrator Session');
    navigate('/admin', { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide administrator credentials.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await login(email, password);
      if (res.user?.role !== 'ADMIN') {
        throw new Error('Access denied. This portal requires an ADMIN role.');
      }
      toast.success('Administrator Access Granted');
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
      toast.error(err.message || 'Admin authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-red-500 selection:text-white">
      {/* Top Brand Link */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between text-xs text-slate-400">
        <Link to="/" className="flex items-center gap-2 text-white hover:text-red-400 transition-colors">
          <Droplet className="w-5 h-5 text-red-500 fill-red-500" />
          <span className="font-black text-sm tracking-tight">LifeDrop</span>
        </Link>
        <Link to="/" className="hover:text-white flex items-center gap-1">
          <span>Public Portal</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto bg-[#1E293B] rounded-3xl border border-slate-800 p-8 sm:p-10 shadow-2xl relative overflow-hidden">
        {/* Subtle accent glow */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center space-y-2 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-[#C62828] text-white flex items-center justify-center mx-auto shadow-lg shadow-red-950/40 border border-red-500/30">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight">
            Central Administrative Portal
          </h2>

          <p className="text-xs text-slate-400 font-medium">
            Restricted entrance for certified hospital supervisors, regional blood coordinators, and system administrators.
          </p>
        </div>

        {/* 1-Click Demo Admin Button */}
        <div className="mb-6 p-4 rounded-2xl bg-slate-900/80 border border-red-900/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-red-400 flex items-center gap-1.5 uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              Evaluation Mode
            </span>
            <span className="text-[10px] text-slate-500 font-semibold">1-Click Elevate</span>
          </div>

          <Button
            variant="secondary"
            size="sm"
            fullWidth
            onClick={handleDemoAdmin}
            className="bg-red-950/50 hover:bg-red-900/60 text-red-300 border-red-800/60"
          >
            Login as Chief Administrator
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-800/50 text-red-400 text-xs font-bold text-center">
            {error}
          </div>
        )}

        {/* Admin Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Admin Identification / Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@lifedrop.org"
              required
              className="w-full px-4 py-2.5 bg-slate-900 text-white placeholder:text-slate-600 text-sm font-medium rounded-xl border border-slate-700 focus:border-red-500 focus:ring-2 focus:ring-red-900/30 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Security Key / Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-2.5 bg-slate-900 text-white placeholder:text-slate-600 text-sm font-medium rounded-xl border border-slate-700 focus:border-red-500 focus:ring-2 focus:ring-red-900/30 outline-none transition-all"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isSubmitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Authenticate Admin Session
            </Button>
          </div>
        </form>
      </div>

      {/* Security Disclaimer */}
      <div className="text-center text-xs text-slate-500 max-w-sm mx-auto">
        <p className="flex items-center justify-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          <span>All administrative mutations and data exports are cryptographically audit-logged.</span>
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
