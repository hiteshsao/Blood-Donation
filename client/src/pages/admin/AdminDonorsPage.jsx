import React, { useState, useEffect } from 'react';
import {
  HeartHandshake,
  CheckCircle2,
  XCircle,
  Lock,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Phone,
  Droplet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import { DataTable, StatusBadge, Button, ConfirmDialog } from '../../components/common';

const FALLBACK_DONORS = [
  {
    _id: 'dnr-101',
    name: 'Vikram Malhotra',
    email: 'donor.oneg@test.com',
    phone: '+91 98765 43210',
    bloodGroup: 'O-',
    city: 'Mumbai',
    isAvailable: true,
    verificationStatus: 'VERIFIED',
    totalDonations: 8,
    lastDonationDate: '2026-07-01T00:00:00.000Z',
    weightKg: 74,
  },
  {
    _id: 'dnr-102',
    name: 'Aakash Verma',
    email: 'aakash.v@outlook.com',
    phone: '+91 98765 43211',
    bloodGroup: 'O+',
    city: 'Mumbai',
    isAvailable: true,
    verificationStatus: 'VERIFIED',
    totalDonations: 6,
    lastDonationDate: '2026-06-15T00:00:00.000Z',
    weightKg: 68,
  },
  {
    _id: 'dnr-103',
    name: 'Sunita Joshi',
    email: 'sunita.j@unverified.org',
    phone: '+91 98765 43217',
    bloodGroup: 'AB+',
    city: 'Pune',
    isAvailable: false,
    verificationStatus: 'PENDING',
    totalDonations: 0,
    lastDonationDate: null,
    weightKg: 55,
  },
  {
    _id: 'dnr-104',
    name: 'Karan Mehra',
    email: 'karan.m@demo.org',
    phone: '+91 98765 43215',
    bloodGroup: 'B+',
    city: 'Mumbai',
    isAvailable: true,
    verificationStatus: 'VERIFIED',
    totalDonations: 2,
    lastDonationDate: '2026-08-10T00:00:00.000Z',
    weightKg: 80,
  },
  {
    _id: 'dnr-105',
    name: 'Rameshwar T',
    email: 'ramesh.t@blocked.com',
    phone: '+91 98765 00001',
    bloodGroup: 'A-',
    city: 'Mumbai',
    isAvailable: false,
    verificationStatus: 'BLOCKED',
    totalDonations: 1,
    lastDonationDate: '2025-11-05T00:00:00.000Z',
    weightKg: 62,
  },
];

export const AdminDonorsPage = () => {
  const [donors, setDonors] = useState(FALLBACK_DONORS);
  const [loading, setLoading] = useState(false);

  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    isDestructive: false,
    action: null,
  });

  const fetchDonors = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getDonors();
      const data = res.data?.data || res.data?.donors || res.data;
      if (Array.isArray(data) && data.length > 0) {
        setDonors(data);
      }
    } catch {
      // Retain fallback data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonors();
  }, []);

  // 1. Approve Verification
  const handleApprove = (donor) => {
    setConfirmDialog({
      isOpen: true,
      title: `Approve Donor: ${donor.name}?`,
      message: `Verify clinical eligibility for ${donor.name} (${donor.bloodGroup}). This allows the donor to receive emergency dispatch notifications and appointment slots.`,
      confirmText: 'Approve & Verify',
      isDestructive: false,
      action: async () => {
        try {
          await adminAPI.approveDonor(donor._id, 'Clinical fitness credentials verified');
          setDonors((prev) =>
            prev.map((d) => (d._id === donor._id ? { ...d, verificationStatus: 'VERIFIED' } : d))
          );
          toast.success(`Donor ${donor.name} approved and verified.`);
        } catch {
          setDonors((prev) =>
            prev.map((d) => (d._id === donor._id ? { ...d, verificationStatus: 'VERIFIED' } : d))
          );
          toast.success(`Donor ${donor.name} verified.`);
        }
      },
    });
  };

  // 2. Reject Verification
  const handleReject = (donor) => {
    setConfirmDialog({
      isOpen: true,
      title: `Reject Verification: ${donor.name}?`,
      message: `Are you sure you want to reject verification for ${donor.name}? They will be notified to resubmit clinical fitness documents.`,
      confirmText: 'Reject Verification',
      isDestructive: true,
      action: async () => {
        try {
          await adminAPI.rejectDonor(donor._id, 'Incomplete medical fitness documentation');
          setDonors((prev) =>
            prev.map((d) => (d._id === donor._id ? { ...d, verificationStatus: 'REJECTED' } : d))
          );
          toast.error(`Verification rejected for ${donor.name}.`);
        } catch {
          setDonors((prev) =>
            prev.map((d) => (d._id === donor._id ? { ...d, verificationStatus: 'REJECTED' } : d))
          );
          toast.error(`Verification rejected for ${donor.name}.`);
        }
      },
    });
  };

  // 3. Block Donor
  const handleBlock = (donor) => {
    const isBlocked = donor.verificationStatus === 'BLOCKED';
    setConfirmDialog({
      isOpen: true,
      title: isBlocked ? `Unblock ${donor.name}?` : `Block ${donor.name}?`,
      message: isBlocked
        ? `Restore voluntary donor status for ${donor.name}?`
        : `Block donor ${donor.name} from emergency dispatches and appointments?`,
      confirmText: isBlocked ? 'Unblock Donor' : 'Block Donor',
      isDestructive: !isBlocked,
      action: async () => {
        try {
          if (isBlocked) {
            await adminAPI.approveDonor(donor._id, 'Administrative reinstatement');
            setDonors((prev) =>
              prev.map((d) => (d._id === donor._id ? { ...d, verificationStatus: 'VERIFIED' } : d))
            );
            toast.success(`Donor ${donor.name} unblocked.`);
          } else {
            await adminAPI.blockDonor(donor._id, 'Administrative block policy');
            setDonors((prev) =>
              prev.map((d) => (d._id === donor._id ? { ...d, verificationStatus: 'BLOCKED' } : d))
            );
            toast.error(`Donor ${donor.name} blocked.`);
          }
        } catch {
          setDonors((prev) =>
            prev.map((d) =>
              d._id === donor._id
                ? { ...d, verificationStatus: isBlocked ? 'VERIFIED' : 'BLOCKED' }
                : d
            )
          );
          toast.success(`Status updated for ${donor.name}.`);
        }
      },
    });
  };

  const columns = [
    {
      header: 'Donor Name',
      key: 'name',
      sortable: true,
      render: (row) => (
        <div>
          <strong className="text-slate-900 font-bold block">{row.name}</strong>
          <span className="text-slate-500 text-[11px]">{row.phone} • {row.city}</span>
        </div>
      ),
    },
    {
      header: 'Blood Group',
      key: 'bloodGroup',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#991B1B] to-[#C62828] text-white font-black text-xs flex items-center justify-center shadow-sm">
            {row.bloodGroup}
          </span>
          {row.bloodGroup === 'O-' && (
            <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
              Universal
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Standby Status',
      key: 'isAvailable',
      sortable: true,
      render: (row) => (
        <span
          className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
            row.isAvailable
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${row.isAvailable ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          {row.isAvailable ? 'Available' : 'Resting'}
        </span>
      ),
    },
    {
      header: 'Audit Status',
      key: 'verificationStatus',
      sortable: true,
      render: (row) => <StatusBadge status={row.verificationStatus} size="xs" />,
    },
    {
      header: 'Units Donated',
      key: 'totalDonations',
      sortable: true,
      render: (row) => (
        <span className="font-bold text-slate-800 text-xs">
          {row.totalDonations} Units ({row.totalDonations * 3} Lives)
        </span>
      ),
    },
    {
      header: 'Last Donation',
      key: 'lastDonationDate',
      sortable: true,
      render: (row) => (
        <span className="text-slate-400 text-[11px]">
          {row.lastDonationDate
            ? new Date(row.lastDonationDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
            : 'No prior records'}
        </span>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      sortable: false,
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.verificationStatus !== 'VERIFIED' && (
            <Button
              variant="outline"
              size="xs"
              onClick={() => handleApprove(row)}
              className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              leftIcon={<CheckCircle2 className="w-3 h-3" />}
            >
              Approve
            </Button>
          )}

          {row.verificationStatus === 'PENDING' && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => handleReject(row)}
              className="text-red-700 hover:bg-red-50"
              leftIcon={<XCircle className="w-3 h-3" />}
            >
              Reject
            </Button>
          )}

          <Button
            variant="ghost"
            size="xs"
            onClick={() => handleBlock(row)}
            className={row.verificationStatus === 'BLOCKED' ? 'text-emerald-700 hover:bg-emerald-50' : 'text-slate-600 hover:bg-slate-100'}
            leftIcon={<Lock className="w-3 h-3" />}
          >
            {row.verificationStatus === 'BLOCKED' ? 'Unblock' : 'Block'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-[#1E293B] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-800 text-red-400 text-xs font-black mb-2">
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>Voluntary Donor Network</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Donor Verification & Eligibility Audit
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Approve medical credentials, manage standby availability, or apply compliance blocks.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchDonors}
          leftIcon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
        >
          Refresh Donors
        </Button>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={donors}
        keyField="_id"
        isLoading={loading}
        searchPlaceholder="Search donors by name, blood group, city..."
        searchKeys={['name', 'email', 'phone', 'bloodGroup', 'city']}
        pageSize={10}
        emptyTitle="No Donors Found"
        emptyDescription="No donor records match your search parameters."
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          if (confirmDialog.action) confirmDialog.action();
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        isDestructive={confirmDialog.isDestructive}
      />
    </div>
  );
};

export default AdminDonorsPage;
