import React, { useState, useEffect } from 'react';
import {
  Building2,
  CheckCircle2,
  XCircle,
  Lock,
  RefreshCw,
  Eye,
  Droplet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import { DataTable, StatusBadge, Button, ConfirmDialog, Modal, Input } from '../../components/common';

export const AdminFacilitiesPage = () => {
  const [facilities, setFacilities] = useState([]);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'HOSPITAL' | 'BLOOD_BANK' | 'PENDING'
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [dialogLoading, setDialogLoading] = useState(false);

  // Dialog State
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    isDestructive: false,
    action: null,
  });

  // Reject Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedFacilityToReject, setSelectedFacilityToReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('Incomplete regulatory documentation or invalid license validity.');
  const [rejectionError, setRejectionError] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  const fetchFacilities = async () => {
    setLoading(true);
    try {
      const [hospRes, bankRes] = await Promise.allSettled([
        adminAPI.getHospitals(),
        adminAPI.getBloodBanks(),
      ]);

      if (hospRes.status === 'rejected') throw hospRes.reason;
      if (bankRes.status === 'rejected') throw bankRes.reason;

      const hospData = hospRes.value.data?.data || hospRes.value.data || [];
      const bankData = bankRes.value.data?.data || bankRes.value.data || [];

      const combined = [
        ...(Array.isArray(hospData) ? hospData : []).map((h) => ({
          ...h,
          type: 'HOSPITAL',
          status: h.status || h.verificationStatus || 'PENDING',
          verificationStatus: h.verificationStatus || h.status || 'PENDING',
        })),
        ...(Array.isArray(bankData) ? bankData : []).map((b) => ({
          ...b,
          type: 'BLOOD_BANK',
          status: b.status || b.verificationStatus || 'PENDING',
          verificationStatus: b.verificationStatus || b.status || 'PENDING',
        })),
      ];

      setFacilities(combined);
    } catch (err) {
      setFacilities([]);
      toast.error(err.response?.data?.message || err.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilities();
  }, []);

  // 1. Approve Facility
  const handleApprove = (fac) => {
    setConfirmDialog({
      isOpen: true,
      title: `Approve & Certify ${fac.name}?`,
      message: `Are you sure you want to verify this ${fac.type.toLowerCase()}? An automated confirmation email with access credentials will be dispatched to ${fac.email}.`,
      confirmText: 'Approve & Email Facility',
      isDestructive: false,
      action: async () => {
        try {
          const res =
            fac.type === 'HOSPITAL'
              ? await adminAPI.verifyHospital(fac._id, { decision: 'APPROVE' })
              : await adminAPI.verifyBloodBank(fac._id, { decision: 'APPROVE' });
          toast.success(res.data?.message || `Facility ${fac.name} approved. Confirmation email dispatched.`);
          await fetchFacilities();
        } catch (err) {
          toast.error(err.response?.data?.message || err.message || 'Action failed.');
        }
      },
    });
  };

  // 2. Open Reject Modal
  const handleOpenReject = (fac) => {
    setSelectedFacilityToReject(fac);
    setRejectionReason('Incomplete regulatory documentation or invalid license validity.');
    setRejectionError('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!selectedFacilityToReject) return;

    const trimmedReason = rejectionReason.trim();
    if (!trimmedReason) {
      setRejectionError('Please provide a reason for rejecting this facility.');
      return;
    }

    setRejectLoading(true);
    setActionLoading(true);
    try {
      const res =
        selectedFacilityToReject.type === 'HOSPITAL'
          ? await adminAPI.verifyHospital(selectedFacilityToReject._id, {
              decision: 'REJECT',
              reason: trimmedReason,
            })
          : await adminAPI.verifyBloodBank(selectedFacilityToReject._id, {
              decision: 'REJECT',
              reason: trimmedReason,
            });
      toast.success(res.data?.message || 'Facility application rejected. Rejection notice sent to applicant.');
      setRejectModalOpen(false);
      setSelectedFacilityToReject(null);
      setRejectionReason('');
      setRejectionError('');
      await fetchFacilities();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Action failed.');
    } finally {
      setRejectLoading(false);
      setActionLoading(false);
    }
  };

  // 3. Block Facility
  const handleBlock = (fac) => {
    const isBlocked = fac.status === 'BLOCKED' || fac.verificationStatus === 'BLOCKED';
    setConfirmDialog({
      isOpen: true,
      title: isBlocked ? `Restore ${fac.name}?` : `Block ${fac.name}?`,
      message: isBlocked
        ? `Restore facility privileges for ${fac.name}?`
        : `Suspending ${fac.name} will halt all active blood requisitions and stock issue permissions.`,
      confirmText: isBlocked ? 'Unblock Facility' : 'Block Facility',
      isDestructive: !isBlocked,
      action: async () => {
        try {
          if (isBlocked) {
            const res =
              fac.type === 'HOSPITAL'
                ? await adminAPI.verifyHospital(fac._id, { decision: 'APPROVE' })
                : await adminAPI.verifyBloodBank(fac._id, { decision: 'APPROVE' });
            toast.success(res.data?.message || `Facility ${fac.name} restored.`);
          } else {
            const res =
              fac.type === 'HOSPITAL'
                ? await adminAPI.verifyHospital(fac._id, {
                    decision: 'BLOCK',
                    reason: 'Administrative compliance audit sanction',
                  })
                : await adminAPI.verifyBloodBank(fac._id, {
                    decision: 'BLOCK',
                    reason: 'Administrative compliance audit sanction',
                  });
            toast.success(res.data?.message || `Facility ${fac.name} has been blocked.`);
          }
          await fetchFacilities();
        } catch (err) {
          toast.error(err.response?.data?.message || err.message || 'Action failed.');
        }
      },
    });
  };

  const handleConfirmDialogAction = async () => {
    if (!confirmDialog.action || dialogLoading) return;
    setDialogLoading(true);
    setActionLoading(true);
    try {
      await confirmDialog.action();
      setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
    } finally {
      setDialogLoading(false);
      setActionLoading(false);
    }
  };

  // Filter Data based on active tab
  const filteredData = facilities.filter((item) => {
    if (activeTab === 'HOSPITAL') return item.type === 'HOSPITAL';
    if (activeTab === 'BLOOD_BANK') return item.type === 'BLOOD_BANK';
    if (activeTab === 'PENDING') return item.status === 'PENDING' || item.verificationStatus === 'PENDING';
    return true;
  });

  const isButtonsDisabled = loading || actionLoading || dialogLoading || rejectLoading;

  const columns = [
    {
      header: 'Facility Name',
      key: 'name',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800 text-red-400 flex items-center justify-center shrink-0">
            {row.type === 'HOSPITAL' ? <Building2 className="w-4 h-4" /> : <Droplet className="w-4 h-4" />}
          </div>
          <div>
            <strong className="text-slate-900 font-bold block">{row.name}</strong>
            <span className="text-slate-500 text-[11px]">{row.category || row.type} • {row.city}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Facility Type',
      key: 'type',
      sortable: true,
      render: (row) => <StatusBadge status={row.type} size="xs" />,
    },
    {
      header: 'License / Accreditation',
      key: 'licenseNumber',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-slate-700">{row.licenseNumber}</span>
          {row.licenseDocUrl && (
            <a
              href={row.licenseDocUrl}
              target="_blank"
              rel="noreferrer"
              title="Inspect License Document"
              className="p-1 rounded text-slate-400 hover:text-red-600 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      ),
    },
    {
      header: 'Contact Person',
      key: 'contactPerson',
      sortable: true,
      render: (row) => (
        <div>
          <p className="text-xs font-bold text-slate-800">{row.contactPerson || 'N/A'}</p>
          <p className="text-[10px] text-slate-500">{row.email}</p>
        </div>
      ),
    },
    {
      header: 'Verification Status',
      key: 'status',
      sortable: true,
      render: (row) => <StatusBadge status={row.status || row.verificationStatus} size="xs" />,
    },
    {
      header: 'Actions',
      key: 'actions',
      sortable: false,
      render: (row) => {
        const isBlocked = row.status === 'BLOCKED' || row.verificationStatus === 'BLOCKED';
        const isApproved = row.status === 'APPROVED' || row.status === 'VERIFIED';
        const isPending = row.status === 'PENDING' || row.verificationStatus === 'PENDING';

        return (
          <div className="flex items-center gap-2">
            {!isApproved && (
              <Button
                variant="outline"
                size="xs"
                onClick={() => handleApprove(row)}
                disabled={isButtonsDisabled}
                className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                leftIcon={<CheckCircle2 className="w-3 h-3" />}
              >
                Approve
              </Button>
            )}

            {isPending && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleOpenReject(row)}
                disabled={isButtonsDisabled}
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
              disabled={isButtonsDisabled}
              className={isBlocked ? 'text-emerald-700 hover:bg-emerald-50' : 'text-slate-600 hover:bg-slate-100'}
              leftIcon={<Lock className="w-3 h-3" />}
            >
              {isBlocked ? 'Unblock' : 'Block'}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-[#1E293B] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800 text-blue-400 text-xs font-black mb-2">
            <Building2 className="w-3.5 h-3.5" />
            <span>Health Facility Accreditation Registry</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Hospitals & Certified Blood Banks
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Approve onboarding applications, verify state licenses, or issue compliance suspensions.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchFacilities}
          disabled={isButtonsDisabled}
          leftIcon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
        >
          Refresh Registry
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'ALL', label: `All Facilities (${facilities.length})` },
          { key: 'HOSPITAL', label: `Hospitals (${facilities.filter((f) => f.type === 'HOSPITAL').length})` },
          { key: 'BLOOD_BANK', label: `Blood Banks (${facilities.filter((f) => f.type === 'BLOOD_BANK').length})` },
          { key: 'PENDING', label: `Pending Review (${facilities.filter((f) => f.status === 'PENDING' || f.verificationStatus === 'PENDING').length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`
              px-4 py-2 rounded-2xl text-xs font-black transition-all whitespace-nowrap
              ${
                activeTab === tab.key
                  ? 'bg-red-600 text-white shadow-md shadow-red-900/40'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reusable DataTable */}
      <DataTable
        columns={columns}
        data={filteredData}
        keyField="_id"
        isLoading={loading}
        searchPlaceholder="Search facility by name, license number, or city..."
        searchKeys={['name', 'licenseNumber', 'city', 'contactPerson', 'email']}
        pageSize={10}
        emptyTitle="No Facilities Found"
        emptyDescription="No facility records match your current filter settings."
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => {
          if (!dialogLoading) {
            setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          }
        }}
        onConfirm={handleConfirmDialogAction}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        isDestructive={confirmDialog.isDestructive}
        isLoading={dialogLoading}
      />

      {/* Rejection Reason Modal */}
      {rejectModalOpen && (
        <Modal
          isOpen={rejectModalOpen}
          onClose={() => {
            if (!rejectLoading) {
              setRejectModalOpen(false);
              setRejectionError('');
            }
          }}
          title={`Reject Application: ${selectedFacilityToReject?.name}`}
          showCloseButton={!rejectLoading}
          closeOnBackdrop={!rejectLoading}
        >
          <form onSubmit={handleConfirmReject} className="space-y-4">
            <p className="text-xs text-slate-500">
              Please enter the clinical or regulatory non-compliance reason. This explanation will be emailed to{' '}
              <strong className="text-slate-800">{selectedFacilityToReject?.email}</strong>.
            </p>

            <Input
              label="Rejection Reason"
              required
              value={rejectionReason}
              onChange={(e) => {
                setRejectionReason(e.target.value);
                if (e.target.value.trim()) {
                  setRejectionError('');
                }
              }}
              error={rejectionError}
              disabled={rejectLoading}
            />

            <div className="pt-2 flex justify-end gap-3">
              <Button
                variant="ghost"
                size="md"
                type="button"
                disabled={rejectLoading}
                onClick={() => {
                  setRejectModalOpen(false);
                  setRejectionError('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                type="submit"
                disabled={rejectLoading}
                isLoading={rejectLoading}
                leftIcon={<XCircle className="w-4 h-4" />}
              >
                Confirm Rejection & Email Applicant
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminFacilitiesPage;
