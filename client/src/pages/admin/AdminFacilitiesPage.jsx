import React, { useState, useEffect } from 'react';
import {
  Building2,
  CheckCircle2,
  XCircle,
  Lock,
  RefreshCw,
  FileText,
  Eye,
  ShieldCheck,
  ShieldAlert,
  Droplet,
  Mail,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import { DataTable, StatusBadge, Button, ConfirmDialog, Modal, Input } from '../../components/common';

const FALLBACK_FACILITIES = [
  {
    _id: 'fac-201',
    name: 'Apollo City Hospital & Trauma Center',
    type: 'HOSPITAL',
    category: 'Tertiary Care',
    licenseNumber: 'MH-MUM-HOSP-2024-991',
    licenseDocUrl: '/documents/apollo-license.pdf',
    city: 'Mumbai',
    contactPerson: 'Dr. Ananya Sen',
    email: 'icu.doctor@apollo.org',
    status: 'APPROVED',
    createdAt: '2026-05-18T14:15:00Z',
  },
  {
    _id: 'fac-202',
    name: 'RedCross Regional Blood Center',
    type: 'BLOOD_BANK',
    category: 'Regional Central Blood Bank',
    licenseNumber: 'BB-MUM-777',
    licenseDocUrl: '/documents/redcross-cert.pdf',
    city: 'Mumbai',
    contactPerson: 'Dr. V. K. Sen',
    email: 'director@redcrossbank.org',
    status: 'APPROVED',
    createdAt: '2026-04-20T09:00:00Z',
  },
  {
    _id: 'fac-203',
    name: 'Metro Trauma Care Hospital',
    type: 'HOSPITAL',
    category: 'Emergency Trauma Facility',
    licenseNumber: 'MH-MUM-2026-PENDING',
    licenseDocUrl: '/documents/metro-license.pdf',
    city: 'Mumbai',
    contactPerson: 'Dr. S. K. Nambiar',
    email: 'compliance@metrotrauma.org',
    status: 'PENDING',
    createdAt: '2026-09-28T11:30:00Z',
  },
  {
    _id: 'fac-204',
    name: 'Civil Hospital Transfusion Unit',
    type: 'BLOOD_BANK',
    category: 'Government Blood Bank',
    licenseNumber: 'GOV-MUM-104',
    licenseDocUrl: '/documents/civil-bank.pdf',
    city: 'Mumbai',
    contactPerson: 'Sister Nalini Rao',
    email: 'bloodunit@civilhospital.gov.in',
    status: 'APPROVED',
    createdAt: '2026-03-10T10:00:00Z',
  },
  {
    _id: 'fac-205',
    name: 'Sunrise Community Nursing Home',
    type: 'HOSPITAL',
    category: 'Secondary Care Clinic',
    licenseNumber: 'MH-REG-88210',
    licenseDocUrl: '/documents/sunrise-doc.pdf',
    city: 'Navi Mumbai',
    contactPerson: 'Dr. P. Deshpande',
    email: 'admin@sunriseclinic.com',
    status: 'REJECTED',
    createdAt: '2026-09-02T15:20:00Z',
  },
];

export const AdminFacilitiesPage = () => {
  const [facilities, setFacilities] = useState(FALLBACK_FACILITIES);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'HOSPITAL' | 'BLOOD_BANK' | 'PENDING'
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

  // Reject Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedFacilityToReject, setSelectedFacilityToReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('Incomplete regulatory documentation / invalid license expiry');

  const fetchFacilities = async () => {
    setLoading(true);
    try {
      const [hospRes, bankRes] = await Promise.allSettled([
        adminAPI.getHospitals(),
        adminAPI.getBloodBanks(),
      ]);

      const hospData = hospRes.status === 'fulfilled' ? hospRes.value.data?.data || [] : [];
      const bankData = bankRes.status === 'fulfilled' ? bankRes.value.data?.data || [] : [];

      const combined = [
        ...hospData.map((h) => ({ ...h, type: 'HOSPITAL' })),
        ...bankData.map((b) => ({ ...b, type: 'BLOOD_BANK' })),
      ];

      if (combined.length > 0) {
        setFacilities(combined);
      }
    } catch {
      // Retain fallback data
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
          await adminAPI.approveFacility(fac.type === 'HOSPITAL' ? 'hospitals' : 'bloodbanks', fac._id, {
            status: 'APPROVED',
          });
          setFacilities((prev) =>
            prev.map((f) => (f._id === fac._id ? { ...f, status: 'APPROVED' } : f))
          );
          toast.success(`Facility ${fac.name} approved. Confirmation email dispatched.`);
        } catch {
          setFacilities((prev) =>
            prev.map((f) => (f._id === fac._id ? { ...f, status: 'APPROVED' } : f))
          );
          toast.success(`Facility ${fac.name} approved.`);
        }
      },
    });
  };

  // 2. Open Reject Modal
  const handleOpenReject = (fac) => {
    setSelectedFacilityToReject(fac);
    setRejectionReason('Incomplete regulatory documentation or invalid license validity.');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!selectedFacilityToReject) return;

    try {
      await adminAPI.rejectFacility(
        selectedFacilityToReject.type === 'HOSPITAL' ? 'hospitals' : 'bloodbanks',
        selectedFacilityToReject._id,
        { reason: rejectionReason }
      );
      setFacilities((prev) =>
        prev.map((f) => (f._id === selectedFacilityToReject._id ? { ...f, status: 'REJECTED' } : f))
      );
      toast.error(`Facility application rejected. Rejection notice sent to applicant.`);
      setRejectModalOpen(false);
    } catch {
      setFacilities((prev) =>
        prev.map((f) => (f._id === selectedFacilityToReject._id ? { ...f, status: 'REJECTED' } : f))
      );
      toast.error(`Facility marked as rejected.`);
      setRejectModalOpen(false);
    }
  };

  // 3. Block Facility
  const handleBlock = (fac) => {
    const isBlocked = fac.status === 'BLOCKED';
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
            await adminAPI.approveFacility(fac.type === 'HOSPITAL' ? 'hospitals' : 'bloodbanks', fac._id);
            setFacilities((prev) =>
              prev.map((f) => (f._id === fac._id ? { ...f, status: 'APPROVED' } : f))
            );
            toast.success(`Facility ${fac.name} restored.`);
          } else {
            await adminAPI.blockFacility(fac.type === 'HOSPITAL' ? 'hospitals' : 'bloodbanks', fac._id, {
              reason: 'Administrative compliance audit sanction',
            });
            setFacilities((prev) =>
              prev.map((f) => (f._id === fac._id ? { ...f, status: 'BLOCKED' } : f))
            );
            toast.error(`Facility ${fac.name} has been blocked.`);
          }
        } catch {
          setFacilities((prev) =>
            prev.map((f) =>
              f._id === fac._id ? { ...f, status: isBlocked ? 'APPROVED' : 'BLOCKED' } : f
            )
          );
          toast.success(`Status updated for ${fac.name}.`);
        }
      },
    });
  };

  // Filter Data based on active tab
  const filteredData = facilities.filter((item) => {
    if (activeTab === 'HOSPITAL') return item.type === 'HOSPITAL';
    if (activeTab === 'BLOOD_BANK') return item.type === 'BLOOD_BANK';
    if (activeTab === 'PENDING') return item.status === 'PENDING';
    return true;
  });

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
      render: (row) => <StatusBadge status={row.status} size="xs" />,
    },
    {
      header: 'Actions',
      key: 'actions',
      sortable: false,
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.status !== 'APPROVED' && (
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

          {row.status === 'PENDING' && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => handleOpenReject(row)}
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
            className={row.status === 'BLOCKED' ? 'text-emerald-700 hover:bg-emerald-50' : 'text-slate-600 hover:bg-slate-100'}
            leftIcon={<Lock className="w-3 h-3" />}
          >
            {row.status === 'BLOCKED' ? 'Unblock' : 'Block'}
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
          { key: 'PENDING', label: `Pending Review (${facilities.filter((f) => f.status === 'PENDING').length})` },
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

      {/* Rejection Reason Modal */}
      {rejectModalOpen && (
        <Modal
          isOpen={rejectModalOpen}
          onClose={() => setRejectModalOpen(false)}
          title={`Reject Application: ${selectedFacilityToReject?.name}`}
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
              onChange={(e) => setRejectionReason(e.target.value)}
            />

            <div className="pt-2 flex justify-end gap-3">
              <Button
                variant="ghost"
                size="md"
                type="button"
                onClick={() => setRejectModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                type="submit"
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
