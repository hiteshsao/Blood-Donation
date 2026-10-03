import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Droplet,
  Heart,
  Building2,
  Users,
  ShieldCheck,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Input, Select } from '../components/common';
import { useAuth } from '../context/AuthContext';

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

export const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register } = useAuth();

  const initialRole = searchParams.get('role')?.toUpperCase() || 'DONOR';
  const [selectedRole, setSelectedRole] = useState(
    ['DONOR', 'USER', 'HOSPITAL', 'BLOOD_BANK'].includes(initialRole) ? initialRole : 'DONOR'
  );

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    bloodGroup: 'O+',
    city: 'Mumbai',
    licenseNumber: '',
    facilityName: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roleOptions = [
    {
      role: 'DONOR',
      title: 'Voluntary Donor',
      desc: 'Donate blood to save lives in emergency situations',
      icon: <Heart className="w-5 h-5 text-red-600 fill-red-600" />,
    },
    {
      role: 'USER',
      title: 'Patient / Recipient',
      desc: 'Request blood units for surgery or trauma care',
      icon: <Users className="w-5 h-5 text-blue-600" />,
    },
    {
      role: 'HOSPITAL',
      title: 'Hospital Facility',
      desc: 'Trauma units requesting critical emergency batches',
      icon: <Building2 className="w-5 h-5 text-emerald-600" />,
    },
    {
      role: 'BLOOD_BANK',
      title: 'Blood Bank',
      desc: 'Manage inventory, batch testing, and releases',
      icon: <ShieldCheck className="w-5 h-5 text-purple-600" />,
    },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) {
      errs.name = selectedRole === 'HOSPITAL' || selectedRole === 'BLOOD_BANK'
        ? 'Representative name is required'
        : 'Full name is required';
    }
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
      errs.email = 'Valid email address is required';
    }
    if (!formData.phone.trim() || formData.phone.length < 10) {
      errs.phone = 'Valid 10-digit phone number is required';
    }
    if (!formData.password || formData.password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }
    if ((selectedRole === 'HOSPITAL' || selectedRole === 'BLOOD_BANK') && !formData.licenseNumber.trim()) {
      errs.licenseNumber = 'Official state license number is required';
    }
    if ((selectedRole === 'HOSPITAL' || selectedRole === 'BLOOD_BANK') && !formData.facilityName.trim()) {
      errs.facilityName = 'Registered institution/facility name is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.facilityName ? `${formData.facilityName} (${formData.name})` : formData.name,
        email: formData.email.toLowerCase().trim(),
        phone: formData.phone.trim(),
        mobile: formData.phone.trim(),
        password: formData.password,
        role: selectedRole,
        bloodGroup: selectedRole === 'DONOR' || selectedRole === 'USER' ? formData.bloodGroup : undefined,
        city: formData.city,
        address: { city: formData.city },
        licenseNumber: formData.licenseNumber || undefined,
        hospitalName: selectedRole === 'HOSPITAL' ? formData.facilityName : undefined,
        bloodBankName: selectedRole === 'BLOOD_BANK' ? formData.facilityName : undefined,
      };

      const res = await register(payload);
      toast.success(res?.message || 'Registration successful! Verification code sent.');
      navigate(`/verify-otp?email=${encodeURIComponent(formData.email)}`);
    } catch (err) {
      toast.error(err.message || 'Registration failed. Please check form data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <div className="bg-white rounded-3xl border border-red-100 shadow-xl shadow-red-900/5 p-6 sm:p-10">
        {/* Header */}
        <div className="text-center space-y-2 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#991B1B] to-[#C62828] text-white flex items-center justify-center mx-auto shadow-md shadow-red-900/20">
            <Droplet className="w-6 h-6 fill-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Create Your LifeDrop Account
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Join the verified transfusion network. Select your registration type below.
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-8">
          {roleOptions.map((opt) => {
            const isSelected = selectedRole === opt.role;
            return (
              <button
                key={opt.role}
                type="button"
                onClick={() => setSelectedRole(opt.role)}
                className={`
                  p-3 rounded-2xl border text-left flex flex-col justify-between transition-all duration-150
                  ${
                    isSelected
                      ? 'border-[#C62828] bg-red-50/70 shadow-sm ring-2 ring-red-100'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }
                `}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 rounded-lg bg-white shadow-sm border border-slate-100">
                    {opt.icon}
                  </div>
                  {isSelected && <UserCheck className="w-4 h-4 text-[#C62828]" />}
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">{opt.title}</h4>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5 line-clamp-1">
                    {opt.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Dynamic Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {(selectedRole === 'HOSPITAL' || selectedRole === 'BLOOD_BANK') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Registered Facility Name"
                name="facilityName"
                placeholder={selectedRole === 'HOSPITAL' ? 'e.g. Apollo City Hospital' : 'e.g. RedCross Blood Center'}
                required
                value={formData.facilityName}
                onChange={handleChange}
                error={errors.facilityName}
              />
              <Input
                label="Official License / Registration No."
                name="licenseNumber"
                placeholder="e.g. HOSP-MH-49201"
                required
                value={formData.licenseNumber}
                onChange={handleChange}
                error={errors.licenseNumber}
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={selectedRole === 'HOSPITAL' || selectedRole === 'BLOOD_BANK' ? 'Medical Director / Contact Name' : 'Full Name'}
              name="name"
              placeholder="e.g. Dr. Ramesh Kumar"
              required
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
            />

            <Input
              label="Email Address"
              name="email"
              type="email"
              placeholder="name@example.com"
              required
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Phone Number"
              name="phone"
              type="tel"
              placeholder="9876543210"
              required
              value={formData.phone}
              onChange={handleChange}
              error={errors.phone}
            />

            {(selectedRole === 'DONOR' || selectedRole === 'USER') && (
              <Select
                label="Blood Group"
                name="bloodGroup"
                required
                value={formData.bloodGroup}
                onChange={handleChange}
                options={BLOOD_GROUPS}
              />
            )}

            <Input
              label="City"
              name="city"
              placeholder="Mumbai"
              required
              value={formData.city}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Password"
              name="password"
              type="password"
              placeholder="Minimum 6 characters"
              required
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
            />

            <Input
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              placeholder="Re-enter password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
            />
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isSubmitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Register & Request OTP
            </Button>
          </div>

          <p className="text-center text-xs text-slate-500 font-medium pt-2">
            Already have an active account?{' '}
            <Link to="/login" className="text-[#C62828] font-bold hover:underline">
              Sign In here
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
