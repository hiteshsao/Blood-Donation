import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Building2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Search,
  Filter,
  Phone,
  Mail,
  User,
  Droplet,
  RefreshCw,
  FileText,
  AlertCircle,
  Package,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { appointmentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Button,
  Input,
  Select,
  StatusBadge,
  Loader,
  EmptyState,
  ConfirmDialog,
  Modal,
} from './common';

export const BloodBankAppointmentsView = () => {
  const { user } = useAuth();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bankInfo, setBankInfo] = useState(null);

  // Filters & Pagination State
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'BOOKED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED'
  const [dateFilter, setDateFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Action Modals State
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [selectedAptToComplete, setSelectedAptToComplete] = useState(null);
  const [completeForm, setCompleteForm] = useState({
    bagNo: '',
    units: 1,
    remarks: 'Voluntary donation procedure completed normally without adverse events.',
  });
  const [isSubmittingComplete, setIsSubmittingComplete] = useState(false);

  const [noShowModalOpen, setNoShowModalOpen] = useState(false);
  const [selectedAptToNoShow, setSelectedAptToNoShow] = useState(null);
  const [isSubmittingNoShow, setIsSubmittingNoShow] = useState(false);

  // Fetch Bank-Scoped Appointments
  const fetchAppointments = useCallback(
    async (pageToLoad = 1) => {
      setLoading(true);
      try {
        const params = {
          page: pageToLoad,
          limit: 10,
        };
        if (statusFilter !== 'ALL') {
          params.status = statusFilter;
        }
        if (dateFilter) {
          params.date = dateFilter;
        }

        const res = await appointmentAPI.getBankAppointments(params);
        const data = res.data?.appointments || res.data?.data || res.data;
        if (Array.isArray(data)) {
          setAppointments(data);
        } else {
          setAppointments([]);
        }

        if (res.data?.bloodBank) {
          setBankInfo(res.data.bloodBank);
        }

        if (res.data?.pagination) {
          setPagination(res.data.pagination);
        }
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Failed to load bank appointments.';
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, dateFilter]
  );

  useEffect(() => {
    fetchAppointments(1);
  }, [fetchAppointments]);

  // Open Complete Modal
  const handleOpenComplete = (apt) => {
    setSelectedAptToComplete(apt);
    const donorBg = apt.donor?.bloodGroup || apt.bloodGroup || 'O+';
    const cleanBg = donorBg.replace('+', 'POS').replace('-', 'NEG');
    const autoBag = `WB-${new Date().getFullYear()}-${cleanBg}-${Math.floor(1000 + Math.random() * 9000)}`;
    setCompleteForm({
      bagNo: autoBag,
      units: 1,
      remarks: 'Voluntary donation procedure completed normally without adverse events.',
    });
    setCompleteModalOpen(true);
  };

  // Submit Complete Appointment
  const handleConfirmComplete = async (e) => {
    e.preventDefault();
    if (!selectedAptToComplete) return;

    setIsSubmittingComplete(true);
    try {
      await appointmentAPI.complete(selectedAptToComplete._id, {
        units: Number(completeForm.units) || 1,
        bagNo: completeForm.bagNo,
        remarks: completeForm.remarks,
      });

      const bloodGroup = selectedAptToComplete.donor?.bloodGroup || selectedAptToComplete.bloodGroup || 'blood';
      toast.success(
        `🎉 Appointment completed! ${completeForm.units} unit of ${bloodGroup} added to inventory.`
      );
      setCompleteModalOpen(false);
      setSelectedAptToComplete(null);
      await fetchAppointments(pagination.page);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to complete appointment.';
      toast.error(msg);
    } finally {
      setIsSubmittingComplete(false);
    }
  };

  // Open No-Show Confirmation
  const handleOpenNoShow = (apt) => {
    setSelectedAptToNoShow(apt);
    setNoShowModalOpen(true);
  };

  // Confirm No-Show Action
  const handleConfirmNoShow = async () => {
    if (!selectedAptToNoShow) return;

    setIsSubmittingNoShow(true);
    try {
      await appointmentAPI.noShow(selectedAptToNoShow._id);
      toast.success('Donor appointment marked as NO-SHOW.');
      setNoShowModalOpen(false);
      setSelectedAptToNoShow(null);
      await fetchAppointments(pagination.page);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to mark appointment as no-show.';
      toast.error(msg);
    } finally {
      setIsSubmittingNoShow(false);
    }
  };

  // Filtered Appointments by Search Query
  const filteredAppointments = appointments.filter((apt) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const donorName = apt.donor?.name?.toLowerCase() || '';
    const donorEmail = apt.donor?.email?.toLowerCase() || '';
    const donorPhone = apt.donor?.phone || apt.donor?.mobile || '';
    const bloodGroup = (apt.donor?.bloodGroup || apt.bloodGroup || '').toLowerCase();
    const slotTime = apt.slotTime?.toLowerCase() || '';
    return (
      donorName.includes(query) ||
      donorEmail.includes(query) ||
      donorPhone.includes(query) ||
      bloodGroup.includes(query) ||
      slotTime.includes(query)
    );
  });

  // KPI Calculations
  const bookedCount = appointments.filter(
    (a) => a.status === 'BOOKED' || a.status === 'RESCHEDULED' || a.status === 'SCHEDULED'
  ).length;
  const completedCount = appointments.filter((a) => a.status === 'COMPLETED').length;
  const noShowCount = appointments.filter((a) => a.status === 'NO_SHOW').length;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* ── TOP HERO HEADER ── */}
      <div className="rounded-3xl bg-gradient-to-r from-red-900 via-[#B71C1C] to-[#880E4F] p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-red-100 text-xs font-black uppercase tracking-wider mb-2.5 border border-white/15">
            <Building2 className="w-3.5 h-3.5 text-red-200" />
            <span>Blood Bank Clinical Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Donor Appointments Console
          </h1>
          <p className="text-xs sm:text-sm text-red-100 font-medium max-w-2xl mt-1">
            {bankInfo?.name ? `${bankInfo.name} (${bankInfo.city || 'Regional Center'})` : user?.bloodBankName || user?.name || 'Authorized Blood Bank Facility'}{' '}
            • Review scheduled voluntary donors, mark donations to instantly credit inventory, and track no-shows.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={() => fetchAppointments(pagination.page)}
            disabled={loading}
            leftIcon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* ── STATS CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{pagination.total || appointments.length}</div>
            <div className="text-xs font-bold text-slate-500">Total Bookings</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-600">{bookedCount}</div>
            <div className="text-xs font-bold text-slate-500">Upcoming / Booked</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600">{completedCount}</div>
            <div className="text-xs font-bold text-slate-500">Donations Completed</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-black shrink-0">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-rose-600">{noShowCount}</div>
            <div className="text-xs font-bold text-slate-500">Missed Visits</div>
          </div>
        </div>
      </div>

      {/* ── FILTER TABS & SEARCH BAR ── */}
      <div className="bg-white rounded-3xl p-6 border border-red-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {[
              { key: 'ALL', label: 'All Appointments' },
              { key: 'BOOKED', label: 'Booked / Upcoming' },
              { key: 'COMPLETED', label: 'Completed' },
              { key: 'NO_SHOW', label: 'No-Show' },
              { key: 'CANCELLED', label: 'Cancelled' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`
                  px-3.5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap
                  ${
                    statusFilter === tab.key
                      ? 'bg-[#C62828] text-white shadow-md shadow-red-500/20'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Date Picker Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-xs font-bold text-slate-600 whitespace-nowrap">Filter Date:</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            {dateFilter && (
              <button
                type="button"
                onClick={() => setDateFilter('')}
                className="text-xs text-red-600 hover:text-red-800 font-bold underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by donor name, phone, email, or blood group..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* ── APPOINTMENTS LIST ── */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-20 flex justify-center bg-white rounded-3xl border border-red-100 shadow-sm">
            <Loader message="Loading blood bank appointments..." />
          </div>
        ) : filteredAppointments.length === 0 ? (
          <EmptyState
            title="No Appointments Found"
            description={
              searchQuery || statusFilter !== 'ALL' || dateFilter
                ? 'No donor bookings match your selected filters. Try changing or clearing filters.'
                : 'No voluntary donor appointments have been scheduled at this blood bank yet.'
            }
            actionLabel={statusFilter !== 'ALL' || dateFilter ? 'Show All Appointments' : undefined}
            onAction={() => {
              setStatusFilter('ALL');
              setDateFilter('');
              setSearchQuery('');
            }}
          />
        ) : (
          filteredAppointments.map((apt) => {
            const donorName = apt.donor?.name || 'Voluntary Donor';
            const donorPhone = apt.donor?.phone || apt.donor?.mobile || 'Not provided';
            const donorEmail = apt.donor?.email || '';
            const bloodGroup = apt.donor?.bloodGroup || apt.bloodGroup || 'O+';
            const formattedDate = apt.slotDate
              ? new Date(apt.slotDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : 'Scheduled Date';
            const isActionable =
              apt.status === 'BOOKED' || apt.status === 'RESCHEDULED' || apt.status === 'SCHEDULED';

            return (
              <div
                key={apt._id}
                className="bg-white rounded-3xl border border-red-100 p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                {/* Left: Donor Identity & Details */}
                <div className="flex items-start gap-4">
                  {/* Blood Group Avatar */}
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#991B1B] to-[#C62828] text-white font-black text-lg flex items-center justify-center shrink-0 shadow-md shadow-red-900/10">
                    {bloodGroup}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="text-base font-black text-slate-900">{donorName}</h4>
                      <StatusBadge status={apt.status} size="xs" />
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium flex-wrap">
                      {donorPhone && (
                        <span className="flex items-center gap-1 text-slate-600">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {donorPhone}
                        </span>
                      )}
                      {donorEmail && (
                        <span className="flex items-center gap-1 text-slate-600">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          {donorEmail}
                        </span>
                      )}
                    </div>

                    {apt.notes && (
                      <p className="text-xs text-slate-500 italic bg-amber-50/70 border border-amber-100/80 px-2.5 py-1 rounded-lg inline-block mt-1">
                        Note: &ldquo;{apt.notes}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                {/* Middle: Slot Date & Time */}
                <div className="flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-100 shrink-0">
                  <div className="p-2 rounded-xl bg-red-100 text-[#C62828]">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-900">{formattedDate}</div>
                    <div className="text-xs font-bold text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-red-500" />
                      {apt.slotTime}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {isActionable ? (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenComplete(apt)}
                        leftIcon={<CheckCircle2 className="w-4 h-4" />}
                        className="bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                      >
                        Mark Complete
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenNoShow(apt)}
                        leftIcon={<XCircle className="w-4 h-4" />}
                        className="text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                      >
                        Mark No-Show
                      </Button>
                    </>
                  ) : apt.status === 'COMPLETED' ? (
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-black border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Donation Logged & Stock Added
                      </span>
                    </div>
                  ) : apt.status === 'NO_SHOW' ? (
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-black border border-rose-200">
                        <XCircle className="w-3.5 h-3.5" />
                        Missed Scheduled Visit
                      </span>
                    </div>
                  ) : (
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold">
                        Cancelled
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── PAGINATION ── */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-red-100 shadow-sm">
          <div className="text-xs font-bold text-slate-500">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total appointments)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page <= 1 || loading}
              onClick={() => fetchAppointments(pagination.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => fetchAppointments(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* ── COMPLETE APPOINTMENT MODAL ── */}
      <Modal
        isOpen={completeModalOpen}
        onClose={() => !isSubmittingComplete && setCompleteModalOpen(false)}
        title="Complete Donor Donation"
        subtitle={`Verify clinical blood draw for ${selectedAptToComplete?.donor?.name || 'Voluntary Donor'}`}
      >
        {selectedAptToComplete && (
          <form onSubmit={handleConfirmComplete} className="space-y-4">
            <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-center justify-between">
              <div>
                <div className="text-xs text-red-600 font-bold uppercase tracking-wider">
                  Donor Blood Group
                </div>
                <div className="text-xl font-black text-slate-900 mt-0.5">
                  {selectedAptToComplete.donor?.bloodGroup || selectedAptToComplete.bloodGroup || 'O+'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500 font-bold">Scheduled Slot</div>
                <div className="text-xs font-bold text-slate-800 mt-0.5">
                  {selectedAptToComplete.slotTime}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Blood Bag Number (Serial / Barcode)
              </label>
              <Input
                type="text"
                required
                value={completeForm.bagNo}
                onChange={(e) => setCompleteForm({ ...completeForm, bagNo: e.target.value })}
                placeholder="e.g. WB-2026-OPOS-4912"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Units Collected (Standard Whole Blood Units)
              </label>
              <Input
                type="number"
                min="1"
                max="5"
                required
                value={completeForm.units}
                onChange={(e) => setCompleteForm({ ...completeForm, units: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Clinical Remarks / Procedure Notes
              </label>
              <textarea
                rows={3}
                value={completeForm.remarks}
                onChange={(e) => setCompleteForm({ ...completeForm, remarks: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Optional notes regarding the phlebotomy procedure..."
              />
            </div>

            <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl border border-emerald-200 text-xs font-medium flex items-start gap-2">
              <Package className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Completing this appointment will automatically log a verified Donation record, update the donor&apos;s next eligible donation date, and increment your facility&apos;s available stock.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="ghost"
                size="md"
                type="button"
                disabled={isSubmittingComplete}
                onClick={() => setCompleteModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                disabled={isSubmittingComplete}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isSubmittingComplete ? 'Completing...' : 'Confirm & Credit Stock'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── NO-SHOW CONFIRM DIALOG ── */}
      <ConfirmDialog
        isOpen={noShowModalOpen}
        title="Mark Appointment as No-Show?"
        message={`Are you sure you want to mark ${selectedAptToNoShow?.donor?.name || 'this donor'}'s appointment as NO-SHOW? The appointment will be closed and donor notified.`}
        confirmText={isSubmittingNoShow ? 'Marking...' : 'Yes, Mark No-Show'}
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmNoShow}
        onCancel={() => !isSubmittingNoShow && setNoShowModalOpen(false)}
      />
    </div>
  );
};

export default BloodBankAppointmentsView;
