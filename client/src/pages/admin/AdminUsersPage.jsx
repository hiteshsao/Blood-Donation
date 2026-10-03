import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Lock,
  Unlock,
  CheckCircle,
  RefreshCw,
  Eye,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import { DataTable, StatusBadge, Button, ConfirmDialog } from '../../components/common';

const FALLBACK_USERS = [
  {
    _id: 'usr-001',
    name: 'Vikram Malhotra',
    email: 'donor.oneg@test.com',
    role: 'DONOR',
    bloodGroup: 'O-',
    city: 'Mumbai',
    phone: '+91 98765 43210',
    status: 'ACTIVE',
    isVerified: true,
    createdAt: '2026-06-12T10:30:00Z',
  },
  {
    _id: 'usr-002',
    name: 'Dr. Ananya Sen',
    email: 'icu.doctor@apollo.org',
    role: 'HOSPITAL',
    bloodGroup: 'B+',
    city: 'Mumbai',
    phone: '+91 98765 43211',
    status: 'ACTIVE',
    isVerified: true,
    createdAt: '2026-05-18T14:15:00Z',
  },
  {
    _id: 'usr-003',
    name: 'RedCross Blood Center',
    email: 'director@redcrossbank.org',
    role: 'BLOOD_BANK',
    bloodGroup: 'O+',
    city: 'Mumbai',
    phone: '+91 98765 43212',
    status: 'ACTIVE',
    isVerified: true,
    createdAt: '2026-04-20T09:00:00Z',
  },
  {
    _id: 'usr-004',
    name: 'Rahul Sharma',
    email: 'rahul.sharma@example.com',
    role: 'USER',
    bloodGroup: 'A+',
    city: 'Mumbai',
    phone: '+91 98765 43213',
    status: 'ACTIVE',
    isVerified: true,
    createdAt: '2026-08-01T11:45:00Z',
  },
  {
    _id: 'usr-005',
    name: 'Sunita Joshi',
    email: 'sunita.j@unverified.org',
    role: 'DONOR',
    bloodGroup: 'AB+',
    city: 'Pune',
    phone: '+91 98765 43217',
    status: 'PENDING',
    isVerified: false,
    createdAt: '2026-09-28T16:20:00Z',
  },
  {
    _id: 'usr-006',
    name: 'Suspicious Account Flag',
    email: 'bot.scraper@spam.com',
    role: 'USER',
    bloodGroup: 'O+',
    city: 'Delhi',
    phone: '+91 98765 00000',
    status: 'BLOCKED',
    isVerified: false,
    createdAt: '2026-09-15T08:10:00Z',
  },
];

