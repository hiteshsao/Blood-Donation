import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Radio,
  Clock,
  MapPin,
  Phone,
  Building2,
  Users,
  CheckCircle2,
  AlertTriangle,
  Send,
  Sparkles,
  RefreshCw,
  PlusCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { emergencyAPI } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { StatusBadge, Button, Modal, Input, Select } from '../../components/common';

const DEMO_LIVE_EMERGENCIES = [
  {
    _id: 'emg-live-01',
    patientName: 'Sunita Patil (Severe Trauma)',
    bloodGroup: 'O-',
    units: 3,
    urgency: 'CRITICAL',
    hospitalName: 'Apollo City Hospital (Emergency Trauma OT)',
    city: 'Mumbai',
    contactPhone: '+91 98444 44444',
    status: 'ACTIVE',
    respondersCount: 2,
    responders: [
      { name: 'Aakash Verma', etaMinutes: 12, phone: '+91 98765 43210' },
      { name: 'Vikram Malhotra', etaMinutes: 18, phone: '+91 98765 43214' },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    notes: 'Massive acute hemorrhage from road accident. Immediate O- units required.',
  },
  {
    _id: 'emg-live-02',
    patientName: 'Master Aarav Joshi (Age 7)',
    bloodGroup: 'B+',
    units: 1,
    urgency: 'CRITICAL',
    hospitalName: 'Civil Pediatric Surgery Center',
    city: 'Mumbai',
    contactPhone: '+91 98222 22222',
    status: 'ACTIVE',
    respondersCount: 1,
    responders: [{ name: 'Karan Mehra', etaMinutes: 25, phone: '+91 98765 43215' }],
    createdAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    notes: 'Pediatric urgent surgery in progress.',
  },
];

export const AdminEmergencyPage = () => {
  const { socket, on, off } = useSocket();
  const [emergencies, setEmergencies] = useState(DEMO_LIVE_EMERGENCIES);
  const [loading, setLoading] = useState(false);
  const [socketConnected, setSocketConnected] = useState(true);

  // Coordinate / Dispatch Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [targetBank, setTargetBank] = useState('RedCross Regional Blood Center');
  const [isDispatching, setIsDispatching] = useState(false);

  // Real-time Socket.io listener
  useEffect(() => {
    const handleEmergencyAlert = (data) => {
      toast.error(`🚨 REAL-TIME TRAUMA ALERT: ${data.patientName || 'Emergency Patient'} requires ${data.bloodGroup || 'Blood'}!`, {
        duration: 7000,
      });
      setEmergencies((prev) => [data, ...prev]);
    };

    const handleEmergencyResponse = (data) => {
      toast.success(`Donor Accepted Emergency: ${data.donorName || 'A voluntary donor'} is en route!`);
      setEmergencies((prev) =>
        prev.map((e) =>
          e._id === data.emergencyId
            ? {
                ...e,
                respondersCount: (e.respondersCount || 0) + 1,
                responders: [
                  ...(e.responders || []),
                  { name: data.donorName || 'Voluntary Donor', etaMinutes: data.etaMinutes || 15 },
                ],
              }
            : e
        )
      );
    };

    on('emergency:alert', handleEmergencyAlert);
    on('emergency:response', handleEmergencyResponse);

    return () => {
      off('emergency:alert', handleEmergencyAlert);
      off('emergency:response', handleEmergencyResponse);
    };
  }, [on, off]);

  // Fetch Emergencies
  const fetchEmergencies = async () => {
    setLoading(true);
    try {
      const res = await emergencyAPI.getNearby();
      const data = res.data?.data || res.data?.emergencies || res.data;
      if (Array.isArray(data) && data.length > 0) {
        setEmergencies(data);
      }
    } catch {
      // Retain fallback data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmergencies();
  }, []);

  const handleOpenAssignModal = (emg) => {
    setSelectedEmergency(emg);
    setAssignModalOpen(true);
  };

  const handleConfirmDispatch = (e) => {
    e.preventDefault();
    if (!selectedEmergency) return;

    setIsDispatching(true);
    setTimeout(() => {
      setIsDispatching(false);
      toast.success(
        `Emergency transport dispatched from ${targetBank} to ${selectedEmergency.hospitalName}!`
      );
      setAssignModalOpen(false);
    }, 600);
  };

  const handleSimulateNewEmergency = () => {
    const simulated = {
      _id: `emg-live-${Date.now()}`,
      patientName: 'Devendra Nair (Cardiac OT)',
      bloodGroup: 'AB-',
      units: 2,
      urgency: 'CRITICAL',
      hospitalName: 'Lilavati Trauma Complex',
      city: 'Mumbai',
      contactPhone: '+91 98555 12345',
      status: 'ACTIVE',
      respondersCount: 0,
      responders: [],
      createdAt: new Date().toISOString(),
      notes: 'Cardiopulmonary bypass cross-match requirement.',
    };

    setEmergencies([simulated, ...emergencies]);
    toast.error('Simulated Real-Time Emergency Broadcast added to live monitor!');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-[#1E293B] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="text-xs font-black text-red-400 uppercase tracking-widest">
              Live Socket.io Telemetry
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
              Channel: emergency:alert (Active)
            </span>
          </div>

          <h1 className="text-2xl font-black text-white tracking-tight">
            National Emergency Dispatch Monitor
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Real-time trauma intake feed, responder coordinate routing, and emergency courier dispatch.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSimulateNewEmergency}
            className="border-red-900/60 text-red-300 hover:bg-red-950/40"
            leftIcon={<Sparkles className="w-4 h-4 text-red-400" />}
          >
            Simulate Alert
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={fetchEmergencies}
            leftIcon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Emergency Grid */}
      <div className="space-y-4">
        {emergencies.map((emg) => (
          <div
            key={emg._id}
            className="bg-[#1E293B] rounded-3xl p-6 border border-red-900/40 shadow-lg relative overflow-hidden space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-[#C62828] text-white font-black text-lg flex items-center justify-center shrink-0 shadow-lg shadow-red-950/50 animate-pulse">
                  {emg.bloodGroup}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-black text-white">{emg.patientName}</h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800 text-[10px] font-black uppercase animate-pulse">
                      Critical SOS
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium mt-0.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    {emg.hospitalName} • {emg.city}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleOpenAssignModal(emg)}
                  leftIcon={<Send className="w-4 h-4" />}
                >
                  Coordinate Emergency Transport
                </Button>
              </div>
            </div>

            {/* Emergency Info Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
              <div>
                <span className="text-slate-400 block font-medium">Requisition Volume</span>
                <strong className="text-white text-sm">{emg.units} Units Required</strong>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Direct Hotline</span>
                <span className="text-slate-200 font-bold flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3 text-[#C62828]" />
                  {emg.contactPhone || '108 / Emergency'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Elapsed Time</span>
                <span className="text-amber-400 font-bold flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" />
                  Broadcasted {new Date(emg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            {/* Responders En-Route */}
            <div className="space-y-2">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
                Active Responders En Route ({emg.respondersCount || 0} Matched)
              </span>

              {emg.responders && emg.responders.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {emg.responders.map((resp, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-400" />
                        <div>
                          <p className="font-bold text-white">{resp.name}</p>
                          <p className="text-[10px] text-slate-400">{resp.phone || 'Direct line'}</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-black text-[10px]">
                        ETA: ~{resp.etaMinutes || 15} Mins
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-400 italic">
                  Awaiting donor check-in or blood bank driver confirmation.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Coordinate Dispatch Modal */}
      {assignModalOpen && selectedEmergency && (
        <Modal
          isOpen={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          title={`Emergency Transport Dispatch: ${selectedEmergency.patientName}`}
        >
          <form onSubmit={handleConfirmDispatch} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-red-950/60 border border-red-800/80 text-white flex items-center justify-between">
              <div>
                <p className="text-xs text-red-200">Destination Hospital</p>
                <strong className="text-sm font-bold">{selectedEmergency.hospitalName}</strong>
              </div>
              <span className="text-xs font-black bg-red-600 px-2.5 py-1 rounded-lg">
                {selectedEmergency.bloodGroup} ({selectedEmergency.units} Units)
              </span>
            </div>

            <Select
              label="Source Blood Bank Facility"
              options={[
                { value: 'RedCross Regional Blood Center', label: 'RedCross Regional Blood Center (Available: 3 Units O-)' },
                { value: 'Civil Hospital Transfusion Unit', label: 'Civil Hospital Transfusion Unit (Available: 4 Units O-)' },
                { value: 'Apollo Central Depot', label: 'Apollo Central Depot (Available: 2 Units O-)' },
              ]}
              value={targetBank}
              onChange={(e) => setTargetBank(e.target.value)}
            />

            <Input
              label="Transport Courier / Police Green Corridor Escort"
              placeholder="e.g. Priority Emergency Van #04 / Traffic Green Wave Active"
              defaultValue="Priority Emergency Van #04 (Rapid Transit)"
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
                isLoading={isDispatching}
                leftIcon={<Send className="w-4 h-4" />}
              >
                Authorize Green Corridor Dispatch
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminEmergencyPage;
