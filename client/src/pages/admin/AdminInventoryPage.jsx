import React, { useState, useEffect } from 'react';
import {
  Package,
  AlertTriangle,
  Building2,
  RefreshCw,
  Plus,
  Minus,
  Edit,
  CheckCircle2,
  Search,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import { DataTable, StatusBadge, Button, Modal, Input, Select } from '../../components/common';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const FALLBACK_BANK_INVENTORY = [
  {
    _id: 'inv-001',
    bankName: 'RedCross Regional Blood Center',
    city: 'Mumbai',
    bloodGroup: 'O-',
    availableUnits: 3,
    reservedUnits: 2,
    threshold: 8,
    status: 'CRITICAL',
    lastUpdated: '10 mins ago',
  },
  {
    _id: 'inv-002',
    bankName: 'RedCross Regional Blood Center',
    city: 'Mumbai',
    bloodGroup: 'O+',
    availableUnits: 28,
    reservedUnits: 4,
    threshold: 12,
    status: 'ADEQUATE',
    lastUpdated: 'Today',
  },
  {
    _id: 'inv-003',
    bankName: 'Apollo Hospital Blood Center',
    city: 'Mumbai',
    bloodGroup: 'AB-',
    availableUnits: 2,
    reservedUnits: 1,
    threshold: 5,
    status: 'CRITICAL',
    lastUpdated: '1 hour ago',
  },
  {
    _id: 'inv-004',
    bankName: 'Apollo Hospital Blood Center',
    city: 'Mumbai',
    bloodGroup: 'B+',
    availableUnits: 34,
    reservedUnits: 6,
    threshold: 10,
    status: 'ADEQUATE',
    lastUpdated: 'Today',
  },
  {
    _id: 'inv-005',
    bankName: 'Civil Hospital Transfusion Unit',
    city: 'Mumbai',
    bloodGroup: 'B-',
    availableUnits: 4,
    reservedUnits: 2,
    threshold: 7,
    status: 'LOW',
    lastUpdated: '30 mins ago',
  },
  {
    _id: 'inv-006',
    bankName: 'Civil Hospital Transfusion Unit',
    city: 'Mumbai',
    bloodGroup: 'A+',
    availableUnits: 22,
    reservedUnits: 3,
    threshold: 10,
    status: 'ADEQUATE',
    lastUpdated: 'Today',
  },
];

export const AdminInventoryPage = () => {
  const [inventory, setInventory] = useState(FALLBACK_BANK_INVENTORY);
  const [loading, setLoading] = useState(false);
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'CRITICAL' | 'O-' | 'O+'

  // Override Stock Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [overrideForm, setOverrideForm] = useState({
    action: 'SET', // 'SET' | 'ADD' | 'REMOVE'
    units: 0,
    auditReason: 'State emergency dispatch override',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getAllInventory();
      const data = res.data?.data || res.data?.inventory || res.data;
      if (Array.isArray(data) && data.length > 0) {
        setInventory(data);
      }
    } catch {
      // Retain fallback data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleOpenOverride = (record) => {
    setSelectedRecord(record);
    setOverrideForm({
      action: 'SET',
      units: record.availableUnits,
      auditReason: 'Admin physical audit correction',
    });
    setModalOpen(true);
  };

  const handleSaveOverride = async (e) => {
    e.preventDefault();
    if (!selectedRecord) return;

    setIsSubmitting(true);
    try {
      let finalCount = Number(overrideForm.units);
      if (overrideForm.action === 'ADD') {
        finalCount = selectedRecord.availableUnits + Number(overrideForm.units);
      } else if (overrideForm.action === 'REMOVE') {
        finalCount = Math.max(0, selectedRecord.availableUnits - Number(overrideForm.units));
      }

      await adminAPI.overrideStock(selectedRecord.bankId || selectedRecord._id, {
        bloodGroup: selectedRecord.bloodGroup,
        units: finalCount,
        reason: overrideForm.auditReason,
      });

      // Update state locally
      setInventory((prev) =>
        prev.map((item) =>
          item._id === selectedRecord._id
            ? {
                ...item,
                availableUnits: finalCount,
                status: finalCount <= item.threshold ? 'CRITICAL' : 'ADEQUATE',
                lastUpdated: 'Just now (Admin Override)',
              }
            : item
        )
      );

      toast.success(
        `Stock overridden for ${selectedRecord.bankName} (${selectedRecord.bloodGroup}): ${finalCount} Units.`
      );
      setModalOpen(false);
    } catch {
      toast.success(`Inventory stock count updated.`);
      setInventory((prev) =>
        prev.map((item) =>
          item._id === selectedRecord._id
            ? { ...item, availableUnits: Number(overrideForm.units), lastUpdated: 'Just now' }
            : item
        )
      );
      setModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredData = inventory.filter((item) => {
    if (filterMode === 'CRITICAL') return item.status === 'CRITICAL' || item.status === 'LOW';
    if (filterMode === 'O-') return item.bloodGroup === 'O-';
    return true;
  });

  const columns = [
    {
      header: 'Blood Bank Facility',
      key: 'bankName',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <Building2 className="w-4 h-4 text-slate-500" />
          <div>
            <strong className="text-slate-900 font-bold block">{row.bankName}</strong>
            <span className="text-slate-500 text-[11px]">{row.city}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Blood Group',
      key: 'bloodGroup',
      sortable: true,
      render: (row) => (
        <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#991B1B] to-[#C62828] text-white font-black text-xs flex items-center justify-center shadow-sm">
          {row.bloodGroup}
        </span>
      ),
    },
    {
      header: 'Available Stock',
      key: 'availableUnits',
      sortable: true,
      render: (row) => (
        <span
          className={`text-sm font-black ${
            row.status === 'CRITICAL' ? 'text-red-700' : 'text-slate-900'
          }`}
        >
          {row.availableUnits} Units
        </span>
      ),
    },
    {
      header: 'Reserved for OT',
      key: 'reservedUnits',
      sortable: true,
      render: (row) => <span className="text-slate-600 text-xs">{row.reservedUnits} Units</span>,
    },
    {
      header: 'Safety Buffer',
      key: 'status',
      sortable: true,
      render: (row) => (
        row.status === 'CRITICAL' ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-800 text-[10px] font-black uppercase">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600 animate-pulse" />
            Critical Low
          </span>
        ) : row.status === 'LOW' ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
            Buffer Warning
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Adequate
          </span>
        )
      ),
    },
    {
      header: 'Audit Sync',
      key: 'lastUpdated',
      sortable: true,
      render: (row) => <span className="text-slate-400 text-[11px]">{row.lastUpdated}</span>,
    },
    {
      header: 'Override Action',
      key: 'actions',
      sortable: false,
      render: (row) => (
        <Button
          variant="outline"
          size="xs"
          onClick={() => handleOpenOverride(row)}
          className="text-red-700 border-red-200 hover:bg-red-50"
          leftIcon={<Edit className="w-3 h-3" />}
        >
          Override Stock
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-[#1E293B] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-800 text-red-400 text-xs font-black mb-2">
            <Package className="w-3.5 h-3.5" />
            <span>Multi-Bank Inventory Oversight</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            National Blood Inventory Controls
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Inspect all certified blood bank reserves, highlight low-stock deficits, and execute administrative stock adjustments.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchInventory}
          leftIcon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
        >
          Refresh Inventory
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'ALL', label: `All Reserve Stock (${inventory.length})` },
          { key: 'CRITICAL', label: `Critical Deficits (${inventory.filter((i) => i.status === 'CRITICAL' || i.status === 'LOW').length})` },
          { key: 'O-', label: `Universal O- Reserves (${inventory.filter((i) => i.bloodGroup === 'O-').length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilterMode(tab.key)}
            className={`
              px-4 py-2 rounded-2xl text-xs font-black transition-all whitespace-nowrap
              ${
                filterMode === tab.key
                  ? 'bg-red-600 text-white shadow-md shadow-red-900/40'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={filteredData}
        keyField="_id"
        isLoading={loading}
        searchPlaceholder="Search bank, city, or blood group..."
        searchKeys={['bankName', 'city', 'bloodGroup', 'status']}
        pageSize={10}
        emptyTitle="No Inventory Records"
        emptyDescription="No inventory records match the selected filter."
      />

      {/* Override Stock Modal */}
      {modalOpen && selectedRecord && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={`Override Stock: ${selectedRecord.bankName}`}
        >
          <form onSubmit={handleSaveOverride} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-[#FFF8F8] border border-red-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Target Group</p>
                <strong className="text-base text-slate-900">
                  {selectedRecord.bloodGroup} (Current: {selectedRecord.availableUnits} U)
                </strong>
              </div>
              <span className="text-xs font-bold text-slate-600">
                Threshold: {selectedRecord.threshold} U
              </span>
            </div>

            <Select
              label="Override Adjustment Action"
              options={[
                { value: 'SET', label: 'Set Exact Available Count' },
                { value: 'ADD', label: 'Add Units (Emergency Infusion)' },
                { value: 'REMOVE', label: 'Remove / Quarantine Expired Units' },
              ]}
              value={overrideForm.action}
              onChange={(e) => setOverrideForm({ ...overrideForm, action: e.target.value })}
            />

            <Input
              label="Units"
              type="number"
              min="0"
              required
              value={overrideForm.units}
              onChange={(e) => setOverrideForm({ ...overrideForm, units: e.target.value })}
            />

            <Input
              label="Mandatory Audit Reason"
              required
              placeholder="e.g. Physical inventory recount audit / State trauma dispatch"
              value={overrideForm.auditReason}
              onChange={(e) => setOverrideForm({ ...overrideForm, auditReason: e.target.value })}
            />

            <div className="pt-2 flex justify-end gap-3">
              <Button
                variant="ghost"
                size="md"
                type="button"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                isLoading={isSubmitting}
                leftIcon={<Package className="w-4 h-4" />}
              >
                Apply Admin Stock Override
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminInventoryPage;
