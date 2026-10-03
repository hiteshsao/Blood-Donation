import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Input } from '../components/common';
import { useAuth } from '../context/AuthContext';

export const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!email) errs.email = 'Email address is required';
    if (!otp) errs.otp = 'Verification code is required';
    if (!newPassword || newPassword.length < 6) {
      errs.newPassword = 'Password must be at least 6 characters';
    }
    if (newPassword !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await resetPassword({ email, otp, newPassword });
      toast.success('Password updated successfully! Please sign in with your new password.');
      navigate('/login');
    } catch (err) {
      toast.error(err.message || 'Failed to reset password. (Demo OTP: 123456)');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center max-w-md mx-auto">
      <div className="w-full bg-white rounded-3xl border border-red-100 shadow-xl shadow-red-900/5 p-8 sm:p-10">
        <div className="text-center space-y-2 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#C62828] flex items-center justify-center mx-auto border border-red-100 shadow-sm">
            <Lock className="w-6 h-6" />
          </div>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Create New Password
          </h2>

          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Enter the recovery OTP code and your new credentials.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="name@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />

          <Input
            label="6-Digit Recovery Code (Demo: 123456)"
            type="text"
            placeholder="123456"
            required
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            error={errors.otp}
          />

          <Input
            label="New Password"
            type="password"
            placeholder="Minimum 6 characters"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={errors.newPassword}
          />

          <Input
            label="Confirm New Password"
            type="password"
            placeholder="Re-type new password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
          />

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isSubmitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Update Password
            </Button>
          </div>

          <div className="pt-4 text-center">
            <Link
              to="/login"
              className="text-xs font-bold text-slate-500 hover:text-[#C62828] transition-colors"
            >
              Remember password? Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
