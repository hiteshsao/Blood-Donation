import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
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
        city: data.city || user?.city || 'Raipur',
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

  const handleRespond = async (emergencyId, responseType) => {
    setLoadingAction(emergencyId);
    answeredIdsRef.current.add(emergencyId);

    try {
      await emergencyAPI.respond(emergencyId, responseType);
      if (responseType === 'ACCEPTED') {
        toast.success(
          'Thank you! You have accepted this emergency. The hospital has been notified.'
        );
      } else {
        toast('Emergency alert dismissed.', { icon: 'ℹ️' });
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.message || 'Failed to submit response.'
      );
    } finally {
      setLoadingAction(null);
      advanceQueue();
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
      className="border-4 border-red-500 animate-bounce"
    >
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
    </Modal>
  );
};

export default GlobalEmergencyPopup;
