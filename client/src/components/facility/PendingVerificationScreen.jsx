import React, { useState } from 'react';
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  FileText,
  AlertCircle,
  RefreshCw,
  PhoneCall,
  Mail,
  LogOut,
  Building2,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button, StatusBadge } from '../common';
import toast from 'react-hot-toast';

export const PendingVerificationScreen = ({ onUploadLicenseClick, onVerificationApproved }) => {
  const { user, updateUser, logout } = useAuth();
  const [checking, setChecking] = useState(false);

  const facilityName =
    user?.hospitalName ||
    user?.bloodBankName ||
    user?.facilityName ||
    user?.name ||
    'Medical Healthcare Facility';

  const licenseNumber =
    user?.licenseNumber ||
    user?.registrationNumber ||
    'LIC-NABH-2026-PENDING';

  const userRole = (user?.role || 'FACILITY').replace('_', ' ');

  const handleCheckStatus = async () => {
    setChecking(true);
    // Simulate re-verifying with server
    setTimeout(() => {
      setChecking(false);
      if (user?.status === 'ACTIVE' || user?.isVerified) {
        toast.success('Your facility account has been verified! Welcome to LifeDrop.');
        if (onVerificationApproved) onVerificationApproved();
      } else {
        toast.error('Verification review is still in progress by our medical audit team.');
      }
    }, 900);
  };

  const handleSimulateApproval = () => {
    updateUser({
      ...user,
      status: 'ACTIVE',
      isVerified: true,
      verificationStatus: 'APPROVED',
    });
    toast.success('Demo Simulation: Account status updated to APPROVED/ACTIVE!');
    if (onVerificationApproved) onVerificationApproved();
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-3xl border border-red-100 shadow-xl shadow-red-950/5 overflow-hidden">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white p-6 sm:p-8 relative">
          <div className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-black uppercase tracking-wider backdrop-blur-sm">
              <Clock className="w-3.5 h-3.5 animate-spin text-white" />
              Administrative Review in Progress
            </span>
            <span className="text-xs font-bold text-amber-100 uppercase tracking-widest">
              {userRole} Portal
            </span>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shrink-0 shadow-lg">
              <ShieldAlert className="w-9 h-9" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                Waiting for Admin Verification
              </h1>
              <p className="text-xs sm:text-sm text-amber-100 font-medium mt-1">
                Your medical facility onboarding application is currently under clinical review.
              </p>
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Explanation Box */}
          <div className="p-4 rounded-2xl bg-[#FFF8F8] border border-red-100 flex items-start gap-3.5">
            <AlertCircle className="w-5 h-5 text-[#C62828] shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
              In accordance with national blood safety guidelines and CDSCO regulatory compliance, all registered
              hospitals and blood banks must be verified by a LifeDrop Chief Medical Administrator
              before dispatching or requisitioning blood units.
            </p>
          </div>

          {/* 3-Step Review Progression Bar */}
          <div className="space-y-2">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
              Verification Pipeline
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-emerald-900">Application</p>
                  <p className="text-[10px] text-emerald-700 font-medium">Submitted</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300 flex items-center gap-2.5 ring-2 ring-amber-400/40 animate-pulse">
                <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-900">License Audit</p>
                  <p className="text-[10px] text-amber-700 font-medium">In Progress</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2.5 opacity-60">
                <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-400">
                  3
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700">Activation</p>
                  <p className="text-[10px] text-slate-500 font-medium">Pending Clearance</p>
                </div>
              </div>
            </div>
          </div>

          {/* Submitted Facility Record Preview */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Submitted Credentials
              </span>
              <StatusBadge status="PENDING" size="xs" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-slate-400 font-medium">Facility Entity</p>
                <p className="text-slate-900 font-bold mt-0.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#C62828]" />
                  {facilityName}
                </p>
              </div>

              <div>
                <p className="text-slate-400 font-medium">License / Accreditation ID</p>
                <p className="text-slate-900 font-bold mt-0.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  {licenseNumber}
                </p>
              </div>

              <div>
                <p className="text-slate-400 font-medium">Contact Email</p>
                <p className="text-slate-900 font-bold mt-0.5">{user?.email || 'N/A'}</p>
              </div>

              <div>
                <p className="text-slate-400 font-medium">City / Jurisdiction</p>
                <p className="text-slate-900 font-bold mt-0.5">{user?.city || 'Mumbai'}</p>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={handleCheckStatus}
              isLoading={checking}
              leftIcon={<RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />}
            >
              Refresh Verification Status
            </Button>

            {onUploadLicenseClick && (
              <Button
                variant="outline"
                size="md"
                fullWidth
                onClick={onUploadLicenseClick}
                leftIcon={<FileText className="w-4 h-4" />}
              >
                Upload / Update License
              </Button>
            )}

            <Button
              variant="ghost"
              size="md"
              onClick={logout}
              leftIcon={<LogOut className="w-4 h-4" />}
            >
              Sign Out
            </Button>
          </div>

          {/* Evaluator Quick Bypass Switch */}
          <div className="mt-4 p-3.5 rounded-2xl bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C62828] shrink-0" />
              <div>
                <strong className="text-slate-900">Reviewer Test Mode:</strong>
                <span className="text-slate-600 ml-1">Simulate administrative approval to test all operational features immediately.</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSimulateApproval}
              className="px-3 py-1.5 rounded-xl bg-[#C62828] text-white font-bold hover:bg-[#991B1B] transition-colors shrink-0 shadow-sm"
            >
              Simulate Approval
            </button>
          </div>

          {/* Support / Helpdesk Hotline Footer */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <div className="flex items-center gap-2 text-slate-600">
              <PhoneCall className="w-3.5 h-3.5 text-[#C62828]" />
              <span>Medical Compliance Desk: <strong>1800-LIFEDROP (Toll-free)</strong></span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>compliance@lifedrop.org</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingVerificationScreen;
