import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  ShieldAlert,
  ShieldCheck,
  FileText,
  Building2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
} from 'lucide-react';
import api from '../services/api';

export const HospitalManagementPage = ({ onOpenSignup }) => {
  const [hospitals, setHospitals] = useState([
    {
      _id: 'hosp-101',
      name: 'All India Institute of Medical Sciences (AIIMS)',
      email: 'bloodtransfusion@aiims.edu',
      phone: '+91-11-26593201',
      mobileNumber: '+91-11-26593201',
      licenseNumber: 'DL-HOSP-2024-8841',
      licenseDocUrl: '/uploads/documents/aiims-license.pdf',
      address: 'Ansari Nagar East, Ring Road',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110029',
      location: { type: 'Point', coordinates: [77.2104, 28.5672] },
      contactPerson: {
        name: 'Dr. R. K. Srivastava',
        phone: '9811234567',
        email: 'rksrivastava@aiims.edu',
      },
      isVerified: true,
      status: 'APPROVED',
      createdAt: '2024-03-15T10:30:00.000Z',
    },
    {
      _id: 'hosp-102',
      name: 'Lilavati Hospital & Research Centre',
      email: 'transfusion@lilavatihospital.com',
      phone: '+91-22-26751000',
      mobileNumber: '+91-22-26751000',
      licenseNumber: 'MH-MUM-2025-0192',
      licenseDocUrl: '/uploads/documents/lilavati-cert.pdf',
      address: 'A-791, Bandra Reclamation, Bandra West',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400050',
      location: { type: 'Point', coordinates: [72.8275, 19.0519] },
      contactPerson: {
        name: 'Sister Mary Fernandez',
        phone: '9820123456',
        email: 'bloodbank@lilavatihospital.com',
      },
      isVerified: true,
      status: 'APPROVED',
      createdAt: '2025-01-20T14:15:00.000Z',
    },
    {
      _id: 'hosp-103',
      name: 'Apollo Hospital Jubilee Hills',
      email: 'bloodcenter@apollohyderabad.com',
      phone: '+91-40-23607777',
      mobileNumber: '+91-40-23607777',
      licenseNumber: 'TS-HYD-2026-3391',
      licenseDocUrl: '/uploads/documents/apollo-reg.pdf',
      address: 'Road No. 72, Opposite Bharatiya Vidya Bhavan',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500033',
      location: { type: 'Point', coordinates: [78.4111, 17.4262] },
      contactPerson: {
        name: 'Dr. Suresh Varma',
        phone: '9848012345',
        email: 'suresh_v@apollohyderabad.com',
      },
      isVerified: false,
      status: 'PENDING',
      createdAt: '2026-09-20T09:00:00.000Z',
    },
    {
      _id: 'hosp-104',
      name: 'Fortis Memorial Research Institute',
      email: 'bloodtransfusion@fortishealthcare.com',
      phone: '+91-124-4962200',
      mobileNumber: '+91-124-4962200',
      licenseNumber: 'HR-GGN-2025-1044',
      licenseDocUrl: '/uploads/documents/fortis-doc.pdf',
      address: 'Sector 44, Opposite HUDA City Centre Metro',
      city: 'Gurugram',
      state: 'Haryana',
      pincode: '122002',
      location: { type: 'Point', coordinates: [77.0726, 28.4595] },
      contactPerson: {
        name: 'Dr. Neha Batra',
        phone: '9873012345',
        email: 'neha.batra@fortishealthcare.com',
      },
      isVerified: false,
      status: 'PENDING',
      createdAt: '2026-09-25T11:45:00.000Z',
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'BLOCKED'
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Filter facilities
  const filteredHospitals = hospitals.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.licenseNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'ALL' ? true : item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Action handlers
  const handleApprove = (id) => {
    setHospitals((prev) =>
      prev.map((h) =>
        h._id === id ? { ...h, status: 'APPROVED', isVerified: true } : h
      )
    );
    if (selectedFacility?._id === id) {
      setSelectedFacility((prev) => ({ ...prev, status: 'APPROVED', isVerified: true }));
    }
  };

  const handleReject = (id) => {
    setHospitals((prev) =>
      prev.map((h) =>
        h._id === id ? { ...h, status: 'REJECTED', isVerified: false } : h
      )
    );
    if (selectedFacility?._id === id) {
      setSelectedFacility((prev) => ({ ...prev, status: 'REJECTED', isVerified: false }));
    }
  };

  const handleBlock = (id) => {
    setHospitals((prev) =>
      prev.map((h) => (h._id === id ? { ...h, status: 'BLOCKED' } : h))
    );
    if (selectedFacility?._id === id) {
      setSelectedFacility((prev) => ({ ...prev, status: 'BLOCKED' }));
    }
  };

  const handleUnblock = (id) => {
    setHospitals((prev) =>
      prev.map((h) => (h._id === id ? { ...h, status: 'APPROVED' } : h))
    );
    if (selectedFacility?._id === id) {
      setSelectedFacility((prev) => ({ ...prev, status: 'APPROVED' }));
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
          <h2>Hospital facility management</h2>
          <p className="text-caption">
            Verification, license audit, and status approval for registered hospital blood transfusion units.
          </p>
        </div>

        <button
          className="btn btn-primary btn-sm"
          onClick={onOpenSignup}
        >
          <Building2 size={14} />
          <span>Register new hospital facility</span>
        </button>
      </div>

      {/* Routine Metrics Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <div className="panel" style={{ padding: '16px 18px' }}>
          <span className="text-caption">Registered hospitals</span>
          <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>{hospitals.length}</div>
          <p className="text-caption" style={{ marginTop: 2 }}>Authorized health units</p>
        </div>

        <div className="panel" style={{ padding: '16px 18px' }}>
          <span className="text-caption">Approved & active</span>
          <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--success)', marginTop: 4 }}>
            {hospitals.filter((h) => h.status === 'APPROVED').length}
          </div>
          <p className="text-caption" style={{ marginTop: 2 }}>Verified clinical access</p>
        </div>

        <div className="panel" style={{ padding: '16px 18px' }}>
          <span className="text-caption">Pending verification</span>
          <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--warning)', marginTop: 4 }}>
            {hospitals.filter((h) => h.status === 'PENDING').length}
          </div>
          <p className="text-caption" style={{ marginTop: 2 }}>Awaiting license audit</p>
        </div>

        <div className="panel" style={{ padding: '16px 18px' }}>
          <span className="text-caption">Blocked or rejected</span>
          <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--urgent)', marginTop: 4 }}>
            {hospitals.filter((h) => h.status === 'BLOCKED' || h.status === 'REJECTED').length}
          </div>
          <p className="text-caption" style={{ marginTop: 2 }}>Access restricted</p>
        </div>
      </div>

      {/* Routine Flat Panel: Filter & Table Area */}
      <div className="panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          {/* Search bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 260, maxWidth: 440 }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search by hospital name, city, or license number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 34, fontSize: 13 }}
              />
              <Search size={14} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--ink-muted)' }} />
            </div>
          </div>

          {/* Status filter tabs */}
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
                <th>Hospital name & license</th>
                <th>Location</th>
                <th>Contact person</th>
                <th>Verification status</th>
                <th>License audit</th>
                <th>Administrative actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredHospitals.length > 0 ? (
                filteredHospitals.map((hosp) => (
                  <tr key={hosp._id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{hosp.name}</div>
                      <div className="text-caption">{hosp.licenseNumber}</div>
                    </td>

                    <td>
                      <div>{hosp.city}, {hosp.state}</div>
                      <div className="text-caption">{hosp.pincode}</div>
                    </td>

                    <td>
                      <div>{hosp.contactPerson?.name || 'Authorized Officer'}</div>
                      <div className="text-caption">{hosp.phone}</div>
                    </td>

                    <td>
                      <span className={`status-pill ${getStatusPillClass(hosp.status)}`}>
                        {hosp.isVerified ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        <span>Status: {hosp.status.charAt(0) + hosp.status.slice(1).toLowerCase()}</span>
                      </span>
                    </td>

                    <td>
                      {hosp.licenseDocUrl ? (
                        <a
                          href={hosp.licenseDocUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          onClick={(e) => {
                            e.preventDefault();
                            alert(`Auditing verified document: ${hosp.licenseDocUrl}`);
                          }}
                        >
                          <FileText size={13} />
                          <span>View license document</span>
                        </a>
                      ) : (
                        <span className="text-caption">No document</span>
                      )}
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {hosp.status === 'PENDING' && (
                          <>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleApprove(hosp._id)}
                              style={{ color: 'var(--success)', borderColor: '#BDE0CE' }}
                            >
                              <span>Approve hospital</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleReject(hosp._id)}
                              style={{ color: 'var(--urgent)', borderColor: '#F8BEB9' }}
                            >
                              <span>Reject</span>
                            </button>
                          </>
                        )}

                        {hosp.status === 'APPROVED' && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleBlock(hosp._id)}
                            style={{ color: 'var(--urgent)' }}
                          >
                            <span>Block facility</span>
                          </button>
                        )}

                        {hosp.status === 'BLOCKED' && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleUnblock(hosp._id)}
                            style={{ color: 'var(--success)' }}
                          >
                            <span>Unblock facility</span>
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedFacility(hosp)}
                          title="View clinical registration details"
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
                    No hospital facilities match the current search or status filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
          <span className="text-caption">
            Showing {filteredHospitals.length} of {hospitals.length} hospital facility records
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

      {/* Facility Detail Audit Modal */}
      {selectedFacility && (
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
          onClick={() => setSelectedFacility(null)}
        >
          <div
            className="panel"
            style={{ maxWidth: 580, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-header">
              <div>
                <h3 className="panel-title">{selectedFacility.name}</h3>
                <span className="text-caption">License ID: {selectedFacility.licenseNumber}</span>
              </div>
              <span className={`status-pill ${getStatusPillClass(selectedFacility.status)}`}>
                Status: {selectedFacility.status}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 14 }}>
              <div>
                <strong>Street Address:</strong> {selectedFacility.address}, {selectedFacility.city}, {selectedFacility.state} - {selectedFacility.pincode}
              </div>
              <div>
                <strong>GeoJSON Coordinates:</strong> [{selectedFacility.location.coordinates[0]}, {selectedFacility.location.coordinates[1]}]
              </div>
              <div>
                <strong>Contact Officer:</strong> {selectedFacility.contactPerson?.name} ({selectedFacility.contactPerson?.email || selectedFacility.email})
              </div>
              <div>
                <strong>Direct Telephone:</strong> {selectedFacility.phone}
              </div>
              <div>
                <strong>License Document:</strong>{' '}
                <a href="#doc" onClick={(e) => { e.preventDefault(); alert(`Viewing ${selectedFacility.licenseDocUrl}`); }}>
                  {selectedFacility.licenseDocUrl || 'Not uploaded'}
                </a>
              </div>
            </div>

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              {selectedFacility.status === 'PENDING' && (
                <>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => { handleApprove(selectedFacility._id); }}
                  >
                    <span>Approve hospital</span>
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => { handleReject(selectedFacility._id); }}
                  >
                    <span>Reject</span>
                  </button>
                </>
              )}
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedFacility(null)}
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
