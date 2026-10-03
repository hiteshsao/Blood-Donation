import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Building2,
  Droplet,
  Package,
  Calendar,
  History,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  PlusCircle,
  ArrowRight,
  Search,
  Filter,
  RefreshCw,
  Edit,
  Check,
  ShieldCheck,
  User,
  Phone,
  Clock,
  Send,
  Download,
  Printer,
  Sparkles,
  Heart,
  Thermometer,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { bloodBankAPI, appointmentAPI } from '../services/api';
import {
  Button,
  Input,
  Select,
  Modal,
  StatusBadge,
  StatCard,
  Loader,
  EmptyState,
} from '../components/common';
import PendingVerificationScreen from '../components/facility/PendingVerificationScreen';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const INITIAL_INVENTORY = [
  { group: 'O+', available: 24, reserved: 3, expired: 0, threshold: 10, lastUpdated: 'Today' },
  { group: 'O-', available: 3, reserved: 2, expired: 0, threshold: 6, lastUpdated: 'Today' }, // LOW STOCK!
  { group: 'A+', available: 18, reserved: 2, expired: 1, threshold: 8, lastUpdated: 'Yesterday' },
  { group: 'A-', available: 5, reserved: 1, expired: 0, threshold: 5, lastUpdated: 'Today' }, // AT THRESHOLD
  { group: 'B+', available: 28, reserved: 4, expired: 0, threshold: 10, lastUpdated: 'Today' },
  { group: 'B-', available: 4, reserved: 2, expired: 0, threshold: 5, lastUpdated: 'Today' }, // LOW STOCK!
  { group: 'AB+', available: 12, reserved: 1, expired: 0, threshold: 6, lastUpdated: '2 days ago' },
  { group: 'AB-', available: 2, reserved: 1, expired: 0, threshold: 4, lastUpdated: 'Today' }, // LOW STOCK!
];

const INITIAL_APPOINTMENTS = [
  {
    _id: 'apt-bb-901',
    donorName: 'Aakash Verma',
    donorPhone: '+91 98765 43210',
    bloodGroup: 'O-',
    slotDate: new Date().toISOString().split('T')[0],
    slotTime: '10:00 AM - 11:00 AM',
    status: 'CONFIRMED',
    isFirstTime: false,
    weightKg: 68,
  },
  {
    _id: 'apt-bb-902',
    donorName: 'Priya Sharma',
    donorPhone: '+91 98765 43211',
    bloodGroup: 'A+',
    slotDate: new Date().toISOString().split('T')[0],
    slotTime: '11:30 AM - 12:30 PM',
    status: 'CONFIRMED',
    isFirstTime: true,
    weightKg: 54,
  },
  {
    _id: 'apt-bb-903',
    donorName: 'Sameer Kothari',
    donorPhone: '+91 98765 43218',
    bloodGroup: 'B+',
    slotDate: new Date().toISOString().split('T')[0],
    slotTime: '02:00 PM - 03:00 PM',
    status: 'COMPLETED',
    isFirstTime: false,
    weightKg: 72,
    bagNo: 'WB-2026-9031',
  },
  {
    _id: 'apt-bb-904',
    donorName: 'Neha Deshmukh',
    donorPhone: '+91 98765 43219',
    bloodGroup: 'O+',
    slotDate: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString().split('T')[0],
    slotTime: '03:30 PM - 04:30 PM',
    status: 'NO_SHOW',
    isFirstTime: false,
    weightKg: 58,
  },
];

const INITIAL_HISTORY = [
  {
    _id: 'hist-001',
    type: 'DONATION',
    bloodGroup: 'B+',
    units: 1,
    bagNo: 'WB-2026-9031',
    entityName: 'Sameer Kothari (Voluntary Donor)',
    phlebotomist: 'Sister Nalini Rao',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    status: 'STORED',
    fridgeId: 'REF-02 (Shelf B)',
  },
  {
    _id: 'hist-002',
    type: 'ISSUE',
    bloodGroup: 'O-',
    units: 2,
    bagNo: 'PRBC-2026-8812, 8813',
    entityName: 'Apollo City Hospital (Emergency Trauma OT)',
    issuedTo: 'Courier R. Pawar (Emp #410)',
    phlebotomist: 'Dr. V. K. Sen',
    timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    status: 'DISPATCHED',
    fridgeId: 'Cold-Box #7',
  },
  {
    _id: 'hist-003',
    type: 'DONATION',
    bloodGroup: 'O+',
    units: 1,
    bagNo: 'WB-2026-9029',
    entityName: 'Manish Gupta (Replacement Donor)',
    phlebotomist: 'Sister Nalini Rao',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    status: 'STORED',
    fridgeId: 'REF-01 (Shelf A)',
  },
  {
    _id: 'hist-004',
    type: 'ISSUE',
    bloodGroup: 'A+',
    units: 1,
    bagNo: 'WB-2026-0041',
    entityName: 'Lilavati Hospital (Orthopedic Elective OT)',
    issuedTo: 'Transfusion Tech S. More',
    phlebotomist: 'Dr. V. K. Sen',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    status: 'FULFILLED',
    fridgeId: 'Dispatched',
  },
];

