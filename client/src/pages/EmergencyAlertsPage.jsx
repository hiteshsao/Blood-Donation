import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Radio,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  Droplet,
  ArrowRight,
  PlusCircle,
  Sparkles,
  Phone,
  Copy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { emergencyAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  Button,
  Input,
  Select,
  StatusBadge,
  Loader,
  EmptyState,
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

export const EmergencyAlertsPage = () => {
  const { user } = useAuth();
  const { socket, on, off } = useSocket();

  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Requester / Hospital Panel State
  const [myEmergencies, setMyEmergencies] = useState([]);
  const [confirmingDonorId, setConfirmingDonorId] = useState(null);

  // New Emergency Request Form State
  const [newEmergency, setNewEmergency] = useState({
    patientName: '',
    bloodGroup: 'O-',
    units: 2,
    hospitalName: '',
    hospitalAddress: '',
    wardOrRoom: '',
    contactName: user?.name || '',
    contactNumber: user?.phone || user?.mobile || '',
    city: user?.city || '',
    notes: '',
  });

  useEffect(() => {
    if (user) {
      setNewEmergency((prev) => ({
        ...prev,
        city: prev.city || user.city || '',
        contactName: prev.contactName || user.name || '',
        contactNumber: prev.contactNumber || user.phone || user.mobile || '',
      }));
    }
  }, [user]);

  const fetchNearbyEmergencies = async () => {
    setLoading(true);
    try {
      const res = await emergencyAPI.getNearby();
      const data = res.data?.emergencies || res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setEmergencies(Array.isArray(data) ? data : []);
    } catch (err) {
      setEmergencies([]);
      const errMsg =
        err.response?.data?.message || err.message || 'Failed to fetch emergency broadcasts.';
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyEmergencies = async () => {
    try {
      const res = emergencyAPI.getMine
        ? await emergencyAPI.getMine()
        : await emergencyAPI.getMy();
      const data =
        res.data?.emergencies ||
        res.data?.data ||
        (Array.isArray(res.data) ? res.data : []);
      setMyEmergencies(Array.isArray(data) ? data : []);
    } catch {
      setMyEmergencies([]);
    }
  };

  useEffect(() => {
    fetchNearbyEmergencies();
    fetchMyEmergencies();
  }, []);

  // ── JOIN BLOOD GROUP ROOM FOR EMERGENCY BROADCASTS ──
  useEffect(() => {
    if (!socket || !user?.bloodGroup) return;
    socket.emit('join_group_room', user.bloodGroup);
  }, [socket, user?.bloodGroup]);

  // ── REAL-TIME SOCKET.IO EMERGENCY LISTENERS ──
  useEffect(() => {
    if (!socket) return;

    const handleEmergencyAlert = (data) => {
      if (!data) return;

      const alertPayload = {
        _id: data.emergencyId || data._id || data.id || `em-${Date.now()}`,
        patientName: data.patientName || 'Emergency Patient',
        bloodGroup: data.bloodGroup || '',
        units: data.units || data.unitsRequired || 1,
        unitsNeeded: data.units || data.unitsRequired || 1,
        hospitalName:
          data.hospitalName ||
          (typeof data.hospital === 'object' ? data.hospital?.name : data.hospital) ||
          '',
        city: data.city || user?.city || 'Raipur',
        distanceKm:
          data.distanceKm !== undefined && data.distanceKm !== null
            ? data.distanceKm
            : data.radiusKm !== undefined && data.radiusKm !== null
            ? data.radiusKm
            : null,
        notes: data.notes || data.message || '',
        urgency: data.urgency || 'CRITICAL',
        status: data.status || 'ACTIVE',
        createdAt: data.createdAt || new Date().toISOString(),
      };

      setEmergencies((prev) => {
        const exists = prev.some((e) => e._id === alertPayload._id);
        if (exists) {
          return prev.map((e) => (e._id === alertPayload._id ? { ...e, ...alertPayload } : e));
        }
        return [alertPayload, ...prev];
      });
    };

    // Clean up when an emergency is fulfilled or enough donors assigned
    const handleEmergencyClosed = (data) => {
      const emId = data?.emergencyId || data?._id;
      if (!emId) return;

      setEmergencies((prev) =>
        prev
          .filter((e) => {
            if (e._id === emId) {
              // If this donor accepted or donated, keep visible with updated status
              if (e.donorResponse === 'ACCEPTED' || e.donorResponse === 'DONATED') {
                return true;
              }
              // Otherwise remove from other donors' screens!
              return false;
            }
            return true;
          })
          .map((e) => {
            if (e._id === emId) {
              return {
                ...e,
                status:
                  data.status ||
                  (data.donatedCount >= (data.units || e.units)
                    ? 'FULFILLED'
                    : 'DONORS_ASSIGNED'),
              };
            }
            return e;
          })
      );

      fetchMyEmergencies();
    };

    const handleDonationConfirmed = (data) => {
      const emId = data?.emergencyId;
      if (emId) {
        setEmergencies((prev) =>
          prev.map((e) =>
            e._id === emId
              ? {
                  ...e,
                  donorResponse: 'DONATED',
                  status: 'FULFILLED',
                  nextEligibleDate: data?.nextEligibleDate,
                }
              : e
          )
        );
      }
      fetchMyEmergencies();
    };

    const handleDonorAccepted = () => {
      fetchMyEmergencies();
      fetchNearbyEmergencies();
    };

    const handleEmergencyFulfilled = (data) => {
      handleEmergencyClosed(data);
      fetchMyEmergencies();
    };

    on('emergency_alert', handleEmergencyAlert);
    on('emergency:alert', handleEmergencyAlert);
    on('emergency:broadcast', handleEmergencyAlert);
    on('emergency_fulfilled', handleEmergencyFulfilled);
    on('emergency_donors_assigned', handleEmergencyClosed);
    on('donation_confirmed', handleDonationConfirmed);
    on('donor_accepted', handleDonorAccepted);
    on('donor_donated', handleDonorAccepted);
    on('donor_cancelled', handleDonorAccepted);
    on('emergency_reopened', handleDonorAccepted);

    return () => {
      off('emergency_alert', handleEmergencyAlert);
      off('emergency:alert', handleEmergencyAlert);
      off('emergency:broadcast', handleEmergencyAlert);
      off('emergency_fulfilled', handleEmergencyFulfilled);
      off('emergency_donors_assigned', handleEmergencyClosed);
      off('donation_confirmed', handleDonationConfirmed);
      off('donor_accepted', handleDonorAccepted);
      off('donor_donated', handleDonorAccepted);
      off('donor_cancelled', handleDonorAccepted);
      off('emergency_reopened', handleDonorAccepted);
    };
  }, [socket, on, off, user?.city]);

  const handleRespond = async (emergencyId, responseType) => {
    setActionLoadingId(emergencyId);
    try {
      const res = await emergencyAPI.respond(emergencyId, responseType);
      if (responseType === 'ACCEPTED') {
        toast.success(
          'Thank you! You have accepted this emergency. The hospital has been notified.'
        );
        const emData = res.data?.emergency || res.data || {};
        setEmergencies((prev) =>
          prev.map((e) =>
            e._id === emergencyId
              ? {
                  ...e,
                  donorResponse: 'ACCEPTED',
                  status: emData.status || e.status || 'ACTIVE',
                  hospitalName: emData.hospitalName || e.hospitalName,
                  hospitalAddress: emData.hospitalAddress || e.hospitalAddress,
                  wardOrRoom: emData.wardOrRoom || e.wardOrRoom,
                  contactName: emData.contactName || e.contactName,
                  contactNumber: emData.contactNumber || e.contactNumber,
                  patientName: emData.patientName || e.patientName,
                }
              : e
          )
        );
      } else {
        toast('Acceptance cancelled / emergency dismissed.', { icon: 'ℹ️' });
        setEmergencies((prev) => prev.filter((e) => e._id !== emergencyId));
      }
    } catch (err) {
      const errMsg =
        err.response?.data?.message || err.message || 'Failed to submit emergency response.';
      toast.error(errMsg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmDonation = async (emergencyId, donor, patientName) => {
    const donorId = donor?.donorId || donor?.userId || donor?._id;
    const donorName = donor?.name || 'this donor';

    if (!window.confirm(`Confirm that ${donorName} has donated blood for ${patientName}?`)) {
      return;
    }

    const key = `${emergencyId}-${donorId}`;
    setConfirmingDonorId(key);
    try {
      const res = await emergencyAPI.confirmDonated(emergencyId, donorId);
      toast.success(res.data?.message || 'Donation confirmed! Records updated.');
      await fetchMyEmergencies();
      await fetchNearbyEmergencies();
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to confirm donation.';
      toast.error(errMsg);
    } finally {
      setConfirmingDonorId(null);
    }
  };

  const handleCreateEmergency = async (e) => {
    e.preventDefault();
    if (!newEmergency.patientName.trim()) {
      toast.error('Patient Name is required.');
      return;
    }
    if (!newEmergency.hospitalName.trim()) {
      toast.error('Hospital Name is required.');
      return;
    }
    if (!newEmergency.hospitalAddress.trim()) {
      toast.error('Hospital Full Address is required.');
      return;
    }
    if (!newEmergency.contactName.trim()) {
      toast.error('Contact Person Name is required.');
      return;
    }
    const cleanPhone = (newEmergency.contactNumber || '').trim();
    if (!cleanPhone || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      toast.error('Contact number must be a valid 10-digit Indian mobile number (e.g. 9876543210).');
      return;
    }

    setIsSubmitting(true);
    try {
      await emergencyAPI.create({
        patientName: newEmergency.patientName.trim(),
        bloodGroup: newEmergency.bloodGroup,
        units: Number(newEmergency.units) || 1,
        hospitalName: newEmergency.hospitalName.trim(),
        hospitalAddress: newEmergency.hospitalAddress.trim(),
        wardOrRoom: newEmergency.wardOrRoom.trim(),
        contactName: newEmergency.contactName.trim(),
        contactNumber: cleanPhone,
        city: newEmergency.city.trim(),
        notes: newEmergency.notes.trim(),
      });

      toast.success('🚨 Emergency broadcast dispatched to compatible donors in your radius!', {
        duration: 6000,
      });
      setCreateModalOpen(false);
      setNewEmergency({
        patientName: '',
        bloodGroup: 'O-',
        units: 2,
        hospitalName: '',
        hospitalAddress: '',
        wardOrRoom: '',
        contactName: user?.name || '',
        contactNumber: user?.phone || user?.mobile || '',
        city: user?.city || '',
        notes: '',
      });
      fetchNearbyEmergencies();
      fetchMyEmergencies();
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      const firstErrorMessage =
        Array.isArray(serverErrors) && serverErrors.length > 0
          ? serverErrors[0]?.message || serverErrors[0]?.msg
          : null;

      toast.error(
        firstErrorMessage ||
          err.response?.data?.message ||
          err.message ||
          'Failed to dispatch broadcast.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#991B1B] via-[#C62828] to-rose-700 text-white p-6 sm:p-8 shadow-xl shadow-red-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-black uppercase tracking-wider backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>24/7 Red Alert Incident Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Live Emergency Blood Transfusion Broadcasts
          </h1>
          <p className="text-xs sm:text-sm text-red-100 font-medium leading-relaxed">
            Real-time critical requests matched with your registered blood group in {user?.city || 'Raipur'}.
            Accepting commits your availability to the trauma team.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="secondary"
            size="md"
            onClick={() => setCreateModalOpen(true)}
            className="bg-white text-red-700 hover:bg-red-50 border-none font-black shadow-md"
            leftIcon={<Radio className="w-4 h-4" />}
          >
            Create Emergency SOS
          </Button>
        </div>
      </div>

      {/* ── Requester / Hospital Live Emergency Coordination Panel ── */}
      {myEmergencies.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Radio className="w-5 h-5 text-red-600 animate-pulse" />
              <span>Your Dispatched Emergency Requests ({myEmergencies.length})</span>
            </h3>
            <span className="text-xs font-bold text-slate-400">Live Requester Tracker</span>
          </div>

          <div className="space-y-4">
            {myEmergencies.map((myEm) => (
              <div
                key={myEm.emergencyId || myEm._id}
                className="bg-white rounded-3xl border-2 border-slate-200 p-6 sm:p-7 shadow-md space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-[#C62828] text-white font-black text-xl flex items-center justify-center shadow-lg shadow-red-900/20 shrink-0">
                      {myEm.bloodGroup}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-black text-slate-900">{myEm.patientName}</h4>
                        <StatusBadge status={myEm.status} size="xs" />
                      </div>
                      <p className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{myEm.hospitalName || 'Hospital'}</span>
                        {myEm.city && <span>• {myEm.city}</span>}
                        <span className="text-slate-300">•</span>
                        <span className="text-[#C62828] font-bold">
                          {myEm.unitsNeeded || myEm.units} Unit(s) Needed
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-800 self-start sm:self-auto">
                    {myEm.donatedCount || 0} / {myEm.unitsNeeded || myEm.units} units confirmed donated
                  </div>
                </div>

                {/* Accepted Donors List */}
                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <h5 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Accepted Voluntary Donors ({myEm.acceptedDonors?.length || 0})
                  </h5>

                  {!myEm.acceptedDonors || myEm.acceptedDonors.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-1">
                      Waiting for compatible voluntary donors to accept this broadcast...
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {myEm.acceptedDonors.map((donor) => {
                        const isDonated = donor.status === 'DONATED' || donor.state === 'DONATED';
                        const donorId = donor.donorId || donor.userId || donor._id;
                        const key = `${myEm.emergencyId || myEm._id}-${donorId}`;

                        return (
                          <div
                            key={donorId}
                            className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3"
                          >
                            <div className="space-y-0.5">
                              <p className="text-xs font-black text-slate-900">{donor.name}</p>
                              <p className="text-[11px] font-bold text-red-600">
                                Blood Group: {donor.bloodGroup}
                              </p>
                              <p className="text-[10px] font-bold text-slate-500">
                                State: <span className={isDonated ? 'text-emerald-700 font-extrabold' : 'text-amber-700 font-extrabold'}>{isDonated ? 'Donated' : 'Accepted'}</span>
                              </p>
                              {donor.phone && (
                                <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 mt-0.5 font-mono">
                                  <Phone className="w-3 h-3 text-emerald-600" />
                                  <span>{donor.phone}</span>
                                </p>
                              )}
                              {donor.city && (
                                <p className="text-[10px] text-slate-500">{donor.city}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {donor.phone && !donor.phone.includes('*') && (
                                <a
                                  href={`tel:${donor.phone}`}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition-colors"
                                >
                                  <Phone className="w-3 h-3" />
                                  <span>Call</span>
                                </a>
                              )}

                              {isDonated ? (
                                <Button
                                  variant="outline"
                                  size="xs"
                                  disabled
                                  className="opacity-75 cursor-not-allowed text-emerald-800 bg-emerald-50 border-emerald-300 font-bold text-xs"
                                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                                >
                                  Donated
                                </Button>
                              ) : (
                                <Button
                                  variant="sos"
                                  size="xs"
                                  onClick={() =>
                                    handleConfirmDonation(myEm.emergencyId || myEm._id, donor, myEm.patientName)
                                  }
                                  isLoading={confirmingDonorId === key}
                                  disabled={confirmingDonorId !== null}
                                  className="shadow-sm font-bold text-xs"
                                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                                >
                                  Mark Donated
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emergency Cards List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600 animate-pulse" />
            <span>Active Critical Incidents ({emergencies.length})</span>
          </h3>
          <span className="text-xs font-bold text-slate-400">Real-time Socket.io active</span>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader message="Querying real-time emergency broadcasts..." />
          </div>
        ) : emergencies.length === 0 ? (
          <EmptyState
            title="No active emergencies near you"
            description="There are currently no urgent trauma alerts requiring immediate blood units."
            actionLabel="Refresh Live Alerts"
            onAction={fetchNearbyEmergencies}
          />
        ) : (
          emergencies.map((em) => {
            const isAcceptedOrDonated =
              em.donorResponse === 'ACCEPTED' || em.donorResponse === 'DONATED';

            if (isAcceptedOrDonated) {
              const mapsQuery = [em.hospitalAddress, em.hospitalName, em.city].filter(Boolean).join(', ');
              const fullAddressText = [em.hospitalName, em.wardOrRoom, em.hospitalAddress, em.city].filter(Boolean).join(', ');

              return (
                <div
                  key={em._id}
                  className="bg-white rounded-3xl border-2 border-emerald-300 p-6 sm:p-8 shadow-md hover:shadow-lg transition-all space-y-4 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500" />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-emerald-900/30 shrink-0">
                        {em.bloodGroup}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-black text-slate-900">{em.patientName}</h4>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs uppercase tracking-wide">
                            Accepted
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{em.hospitalName || 'Hospital'}</span>
                          {em.city && <span>• {em.city}</span>}
                          <span className="text-slate-300">•</span>
                          <span className="text-emerald-700 font-bold">{em.units} Unit(s)</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(em.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  {/* Where to Go Block */}
                  {em.hospitalAddress || em.contactNumber || em.contactName ? (
                    <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-xs space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
                        <span className="text-emerald-900 font-black uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Where to Go</span>
                        </span>
                        {em.wardOrRoom && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 font-extrabold text-[11px]">
                            {em.wardOrRoom}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <p className="text-slate-900 font-black text-sm">
                          {em.hospitalName || 'Hospital'}
                        </p>
                        {em.hospitalAddress && (
                          <p className="text-slate-700 font-medium leading-relaxed">
                            {em.hospitalAddress}
                            {em.city && `, ${em.city}`}
                          </p>
                        )}
                      </div>

                      {/* Whom to Meet */}
                      {(em.contactName || em.contactNumber) && (
                        <div className="pt-2 border-t border-emerald-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="text-slate-800">
                            <span className="text-emerald-800 font-bold">Meet: </span>
                            <span className="font-black text-slate-900">
                              {em.contactName || 'Hospital Desk Coordinator'}
                            </span>
                            {em.contactNumber && (
                              <span className="text-slate-600 font-bold ml-1.5 font-mono">
                                ({em.contactNumber})
                              </span>
                            )}
                          </div>

                          {em.contactNumber && (
                            <a
                              href={`tel:${em.contactNumber}`}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm transition-all self-start sm:self-auto"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>Call</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-slate-600 text-xs italic font-semibold">
                      Hospital details not provided, please wait for the requester to contact you
                    </div>
                  )}

                  {/* Instruction */}
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-semibold flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      Please go to the hospital and meet the requester. Carry a photo ID.
                    </p>
                  </div>

                  {/* Status Indicator */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold">
                    {em.donorResponse === 'DONATED' || em.status === 'FULFILLED' ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-emerald-800">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Donation confirmed, thank you</span>
                        </div>
                        {em.nextEligibleDate && (
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-lg">
                            Next eligible: {new Date(em.nextEligibleDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-700">
                        <Clock className="w-4 h-4 text-amber-500 animate-spin" />
                        <span>Waiting for the requester to confirm your donation</span>
                      </div>
                    )}
                  </div>

                  {/* Action footer */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          mapsQuery || em.hospitalName
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Open in Maps</span>
                      </a>

                      {(em.hospitalAddress || em.hospitalName) && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!fullAddressText) return;
                            navigator.clipboard.writeText(fullAddressText);
                            toast.success('Hospital destination copied to clipboard!');
                          }}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Copy address</span>
                        </button>
                      )}
                    </div>

                    {em.donorResponse === 'ACCEPTED' && em.status !== 'FULFILLED' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRespond(em._id, 'REJECTED')}
                        disabled={actionLoadingId === em._id}
                        className="text-xs text-red-600 hover:bg-red-50 hover:text-red-700 font-bold"
                      >
                        Cancel my acceptance
                      </Button>
                    )}
                  </div>
                </div>
              );
            }

            // Uncommitted / Pending emergency card
            return (
              <div
                key={em._id}
                className="bg-white rounded-3xl border-2 border-red-200 p-6 sm:p-8 shadow-md hover:shadow-lg transition-all space-y-5 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-2 h-full bg-[#C62828]" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-[#C62828] text-white font-black text-xl flex items-center justify-center shadow-lg shadow-red-900/30 shrink-0">
                      {em.bloodGroup}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-black text-slate-900">{em.patientName}</h4>
                        <StatusBadge status={em.urgency || "CRITICAL"} size="xs" />
                      </div>
                      <p className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{em.hospitalName || 'Hospital'}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[#C62828] font-bold">{em.units} Unit(s) Needed</span>
                        {em.distanceKm !== null && em.distanceKm !== undefined && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="font-bold text-slate-600">({em.distanceKm} km away)</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(em.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {em.notes && (
                  <div className="p-3.5 rounded-2xl bg-red-50/50 border border-red-100 text-xs text-red-900 font-medium">
                    <strong>Trauma Note:</strong> {em.notes}
                  </div>
                )}

                <div className="pt-2 flex flex-col gap-2.5 border-t border-slate-100">
                  <p className="text-[11px] text-slate-500 font-medium">
                    If you accept, your name and phone number will be shared with the requester of this emergency.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                      {em.city && (
                        <>
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{em.city}</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRespond(em._id, 'REJECTED')}
                        disabled={actionLoadingId === em._id}
                        className="flex-1 sm:flex-none text-slate-500 hover:text-slate-800"
                      >
                        Decline
                      </Button>

                      <Button
                        variant="sos"
                        size="sm"
                        onClick={() => handleRespond(em._id, 'ACCEPTED')}
                        isLoading={actionLoadingId === em._id}
                        className="flex-1 sm:flex-none shadow-md"
                        leftIcon={<CheckCircle2 className="w-4 h-4" />}
                      >
                        Accept & Commit To Donate
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Emergency Request Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        size="lg"
        title="Dispatch Emergency Blood Alert (SOS)"
        subtitle="Broadcast to all compatible donors within a 15km clinical radius"
      >
        <form onSubmit={handleCreateEmergency} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Patient Name"
              placeholder="e.g. Master Aarav"
              required
              value={newEmergency.patientName}
              onChange={(e) => setNewEmergency({ ...newEmergency, patientName: e.target.value })}
            />

            <Input
              label="Hospital Name"
              placeholder="e.g. Apollo Hospital"
              required
              value={newEmergency.hospitalName}
              onChange={(e) => setNewEmergency({ ...newEmergency, hospitalName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Hospital Full Address"
              placeholder="e.g. Sector 12, Main Ring Road, Landmark near City Square"
              required
              value={newEmergency.hospitalAddress}
              onChange={(e) => setNewEmergency({ ...newEmergency, hospitalAddress: e.target.value })}
            />

            <Input
              label="Ward / Room (Optional)"
              placeholder="e.g. 3rd Floor ICU, Bed 12"
              value={newEmergency.wardOrRoom}
              onChange={(e) => setNewEmergency({ ...newEmergency, wardOrRoom: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact Person Name"
              placeholder="e.g. Dr. Rajesh Sharma / Relative"
              required
              value={newEmergency.contactName}
              onChange={(e) => setNewEmergency({ ...newEmergency, contactName: e.target.value })}
            />

            <Input
              label="Contact Mobile Number"
              placeholder="10-digit Indian mobile (e.g. 9876543210)"
              required
              value={newEmergency.contactNumber}
              onChange={(e) => setNewEmergency({ ...newEmergency, contactNumber: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Blood Group Required"
              value={newEmergency.bloodGroup}
              onChange={(e) => setNewEmergency({ ...newEmergency, bloodGroup: e.target.value })}
              options={BLOOD_GROUPS}
            />

            <Input
              label="Units Needed"
              type="number"
              min="1"
              max="10"
              value={newEmergency.units}
              onChange={(e) => setNewEmergency({ ...newEmergency, units: e.target.value })}
            />

            <Input
              label="City"
              placeholder="e.g. Raipur"
              value={newEmergency.city}
              onChange={(e) => setNewEmergency({ ...newEmergency, city: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Urgent Clinical Instructions
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Emergency surgery in Progress, direct cross-matching on arrival..."
              value={newEmergency.notes}
              onChange={(e) => setNewEmergency({ ...newEmergency, notes: e.target.value })}
              className="w-full px-4 py-2.5 bg-white text-slate-900 text-sm font-medium rounded-xl border border-slate-200 focus:border-[#C62828] focus:ring-2 focus:ring-red-100 outline-none"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button variant="ghost" size="md" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="sos"
              size="md"
              isLoading={isSubmitting}
              leftIcon={<Radio className="w-4 h-4" />}
            >
              Broadcast Emergency SOS
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EmergencyAlertsPage;
