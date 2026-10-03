import React, { useState } from 'react';
import { X, Building2, MapPin, Phone, Droplet, CheckCircle2 } from 'lucide-react';

const SAMPLE_BANKS = [
  {
    id: 1,
    name: 'Raigarh District Blood Center',
    type: 'GOVERNMENT',
    distance: '0.8 km',
    city: 'Raigarh',
    address: 'Near Civil Hospital, Station Road, Raigarh',
    phone: '+91 7762 222100',
    stock: {
      'A+': 18,
      'A-': 6,
      'B+': 24,
      'B-': 4,
      'AB+': 12,
      'AB-': 2,
      'O+': 32,
      'O-': 8,
    },
  },
  {
    id: 2,
    name: 'Apollo Lifeline Blood Bank',
    type: 'PRIVATE',
    distance: '3.1 km',
    city: 'Raigarh',
    address: 'Jindal Road, Kirodimal Nagar, Raigarh',
    phone: '+91 7762 234500',
    stock: {
      'A+': 10,
      'A-': 3,
      'B+': 15,
      'B-': 2,
      'AB+': 8,
      'AB-': 1,
      'O+': 20,
      'O-': 5,
    },
  },
  {
    id: 3,
    name: 'Sanjeevani Red Cross Blood Bank',
    type: 'RED_CROSS',
    distance: '4.5 km',
    city: 'Raigarh',
    address: 'Chakradhar Nagar, Raigarh',
    phone: '+91 7762 256700',
    stock: {
      'A+': 14,
      'A-': 5,
      'B+': 22,
      'B-': 7,
      'AB+': 9,
      'AB-': 3,
      'O+': 28,
      'O-': 9,
    },
  },
];

export const BloodBanksModal = ({ isOpen, onClose, selectedCity = 'Raigarh, Chhattisgarh' }) => {
  const [selectedGroup, setSelectedGroup] = useState('ALL');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-red-100 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-[#C62828] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Building2 size={18} className="fill-white" />
            </div>
            <div>
              <h3 className="text-base font-bold">Accredited Blood Banks</h3>
              <p className="text-[11px] text-white/80">Inventory & availability in {selectedCity}</p>
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
          {['ALL', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+'].map((grp) => (
            <button
              key={grp}
              onClick={() => setSelectedGroup(grp)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                selectedGroup === grp
                  ? 'bg-[#C62828] text-white shadow-xs'
                  : 'bg-slate-100 text-[#475569] hover:bg-red-50'
              }`}
            >
              {grp}
            </button>
          ))}
        </div>

        {/* List of Blood Banks */}
        <div className="p-5 overflow-y-auto space-y-4">
          {SAMPLE_BANKS.map((bank) => (
            <div
              key={bank.id}
              className="p-4 rounded-2xl bg-[#FFF8F8] border border-red-100/90 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#0F172A]">{bank.name}</h4>
                  <div className="flex items-center gap-2 text-[11px] text-[#64748B] mt-0.5">
                    <span className="flex items-center gap-0.5">
                      <MapPin size={11} className="text-[#C62828]" />
                      {bank.distance}
                    </span>
                    <span>•</span>
                    <span>{bank.phone}</span>
                  </div>
                  <p className="text-[10px] text-[#94A3B8] mt-0.5">{bank.address}</p>
                </div>

                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-red-100 text-[#C62828]">
                  {bank.type}
                </span>
              </div>

              {/* Stock Grid */}
              <div className="pt-2 border-t border-red-100/70">
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block mb-1.5">
                  Available Units
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {Object.entries(bank.stock).map(([grp, units]) => {
                    const isHighlighted = selectedGroup === grp;
                    return (
                      <div
                        key={grp}
                        className={`p-1.5 rounded-lg text-center transition-all ${
                          isHighlighted
                            ? 'bg-[#C62828] text-white shadow-xs'
                            : 'bg-white border border-red-100'
                        }`}
                      >
                        <span className="text-[10px] font-bold block">{grp}</span>
                        <span className="text-xs font-black">{units}u</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
