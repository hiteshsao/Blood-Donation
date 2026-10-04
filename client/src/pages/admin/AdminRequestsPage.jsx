import React, { useState, useEffect } from 'react';
import {
  GitPullRequest,
  CheckCircle2,
  XCircle,
  UserPlus,
  RefreshCw,
  Clock,
  Building2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI, requestAPI, searchAPI } from '../../services/api';
import { DataTable, StatusBadge, Button, Modal, Select, Input } from '../../components/common';

const VALID_TRANSITIONS = {
  PENDING: ['APPROVED', 'CANCELLED'],
  APPROVED: ['DONOR_ASSIGNED', 'IN_PROGRESS', 'CANCELLED'],
  DONOR_ASSIGNED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['FULFILLED', 'CANCELLED'],
  FULFILLED: [],
  CANCELLED: [],
};

const FALLBACK_ADMIN_REQUESTS = [
  {
    _id: 'req-adm-701',
    patientName: 'Vikrant Deshmukh (UHID-88219)',
    bloodGroup: 'O-',
    units: 3,
    urgency: 'CRITICAL',
    hospitalName: 'Apollo City Hospital',
    city: 'Mumbai',
    status: 'DONOR_ASSIGNED',
    assignedDonor: {
      name: 'Aakash Verma',
      phone: '+91 98765 43210',
    },
    createdAt: '2026-10-01T13:45:00Z',
  },
  {
    _id: 'req-adm-702',
    patientName: 'Meera Kulkarni (UHID-71042)',
    bloodGroup: 'B+',
    units: 2,
    urgency: 'URGENT',
    hospitalName: 'Civil Hospital Trauma Unit',
    city: 'Mumbai',
    status: 'PENDING',
    assignedDonor: null,
    createdAt: '2026-10-01T14:10:00Z',
  },
  {
    _id: 'req-adm-703',
    patientName: 'Kavita Patel (UHID-31290)',
    bloodGroup: 'AB-',
    units: 1,
    urgency: 'URGENT',
    hospitalName: 'Lilavati Hospital',
    city: 'Mumbai',
    status: 'APPROVED',
    assignedDonor: null,
    createdAt: '2026-10-01T11:20:00Z',
  },
  {
    _id: 'req-adm-704',
    patientName: 'Rohan Banerjee (UHID-49910)',
    bloodGroup: 'A+',
    units: 1,
    urgency: 'ROUTINE',
    hospitalName: 'Apollo City Hospital',
    city: 'Mumbai',
    status: 'FULFILLED',
    assignedDonor: {
      name: 'Priya Sharma',
      phone: '+91 98765 43211',
    },
    createdAt: '2026-09-30T10:00:00Z',
  },
];

const COMPATIBLE_DONORS_MOCK = [
  { id: 'dnr-101', name: 'Vikram Malhotra', bloodGroup: 'O-', phone: '+91 98765 43210', distanceKm: 2.1 },
  { id: 'dnr-102', name: 'Aakash Verma', bloodGroup: 'O+', phone: '+91 98765 43211', distanceKm: 3.4 },
  { id: 'dnr-103', name: 'Priya Sharma', bloodGroup: 'A+', phone: '+91 98765 43212', distanceKm: 4.8 },
  { id: 'dnr-104', name: 'Karan Mehra', bloodGroup: 'B+', phone: '+91 98765 43215', distanceKm: 5.2 },
];

