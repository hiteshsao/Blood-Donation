import React, { useState } from 'react';
import { X, Users, MapPin, Phone, ShieldCheck, Heart, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const SAMPLE_DONORS = [
  {
    id: 1,
    name: 'Aakash Verma',
    bloodGroup: 'O+',
    distance: '1.4 km',
    city: 'Raigarh',
    isAvailable: true,
    isVerified: true,
    maskedPhone: '+91 98765 *****',
  },
  {
    id: 2,
    name: 'Rohit Agrawal',
    bloodGroup: 'O-',
    distance: '2.1 km',
    city: 'Raigarh',
    isAvailable: true,
    isVerified: true,
    maskedPhone: '+91 98234 *****',
    universal: true,
  },
  {
    id: 3,
    name: 'Meena Dewangan',
    bloodGroup: 'A+',
    distance: '3.5 km',
    city: 'Raigarh',
    isAvailable: true,
    isVerified: true,
    maskedPhone: '+91 97543 *****',
  },
  {
    id: 4,
    name: 'Karan Singh',
    bloodGroup: 'B+',
    distance: '4.2 km',
    city: 'Raigarh',
    isAvailable: false,
    isVerified: true,
    maskedPhone: '+91 99123 *****',
  },
];

export const NearbyDonorsModal = ({ isOpen, onClose, selectedCity = 'Raigarh, Chhattisgarh' }) => {
  const [filterGroup, setFilterGroup] = useState('ALL');

  if (!isOpen) return null;

  const filtered = SAMPLE_DONORS.filter((d) => {
    if (filterGroup === 'ALL') return true;
    return d.bloodGroup === filterGroup;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-red-100 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-[#C62828] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Users size={18} className="fill-white" />
            </div>
            <div>
              <h3 className="text-base font-bold">Nearby Verified Donors</h3>
              <p className="text-[11px] text-white/80">Active in {selectedCity}</p>
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

        {/* Filter Pills */}
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {['ALL', 'O+', 'O-', 'A+', 'B+', 'AB+'].map((grp) => (
            <button
              key={grp}
              onClick={() => setFilterGroup(grp)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                filterGroup === grp
                  ? 'bg-[#C62828] text-white shadow-xs'
                  : 'bg-slate-100 text-[#475569] hover:bg-red-50'
              }`}
            >
              {grp}
            </button>
          ))}
        </div>

        {/* Donors List */}
        <div className="p-5 overflow-y-auto space-y-3">
          {filtered.map((donor) => (
            <div
              key={donor.id}
              className="p-3.5 rounded-2xl bg-[#FFF8F8] border border-red-100/80 flex items-center justify-between hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#C62828] text-white font-extrabold flex items-center justify-center text-sm shadow-xs flex-shrink-0">
                  {donor.bloodGroup}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#0F172A]">{donor.name}</span>
                    {donor.universal && (
                      <span className="text-[9px] font-black bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded-sm">
                        Universal
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#64748B] mt-0.5">
                    <span className="flex items-center gap-0.5">
                      <MapPin size={11} className="text-[#C62828]" />
                      {donor.distance}
                    </span>
                    <span>•</span>
                    <span className="font-mono text-[#94A3B8]">{donor.maskedPhone}</span>
                  </div>
                </div>
              </div>

              <div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    donor.isAvailable
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {donor.isAvailable ? 'Available' : 'Paused'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
