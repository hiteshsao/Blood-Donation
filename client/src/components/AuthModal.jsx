import React, { useState } from 'react';
import { useAuth, DEMO_PERSONAS } from '../context/AuthContext';
import { LifeDropLogo } from './LifeDropLogo';
import {
  Mail,
  Lock,
  User,
  Phone,
  Droplet,
  X,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building2,
  Hospital,
  Sparkles,
  KeyRound,
  UserCheck,
  Shield,
  Heart,
  ChevronRight,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const AuthModal = ({ isOpen, onClose }) => {
  const { login, loginAsDemo, register, verifyOtp } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'otp' | 'demo'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Sign In form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register form state
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [role, setRole] = useState('DONOR');

  // OTP state
  const [otp, setOtp] = useState('');

  if (!isOpen) return null;

  // Handle Standard Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(email, password);
      toast.success(
        res?.isDemo
          ? `Signed in as Demo Persona: ${res.user.name}`
          : `Welcome back, ${res?.user?.name || 'User'}!`
      );
      onClose();
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials or use Quick Demo.');
    } finally {
      setLoading(false);
    }
  };

  // Quick Autofill for Sign In Form
  const autofillCredentials = (type) => {
    setError('');
    if (type === 'doctor') {
      setEmail('icu.doctor@test.com');
      setPassword('Password@123');
    } else if (type === 'universal') {
      setEmail('donor.oneg@test.com');
      setPassword('SecurePassword123!');
    } else if (type === 'opos') {
      setEmail('donor.opos@test.com');
      setPassword('SecurePassword123!');
    } else if (type === 'admin') {
      setEmail('admin@blooddonation.org');
      setPassword('AdminPassword123!');
    }
  };

  // Handle 1-Click Instant Demo Login
  const handleInstantDemoLogin = (personaKey) => {
    setError('');
    const persona = loginAsDemo(personaKey);
    toast.success(`⚡ Instant Login: ${persona.title} (${persona.user.role})`);
    onClose();
  };

  // Handle Register
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await register({
        name,
        email: regEmail,
        mobile,
        password: regPassword,
        bloodGroup,
        role,
      });
      setSuccessMsg(res.message || 'Verification code sent. Code: 123456');
      toast.success('Registration started! Please verify OTP code.');
      setMode('otp');
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP Verification
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await verifyOtp(regEmail, otp);
      toast.success(`Account verified! Welcome to LifeDrop, ${res?.user?.name || name}!`);
      setTimeout(() => onClose(), 400);
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-[0_25px_60px_rgba(198,40,40,0.25)] border border-red-100 overflow-hidden flex flex-col font-sans max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-slate-100/80 hover:bg-red-50 text-slate-500 hover:text-[#C62828] flex items-center justify-center transition-colors"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Top Crimson LifeDrop Header */}
        <div className="bg-gradient-to-br from-[#FFF5F5] via-[#FFF8F8] to-[#FFEAEA] p-6 pb-4 border-b border-red-100/80 text-center">
          <div className="flex justify-center mb-2.5">
            <LifeDropLogo size="default" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">
            {mode === 'login' && 'Sign In to LifeDrop'}
            {mode === 'register' && 'Create Your Account'}
            {mode === 'demo' && 'Quick Demo Personas'}
            {mode === 'otp' && 'Verify Your Email OTP'}
          </h2>

          <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
            {mode === 'login' && 'Manage your donor availability, track urgent requests, or dispatch units.'}
            {mode === 'register' && 'Join the network as a voluntary donor, hospital, or recipient.'}
            {mode === 'demo' && 'Instant 1-click login with pre-configured hospital, donor, and admin roles.'}
            {mode === 'otp' && `Enter the 6-digit confirmation code dispatched to ${regEmail || 'your email'}.`}
          </p>

          {/* Navigation Mode Tabs */}
          {mode !== 'otp' && (
            <div className="flex items-center justify-center gap-1 mt-4 bg-white/90 p-1 rounded-full border border-red-100/90 shadow-2xs max-w-xs mx-auto">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
                className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all ${
                  mode === 'login'
                    ? 'bg-[#C62828] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#C62828]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError('');
                }}
                className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all ${
                  mode === 'register'
                    ? 'bg-[#C62828] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#C62828]'
                }`}
              >
                Register
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('demo');
                  setError('');
                }}
                className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                  mode === 'demo'
                    ? 'bg-[#C62828] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#C62828]'
                }`}
              >
                <Zap size={13} />
                <span>Demo</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Body & Forms */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              TAB 1: SIGN IN
          ══════════════════════════════════════════════════ */}
          {mode === 'login' && (
            <div className="space-y-4">
              {/* Quick Autofill Selector Pills */}
              <div className="bg-[#FFF8F8] p-3 rounded-2xl border border-red-100">
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block mb-2">
                  ⚡ 1-Click Autofill Demo Credentials:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => autofillCredentials('doctor')}
                    className="p-1.5 text-left rounded-xl bg-white border border-red-100 hover:border-[#C62828] text-xs font-medium transition-all flex items-center gap-1.5 text-[#0F172A] hover:bg-red-50/50"
                  >
                    <Hospital size={14} className="text-[#C62828] shrink-0" />
                    <span className="truncate">ICU Doctor</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => autofillCredentials('universal')}
                    className="p-1.5 text-left rounded-xl bg-white border border-red-100 hover:border-[#C62828] text-xs font-medium transition-all flex items-center gap-1.5 text-[#0F172A] hover:bg-red-50/50"
                  >
                    <Droplet size={14} className="text-[#C62828] shrink-0" />
                    <span className="truncate">O- Universal Donor</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => autofillCredentials('opos')}
                    className="p-1.5 text-left rounded-xl bg-white border border-red-100 hover:border-[#C62828] text-xs font-medium transition-all flex items-center gap-1.5 text-[#0F172A] hover:bg-red-50/50"
                  >
                    <Heart size={14} className="text-[#C62828] shrink-0" />
                    <span className="truncate">O+ Active Donor</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => autofillCredentials('admin')}
                    className="p-1.5 text-left rounded-xl bg-white border border-red-100 hover:border-[#C62828] text-xs font-medium transition-all flex items-center gap-1.5 text-[#0F172A] hover:bg-red-50/50"
                  >
                    <ShieldCheck size={14} className="text-[#C62828] shrink-0" />
                    <span className="truncate">System Admin</span>
                  </button>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-2.5 text-[#94A3B8]" />
                    <input
                      type="email"
                      required
                      placeholder="donor@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#C62828] focus:ring-1 focus:ring-[#C62828] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-[#0F172A]">
                      Password
                    </label>
                    <span className="text-[11px] text-[#64748B]">Demo: Password@123</span>
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-2.5 text-[#94A3B8]" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#C62828] focus:ring-1 focus:ring-[#C62828] outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#991B1B] to-[#C62828] hover:from-[#7F1D1D] hover:to-[#B71C1C] text-white text-xs font-bold transition-all shadow-md active:scale-98 mt-1 flex items-center justify-center gap-1.5"
                >
                  <KeyRound size={15} />
                  <span>{loading ? 'Authenticating...' : 'Sign In to Account'}</span>
                </button>
              </form>

              <div className="pt-2 text-center text-xs text-[#64748B] flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="font-bold text-[#C62828] hover:underline"
                >
                  Create an Account
                </button>

                <button
                  type="button"
                  onClick={() => setMode('demo')}
                  className="font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
                >
                  <Zap size={12} />
                  <span>Instant 1-Click Demo</span>
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              TAB 2: REGISTER
          ══════════════════════════════════════════════════ */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1">
                  I am Registering As
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'DONOR', label: 'Voluntary Donor', icon: Heart },
                    { id: 'USER', label: 'Blood Recipient', icon: User },
                    { id: 'HOSPITAL', label: 'Hospital / Clinic', icon: Hospital },
                  ].map((r) => {
                    const Icon = r.icon;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRole(r.id)}
                        className={`p-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                          role === r.id
                            ? 'bg-[#C62828] text-white shadow-xs'
                            : 'bg-[#FFF5F5] text-[#334155] hover:bg-red-50 border border-red-100'
                        }`}
                      >
                        <Icon size={14} />
                        <span>{r.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1">
                  Full Name / Organization
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-2.5 text-[#94A3B8]" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patel"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#C62828] focus:ring-1 focus:ring-[#C62828] outline-none"
                  />
                </div>
              </div>

              {/* Email & Mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-2.5 text-[#94A3B8]" />
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#C62828] focus:ring-1 focus:ring-[#C62828] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-2.5 text-[#94A3B8]" />
                    <input
                      type="tel"
                      required
                      placeholder="9876543210"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#C62828] focus:ring-1 focus:ring-[#C62828] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Password & Blood Group */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-2.5 text-[#94A3B8]" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#C62828] focus:ring-1 focus:ring-[#C62828] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    Blood Group
                  </label>
                  <div className="relative">
                    <Droplet size={16} className="absolute left-3 top-2.5 text-[#C62828]" />
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#C62828] focus:ring-1 focus:ring-[#C62828] outline-none bg-white font-bold"
                    >
                      {BLOOD_GROUPS.map((grp) => (
                        <option key={grp} value={grp}>{grp}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#991B1B] to-[#C62828] hover:from-[#7F1D1D] hover:to-[#B71C1C] text-white text-xs font-bold transition-all shadow-md active:scale-98 mt-2 flex items-center justify-center gap-1.5"
              >
                <UserCheck size={16} />
                <span>{loading ? 'Creating Account...' : 'Register & Receive OTP'}</span>
              </button>

              <div className="pt-2 text-center text-xs text-[#64748B]">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="font-bold text-[#C62828] hover:underline"
                >
                  Sign In
                </button>
              </div>
            </form>
          )}

          {/* ══════════════════════════════════════════════════
              TAB 3: QUICK DEMO PERSONAS (1-CLICK LOGIN)
          ══════════════════════════════════════════════════ */}
          {mode === 'demo' && (
            <div className="space-y-2.5">
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-center gap-2 text-amber-900 text-xs">
                <Sparkles size={16} className="text-amber-600 shrink-0" />
                <span>
                  Click any role below to <strong>instantly sign in</strong> with loaded credentials, coordinates, and permissions:
                </span>
              </div>

              {/* 1. Doctor Persona */}
              <button
                type="button"
                onClick={() => handleInstantDemoLogin('doctor')}
                className="w-full p-3.5 rounded-2xl bg-white hover:bg-[#FFF5F5] border border-slate-200 hover:border-red-300 flex items-center justify-between text-left transition-all shadow-2xs group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#C62828] text-white flex items-center justify-center font-bold shadow-xs">
                    <Hospital size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-[#0F172A]">
                        {DEMO_PERSONAS.doctor.title}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-[#C62828] text-[10px] font-extrabold uppercase">
                        HOSPITAL
                      </span>
                    </div>
                    <span className="text-[11px] text-[#64748B] block mt-0.5">
                      {DEMO_PERSONAS.doctor.subtitle}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-[#C62828] group-hover:translate-x-1 transition-transform">
                  <span>Sign In</span>
                  <ChevronRight size={16} />
                </div>
              </button>

              {/* 2. Universal Donor (O-) */}
              <button
                type="button"
                onClick={() => handleInstantDemoLogin('universal')}
                className="w-full p-3.5 rounded-2xl bg-white hover:bg-[#FFF5F5] border border-slate-200 hover:border-red-300 flex items-center justify-between text-left transition-all shadow-2xs group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center font-black text-sm shadow-xs">
                    O-
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-[#0F172A]">
                        {DEMO_PERSONAS.universal.title}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-extrabold uppercase">
                        UNIVERSAL
                      </span>
                    </div>
                    <span className="text-[11px] text-[#64748B] block mt-0.5">
                      {DEMO_PERSONAS.universal.subtitle}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-[#C62828] group-hover:translate-x-1 transition-transform">
                  <span>Sign In</span>
                  <ChevronRight size={16} />
                </div>
              </button>

              {/* 3. Active Donor (O+) */}
              <button
                type="button"
                onClick={() => handleInstantDemoLogin('opos')}
                className="w-full p-3.5 rounded-2xl bg-white hover:bg-[#FFF5F5] border border-slate-200 hover:border-red-300 flex items-center justify-between text-left transition-all shadow-2xs group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#C62828] text-white flex items-center justify-center font-black text-sm shadow-xs">
                    O+
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-[#0F172A]">
                        {DEMO_PERSONAS.opos.title}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                        VERIFIED DONOR
                      </span>
                    </div>
                    <span className="text-[11px] text-[#64748B] block mt-0.5">
                      {DEMO_PERSONAS.opos.subtitle}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-[#C62828] group-hover:translate-x-1 transition-transform">
                  <span>Sign In</span>
                  <ChevronRight size={16} />
                </div>
              </button>

              {/* 4. Administrator */}
              <button
                type="button"
                onClick={() => handleInstantDemoLogin('admin')}
                className="w-full p-3.5 rounded-2xl bg-white hover:bg-[#FFF5F5] border border-slate-200 hover:border-red-300 flex items-center justify-between text-left transition-all shadow-2xs group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-800 text-white flex items-center justify-center font-bold shadow-xs">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-[#0F172A]">
                        {DEMO_PERSONAS.admin.title}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[10px] font-extrabold uppercase">
                        ADMIN
                      </span>
                    </div>
                    <span className="text-[11px] text-[#64748B] block mt-0.5">
                      {DEMO_PERSONAS.admin.subtitle}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-[#C62828] group-hover:translate-x-1 transition-transform">
                  <span>Sign In</span>
                  <ChevronRight size={16} />
                </div>
              </button>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              TAB 4: OTP VERIFICATION
          ══════════════════════════════════════════════════ */}
          {mode === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4 text-center">
              <div className="p-3 bg-[#FFF8F8] border border-red-100 rounded-2xl">
                <span className="text-xs font-bold text-[#0F172A] block mb-1">
                  Verification Code sent to:
                </span>
                <span className="text-xs font-semibold text-[#C62828]">
                  {regEmail || 'your email'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-2">
                  Enter 6-Digit Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-48 mx-auto text-center tracking-widest text-2xl font-black px-4 py-2 rounded-2xl border-2 border-[#C62828] focus:ring-2 focus:ring-red-200 outline-none text-[#0F172A]"
                />
              </div>

              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setOtp('123456')}
                  className="px-3 py-1.5 rounded-full bg-red-50 hover:bg-red-100 text-[#C62828] text-xs font-bold transition-all"
                >
                  ⚡ Auto-fill Code (123456)
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#991B1B] to-[#C62828] text-white text-xs font-bold shadow-md active:scale-98 transition-all"
              >
                {loading ? 'Verifying Code...' : 'Verify & Complete Setup'}
              </button>

              <button
                type="button"
                onClick={() => setMode('register')}
                className="text-xs text-[#64748B] hover:text-[#C62828] font-semibold"
              >
                ← Back to registration form
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
