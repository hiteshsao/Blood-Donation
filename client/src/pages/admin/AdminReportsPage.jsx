import React, { useState, useEffect } from 'react';
import {
  FileBarChart,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import { Button, Select, Input } from '../../components/common';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const REPORT_TYPES = [
  { value: 'donations-per-month', label: 'Monthly Donations Trend & Volume' },
  { value: 'requests-by-status', label: 'Hospital Requests by State Progression' },
  { value: 'blood-group-demand-supply', label: 'Blood Group Demand vs Available Supply' },
  { value: 'top-donors', label: 'Top Voluntary Donors Honor Roll' },
  { value: 'city-wise-activity', label: 'City-Wise Transfusion & Facility Activity' },
  { value: 'fulfillment-rate', label: 'Request Fulfillment & Completion Ratio' },
  { value: 'average-response-time', label: 'Average Emergency Trauma Response Time' },
];

const getFirstDayOfYear = () => {
  const now = new Date();
  return `${now.getFullYear()}-01-01`;
};

const getTodayString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const AdminReportsPage = () => {
  const [reportType, setReportType] = useState('blood-group-demand-supply');
  const [fromDate, setFromDate] = useState(getFirstDayOfYear);
  const [toDate, setToDate] = useState(getTodayString);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(null); // 'pdf' | 'excel' | null
  const [reportData, setReportData] = useState(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getReports({
        type: reportType,
        from: fromDate,
        to: toDate,
      });
      const data = res.data?.data || res.data;
      setReportData(data);
    } catch (err) {
      setReportData(null);
      toast.error(err.response?.data?.message || err.message || 'Failed to load report data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, fromDate, toDate]);

  const handleExport = (format) => {
    setExporting(format);
    const token = localStorage.getItem('lifedrop_access_token');
    const url = `/api/v1/admin/reports/${reportType}/export?format=${format}&from=${fromDate}&to=${toDate}`;

    fetch(url, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Export failed');
        return res.blob();
      })
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `lifedrop-${reportType}-${Date.now()}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success(`Report downloaded as ${format.toUpperCase()}!`);
      })
      .catch((err) => {
        toast.error(err.message || 'Export failed.');
      })
      .finally(() => {
        setExporting(null);
      });
  };

  const getParsedReport = () => {
    if (!reportData) return { chartItems: [], tableItems: [], isEmpty: true };

    if (reportType === 'donations-per-month') {
      const list = reportData.donationsPerMonth || [];
      const chartItems = list.map((d) => ({
        label: d.monthLabel || `${d.year}-${String(d.month).padStart(2, '0')}`,
        unitsDonated: d.unitsDonated || 0,
        donationsCount: d.donationsCount || 0,
      }));
      return {
        chartItems,
        tableItems: list,
        isEmpty: list.length === 0,
      };
    }

    if (reportType === 'requests-by-status') {
      const list = reportData.requestsByStatus || [];
      const chartItems = list.map((r) => ({
        label: r.status,
        count: r.count || 0,
        totalUnits: r.totalUnits || 0,
      }));
      return {
        chartItems,
        tableItems: list,
        isEmpty: list.length === 0,
      };
    }

    if (reportType === 'blood-group-demand-supply') {
      const list = reportData.bloodGroupDemandVsSupply || [];
      const chartItems = list.map((b) => ({
        label: b.bloodGroup,
        demandedUnits: b.demandedUnits || 0,
        suppliedUnits: b.suppliedUnits || 0,
        netBalance: b.netBalance || 0,
      }));
      return {
        chartItems,
        tableItems: list,
        isEmpty: list.length === 0,
      };
    }

    if (reportType === 'top-donors') {
      const list = reportData.topDonors || [];
      const chartItems = list.map((d) => ({
        label: d.name,
        totalDonations: d.totalDonations || 0,
        totalUnits: d.totalUnits || 0,
      }));
      return {
        chartItems,
        tableItems: list,
        isEmpty: list.length === 0,
      };
    }

    if (reportType === 'city-wise-activity') {
      const list = reportData.cityWiseActivity || [];
      const chartItems = list.map((c) => ({
        label: c.city,
        donationsCount: c.donationsCount || 0,
        requestsCount: c.requestsCount || 0,
        totalActivity: c.totalActivity || 0,
      }));
      return {
        chartItems,
        tableItems: list,
        isEmpty: list.length === 0,
      };
    }

    if (reportType === 'fulfillment-rate') {
      const fr = reportData.fulfillmentRate;
      if (!fr) return { chartItems: [], tableItems: [], isEmpty: true };
      const tableItems = [
        {
          category: 'Blood Requests',
          total: fr.bloodRequests?.totalRequests || 0,
          fulfilled: fr.bloodRequests?.fulfilledRequests || 0,
          rate: fr.bloodRequests?.fulfillmentRatePercentage ?? 0,
        },
        {
          category: 'Emergency SOS',
          total: fr.emergencies?.totalEmergencies || 0,
          fulfilled: fr.emergencies?.fulfilledEmergencies || 0,
          rate: fr.emergencies?.fulfillmentRatePercentage ?? 0,
        },
        {
          category: 'Overall Operations',
          total: fr.overall?.totalRequests || 0,
          fulfilled: fr.overall?.fulfilledRequests || 0,
          rate: fr.overall?.overallFulfillmentRatePercentage ?? 0,
        },
      ];
      const chartItems = tableItems.map((t) => ({
        label: t.category,
        rate: t.rate,
        fulfilled: t.fulfilled,
        total: t.total,
      }));
      const isEmpty = (fr.overall?.totalRequests || 0) === 0;
      return { chartItems, tableItems, isEmpty };
    }

    if (reportType === 'average-response-time') {
      const resp = reportData.averageEmergencyResponseTime || reportData.emergencyResponseTime;
      if (!resp) return { chartItems: [], tableItems: [], isEmpty: true };
      const tableItems = [
        {
          metric: 'Donor Response Time',
          sampleCount: resp.donorResponses?.totalResponses || 0,
          averageTime:
            resp.donorResponses?.avgResponseTimeFormatted ||
            `${resp.donorResponses?.avgResponseTimeSeconds || 0}s`,
          timeSeconds: resp.donorResponses?.avgResponseTimeSeconds || 0,
        },
        {
          metric: 'Emergency Resolution Time',
          sampleCount: resp.emergencyResolution?.fulfilledCount || 0,
          averageTime:
            resp.emergencyResolution?.avgResolutionTimeFormatted ||
            `${resp.emergencyResolution?.avgResolutionTimeMinutes || 0}m`,
          timeSeconds: (resp.emergencyResolution?.avgResolutionTimeMinutes || 0) * 60,
        },
      ];
      const chartItems = tableItems.map((t) => ({
        label: t.metric,
        seconds: t.timeSeconds,
      }));
      const isEmpty =
        (resp.donorResponses?.totalResponses || 0) === 0 &&
        (resp.emergencyResolution?.fulfilledCount || 0) === 0;
      return { chartItems, tableItems, isEmpty };
    }

    return { chartItems: [], tableItems: [], isEmpty: true };
  };

  const { chartItems, tableItems, isEmpty } = getParsedReport();

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-[#1E293B] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800 text-blue-400 text-xs font-black mb-2">
            <FileBarChart className="w-3.5 h-3.5" />
            <span>MongoDB Aggregation Analytics Pipeline</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Transfusion Intelligence & Export Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Generate state compliance audit datasets, inspect supply vs demand deficits, and stream PDF / Excel exports.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={() => handleExport('pdf')}
            isLoading={exporting === 'pdf'}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold border-none shadow-md"
            leftIcon={<FileText className="w-4 h-4" />}
          >
            Export PDF
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => handleExport('excel')}
            isLoading={exporting === 'excel'}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold border-none shadow-md"
            leftIcon={<FileSpreadsheet className="w-4 h-4" />}
          >
            Export Excel (.xlsx)
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#1E293B] rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
          Report Parameters & Aggregation Criteria
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            label="Report Aggregation Type"
            options={REPORT_TYPES}
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          />

          <Input
            label="Start Date (From)"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />

          <Input
            label="End Date (To)"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
      </div>

      {/* Live Chart Preview */}
      <div className="bg-[#1E293B] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-red-500" />
              Live Visual Aggregation: {REPORT_TYPES.find((r) => r.value === reportType)?.label}
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Filtered window: {fromDate} through {toDate}.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-24 flex items-center justify-center gap-2.5 text-slate-400 text-sm font-medium">
            <RefreshCw className="w-5 h-5 animate-spin text-red-500" />
            <span>Aggregating clinical datasets from database...</span>
          </div>
        ) : isEmpty ? (
          <div className="py-24 text-center text-slate-400 font-medium text-sm">
            No data for this period
          </div>
        ) : (
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartItems} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '16px',
                    color: '#F8FAFC',
                    fontSize: '12px',
                  }}
                />
                {reportType === 'blood-group-demand-supply' && (
                  <>
                    <Bar dataKey="demandedUnits" fill="#EF4444" radius={[6, 6, 0, 0]} name="Hospital Demand (Units)" />
                    <Bar dataKey="suppliedUnits" fill="#10B981" radius={[6, 6, 0, 0]} name="Reserve Supply (Units)" />
                  </>
                )}
                {reportType === 'donations-per-month' && (
                  <>
                    <Bar dataKey="unitsDonated" fill="#C62828" radius={[6, 6, 0, 0]} name="Units Donated" />
                    <Bar dataKey="donationsCount" fill="#3B82F6" radius={[6, 6, 0, 0]} name="Donation Count" />
                  </>
                )}
                {reportType === 'requests-by-status' && (
                  <>
                    <Bar dataKey="count" fill="#EF4444" radius={[6, 6, 0, 0]} name="Request Count" />
                    <Bar dataKey="totalUnits" fill="#F59E0B" radius={[6, 6, 0, 0]} name="Total Units" />
                  </>
                )}
                {reportType === 'top-donors' && (
                  <Bar dataKey="totalDonations" fill="#C62828" radius={[6, 6, 0, 0]} name="Total Donations" />
                )}
                {reportType === 'city-wise-activity' && (
                  <>
                    <Bar dataKey="donationsCount" fill="#10B981" radius={[6, 6, 0, 0]} name="Donations" />
                    <Bar dataKey="requestsCount" fill="#EF4444" radius={[6, 6, 0, 0]} name="Requests" />
                  </>
                )}
                {reportType === 'fulfillment-rate' && (
                  <Bar dataKey="rate" fill="#10B981" radius={[6, 6, 0, 0]} name="Fulfillment Rate (%)" />
                )}
                {reportType === 'average-response-time' && (
                  <Bar dataKey="seconds" fill="#F59E0B" radius={[6, 6, 0, 0]} name="Avg Seconds" />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Summary Data Table */}
      <div className="bg-[#1E293B] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-4">
        <h4 className="text-sm font-bold text-white">Aggregated Tabular Dataset</h4>

        {loading ? (
          <div className="py-12 flex items-center justify-center gap-2.5 text-slate-400 text-sm font-medium">
            <RefreshCw className="w-5 h-5 animate-spin text-red-500" />
            <span>Loading tabular data...</span>
          </div>
        ) : isEmpty ? (
          <div className="py-12 text-center text-slate-400 font-medium text-sm">
            No data for this period
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            {reportType === 'blood-group-demand-supply' && (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-black border-b border-slate-800">
                  <tr>
                    <th className="p-3">Classification</th>
                    <th className="p-3">Requisite Demand</th>
                    <th className="p-3">Available Reserve</th>
                    <th className="p-3">Net Variance</th>
                    <th className="p-3">Compliance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {tableItems.map((row) => (
                    <tr key={row.bloodGroup} className="hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-white">{row.bloodGroup}</td>
                      <td className="p-3">{row.demandedUnits} Units</td>
                      <td className="p-3">{row.suppliedUnits} Units</td>
                      <td className={`p-3 font-bold ${row.netBalance < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {row.netBalance > 0 ? `+${row.netBalance}` : row.netBalance} Units
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            row.netBalance < 0
                              ? 'bg-red-950 text-red-400 border border-red-800'
                              : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          }`}
                        >
                          {row.status === 'DEFICIT' ? 'Deficit' : 'Surplus'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportType === 'donations-per-month' && (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-black border-b border-slate-800">
                  <tr>
                    <th className="p-3">Calendar Month</th>
                    <th className="p-3">Donations Recorded</th>
                    <th className="p-3">Total Units Donated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {tableItems.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-white">
                        {row.monthLabel || `${row.year}-${String(row.month).padStart(2, '0')}`}
                      </td>
                      <td className="p-3">{row.donationsCount} Donations</td>
                      <td className="p-3 font-bold text-emerald-400">{row.unitsDonated} Units</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportType === 'requests-by-status' && (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-black border-b border-slate-800">
                  <tr>
                    <th className="p-3">Request Status</th>
                    <th className="p-3">Total Requests</th>
                    <th className="p-3">Requested Units Volume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {tableItems.map((row) => (
                    <tr key={row.status} className="hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-white">{row.status}</td>
                      <td className="p-3">{row.count} Requests</td>
                      <td className="p-3 font-bold text-amber-400">{row.totalUnits} Units</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportType === 'top-donors' && (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-black border-b border-slate-800">
                  <tr>
                    <th className="p-3">Donor Name</th>
                    <th className="p-3">Blood Group</th>
                    <th className="p-3">City</th>
                    <th className="p-3">Donations Count</th>
                    <th className="p-3">Units Donated</th>
                    <th className="p-3">Last Donation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {tableItems.map((row, idx) => (
                    <tr key={row.donorId || idx} className="hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-white">{row.name}</td>
                      <td className="p-3 font-semibold text-red-400">{row.bloodGroup}</td>
                      <td className="p-3">{row.city}</td>
                      <td className="p-3">{row.totalDonations}</td>
                      <td className="p-3 font-bold text-emerald-400">{row.totalUnits} Units</td>
                      <td className="p-3 text-slate-400">
                        {row.lastDonatedAt ? new Date(row.lastDonatedAt).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportType === 'city-wise-activity' && (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-black border-b border-slate-800">
                  <tr>
                    <th className="p-3">City Jurisdiction</th>
                    <th className="p-3">Hospital Requests</th>
                    <th className="p-3">Voluntary Donations</th>
                    <th className="p-3">Emergency Requisitions</th>
                    <th className="p-3">Aggregate Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {tableItems.map((row) => (
                    <tr key={row.city} className="hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-white">{row.city}</td>
                      <td className="p-3">{row.requestsCount}</td>
                      <td className="p-3 text-emerald-400 font-semibold">{row.donationsCount}</td>
                      <td className="p-3 text-red-400 font-semibold">{row.emergenciesCount}</td>
                      <td className="p-3 font-bold text-white">{row.totalActivity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportType === 'fulfillment-rate' && (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-black border-b border-slate-800">
                  <tr>
                    <th className="p-3">Operational Domain</th>
                    <th className="p-3">Total Requisitions</th>
                    <th className="p-3">Fulfilled Demands</th>
                    <th className="p-3">Fulfillment Ratio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {tableItems.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-white">{row.category}</td>
                      <td className="p-3">{row.total}</td>
                      <td className="p-3 text-emerald-400 font-semibold">{row.fulfilled}</td>
                      <td className="p-3 font-bold text-emerald-400">{row.rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportType === 'average-response-time' && (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-black border-b border-slate-800">
                  <tr>
                    <th className="p-3">Operational Metric</th>
                    <th className="p-3">Sample Invocations</th>
                    <th className="p-3">Computed Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {tableItems.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-white">{row.metric}</td>
                      <td className="p-3">{row.sampleCount}</td>
                      <td className="p-3 font-bold text-amber-400">{row.averageTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReportsPage;
