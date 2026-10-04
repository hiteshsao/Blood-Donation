import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Droplet,
  ArrowRight,
  Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Input } from '../components/common';
import { useAuth } from '../context/AuthContext';

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

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
      if (err.requiresVerification && err.email) {
        navigate(`/verify-otp?email=${encodeURIComponent(err.email)}`);
      }
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
