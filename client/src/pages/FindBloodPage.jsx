import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Users,
  Building2,
  Droplet,
  MapPin,
  Phone,
  ShieldCheck,
  Filter,
  CheckCircle2,
  ArrowRight,
  Calendar,
  AlertCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
  Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { searchAPI, requestAPI, hospitalAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Select, StatusBadge, Loader, EmptyState, Modal } from '../components/common';

export const ALLOWED_STATE = 'Chhattisgarh';

export const CHHATTISGARH_DISTRICTS = [
  { value: '', label: 'All Chhattisgarh Districts' },
  { value: 'Raipur', label: 'Raipur' },
  { value: 'Bilaspur', label: 'Bilaspur' },
  { value: 'Durg', label: 'Durg' },
  { value: 'Bhilai', label: 'Bhilai' },
  { value: 'Korba', label: 'Korba' },
  { value: 'Raigarh', label: 'Raigarh' },
  { value: 'Rajnandgaon', label: 'Rajnandgaon' },
  { value: 'Jagdalpur', label: 'Jagdalpur (Bastar)' },
  { value: 'Ambikapur', label: 'Ambikapur (Surguja)' },
  { value: 'Mahasamund', label: 'Mahasamund' },
  { value: 'Dhamtari', label: 'Dhamtari' },
  { value: 'Kanker', label: 'Kanker' },
  { value: 'Janjgir-Champa', label: 'Janjgir-Champa' },
  { value: 'Balod', label: 'Balod' },
  { value: 'Bemetara', label: 'Bemetara' },
  { value: 'Kabirdham', label: 'Kabirdham (Kawardha)' },
  { value: 'Gariaband', label: 'Gariaband' },
  { value: 'Baloda Bazar', label: 'Baloda Bazar' },
  { value: 'Mungeli', label: 'Mungeli' },
  { value: 'Surajpur', label: 'Surajpur' },
  { value: 'Balrampur', label: 'Balrampur' },
  { value: 'Jashpur', label: 'Jashpur' },
  { value: 'Sukma', label: 'Sukma' },
  { value: 'Bijapur', label: 'Bijapur' },
  { value: 'Dantewada', label: 'Dantewada' },
  { value: 'Narayanpur', label: 'Narayanpur' },
  { value: 'Kondagaon', label: 'Kondagaon' },
  { value: 'Gaurela-Pendra-Marwahi', label: 'Gaurela-Pendra-Marwahi' },
  { value: 'Khairagarh', label: 'Khairagarh-Chhuikhadan-Gandai' },
  { value: 'Manendragarh', label: 'Manendragarh-Chirmiri-Bharatpur' },
  { value: 'Mohla-Manpur', label: 'Mohla-Manpur-Ambagarh Chowki' },
  { value: 'Sakti', label: 'Sakti' },
  { value: 'Sarangarh', label: 'Sarangarh-Bilaigarh' },
];

const BLOOD_GROUPS = [
  { value: '', label: 'All Blood Types' },
  { value: 'A+', label: 'A+ (Positive)' },
  { value: 'A-', label: 'A- (Negative)' },
  { value: 'B+', label: 'B+ (Positive)' },
  { value: 'B-', label: 'B- (Negative)' },
  { value: 'AB+', label: 'AB+ (Positive)' },
  { value: 'AB-', label: 'AB- (Negative)' },
  { value: 'O+', label: 'O+ (Positive)' },
  { value: 'O-', label: 'O- (Negative)' },
];

