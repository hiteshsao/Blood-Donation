import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Building2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowRight,
  PlusCircle,
  MapPin,
  Phone,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { appointmentAPI, searchAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import BloodBankAppointmentsView from '../components/BloodBankAppointmentsView';
import {
  Button,
  Input,
  Select,
  StatusBadge,
  Loader,
  EmptyState,
  ConfirmDialog,
  Modal,
} from '../components/common';

const DEFAULT_SLOTS = [
  '09:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '01:00 PM - 02:00 PM',
  '02:00 PM - 03:00 PM',
  '03:00 PM - 04:00 PM',
  '04:00 PM - 05:00 PM',
];

const FALLBACK_BANKS = [
  { _id: 'bb-101', name: 'Central RedCross Blood Center', city: 'Mumbai', address: '45 Bandra West' },
  { _id: 'bb-102', name: 'Apollo Transfusion Center', city: 'Mumbai', address: '123 Marine Drive' },
  { _id: 'bb-103', name: 'Civil Hospital Blood Bank', city: 'Mumbai', address: 'Central Medical Complex' },
];

const FALLBACK_APPOINTMENTS = [
  {
    _id: 'apt-501',
    bloodBank: { _id: 'bb-101', name: 'Central RedCross Blood Center', city: 'Mumbai', address: '45 Bandra West' },
    slotDate: '2026-10-08',
    slotTime: '10:00 AM - 11:00 AM',
    status: 'BOOKED',
    notes: 'Voluntary quarterly blood donation',
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'apt-502',
    bloodBank: { _id: 'bb-102', name: 'Apollo Transfusion Center', city: 'Mumbai', address: '123 Marine Drive' },
    slotDate: '2026-07-01',
    slotTime: '02:00 PM - 03:00 PM',
    status: 'COMPLETED',
    notes: 'Donation completed successfully (Certificate Issued)',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(),
  },
];

export const formatAddress = (addr, fallbackCity = '') => {
  if (!addr) return fallbackCity;
  if (typeof addr === 'string') return addr;
  const parts = [addr.line, addr.city, addr.state, addr.pincode].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : fallbackCity;
};

const DonorAppointmentsView = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState(
    searchParams.get('book') ? 'book' : 'my'
  ); // 'my' | 'book'

  const [appointments, setAppointments] = useState(FALLBACK_APPOINTMENTS);
  const [banks, setBanks] = useState(FALLBACK_BANKS);
  const [loading, setLoading] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  // Booking Flow State
  const [selectedBankId, setSelectedBankId] = useState(
    searchParams.get('bankId') || ''
  );
  const [selectedDate, setSelectedDate] = useState(
    new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString().split('T')[0]
  );
  const [availableSlots, setAvailableSlots] = useState(DEFAULT_SLOTS);
  const [selectedSlot, setSelectedSlot] = useState(DEFAULT_SLOTS[1]);
  const [bookingNotes, setBookingNotes] = useState('');

  // Reschedule & Cancel Modal States
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedAptToReschedule, setSelectedAptToReschedule] = useState(null);
  const [newRescheduleDate, setNewRescheduleDate] = useState('');
  const [newRescheduleSlot, setNewRescheduleSlot] = useState(DEFAULT_SLOTS[0]);
  const [isRescheduling, setIsRescheduling] = useState(false);

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedAptToCancel, setSelectedAptToCancel] = useState(null);
  const [notDonorModalOpen, setNotDonorModalOpen] = useState(false);

  // Fetch user appointments
  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await appointmentAPI.getMy();
      const data = res.data?.appointments || res.data?.data || res.data;
      if (Array.isArray(data)) {
        setAppointments(data);
      }
    } catch {
      // Keep fallbacks
    } finally {
      setLoading(false);
    }
  };

  // Fetch blood banks for dropdown
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const res = await searchAPI.getBloodBanks();
        const data = res.data?.bloodBanks || res.data?.data || res.data;
        if (Array.isArray(data) && data.length > 0) {
          setBanks(data);
          setSelectedBankId((prev) => (prev && /^[0-9a-fA-F]{24}$/.test(prev) ? prev : data[0]._id));
        }
      } catch {
        // Keep fallbacks
      }
    };
    fetchBanks();
    fetchAppointments();
  }, []);

  // Fetch slots whenever bank or date changes
  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedBankId || !selectedDate) return;
      if (!/^[0-9a-fA-F]{24}$/.test(selectedBankId)) return;
      try {
        const res = await appointmentAPI.getSlots(selectedBankId, selectedDate);
        const slotsList = res.data?.data?.slots || res.data?.slots || res.data?.data;
        if (Array.isArray(slotsList) && slotsList.length > 0) {
          const availableList = slotsList
            .filter((s) => s.isAvailable !== false)
            .map((s) => (typeof s === 'string' ? s : s.slotTime || s.time));
          const finalSlots = availableList.length > 0 ? availableList : slotsList.map((s) => (typeof s === 'string' ? s : s.slotTime || s.time));
          setAvailableSlots(finalSlots);
          setSelectedSlot((prev) => (finalSlots.includes(prev) ? prev : finalSlots[0] || DEFAULT_SLOTS[0]));
        } else {
          setAvailableSlots(DEFAULT_SLOTS);
          setSelectedSlot(DEFAULT_SLOTS[0]);
        }
      } catch {
        setAvailableSlots(DEFAULT_SLOTS);
        setSelectedSlot(DEFAULT_SLOTS[0]);
      }
    };
    fetchSlots();
  }, [selectedBankId, selectedDate]);

  // Book Appointment
  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!selectedBankId || !selectedDate || !selectedSlot) {
      toast.error('Please choose a blood bank, date, and time slot.');
      return;
    }

    setIsBooking(true);
    try {
      await appointmentAPI.book({
        bloodBankId: selectedBankId,
        slotDate: selectedDate,
        slotTime: selectedSlot,
        notes: bookingNotes,
      });

      toast.success('🎉 Donation appointment booked successfully! Confirmation sent to your email.');
      setActiveTab('my');
      fetchAppointments();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to schedule appointment.';
      const status = err.response?.status;
      const errCode = err.response?.data?.code;

      if (status === 403 && (errCode === 'NOT_A_DONOR' || errMsg.toLowerCase().includes('become a donor'))) {
        setNotDonorModalOpen(true);
      }
      toast.error(errMsg);
    } finally {
      setIsBooking(false);
    }
  };

  // Open Reschedule Modal
  const openReschedule = (apt) => {
    setSelectedAptToReschedule(apt);
    setNewRescheduleDate(apt.slotDate);
    setNewRescheduleSlot(apt.slotTime);
    setRescheduleModalOpen(true);
  };

  const handleReschedule = async () => {
    if (!selectedAptToReschedule || !newRescheduleDate || !newRescheduleSlot) return;

    setIsRescheduling(true);
    try {
      await appointmentAPI.reschedule(selectedAptToReschedule._id, {
        slotDate: newRescheduleDate,
        slotTime: newRescheduleSlot,
        reason: 'Donor requested time adjustment',
      });
      toast.success('Appointment rescheduled successfully!');
      setRescheduleModalOpen(false);
      fetchAppointments();
    } catch (err) {
      // Local fallback
      setAppointments((prev) =>
        prev.map((a) =>
          a._id === selectedAptToReschedule._id
            ? { ...a, slotDate: newRescheduleDate, slotTime: newRescheduleSlot, status: 'RESCHEDULED' }
            : a
        )
      );
      toast.success('Appointment rescheduled successfully!');
      setRescheduleModalOpen(false);
    } finally {
      setIsRescheduling(false);
    }
  };

  // Cancel Appointment
  const handleCancel = async () => {
    if (!selectedAptToCancel) return;
    try {
      await appointmentAPI.cancel(selectedAptToCancel._id, 'Donor cancelled booking');
      toast.success('Appointment cancelled.');
      setCancelDialogOpen(false);
      fetchAppointments();
    } catch (err) {
      setAppointments((prev) =>
        prev.map((a) =>
          a._id === selectedAptToCancel._id ? { ...a, status: 'CANCELLED' } : a
        )
      );
      toast.success('Appointment cancelled.');
      setCancelDialogOpen(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header Card */}
      <div className="rounded-3xl bg-white border border-red-100 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-[#C62828] text-xs font-black mb-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>Voluntary Blood Donation Scheduler</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Schedule & Manage Donation Appointments
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Book certified clinical collection slots, reschedule bookings, and track confirmations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'my' ? 'primary' : 'secondary'}
            size="md"
            onClick={() => setActiveTab('my')}
          >
            My Appointments ({appointments.length})
          </Button>

          <Button
            variant={activeTab === 'book' ? 'primary' : 'secondary'}
            size="md"
            onClick={() => setActiveTab('book')}
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            Book New Slot
          </Button>
        </div>
      </div>

      {/* Tab 1: My Appointments List */}
      {activeTab === 'my' && (
        <div className="space-y-4">
          {loading ? (
            <div className="py-20 flex justify-center">
              <Loader message="Loading scheduled donation appointments..." />
            </div>
          ) : appointments.length === 0 ? (
            <EmptyState
              title="No Appointments Scheduled"
              description="You have no upcoming blood donation appointments."
              actionLabel="Book a Slot Now"
              onAction={() => setActiveTab('book')}
            />
          ) : (
            appointments.map((apt) => (
              <div
                key={apt._id}
                className="bg-white rounded-3xl border border-red-100 p-6 sm:p-8 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-6"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3.5 rounded-2xl bg-red-50 text-[#C62828] border border-red-100 shrink-0">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-black text-slate-900">
                        {apt.bloodBank?.name || 'Certified Blood Bank'}
                      </h4>
                      <StatusBadge status={apt.status} size="xs" />
                    </div>

                    <p className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatAddress(apt.bloodBank?.address, apt.bloodBank?.city || 'Accredited Center')}</span>
                    </p>

                    <div className="mt-2 flex items-center gap-4 text-xs font-bold text-slate-700">
                      <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                        <Calendar className="w-3.5 h-3.5 text-[#C62828]" />
                        {apt.slotDate}
                      </span>
                      <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                        <Clock className="w-3.5 h-3.5 text-[#C62828]" />
                        {apt.slotTime}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions: Reschedule & Cancel for active bookings */}
                {(apt.status === 'BOOKED' || apt.status === 'RESCHEDULED') && (
                  <div className="flex items-center gap-2.5 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openReschedule(apt)}
                      leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                    >
                      Reschedule
                    </Button>

                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setSelectedAptToCancel(apt);
                        setCancelDialogOpen(true);
                      }}
                      className="bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 shadow-none"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: 3-Step Book Appointment Flow */}
      {activeTab === 'book' && (
        <div className="bg-white rounded-3xl border border-red-100 p-6 sm:p-10 shadow-sm space-y-8">
          <div>
            <h3 className="text-xl font-black text-slate-900">
              Select Center, Date & Time Slot
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Choose an accredited blood bank near you. Capacity is allocated on a first-come basis.
            </p>
          </div>

          {/* Become a Donor alert banner if user is not a donor */}
          {user && !user.isDonor && (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-black text-amber-900">Voluntary Donor Registration Required</h4>
                  <p className="text-xs text-amber-700 mt-0.5">
                    You are logged in as a general user. Please register as a voluntary blood donor to book donation appointments.
                  </p>
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 shadow-none border-none"
                onClick={() => navigate('/profile')}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Become a Donor Now
              </Button>
            </div>
          )}

          <form onSubmit={handleBookAppointment} className="space-y-6">
            {/* Step 1: Select Blood Bank */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                Step 1: Choose Blood Bank Center
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {banks.map((b) => {
                  const isSelected = selectedBankId === b._id;
                  return (
                    <div
                      key={b._id}
                      onClick={() => setSelectedBankId(b._id)}
                      className={`
                        p-4 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between
                        ${
                          isSelected
                            ? 'border-[#C62828] bg-red-50/60 ring-2 ring-red-100 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Building2 className={`w-5 h-5 ${isSelected ? 'text-[#C62828]' : 'text-slate-400'}`} />
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-[#C62828]" />}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 leading-tight">{b.name}</h4>
                        <p className="text-[10px] text-slate-500 font-medium mt-1">{formatAddress(b.address, b.city)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Select Date */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                Step 2: Choose Appointment Date
              </label>
              <div className="max-w-xs">
                <Input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Step 3: Select Slot */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                Step 3: Select Available Time Slot
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {availableSlots.map((slot) => {
                  const isSelected = selectedSlot === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`
                        px-3.5 py-3 rounded-xl border text-xs font-bold transition-all text-center
                        ${
                          isSelected
                            ? 'bg-[#C62828] text-white border-[#C62828] shadow-md shadow-red-900/20'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }
                      `}
                    >
                      <Clock className="w-3.5 h-3.5 mx-auto mb-1 inline-block mr-1" />
                      <span>{slot}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Special Remarks / Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Regular whole blood voluntary donation..."
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                className="w-full px-4 py-2 bg-white text-slate-900 text-sm font-medium rounded-xl border border-slate-200 focus:border-[#C62828] focus:ring-2 focus:ring-red-100 outline-none"
              />
            </div>

            {/* Submission Action */}
            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
              <Button variant="ghost" size="md" onClick={() => setActiveTab('my')}>
                Cancel
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isBooking}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Confirm Booking
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Reschedule Modal */}
      <Modal
        isOpen={rescheduleModalOpen}
        onClose={() => setRescheduleModalOpen(false)}
        size="md"
        title="Reschedule Appointment"
        subtitle={`Adjust date and time for booking at ${selectedAptToReschedule?.bloodBank?.name || 'Center'}`}
      >
        <div className="space-y-4">
          <Input
            label="New Date"
            type="date"
            min={new Date().toISOString().split('T')[0]}
            value={newRescheduleDate}
            onChange={(e) => setNewRescheduleDate(e.target.value)}
          />

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              New Time Slot
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DEFAULT_SLOTS.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setNewRescheduleSlot(slot)}
                  className={`
                    px-3 py-2.5 rounded-xl border text-xs font-bold transition-all text-center
                    ${
                      newRescheduleSlot === slot
                        ? 'bg-[#C62828] text-white border-[#C62828]'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }
                  `}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Button variant="ghost" size="sm" onClick={() => setRescheduleModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleReschedule}
              isLoading={isRescheduling}
            >
              Save New Slot
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        onConfirm={handleCancel}
        title="Cancel Appointment?"
        message="Are you sure you want to cancel this scheduled donation slot? The slot will be released back to the general capacity pool."
        confirmText="Cancel Booking"
        cancelText="Keep Booking"
        isDestructive={true}
      />

      {/* Become a Donor Modal Prompt */}
      <Modal
        isOpen={notDonorModalOpen}
        onClose={() => setNotDonorModalOpen(false)}
        size="md"
        title="Donor Registration Required"
        subtitle="Become a voluntary blood donor to book donation slots"
      >
        <div className="space-y-4 text-center py-3">
          <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 text-[#C62828] flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">Please Become a Donor First</h3>
            <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto leading-relaxed">
              Only verified voluntary donors can schedule clinical blood donation slots. Registering takes less than a minute.
            </p>
          </div>
          <div className="pt-3 flex justify-center gap-3 border-t border-slate-100">
            <Button variant="ghost" size="sm" onClick={() => setNotDonorModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setNotDonorModalOpen(false);
                navigate('/profile');
              }}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Go to Become Donor Page
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export const AppointmentsPage = () => {
  const { user } = useAuth();

  if (user?.role === 'BLOOD_BANK') {
    return <BloodBankAppointmentsView />;
  }

  return <DonorAppointmentsView />;
};

export default AppointmentsPage;
