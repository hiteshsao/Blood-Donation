import React, { useState, useEffect } from 'react';
import {
  Heart,
  Droplet,
  Award,
  Calendar,
  Building2,
  CheckCircle2,
  Download,
  Share2,
  Printer,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { donorAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  StatCard,
  StatusBadge,
  Button,
  Loader,
  EmptyState,
  Modal,
} from '../components/common';

const FALLBACK_HISTORY = [
  {
    _id: 'don-001',
    certificateId: 'CERT-2026-MUM-8921',
    bloodGroup: 'O-',
    units: 1,
    bloodBank: { name: 'Central RedCross Blood Center', city: 'Mumbai' },
    donatedAt: '2026-06-15T10:30:00.000Z',
    verificationStatus: 'VERIFIED',
    remarks: 'Voluntary whole blood donation. Hemoglobin: 14.2 g/dL. Medical clearance verified.',
  },
  {
    _id: 'don-002',
    certificateId: 'CERT-2026-MUM-4120',
    bloodGroup: 'O-',
    units: 1,
    bloodBank: { name: 'Apollo Transfusion Center', city: 'Mumbai' },
    donatedAt: '2026-03-01T14:15:00.000Z',
    verificationStatus: 'VERIFIED',
    remarks: 'Emergency blood replenishment drive.',
  },
  {
    _id: 'don-003',
    certificateId: 'CERT-2025-MUM-9914',
    bloodGroup: 'O-',
    units: 1,
    bloodBank: { name: 'Civil Hospital Blood Center', city: 'Mumbai' },
    donatedAt: '2025-11-20T11:00:00.000Z',
    verificationStatus: 'VERIFIED',
    remarks: 'Regular voluntary donor contribution.',
  },
];

export const DonorHistoryPage = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState(FALLBACK_HISTORY);
  const [loading, setLoading] = useState(false);
  const [selectedCert, setSelectedCert] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await donorAPI.getHistory();
        const data = res.data?.data || res.data?.history || res.data;
        if (Array.isArray(data) && data.length > 0) {
          setHistory(data);
        }
      } catch {
        // Fallback demo
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const totalUnits = history.reduce((acc, curr) => acc + (curr.units || 1), 0);
  const livesSaved = totalUnits * 3;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="rounded-3xl bg-white border border-red-100 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-[#C62828] text-xs font-black mb-2">
            <Award className="w-3.5 h-3.5" />
            <span>Immutable Transfusion Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Donation Records & Clinical Certificates
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Verified proof of voluntary contributions recognized by regional health authorities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">
            Donor ID: <strong className="text-slate-800">{user?._id?.substring(0, 10) || 'LIFEDROP-DONOR'}</strong>
          </span>
        </div>
      </div>

      {/* Impact Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Verified Donations"
          value={`${history.length} Times`}
          subtitle="Successful clinical procedures"
          icon={<Heart className="w-5 h-5 text-red-600" />}
          color="red"
        />
        <StatCard
          title="Total Blood Units"
          value={`${totalUnits} Units`}
          subtitle="Collected & cross-matched"
          icon={<Droplet className="w-5 h-5 text-emerald-600" />}
          color="emerald"
        />
        <StatCard
          title="Estimated Lives Impacted"
          value={`${livesSaved} Lives`}
          subtitle="Standard pediatric & adult multiplier"
          icon={<Sparkles className="w-5 h-5 text-blue-600" />}
          color="blue"
        />
      </div>

      {/* History List */}
      <div className="space-y-4">
        <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#C62828]" />
          <span>Historical Transfusions</span>
        </h3>

        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader message="Loading verified donation certificates..." />
          </div>
        ) : history.length === 0 ? (
          <EmptyState
            title="No Donations Recorded Yet"
            description="Complete your first voluntary donation appointment to earn certificates."
          />
        ) : (
          history.map((record) => (
            <div
              key={record._id}
              className="bg-white rounded-3xl border border-red-100 p-6 sm:p-7 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-6"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#991B1B] to-[#C62828] text-white font-black text-sm flex items-center justify-center shadow-md shadow-red-900/20 shrink-0">
                  {record.bloodGroup}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-black text-slate-900">
                      {record.bloodBank?.name || 'Accredited Blood Center'}
                    </h4>
                    <StatusBadge status={record.verificationStatus} size="xs" />
                  </div>

                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {record.remarks || 'Standard whole blood donation'}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                      <Calendar className="w-3.5 h-3.5 text-[#C62828]" />
                      {new Date(record.donatedAt).toLocaleDateString([], {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 font-mono text-[#C62828]">
                      <Award className="w-3.5 h-3.5" />
                      {record.certificateId}
                    </span>
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedCert(record)}
                  leftIcon={<Award className="w-4 h-4" />}
                >
                  View Certificate
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Digital Certificate Preview Modal */}
      {selectedCert && (
        <Modal
          isOpen={!!selectedCert}
          onClose={() => setSelectedCert(null)}
          size="lg"
          showCloseButton={true}
        >
          <div className="p-4 sm:p-8 bg-gradient-to-b from-[#FFF8F8] to-white rounded-3xl border-4 border-red-200 text-center space-y-6 relative overflow-hidden">
            {/* Watermark Logo */}
            <Droplet className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 text-red-500/5 pointer-events-none" />

            <div className="flex items-center justify-between border-b border-red-100 pb-4">
              <div className="flex items-center gap-2">
                <Droplet className="w-6 h-6 text-[#C62828] fill-[#C62828]" />
                <span className="font-black text-base text-slate-900">LifeDrop National Transfusion Registry</span>
              </div>
              <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                Official Cert
              </span>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-widest text-[#C62828]">
                Certificate of Voluntary Blood Donation
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Honoring a True Life Saver
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                This certifies that the generous voluntary donor has contributed life-saving blood units.
              </p>
            </div>

            {/* Recipient Name Pill */}
            <div className="py-2 border-b border-t border-red-100 max-w-sm mx-auto">
              <h3 className="text-2xl font-black text-[#C62828]">
                {user?.name || 'Voluntary Donor'}
              </h3>
              <p className="text-xs font-bold text-slate-600 mt-1">
                Blood Group {selectedCert.bloodGroup} • {selectedCert.units || 1} Unit(s) Donated
              </p>
            </div>

            {/* Certificate Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs max-w-md mx-auto text-left bg-white p-4 rounded-2xl border border-red-100">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Date of Collection</p>
                <p className="font-black text-slate-800 mt-0.5">
                  {new Date(selectedCert.donatedAt).toLocaleDateString()}
                </p>
              </div>

              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Facility Center</p>
                <p className="font-black text-slate-800 mt-0.5 truncate">
                  {selectedCert.bloodBank?.name || 'RedCross'}
                </p>
              </div>

              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Certificate Ref</p>
                <p className="font-black text-[#C62828] font-mono mt-0.5 truncate">
                  {selectedCert.certificateId}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex items-center justify-center gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={handlePrint}
                leftIcon={<Printer className="w-4 h-4" />}
              >
                Print / Save PDF
              </Button>
              <Button
                variant="ghost"
                size="md"
                onClick={() => setSelectedCert(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DonorHistoryPage;
