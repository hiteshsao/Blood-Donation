import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  RefreshCw,
  Eye,
  ShieldAlert,
  Search,
  CheckCircle2,
  Clock,
  Terminal,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import { DataTable, StatusBadge, Button, Modal } from '../../components/common';

const FALLBACK_LOGS = [
  {
    _id: 'log-001',
    actor: 'Administrator Chief (admin@lifedrop.org)',
    action: 'APPROVE_FACILITY',
    target: 'Apollo City Hospital (MH-MUM-HOSP-2024-991)',
    ipAddress: '192.168.1.45',
    status: 'SUCCESS',
    details: {
      facilityId: 'fac-201',
      licenseVerified: true,
      previousStatus: 'PENDING',
      newStatus: 'APPROVED',
      complianceAuditor: 'Admin ID #01',
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
  },
  {
    _id: 'log-002',
    actor: 'Administrator Chief (admin@lifedrop.org)',
    action: 'OVERRIDE_STOCK',
    target: 'RedCross Regional Blood Center (Group O-)',
    ipAddress: '192.168.1.45',
    status: 'SUCCESS',
    details: {
      bankId: 'fac-202',
      bloodGroup: 'O-',
      previousUnits: 1,
      adjustedUnits: 3,
      reason: 'Physical inventory recount audit / State trauma dispatch',
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
  },
  {
    _id: 'log-003',
    actor: 'System Automation Dispatcher',
    action: 'EMERGENCY_BROADCAST',
    target: 'Radius 15km / Donors O-',
    ipAddress: '127.0.0.1 (Internal Service)',
    status: 'SUCCESS',
    details: {
      alertId: 'emg-live-01',
      channels: ['IN_APP', 'SOCKET_PUSH', 'SMS'],
      recipientsCount: 42,
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
  },
  {
    _id: 'log-004',
    actor: 'Administrator Chief (admin@lifedrop.org)',
    action: 'BLOCK_USER',
    target: 'Suspicious Account Flag (bot.scraper@spam.com)',
    ipAddress: '192.168.1.45',
    status: 'SUCCESS',
    details: {
      userId: 'usr-006',
      reason: 'Automated rapid endpoint scraping detected',
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
  },
];

export const AdminAuditLogsPage = () => {
  const [logs, setLogs] = useState(FALLBACK_LOGS);
  const [loading, setLoading] = useState(false);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getAuditLogs();
      const data = res.data?.data || res.data?.logs || res.data;
      if (Array.isArray(data) && data.length > 0) {
        setLogs(data);
      }
    } catch {
      // Retain fallback data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleInspect = (log) => {
    setSelectedLog(log);
    setInspectModalOpen(true);
  };

  const columns = [
    {
      header: 'Timestamp',
      key: 'timestamp',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs text-slate-500">
          {new Date(row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })},{' '}
          {new Date(row.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
        </span>
      ),
    },
    {
      header: 'Actor / Administrator',
      key: 'actor',
      sortable: true,
      render: (row) => (
        <div>
          <strong className="text-slate-900 font-bold block text-xs">{row.actor}</strong>
          <span className="text-slate-400 text-[10px] font-mono">IP: {row.ipAddress}</span>
        </div>
      ),
    },
    {
      header: 'Action Mutated',
      key: 'action',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
          {row.action}
        </span>
      ),
    },
    {
      header: 'Target Entity / Scope',
      key: 'target',
      sortable: true,
      render: (row) => <span className="text-xs text-slate-800 font-medium">{row.target}</span>,
    },
    {
      header: 'Status',
      key: 'status',
      sortable: true,
      render: (row) => <StatusBadge status={row.status} size="xs" />,
    },
    {
      header: 'Payload Details',
      key: 'actions',
      sortable: false,
      render: (row) => (
        <Button
          variant="outline"
          size="xs"
          onClick={() => handleInspect(row)}
          className="text-slate-700 hover:bg-slate-100"
          leftIcon={<Eye className="w-3.5 h-3.5" />}
        >
          Inspect Log
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-[#1E293B] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800 text-blue-400 text-xs font-black mb-2">
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Immutable Security Audit Ledger</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Administrative Action Audit Logs
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Inspect all authenticated database state modifications, stock overrides, blocks, and verification decisions.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchLogs}
          leftIcon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
        >
          Refresh Logs
        </Button>
      </div>

      {/* Reusable DataTable */}
      <DataTable
        columns={columns}
        data={logs}
        keyField="_id"
        isLoading={loading}
        searchPlaceholder="Search audit log by actor, action, target, or IP..."
        searchKeys={['actor', 'action', 'target', 'ipAddress']}
        pageSize={10}
        emptyTitle="No Audit Logs Recorded"
        emptyDescription="No system security logs match your search parameters."
      />

      {/* Inspect Modal */}
      {inspectModalOpen && selectedLog && (
        <Modal
          isOpen={inspectModalOpen}
          onClose={() => setInspectModalOpen(false)}
          title={`Audit Record: ${selectedLog.action}`}
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-[#FFF8F8] border border-red-100 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Log Timestamp:</span>
                <strong className="text-slate-800">{new Date(selectedLog.timestamp).toISOString()}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Origin IP:</span>
                <strong className="text-slate-800 font-mono">{selectedLog.ipAddress}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mutating Actor:</span>
                <strong className="text-slate-800">{selectedLog.actor}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Target Entity:</span>
                <strong className="text-slate-800">{selectedLog.target}</strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-slate-500" />
                Raw JSON Context Payload
              </label>
              <pre className="p-4 rounded-2xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto border border-slate-800 max-h-60">
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="primary"
                size="md"
                onClick={() => setInspectModalOpen(false)}
              >
                Close Audit Viewer
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminAuditLogsPage;
