import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ArrowRight, MapPin, Clock, Phone, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { emergencyAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Button, Modal } from './common';

export const GlobalEmergencyPopup = () => {
  const { user, role } = useAuth();
  const { socket, on, off } = useSocket();
  const navigate = useNavigate();

  const isDonor =
    (user?.role || role || '').toUpperCase() === 'DONOR' ||
    Boolean(user?.isDonor);

  const [activeAlert, setActiveAlert] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loadingAction, setLoadingAction] = useState(null);

  // Track seen and answered emergency IDs to prevent duplicates
  const seenIdsRef = useRef(new Set());
  const answeredIdsRef = useRef(new Set());

  // Ensure donor joins the blood group room for real-time broadcasts
  useEffect(() => {
    if (!socket || !isDonor || !user?.bloodGroup) return;
    socket.emit('join_group_room', user.bloodGroup);
  }, [socket, isDonor, user?.bloodGroup]);

  // Optional subtle audio alert via Web Audio API (never blocking)
  const playAlertSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio autoplay policy may block without prior gesture; safe to ignore
    }
  }, []);

  // Advance to next alert in queue or close
  const advanceQueue = useCallback(() => {
    setQueue((prevQueue) => {
      if (prevQueue.length > 0) {
        const [next, ...rest] = prevQueue;
        setActiveAlert(next);
        return rest;
      } else {
        setActiveAlert(null);
        return [];
      }
    });
  }, []);

  // Real-time socket listener
  useEffect(() => {
    if (!socket || !isDonor) return;

    const handleEmergencyAlert = (data) => {
      if (!data) return;

      const emId = data.emergencyId || data._id || data.id;
      if (!emId) return;

      // Ignore duplicates: already shown or answered
      if (answeredIdsRef.current.has(emId) || seenIdsRef.current.has(emId)) {
        return;
      }
      seenIdsRef.current.add(emId);

      const alertPayload = {
        _id: emId,
        patientName: data.patientName || 'Emergency Patient',
        bloodGroup: data.bloodGroup || '',
        units: data.units || data.unitsRequired || 1,
        hospitalName:
          data.hospitalName ||
          (typeof data.hospital === 'object' ? data.hospital?.name : data.hospital) ||
          'the hospital',
        city: data.city || user?.city || '',
        distanceKm:
          data.distanceKm !== undefined && data.distanceKm !== null
            ? data.distanceKm
            : data.radiusKm !== undefined && data.radiusKm !== null
              ? data.radiusKm
              : null,
        notes: data.notes || data.message || '',
        urgency: data.urgency || 'CRITICAL',
        createdAt: data.createdAt || new Date().toISOString(),
      };

      playAlertSound();

      setActiveAlert((current) => {
        if (!current) {
          return alertPayload;
        } else {
          // If a popup is already active, queue the next one
          setQueue((prevQueue) => {
            if (prevQueue.some((q) => q._id === alertPayload._id)) return prevQueue;
            return [...prevQueue, alertPayload];
          });
          return current;
        }
      });
    };

    on('emergency_alert', handleEmergencyAlert);
    on('emergency:alert', handleEmergencyAlert);
    on('emergency:broadcast', handleEmergencyAlert);

    return () => {
      off('emergency_alert', handleEmergencyAlert);
      off('emergency:alert', handleEmergencyAlert);
      off('emergency:broadcast', handleEmergencyAlert);
    };
  }, [socket, isDonor, user?.city, on, off, playAlertSound]);

  // Clean up popup when emergency is fulfilled or enough donors assigned
  useEffect(() => {
    if (!socket || !isDonor) return;

    const handleEmergencyClosed = (data) => {
      const emId = data?.emergencyId || data?._id;
      if (!emId) return;

      // Close active alert if it has not yet been accepted by this donor
      setActiveAlert((current) => {
        if (current && current._id === emId && !current.isAcceptedStep) {
          return null;
        }
        return current;
      });

      // Remove from pending queue
      setQueue((prevQueue) => prevQueue.filter((item) => item._id !== emId));
    };

    const handleDonationConfirmed = (data) => {
      const emId = data?.emergencyId || data?._id;
      if (!emId) return;

      setActiveAlert((current) => {
        if (current && current._id === emId) {
          return {
            ...current,
            isDonated: true,
            nextEligibleDate: data?.nextEligibleDate,
          };
        }
        return current;
      });
    };

    on('emergency_fulfilled', handleEmergencyClosed);
    on('emergency_donors_assigned', handleEmergencyClosed);
    on('donation_confirmed', handleDonationConfirmed);

    return () => {
      off('emergency_fulfilled', handleEmergencyClosed);
      off('emergency_donors_assigned', handleEmergencyClosed);
      off('donation_confirmed', handleDonationConfirmed);
    };
  }, [socket, isDonor, on, off]);

  const handleRespond = async (emergencyId, responseType) => {
    setLoadingAction(emergencyId);

    try {
      const res = await emergencyAPI.respond(emergencyId, responseType);
      if (responseType === 'ACCEPTED') {
        answeredIdsRef.current.add(emergencyId);
        toast.success(
          'Thank you! You have accepted this emergency. The hospital has been notified.'
        );
        const emData = res.data?.emergency || res.data || {};
        // Transition to Accepted step with hospital details, destination address and contact
        setActiveAlert((current) =>
          current
            ? {
                ...current,
                isAcceptedStep: true,
                hospitalName: emData.hospitalName || current.hospitalName,
                hospitalAddress: emData.hospitalAddress || '',
                wardOrRoom: emData.wardOrRoom || '',
                contactName: emData.contactName || '',
                contactNumber: emData.contactNumber || '',
                patientName: emData.patientName || current.patientName,
                city: emData.city || current.city,
              }
            : null
        );
      } else {
        answeredIdsRef.current.add(emergencyId);
        toast('Emergency alert dismissed.', { icon: 'ℹ️' });
        advanceQueue();
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.message || 'Failed to submit response.'
      );
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCancelAcceptance = async (emergencyId) => {
    setLoadingAction(emergencyId);
    try {
      await emergencyAPI.respond(emergencyId, 'REJECTED');
      toast.success('Your acceptance has been cancelled.');
      advanceQueue();
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.message || 'Failed to cancel acceptance.'
      );
    } finally {
      setLoadingAction(null);
    }
  };

  const handleViewDetails = () => {
    navigate('/emergency');
    advanceQueue();
  };

  if (!isDonor || !activeAlert) {
    return null;
  }

  return (
    <Modal
      isOpen={!!activeAlert}
      onClose={() => advanceQueue()}
      size="md"
      showCloseButton={false}
      className={
        activeAlert.isAcceptedStep
          ? 'border-4 border-emerald-500'
          : 'border-4 border-red-500'
      }
    >
      {activeAlert.isAcceptedStep ? (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner animate-bounce">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="flex items-center justify-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-600 text-white font-black text-xs uppercase tracking-widest">
              Accepted, Thank You!
            </span>
          </div>

          <h3 className="text-2xl font-black text-slate-900 tracking-tight">
            You Are Saving a Life!
          </h3>

          {/* Where to Go Block */}
          {activeAlert.hospitalAddress || activeAlert.contactNumber || activeAlert.contactName ? (
            <div className="p-4 rounded-2xl bg-emerald-50 text-xs text-emerald-900 text-left font-medium border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
                <span className="text-emerald-800 font-black uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Where to Go</span>
                </span>
                {activeAlert.wardOrRoom && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 font-extrabold text-[11px]">
                    {activeAlert.wardOrRoom}
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <p className="font-extrabold text-slate-900 text-sm">
                  {activeAlert.hospitalName}
                </p>
                {activeAlert.hospitalAddress && (
                  <p className="text-slate-700 font-medium leading-relaxed">
                    {activeAlert.hospitalAddress}
                    {activeAlert.city && `, ${activeAlert.city}`}
                  </p>
                )}
              </div>

              {/* Meet & Call */}
              {(activeAlert.contactName || activeAlert.contactNumber) && (
                <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between gap-2">
                  <div className="text-slate-800">
                    <span className="text-emerald-800 font-bold">Meet: </span>
                    <span className="font-black text-slate-900">
                      {activeAlert.contactName || 'Hospital Desk Coordinator'}
                    </span>
                    {activeAlert.contactNumber && (
                      <span className="text-slate-600 font-bold ml-1.5 font-mono">
                        ({activeAlert.contactNumber})
                      </span>
                    )}
                  </div>

                  {activeAlert.contactNumber && (
                    <a
                      href={`tel:${activeAlert.contactNumber}`}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm transition-all"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-slate-600 text-xs italic font-semibold text-left">
              Hospital details not provided, please wait for the requester to contact you
            </div>
          )}

          <div className="p-3.5 rounded-2xl bg-amber-50 text-xs text-amber-900 text-left font-medium border border-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed font-semibold">
              Please go to the hospital and meet the requester. Carry a photo ID.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex flex-col items-center justify-center gap-1.5 font-bold">
            {activeAlert.isDonated ? (
              <>
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Donation confirmed, thank you</span>
                </div>
                {activeAlert.nextEligibleDate && (
                  <span className="text-[11px] font-semibold text-emerald-600">
                    Next eligible donation date: {new Date(activeAlert.nextEligibleDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </span>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="w-4 h-4 text-amber-500 animate-spin" />
                <span>Waiting for the requester to confirm your donation</span>
              </div>
            )}
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  [activeAlert.hospitalAddress, activeAlert.hospitalName, activeAlert.city].filter(Boolean).join(', ') || activeAlert.hospitalName
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all"
              >
                <MapPin className="w-4 h-4" />
                <span>Open in Maps</span>
              </a>

              {(activeAlert.hospitalAddress || activeAlert.hospitalName) && (
                <button
                  type="button"
                  onClick={() => {
                    const addr = [activeAlert.hospitalName, activeAlert.wardOrRoom, activeAlert.hospitalAddress, activeAlert.city].filter(Boolean).join(', ');
                    navigator.clipboard.writeText(addr);
                    toast.success('Hospital destination copied to clipboard!');
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy address</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!activeAlert.isDonated && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCancelAcceptance(activeAlert._id)}
                  isLoading={loadingAction === activeAlert._id}
                  className="flex-1 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 font-bold"
                >
                  Cancel my acceptance
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => advanceQueue()}
                className="flex-1 text-xs font-bold text-slate-700"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-inner animate-pulse">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="flex items-center justify-center gap-2">
            <span className="px-3 py-1 rounded-full bg-red-600 text-white font-black text-xs uppercase tracking-widest">
              Live Incoming Emergency Alert
            </span>
            {queue.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white font-bold text-[10px]">
                +{queue.length} waiting
              </span>
            )}
          </div>

          <h3 className="text-2xl font-black text-slate-900 tracking-tight">
            Immediate {activeAlert.bloodGroup} Blood Needed!
          </h3>

          <p className="text-sm text-slate-600 font-medium leading-relaxed max-w-sm mx-auto">
            Patient <strong className="text-slate-900">{activeAlert.patientName}</strong> is in critical
            condition at <strong className="text-slate-900">{activeAlert.hospitalName}</strong>
            {activeAlert.city ? ` in ${activeAlert.city}` : ''}
            {activeAlert.distanceKm !== null && activeAlert.distanceKm !== undefined
              ? ` (${activeAlert.distanceKm} km away)`
              : ''}.
          </p>

          <div className="p-4 rounded-2xl bg-red-50 text-xs text-red-900 text-left font-medium border border-red-200">
            <p>
              <strong>Required:</strong> {activeAlert.units} Unit(s) of {activeAlert.bloodGroup}
            </p>
            {activeAlert.notes && (
              <p className="mt-1">
                <strong>Details:</strong> {activeAlert.notes}
              </p>
            )}
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <p className="text-[11px] text-slate-500 font-medium leading-tight">
              If you accept, your name and phone number will be shared with the requester of this emergency.
            </p>

            <div className="flex items-center justify-center gap-3">
              <Button
                variant="ghost"
                size="md"
                onClick={() => handleRespond(activeAlert._id, 'REJECTED')}
                disabled={loadingAction === activeAlert._id}
                className="flex-1 text-slate-500 hover:text-slate-800"
              >
                Decline
              </Button>

              <Button
                variant="sos"
                size="md"
                onClick={() => handleRespond(activeAlert._id, 'ACCEPTED')}
                isLoading={loadingAction === activeAlert._id}
                className="flex-1 shadow-md"
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                I Will Donate (Accept)
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleViewDetails}
              disabled={loadingAction === activeAlert._id}
              className="w-full text-xs font-bold text-red-700 border-red-200 hover:bg-red-50"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              View Details on Emergency Hub
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default GlobalEmergencyPopup;
