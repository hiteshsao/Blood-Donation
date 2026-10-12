import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Clock,
  Phone,
  Building2,
  Users,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { emergencyAPI } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { Button } from '../../components/common';

export const AdminEmergencyPage = () => {
  const { socket, isConnected, on, off } = useSocket();
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmingDonorId, setConfirmingDonorId] = useState(null);

  const socketConnected = !!isConnected;

  // Fetch Emergencies with Real-Time Progress
  const fetchEmergencies = async () => {
    setLoading(true);
    try {
      const res = await emergencyAPI.getNearby();
      const data = res.data?.data || res.data?.emergencies || res.data;
      if (Array.isArray(data)) {
        const withProgress = await Promise.all(
          data.map(async (em) => {
            const emId = em._id || em.emergencyId;
            try {
              const progRes = await emergencyAPI.getProgress(emId);
              const prog = progRes.data?.progress;
              if (prog) {
                return {
                  ...em,
                  acceptedDonors: prog.acceptedDonors || [],
                  donatedCount: prog.donatedCount || 0,
                  unitsNeeded: prog.unitsNeeded || em.units,
                  status: prog.status || em.status,
                };
              }
            } catch {
              // Ignore progress error for single emergency
            }
            return em;
          })
        );
        setEmergencies(withProgress);
      }
    } catch (err) {
      setEmergencies([]);
      toast.error(err.response?.data?.message || 'Failed to load emergencies.');
    } finally {
      setLoading(false);
    }
  };

  // Real-time Socket.io listener
  useEffect(() => {
    const handleEmergencyAlert = (data) => {
      toast.error(`🚨 REAL-TIME TRAUMA ALERT: ${data.patientName || 'Emergency Patient'} requires ${data.bloodGroup || 'Blood'}!`, {
        duration: 7000,
      });
      fetchEmergencies();
    };

    const handleEmergencyResponse = (data) => {
      toast.success(`Donor Accepted Emergency: ${data.donorName || 'A voluntary donor'} is en route!`);
      fetchEmergencies();
    };

    const handleProgressUpdate = () => {
      fetchEmergencies();
    };

    on('emergency:alert', handleEmergencyAlert);
    on('emergency_alert', handleEmergencyAlert);
    on('emergency:response', handleEmergencyResponse);
    on('donor_accepted', handleProgressUpdate);
    on('emergency_fulfilled', handleProgressUpdate);
    on('donor_donated', handleProgressUpdate);
    on('donation_confirmed', handleProgressUpdate);

    return () => {
      off('emergency:alert', handleEmergencyAlert);
      off('emergency_alert', handleEmergencyAlert);
      off('emergency:response', handleEmergencyResponse);
      off('donor_accepted', handleProgressUpdate);
      off('emergency_fulfilled', handleProgressUpdate);
      off('donor_donated', handleProgressUpdate);
      off('donation_confirmed', handleProgressUpdate);
    };
  }, [on, off]);

  useEffect(() => {
    fetchEmergencies();
  }, []);

  const handleConfirmDonatedAdmin = async (emergencyId, donor, patientName) => {
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
      await fetchEmergencies();
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-[#1E293B] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-2.5 h-2.5 rounded-full ${socketConnected ? 'bg-emerald-500 animate-ping' : 'bg-slate-500'}`} />
            <span className="text-xs font-black text-red-400 uppercase tracking-widest">
              Live Socket.io Telemetry
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${socketConnected ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
              Channel: emergency:alert ({socketConnected ? 'Active' : 'Disconnected'})
            </span>
          </div>

          <h1 className="text-2xl font-black text-white tracking-tight">
            National Emergency Dispatch Monitor
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Real-time trauma intake feed, responder coordinate routing, and voluntary donor responses.
          </p>
        </div>

        <div className="flex items-center gap-3">
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
        {emergencies.length === 0 ? (
          <div className="bg-[#1E293B] rounded-3xl p-12 border border-slate-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">No active emergencies</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              There are currently no active critical trauma broadcasts or emergency requisitions in the network.
            </p>
          </div>
        ) : (
          emergencies.map((emg) => (
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

              {/* Accepted Donors List (Admin Fallback Confirmation) */}
              <div className="space-y-2 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
                    Accepted Voluntary Donors ({emg.acceptedDonors?.length || 0})
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {emg.donatedCount || 0} / {emg.unitsNeeded || emg.units} units confirmed donated
                  </span>
                </div>

                {!emg.acceptedDonors || emg.acceptedDonors.length === 0 ? (
                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-400 italic">
                    Awaiting voluntary donors to accept this broadcast.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {emg.acceptedDonors.map((donor) => {
                      const isDonated = donor.status === 'DONATED' || donor.state === 'DONATED';
                      const donorId = donor.donorId || donor.userId || donor._id;
                      const key = `${emg._id}-${donorId}`;

                      return (
                        <div
                          key={donorId}
                          className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between text-xs"
                        >
                          <div className="space-y-0.5">
                            <p className="font-bold text-white">{donor.name}</p>
                            <p className="text-[10px] font-semibold text-red-400">
                              Blood Group: {donor.bloodGroup} {donor.city ? `• ${donor.city}` : ''}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              State: <span className={isDonated ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{isDonated ? 'Donated' : 'Accepted'}</span>
                            </p>
                          </div>

                          <div>
                            {isDonated ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[11px] font-bold">
                                <CheckCircle2 className="w-3 h-3" />
                                Donated
                              </span>
                            ) : (
                              <Button
                                variant="sos"
                                size="xs"
                                onClick={() => handleConfirmDonatedAdmin(emg._id, donor, emg.patientName)}
                                isLoading={confirmingDonorId === key}
                                disabled={confirmingDonorId !== null}
                                className="shadow-sm font-bold text-xs"
                                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                              >
                                Confirm donated
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
          ))
        )}
      </div>
    </div>
  );
};

export default AdminEmergencyPage;
