import React from 'react';

const STATUS_MAP = {
  // Account / Verification statuses
  ACTIVE: { label: 'Active', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  VERIFIED: { label: 'Verified', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  PENDING: { label: 'Pending', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  BLOCKED: { label: 'Blocked', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
  REJECTED: { label: 'Rejected', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
  INACTIVE: { label: 'Inactive', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' },

  // Requests / Urgency
  CRITICAL: { label: 'Critical SOS', bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', dot: 'bg-red-600', pulse: true },
  URGENT: { label: 'Urgent', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500', pulse: true },
  NORMAL: { label: 'Normal', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },

  // Lifecycle
  APPROVED: { label: 'Approved', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', dot: 'bg-teal-500' },
  DONOR_ASSIGNED: { label: 'Donor Assigned', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  IN_PROGRESS: { label: 'In Progress', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', dot: 'bg-sky-500' },
  FULFILLED: { label: 'Fulfilled', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  COMPLETED: { label: 'Completed', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' },
};

export const StatusBadge = ({ status, size = 'sm', className = '' }) => {
  if (!status) return null;
  const key = String(status).toUpperCase();
  const config = STATUS_MAP[key] || {
    label: status,
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
  };

  const sizeClasses = {
    xs: 'text-[10px] px-2 py-0.5 gap-1',
    sm: 'text-xs px-2.5 py-1 gap-1.5',
    md: 'text-sm px-3.5 py-1.5 gap-2',
  };

  return (
    <span
      className={`
        inline-flex items-center font-bold tracking-tight rounded-full border
        ${config.bg} ${config.text} ${config.border}
        ${sizeClasses[size] || sizeClasses.sm}
        ${className}
      `}
    >
      <span
        className={`
          w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}
          ${config.pulse ? 'animate-ping' : ''}
        `}
      />
      <span>{config.label}</span>
    </span>
  );
};

export default StatusBadge;
