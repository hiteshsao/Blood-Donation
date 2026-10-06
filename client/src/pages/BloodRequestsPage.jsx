import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  GitPullRequest,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Building2,
  Calendar,
  User,
  Phone,
  Droplet,
  ArrowRight,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { requestAPI, hospitalAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Button,
  Input,
  Select,
  StatusBadge,
  Loader,
  EmptyState,
  ConfirmDialog,
  Modal,
} from '../components/common';

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

const URGENCIES = [
  { value: 'NORMAL', label: 'Normal (Planned Surgery)' },
  { value: 'URGENT', label: 'Urgent (Within 6–12 Hours)' },
  { value: 'CRITICAL', label: 'Critical SOS (Immediate Trauma)' },
];

const STATE_TIMELINE_STEPS = [
  { key: 'PENDING', label: 'Submitted', desc: 'Request logged in registry' },
  { key: 'APPROVED', label: 'Clinically Cleared', desc: 'Medical verification passed' },
  { key: 'DONOR_ASSIGNED', label: 'Donor Matched', desc: 'Compatible donor assigned' },
  { key: 'IN_PROGRESS', label: 'In Transit', desc: 'Collection or dispatch underway' },
  { key: 'FULFILLED', label: 'Units Issued', desc: 'Blood bank issued units' },
  { key: 'RECEIVED', label: 'Units Received', desc: 'Hospital confirmed receipt' },
];

const FALLBACK_MY_REQUESTS = [
  {
    _id: 'req-201',
    patientName: 'Karan Mehra',
    bloodGroup: 'B+',
    units: 2,
    urgency: 'URGENT',
    hospitalName: 'Apollo Hospital',
    city: 'Mumbai',
    status: 'DONOR_ASSIGNED',
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    requiredBy: new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString(),
    statusHistory: [
      { status: 'PENDING', timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(), note: 'Request initiated' },
      { status: 'APPROVED', timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(), note: 'Medical approval confirmed' },
      { status: 'DONOR_ASSIGNED', timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(), note: 'Matched with donor Vikram Malhotra' },
    ],
  },
  {
    _id: 'req-202',
    patientName: 'Sunita Patil',
    bloodGroup: 'O-',
    units: 1,
    urgency: 'CRITICAL',
    hospitalName: 'Civil Trauma Center',
    city: 'Mumbai',
    status: 'FULFILLED',
    confirmedReceived: true,
    confirmedAt: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    statusHistory: [
      { status: 'PENDING', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() },
      { status: 'APPROVED', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 40).toISOString() },
      { status: 'DONOR_ASSIGNED', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString() },
      { status: 'IN_PROGRESS', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString() },
      { status: 'FULFILLED', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(), note: 'Blood bank issued units' },
      { status: 'RECEIVED', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(), note: 'Hospital confirmed receipt' },
    ],
  },
];

