import React, { useState, useRef } from 'react';
import { Building2, Droplet, Upload, CheckCircle, AlertTriangle, Compass, ArrowLeft } from 'lucide-react';

export const FacilitySignupPage = ({ onBack, onComplete }) => {
  const [facilityType, setFacilityType] = useState('HOSPITAL'); // 'HOSPITAL' | 'BLOOD_BANK'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    licenseNumber: '',
    operatingHours: '24/7 Service',
    address: '',
    city: '',
    state: '',
    pincode: '',
    contactPersonName: '',
    contactPersonPhone: '',
    contactPersonEmail: '',
    latitude: '',
    longitude: '',
  });

  const [licenseFile, setLicenseFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Browser geolocation is not available.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(4),
          longitude: pos.coords.longitude.toFixed(4),
        }));
      },
      (err) => {
        alert('Could not access device coordinates. Please enter manually.');
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback({ type: '', text: '' });

    // Validate license file selected
    if (!licenseFile) {
      setFeedback({ type: 'urgent', text: 'Please attach an official clinical license document for accreditation.' });
      setLoading(false);
      return;
    }

    try {
      // Simulate/trigger registration payload
      setTimeout(() => {
        setLoading(false);
        setSubmitted(true);
      }, 700);
    } catch (err) {
      setLoading(false);
      setFeedback({ type: 'urgent', text: 'Registration request failed. Please check field details.' });
    }
  };

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={onBack}
        style={{ alignSelf: 'flex-start' }}
      >
        <ArrowLeft size={14} />
        <span>Back to administrative panel</span>
      </button>

      {/* Facility Registration Panel */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Clinical facility accreditation signup</h2>
            <p className="text-caption">
              Self-serve registration for licensed hospital transfusion departments and certified blood banks.
            </p>
          </div>
        </div>

        {submitted ? (
          <div style={{ padding: '32px 16px', textAlign: 'left' }}>
            <div className="inline-alert inline-alert-success" style={{ marginBottom: 20 }}>
              <CheckCircle size={18} />
              <div>
                <strong>Registration submitted successfully</strong>
                <p style={{ marginTop: 4, fontSize: 13 }}>
                  Your facility record has been logged in <strong>PENDING</strong> status. An administrative officer will audit the attached license document within 1-2 business days before issuing clinical dispatch credentials.
                </p>
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={onBack}
            >
              <span>Return to facility management</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {feedback.text && (
              <div className={`inline-alert inline-alert-${feedback.type}`}>
                <AlertTriangle size={16} />
                <span>{feedback.text}</span>
              </div>
            )}

            {/* Facility Type Selector Tabs */}
            <div style={{ marginBottom: 24 }}>
              <label className="form-label" style={{ marginBottom: 8 }}>Select facility type</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <button
                  type="button"
                  className={`btn ${facilityType === 'HOSPITAL' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFacilityType('HOSPITAL')}
                  style={{ padding: '12px 16px', justifyContent: 'flex-start' }}
                >
                  <Building2 size={16} />
                  <span>Hospital transfusion unit</span>
                </button>

                <button
                  type="button"
                  className={`btn ${facilityType === 'BLOOD_BANK' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFacilityType('BLOOD_BANK')}
                  style={{ padding: '12px 16px', justifyContent: 'flex-start' }}
                >
                  <Droplet size={16} />
                  <span>Regional blood bank</span>
                </button>
              </div>
            </div>

            {/* Institution Details */}
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">
                  {facilityType === 'HOSPITAL' ? 'Hospital official name' : 'Blood bank official name'}
                </label>
                <input
                  type="text"
                  required
                  name="name"
                  className="form-input"
                  placeholder={facilityType === 'HOSPITAL' ? 'e.g. St. Jude Memorial Hospital' : 'e.g. Rotary Central Blood Bank'}
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  {facilityType === 'HOSPITAL' ? 'State health license number' : 'NBTC blood bank registration ID'}
                </label>
                <input
                  type="text"
                  required
                  name="licenseNumber"
                  className="form-input"
                  placeholder="e.g. MH-BB-2026-9901"
                  value={formData.licenseNumber}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Official communication email</label>
                <input
                  type="email"
                  required
                  name="email"
                  className="form-input"
                  placeholder="transfusion@hospital.org"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Emergency dispatch telephone</label>
                <input
                  type="tel"
                  required
                  name="phone"
                  className="form-input"
                  placeholder="+91 22 2840 0000"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>

              {facilityType === 'BLOOD_BANK' && (
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Operating schedule</label>
                  <select
                    name="operatingHours"
                    className="form-select"
                    value={formData.operatingHours}
                    onChange={handleInputChange}
                  >
                    <option value="24/7 Service">24/7 Emergency Transfusion & Dispensation</option>
                    <option value="08:00 AM - 08:00 PM">08:00 AM - 08:00 PM (12 Hours)</option>
                    <option value="09:00 AM - 05:00 PM">09:00 AM - 05:00 PM (Standard Hours)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Physical Location */}
            <div style={{ marginTop: 14, paddingTop: 18, borderTop: '1px solid var(--line)' }}>
              <h3 style={{ fontSize: 16, marginBottom: 14 }}>Physical facility address & coordinates</h3>

              <div className="form-group">
                <label className="form-label">Street address</label>
                <input
                  type="text"
                  required
                  name="address"
                  className="form-input"
                  placeholder="Campus address, wing, or gate number"
                  value={formData.address}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    required
                    name="city"
                    className="form-input"
                    placeholder="City"
                    value={formData.city}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">State / Province</label>
                  <input
                    type="text"
                    required
                    name="state"
                    className="form-input"
                    placeholder="State"
                    value={formData.state}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Postal pincode</label>
                  <input
                    type="text"
                    required
                    name="pincode"
                    className="form-input"
                    placeholder="Pincode"
                    value={formData.pincode}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Coordinates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'flex-end' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Latitude</label>
                  <input
                    type="text"
                    name="latitude"
                    className="form-input"
                    placeholder="e.g. 19.0760"
                    value={formData.latitude}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Longitude</label>
                  <input
                    type="text"
                    name="longitude"
                    className="form-input"
                    placeholder="e.g. 72.8777"
                    value={formData.longitude}
                    onChange={handleInputChange}
                  />
                </div>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleDetectLocation}
                  style={{ height: 38 }}
                >
                  <Compass size={14} />
                  <span>Detect GPS</span>
                </button>
              </div>
            </div>

            {/* In-Charge Officer */}
            <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--line)' }}>
              <h3 style={{ fontSize: 16, marginBottom: 14 }}>Authorizing clinical officer</h3>

              <div className="form-grid-3">
                <div className="form-group">
                  <label className="form-label">Officer full name</label>
                  <input
                    type="text"
                    required
                    name="contactPersonName"
                    className="form-input"
                    placeholder="Dr. / Chief Medical Officer"
                    value={formData.contactPersonName}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Direct mobile phone</label>
                  <input
                    type="tel"
                    required
                    name="contactPersonPhone"
                    className="form-input"
                    placeholder="10-digit mobile"
                    value={formData.contactPersonPhone}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Direct official email</label>
                  <input
                    type="email"
                    name="contactPersonEmail"
                    className="form-input"
                    placeholder="officer@hospital.org"
                    value={formData.contactPersonEmail}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            {/* License Document Upload */}
            <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--line)' }}>
              <h3 style={{ fontSize: 16, marginBottom: 10 }}>Accreditation & state license upload</h3>
              <p className="text-caption" style={{ marginBottom: 12 }}>
                Upload certified state medical board or blood bank licensing document (PDF, DOCX, or scan up to 5MB).
              </p>

              <div
                style={{
                  border: '1px dashed var(--line)',
                  borderRadius: 'var(--radius-btn)',
                  padding: '20px',
                  background: 'var(--bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  cursor: 'pointer',
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Upload size={18} color="var(--ink-muted)" />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      {licenseFile ? licenseFile.name : 'Select license certification file'}
                    </div>
                    <div className="text-caption">
                      {licenseFile ? `${(licenseFile.size / (1024 * 1024)).toFixed(2)} MB` : 'PDF, DOC, DOCX, PNG, or JPEG (Max 5MB)'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  <span>Choose file</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => setLicenseFile(e.target.files?.[0] || null)}
                  accept=".pdf,.doc,.docx,image/jpeg,image/png"
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            {/* Submit Action */}
            <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                <span>
                  {loading
                    ? 'Submitting registration...'
                    : facilityType === 'HOSPITAL'
                    ? 'Submit hospital registration'
                    : 'Submit blood bank registration'}
                </span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={onBack}
              >
                <span>Cancel</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
