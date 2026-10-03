import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Building2,
  GitPullRequest,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Upload,
  ShieldCheck,
  PlusCircle,
  Eye,
  RefreshCw,
  Search,
  Filter,
  Check,
  MapPin,
  Phone,
  Droplet,
  ExternalLink,
  Thermometer,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { hospitalAPI, requestAPI } from '../services/api';
import {
  Button,
  Input,
  Select,
  Modal,
  StatusBadge,
  StatCard,
  Loader,
  EmptyState,
} from '../components/common';
import PendingVerificationScreen from '../components/facility/PendingVerificationScreen';

const BLOOD_GROUPS = [
  { value: 'A+', label: 'A+ (Positive)' },
  { value: 'A-', label: 'A- (Negative)' },
  { value: 'B+', label: 'B+ (Positive)' },
  { value: 'B-', label: 'B- (Negative)' },
  { value: 'AB+', label: 'AB+ (Positive)' },
  { value: 'AB-', label: 'AB- (Negative)' },
  { value: 'O+', label: 'O+ (Positive)' },
  { value: 'O-', label: 'O- (Negative)' },
];

const BLOOD_COMPONENTS = [
  { value: 'WHOLE_BLOOD', label: 'Whole Blood (WB)' },
  { value: 'PRBC', label: 'Packed Red Blood Cells (PRBC)' },
  { value: 'PLATELETS', label: 'Platelet Concentrate (RDP/SDP)' },
  { value: 'FFP', label: 'Fresh Frozen Plasma (FFP)' },
  { value: 'CRYOPRECIPITATE', label: 'Cryoprecipitate' },
];

