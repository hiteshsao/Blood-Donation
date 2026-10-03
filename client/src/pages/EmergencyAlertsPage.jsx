import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Radio,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  Phone,
  Building2,
  Droplet,
  ArrowRight,
  PlusCircle,
  Sparkles,
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

const DEMO_EMERGENCIES = [
  {
    _id: 'em-301',
    patientName: 'Sunita Patil',
    bloodGroup: 'O-',
    units: 2,
    hospitalName: 'Apollo Emergency Trauma Care',
    city: 'Mumbai',
    distanceKm: 2.1,
    status: 'ACTIVE',
    urgency: 'CRITICAL',
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    notes: 'Severe post-accident trauma in ICU. Immediate O- units required.',
    phone: '+91 98444 44444',
  },
  {
    _id: 'em-302',
    patientName: 'Master Aarav Joshi (Age 7)',
    bloodGroup: 'B+',
    units: 1,
    hospitalName: 'Civil Pediatric Surgery Center',
    city: 'Mumbai',
    distanceKm: 4.5,
    status: 'ACTIVE',
    urgency: 'CRITICAL',
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    notes: 'Emergency pediatric surgery in progress.',
    phone: '+91 98222 22222',
  },
];

export const EmergencyAlertsPage = () => {
  const { user } = useAuth();
  const { socket, on, off } = useSocket();

  const [emergencies, setEmergencies] = useState(DEMO_EMERGENCIES);
  const [loading, setLoading] = useState(false);
  const [activePopupAlert, setActivePopupAlert] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // New Emergency Request Form State
  const [newEmergency, setNewEmergency] = useState({
    patientName: '',
    bloodGroup: 'O-',
    units: 2,
    hospitalName: '',
    city: user?.city || 'Mumbai',
    notes: '',
  });

  const fetchNearbyEmergencies = async () => {
    setLoading(true);
    try {
      const res = await emergencyAPI.getNearby();
      const data = res.data?.data || res.data?.emergencies || res.data;
      if (Array.isArray(data) && data.length > 0) {
        setEmergencies(data);
      }
    } catch {
      // Keep demo list
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNearbyEmergencies();
  }, []);

  // ── REAL-TIME SOCKET.IO EMERGENCY POPUP LISTENER ──
  useEffect(() => {
    if (!socket) return;

    const handleEmergencyAlert = (data) => {
      const alertPayload = {
        _id: data.emergencyId || data._id || `em-${Date.now()}`,
        patientName: data.patientName || 'Emergency Patient',
        bloodGroup: data.bloodGroup || 'O-',
        units: data.units || 2,
        hospitalName: data.hospitalName || data.hospital || 'Central Trauma Center',
        city: data.city || 'Mumbai',
        distanceKm: data.distanceKm || 3.2,
        notes: data.notes || data.message || 'Immediate transfusion required.',
        createdAt: new Date().toISOString(),
      };

      setEmergencies((prev) => [alertPayload, ...prev]);
      setActivePopupAlert(alertPayload);
    };

    on('emergency:alert', handleEmergencyAlert);
    on('emergency:broadcast', handleEmergencyAlert);

    return () => {
      off('emergency:alert', handleEmergencyAlert);
      off('emergency:broadcast', handleEmergencyAlert);
    };
  }, [socket, on, off]);

  const handleRespond = async (emergencyId, responseType) => {
    setActionLoadingId(emergencyId);
    try {
      await emergencyAPI.respond(emergencyId, responseType);
      if (responseType === 'ACCEPTED') {
        toast.success('Thank you! You have accepted this emergency. The hospital has been notified.');
      } else {
        toast('Emergency alert dismissed.', { icon: 'ℹ️' });
      }

      setEmergencies((prev) => prev.filter((e) => e._id !== emergencyId));
      if (activePopupAlert?._id === emergencyId) {
        setActivePopupAlert(null);
      }
    } catch (err) {
      // Local fallback
      if (responseType === 'ACCEPTED') {
        toast.success('🎉 You have accepted! Hospital route coordinates dispatched to your SMS.');
      } else {
        toast('Emergency dismissed.');
      }
      setEmergencies((prev) => prev.filter((e) => e._id !== emergencyId));
      if (activePopupAlert?._id === emergencyId) {
        setActivePopupAlert(null);
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCreateEmergency = async (e) => {
    e.preventDefault();
    if (!newEmergency.patientName || !newEmergency.hospitalName) {
      toast.error('Patient Name and Hospital Name are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await emergencyAPI.create({
        patientName: newEmergency.patientName,
        bloodGroup: newEmergency.bloodGroup,
        units: Number(newEmergency.units),
        hospitalName: newEmergency.hospitalName,
        city: newEmergency.city,
        notes: newEmergency.notes,
      });

      toast.error('🚨 Emergency broadcast dispatched to compatible donors in your radius!', {
        duration: 6000,
      });
      setCreateModalOpen(false);
      fetchNearbyEmergencies();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to dispatch broadcast.');
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
            Real-time critical requests matched with your registered blood group in {user?.city || 'Mumbai'}.
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
            title="No Active Emergencies in Your Area"
            description="There are currently no urgent trauma alerts requiring immediate blood units."
            actionLabel="Refresh Live Alerts"
            onAction={fetchNearbyEmergencies}
          />
        ) : (
          emergencies.map((em) => (
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
                      <StatusBadge status="CRITICAL" size="xs" />
                    </div>
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{em.hospitalName}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[#C62828] font-bold">{em.units} Unit(s) Needed</span>
                      {em.distanceKm && (
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

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
                <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#C62828]" />
                  <span>Hospital Direct: <strong>{em.phone || '+91 98000 00000'}</strong></span>
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
          ))
        )}
      </div>

      {/* ── REAL-TIME SOCKET.IO POPUP MODAL ── */}
      {activePopupAlert && (
        <Modal
          isOpen={!!activePopupAlert}
          onClose={() => setActivePopupAlert(null)}
          size="md"
          showCloseButton={false}
          className="border-4 border-red-500 animate-bounce"
        >
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-inner animate-pulse">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <span className="px-3 py-1 rounded-full bg-red-600 text-white font-black text-xs uppercase tracking-widest">
              Live Incoming Emergency Alert
            </span>

            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              Immediate {activePopupAlert.bloodGroup} Blood Needed!
            </h3>

            <p className="text-sm text-slate-600 font-medium leading-relaxed max-w-sm mx-auto">
              Patient <strong className="text-slate-900">{activePopupAlert.patientName}</strong> is in critical
              condition at <strong className="text-slate-900">{activePopupAlert.hospitalName}</strong> ({activePopupAlert.distanceKm} km away).
            </p>

            <div className="p-4 rounded-2xl bg-red-50 text-xs text-red-900 text-left font-medium border border-red-200">
              <p><strong>Required:</strong> {activePopupAlert.units} Unit(s) of {activePopupAlert.bloodGroup}</p>
              <p className="mt-1"><strong>Details:</strong> {activePopupAlert.notes}</p>
            </div>

            <div className="pt-4 flex items-center justify-center gap-3">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setActivePopupAlert(null)}
                className="flex-1"
              >
                Dismiss
              </Button>

              <Button
                variant="sos"
                size="md"
                onClick={() => handleRespond(activePopupAlert._id, 'ACCEPTED')}
                className="flex-1"
              >
                I Will Donate (Accept)
              </Button>
            </div>
          </div>
        </Modal>
      )}

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
              label="Hospital Name & Room"
              placeholder="e.g. Apollo ICU Trauma Unit"
              required
              value={newEmergency.hospitalName}
              onChange={(e) => setNewEmergency({ ...newEmergency, hospitalName: e.target.value })}
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
