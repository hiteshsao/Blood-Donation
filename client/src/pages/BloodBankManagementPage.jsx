import React, { useState } from 'react';
import {
  Search,
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
  Droplet,
} from 'lucide-react';

export const BloodBankManagementPage = ({ onOpenSignup }) => {
  const [bloodBanks, setBloodBanks] = useState([
    {
      _id: 'bb-201',
      name: 'AIIMS Central Blood Transfusion Centre',
      email: 'bloodtransfusion@aiims.edu',
      phone: '+91-11-26593201',
      mobileNumber: '+91-11-26593201',
      registrationNumber: 'DL-BB-2026-904',
      licenseNumber: 'DL-BB-2026-904',
      licenseDocUrl: '/uploads/documents/aiims-bb-cert.pdf',
      address: 'Ansari Nagar East, Ring Road',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110029',
      location: { type: 'Point', coordinates: [77.2104, 28.5672] },
      operatingHours: '24/7 Emergency Transfusion',
      contactPerson: {
        name: 'Dr. Meenakshi Sundaram',
        phone: '9810199999',
        email: 'msundaram@aiims.edu',
      },
      isVerified: true,
      status: 'APPROVED',
      createdAt: '2024-02-10T08:00:00.000Z',
    },
    {
      _id: 'bb-202',
      name: 'Red Cross Society National Blood Bank',
      email: 'nationalbb@indianredcross.org',
      phone: '+91-11-23716441',
      mobileNumber: '+91-11-23716441',
      registrationNumber: 'DL-RC-2024-0012',
      licenseNumber: 'DL-RC-2024-0012',
      licenseDocUrl: '/uploads/documents/redcross-cert.pdf',
      address: '1, Red Cross Road',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110001',
      location: { type: 'Point', coordinates: [77.2111, 28.6219] },
      operatingHours: '24/7 Service',
      contactPerson: {
        name: 'Officer Rajesh Kaul',
        phone: '9811002233',
        email: 'bloodservice@redcross.org',
      },
      isVerified: true,
      status: 'APPROVED',
      createdAt: '2024-05-12T12:00:00.000Z',
    },
    {
      _id: 'bb-203',
      name: 'KEM Hospital Rotary Blood Bank',
      email: 'bloodtransfusion@kem.edu',
      phone: '+91-22-24107000',
      mobileNumber: '+91-22-24107000',
      registrationNumber: 'MH-MUM-2026-4411',
      licenseNumber: 'MH-MUM-2026-4411',
      licenseDocUrl: '/uploads/documents/kem-bloodbank.pdf',
      address: 'Acharya Donde Marg, Parel',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400012',
      location: { type: 'Point', coordinates: [72.8428, 19.0033] },
      operatingHours: '08:00 AM - 08:00 PM',
      contactPerson: {
        name: 'Dr. Smita Kulkarni',
        phone: '9820556677',
        email: 'smita.k@kem.edu',
      },
      isVerified: false,
      status: 'PENDING',
      createdAt: '2026-09-22T10:30:00.000Z',
    },
    {
      _id: 'bb-204',
      name: 'Rotary Bangalore TTK Blood Bank',
      email: 'ttk@rotarybloodbank.in',
      phone: '+91-80-25287903',
      mobileNumber: '+91-80-25287903',
      registrationNumber: 'KA-BLR-2025-0988',
      licenseNumber: 'KA-BLR-2025-0988',
      licenseDocUrl: '/uploads/documents/ttk-license.pdf',
      address: 'HAL 2nd Stage, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560038',
      location: { type: 'Point', coordinates: [77.6412, 12.9719] },
      operatingHours: '24/7 Dedicated Drive',
      contactPerson: {
        name: 'Anand Rao',
        phone: '9845011223',
        email: 'anand@rotarybloodbank.in',
      },
      isVerified: false,
      status: 'PENDING',
      createdAt: '2026-09-26T16:00:00.000Z',
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedBank, setSelectedBank] = useState(null);

  const filteredBanks = bloodBanks.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'ALL' ? true : item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleApprove = (id) => {
    setBloodBanks((prev) =>
      prev.map((b) =>
        b._id === id ? { ...b, status: 'APPROVED', isVerified: true } : b
      )
    );
    if (selectedBank?._id === id) {
      setSelectedBank((prev) => ({ ...prev, status: 'APPROVED', isVerified: true }));
    }
  };

  const handleReject = (id) => {
    setBloodBanks((prev) =>
      prev.map((b) =>
        b._id === id ? { ...b, status: 'REJECTED', isVerified: false } : b
      )
    );
    if (selectedBank?._id === id) {
      setSelectedBank((prev) => ({ ...prev, status: 'REJECTED', isVerified: false }));
    }
  };

  const handleBlock = (id) => {
    setBloodBanks((prev) =>
      prev.map((b) => (b._id === id ? { ...b, status: 'BLOCKED' } : b))
    );
    if (selectedBank?._id === id) {
      setSelectedBank((prev) => ({ ...prev, status: 'BLOCKED' }));
    }
  };

  const handleUnblock = (id) => {
    setBloodBanks((prev) =>
      prev.map((b) => (b._id === id ? { ...b, status: 'APPROVED' } : b))
    );
    if (selectedBank?._id === id) {
      setSelectedBank((prev) => ({ ...prev, status: 'APPROVED' }));
    }
  };

  const getStatusPillClass = (status) => {
    switch (status) {
      case 'APPROVED':
        return 'status-pill-success';
      case 'PENDING':
        return 'status-pill-warning';
      case 'BLOCKED':
      case 'REJECTED':
        return 'status-pill-urgent';
      default:
        return 'status-pill-neutral';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2>Blood bank facility management</h2>
          <p className="text-caption">
            Administration, verification, and accreditation oversight for licensed regional blood banks and transfusion centers.
          </p>
        </div>

        <button
          className="btn btn-primary btn-sm"
          onClick={onOpenSignup}
        >
          <Droplet size={14} />
          <span>Register new blood bank</span>
        </button>
      </div>

      {/* Routine Metrics Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <div className="panel" style={{ padding: '16px 18px' }}>
          <span className="text-caption">Total blood banks</span>
          <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>{bloodBanks.length}</div>
          <p className="text-caption" style={{ marginTop: 2 }}>Storage centers</p>
        </div>

        <div className="panel" style={{ padding: '16px 18px' }}>
          <span className="text-caption">24/7 emergency service</span>
          <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--success)', marginTop: 4 }}>
            {bloodBanks.filter((b) => b.operatingHours.includes('24/7')).length}
          </div>
          <p className="text-caption" style={{ marginTop: 2 }}>Active round-the-clock</p>
        </div>

        <div className="panel" style={{ padding: '16px 18px' }}>
          <span className="text-caption">Pending inspection</span>
          <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--warning)', marginTop: 4 }}>
            {bloodBanks.filter((b) => b.status === 'PENDING').length}
          </div>
          <p className="text-caption" style={{ marginTop: 2 }}>Verification requested</p>
        </div>

        <div className="panel" style={{ padding: '16px 18px' }}>
          <span className="text-caption">Blocked or suspended</span>
          <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--urgent)', marginTop: 4 }}>
            {bloodBanks.filter((b) => b.status === 'BLOCKED' || b.status === 'REJECTED').length}
          </div>
          <p className="text-caption" style={{ marginTop: 2 }}>Dispensation halted</p>
        </div>
      </div>

      {/* Routine Flat Panel: Filter & Table */}
      <div className="panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 260, maxWidth: 440 }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search by facility name, city, or registration ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 34, fontSize: 13 }}
              />
              <Search size={14} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--ink-muted)' }} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="text-caption" style={{ marginRight: 4 }}>Filter:</span>
            {['ALL', 'PENDING', 'APPROVED', 'BLOCKED'].map((st) => (
              <button
                key={st}
                type="button"
                className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setStatusFilter(st)}
                style={{ fontSize: 12, padding: '4px 10px' }}
              >
                {st === 'ALL' ? 'All facilities' : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Data Table */}
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Blood bank name & reg ID</th>
                <th>City & hours</th>
                <th>Contact person</th>
                <th>Verification status</th>
                <th>Accreditation doc</th>
                <th>Administrative actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBanks.length > 0 ? (
                filteredBanks.map((bank) => (
                  <tr key={bank._id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{bank.name}</div>
                      <div className="text-caption">{bank.registrationNumber}</div>
                    </td>

                    <td>
                      <div>{bank.city}, {bank.state}</div>
                      <div className="text-caption" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} /> {bank.operatingHours}
                      </div>
                    </td>

                    <td>
                      <div>{bank.contactPerson?.name || 'Director'}</div>
                      <div className="text-caption">{bank.phone}</div>
                    </td>

                    <td>
                      <span className={`status-pill ${getStatusPillClass(bank.status)}`}>
                        {bank.isVerified ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        <span>Status: {bank.status.charAt(0) + bank.status.slice(1).toLowerCase()}</span>
                      </span>
                    </td>

                    <td>
                      {bank.licenseDocUrl ? (
                        <a
                          href={bank.licenseDocUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          onClick={(e) => {
                            e.preventDefault();
                            alert(`Auditing verified license: ${bank.licenseDocUrl}`);
                          }}
                        >
                          <FileText size={13} />
                          <span>View accreditation</span>
                        </a>
                      ) : (
                        <span className="text-caption">No document</span>
                      )}
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {bank.status === 'PENDING' && (
                          <>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleApprove(bank._id)}
                              style={{ color: 'var(--success)', borderColor: '#BDE0CE' }}
                            >
                              <span>Approve blood bank</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleReject(bank._id)}
                              style={{ color: 'var(--urgent)', borderColor: '#F8BEB9' }}
                            >
                              <span>Reject</span>
                            </button>
                          </>
                        )}

                        {bank.status === 'APPROVED' && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleBlock(bank._id)}
                            style={{ color: 'var(--urgent)' }}
                          >
                            <span>Block facility</span>
                          </button>
                        )}

                        {bank.status === 'BLOCKED' && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleUnblock(bank._id)}
                            style={{ color: 'var(--success)' }}
                          >
                            <span>Unblock facility</span>
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedBank(bank)}
                          title="View clinical inspection details"
                        >
                          <Eye size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px 14px', color: 'var(--ink-muted)' }}>
                    No blood bank facilities match the current search or status filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
          <span className="text-caption">
            Showing {filteredBanks.length} of {bloodBanks.length} blood bank records
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-secondary btn-sm" disabled>
              <ChevronLeft size={13} />
              <span>Previous page</span>
            </button>
            <button className="btn btn-secondary btn-sm" disabled>
              <span>Next page</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Facility Inspection Modal */}
      {selectedBank && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(28, 27, 26, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 200,
          }}
          onClick={() => setSelectedBank(null)}
        >
          <div
            className="panel"
            style={{ maxWidth: 580, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-header">
              <div>
                <h3 className="panel-title">{selectedBank.name}</h3>
                <span className="text-caption">Reg No: {selectedBank.registrationNumber}</span>
              </div>
              <span className={`status-pill ${getStatusPillClass(selectedBank.status)}`}>
                Status: {selectedBank.status}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 14 }}>
              <div>
                <strong>Operating Schedule:</strong> {selectedBank.operatingHours}
              </div>
              <div>
                <strong>Facility Address:</strong> {selectedBank.address}, {selectedBank.city}, {selectedBank.state} - {selectedBank.pincode}
              </div>
              <div>
                <strong>Coordinates:</strong> [{selectedBank.location.coordinates[0]}, {selectedBank.location.coordinates[1]}]
              </div>
              <div>
                <strong>In-Charge Officer:</strong> {selectedBank.contactPerson?.name} ({selectedBank.email})
              </div>
              <div>
                <strong>Facility Phone:</strong> {selectedBank.phone}
              </div>
              <div>
                <strong>Accreditation Document:</strong>{' '}
                <a href="#doc" onClick={(e) => { e.preventDefault(); alert(`Viewing ${selectedBank.licenseDocUrl}`); }}>
                  {selectedBank.licenseDocUrl || 'Not uploaded'}
                </a>
              </div>
            </div>

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              {selectedBank.status === 'PENDING' && (
                <>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => { handleApprove(selectedBank._id); }}
                  >
                    <span>Approve blood bank</span>
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => { handleReject(selectedBank._id); }}
                  >
                    <span>Reject</span>
                  </button>
                </>
              )}
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedBank(null)}
              >
                <span>Close panel</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