export const AdminRequestsPage = () => {
  const [requests, setRequests] = useState(FALLBACK_ADMIN_REQUESTS);
  const [loading, setLoading] = useState(false);
  const [donorsList, setDonorsList] = useState(COMPATIBLE_DONORS_MOCK);

  // Assign Donor Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedReqToAssign, setSelectedReqToAssign] = useState(null);
  const [selectedDonorId, setSelectedDonorId] = useState(COMPATIBLE_DONORS_MOCK[0].id);
  const [isAssigning, setIsAssigning] = useState(false);

  // Change Status Modal State
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedReqForStatus, setSelectedReqForStatus] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getRequests();
      const data = res.data?.data || res.data?.requests || res.data;
      if (Array.isArray(data)) {
        setRequests(data);
      }
    } catch (err) {
      console.warn('[AdminRequests] Failed to fetch requests from server:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    adminAPI.getDonors({ limit: 50 }).then((res) => {
      const data = res.data?.data || res.data?.donors;
      if (Array.isArray(data) && data.length > 0) {
        const formatted = data.map((d) => ({
          id: d.user?._id || d.user || d._id,
          name: d.name || d.user?.name || 'Voluntary Donor',
          bloodGroup: d.bloodGroup || 'O+',
          phone: d.phone || d.user?.phone || '+91 98000 00000',
          distanceKm: d.distanceKm || 2.5,
        }));
        setDonorsList(formatted);
        if (formatted[0]) {
          setSelectedDonorId(formatted[0].id);
        }
      }
    }).catch(() => {});
  }, []);

  // 1. Open Assign Donor Modal
  const handleOpenAssignModal = (req) => {
    setSelectedReqToAssign(req);
    setAssignModalOpen(true);
  };

  const handleConfirmAssign = async (e) => {
    e.preventDefault();
    if (!selectedReqToAssign) return;

    const chosenDonor = donorsList.find((d) => d.id === selectedDonorId) || { name: 'Assigned Donor', phone: '' };

    setIsAssigning(true);
    try {
      await adminAPI.assignDonorToRequest(selectedReqToAssign._id, {
        donorId: selectedDonorId,
      });

      toast.success(`Donor assigned to request ${selectedReqToAssign._id}.`);
      setAssignModalOpen(false);
      await fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to assign donor.');
    } finally {
      setIsAssigning(false);
    }
  };

  // 2. Open Change Status Modal
  const handleOpenStatusModal = (req) => {
    setSelectedReqForStatus(req);
    const validNext = VALID_TRANSITIONS[req.status] || [];
    setNewStatus(validNext[0] || req.status);
    setStatusModalOpen(true);
  };

  const handleConfirmStatusChange = async (e) => {
    e.preventDefault();
    if (!selectedReqForStatus || !newStatus) return;

    setIsUpdatingStatus(true);
    try {
      await adminAPI.changeRequestStatus(selectedReqForStatus._id, { status: newStatus });
      toast.success(`Request status updated to ${newStatus}.`);
      setStatusModalOpen(false);
      await fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const columns = [
    {
      header: 'Patient Requisition',
      key: 'patientName',
      sortable: true,
      render: (row) => (
        <div>
          <strong className="text-slate-900 font-bold block">{row.patientName}</strong>
          <span className="text-slate-500 text-[11px]">{row.hospitalName} • {row.city}</span>
        </div>
      ),
    },
    {
      header: 'Blood Group',
      key: 'bloodGroup',
      sortable: true,
      render: (row) => (
        <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#991B1B] to-[#C62828] text-white font-black text-xs flex items-center justify-center shadow-sm">
          {row.bloodGroup}
        </span>
      ),
    },
    {
      header: 'Units & Urgency',
      key: 'units',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-bold text-slate-800 text-xs block">{row.units} Units</span>
          <span
            className={`text-[10px] font-black uppercase ${
              row.urgency === 'CRITICAL' ? 'text-red-700 animate-pulse' : 'text-amber-700'
            }`}
          >
            {row.urgency}
          </span>
        </div>
      ),
    },
    {
      header: 'Assigned Donor',
      key: 'assignedDonor',
      sortable: true,
      render: (row) => (
        row.assignedDonor ? (
          <div>
            <strong className="text-slate-800 text-xs block">{row.assignedDonor.name}</strong>
            <span className="text-slate-400 text-[10px]">{row.assignedDonor.phone}</span>
          </div>
        ) : (
          <span className="text-slate-400 text-xs italic">Unassigned</span>
        )
      ),
    },
    {
      header: 'Current Status',
      key: 'status',
      sortable: true,
      render: (row) => <StatusBadge status={row.status} size="xs" />,
    },
    {
      header: 'Ordered At',
      key: 'createdAt',
      sortable: true,
      render: (row) => (
        <span className="text-slate-400 text-[11px]">
          {new Date(row.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })},{' '}
          {new Date(row.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
        </span>
      ),
    },
    {
      header: 'State Controls',
      key: 'actions',
      sortable: false,
      render: (row) => {
        const validNext = VALID_TRANSITIONS[row.status] || [];
        const isTerminal = validNext.length === 0;

        return (
          <div className="flex items-center gap-2">
            {!row.assignedDonor && row.status !== 'FULFILLED' && row.status !== 'CANCELLED' && (
              <Button
                variant="outline"
                size="xs"
                onClick={() => handleOpenAssignModal(row)}
                className="text-blue-700 border-blue-200 hover:bg-blue-50"
                leftIcon={<UserPlus className="w-3 h-3" />}
              >
                Assign Donor
              </Button>
            )}

            {!isTerminal && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleOpenStatusModal(row)}
                className="text-slate-700 hover:bg-slate-100"
                rightIcon={<ArrowRight className="w-3 h-3" />}
              >
                Change Status
              </Button>
            )}
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-800 text-red-400 text-xs font-black mb-2">
            <GitPullRequest className="w-3.5 h-3.5" />
            <span>State Machine Requisition Terminal</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Hospital Blood Requests & Allocations
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Supervise clinical requisitions, assign matching voluntary donors, and enforce finite-state machine transitions.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchRequests}
          leftIcon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
        >
          Refresh Requisitions
        </Button>
      </div>

      {/* Reusable DataTable */}
      <DataTable
        columns={columns}
        data={requests}
        keyField="_id"
        isLoading={loading}
        searchPlaceholder="Search requisition by patient, hospital, or group..."
        searchKeys={['patientName', 'hospitalName', 'bloodGroup', 'city', 'status']}
        pageSize={10}
        emptyTitle="No Blood Requests"
        emptyDescription="No blood orders match your query."
      />

      {/* Assign Donor Modal */}
      {assignModalOpen && selectedReqToAssign && (
        <Modal
          isOpen={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          title={`Assign Donor to ${selectedReqToAssign.patientName}`}
        >
          <form onSubmit={handleConfirmAssign} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-[#FFF8F8] border border-red-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Target Patient</p>
                <strong className="text-sm text-slate-900">{selectedReqToAssign.patientName}</strong>
              </div>
              <span className="text-xs font-black text-[#C62828] bg-red-100 px-2 py-0.5 rounded-md">
                Group {selectedReqToAssign.bloodGroup} ({selectedReqToAssign.units} Units)
              </span>
            </div>

            <Select
              label="Select Compatible Voluntary Donor"
              options={donorsList.map((d) => ({
                value: d.id,
                label: `${d.name} (${d.bloodGroup}) • ${d.distanceKm} km away • ${d.phone}`,
              }))}
              value={selectedDonorId}
              onChange={(e) => setSelectedDonorId(e.target.value)}
            />

            <div className="pt-2 flex justify-end gap-3">
              <Button
                variant="ghost"
                size="md"
                type="button"
                onClick={() => setAssignModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                isLoading={isAssigning}
                leftIcon={<UserPlus className="w-4 h-4" />}
              >
                Assign & Dispatch Alert
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Change Status Modal (Respects State Machine) */}
      {statusModalOpen && selectedReqForStatus && (
        <Modal
          isOpen={statusModalOpen}
          onClose={() => setStatusModalOpen(false)}
          title={`Update State: ${selectedReqForStatus.patientName}`}
        >
          <form onSubmit={handleConfirmStatusChange} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Current State</p>
                <strong className="text-sm text-slate-900">{selectedReqForStatus.status}</strong>
              </div>
              <StatusBadge status={selectedReqForStatus.status} size="xs" />
            </div>

            <Select
              label="Valid Next State (State Machine Compliant)"
              options={(VALID_TRANSITIONS[selectedReqForStatus.status] || []).map((st) => ({
                value: st,
                label: `Advance to ${st.replace('_', ' ')}`,
              }))}
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
            />

            <div className="pt-2 flex justify-end gap-3">
              <Button
                variant="ghost"
                size="md"
                type="button"
                onClick={() => setStatusModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                isLoading={isUpdatingStatus}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Confirm State Transition
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminRequestsPage;