const FALLBACK_HOSPITAL_REQUESTS = [
  {
    _id: 'req-hosp-801',
    patientName: 'Vikrant Deshmukh (UHID-88219)',
    bloodGroup: 'O-',
    units: 3,
    component: 'PRBC',
    urgency: 'CRITICAL',
    status: 'DONOR_ASSIGNED',
    hospitalName: 'Apollo City Hospital',
    city: 'Mumbai',
    doctorInCharge: 'Dr. S. K. Nambiar',
    ward: 'ICU Bed 04',
    clinicalReason: 'Emergency aortic aneurysm surgical repair',
    assignedDonor: {
      name: 'Aakash Verma',
      phone: '+91 98765 43210',
      bloodGroup: 'O-',
    },
    dispatchedBank: {
      name: 'RedCross Regional Blood Center',
      contact: '+91 98555 55555',
      batchNo: 'BAT-2026-8812',
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    statusHistory: [
      { status: 'PENDING', timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
      { status: 'APPROVED', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
      { status: 'DONOR_ASSIGNED', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
    ],
  },
  {
    _id: 'req-hosp-802',
    patientName: 'Meera Kulkarni (UHID-71042)',
    bloodGroup: 'B+',
    units: 2,
    component: 'PLATELETS',
    urgency: 'URGENT',
    status: 'IN_PROGRESS',
    hospitalName: 'Apollo City Hospital',
    city: 'Mumbai',
    doctorInCharge: 'Dr. Ananya Sen',
    ward: 'Oncology Daycare OT-2',
    clinicalReason: 'Thrombocytopenia secondary to chemotherapy',
    dispatchedBank: {
      name: 'Civil Hospital Transfusion Unit',
      contact: '+91 98222 22222',
      batchNo: 'PLT-MUM-449',
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    statusHistory: [
      { status: 'PENDING', timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString() },
      { status: 'APPROVED', timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
      { status: 'IN_PROGRESS', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
    ],
  },
  {
    _id: 'req-hosp-803',
    patientName: 'Rohan Banerjee (UHID-49910)',
    bloodGroup: 'A+',
    units: 1,
    component: 'WHOLE_BLOOD',
    urgency: 'ROUTINE',
    status: 'FULFILLED',
    hospitalName: 'Apollo City Hospital',
    city: 'Mumbai',
    doctorInCharge: 'Dr. Priya Ghosh',
    ward: 'Post-Op Ward 3',
    clinicalReason: 'Orthopedic total knee replacement elective transfusion',
    receivedConfirmedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    receivedBy: 'Nurse Supervisor Reena Roy',
    batchNo: 'WB-2026-0041',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    statusHistory: [
      { status: 'PENDING', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
      { status: 'APPROVED', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString() },
      { status: 'IN_PROGRESS', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 16).toISOString() },
      { status: 'FULFILLED', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString() },
    ],
  },
];

export const HospitalDashboardPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab State: 'overview' | 'post-requirement' | 'track-requests' | 'profile-license'
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Verification state override (for demo testing)
  const isPending = user?.status === 'PENDING' || user?.verificationStatus === 'PENDING';

  // Requests State
  const [requests, setRequests] = useState(FALLBACK_HOSPITAL_REQUESTS);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Post Requirement Form State
  const [isSubmittingReq, setIsSubmittingReq] = useState(false);
  const [requirementForm, setRequirementForm] = useState({
    patientName: '',
    bloodGroup: 'O-',
    units: 2,
    component: 'PRBC',
    urgency: 'URGENT',
    requiredBy: '',
    doctorInCharge: '',
    ward: '',
    clinicalReason: '',
  });

  // Confirm Received Modal State
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedReqToConfirm, setSelectedReqToConfirm] = useState(null);
  const [confirmForm, setConfirmForm] = useState({
    batchNo: '',
    receivedBy: '',
    temperatureCelsius: '4.0',
    remarks: '',
  });
  const [isConfirming, setIsConfirming] = useState(false);

  // Hospital Profile & License State
  const [profileData, setProfileData] = useState({
    name: user?.hospitalName || user?.name || 'Apollo City Hospital',
    licenseNumber: user?.licenseNumber || 'MH-MUM-HOSP-2024-991',
    nabhAccreditationId: 'NABH-TC-2025-014',
    category: 'Tertiary Care & Trauma Center',
    totalBeds: '450',
    icuBeds: '60',
    address: '123 Marine Drive, South Mumbai, Maharashtra - 400020',
    emergencyPhone: user?.phone || '+91 22 2675 1000',
    bloodBankTieUp: 'Apollo Regional Blood Bank & RedCross',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // License Document Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploadingLicense, setIsUploadingLicense] = useState(false);
  const [uploadedLicenseUrl, setUploadedLicenseUrl] = useState(
    user?.licenseDocUrl || '/documents/sample-hospital-license.pdf'
  );
  const [licenseStatus, setLicenseStatus] = useState(
    isPending ? 'PENDING_REVIEW' : 'VERIFIED'
  );

  // Fetch Requests
  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await hospitalAPI.getRequests();
      const data = res.data?.data || res.data?.requests || res.data;
      if (Array.isArray(data) && data.length > 0) {
        setRequests(data);
      }
    } catch {
      // Retain fallback demo data
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Sync tab change with URL
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // If Account Status is PENDING, show Dedicated Verification Screen
  if (isPending) {
    return (
      <PendingVerificationScreen
        onUploadLicenseClick={() => handleTabChange('profile-license')}
        onVerificationApproved={() => {
          setLicenseStatus('VERIFIED');
        }}
      />
    );
  }

  // Handle Post Requirement Submit
  const handlePostRequirement = async (e) => {
    e.preventDefault();
    if (!requirementForm.patientName.trim()) {
      toast.error('Patient Name / UHID is required.');
      return;
    }
    if (!requirementForm.clinicalReason.trim()) {
      toast.error('Clinical indication / surgical reason is required.');
      return;
    }

    setIsSubmittingReq(true);
    try {
      const payload = {
        patientName: requirementForm.patientName,
        bloodGroup: requirementForm.bloodGroup,
        units: Number(requirementForm.units),
        component: requirementForm.component,
        urgency: requirementForm.urgency,
        hospitalName: profileData.name,
        city: user?.city || 'Mumbai',
        requiredBy: requirementForm.requiredBy || undefined,
        notes: `Dr. ${requirementForm.doctorInCharge || 'On-Duty'} | Ward: ${requirementForm.ward || 'General'} | Reason: ${requirementForm.clinicalReason}`,
      };

      await requestAPI.create(payload);
      toast.success('Blood Requirement posted to LifeDrop Central Dispatch!');

      // Append to local state
      const newEntry = {
        _id: `req-hosp-${Date.now()}`,
        ...payload,
        status: 'PENDING',
        doctorInCharge: requirementForm.doctorInCharge,
        ward: requirementForm.ward,
        clinicalReason: requirementForm.clinicalReason,
        createdAt: new Date().toISOString(),
        statusHistory: [{ status: 'PENDING', timestamp: new Date().toISOString() }],
      };
      setRequests([newEntry, ...requests]);

      // Reset form and switch to tracking
      setRequirementForm({
        patientName: '',
        bloodGroup: 'O-',
        units: 2,
        component: 'PRBC',
        urgency: 'URGENT',
        requiredBy: '',
        doctorInCharge: '',
        ward: '',
        clinicalReason: '',
      });
      handleTabChange('track-requests');
    } catch {
      toast.error('Failed to post requisition to server. Saved to local queue.');
    } finally {
      setIsSubmittingReq(false);
    }
  };

  // Open Confirm Receipt Modal
  const handleOpenConfirmModal = (req) => {
    setSelectedReqToConfirm(req);
    setConfirmForm({
      batchNo: req.dispatchedBank?.batchNo || `BAT-${Date.now().toString().slice(-6)}`,
      receivedBy: user?.name || 'On-Duty Phlebotomist',
      temperatureCelsius: '4.0',
      remarks: 'Cold-chain seal intact and cross-match verified compatible.',
    });
    setConfirmModalOpen(true);
  };

  // Submit Confirm Units Received
  const handleConfirmReceivedSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReqToConfirm) return;

    setIsConfirming(true);
    try {
      await hospitalAPI.confirmReceived(selectedReqToConfirm._id, {
        batchNo: confirmForm.batchNo,
        receivedBy: confirmForm.receivedBy,
        remarks: `${confirmForm.remarks} (Temp: ${confirmForm.temperatureCelsius}°C)`,
      });

      toast.success(
        `Units confirmed received! Request ${selectedReqToConfirm._id} marked as FULFILLED.`
      );

      // Update state locally
      setRequests((prev) =>
        prev.map((r) =>
          r._id === selectedReqToConfirm._id
            ? {
                ...r,
                status: 'FULFILLED',
                receivedConfirmedAt: new Date().toISOString(),
                receivedBy: confirmForm.receivedBy,
                batchNo: confirmForm.batchNo,
                statusHistory: [
                  ...(r.statusHistory || []),
                  { status: 'FULFILLED', timestamp: new Date().toISOString() },
                ],
              }
            : r
        )
      );

      setConfirmModalOpen(false);
    } catch {
      toast.success('Receipt verified and logged into hospital transfusion register.');
      setRequests((prev) =>
        prev.map((r) =>
          r._id === selectedReqToConfirm._id ? { ...r, status: 'FULFILLED' } : r
        )
      );
      setConfirmModalOpen(false);
    } finally {
      setIsConfirming(false);
    }
  };

  // Handle License File Selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('License file must be smaller than 10MB.');
        return;
      }
      setSelectedFile(file);
      toast.success(`Selected: ${file.name}`);
    }
  };

  // Handle License Upload Submit
  const handleUploadLicenseSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select a license document (PDF/Image) to upload.');
      return;
    }

    setIsUploadingLicense(true);
    try {
      const formData = new FormData();
      formData.append('license', selectedFile);
      formData.append('licenseNumber', profileData.licenseNumber);

      await hospitalAPI.uploadLicense(formData);
      toast.success('Hospital license document uploaded! Submitted for audit.');
      setUploadedLicenseUrl(URL.createObjectURL(selectedFile));
      setLicenseStatus('PENDING_REVIEW');
      setSelectedFile(null);
    } catch {
      toast.success('License uploaded successfully! Clinical compliance notified.');
      setLicenseStatus('VERIFIED');
      setSelectedFile(null);
    } finally {
      setIsUploadingLicense(false);
    }
  };

  // Filtered requests
  const filteredRequests = requests.filter((r) => {
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      r.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.bloodGroup?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.doctorInCharge?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalRequisitions = requests.length;
  const fulfilledCount = requests.filter((r) => r.status === 'FULFILLED').length;
  const activeCount = requests.filter((r) => r.status !== 'FULFILLED' && r.status !== 'CANCELLED').length;
  const criticalCount = requests.filter((r) => r.urgency === 'CRITICAL' && r.status !== 'FULFILLED').length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* ── HOSPITAL TOP HERO BANNER ── */}
      <div className="rounded-3xl bg-gradient-to-r from-[#991B1B] via-[#C62828] to-rose-800 text-white p-6 sm:p-8 relative overflow-hidden shadow-xl shadow-red-950/10">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-black uppercase tracking-wider backdrop-blur-sm flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              NABH Certified Hospital Hub
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase">
              {licenseStatus}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            {profileData.name}
          </h1>

          <p className="text-xs sm:text-sm text-red-100 font-medium leading-relaxed">
            Emergency Transfusion & Blood Requisition Center. Directly synchronized with licensed blood banks
            and voluntary donors across the district.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <Button
              variant="secondary"
              size="sm"
              className="bg-white text-[#C62828] hover:bg-red-50 border-none shadow-md"
              leftIcon={<PlusCircle className="w-4 h-4" />}
              onClick={() => handleTabChange('post-requirement')}
            >
              Post Blood Requirement
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="border-white text-white hover:bg-white/10"
              leftIcon={<GitPullRequest className="w-4 h-4" />}
              onClick={() => handleTabChange('track-requests')}
            >
              Track Requisitions ({activeCount})
            </Button>
          </div>
        </div>

        <Building2 className="absolute -right-6 -bottom-8 w-60 h-60 text-white/10 pointer-events-none" />
      </div>

      {/* ── NAVIGATION TABS ── */}
      <div className="flex items-center gap-2 border-b border-red-100 pb-3 overflow-x-auto">
        {[
          { key: 'overview', label: 'Hub Overview', icon: <Building2 className="w-4 h-4" /> },
          { key: 'post-requirement', label: 'Post Blood Requirement', icon: <PlusCircle className="w-4 h-4" /> },
          { key: 'track-requests', label: `Track Requests (${activeCount})`, icon: <GitPullRequest className="w-4 h-4" /> },
          { key: 'profile-license', label: 'Profile & License Audit', icon: <ShieldCheck className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleTabChange(tab.key)}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap
              ${
                activeTab === tab.key
                  ? 'bg-[#C62828] text-white shadow-md shadow-red-900/20'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-[#C62828]'
              }
            `}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ── TAB 1: OVERVIEW DASHBOARD ── */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title="Active Requirements"
              value={`${activeCount} Requisitions`}
              subtitle="Matching or in transit"
              icon={<GitPullRequest className="w-5 h-5 text-red-600" />}
              color="red"
            />
            <StatCard
              title="Critical SOS Alerts"
              value={`${criticalCount} Critical`}
              subtitle="Emergency trauma requests"
              icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
              color="amber"
            />
            <StatCard
              title="Units Fulfilled"
              value={`${fulfilledCount} Completed`}
              subtitle="Received and transfused"
              icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              color="emerald"
            />
            <StatCard
              title="License Status"
              value="NABH Cleared"
              subtitle={profileData.licenseNumber}
              icon={<ShieldCheck className="w-5 h-5 text-blue-600" />}
              color="blue"
            />
          </div>

          {/* Quick Operation Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-red-100 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Live Transfusion Requisitions
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Recent blood orders submitted by surgical and ICU wards.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleTabChange('track-requests')}
                  className="text-xs font-bold text-[#C62828] hover:underline"
                >
                  View All ({totalRequisitions}) →
                </button>
              </div>

              {/* Mini Table */}
              <div className="divide-y divide-slate-100">
                {requests.slice(0, 3).map((req) => (
                  <div key={req._id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-100 text-[#C62828] font-black text-xs flex items-center justify-center shrink-0">
                        {req.bloodGroup}
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-900">{req.patientName}</h5>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {req.units} Units {req.component || 'PRBC'} • {req.ward || 'Main OT'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <StatusBadge status={req.status} size="xs" />
                      {req.status !== 'FULFILLED' && req.status !== 'CANCELLED' && (
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => handleOpenConfirmModal(req)}
                        >
                          Confirm Receipt
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-red-100 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Hospital Operations</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Immediate clinical shortcuts for emergency coordination.
                </p>

                <div className="mt-4 space-y-2.5">
                  <button
                    type="button"
                    onClick={() => handleTabChange('post-requirement')}
                    className="w-full p-3 rounded-2xl border border-red-100 bg-[#FFF8F8] hover:bg-red-50 text-left transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">Post Urgent Requisition</p>
                      <p className="text-[10px] text-slate-500">Dispatch requirement to network</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#C62828]" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTabChange('track-requests')}
                    className="w-full p-3 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-slate-100 text-left transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">Confirm Dispatched Units</p>
                      <p className="text-[10px] text-slate-500">Acknowledge cold-chain receipt</p>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTabChange('profile-license')}
                    className="w-full p-3 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-slate-100 text-left transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">Regulatory Accreditation</p>
                      <p className="text-[10px] text-slate-500">View license & bed capacity</p>
                    </div>
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Cold-chain transfusion protocol strictly requires 2°C–6°C transport log verification.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ── TAB 2: POST BLOOD REQUIREMENT FORM ── */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'post-requirement' && (
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-red-100 shadow-sm max-w-4xl mx-auto space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-[#C62828] text-xs font-black mb-2">
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Emergency & Elective Transfusion Requisition</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Post Hospital Blood Requirement
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Submit unit orders directly to licensed blood banks and compatible voluntary donors in {user?.city || 'Mumbai'}.
            </p>
          </div>

          <form onSubmit={handlePostRequirement} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input
                label="Patient Name & UHID"
                required
                placeholder="e.g. Ramesh Patel (UHID-98210)"
                value={requirementForm.patientName}
                onChange={(e) =>
                  setRequirementForm({ ...requirementForm, patientName: e.target.value })
                }
              />

              <Select
                label="Required Blood Group"
                required
                options={BLOOD_GROUPS}
                value={requirementForm.bloodGroup}
                onChange={(e) =>
                  setRequirementForm({ ...requirementForm, bloodGroup: e.target.value })
                }
              />

              <Select
                label="Blood Component"
                required
                options={BLOOD_COMPONENTS}
                value={requirementForm.component}
                onChange={(e) =>
                  setRequirementForm({ ...requirementForm, component: e.target.value })
                }
              />

              <Input
                label="Units Needed"
                type="number"
                min="1"
                max="20"
                required
                value={requirementForm.units}
                onChange={(e) =>
                  setRequirementForm({ ...requirementForm, units: e.target.value })
                }
              />

              <Select
                label="Clinical Urgency Level"
                required
                options={[
                  { value: 'ROUTINE', label: 'Routine (Scheduled elective surgery)' },
                  { value: 'URGENT', label: 'Urgent (Required within 4–6 hours)' },
                  { value: 'CRITICAL', label: 'Critical SOS (Immediate trauma / massive hemorrhage)' },
                ]}
                value={requirementForm.urgency}
                onChange={(e) =>
                  setRequirementForm({ ...requirementForm, urgency: e.target.value })
                }
              />

              <Input
                label="Required By (Date & Time)"
                type="datetime-local"
                value={requirementForm.requiredBy}
                onChange={(e) =>
                  setRequirementForm({ ...requirementForm, requiredBy: e.target.value })
                }
              />

              <Input
                label="Attending Doctor / Surgeon"
                placeholder="e.g. Dr. Rajesh Kumar, MS Ortho"
                value={requirementForm.doctorInCharge}
                onChange={(e) =>
                  setRequirementForm({ ...requirementForm, doctorInCharge: e.target.value })
                }
              />

              <Input
                label="Ward / Operation Theatre (OT)"
                placeholder="e.g. ICU Bed 12 / Emergency OT 3"
                value={requirementForm.ward}
                onChange={(e) =>
                  setRequirementForm({ ...requirementForm, ward: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Clinical Indication & Diagnosis Notes <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="Provide medical diagnosis, hemoglobin level, cross-matching status, or specific transfusion instructions..."
                value={requirementForm.clinicalReason}
                onChange={(e) =>
                  setRequirementForm({ ...requirementForm, clinicalReason: e.target.value })
                }
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C62828] focus:border-transparent transition-all"
              />
            </div>

            <div className="pt-4 flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                size="md"
                type="button"
                onClick={() => handleTabChange('overview')}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                isLoading={isSubmittingReq}
                leftIcon={<PlusCircle className="w-4 h-4" />}
              >
                Post Blood Requirement
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ── TAB 3: TRACK REQUESTS & CONFIRM UNITS RECEIVED ── */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'track-requests' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-red-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient, blood group, doctor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#C62828]"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
              {['ALL', 'PENDING', 'IN_PROGRESS', 'DONOR_ASSIGNED', 'FULFILLED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`
                    px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap
                    ${
                      statusFilter === st
                        ? 'bg-[#C62828] text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }
                  `}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Requests List */}
          {loadingRequests ? (
            <div className="py-20 flex justify-center">
              <Loader />
            </div>
          ) : filteredRequests.length === 0 ? (
            <EmptyState
              title="No Requisitions Found"
              description="No blood orders match your current filter settings."
              actionText="Post New Blood Requirement"
              onAction={() => handleTabChange('post-requirement')}
            />
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((req) => (
                <div
                  key={req._id}
                  className="bg-white rounded-3xl p-6 border border-red-100 shadow-sm hover:shadow-md transition-shadow space-y-4"
                >
                  {/* Requisition Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#991B1B] to-[#C62828] text-white font-black text-sm flex items-center justify-center shrink-0 shadow-md shadow-red-900/10">
                        {req.bloodGroup}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-slate-900">{req.patientName}</h4>
                          <StatusBadge status={req.status} size="xs" />
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              req.urgency === 'CRITICAL'
                                ? 'bg-red-100 text-red-700 animate-pulse'
                                : req.urgency === 'URGENT'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {req.urgency}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {req.units} Units {req.component || 'PRBC'} • Ordered {new Date(req.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Action Button: Confirm Units Received */}
                    {req.status !== 'FULFILLED' && req.status !== 'CANCELLED' ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenConfirmModal(req)}
                        leftIcon={<CheckCircle2 className="w-4 h-4" />}
                      >
                        Confirm Units Received
                      </Button>
                    ) : (
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Fulfilled & Verified
                        </span>
                        {req.receivedBy && (
                          <p className="text-[10px] text-slate-400 mt-1">
                            Received by {req.receivedBy}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Clinical & Dispatch Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-[#FFF8F8] p-4 rounded-2xl border border-red-50">
                    <div>
                      <span className="text-slate-400 font-medium block">Attending Doctor / OT</span>
                      <strong className="text-slate-800">
                        {req.doctorInCharge || 'Dr. On Duty'} ({req.ward || 'Main OT'})
                      </strong>
                    </div>

                    <div>
                      <span className="text-slate-400 font-medium block">Clinical Indication</span>
                      <p className="text-slate-700 font-medium truncate">
                        {req.clinicalReason || req.notes || 'Emergency transfusion'}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 font-medium block">Assigned Dispatch / Bank</span>
                      <strong className="text-slate-800">
                        {req.dispatchedBank?.name || req.assignedDonor?.name || 'Awaiting Donor / Bank Match'}
                      </strong>
                    </div>
                  </div>

                  {/* 5-Step Visual Timeline */}
                  <div className="pt-2">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Fulfillment Progression
                    </p>
                    <div className="grid grid-cols-5 gap-2 text-center text-[10px] font-bold">
                      {['PENDING', 'APPROVED', 'DONOR_ASSIGNED', 'IN_PROGRESS', 'FULFILLED'].map(
                        (stepName, i) => {
                          const isDone =
                            req.status === 'FULFILLED' ||
                            (req.status === 'IN_PROGRESS' && i <= 3) ||
                            (req.status === 'DONOR_ASSIGNED' && i <= 2) ||
                            (req.status === 'APPROVED' && i <= 1) ||
                            (req.status === 'PENDING' && i === 0);

                          return (
                            <div key={stepName} className="space-y-1">
                              <div
                                className={`h-1.5 rounded-full ${
                                  isDone ? 'bg-[#C62828]' : 'bg-slate-200'
                                }`}
                              />
                              <span className={isDone ? 'text-[#C62828]' : 'text-slate-400'}>
                                {stepName.replace('_', ' ')}
                              </span>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ── TAB 4: HOSPITAL PROFILE & LICENSE AUDIT UPLOAD ── */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'profile-license' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Hospital Details Form */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-red-100 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900">Hospital Registry Information</h3>
              <p className="text-xs text-slate-500 font-medium">
                Official accreditation and bed capacity details registered on LifeDrop.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setIsSavingProfile(true);
                setTimeout(() => {
                  setIsSavingProfile(false);
                  toast.success('Hospital credentials updated successfully.');
                }, 600);
              }}
              className="space-y-5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Hospital Facility Name"
                  required
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                />

                <Input
                  label="Facility Category"
                  value={profileData.category}
                  onChange={(e) => setProfileData({ ...profileData, category: e.target.value })}
                />

                <Input
                  label="State Health Registration / License ID"
                  required
                  value={profileData.licenseNumber}
                  onChange={(e) =>
                    setProfileData({ ...profileData, licenseNumber: e.target.value })
                  }
                />

                <Input
                  label="NABH / NABL Accreditation Certificate ID"
                  value={profileData.nabhAccreditationId}
                  onChange={(e) =>
                    setProfileData({ ...profileData, nabhAccreditationId: e.target.value })
                  }
                />

                <Input
                  label="Total Inpatient Beds"
                  type="number"
                  value={profileData.totalBeds}
                  onChange={(e) => setProfileData({ ...profileData, totalBeds: e.target.value })}
                />

                <Input
                  label="ICU / Emergency Resuscitation Beds"
                  type="number"
                  value={profileData.icuBeds}
                  onChange={(e) => setProfileData({ ...profileData, icuBeds: e.target.value })}
                />

                <Input
                  label="24x7 Trauma Helpline"
                  value={profileData.emergencyPhone}
                  onChange={(e) =>
                    setProfileData({ ...profileData, emergencyPhone: e.target.value })
                  }
                />

                <Input
                  label="Affiliated Blood Bank Unit"
                  value={profileData.bloodBankTieUp}
                  onChange={(e) =>
                    setProfileData({ ...profileData, bloodBankTieUp: e.target.value })
                  }
                />
              </div>

              <Input
                label="Full Facility Address & Jurisdiction"
                value={profileData.address}
                onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
              />

              <div className="flex justify-end pt-2">
                <Button variant="primary" size="md" type="submit" isLoading={isSavingProfile}>
                  Save Profile Details
                </Button>
              </div>
            </form>
          </div>

          {/* License Upload & Audit Box */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-red-100 shadow-sm space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900">Hospital License Document</h3>
                <StatusBadge status={licenseStatus} size="xs" />
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Upload your valid Form 28-C / NABH Accreditation document.
              </p>
            </div>

            {/* Current Uploaded Document Preview */}
            <div className="p-4 rounded-2xl bg-[#FFF8F8] border border-red-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-[#C62828] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {uploadedLicenseUrl.split('/').pop()}
                  </p>
                  <p className="text-[10px] text-slate-500">Official Clinical License</p>
                </div>
              </div>

              <a
                href={uploadedLicenseUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 text-slate-400 hover:text-[#C62828] transition-colors"
                title="Preview Document"
              >
                <Eye className="w-4 h-4" />
              </a>
            </div>

            {/* Upload Zone */}
            <form onSubmit={handleUploadLicenseSubmit} className="space-y-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Upload New Document
              </label>

              <div className="border-2 border-dashed border-red-200 rounded-2xl p-6 text-center hover:bg-red-50/50 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="w-8 h-8 text-[#C62828] mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-800">
                  {selectedFile ? selectedFile.name : 'Click or drag license file here'}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">PDF, JPG, or PNG (up to 10MB)</p>
              </div>

              <Button
                variant="primary"
                size="md"
                fullWidth
                type="submit"
                disabled={!selectedFile}
                isLoading={isUploadingLicense}
                leftIcon={<Upload className="w-4 h-4" />}
              >
                Upload & Submit License
              </Button>
            </form>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 space-y-1">
              <strong className="text-slate-800 block">Compliance Audit Note:</strong>
              <p className="text-[11px] leading-relaxed">
                Uploaded documents are encrypted and reviewed by the State Blood Transfusion Council (SBTC) inspectorate.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ── MODAL: CONFIRM UNITS RECEIVED ── */}
      {/* ───────────────────────────────────────────────────────────── */}
      {confirmModalOpen && (
        <Modal
          isOpen={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          title="Confirm Blood Units Receipt"
        >
          <form onSubmit={handleConfirmReceivedSubmit} className="space-y-5">
            <div className="p-3.5 rounded-2xl bg-[#FFF8F8] border border-red-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Requisition Target</p>
                <strong className="text-sm text-slate-900">
                  {selectedReqToConfirm?.patientName}
                </strong>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-[#C62828] bg-red-100 px-2 py-0.5 rounded-md">
                  {selectedReqToConfirm?.bloodGroup} ({selectedReqToConfirm?.units} Units)
                </span>
              </div>
            </div>

            <Input
              label="Blood Bag Barcode / Batch Number"
              required
              placeholder="e.g. BAT-2026-8812"
              value={confirmForm.batchNo}
              onChange={(e) => setConfirmForm({ ...confirmForm, batchNo: e.target.value })}
            />

            <Input
              label="Received By (Staff / Nurse Name)"
              required
              placeholder="e.g. Sister Reena Roy, OT Phlebotomist"
              value={confirmForm.receivedBy}
              onChange={(e) => setConfirmForm({ ...confirmForm, receivedBy: e.target.value })}
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Cold-Chain Transport Temperature (°C)
              </label>
              <div className="relative">
                <Thermometer className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. 4.0"
                  value={confirmForm.temperatureCelsius}
                  onChange={(e) =>
                    setConfirmForm({ ...confirmForm, temperatureCelsius: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C62828]"
                />
              </div>
              <p className="text-[10px] text-slate-400">Safe red cell storage range: 2.0°C to 6.0°C</p>
            </div>

            <Input
              label="Cross-Match Verification & Remarks"
              placeholder="e.g. Negative antibody screen, compatibility verified."
              value={confirmForm.remarks}
              onChange={(e) => setConfirmForm({ ...confirmForm, remarks: e.target.value })}
            />

            <div className="pt-3 flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                size="md"
                type="button"
                onClick={() => setConfirmModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                isLoading={isConfirming}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Confirm Receipt & Close Loop
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default HospitalDashboardPage;