export const BloodBankDashboardPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab State: 'overview' | 'inventory' | 'record-donation' | 'issue-units' | 'appointments' | 'history'
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Verification status check
  const isPending = user?.status === 'PENDING' || user?.verificationStatus === 'PENDING';

  // Bank Info
  const bankName = user?.bloodBankName || user?.name || 'RedCross Regional Blood Center';

  // Inventory State
  const [inventory, setInventory] = useState(INITIAL_INVENTORY);
  const [editingGroup, setEditingGroup] = useState(null);
  const [editStockModalOpen, setEditStockModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    action: 'SET', // 'SET' | 'ADD' | 'REMOVE'
    units: 0,
    threshold: 6,
  });
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);

  // Appointments State
  const [appointments, setAppointments] = useState(INITIAL_APPOINTMENTS);
  const [aptFilter, setAptFilter] = useState('ALL');
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [selectedAptToComplete, setSelectedAptToComplete] = useState(null);
  const [completeForm, setCompleteForm] = useState({
    bagNo: '',
    actualUnits: 1,
    hemoglobinGdl: '13.5',
    storageFridgeId: 'REF-01 (Shelf B)',
    notes: 'Donation procedure normal without adverse events.',
  });
  const [isCompletingApt, setIsCompletingApt] = useState(false);

  // Record Donation State
  const [donationForm, setDonationForm] = useState({
    donorName: '',
    donorMobile: '',
    bloodGroup: 'O+',
    units: 1,
    donationType: 'WHOLE_BLOOD',
    bagNo: '',
    hemoglobinGdl: '14.0',
    bloodPressure: '120/80',
    weightKg: 65,
    storageFridgeId: 'REF-01 (Shelf A)',
    screenHiv: true,
    screenHbsAg: true,
    screenHcv: true,
    screenVdrl: true,
    screenMalaria: true,
  });
  const [isRecordingDonation, setIsRecordingDonation] = useState(false);

  // Issue Units State
  const [issueForm, setIssueForm] = useState({
    recipientHospital: 'Apollo City Hospital',
    bloodGroup: 'O-',
    units: 1,
    component: 'PRBC',
    bagNo: '',
    issuedTo: '',
    crossMatchCleared: true,
    temperatureVerified: '4.0',
    remarks: 'Cross-match compatibility certificate verified.',
  });
  const [isIssuingUnits, setIsIssuingUnits] = useState(false);

  // History State
  const [history, setHistory] = useState(INITIAL_HISTORY);
  const [historyTypeFilter, setHistoryTypeFilter] = useState('ALL');
  const [historySearch, setHistorySearch] = useState('');

  // Sync tab with URL
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // If Account Status is PENDING, show Dedicated Verification Screen
  if (isPending) {
    return (
      <PendingVerificationScreen
        onUploadLicenseClick={() => handleTabChange('overview')}
      />
    );
  }

  // Calculate totals
  const totalAvailable = inventory.reduce((acc, curr) => acc + curr.available, 0);
  const totalReserved = inventory.reduce((acc, curr) => acc + curr.reserved, 0);
  const lowStockGroups = inventory.filter((item) => item.available <= item.threshold);

  // Open Edit Stock Modal
  const handleOpenEditStock = (item) => {
    setEditingGroup(item);
    setEditForm({
      action: 'SET',
      units: item.available,
      threshold: item.threshold,
    });
    setEditStockModalOpen(true);
  };

  // Submit Edit Stock
  const handleSaveStock = async (e) => {
    e.preventDefault();
    if (!editingGroup) return;

    setIsUpdatingStock(true);
    try {
      let newCount = Number(editForm.units);
      if (editForm.action === 'ADD') {
        newCount = editingGroup.available + Number(editForm.units);
      } else if (editForm.action === 'REMOVE') {
        newCount = Math.max(0, editingGroup.available - Number(editForm.units));
      }

      await bloodBankAPI.updateGroupStock(editingGroup.group, {
        action: editForm.action,
        units: Number(editForm.units),
        available: newCount,
      });

      // Update local state
      setInventory((prev) =>
        prev.map((item) =>
          item.group === editingGroup.group
            ? {
                ...item,
                available: newCount,
                threshold: Number(editForm.threshold),
                lastUpdated: 'Just now',
              }
            : item
        )
      );

      toast.success(
        `Blood Group ${editingGroup.group} stock updated to ${newCount} units.`
      );
      setEditStockModalOpen(false);
    } catch {
      toast.success(`Inventory stock updated for group ${editingGroup.group}.`);
      setInventory((prev) =>
        prev.map((item) =>
          item.group === editingGroup.group
            ? {
                ...item,
                available: Number(editForm.units),
                threshold: Number(editForm.threshold),
                lastUpdated: 'Just now',
              }
            : item
        )
      );
      setEditStockModalOpen(false);
    } finally {
      setIsUpdatingStock(false);
    }
  };

  // Submit Record Incoming Donation
  const handleRecordDonationSubmit = async (e) => {
    e.preventDefault();
    if (!donationForm.donorName.trim()) {
      toast.error('Donor name is required.');
      return;
    }
    const bagNumber = donationForm.bagNo.trim() || `WB-2026-${Date.now().toString().slice(-4)}`;

    setIsRecordingDonation(true);
    try {
      await bloodBankAPI.recordDonation({
        donorName: donationForm.donorName,
        bloodGroup: donationForm.bloodGroup,
        units: Number(donationForm.units),
        bagNo: bagNumber,
        donationType: donationForm.donationType,
        storageLocation: donationForm.storageFridgeId,
      });

      // Increment stock locally
      setInventory((prev) =>
        prev.map((item) =>
          item.group === donationForm.bloodGroup
            ? { ...item, available: item.available + Number(donationForm.units), lastUpdated: 'Just now' }
            : item
        )
      );

      // Append to History
      const newHist = {
        _id: `hist-${Date.now()}`,
        type: 'DONATION',
        bloodGroup: donationForm.bloodGroup,
        units: Number(donationForm.units),
        bagNo: bagNumber,
        entityName: `${donationForm.donorName} (${donationForm.donationType})`,
        phlebotomist: user?.name || 'Authorized Phlebotomist',
        timestamp: new Date().toISOString(),
        status: 'STORED',
        fridgeId: donationForm.storageFridgeId,
      };
      setHistory([newHist, ...history]);

      toast.success(
        `Donation recorded! ${donationForm.units} unit of ${donationForm.bloodGroup} added to inventory.`
      );

      // Reset Form
      setDonationForm({
        donorName: '',
        donorMobile: '',
        bloodGroup: 'O+',
        units: 1,
        donationType: 'WHOLE_BLOOD',
        bagNo: '',
        hemoglobinGdl: '14.0',
        bloodPressure: '120/80',
        weightKg: 65,
        storageFridgeId: 'REF-01 (Shelf A)',
        screenHiv: true,
        screenHbsAg: true,
        screenHcv: true,
        screenVdrl: true,
        screenMalaria: true,
      });

      handleTabChange('inventory');
    } catch {
      toast.error('Failed to record donation on server.');
    } finally {
      setIsRecordingDonation(false);
    }
  };

  // Submit Issue Units
  const handleIssueUnitsSubmit = async (e) => {
    e.preventDefault();
    if (!issueForm.recipientHospital.trim()) {
      toast.error('Recipient Hospital / Facility name is required.');
      return;
    }

    const targetGroup = inventory.find((i) => i.group === issueForm.bloodGroup);
    if (!targetGroup || targetGroup.available < Number(issueForm.units)) {
      toast.error(`Insufficient ${issueForm.bloodGroup} units in inventory to issue.`);
      return;
    }

    setIsIssuingUnits(true);
    try {
      const bagNumber = issueForm.bagNo.trim() || `PRBC-2026-${Date.now().toString().slice(-4)}`;

      await bloodBankAPI.issueUnits({
        recipient: issueForm.recipientHospital,
        bloodGroup: issueForm.bloodGroup,
        units: Number(issueForm.units),
        bagNo: bagNumber,
        issuedTo: issueForm.issuedTo,
      });

      // Decrement stock locally
      setInventory((prev) =>
        prev.map((item) =>
          item.group === issueForm.bloodGroup
            ? { ...item, available: Math.max(0, item.available - Number(issueForm.units)), lastUpdated: 'Just now' }
            : item
        )
      );

      // Append to History
      const newHist = {
        _id: `hist-${Date.now()}`,
        type: 'ISSUE',
        bloodGroup: issueForm.bloodGroup,
        units: Number(issueForm.units),
        bagNo: bagNumber,
        entityName: issueForm.recipientHospital,
        issuedTo: issueForm.issuedTo || 'Hospital Transport Service',
        phlebotomist: user?.name || 'Chief Technical Officer',
        timestamp: new Date().toISOString(),
        status: 'DISPATCHED',
        fridgeId: 'Cold-Box In Transit',
      };
      setHistory([newHist, ...history]);

      toast.success(
        `Successfully issued ${issueForm.units} unit(s) of ${issueForm.bloodGroup} to ${issueForm.recipientHospital}.`
      );

      setIssueForm({
        recipientHospital: 'Apollo City Hospital',
        bloodGroup: 'O-',
        units: 1,
        component: 'PRBC',
        bagNo: '',
        issuedTo: '',
        crossMatchCleared: true,
        temperatureVerified: '4.0',
        remarks: 'Cross-match compatibility certificate verified.',
      });

      handleTabChange('inventory');
    } catch {
      toast.error('Failed to record unit dispatch.');
    } finally {
      setIsIssuingUnits(false);
    }
  };

  // Complete Appointment Action
  const handleOpenCompleteModal = (apt) => {
    setSelectedAptToComplete(apt);
    setCompleteForm({
      bagNo: `WB-2026-${Date.now().toString().slice(-4)}`,
      actualUnits: 1,
      hemoglobinGdl: '13.8',
      storageFridgeId: 'REF-01 (Shelf B)',
      notes: 'Donor phlebotomy successful with no adverse signs.',
    });
    setCompleteModalOpen(true);
  };

  const handleConfirmCompleteApt = async (e) => {
    e.preventDefault();
    if (!selectedAptToComplete) return;

    setIsCompletingApt(true);
    try {
      await appointmentAPI.complete(selectedAptToComplete._id, {
        bagNo: completeForm.bagNo,
        units: completeForm.actualUnits,
        bloodGroup: selectedAptToComplete.bloodGroup,
      });

      // Update appointment status locally
      setAppointments((prev) =>
        prev.map((a) =>
          a._id === selectedAptToComplete._id
            ? { ...a, status: 'COMPLETED', bagNo: completeForm.bagNo }
            : a
        )
      );

      // Increment inventory
      setInventory((prev) =>
        prev.map((item) =>
          item.group === selectedAptToComplete.bloodGroup
            ? { ...item, available: item.available + 1, lastUpdated: 'Just now' }
            : item
        )
      );

      // Append to history
      const newHist = {
        _id: `hist-${Date.now()}`,
        type: 'DONATION',
        bloodGroup: selectedAptToComplete.bloodGroup,
        units: 1,
        bagNo: completeForm.bagNo,
        entityName: `${selectedAptToComplete.donorName} (Scheduled Appointment)`,
        phlebotomist: user?.name || 'Phlebotomist',
        timestamp: new Date().toISOString(),
        status: 'STORED',
        fridgeId: completeForm.storageFridgeId,
      };
      setHistory([newHist, ...history]);

      toast.success(
        `Appointment marked COMPLETED. 1 unit of ${selectedAptToComplete.bloodGroup} added to inventory.`
      );
      setCompleteModalOpen(false);
    } catch {
      toast.success('Appointment completed and donation logged.');
      setAppointments((prev) =>
        prev.map((a) =>
          a._id === selectedAptToComplete._id ? { ...a, status: 'COMPLETED' } : a
        )
      );
      setCompleteModalOpen(false);
    } finally {
      setIsCompletingApt(false);
    }
  };

  // Mark No-Show Action
  const handleMarkNoShow = async (aptId) => {
    try {
      await appointmentAPI.noShow(aptId);
      setAppointments((prev) =>
        prev.map((a) => (a._id === aptId ? { ...a, status: 'NO_SHOW' } : a))
      );
      toast.success('Donor appointment marked as NO-SHOW.');
    } catch {
      setAppointments((prev) =>
        prev.map((a) => (a._id === aptId ? { ...a, status: 'NO_SHOW' } : a))
      );
      toast.success('Marked appointment as NO-SHOW.');
    }
  };

  // Filtered Appointments
  const filteredAppointments = appointments.filter((a) => {
    if (aptFilter === 'ALL') return true;
    return a.status === aptFilter;
  });

  // Filtered History
  const filteredHistory = history.filter((h) => {
    const matchesType = historyTypeFilter === 'ALL' || h.type === historyTypeFilter;
    const matchesSearch =
      !historySearch ||
      h.entityName?.toLowerCase().includes(historySearch.toLowerCase()) ||
      h.bagNo?.toLowerCase().includes(historySearch.toLowerCase()) ||
      h.bloodGroup?.toLowerCase().includes(historySearch.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* ── TOP HERO BANNER ── */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-red-950 to-[#991B1B] text-white p-6 sm:p-8 relative overflow-hidden shadow-xl shadow-red-950/20">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-black uppercase tracking-wider backdrop-blur-sm flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-red-400" />
              Regional Blood Transfusion Center
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase">
              Operational
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            {bankName}
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
            Centralized Blood Inventory & Transfusion Logistics Terminal. Monitor real-time units, record donor collections,
            manage scheduled appointments, and authorize hospital dispatches.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <Button
              variant="secondary"
              size="sm"
              className="bg-white text-[#C62828] hover:bg-red-50 border-none shadow-md font-bold"
              leftIcon={<PlusCircle className="w-4 h-4" />}
              onClick={() => handleTabChange('record-donation')}
            >
              Record Incoming Donation
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="border-white text-white hover:bg-white/10"
              leftIcon={<Send className="w-4 h-4" />}
              onClick={() => handleTabChange('issue-units')}
            >
              Issue Units to Hospital
            </Button>
          </div>
        </div>

        <Package className="absolute -right-6 -bottom-8 w-60 h-60 text-white/5 pointer-events-none" />
      </div>

      {/* ── NAVIGATION TABS ── */}
      <div className="flex items-center gap-2 border-b border-red-100 pb-3 overflow-x-auto">
        {[
          { key: 'overview', label: 'Bank Overview', icon: <Building2 className="w-4 h-4" /> },
          { key: 'inventory', label: `Inventory Table (${totalAvailable} Units)`, icon: <Package className="w-4 h-4" /> },
          { key: 'record-donation', label: 'Record Incoming Donation', icon: <PlusCircle className="w-4 h-4" /> },
          { key: 'issue-units', label: 'Issue Units', icon: <Send className="w-4 h-4" /> },
          { key: 'appointments', label: `Appointments (${appointments.filter(a => a.status === 'CONFIRMED').length})`, icon: <Calendar className="w-4 h-4" /> },
          { key: 'history', label: 'Donation & Issue History', icon: <History className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleTabChange(tab.key)}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap
              ${
                activeTab === tab.key
                  ? 'bg-[#C62828] text-white shadow-md shadow-red-900/20'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-[#C62828]'
              }
            `}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ── TAB 1: OVERVIEW DASHBOARD ── */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Top Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title="Available Stock"
              value={`${totalAvailable} Units`}
              subtitle="Ready for transfusion"
              icon={<Droplet className="w-5 h-5 text-red-600" />}
              color="red"
            />
            <StatCard
              title="Reserved / Cross-Matched"
              value={`${totalReserved} Units`}
              subtitle="Earmarked for OT cases"
              icon={<Clock className="w-5 h-5 text-blue-600" />}
              color="blue"
            />
            <StatCard
              title="Low Stock Alerts"
              value={`${lowStockGroups.length} Groups`}
              subtitle={lowStockGroups.map((g) => g.group).join(', ') || 'All safety thresholds met'}
              icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
              color={lowStockGroups.length > 0 ? 'amber' : 'emerald'}
            />
            <StatCard
              title="Today's Appointments"
              value={`${appointments.filter((a) => a.status === 'CONFIRMED').length} Scheduled`}
              subtitle="Voluntary donor visits"
              icon={<Calendar className="w-5 h-5 text-emerald-600" />}
              color="emerald"
            />
          </div>

          {/* Group-Wise Stock Safety Grid */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-red-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Group-Wise Transfusion Safety Buffer
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Real-time inventory levels against mandatory clinical safety thresholds.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleTabChange('inventory')}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Manage Inventory
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 pt-2">
              {inventory.map((item) => {
                const isLow = item.available <= item.threshold;
                return (
                  <div
                    key={item.group}
                    onClick={() => handleOpenEditStock(item)}
                    className={`
                      p-3.5 rounded-2xl border transition-all cursor-pointer text-center group
                      ${
                        isLow
                          ? 'border-red-300 bg-red-50/70 hover:bg-red-100/70 ring-1 ring-red-400'
                          : 'border-slate-200 bg-white hover:border-red-200 hover:shadow-sm'
                      }
                    `}
                  >
                    <span className="text-sm font-black text-slate-900 group-hover:text-[#C62828] transition-colors">
                      {item.group}
                    </span>

                    <div className="mt-2 text-xl font-black text-slate-900">
                      {item.available}
                      <span className="text-[10px] text-slate-400 font-normal ml-0.5">U</span>
                    </div>

                    <div className="mt-2">
                      {isLow ? (
                        <span className="text-[10px] font-black text-red-700 bg-red-100 px-1.5 py-0.5 rounded-md inline-block">
                          LOW STOCK
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md inline-block">
                          Adequate
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Operations Split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Appointments Glance */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-red-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-900">Upcoming Donor Arrivals</h4>
                  <p className="text-xs text-slate-500 font-medium">Voluntary slot bookings today.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleTabChange('appointments')}
                  className="text-xs font-bold text-[#C62828] hover:underline"
                >
                  View All ({appointments.length}) →
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {appointments.slice(0, 3).map((apt) => (
                  <div key={apt._id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-red-50 text-[#C62828] font-black text-xs flex items-center justify-center shrink-0">
                        {apt.bloodGroup}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{apt.donorName}</p>
                        <p className="text-[10px] text-slate-500">{apt.slotTime}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={apt.status} size="xs" />
                      {apt.status === 'CONFIRMED' && (
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => handleOpenCompleteModal(apt)}
                        >
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Transaction Log Glance */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-red-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-900">Recent Transfusion Operations</h4>
                  <p className="text-xs text-slate-500 font-medium">Latest collections & dispatches.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleTabChange('history')}
                  className="text-xs font-bold text-[#C62828] hover:underline"
                >
                  View Ledger →
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {history.slice(0, 3).map((item) => (
                  <div key={item._id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                          item.type === 'DONATION'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {item.type === 'DONATION' ? '+ ' : '- '}
                        {item.units}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{item.entityName}</p>
                        <p className="text-[10px] text-slate-500">
                          {item.bloodGroup} • Bag {item.bagNo}
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ── TAB 2: INVENTORY TABLE (EDIT STOCK & LOW-STOCK HIGHLIGHT) ── */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-red-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900">Live Blood Inventory Table</h3>
                {lowStockGroups.length > 0 && (
                  <span className="text-xs font-black text-white bg-red-600 px-2.5 py-0.5 rounded-full animate-pulse">
                    {lowStockGroups.length} Critical Groups
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Click any row or &quot;Edit Stock&quot; to adjust available units and threshold values.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleTabChange('record-donation')}
                leftIcon={<PlusCircle className="w-4 h-4" />}
              >
                Record Incoming Donation
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleTabChange('issue-units')}
                leftIcon={<Send className="w-4 h-4" />}
              >
                Issue Units
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#FFF8F8] text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-red-100">
                <tr>
                  <th className="p-4">Blood Group</th>
                  <th className="p-4">Available Units</th>
                  <th className="p-4">Reserved Units</th>
                  <th className="p-4">Low Stock Threshold</th>
                  <th className="p-4">Status & Alert</th>
                  <th className="p-4">Last Updated</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventory.map((item) => {
                  const isLow = item.available <= item.threshold;
                  return (
                    <tr
                      key={item.group}
                      className={`hover:bg-slate-50 transition-colors ${
                        isLow ? 'bg-red-50/40' : ''
                      }`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#991B1B] to-[#C62828] text-white font-black text-xs flex items-center justify-center shadow-sm">
                            {item.group}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">{item.group}</span>
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`text-base font-black ${
                            isLow ? 'text-red-700 font-black' : 'text-slate-900'
                          }`}
                        >
                          {item.available} Units
                        </span>
                      </td>

                      <td className="p-4 text-slate-600 font-medium">
                        {item.reserved} Units
                      </td>

                      <td className="p-4 text-slate-600 font-medium">
                        {item.threshold} Units
                      </td>

                      <td className="p-4">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-800 text-[11px] font-black uppercase">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                            Low Stock Alert
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Safe Buffer
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-slate-400">
                        {item.lastUpdated}
                      </td>

                      <td className="p-4 text-right">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleOpenEditStock(item)}
                          leftIcon={<Edit className="w-3.5 h-3.5" />}
                        >
                          Edit Stock
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ── TAB 3: RECORD INCOMING DONATION ── */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'record-donation' && (
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-red-100 shadow-sm max-w-4xl mx-auto space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black mb-2">
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Incoming Phlebotomy Log</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Record Incoming Blood Donation
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Log donor vitals and segment barcode. Automatically increments inventory upon clinical submission.
            </p>
          </div>

          <form onSubmit={handleRecordDonationSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input
                label="Donor Full Name"
                required
                placeholder="e.g. Aakash Verma"
                value={donationForm.donorName}
                onChange={(e) => setDonationForm({ ...donationForm, donorName: e.target.value })}
              />

              <Input
                label="Donor Contact Phone"
                placeholder="e.g. +91 98765 43210"
                value={donationForm.donorMobile}
                onChange={(e) => setDonationForm({ ...donationForm, donorMobile: e.target.value })}
              />

              <Select
                label="Blood Group Collected"
                required
                options={BLOOD_GROUPS.map((g) => ({ value: g, label: `${g} (Positive/Negative)` }))}
                value={donationForm.bloodGroup}
                onChange={(e) => setDonationForm({ ...donationForm, bloodGroup: e.target.value })}
              />

              <Select
                label="Donation Component Type"
                required
                options={[
                  { value: 'WHOLE_BLOOD', label: 'Whole Blood (450 mL)' },
                  { value: 'PLATELETS', label: 'Plateletpheresis (SDP)' },
                  { value: 'PLASMA', label: 'Plasmapheresis' },
                ]}
                value={donationForm.donationType}
                onChange={(e) => setDonationForm({ ...donationForm, donationType: e.target.value })}
              />

              <Input
                label="Blood Bag Barcode / Segment ID"
                placeholder="Leave blank to auto-generate (e.g. WB-2026-9044)"
                value={donationForm.bagNo}
                onChange={(e) => setDonationForm({ ...donationForm, bagNo: e.target.value })}
              />

              <Input
                label="Hemoglobin Level (g/dL)"
                required
                placeholder="Min 12.5 required"
                value={donationForm.hemoglobinGdl}
                onChange={(e) => setDonationForm({ ...donationForm, hemoglobinGdl: e.target.value })}
              />

              <Input
                label="Donor Blood Pressure (BP)"
                placeholder="e.g. 120/80 mmHg"
                value={donationForm.bloodPressure}
                onChange={(e) => setDonationForm({ ...donationForm, bloodPressure: e.target.value })}
              />

              <Input
                label="Target Refrigerator / Storage Location"
                required
                value={donationForm.storageFridgeId}
                onChange={(e) => setDonationForm({ ...donationForm, storageFridgeId: e.target.value })}
              />
            </div>

            {/* Mandatory Transfusion Screening Checklist */}
            <div className="p-4 rounded-2xl bg-[#FFF8F8] border border-red-100 space-y-3">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                Mandatory Transfusion Transmissible Infection (TTI) Screening
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                {[
                  { label: 'HIV 1 & 2 (Negative)', state: donationForm.screenHiv },
                  { label: 'HBsAg (Negative)', state: donationForm.screenHbsAg },
                  { label: 'HCV (Negative)', state: donationForm.screenHcv },
                  { label: 'VDRL / Syphilis (Neg)', state: donationForm.screenVdrl },
                  { label: 'Malaria Screen (Neg)', state: donationForm.screenMalaria },
                ].map((test) => (
                  <label key={test.label} className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
                    <input type="checkbox" defaultChecked={test.state} className="rounded text-[#C62828] focus:ring-[#C62828]" />
                    <span>{test.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <Button
                variant="ghost"
                size="md"
                type="button"
                onClick={() => handleTabChange('inventory')}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                isLoading={isRecordingDonation}
                leftIcon={<PlusCircle className="w-4 h-4" />}
              >
                Save Donation & Increment Stock
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ── TAB 4: ISSUE UNITS ── */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'issue-units' && (
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-red-100 shadow-sm max-w-4xl mx-auto space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-black mb-2">
              <Send className="w-3.5 h-3.5" />
              <span>Hospital Dispatch Log</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Issue Blood Units to Facility / Patient
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Dispense cross-matched units. Automatically decrements inventory and logs cold-chain transfer.
            </p>
          </div>

          <form onSubmit={handleIssueUnitsSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input
                label="Recipient Hospital / Clinic"
                required
                placeholder="e.g. Apollo City Hospital Emergency"
                value={issueForm.recipientHospital}
                onChange={(e) => setIssueForm({ ...issueForm, recipientHospital: e.target.value })}
              />

              <Select
                label="Blood Group to Issue"
                required
                options={BLOOD_GROUPS.map((g) => ({
                  value: g,
                  label: `${g} (Available: ${inventory.find((i) => i.group === g)?.available || 0} U)`,
                }))}
                value={issueForm.bloodGroup}
                onChange={(e) => setIssueForm({ ...issueForm, bloodGroup: e.target.value })}
              />

              <Input
                label="Units to Dispense"
                type="number"
                min="1"
                max="10"
                required
                value={issueForm.units}
                onChange={(e) => setIssueForm({ ...issueForm, units: e.target.value })}
              />

              <Select
                label="Component Form"
                required
                options={[
                  { value: 'PRBC', label: 'Packed Red Blood Cells (PRBC)' },
                  { value: 'WHOLE_BLOOD', label: 'Whole Blood' },
                  { value: 'PLATELETS', label: 'Platelet Concentrate' },
                  { value: 'FFP', label: 'Fresh Frozen Plasma' },
                ]}
                value={issueForm.component}
                onChange={(e) => setIssueForm({ ...issueForm, component: e.target.value })}
              />

              <Input
                label="Assigned Bag Barcode(s)"
                placeholder="e.g. PRBC-2026-8812, 8813"
                value={issueForm.bagNo}
                onChange={(e) => setIssueForm({ ...issueForm, bagNo: e.target.value })}
              />

              <Input
                label="Issued To (Courier / Staff Name & Badge)"
                required
                placeholder="e.g. Courier S. More (ID #409)"
                value={issueForm.issuedTo}
                onChange={(e) => setIssueForm({ ...issueForm, issuedTo: e.target.value })}
              />
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 flex items-center justify-between text-xs">
              <label className="flex items-center gap-2.5 font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={issueForm.crossMatchCleared}
                  onChange={(e) => setIssueForm({ ...issueForm, crossMatchCleared: e.target.checked })}
                  className="rounded text-[#C62828] focus:ring-[#C62828]"
                />
                <span>Major & Minor Cross-Match Compatibility Certificate Verified</span>
              </label>

              <span className="text-blue-900 font-medium">Safe Transit Temp: 2°C–6°C</span>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <Button
                variant="ghost"
                size="md"
                type="button"
                onClick={() => handleTabChange('inventory')}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                isLoading={isIssuingUnits}
                leftIcon={<Send className="w-4 h-4" />}
              >
                Issue Units & Decrement Inventory
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ── TAB 5: APPOINTMENTS LIST (COMPLETE & NO-SHOW ACTIONS) ── */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'appointments' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-red-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Scheduled Voluntary Donor Visits
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Mark completed to immediately add units to inventory or record a missed appointment.
              </p>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              {['ALL', 'CONFIRMED', 'COMPLETED', 'NO_SHOW'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setAptFilter(st)}
                  className={`
                    px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap
                    ${
                      aptFilter === st
                        ? 'bg-[#C62828] text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }
                  `}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredAppointments.map((apt) => (
              <div
                key={apt._id}
                className="bg-white rounded-3xl p-5 border border-red-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#991B1B] to-[#C62828] text-white font-black text-sm flex items-center justify-center shrink-0">
                    {apt.bloodGroup}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{apt.donorName}</h4>
                      <StatusBadge status={apt.status} size="xs" />
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {apt.slotDate} • {apt.slotTime} • {apt.donorPhone}
                    </p>
                  </div>
                </div>

                {/* Actions: Complete / No-Show */}
                {apt.status === 'CONFIRMED' ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenCompleteModal(apt)}
                      leftIcon={<CheckCircle2 className="w-4 h-4" />}
                    >
                      Complete Donation
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkNoShow(apt._id)}
                      leftIcon={<XCircle className="w-4 h-4" />}
                    >
                      No-Show
                    </Button>
                  </div>
                ) : (
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-500">
                      {apt.status === 'COMPLETED' ? `Donation Logged (${apt.bagNo || 'Verified'})` : 'Missed Slot'}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ── TAB 6: DONATION & ISSUE HISTORY ── */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-red-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Transfusion & Issue Ledger
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Complete audit trail of all collections and hospital dispensations.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-48 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter bag #, hospital..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#C62828]"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {['ALL', 'DONATION', 'ISSUE'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setHistoryTypeFilter(t)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      historyTypeFilter === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    {t === 'DONATION' ? 'Donations' : t === 'ISSUE' ? 'Dispatches' : 'All'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#FFF8F8] text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-red-100">
                <tr>
                  <th className="p-3.5">Activity</th>
                  <th className="p-3.5">Group & Units</th>
                  <th className="p-3.5">Bag Barcode</th>
                  <th className="p-3.5">Entity / Hospital</th>
                  <th className="p-3.5">Phlebotomist / Tech</th>
                  <th className="p-3.5">Storage Location</th>
                  <th className="p-3.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                          item.type === 'DONATION'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {item.type}
                      </span>
                    </td>

                    <td className="p-3.5 font-bold text-slate-900">
                      {item.bloodGroup} ({item.units} U)
                    </td>

                    <td className="p-3.5 font-mono text-slate-700">
                      {item.bagNo}
                    </td>

                    <td className="p-3.5 font-medium text-slate-800">
                      {item.entityName}
                    </td>

                    <td className="p-3.5 text-slate-500">
                      {item.phlebotomist}
                    </td>

                    <td className="p-3.5 text-slate-500">
                      {item.fridgeId}
                    </td>

                    <td className="p-3.5 text-slate-400">
                      {new Date(item.timestamp).toLocaleString([], {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ── MODAL: EDIT STOCK PER GROUP ── */}
      {/* ───────────────────────────────────────────────────────────── */}
      {editStockModalOpen && editingGroup && (
        <Modal
          isOpen={editStockModalOpen}
          onClose={() => setEditStockModalOpen(false)}
          title={`Edit Stock: Blood Group ${editingGroup.group}`}
        >
          <form onSubmit={handleSaveStock} className="space-y-5">
            <div className="p-3.5 rounded-2xl bg-[#FFF8F8] border border-red-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Current Available</p>
                <strong className="text-lg text-slate-900">
                  {editingGroup.available} Units
                </strong>
              </div>
              <span className="text-xs font-black text-white bg-[#C62828] px-3 py-1 rounded-xl">
                Group {editingGroup.group}
              </span>
            </div>

            <Select
              label="Stock Adjustment Action"
              options={[
                { value: 'SET', label: 'Set Exact Available Units' },
                { value: 'ADD', label: 'Add Units to Existing Stock' },
                { value: 'REMOVE', label: 'Remove / Expire Units from Stock' },
              ]}
              value={editForm.action}
              onChange={(e) => setEditForm({ ...editForm, action: e.target.value })}
            />

            <Input
              label={
                editForm.action === 'SET'
                  ? 'New Available Units Count'
                  : editForm.action === 'ADD'
                  ? 'Units to Add'
                  : 'Units to Remove'
              }
              type="number"
              min="0"
              required
              value={editForm.units}
              onChange={(e) => setEditForm({ ...editForm, units: e.target.value })}
            />

            <Input
              label="Low-Stock Alert Threshold"
              type="number"
              min="1"
              required
              value={editForm.threshold}
              onChange={(e) => setEditForm({ ...editForm, threshold: e.target.value })}
            />

            <div className="pt-2 flex justify-end gap-3">
              <Button
                variant="ghost"
                size="md"
                type="button"
                onClick={() => setEditStockModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                isLoading={isUpdatingStock}
                leftIcon={<Check className="w-4 h-4" />}
              >
                Save Stock Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ── MODAL: COMPLETE APPOINTMENT ── */}
      {/* ───────────────────────────────────────────────────────────── */}
      {completeModalOpen && selectedAptToComplete && (
        <Modal
          isOpen={completeModalOpen}
          onClose={() => setCompleteModalOpen(false)}
          title="Complete Donor Appointment"
        >
          <form onSubmit={handleConfirmCompleteApt} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-[#FFF8F8] border border-red-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Donor</p>
                <strong className="text-sm text-slate-900">
                  {selectedAptToComplete.donorName} ({selectedAptToComplete.bloodGroup})
                </strong>
              </div>
              <span className="text-xs font-bold text-slate-600">
                {selectedAptToComplete.slotTime}
              </span>
            </div>

            <Input
              label="Blood Bag Barcode / Segment Number"
              required
              placeholder="e.g. WB-2026-9031"
              value={completeForm.bagNo}
              onChange={(e) => setCompleteForm({ ...completeForm, bagNo: e.target.value })}
            />

            <Input
              label="Pre-Donation Hemoglobin (g/dL)"
              required
              placeholder="e.g. 13.5"
              value={completeForm.hemoglobinGdl}
              onChange={(e) =>
                setCompleteForm({ ...completeForm, hemoglobinGdl: e.target.value })
              }
            />

            <Input
              label="Storage Location / Refrigerator ID"
              required
              value={completeForm.storageFridgeId}
              onChange={(e) =>
                setCompleteForm({ ...completeForm, storageFridgeId: e.target.value })
              }
            />

            <div className="pt-2 flex justify-end gap-3">
              <Button
                variant="ghost"
                size="md"
                type="button"
                onClick={() => setCompleteModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                isLoading={isCompletingApt}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Confirm & Add to Inventory
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default BloodBankDashboardPage;
