import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Droplet,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Heart,
  Building2,
  Users,
  Lock,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Input } from '../components/common';
import { useAuth } from '../context/AuthContext';

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginAsDemo } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const demoAccounts = [
    {
      roleKey: 'donor',
      title: 'Vikram Malhotra',
      desc: 'Universal O- Donor',
      icon: <Heart className="w-4 h-4 text-red-600 fill-red-600" />,
    },
    {
      roleKey: 'hospital',
      title: 'Dr. Ananya Sen',
      desc: 'Apollo Hospital (Verified)',
      icon: <Building2 className="w-4 h-4 text-blue-600" />,
    },
    {
      roleKey: 'bloodbank',
      title: 'RedCross Center',
      desc: 'Blood Bank Manager',
      icon: <Droplet className="w-4 h-4 text-rose-600" />,
    },
    {
      roleKey: 'user',
      title: 'Rahul Sharma',
      desc: 'Recipient (User)',
      icon: <Users className="w-4 h-4 text-slate-600" />,
    },
    {
      roleKey: 'pending_facility',
      title: 'Metro Trauma Care',
      desc: 'Waiting for Admin Audit',
      icon: <Clock className="w-4 h-4 text-amber-600" />,
    },
  ];

  const handleDemoLogin = (roleKey) => {
    loginAsDemo(roleKey);
    toast.success(`Logged in as demo persona: ${roleKey.toUpperCase()}`);
    navigate(roleKey === 'admin' ? '/admin' : from, { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!email.trim()) errs.email = 'Email address is required';
    if (!password) errs.password = 'Password is required';
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login(email, password);
      toast.success(`Welcome back, ${res.user?.name || 'User'}!`);
      const target = res.user?.role === 'ADMIN' ? '/admin' : from;
      navigate(target, { replace: true });
    } catch (err) {
      toast.error(err.message || 'Invalid credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center max-w-lg mx-auto">
      <div className="w-full bg-white rounded-3xl border border-red-100 shadow-xl shadow-red-900/5 p-6 sm:p-10">
        {/* Brand Logo & Title */}
        <div className="text-center space-y-2 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#991B1B] to-[#C62828] text-white flex items-center justify-center mx-auto shadow-md shadow-red-900/20">
            <Droplet className="w-6 h-6 fill-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Sign In to LifeDrop
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Access real-time transfusion coordination, donor records, and emergency alerts.
          </p>
        </div>

        {/* 1-Click Instant Demo Login Selector */}
        <div className="mb-6 p-4 rounded-2xl bg-[#FFF8F8] border border-red-100">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-black text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-[#C62828]" />
              1-Click Instant Demo Login
            </span>
            <span className="text-[10px] text-slate-400 font-bold">No password required</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {demoAccounts.map((item) => (
              <button
                key={item.roleKey}
                type="button"
                onClick={() => handleDemoLogin(item.roleKey)}
                className="p-2 rounded-xl bg-white border border-slate-200 hover:border-red-300 text-left flex items-center gap-2 hover:bg-red-50/50 transition-all text-xs"
              >
                <div className="p-1 rounded-lg bg-slate-50 shrink-0">{item.icon}</div>
                <div className="truncate">
                  <p className="font-bold text-slate-800 truncate leading-tight">{item.title}</p>
                  <p className="text-[10px] text-slate-400 truncate">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="relative my-6 text-center">
          <hr className="border-slate-100" />
          <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            Or With Email
          </span>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="user@example.com"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
            }}
            error={errors.email}
          />

          <div>
            <div className="flex items-center justify-between mb-1">
              <span />
              <Link
                to="/forgot-password"
                className="text-xs font-bold text-[#C62828] hover:underline"
              >
                Forgot Password?
              </Link>
            </div>
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
              }}
              error={errors.password}
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
              Sign In
            </Button>
          </div>

          <div className="pt-4 text-center space-y-2">
            <p className="text-xs text-slate-500 font-medium">
              Don't have an account yet?{' '}
              <Link to="/register" className="text-[#C62828] font-bold hover:underline">
                Register here
              </Link>
            </p>

            <Link
              to="/admin/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Dedicated Hospital Administrator Login</span>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
