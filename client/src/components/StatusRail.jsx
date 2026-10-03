import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { donorAPI } from '../services/api';
import { AlertTriangle, MapPin, CheckCircle, ShieldCheck, HeartPulse, RefreshCw } from 'lucide-react';

export const StatusRail = ({ onNavigateToHistory, onNavigateToProfile }) => {
  const { user, donorProfile, setDonorProfile } = useAuth();
  const [simulatedEmergency, setSimulatedEmergency] = useState(true);
  const [toggling, setToggling] = useState(false);

  const handleToggleAvailability = async () => {
    if (!donorProfile) return;
    setToggling(true);
    const newStatus = !donorProfile.isAvailable;
    try {
      const res = await donorAPI.updateAvailability(newStatus);
      if (res.data.success) {
        setDonorProfile(res.data.donorProfile);
      }
    } catch (err) {
      console.error('Failed to update availability in rail:', err);
    } finally {
      setToggling(false);
    }
  };

  return (
    <aside className="status-rail">
      {/* 1. Live Emergency Orchestrated Moment (solid --urgent background, 8px radius, white text) */}
      {simulatedEmergency && (
        <div className="panel-urgent emergency-orchestrated-banner">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div className="urgent-pulse-icon" style={{ marginTop: 2 }}>
              <HeartPulse size={20} color="#FFFFFF" />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Urgent: B+ blood shortage</div>
              <p style={{ fontSize: 13, opacity: 0.95, marginTop: 2 }}>
                Trauma Center AIIMS Delhi — 2 units requested within 5 km.
              </p>
            </div>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setSimulatedEmergency(false)}
            style={{
              background: '#FFFFFF',
              color: 'var(--urgent)',
              borderColor: 'transparent',
              fontSize: 12,
              whiteSpace: 'nowrap',
              marginLeft: 10,
            }}
          >
            Acknowledge
          </button>
        </div>
      )}

      {/* 2. Donor Live Coordination Status */}
      <div className="panel">
        <div className="panel-header" style={{ marginBottom: 14, paddingBottom: 10 }}>
          <h3 className="panel-title" style={{ fontSize: 16 }}>Coordination rail</h3>
          <span className="text-caption">Real-time status</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Blood group indicator */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, color: 'var(--ink-muted)' }}>Registered blood group</span>
            {user?.bloodGroup ? (
              <span className="blood-group-tag">{user.bloodGroup}</span>
            ) : (
              <span className="status-pill status-pill-neutral">Not selected</span>
            )}
          </div>

          {/* Availability switch in rail */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, color: 'var(--ink-muted)' }}>Emergency dispatch</span>
            {donorProfile ? (
              <span
                className={`status-pill ${
                  donorProfile.isAvailable ? 'status-pill-success' : 'status-pill-neutral'
                }`}
              >
                {donorProfile.isAvailable ? 'Status: Available' : 'Status: Unavailable'}
              </span>
            ) : (
              <span className="status-pill status-pill-warning">Status: Not a donor</span>
            )}
          </div>

          {donorProfile && (
            <div style={{ marginTop: 4 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm btn-block"
                onClick={handleToggleAvailability}
                disabled={toggling}
              >
                <span>{donorProfile.isAvailable ? 'Set status to unavailable' : 'Set status to available'}</span>
              </button>
            </div>
          )}

          {/* Location proximity check */}
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-muted)' }}>
              <MapPin size={14} color="var(--ink)" />
              <span>
                {user?.city ? `${user.city}, ${user.state || 'India'}` : 'Location unconfirmed'}
              </span>
            </div>
            {user?.location?.coordinates?.[0] !== 0 && (
              <p className="text-caption" style={{ marginTop: 4 }}>
                GPS coordinates active: [{user?.location?.coordinates?.[0]?.toFixed(3)}, {user?.location?.coordinates?.[1]?.toFixed(3)}]
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 3. Next Eligible Date & Action Shortcut */}
      <div className="panel">
        <div className="panel-header" style={{ marginBottom: 12, paddingBottom: 8 }}>
          <h3 className="panel-title" style={{ fontSize: 16 }}>Clinical eligibility</h3>
        </div>
        <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 12 }}>
          Interval rules are evaluated live against current national medical criteria.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 14 }}>Next donation date</span>
          <strong style={{ color: 'var(--success)' }}>
            {donorProfile?.nextEligibleDate
              ? new Date(donorProfile.nextEligibleDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'Eligible today'}
          </strong>
        </div>

        <button
          className="btn btn-secondary btn-sm btn-block"
          onClick={onNavigateToHistory}
        >
          <span>View complete donation history</span>
        </button>
      </div>
    </aside>
  );
};
