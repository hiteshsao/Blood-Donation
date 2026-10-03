import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { KeyRound, CheckCircle2, RotateCcw, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../components/common';
import { useAuth } from '../context/AuthContext';

export const VerifyOtp = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { verifyOtp, user, role } = useAuth();

  const emailParam = searchParams.get('email') || user?.email || 'user@example.com';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);

  const inputRefs = useRef([]);

  // Auto focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Resend countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto focus next box
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasted)) {
      const digits = pasted.split('');
      setOtp(digits);
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async (e) => {
    e?.preventDefault();
    const code = otp.join('');
    if (code.length < 6) {
      toast.error('Please enter the complete 6-digit OTP');
      return;
    }

    setIsVerifying(true);
    try {
      await verifyOtp(emailParam, code);
      toast.success('Identity verified successfully! Welcome to LifeDrop.');
      navigate(role === 'ADMIN' ? '/admin' : '/dashboard');
    } catch (err) {
      toast.error(err.message || 'Verification failed. Try entering 123456 in demo mode.');
    } finally {
      setIsVerifying(false);
    }
  };

  const fillDemoCode = () => {
    setOtp(['1', '2', '3', '4', '5', '6']);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center max-w-lg mx-auto">
      <div className="w-full bg-white rounded-3xl border border-red-100 shadow-xl shadow-red-900/5 p-8 sm:p-10 text-center">
        {/* Header Icon */}
        <div className="w-14 h-14 rounded-2xl bg-red-50 text-[#C62828] border border-red-100 flex items-center justify-center mx-auto mb-4">
          <KeyRound className="w-7 h-7" />
        </div>

        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Verify Two-Factor Code
        </h2>

        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-2">
          We sent a 6-digit one-time code to{' '}
          <strong className="text-slate-800">{emailParam}</strong>
        </p>

        {/* Demo Hint Banner */}
        <div className="mt-4 p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
          <span className="font-bold">🧪 Testing OTP: 123456</span>
          <button
            type="button"
            onClick={fillDemoCode}
            className="text-[11px] font-black uppercase text-[#C62828] hover:underline"
          >
            Auto Fill
          </button>
        </div>

        {/* 6 OTP Input Boxes */}
        <form onSubmit={handleVerify} className="mt-8 space-y-6">
          <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-11 sm:w-12 h-14 text-center font-black text-xl text-slate-900 bg-slate-50 rounded-2xl border border-slate-200 focus:border-[#C62828] focus:bg-white focus:ring-2 focus:ring-red-100 transition-all outline-none"
              />
            ))}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isVerifying}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Verify & Authenticate
          </Button>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 font-medium">
            <span>Didn't get the code?</span>
            {resendTimer > 0 ? (
              <span className="text-slate-400 font-bold">Resend in {resendTimer}s</span>
            ) : (
              <button
                type="button"
                onClick={() => setResendTimer(60)}
                className="text-[#C62828] font-bold hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Resend Code
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default VerifyOtp;