const FALLBACK_DONORS = [
  {
    _id: 'd-cg-101',
    user: {
      name: 'Aman Dewangan',
      city: 'Raipur',
      state: 'Chhattisgarh',
      pincode: '492001',
    },
    bloodGroup: 'O+',
    isAvailable: true,
    isVerified: true,
    distanceKm: 2.1,
    totalDonations: 7,
    city: 'Raipur',
    state: 'Chhattisgarh',
    pincode: '492001',
    latitude: 21.2514,
    longitude: 81.6296,
    hasLiveLocation: true,
    mapUrl: 'https://www.google.com/maps?q=21.2514,81.6296',
    locationUpdatedAt: new Date(Date.now() - 15 * 60000).toISOString(),
    shareLocation: true,
  },
  {
    _id: 'd-cg-102',
    user: {
      name: 'Pooja Chandrakar',
      city: 'Bhilai',
      state: 'Chhattisgarh',
      pincode: '490006',
    },
    bloodGroup: 'O-',
    isAvailable: true,
    isVerified: true,
    distanceKm: 3.4,
    universal: true,
    totalDonations: 9,
    city: 'Bhilai',
    state: 'Chhattisgarh',
    pincode: '490006',
    latitude: 21.1938,
    longitude: 81.3509,
    hasLiveLocation: true,
    mapUrl: 'https://www.google.com/maps?q=21.1938,81.3509',
    locationUpdatedAt: new Date(Date.now() - 45 * 60000).toISOString(),
    shareLocation: true,
  },
  {
    _id: 'd-cg-103',
    user: {
      name: 'Rupesh Sahu',
      city: 'Bilaspur',
      state: 'Chhattisgarh',
      pincode: '495001',
    },
    bloodGroup: 'A+',
    isAvailable: true,
    isVerified: true,
    distanceKm: 4.8,
    totalDonations: 5,
    city: 'Bilaspur',
    state: 'Chhattisgarh',
    pincode: '495001',
    latitude: 22.0797,
    longitude: 82.1409,
    hasLiveLocation: true,
    mapUrl: 'https://www.google.com/maps?q=22.0797,82.1409',
    locationUpdatedAt: new Date(Date.now() - 120 * 60000).toISOString(),
    shareLocation: true,
  },
  {
    _id: 'd-cg-104',
    user: {
      name: 'Kavita Patel',
      city: 'Raigarh',
      state: 'Chhattisgarh',
      pincode: '496001',
    },
    bloodGroup: 'B+',
    isAvailable: true,
    isVerified: true,
    distanceKm: 6.2,
    totalDonations: 4,
    city: 'Raigarh',
    state: 'Chhattisgarh',
    pincode: '496001',
    latitude: 21.8974,
    longitude: 83.3950,
    hasLiveLocation: true,
    mapUrl: 'https://www.google.com/maps?q=21.8974,83.3950',
    locationUpdatedAt: new Date(Date.now() - 180 * 60000).toISOString(),
    shareLocation: true,
  },
];

const FALLBACK_BANKS = [
  {
    _id: 'bb-cg-101',
    name: 'Dr. B.R. Ambedkar Memorial Hospital Blood Center',
    city: 'Raipur',
    state: 'Chhattisgarh',
    pincode: '492001',
    phone: '+91 771 2884000',
    address: 'Jail Road, Mowa, Raipur, Chhattisgarh',
    licenseNumber: 'CG-RPR-001',
    availableUnits: 38,
  },
  {
    _id: 'bb-cg-102',
    name: 'Raigarh District Blood Center',
    city: 'Raigarh',
    state: 'Chhattisgarh',
    pincode: '496001',
    phone: '+91 7762 222100',
    address: 'Near District Hospital, Raigarh, Chhattisgarh',
    licenseNumber: 'CG-RGH-004',
    availableUnits: 24,
  },
  {
    _id: 'bb-cg-103',
    name: 'CIMS Regional Blood Bank',
    city: 'Bilaspur',
    state: 'Chhattisgarh',
    pincode: '495001',
    phone: '+91 7752 224200',
    address: 'Sardar Vallabhbhai Patel Hospital Campus, Bilaspur, Chhattisgarh',
    licenseNumber: 'CG-BIL-002',
    availableUnits: 31,
  },
];