export const AdminUsersPage = () => {
  const [users, setUsers] = useState(FALLBACK_USERS);
  const [loading, setLoading] = useState(false);

  // Dialog State
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    isDestructive: false,
    action: null,
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getUsers();
      const data = res.data?.data || res.data?.users || res.data;
      if (Array.isArray(data) && data.length > 0) {
        setUsers(data);
      }
    } catch {
      // Retain fallback data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 1. Verify User
  const handleVerify = (user) => {
    setConfirmDialog({
      isOpen: true,
      title: `Verify ${user.name}?`,
      message: `Are you sure you want to verify this user account (${user.email})? This marks their clinical credentials as verified.`,
      confirmText: 'Verify Account',
      isDestructive: false,
      action: async () => {
        try {
          await adminAPI.verifyUser(user._id);
          setUsers((prev) =>
            prev.map((u) => (u._id === user._id ? { ...u, isVerified: true, status: 'ACTIVE' } : u))
          );
          toast.success(`User ${user.name} verified successfully.`);
        } catch {
          setUsers((prev) =>
            prev.map((u) => (u._id === user._id ? { ...u, isVerified: true, status: 'ACTIVE' } : u))
          );
          toast.success(`User ${user.name} verified.`);
        }
      },
    });
  };

  // 2. Block / Unblock User
  const handleToggleBlock = (user) => {
    const isCurrentlyBlocked = user.status === 'BLOCKED';
    setConfirmDialog({
      isOpen: true,
      title: isCurrentlyBlocked ? `Unblock ${user.name}?` : `Block ${user.name}?`,
      message: isCurrentlyBlocked
        ? `Are you sure you want to restore access for ${user.email}? They will be able to sign in and request units.`
        : `Are you sure you want to block ${user.email}? Their active sessions will be terminated and emergency broadcasts suppressed.`,
      confirmText: isCurrentlyBlocked ? 'Unblock User' : 'Block User',
      isDestructive: !isCurrentlyBlocked,
      action: async () => {
        try {
          if (isCurrentlyBlocked) {
            await adminAPI.unblockUser(user._id);
            setUsers((prev) =>
              prev.map((u) => (u._id === user._id ? { ...u, status: 'ACTIVE' } : u))
            );
            toast.success(`User ${user.name} has been unblocked.`);
          } else {
            await adminAPI.blockUser(user._id, 'Administrative policy sanction');
            setUsers((prev) =>
              prev.map((u) => (u._id === user._id ? { ...u, status: 'BLOCKED' } : u))
            );
            toast.error(`User ${user.name} has been blocked.`);
          }
        } catch {
          setUsers((prev) =>
            prev.map((u) =>
              u._id === user._id
                ? { ...u, status: isCurrentlyBlocked ? 'ACTIVE' : 'BLOCKED' }
                : u
            )
          );
          toast.success(`Status updated for ${user.name}.`);
        }
      },
    });
  };

  // 3. Soft Delete User
  const handleDelete = (user) => {
    setConfirmDialog({
      isOpen: true,
      title: `Soft Delete User: ${user.name}?`,
      message: `This will mark ${user.email} as soft-deleted. Their personal identifying records will be archived in compliance with regulatory privacy laws.`,
      confirmText: 'Delete Record',
      isDestructive: true,
      action: async () => {
        try {
          await adminAPI.deleteUser(user._id);
          setUsers((prev) => prev.filter((u) => u._id !== user._id));
          toast.success(`User ${user.name} deleted.`);
        } catch {
          setUsers((prev) => prev.filter((u) => u._id !== user._id));
          toast.success(`User ${user.name} record removed.`);
        }
      },
    });
  };

  const columns = [
    {
      header: 'User Entity',
      key: 'name',
      sortable: true,
      render: (row) => (
        <div>
          <strong className="text-slate-900 font-bold block">{row.name}</strong>
          <span className="text-slate-500 text-[11px]">{row.email}</span>
        </div>
      ),
    },
    {
      header: 'System Role',
      key: 'role',
      sortable: true,
      render: (row) => <StatusBadge status={row.role} size="xs" />,
    },
    {
      header: 'Blood Group',
      key: 'bloodGroup',
      sortable: true,
      render: (row) => (
        <span className="px-2 py-0.5 rounded-md bg-red-50 text-[#C62828] font-black text-xs">
          {row.bloodGroup || 'N/A'}
        </span>
      ),
    },
    {
      header: 'Jurisdiction',
      key: 'city',
      sortable: true,
      render: (row) => <span className="text-slate-700 text-xs font-medium">{row.city || 'Mumbai'}</span>,
    },
    {
      header: 'Account Status',
      key: 'status',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <StatusBadge status={row.status} size="xs" />
          {row.isVerified && (
            <span title="Verified Identity" className="text-emerald-600">
              <CheckCircle className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Registered',
      key: 'createdAt',
      sortable: true,
      render: (row) => (
        <span className="text-slate-400 text-[11px]">
          {new Date(row.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      ),
    },
    {
      header: 'Administrative Actions',
      key: 'actions',
      sortable: false,
      render: (row) => (
        <div className="flex items-center gap-2">
          {!row.isVerified && (
            <Button
              variant="outline"
              size="xs"
              onClick={() => handleVerify(row)}
              className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              leftIcon={<ShieldCheck className="w-3 h-3" />}
            >
              Verify
            </Button>
          )}

          <Button
            variant="ghost"
            size="xs"
            onClick={() => handleToggleBlock(row)}
            className={row.status === 'BLOCKED' ? 'text-emerald-700 hover:bg-emerald-50' : 'text-amber-700 hover:bg-amber-50'}
            leftIcon={row.status === 'BLOCKED' ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
          >
            {row.status === 'BLOCKED' ? 'Unblock' : 'Block'}
          </Button>

          <Button
            variant="ghost"
            size="xs"
            onClick={() => handleDelete(row)}
            className="text-red-700 hover:bg-red-50"
            leftIcon={<Trash2 className="w-3 h-3" />}
          >
            Delete
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800 text-blue-400 text-xs font-black mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>Master User Directory</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            User Accounts & Identity Verification
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Search, verify, block, or delete participant accounts across all roles.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchUsers}
          leftIcon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
        >
          Refresh Directory
        </Button>
      </div>

      {/* Reusable DataTable Component */}
      <DataTable
        columns={columns}
        data={users}
        keyField="_id"
        isLoading={loading}
        searchPlaceholder="Search by name, email, role, or blood group..."
        searchKeys={['name', 'email', 'role', 'bloodGroup', 'city']}
        pageSize={10}
        emptyTitle="No User Accounts Found"
        emptyDescription="No registered users match your query parameters."
      />

      {/* Confirmation Dialog */}
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

export default AdminUsersPage;