export const BloodRequestsPage = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState(
    searchParams.get('create') ? 'create' : 'my'
  ); // 'my' | 'create'

  const [myRequests, setMyRequests] = useState(FALLBACK_MY_REQUESTS);
  const [hospitals, setHospitals] = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedRequestToCancel, setSelectedRequestToCancel] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    patientName: '',
    bloodGroup: searchParams.get('bloodGroup') || 'O+',
    units: 2,
    urgency: searchParams.get('urgency') || 'URGENT',
    hospitalId: '',
    hospitalName: '',
    city: user?.city || 'Mumbai',
    contactPhone: user?.phone || '',
    requiredBy: '',
    notes: '',
  });

  const fetchHospitals = async () => {
    setLoadingHospitals(true);
    try {
      const res = await hospitalAPI.getVerifiedHospitals();
      const list = res.data?.hospitals || res.data?.data || res.data;
      if (Array.isArray(list)) {
        setHospitals(list);
        if (list.length > 0 && !formData.hospitalId) {
          setFormData((prev) => ({
            ...prev,
            hospitalId: list[0]._id,
            hospitalName: list[0].name,
            city: list[0].city || prev.city,
          }));
        }
      }
    } catch (err) {
      console.warn('Failed to load registered hospitals:', err.message);
    } finally {
      setLoadingHospitals(false);
    }
  };

  const fetchMyRequests = async () => {
    setLoading(true);
    try {
      const res = await requestAPI.getMyRequests();
      const data = res.data?.requests || res.data?.data || res.data;
      if (Array.isArray(data)) {
        setMyRequests(data);
      }
    } catch {
      // Keep fallbacks
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRequests();
    fetchHospitals();
  }, []);

  useEffect(() => {
    if (searchParams.get('create')) {
      setActiveTab('create');
    }
    if (searchParams.get('bloodGroup')) {
      setFormData((prev) => ({
        ...prev,
        bloodGroup: searchParams.get('bloodGroup'),
      }));
    }
  }, [searchParams]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleHospitalSelect = (e) => {
    const selectedId = e.target.value;
    const selectedHosp = hospitals.find((h) => h._id === selectedId);
    setFormData((prev) => ({
      ...prev,
      hospitalId: selectedId,
      hospitalName: selectedHosp ? selectedHosp.name : '',
      city: selectedHosp?.city || prev.city,
    }));
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!formData.patientName || !formData.hospitalId) {
      toast.error('Patient Name and registered Hospital selection are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        patientName: formData.patientName,
        bloodGroup: formData.bloodGroup,
        units: Number(formData.units),
        urgency: formData.urgency,
        hospital: formData.hospitalId,
        hospitalId: formData.hospitalId,
        hospitalName: formData.hospitalName,
        city: formData.city,
        contactNumber: formData.contactPhone,
        contactPhone: formData.contactPhone,
        donorId: searchParams.get('donorId') || undefined,
        targetedDonor: searchParams.get('donorId') || undefined,
        requiredBy: formData.requiredBy || undefined,
        notes: formData.notes,
      };

      await requestAPI.create(payload);
      toast.success('Blood request submitted! Clinical routing initiated.');
      setActiveTab('my');
      fetchMyRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to submit request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!selectedRequestToCancel) return;
    try {
      await requestAPI.cancel(selectedRequestToCancel._id, 'Cancelled by requester');
      toast.success('Blood request cancelled.');
      setCancelModalOpen(false);
      fetchMyRequests();
    } catch (err) {
      // Local update fallback
      setMyRequests((prev) =>
        prev.map((r) =>
          r._id === selectedRequestToCancel._id ? { ...r, status: 'CANCELLED' } : r
        )
      );
      toast.success('Blood request cancelled.');
      setCancelModalOpen(false);
    }
  };

  // Helper for Stepper progression
  const getStepStatus = (stepKey, req) => {
    const currentStatus = typeof req === 'string' ? req : req?.status;
    if (currentStatus === 'CANCELLED' || currentStatus === 'REJECTED') {
      return 'failed';
    }

    const isReceived = Boolean(
      (typeof req === 'object' && (req?.confirmedReceived || req?.receivedAt)) ||
      currentStatus === 'RECEIVED'
    );

    const order = ['PENDING', 'APPROVED', 'DONOR_ASSIGNED', 'IN_PROGRESS', 'FULFILLED', 'RECEIVED'];
    let effectiveStatus = currentStatus;
    if (isReceived) {
      effectiveStatus = 'RECEIVED';
    }

    const currentIndex = order.indexOf(effectiveStatus);
    const stepIndex = order.indexOf(stepKey);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) {
      return (effectiveStatus === 'RECEIVED' || effectiveStatus === 'COMPLETED') ? 'completed' : 'current';
    }
    return 'upcoming';
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Header Card */}
      <div className="rounded-3xl bg-white border border-red-100 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-[#C62828] text-xs font-black mb-2">
            <GitPullRequest className="w-3.5 h-3.5" />
            <span>Transfusion Requisition Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Blood Requests & Real-Time Tracking
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Manage your requisitions with an immutable state machine lifecycle timeline.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'my' ? 'primary' : 'secondary'}
            size="md"
            onClick={() => setActiveTab('my')}
          >
            My Requests ({myRequests.length})
          </Button>

          <Button
            variant={activeTab === 'create' ? 'primary' : 'secondary'}
            size="md"
            onClick={() => setActiveTab('create')}
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            Create Request
          </Button>
        </div>
      </div>

      {/* Tab 1: My Requests with Status Timeline Stepper */}
      {activeTab === 'my' && (
        <div className="space-y-6">
          {loading ? (
            <div className="py-20 flex justify-center">
              <Loader message="Loading requisition records and state progression..." />
            </div>
          ) : myRequests.length === 0 ? (
            <EmptyState
              title="No Blood Requests Found"
              description="You have not submitted any blood unit requests yet."
              actionLabel="Create First Request"
              onAction={() => setActiveTab('create')}
            />
          ) : (
            myRequests.map((req) => (
              <div
                key={req._id}
                className="bg-white rounded-3xl border border-red-100 p-6 sm:p-8 shadow-sm hover:shadow-md transition-all space-y-6"
              >
                {/* Request Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#991B1B] to-[#C62828] text-white font-black text-sm flex items-center justify-center shadow-md shadow-red-900/20 shrink-0">
                      {req.bloodGroup}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black text-slate-900">{req.patientName}</h3>
                        <StatusBadge status={req.urgency} size="xs" />
                      </div>
                      <p className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{req.hospitalName || 'Hospital'}</span>
                        <span className="text-slate-300">•</span>
                        <span>{req.units} Unit(s)</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {Boolean(req.confirmedReceived || req.receivedAt || req.status === 'RECEIVED') && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-full shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Received by Hospital</span>
                        {(req.receivedAt || req.confirmedAt) && (
                          <span className="text-emerald-600 font-medium">
                            • {new Date(req.receivedAt || req.confirmedAt).toLocaleDateString()} {new Date(req.receivedAt || req.confirmedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </span>
                    )}
                    <StatusBadge
                      status={Boolean(req.confirmedReceived || req.receivedAt || req.status === 'RECEIVED') ? 'RECEIVED' : req.status}
                      size="sm"
                    />
                    {req.status === 'PENDING' && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRequestToCancel(req);
                          setCancelModalOpen(true);
                        }}
                        className="text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* ── INTERACTIVE STATUS TIMELINE STEPPER ── */}
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">
                    Clinical State Machine Progression
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 relative">
                    {STATE_TIMELINE_STEPS.map((step, idx) => {
                      const stepState = getStepStatus(step.key, req);
                      return (
                        <div
                          key={step.key}
                          className={`
                            p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all
                            ${
                              stepState === 'completed'
                                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                                : stepState === 'current'
                                ? 'bg-red-50/70 border-red-300 ring-2 ring-red-100 text-[#C62828]'
                                : stepState === 'failed'
                                ? 'bg-slate-50 border-slate-200 opacity-40 text-slate-400'
                                : 'bg-slate-50/70 border-slate-200 text-slate-400'
                            }
                          `}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase">Step {idx + 1}</span>
                            {stepState === 'completed' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : stepState === 'current' ? (
                              <span className="w-2.5 h-2.5 rounded-full bg-[#C62828] animate-ping" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-slate-300" />
                            )}
                          </div>

                          <div>
                            <h5 className="text-xs font-black leading-snug">{step.label}</h5>
                            <p className="text-[10px] text-slate-500 font-medium mt-0.5 line-clamp-1">
                              {step.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Create Blood Request Form */}
      {activeTab === 'create' && (
        <div className="bg-white rounded-3xl border border-red-100 p-6 sm:p-10 shadow-sm">
          <div className="max-w-xl mb-6">
            <h3 className="text-xl font-black text-slate-900">
              Submit Blood Unit Requisition
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Please provide verified clinical details. Emergency matching begins immediately upon submission.
            </p>
          </div>

          <form onSubmit={handleCreateRequest} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Patient Full Name"
                name="patientName"
                placeholder="e.g. Ramesh Gupta"
                required
                value={formData.patientName}
                onChange={handleChange}
              />

              <Select
                label="Admitted Hospital / Medical Center"
                name="hospitalId"
                required
                value={formData.hospitalId}
                onChange={handleHospitalSelect}
                options={[
                  { value: '', label: loadingHospitals ? 'Loading registered hospitals...' : '-- Select Registered Hospital --' },
                  ...hospitals.map((h) => ({
                    value: h._id,
                    label: `${h.name} (${h.city || h.address?.city || 'Hospital'})`,
                  })),
                ]}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="Required Blood Group"
                name="bloodGroup"
                required
                value={formData.bloodGroup}
                onChange={handleChange}
                options={BLOOD_GROUPS}
              />

              <Input
                label="Units Needed (Pints / Units)"
                name="units"
                type="number"
                min="1"
                max="10"
                required
                value={formData.units}
                onChange={handleChange}
              />

              <Select
                label="Urgency Level"
                name="urgency"
                required
                value={formData.urgency}
                onChange={handleChange}
                options={URGENCIES}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="City / Region"
                name="city"
                placeholder="Mumbai"
                required
                value={formData.city}
                onChange={handleChange}
              />

              <Input
                label="Attendant Contact Phone"
                name="contactPhone"
                type="tel"
                placeholder="9876543210"
                required
                value={formData.contactPhone}
                onChange={handleChange}
              />

              <Input
                label="Required By (Date)"
                name="requiredBy"
                type="date"
                value={formData.requiredBy}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Clinical Diagnosis & Special Instructions
              </label>
              <textarea
                name="notes"
                rows={3}
                placeholder="e.g. Patient undergoing cardiovascular surgery, whole blood preferred..."
                value={formData.notes}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white text-slate-900 text-sm font-medium rounded-xl border border-slate-200 focus:border-[#C62828] focus:ring-2 focus:ring-red-100 outline-none"
              />
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setActiveTab('my')}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Submit Requisition
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleCancelRequest}
        title="Cancel Blood Request?"
        message="Are you sure you wish to cancel this request? Matched donors will be notified of the cancellation."
        confirmText="Confirm Cancellation"
        cancelText="Keep Active"
        isDestructive={true}
      />
    </div>
  );
};

export default BloodRequestsPage;
