import React, { useState, useEffect } from 'react';
import {
  Droplet,
  Plus,
  Minus,
  AlertTriangle,
  History,
  CheckCircle,
  Clock,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Building2,
  X,
} from 'lucide-react';
import api from '../services/api';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const InventoryManagementPage = () => {
  // Selected facility state
  const [selectedBankId, setSelectedBankId] = useState('bb-201');
  const [selectedBankName, setSelectedBankName] = useState('AIIMS Central Blood Transfusion Centre');

  // Inventory rows (one row per blood group)
  const [inventory, setInventory] = useState([
    { bloodGroup: 'A+', availableUnits: 14, reservedUnits: 2, expiredUnits: 0, totalCollectedUnits: 48, lowStockThreshold: 5, lastUpdated: '2026-09-27T10:15:00Z' },
    { bloodGroup: 'A-', availableUnits: 3, reservedUnits: 0, expiredUnits: 1, totalCollectedUnits: 12, lowStockThreshold: 5, lastUpdated: '2026-09-26T14:30:00Z' },
    { bloodGroup: 'B+', availableUnits: 22, reservedUnits: 4, expiredUnits: 2, totalCollectedUnits: 86, lowStockThreshold: 5, lastUpdated: '2026-09-27T11:45:00Z' },
    { bloodGroup: 'B-', availableUnits: 4, reservedUnits: 1, expiredUnits: 0, totalCollectedUnits: 18, lowStockThreshold: 5, lastUpdated: '2026-09-25T09:20:00Z' },
    { bloodGroup: 'AB+', availableUnits: 11, reservedUnits: 1, expiredUnits: 0, totalCollectedUnits: 32, lowStockThreshold: 5, lastUpdated: '2026-09-26T17:10:00Z' },
    { bloodGroup: 'AB-', availableUnits: 2, reservedUnits: 0, expiredUnits: 1, totalCollectedUnits: 9, lowStockThreshold: 5, lastUpdated: '2026-09-24T12:00:00Z' },
    { bloodGroup: 'O+', availableUnits: 38, reservedUnits: 6, expiredUnits: 3, totalCollectedUnits: 145, lowStockThreshold: 5, lastUpdated: '2026-09-27T12:00:00Z' },
    { bloodGroup: 'O-', availableUnits: 1, reservedUnits: 1, expiredUnits: 0, totalCollectedUnits: 15, lowStockThreshold: 5, lastUpdated: '2026-09-27T08:30:00Z' },
  ]);

  // Audit logs state
  const [stockLogs, setStockLogs] = useState([
    {
      _id: 'log-1',
      bloodGroup: 'O-',
      changeType: 'ISSUE',
      units: 2,
      previousAvailableUnits: 3,
      newAvailableUnits: 1,
      performedBy: { name: 'Dr. Suresh Varma' },
      reason: 'Urgent cardiac trauma surgery (OR-4)',
      createdAt: '2026-09-27T08:30:00Z',
    },
    {
      _id: 'log-2',
      bloodGroup: 'B+',
      changeType: 'ADD',
      units: 6,
      previousAvailableUnits: 16,
      newAvailableUnits: 22,
      performedBy: { name: 'Sister Mary Fernandez' },
      reason: 'Voluntary drive donation intake',
      createdAt: '2026-09-27T11:45:00Z',
    },
    {
      _id: 'log-3',
      bloodGroup: 'AB-',
      changeType: 'EXPIRE',
      units: 1,
      previousAvailableUnits: 3,
      newAvailableUnits: 2,
      performedBy: { name: 'System automated audit' },
      reason: 'Daily 42-day whole blood shelf-life expiration',
      createdAt: '2026-09-24T12:00:00Z',
    },
  ]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('O+');
  const [changeType, setChangeType] = useState('ADD'); // 'ADD' | 'ISSUE' | 'EXPIRE' | 'ADJUST'
  const [unitsInput, setUnitsInput] = useState('1');
  const [reasonInput, setReasonInput] = useState('');
  const [modalFeedback, setModalFeedback] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);

  // Critical Low Stock Count
  const criticalItems = inventory.filter((item) => item.availableUnits < item.lowStockThreshold);

  const openUpdateModal = (group, defaultType = 'ADD') => {
    setSelectedGroup(group);
    setChangeType(defaultType);
    setUnitsInput('1');
    setReasonInput('');
    setModalFeedback({ type: '', text: '' });
    setModalOpen(true);
  };

  const handleStockSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setModalFeedback({ type: '', text: '' });

    const units = Number(unitsInput);
    if (isNaN(units) || units <= 0) {
      setModalFeedback({ type: 'urgent', text: 'Please specify a positive unit volume.' });
      setSubmitting(false);
      return;
    }

    try {
      // Execute atomic transition in state
      setInventory((prev) =>
        prev.map((item) => {
          if (item.bloodGroup === selectedGroup) {
            let newAvail = item.availableUnits;
            let newExpired = item.expiredUnits;
            let newCollected = item.totalCollectedUnits;

            if (changeType === 'ADD') {
              newAvail += units;
              newCollected += units;
            } else if (changeType === 'ISSUE') {
              if (item.availableUnits < units) {
                throw new Error(`Insufficient units available (${item.availableUnits} units on hand).`);
              }
              newAvail -= units;
            } else if (changeType === 'EXPIRE') {
              if (item.availableUnits < units) {
                throw new Error(`Cannot expire more units than available (${item.availableUnits} units).`);
              }
              newAvail -= units;
              newExpired += units;
            } else if (changeType === 'ADJUST') {
              newAvail = units;
            }

            return {
              ...item,
              availableUnits: newAvail,
              expiredUnits: newExpired,
              totalCollectedUnits: newCollected,
              lastUpdated: new Date().toISOString(),
            };
          }
          return item;
        })
      );

      // Append immutable log entry
      const currentItem = inventory.find((i) => i.bloodGroup === selectedGroup);
      const prevUnits = currentItem ? currentItem.availableUnits : 0;
      let finalUnits = prevUnits;
      if (changeType === 'ADD') finalUnits += units;
      else if (changeType === 'ISSUE' || changeType === 'EXPIRE') finalUnits -= units;
      else if (changeType === 'ADJUST') finalUnits = units;

      setStockLogs((prev) => [
        {
          _id: `log-${Date.now()}`,
          bloodGroup: selectedGroup,
          changeType,
          units,
          previousAvailableUnits: prevUnits,
          newAvailableUnits: finalUnits,
          performedBy: { name: 'Clinical Administrator' },
          reason: reasonInput || `Manual ${changeType.toLowerCase()} action`,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);

      setSubmitting(false);
      setModalOpen(false);
    } catch (err) {
      setSubmitting(false);
      setModalFeedback({ type: 'urgent', text: err.message || 'Atomic stock transaction failed.' });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header section with left alignment and facility selector */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2>Blood inventory management</h2>
          <p className="text-caption">
            Atomic stock balance tracking, shelf-life monitoring, and clinical dispensation audit logs.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <Building2 size={14} color="var(--ink-muted)" />
            <select
              className="form-select"
              value={selectedBankId}
              onChange={(e) => {
                setSelectedBankId(e.target.value);
                setSelectedBankName(
                  e.target.value === 'bb-201'
                    ? 'AIIMS Central Blood Transfusion Centre'
                    : 'Red Cross National Blood Bank'
                );
              }}
              style={{ padding: '6px 32px 6px 10px', fontSize: 13 }}
            >
              <option value="bb-201">AIIMS Central Blood Transfusion Centre (New Delhi)</option>
              <option value="bb-202">Red Cross National Blood Bank (Delhi Central)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Critical Low-Stock Warning (Design System --urgent Treatment) */}
      {criticalItems.length > 0 && (
        <div
          className="panel-urgent"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="urgent-pulse-icon">
              <AlertTriangle size={22} color="#FFFFFF" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>
                Critical low stock alert: {criticalItems.map((c) => c.bloodGroup).join(', ')} below threshold
              </div>
              <p style={{ fontSize: 13, opacity: 0.95, marginTop: 2 }}>
                Available supply has dropped under minimum safety limits (5 units). Immediate donor recall or inter-bank requisition advised.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {criticalItems.map((item) => (
              <button
                key={item.bloodGroup}
                className="btn btn-secondary btn-sm"
                onClick={() => openUpdateModal(item.bloodGroup, 'ADD')}
                style={{
                  background: '#FFFFFF',
                  color: 'var(--urgent)',
                  borderColor: 'transparent',
                  fontWeight: 600,
                  fontSize: 12,
                }}
              >
                <span>Restock {item.bloodGroup}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Routine Flat Panel: One Row Per Blood Group Table */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Facility stock grid</h3>
            <span className="text-caption">One record per blood group &bull; Atomic stock verification</span>
          </div>
          <span className="text-caption">
            Facility: <strong>{selectedBankName}</strong>
          </span>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Blood group</th>
                <th>Available units</th>
                <th>Reserved</th>
                <th>Expired (42d)</th>
                <th>Total collected</th>
                <th>Stock status</th>
                <th>Administrative stock adjustments</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((row) => {
                const isLow = row.availableUnits < row.lowStockThreshold;

                return (
                  <tr key={row.bloodGroup}>
                    <td>
                      <span className="blood-group-tag" style={{ fontSize: 14, fontWeight: 600 }}>
                        {row.bloodGroup}
                      </span>
                    </td>

                    <td>
                      <div style={{ fontSize: 17, fontWeight: 600 }}>
                        {row.availableUnits} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--ink-muted)' }}>pints</span>
                      </div>
                    </td>

                    <td>
                      <div className="text-caption">{row.reservedUnits} units</div>
                    </td>

                    <td>
                      <div className="text-caption">{row.expiredUnits} units</div>
                    </td>

                    <td>
                      <div className="text-caption">{row.totalCollectedUnits} units</div>
                    </td>

                    <td>
                      {isLow ? (
                        /* Urgent low-stock treatment */
                        <span
                          className="status-pill status-pill-urgent"
                          style={{
                            background: 'var(--urgent)',
                            color: '#FFFFFF',
                            borderColor: 'transparent',
                            fontWeight: 600,
                          }}
                        >
                          <AlertTriangle size={12} color="#FFFFFF" />
                          <span>Status: Critical low ({row.availableUnits} &lt; {row.lowStockThreshold})</span>
                        </span>
                      ) : (
                        <span className="status-pill status-pill-success">
                          <CheckCircle size={12} />
                          <span>Status: Sufficient ({row.availableUnits} units)</span>
                        </span>
                      )}
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => openUpdateModal(row.bloodGroup, 'ADD')}
                          title="Record blood intake"
                        >
                          <Plus size={12} />
                          <span>Add stock</span>
                        </button>

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => openUpdateModal(row.bloodGroup, 'ISSUE')}
                          disabled={row.availableUnits === 0}
                          title="Issue units to hospital or patient"
                        >
                          <Minus size={12} />
                          <span>Issue</span>
                        </button>

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => openUpdateModal(row.bloodGroup, 'EXPIRE')}
                          disabled={row.availableUnits === 0}
                          style={{ color: 'var(--ink-muted)', fontSize: 12 }}
                        >
                          <span>Expire</span>
                        </button>

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => openUpdateModal(row.bloodGroup, 'ADJUST')}
                          style={{ fontSize: 12 }}
                        >
                          <span>Adjust</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Routine Flat Panel: Stock History / Audit Trail */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Stock change audit log</h3>
            <span className="text-caption">Immutable transaction history for accreditation inspection</span>
          </div>
          <span className="text-caption">{stockLogs.length} logged entries</span>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Blood group</th>
                <th>Change type</th>
                <th>Volume</th>
                <th>Balance change</th>
                <th>Performed by</th>
                <th>Clinical justification</th>
              </tr>
            </thead>
            <tbody>
              {stockLogs.map((log) => (
                <tr key={log._id}>
                  <td className="text-caption">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })},{' '}
                    {new Date(log.createdAt).toLocaleDateString()}
                  </td>

                  <td>
                    <span className="blood-group-tag">{log.bloodGroup}</span>
                  </td>

                  <td>
                    <span
                      className={`status-pill ${
                        log.changeType === 'ADD'
                          ? 'status-pill-success'
                          : log.changeType === 'EXPIRE'
                          ? 'status-pill-urgent'
                          : 'status-pill-neutral'
                      }`}
                    >
                      {log.changeType === 'ADD' ? (
                        <ArrowUpRight size={12} />
                      ) : (
                        <ArrowDownRight size={12} />
                      )}
                      <span>Action: {log.changeType}</span>
                    </span>
                  </td>

                  <td style={{ fontWeight: 600 }}>
                    {log.changeType === 'ADD' ? `+${log.units}` : `-${log.units}`} units
                  </td>

                  <td className="text-caption">
                    {log.previousAvailableUnits} &rarr; {log.newAvailableUnits} units
                  </td>

                  <td>
                    <div>{log.performedBy?.name || 'Authorized Staff'}</div>
                  </td>

                  <td className="text-caption" style={{ maxWidth: 280 }}>
                    {log.reason || 'Routine inventory balancing'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Atomic Stock Adjustment */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(28, 27, 26, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 200,
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            className="panel"
            style={{ maxWidth: 480, width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-header">
              <div>
                <h3 className="panel-title">Execute atomic stock adjustment</h3>
                <span className="text-caption">Target blood group: {selectedGroup}</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setModalOpen(false)}
                style={{ padding: 4 }}
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleStockSubmit}>
              {modalFeedback.text && (
                <div className={`inline-alert inline-alert-${modalFeedback.type}`}>
                  <AlertTriangle size={15} />
                  <span>{modalFeedback.text}</span>
                </div>
              )}

              {/* Action type buttons */}
              <div className="form-group">
                <label className="form-label">Transaction type</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {['ADD', 'ISSUE', 'EXPIRE', 'ADJUST'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={`btn btn-sm ${changeType === type ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setChangeType(type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  {changeType === 'ADJUST' ? 'Set exact count (units)' : 'Unit quantity (pints)'}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="500"
                  className="form-input"
                  value={unitsInput}
                  onChange={(e) => setUnitsInput(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Clinical rationale / Requisition reference</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. ICU requisition #8410 or blood drive collection"
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                />
              </div>

              <div style={{ marginTop: 22, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setModalOpen(false)}
                >
                  <span>Cancel</span>
                </button>

                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={submitting}
                >
                  <span>
                    {submitting
                      ? 'Executing transaction...'
                      : changeType === 'ADD'
                      ? 'Record stock addition'
                      : changeType === 'ISSUE'
                      ? 'Issue blood units'
                      : changeType === 'EXPIRE'
                      ? 'Mark units as expired'
                      : 'Apply count adjustment'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagementPage;
