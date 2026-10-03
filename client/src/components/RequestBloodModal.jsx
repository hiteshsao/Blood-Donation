import React, { useState } from 'react';
import { X, Droplet, Plus, Heart } from 'lucide-react';
import toast from 'react-hot-toast';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const RequestBloodModal = ({ isOpen, onClose, selectedCity = 'Raigarh, Chhattisgarh' }) => {
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [units, setUnits] = useState(1);
  const [patientName, setPatientName] = useState('');
  const [hospitalName, setHospitalName] = useState('Raigarh District Hospital');
  const [urgency, setUrgency] = useState('URGENT');
  const [contactNumber, setContactNumber] = useState('9876543210');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast.success(`Blood request for ${units} unit(s) of ${bloodGroup} registered successfully!`);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-red-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#C62828] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Droplet size={18} className="fill-white" />
            </div>
            <div>
              <h3 className="text-base font-bold">Request Blood</h3>
              <p className="text-[11px] text-white/80">Submit request to nearby accredited donors</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
              Blood Group Required
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {BLOOD_GROUPS.map((grp) => (
                <button
                  key={grp}
                  type="button"
                  onClick={() => setBloodGroup(grp)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    bloodGroup === grp
                      ? 'bg-[#C62828] text-white shadow-xs'
                      : 'bg-[#FFF5F5] text-[#334155] hover:bg-red-50'
                  }`}
                >
                  {grp}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">
                Units Needed
              </label>
              <input
                type="number"
                min="1"
                max="8"
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                required
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-[#C62828] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">
                Urgency
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-[#C62828] outline-none"
              >
                <option value="NORMAL">Standard (Scheduled)</option>
                <option value="URGENT">Urgent (Within 6h)</option>
                <option value="EMERGENCY">Emergency (Immediate)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0F172A] mb-1">
              Patient Name
            </label>
            <input
              type="text"
              placeholder="e.g. Ramesh Patel"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-[#C62828] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0F172A] mb-1">
              Hospital / Medical Center
            </label>
            <input
              type="text"
              value={hospitalName}
              onChange={(e) => setHospitalName(e.target.value)}
              required
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-[#C62828] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0F172A] mb-1">
              Emergency Contact Phone
            </label>
            <input
              type="tel"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              required
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-[#C62828] outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-xl bg-[#C62828] hover:bg-[#B71C1C] text-white text-xs font-bold transition-all shadow-md active:scale-98 mt-2"
          >
            {submitting ? 'Registering...' : 'Submit Blood Request'}
          </button>
        </form>
      </div>
    </div>
  );
};
