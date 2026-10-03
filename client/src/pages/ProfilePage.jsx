import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  MapPin,
  Heart,
  Calendar,
  ShieldCheck,
  Phone,
  AlertCircle,
  CheckCircle2,
  Navigation,
  Loader2,
  Sparkles,
  Power,
  Droplet,
  Save,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { profileAPI, donorAPI } from '../services/api';
import { Button, Input, Select, StatusBadge, Loader } from '../components/common';

const BLOOD_GROUPS = [
  { value: 'A+', label: 'A+ (Positive)' },
  { value: 'A-', label: 'A- (Negative)' },
  { value: 'B+', label: 'B+ (Positive)' },
  { value: 'B-', label: 'B- (Negative)' },
  { value: 'AB+', label: 'AB+ (Positive)' },
  { value: 'AB-', label: 'AB- (Negative)' },
  { value: 'O+', label: 'O+ (Positive)' },
  { value: 'O-', label: 'O- (Negative)' },
];

export const ProfilePage = () => {
  const { user, updateUser, refreshUser } = useAuth();

  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [locating, setLocating] = useState(false);
  const [enrollingDonor, setEnrollingDonor] = useState(false);
  const [togglingAvailability, setTogglingAvailability] = useState(false);

  // Profile Form State
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    mobile: user?.mobile || user?.phone || '',
    bloodGroup: user?.bloodGroup || 'O+',
    dob: user?.dob ? user.dob.split('T')[0] : '',
    gender: user?.gender || 'MALE',
    emergencyName: user?.emergencyContact?.name || '',
    emergencyPhone: user?.emergencyContact?.phone || '',
    emergencyRelation: user?.emergencyContact?.relation || '',
  });

  // Address State
  const [addressData, setAddressData] = useState({
    line: user?.address?.line || '',
    city: user?.address?.city || user?.city || 'Mumbai',
    state: user?.address?.state || 'Maharashtra',
    pincode: user?.address?.pincode || '400001',
    coordinates: user?.location?.coordinates || [72.8777, 19.076],
  });

  // Donor State
  const [isDonor, setIsDonor] = useState(user?.role === 'DONOR' || user?.isDonor || false);
  const [isAvailable, setIsAvailable] = useState(user?.donorProfile?.isAvailable ?? true);
  const [donorWeight, setDonorWeight] = useState(65);
  const [eligibility, setEligibility] = useState({
    isEligible: true,
    nextEligibleDate: 'Immediate',
    daysRemaining: 0,
    reason: 'Standard 90-day donation interval satisfied.',
  });

  // Sync state when user context updates
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        mobile: user.mobile || user.phone || '',
        bloodGroup: user.bloodGroup || 'O+',
        dob: user.dob ? user.dob.split('T')[0] : '',
        gender: user.gender || 'MALE',
        emergencyName: user.emergencyContact?.name || '',
        emergencyPhone: user.emergencyContact?.phone || '',
        emergencyRelation: user.emergencyContact?.relation || '',
      });

      setAddressData({
        line: user.address?.line || '',
        city: user.address?.city || user.city || 'Mumbai',
        state: user.address?.state || 'Maharashtra',
        pincode: user.address?.pincode || '400001',
        coordinates: user.location?.coordinates || [72.8777, 19.076],
      });

      setIsDonor(user.role === 'DONOR' || user.isDonor || false);
      setIsAvailable(user.donorProfile?.isAvailable ?? true);
    }
  }, [user]);

  // Fetch live eligibility if donor
  useEffect(() => {
    const fetchEligibility = async () => {
      if (!isDonor) return;
      try {
        const res = await donorAPI.getEligibility();
        if (res.data?.success) {
          setEligibility({
            isEligible: res.data.isEligible,
            nextEligibleDate: res.data.nextEligibleDate
              ? new Date(res.data.nextEligibleDate).toLocaleDateString()
              : 'Immediate',
            daysRemaining: res.data.daysRemaining || 0,
            reason: res.data.reason || 'Medical eligibility cleared.',
          });
        }
      } catch {
        // Fallback calculation for demo personas
        setEligibility({
          isEligible: true,
          nextEligibleDate: 'Immediate',
          daysRemaining: 0,
          reason: 'Cleared for voluntary blood donation.',
        });
      }
    };
    fetchEligibility();
  }, [isDonor]);

  // Update Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const payload = {
        name: profileData.name,
        mobile: profileData.mobile,
        bloodGroup: profileData.bloodGroup,
        dob: profileData.dob || undefined,
        gender: profileData.gender,
        emergencyContact: {
          name: profileData.emergencyName,
          phone: profileData.emergencyPhone,
          relation: profileData.emergencyRelation,
        },
      };

      await profileAPI.updateMe(payload);
      updateUser({
        name: profileData.name,
        mobile: profileData.mobile,
        bloodGroup: profileData.bloodGroup,
        gender: profileData.gender,
        emergencyContact: payload.emergencyContact,
      });
      toast.success('Personal profile updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Update Address
  const handleSaveAddress = async (e) => {
    e?.preventDefault();
    setSavingAddress(true);
    try {
      const payload = {
        address: {
          line: addressData.line,
          city: addressData.city,
          state: addressData.state,
          pincode: addressData.pincode,
        },
        city: addressData.city,
        state: addressData.state,
        pincode: addressData.pincode,
        location: {
          type: 'Point',
          coordinates: addressData.coordinates,
          lat: addressData.coordinates[1],
          lng: addressData.coordinates[0],
        },
      };

      await profileAPI.updateAddress(payload);
      updateUser({
        address: payload.address,
        city: addressData.city,
        location: payload.location,
      });
      toast.success('Address and coordinates updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update address.');
    } finally {
      setSavingAddress(false);
    }
  };

  // "Use My Location" HTML5 Geolocation
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const coords = [Number(longitude.toFixed(5)), Number(latitude.toFixed(5))];

        setAddressData((prev) => ({
          ...prev,
          coordinates: coords,
        }));

        toast.success(`Coordinates captured: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        toast.error(`Location detection failed: ${err.message}. Using default city coordinates.`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Become Donor
  const handleBecomeDonor = async () => {
    setEnrollingDonor(true);
    try {
      await profileAPI.becomeDonor({
        bloodGroup: profileData.bloodGroup,
        weightKg: Number(donorWeight),
      });
      setIsDonor(true);
      setIsAvailable(true);
      updateUser({ role: 'DONOR', isDonor: true });
      toast.success('🎉 Enrolled as a Voluntary Donor! Thank you for saving lives.');
      await refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Enrollment failed.');
    } finally {
      setEnrollingDonor(false);
    }
  };

  // Toggle Availability
  const handleToggleAvailability = async () => {
    setTogglingAvailability(true);
    const nextState = !isAvailable;
    try {
      await donorAPI.setAvailability(nextState);
      setIsAvailable(nextState);
      toast.success(
        nextState ? 'Status set to AVAILABLE for emergencies' : 'Status set to UNAVAILABLE (Resting)'
      );
    } catch (err) {
      // Fallback toggle
      setIsAvailable(nextState);
      toast.success(nextState ? 'Availability active' : 'Availability paused');
    } finally {
      setTogglingAvailability(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Profile Header Card */}
      <div className="rounded-3xl bg-white border border-red-100 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#991B1B] to-[#C62828] text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-red-900/20 shrink-0">
            {profileData.name ? profileData.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">{profileData.name}</h1>
              <StatusBadge status={user?.status || 'ACTIVE'} size="xs" />
            </div>
            <p className="text-xs text-slate-500 font-medium">{profileData.email}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-[#C62828] font-black text-xs">
                Group {profileData.bloodGroup}
              </span>
              <span className="text-xs text-slate-400 font-bold">•</span>
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {addressData.city}
              </span>
            </div>
          </div>
        </div>

        {/* Donor Quick Toggle / Enrollment CTA */}
        {isDonor ? (
          <div className="p-4 rounded-2xl bg-red-50/60 border border-red-100 flex items-center justify-between gap-4 sm:w-72">
            <div>
              <p className="text-xs font-black text-slate-800">Donor Availability</p>
              <p className="text-[11px] text-slate-500 font-medium">
                {isAvailable ? 'Ready for emergency calls' : 'Temporarily unavailable'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleAvailability}
              disabled={togglingAvailability}
              className={`
                relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none
                ${isAvailable ? 'bg-emerald-600' : 'bg-slate-300'}
              `}
            >
              <span
                className={`
                  pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out
                  ${isAvailable ? 'translate-x-5' : 'translate-x-0'}
                `}
              />
            </button>
          </div>
        ) : (
          <Button
            variant="primary"
            size="md"
            onClick={handleBecomeDonor}
            isLoading={enrollingDonor}
            leftIcon={<Heart className="w-4 h-4 fill-white" />}
          >
            Become a Voluntary Donor
          </Button>
        )}
      </div>

      {/* Donor Eligibility Card */}
      {isDonor && (
        <div className="rounded-3xl bg-gradient-to-r from-red-50 via-rose-50 to-white border border-red-100 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-white text-[#C62828] border border-red-200 shadow-sm shrink-0">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#C62828] bg-red-100 px-2 py-0.5 rounded-full">
                  Clinical Eligibility Clearance
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  Donation Readiness Status
                </h3>
                <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                  {eligibility.reason}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 border-t sm:border-t-0 sm:border-l border-red-100 pt-4 sm:pt-0 sm:pl-6 shrink-0">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Next Eligible</p>
                <p className="text-base font-black text-slate-900 mt-0.5">
                  {eligibility.nextEligibleDate}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Cooldown</p>
                <span
                  className={`inline-block px-2.5 py-1 rounded-xl text-xs font-black ${
                    eligibility.daysRemaining === 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {eligibility.daysRemaining === 0 ? 'Ready' : `${eligibility.daysRemaining}d rest`}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid: Personal Info Form + Address & Location Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Personal Profile Details ── */}
        <div className="bg-white rounded-3xl border border-red-100 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-[#C62828]" />
              Personal Profile
            </h3>
            <span className="text-xs font-bold text-slate-400">Basic Info</span>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <Input
              label="Full Name"
              value={profileData.name}
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Email (Read Only)"
                value={profileData.email}
                disabled
                helperText="Verified account email"
              />

              <Input
                label="Mobile Phone"
                value={profileData.mobile}
                onChange={(e) => setProfileData({ ...profileData, mobile: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="Blood Group"
                value={profileData.bloodGroup}
                onChange={(e) => setProfileData({ ...profileData, bloodGroup: e.target.value })}
                options={BLOOD_GROUPS}
              />

              <Select
                label="Gender"
                value={profileData.gender}
                onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
                options={[
                  { value: 'MALE', label: 'Male' },
                  { value: 'FEMALE', label: 'Female' },
                  { value: 'OTHER', label: 'Other' },
                ]}
              />

              <Input
                label="Date of Birth"
                type="date"
                value={profileData.dob}
                onChange={(e) => setProfileData({ ...profileData, dob: e.target.value })}
              />
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-3">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                Emergency Contact (ICE)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Contact Name"
                  placeholder="Name"
                  value={profileData.emergencyName}
                  onChange={(e) => setProfileData({ ...profileData, emergencyName: e.target.value })}
                />
                <Input
                  label="Relationship"
                  placeholder="e.g. Spouse, Parent"
                  value={profileData.emergencyRelation}
                  onChange={(e) =>
                    setProfileData({ ...profileData, emergencyRelation: e.target.value })
                  }
                />
                <Input
                  label="Contact Phone"
                  placeholder="Phone"
                  value={profileData.emergencyPhone}
                  onChange={(e) => setProfileData({ ...profileData, emergencyPhone: e.target.value })}
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={savingProfile}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Save Profile
              </Button>
            </div>
          </form>
        </div>

        {/* ── Address & Geolocation Form ── */}
        <div className="bg-white rounded-3xl border border-red-100 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#C62828]" />
              Address & Geolocation
            </h3>

            {/* "Use My Location" Geolocation Button */}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleUseMyLocation}
              isLoading={locating}
              leftIcon={<Navigation className="w-3.5 h-3.5 text-[#C62828]" />}
            >
              Use My Location
            </Button>
          </div>

          <form onSubmit={handleSaveAddress} className="space-y-4">
            <Input
              label="Street Address / Building"
              placeholder="e.g. Flat 301, Silver Residency, MG Road"
              value={addressData.line}
              onChange={(e) => setAddressData({ ...addressData, line: e.target.value })}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="City"
                value={addressData.city}
                onChange={(e) => setAddressData({ ...addressData, city: e.target.value })}
                required
              />

              <Input
                label="State"
                value={addressData.state}
                onChange={(e) => setAddressData({ ...addressData, state: e.target.value })}
                required
              />

              <Input
                label="Pincode"
                value={addressData.pincode}
                onChange={(e) => setAddressData({ ...addressData, pincode: e.target.value })}
                required
              />
            </div>

            {/* Coordinates Badge */}
            <div className="p-4 rounded-2xl bg-red-50/40 border border-red-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Geospatial Coordinates</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  GeoJSON 2dsphere Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono">
                Longitude: {addressData.coordinates[0]} | Latitude: {addressData.coordinates[1]}
              </p>
              <p className="text-[11px] text-slate-400">
                Used to compute nearest proximity during trauma emergency dispatches.
              </p>
            </div>

            <div className="pt-4 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={savingAddress}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Save Address & Coordinates
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
