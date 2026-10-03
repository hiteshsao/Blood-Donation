import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowRight, ArrowLeft, Droplet } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Input } from '../components/common';
import { useAuth } from '../context/AuthContext';

export const ForgotPassword = () => {
  const navigate = useNavigate();
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please provide your registered email address');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await forgotPassword(email.toLowerCase().trim());
      toast.success(res?.message || 'Password reset code dispatched to your inbox.');
      navigate(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err.message || 'Failed to dispatch reset request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center max-w-md mx-auto">
      <div className="w-full bg-white rounded-3xl border border-red-100 shadow-xl shadow-red-900/5 p-8 sm:p-10">
        <div className="text-center space-y-2 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#C62828] flex items-center justify-center mx-auto border border-red-100 shadow-sm">
            <Mail className="w-6 h-6" />
          </div>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Forgot Password?
          </h2>

          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Enter your email to receive a secure recovery code.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Registered Email"
            type="email"
            placeholder="name@example.com"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError('');
            }}
            error={error}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isSubmitting}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Send Recovery Code
          </Button>

          <div className="pt-4 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#C62828] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