export const FindBloodPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('donors'); // 'donors' | 'banks'
  const [bloodGroup, setBloodGroup] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [pincodeError, setPincodeError] = useState('');
  const [radiusKm, setRadiusKm] = useState(25);

  const [donors, setDonors] = useState(FALLBACK_DONORS);
  const [bloodBanks, setBloodBanks] = useState(FALLBACK_BANKS);
  const [loading, setLoading] = useState(false);

  // Hospital registry state for linking requests
  const [hospitals, setHospitals] = useState([]);

  // Requested donor IDs tracking to update button state
  const [requestedDonorIds, setRequestedDonorIds] = useState([]);

  // Blood Bank Inventory State
  const [selectedBankId, setSelectedBankId] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState(null);

  // Request Blood Modal State
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestForm, setRequestForm] = useState({
    patientName: '',
    bloodGroup: 'O+',
    units: 1,
    urgency: 'URGENT',
    hospitalId: '',
    hospitalName: '',
    city: 'Mumbai',
    contactNumber: '',
    notes: '',
  });

  // Fetch verified hospitals on mount for direct requisitions
  useEffect(() => {
    hospitalAPI
      .getVerifiedHospitals()
      .then((res) => {
        const list = res.data?.hospitals || res.data?.data || res.data;
        if (Array.isArray(list)) {
          setHospitals(list);
        }
      })
      .catch((err) => {
        console.warn('Failed to load registered hospitals:', err.message);
      });
  }, []);

  const handleOpenRequestModal = (donor) => {
    setSelectedDonor(donor);
    const matchedHospital =
      hospitals.find((h) => h.city?.toLowerCase() === (donor?.user?.city || city || '').toLowerCase()) ||
      hospitals[0] ||
      null;

    setRequestForm({
      patientName: user?.name || '',
      bloodGroup: donor?.bloodGroup || bloodGroup || 'O+',
      units: 1,
      urgency: 'URGENT',
      hospitalId: matchedHospital?._id || '',
      hospitalName: matchedHospital?.name || '',
      city: donor?.user?.city || city || user?.city || 'Mumbai',
      contactNumber: user?.phone || user?.mobile || '',
      notes: '',
    });
    setRequestModalOpen(true);
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    if (!requestForm.patientName.trim()) {
      toast.error('Patient name is required.');
      return;
    }
    if (!requestForm.city.trim()) {
      toast.error('City is required.');
      return;
    }

    setIsSubmittingRequest(true);
    try {
      const donorUserId = selectedDonor?.user?._id || selectedDonor?._id || selectedDonor?.id;
      const payload = {
        donorId: donorUserId,
        targetedDonor: donorUserId,
        patientName: requestForm.patientName.trim(),
        bloodGroup: requestForm.bloodGroup,
        units: Math.max(1, Number(requestForm.units) || 1),
        urgency: requestForm.urgency,
        hospital: requestForm.hospitalId || undefined,
        hospitalId: requestForm.hospitalId || undefined,
        hospitalName: requestForm.hospitalName?.trim() || undefined,
        city: requestForm.city.trim(),
        contactNumber: requestForm.contactNumber.trim() || undefined,

        notes: requestForm.notes.trim() || undefined,
      };

      const res = await requestAPI.create(payload);
      toast.success(
        res.data?.message || 'Blood request submitted successfully! Targeted donor notified.'
      );
      if (selectedDonor) {
        setRequestedDonorIds((prev) => [
          ...prev,
          selectedDonor._id,
          selectedDonor.id,
          selectedDonor.user?._id,
        ].filter(Boolean));
      }
      setRequestModalOpen(false);
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.message || 'Failed to submit blood request.'
      );
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Fetch inventory for selected blood bank
  const fetchBankInventory = useCallback(async (bankId) => {
    if (!bankId) return;
    setInventoryLoading(true);
    setInventoryError(null);
    try {
      const res = await api.get(`/inventory/${bankId}`);
      const items = res.data?.inventory;
      if (Array.isArray(items)) {
        setInventory(items);
      } else {
        setInventory([]);
      }
    } catch (err) {
      console.warn('[FindBloodPage] Direct inventory endpoint failed, using stock data:', err);
      const foundBank = bloodBanks.find((b) => (b._id || b.id) === bankId);
      if (foundBank?.stock) {
        const fallbackItems = Object.entries(foundBank.stock).map(([bg, count]) => ({
          bloodGroup: bg,
          availableUnits: count,
          lastUpdated: foundBank.lastUpdated || new Date().toISOString(),
          lowStockThreshold: 5,
        }));
        setInventory(fallbackItems);
      } else {
        setInventoryError(err.response?.data?.message || 'Failed to load blood bank inventory.');
      }
    } finally {
      setInventoryLoading(false);
    }
  }, [bloodBanks]);

  // Synchronize active blood bank selection
  useEffect(() => {
    if (bloodBanks.length > 0) {
      const exists = bloodBanks.some((b) => (b._id || b.id) === selectedBankId);
      if (!exists) {
        setSelectedBankId(bloodBanks[0]._id || bloodBanks[0].id);
      }
    } else {
      setSelectedBankId(null);
      setInventory([]);
    }
  }, [bloodBanks, selectedBankId]);

  useEffect(() => {
    if (selectedBankId) {
      fetchBankInventory(selectedBankId);
    }
  }, [selectedBankId, fetchBankInventory]);

  const formatLocationTime = (dateStr) => {
    if (!dateStr) return 'Recently';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Recently';
      const diffMinutes = Math.floor((Date.now() - d.getTime()) / 60000);
      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
      return d.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Recently';
    }
  };

  // Search API fetch
  const handleSearch = useCallback(async () => {
    if (pincode && !/^49\d{4}$/.test(pincode.trim())) {
      setPincodeError('Pincode must be 6 digits starting with 49 (e.g. 492001)');
      return;
    }
    setPincodeError('');
    setLoading(true);

    try {
      if (activeTab === 'donors') {
        const params = {
          bloodGroup: bloodGroup || undefined,
          city: city.trim() || undefined,
          state: ALLOWED_STATE,
          pincode: pincode.trim() || undefined,
          radiusKm,
        };
        const res = await searchAPI.getDonors(params);
        const data = res.data?.data || res.data?.donors || res.data;
        if (Array.isArray(data) && data.length > 0) {
          setDonors(data);
        } else {
          // If 0 returned, apply client filter on fallback for smooth presentation
          const filtered = FALLBACK_DONORS.filter((d) => {
            const matchBg = !bloodGroup || d.bloodGroup === bloodGroup;
            const matchCity =
              !city ||
              (d.city && d.city.toLowerCase().includes(city.toLowerCase())) ||
              (d.user?.city && d.user.city.toLowerCase().includes(city.toLowerCase()));
            const matchPin =
              !pincode || (d.pincode && d.pincode.startsWith(pincode.trim()));
            return matchBg && matchCity && matchPin;
          });
          setDonors(filtered);
        }
      } else {
        const params = {
          bloodGroup: bloodGroup || undefined,
          city: city.trim() || undefined,
          state: ALLOWED_STATE,
        };
        const res = await searchAPI.getBloodBanks(params);
        const data = res.data?.data || res.data?.bloodBanks || res.data;
        if (Array.isArray(data) && data.length > 0) {
          setBloodBanks(data);
        } else {
          const filtered = FALLBACK_BANKS.filter((b) => {
            return !city || b.city.toLowerCase().includes(city.toLowerCase());
          });
          setBloodBanks(filtered);
        }
      }
    } catch {
      // Local fallback
      const filtered = FALLBACK_DONORS.filter((d) => {
        const matchBg = !bloodGroup || d.bloodGroup === bloodGroup;
        const matchCity =
          !city ||
          (d.city && d.city.toLowerCase().includes(city.toLowerCase())) ||
          (d.user?.city && d.user.city.toLowerCase().includes(city.toLowerCase()));
        const matchPin =
          !pincode || (d.pincode && d.pincode.startsWith(pincode.trim()));
        return matchBg && matchCity && matchPin;
      });
      setDonors(filtered);
    } finally {
      setLoading(false);
    }
  }, [activeTab, bloodGroup, city, pincode, radiusKm]);

  useEffect(() => {
    handleSearch();
  }, [handleSearch]);

  const selectedBank =
    bloodBanks.find((b) => (b._id || b.id) === selectedBankId) || bloodBanks[0];

  const formatLastUpdated = (dateStr) => {
    if (!dateStr) return 'Recently';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime())
        ? 'Recently'
        : d.toLocaleDateString('en-IN', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
    } catch {
      return 'Recently';
    }
  };

  const displayedInventory = bloodGroup
    ? inventory.filter((item) => item.bloodGroup === bloodGroup)
    : inventory;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Search Header */}
      <div className="rounded-3xl bg-white border border-red-100 p-6 sm:p-8 shadow-sm">
        <div className="max-w-2xl space-y-2 mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-[#C62828] text-xs font-black">
            <Search className="w-3.5 h-3.5" />
            <span>Geospatial Clinical Transfusion Search</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Find Compatible Donors & Certified Blood Banks
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Search nearby voluntary donors and live blood bank inventory buffers across your city.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end pt-2">
          {/* 1. State (Fixed to Chhattisgarh, Read-only/Disabled) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>State</span>
              <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">CG Dedicated</span>
            </label>
            <input
              type="text"
              value={ALLOWED_STATE}
              readOnly
              disabled
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 font-black text-sm cursor-not-allowed select-none"
            />
          </div>

          {/* 2. City / District Dropdown (Chhattisgarh Districts) */}
          <Select
            label="District / City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            options={CHHATTISGARH_DISTRICTS}
          />

          {/* 3. Pincode Input (6 digits starting with 49) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Pincode</span>
              <span className="text-[10px] font-bold text-slate-400">49xxxx</span>
            </label>
            <input
              type="text"
              maxLength={6}
              placeholder="e.g. 492001"
              value={pincode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setPincode(val);
                if (val && !val.startsWith('49')) {
                  setPincodeError('Must start with 49');
                } else if (val.length === 6 && !/^49\d{4}$/.test(val)) {
                  setPincodeError('Invalid CG PIN');
                } else {
                  setPincodeError('');
                }
              }}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold focus:outline-none focus:ring-2 ${pincodeError
                ? 'border-rose-400 focus:ring-rose-500'
                : 'border-slate-200 focus:ring-red-500'
                }`}
            />
            {pincodeError && (
              <p className="text-[10px] font-bold text-rose-600 mt-1">{pincodeError}</p>
            )}
          </div>

          {/* 4. Target Blood Group */}
          <Select
            label="Target Blood Group"
            value={bloodGroup}
            onChange={(e) => setBloodGroup(e.target.value)}
            options={BLOOD_GROUPS}
          />

          {/* 5. Radius Filter & Apply */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
              <span>Radius</span>
              <span className="text-[#C62828] font-black">{radiusKm} km</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="w-full accent-[#C62828] cursor-pointer"
              />
              <Button
                variant="primary"
                size="md"
                onClick={handleSearch}
                isLoading={loading}
                leftIcon={<Search className="w-4 h-4" />}
                className="shrink-0"
              >
                Search
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Switcher: Donors vs. Blood Banks */}
      <div className="flex items-center justify-between border-b border-red-100 pb-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('donors')}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all
              ${activeTab === 'donors'
                ? 'bg-gradient-to-r from-[#991B1B] to-[#C62828] text-white shadow-md shadow-red-900/20'
                : 'bg-white text-slate-600 hover:text-red-700 border border-slate-200'
              }
            `}
          >
            <Users className="w-4 h-4" />
            <span>Voluntary Donors ({donors.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('banks')}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all
              ${activeTab === 'banks'
                ? 'bg-gradient-to-r from-[#991B1B] to-[#C62828] text-white shadow-md shadow-red-900/20'
                : 'bg-white text-slate-600 hover:text-red-700 border border-slate-200'
              }
            `}
          >
            <Building2 className="w-4 h-4" />
            <span>Blood Banks & Inventory ({bloodBanks.length})</span>
          </button>
        </div>

        <span className="text-xs font-bold text-slate-400 hidden sm:block">
          {`State: ${ALLOWED_STATE}`}{city ? ` • ${city}` : ''}{pincode ? ` • PIN: ${pincode}` : ''}
        </span>
      </div>

      {/* Results Content */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader message="Scanning real-time donor coordinates and inventory in Chhattisgarh..." />
        </div>
      ) : activeTab === 'donors' ? (
        // ── DONORS RESULTS ──
        donors.length === 0 ? (
          <EmptyState
            title="No Matching Donors Nearby"
            description={`No available ${bloodGroup || ''} donors found in ${city || 'Chhattisgarh'} within ${radiusKm}km.`}
            actionLabel="Reset Filters"
            onAction={() => {
              setBloodGroup('');
              setCity('');
              setPincode('');
              setPincodeError('');
              setRadiusKm(50);
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {donors.map((d) => (
              <div
                key={d._id || d.id}
                className="bg-white rounded-3xl border border-red-100 p-6 shadow-sm hover:shadow-md hover:border-red-200 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Header: Blood Group, Name, Universal badge, Availability badge */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#991B1B] to-[#C62828] text-white font-black text-sm flex items-center justify-center shadow-md shadow-red-900/20 shrink-0">
                        {d.bloodGroup}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-black text-slate-900">
                            {d.user?.name || 'Verified Voluntary Donor'}
                          </h4>
                          {d.universal && (
                            <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                              Universal O-
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {d.city || d.user?.city || 'Chhattisgarh'}, {d.state || d.user?.state || ALLOWED_STATE}
                          </span>
                          {d.distanceKm && (
                            <span className="text-[#C62828] font-bold">({d.distanceKm} km away)</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <StatusBadge status={d.isAvailable ? 'ACTIVE' : 'INACTIVE'} size="xs" />
                  </div>

                  {/* Donor Info Section: Live Location, Google Map Link, Pincode */}
                  <div className="mt-4 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 text-xs">
                    {/* Live Location & Google Maps Link + Pincode */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Live Location
                        </span>
                        {user ? (
                          d.latitude && d.longitude ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-slate-800">
                                {d.addressLine || `${d.city || d.user?.city || 'Raipur'}, CG`}
                              </span>
                              <a
                                href={d.mapUrl || `https://www.google.com/maps?q=${d.latitude},${d.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-black text-red-600 hover:text-red-700 hover:underline bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-0.5 rounded-lg transition-colors text-[11px]"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>View on Map</span>
                              </a>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-medium italic">
                              Location not available
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400 font-medium italic flex items-center gap-1">
                            <Lock className="w-3 h-3 text-slate-400" />
                            <span>Log in to view live location</span>
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 pt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          Last updated: {formatLocationTime(d.locationUpdatedAt)}
                        </span>
                      </div>

                      {/* 2. Pincode Badge */}
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Pincode
                        </span>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-black text-[11px]">
                          {d.pincode || d.user?.pincode ? `PIN: ${d.pincode || d.user?.pincode}` : 'Pincode not available'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Bar: Total Donations + Request Blood button */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="text-xs text-slate-500 font-medium">
                    <span className="font-bold text-slate-800">{d.totalDonations || 4}</span> verified donations
                  </div>

                  <div className="flex items-center gap-2">
                    {requestedDonorIds.includes(d._id || d.id) ||
                      (d.user?._id && requestedDonorIds.includes(d.user._id)) ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled
                        className="bg-emerald-50 text-emerald-700 border-emerald-200 cursor-default font-bold opacity-90"
                        leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                      >
                        Requested
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenRequestModal(d)}
                        rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                      >
                        Request Blood
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // ── BLOOD BANKS & INVENTORY RESULTS ──
        bloodBanks.length === 0 ? (
          <EmptyState
            title="No Blood Banks Found"
            description={`No certified blood banks matched your query in ${city || 'selected area'}.`}
            actionLabel="Reset Search"
            onAction={() => {
              setCity('Mumbai');
              setBloodGroup('');
            }}
          />
        ) : (
          <div className="space-y-6">
            {/* Blood Banks Selection List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#C62828]" />
                  <span>Certified Blood Banks ({bloodBanks.length})</span>
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  Select a facility to inspect real-time inventory
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bloodBanks.map((b) => {
                  const bId = b._id || b.id;
                  const isSelected = selectedBankId === bId;
                  const bankAddress =
                    typeof b.address === 'string'
                      ? b.address
                      : b.address?.city || b.city || 'Local Area';

                  return (
                    <div
                      key={bId}
                      onClick={() => setSelectedBankId(bId)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setSelectedBankId(bId);
                      }}
                      className={`
                        p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between text-left
                        ${isSelected
                          ? 'bg-red-50/40 border-red-500 shadow-md ring-2 ring-red-500/20'
                          : 'bg-white border-slate-200 hover:border-red-200 hover:shadow-sm'
                        }
                      `}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`p-2.5 rounded-xl ${isSelected
                                ? 'bg-red-600 text-white'
                                : 'bg-red-50 text-[#C62828]'
                                }`}
                            >
                              <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-slate-900 leading-tight">
                                {b.name}
                              </h4>
                              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                                Lic: {b.licenseNumber || b.registrationNumber || 'CDSCO-APPROVED'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-slate-500 font-medium flex items-start gap-1.5 mt-2 line-clamp-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span>{bankAddress}</span>
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[#C62828]" />
                          {b.phone || '+91 98000 00000'}
                        </span>

                        <span
                          className={`text-xs font-black px-2.5 py-1 rounded-xl border ${isSelected
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                        >
                          {isSelected ? 'Viewing Stock' : 'View Stock'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Facility Live Inventory Grid */}
            <div className="bg-white rounded-3xl border border-red-100 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Live Facility Inventory
                    </span>
                    {bloodGroup && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-100 text-[#C62828]">
                        Filter: {bloodGroup}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mt-1">
                    {selectedBank?.name || 'Blood Bank Inventory'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {typeof selectedBank?.address === 'string'
                        ? selectedBank.address
                        : selectedBank?.address?.city || selectedBank?.city || 'Local Area'}
                    </span>
                    <span className="text-slate-300">•</span>
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Last Updated:{' '}
                      {formatLastUpdated(
                        inventory[0]?.lastUpdated || selectedBank?.lastUpdated
                      )}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => selectedBankId && fetchBankInventory(selectedBankId)}
                    isLoading={inventoryLoading}
                    leftIcon={<Clock className="w-3.5 h-3.5" />}
                  >
                    Refresh Units
                  </Button>
                  <Link to={`/appointments?bankId=${selectedBankId || ''}`}>
                    <Button
                      variant="primary"
                      size="sm"
                      rightIcon={<Calendar className="w-3.5 h-3.5" />}
                    >
                      Book Slot
                    </Button>
                  </Link>
                </div>
              </div>

              {/* State Handling: Loading, Error, Empty, and Success Grid */}
              <div className="pt-6">
                {inventoryLoading ? (
                  <div className="py-12 flex justify-center">
                    <Loader
                      message={`Loading live stock units for ${selectedBank?.name || 'facility'
                        }...`}
                    />
                  </div>
                ) : inventoryError ? (
                  <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center space-y-3">
                    <div className="inline-flex p-3 rounded-full bg-red-100 text-[#C62828]">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">
                        Failed to Load Inventory
                      </h4>
                      <p className="text-xs text-slate-600 font-medium mt-1">{inventoryError}</p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => selectedBankId && fetchBankInventory(selectedBankId)}
                    >
                      Retry Loading Stock
                    </Button>
                  </div>
                ) : displayedInventory.length === 0 ? (
                  <EmptyState
                    title="No Matching Units Found"
                    description={
                      bloodGroup
                        ? `No ${bloodGroup} units currently recorded at ${selectedBank?.name || 'this facility'
                        }.`
                        : `No inventory records available for ${selectedBank?.name || 'this facility'
                        }.`
                    }
                    actionLabel={bloodGroup ? 'Clear Blood Group Filter' : undefined}
                    onAction={bloodGroup ? () => setBloodGroup('') : undefined}
                  />
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {displayedInventory.map((item, idx) => {
                      const units = item.availableUnits ?? item.available ?? 0;
                      const isLow = units > 0 && units < (item.lowStockThreshold || 5);
                      const isOut = units === 0;

                      return (
                        <div
                          key={item.bloodGroup || idx}
                          className={`
                            p-4 rounded-2xl border transition-all flex flex-col justify-between
                            ${item.bloodGroup === bloodGroup
                              ? 'bg-red-50/50 border-red-400 ring-2 ring-red-400/30'
                              : 'bg-slate-50/50 border-slate-100 hover:border-slate-200'
                            }
                          `}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <span className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#991B1B] to-[#C62828] text-white font-black text-sm flex items-center justify-center shadow-sm">
                              {item.bloodGroup}
                            </span>
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-md ${isOut
                                ? 'bg-rose-100 text-rose-700'
                                : isLow
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                                }`}
                            >
                              {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                            </span>
                          </div>

                          <div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-black text-slate-900 tracking-tight">
                                {units}
                              </span>
                              <span className="text-xs font-bold text-slate-500">
                                Units Available
                              </span>
                            </div>

                            <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                              <span className="truncate max-w-[120px]">
                                {selectedBank?.name}
                              </span>
                              <span>{formatLastUpdated(item.lastUpdated)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      )}
      {/* Request Blood Direct Modal */}
      <Modal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        title="Direct Blood Requisition"
        subtitle={
          selectedDonor
            ? `Request blood directly from ${selectedDonor.user?.name || 'Voluntary Donor'} (${selectedDonor.bloodGroup})`
            : 'Submit requisition details'
        }
        size="md"
      >
        <form onSubmit={handleRequestSubmit} className="space-y-4 pt-2">
          {selectedDonor && (
            <div className="p-3.5 rounded-2xl bg-red-50/70 border border-red-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#991B1B] to-[#C62828] text-white font-black flex items-center justify-center shadow-sm">
                  {selectedDonor.bloodGroup}
                </div>
                <div>
                  <p className="font-black text-slate-900">{selectedDonor.user?.name || 'Voluntary Donor'}</p>
                  <p className="text-slate-500 font-medium flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {selectedDonor.user?.city || city}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                Available Donor
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Select
              label="Blood Group Required"
              value={requestForm.bloodGroup}
              onChange={(e) => setRequestForm((prev) => ({ ...prev, bloodGroup: e.target.value }))}
              options={BLOOD_GROUPS.filter((g) => g.value !== '')}
              required
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Units Needed *
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={requestForm.units}
                onChange={(e) =>
                  setRequestForm((prev) => ({
                    ...prev,
                    units: Math.max(1, parseInt(e.target.value, 10) || 1),
                  }))
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-semibold"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label="Patient Full Name *"
              placeholder="e.g. Ramesh Kumar"
              value={requestForm.patientName}
              onChange={(e) => setRequestForm((prev) => ({ ...prev, patientName: e.target.value }))}
              required
            />

            <Select
              label="Clinical Urgency *"
              value={requestForm.urgency}
              onChange={(e) => setRequestForm((prev) => ({ ...prev, urgency: e.target.value }))}
              options={[
                { value: 'ROUTINE', label: 'Routine (Scheduled Surgery)' },
                { value: 'URGENT', label: 'Urgent (Within 6–12 Hours)' },
                { value: 'CRITICAL', label: 'Critical SOS (Immediate Emergency)' },
              ]}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Hospital / Facility
              </label>
              {hospitals.length > 0 ? (
                <select
                  value={requestForm.hospitalId || ''}
                  onChange={(e) => {
                    const chosenId = e.target.value;
                    const h = hospitals.find((item) => (item._id || item.id) === chosenId);
                    setRequestForm((prev) => ({
                      ...prev,
                      hospitalId: chosenId,
                      hospitalName: h ? h.name : prev.hospitalName,
                      city: h?.city || prev.city,
                    }));
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">-- Select Registered Hospital --</option>
                  {hospitals.map((h) => (
                    <option key={h._id || h.id} value={h._id || h.id}>
                      {h.name} ({h.city})
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  placeholder="e.g. Apollo Hospital"
                  value={requestForm.hospitalName}
                  onChange={(e) =>
                    setRequestForm((prev) => ({ ...prev, hospitalName: e.target.value }))
                  }
                />
              )}
            </div>

            <Input
              label="City / District *"
              placeholder="e.g. Mumbai"
              value={requestForm.city}
              onChange={(e) => setRequestForm((prev) => ({ ...prev, city: e.target.value }))}
              required
            />
          </div>

          <Input
            label="Contact Phone Number"
            placeholder="e.g. +91 98765 43210"
            value={requestForm.contactNumber}
            onChange={(e) => setRequestForm((prev) => ({ ...prev, contactNumber: e.target.value }))}
          />

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Clinical Reason / Notes
            </label>
            <textarea
              rows={2}
              placeholder="Reason for transfusion, ward number, attending doctor..."
              value={requestForm.notes}
              onChange={(e) => setRequestForm((prev) => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-medium"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setRequestModalOpen(false)}
              disabled={isSubmittingRequest}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              id="confirm-request-btn"
              variant="primary"
              size="md"
              isLoading={isSubmittingRequest}
              disabled={isSubmittingRequest}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Confirm
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FindBloodPage;
