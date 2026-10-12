import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  CheckCircle2,
  UserCheck,
  Send,
  RefreshCw,
  Star,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import { DataTable, StatusBadge, Button, Modal, Select } from '../../components/common';

export const AdminComplaintsPage = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);

  // Reply Modal State
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Assign Admin State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedAdminName, setSelectedAdminName] = useState('Administrator Chief');

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getComplaints();
      const data = res.data?.data || res.data?.complaints || res.data;
      if (Array.isArray(data)) {
        setComplaints(data);
      }
    } catch (err) {
      setComplaints([]);
      toast.error(err.response?.data?.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  // 1. Assign Ticket to Admin
  const handleOpenAssign = (ticket) => {
    setSelectedTicket(ticket);
    setAssignModalOpen(true);
  };

  const handleConfirmAssign = async (e) => {
    e.preventDefault();
    if (!selectedTicket) return;

    try {
      await adminAPI.assignComplaint(selectedTicket._id, { adminName: selectedAdminName });
      setComplaints((prev) =>
        prev.map((c) =>
          c._id === selectedTicket._id
            ? { ...c, assignedAdmin: selectedAdminName, status: 'IN_PROGRESS' }
            : c
        )
      );
      toast.success(`Ticket assigned to ${selectedAdminName}.`);
      setAssignModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed.');
    }
  };

  // 2. Respond to Ticket
  const handleOpenReply = (ticket) => {
    setSelectedTicket(ticket);
    setReplyText(ticket.adminReply || '');
    setReplyModalOpen(true);
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setIsSubmittingReply(true);
    try {
      await adminAPI.respondToComplaint(selectedTicket._id, { reply: replyText });
      setComplaints((prev) =>
        prev.map((c) =>
          c._id === selectedTicket._id
            ? { ...c, adminReply: replyText, status: 'IN_PROGRESS' }
            : c
        )
      );
      toast.success('Official reply sent to user.');
      setReplyModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed.');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // 3. Resolve Ticket
  const handleResolve = async (ticket) => {
    try {
      await adminAPI.resolveComplaint(ticket._id);
      setComplaints((prev) =>
        prev.map((c) => (c._id === ticket._id ? { ...c, status: 'RESOLVED' } : c))
      );
      toast.success(`Ticket ${ticket._id} marked as RESOLVED.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed.');
    }
  };

  const columns = [
    {
      header: 'Ticket & Submitter',
      key: 'submitterName',
      sortable: true,
      render: (row) => (
        <div>
          <strong className="text-slate-900 font-bold block">{row.subject}</strong>
          <span className="text-slate-500 text-[11px]">
            {row.submitterName} ({row.submitterRole}) • {row.category}
          </span>
        </div>
      ),
    },
    {
      header: 'Type',
      key: 'type',
      sortable: true,
      render: (row) => (
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
            row.type === 'COMPLAINT'
              ? 'bg-red-100 text-red-800'
              : 'bg-emerald-100 text-emerald-800'
          }`}
        >
          {row.type}
        </span>
      ),
    },
    {
      header: 'Rating',
      key: 'rating',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
          <Star className="w-3.5 h-3.5 fill-amber-500" />
          <span>{row.rating || 5}/5</span>
        </div>
      ),
    },
    {
      header: 'Assigned Admin',
      key: 'assignedAdmin',
      sortable: true,
      render: (row) => (
        <span className="text-xs text-slate-700 font-medium">
          {row.assignedAdmin || 'Unassigned'}
        </span>
      ),
    },
    {
      header: 'Resolution Status',
      key: 'status',
      sortable: true,
      render: (row) => <StatusBadge status={row.status} size="xs" />,
    },
    {
      header: 'Submitted',
      key: 'createdAt',
      sortable: true,
      render: (row) => (
        <span className="text-slate-400 text-[11px]">
          {new Date(row.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
        </span>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      sortable: false,
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.assignedAdmin === 'Unassigned' && (
            <Button
              variant="outline"
              size="xs"
              onClick={() => handleOpenAssign(row)}
              className="text-blue-700 border-blue-200 hover:bg-blue-50"
              leftIcon={<UserCheck className="w-3 h-3" />}
            >
              Assign
            </Button>
          )}

          <Button
            variant="ghost"
            size="xs"
            onClick={() => handleOpenReply(row)}
            className="text-slate-700 hover:bg-slate-100"
            leftIcon={<Send className="w-3 h-3" />}
          >
            Reply
          </Button>

          {row.status !== 'RESOLVED' && (
            <Button
              variant="secondary"
              size="xs"
              onClick={() => handleResolve(row)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              leftIcon={<CheckCircle2 className="w-3 h-3" />}
            >
              Resolve
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-[#1E293B] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800 text-blue-400 text-xs font-black mb-2">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Participant Grievance & Quality Control</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            User Complaints & Clinical Feedback
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Assign incoming grievances to case officers, provide official written replies, and close resolution tickets.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchComplaints}
          leftIcon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
        >
          Refresh Tickets
        </Button>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={complaints}
        keyField="_id"
        isLoading={loading}
        searchPlaceholder="Search complaints by subject, user, or category..."
        searchKeys={['subject', 'submitterName', 'category', 'status']}
        pageSize={10}
        emptyTitle="No Support Tickets"
        emptyDescription="No complaints or feedback records match your query."
      />

      {/* Reply Modal */}
      {replyModalOpen && selectedTicket && (
        <Modal
          isOpen={replyModalOpen}
          onClose={() => setReplyModalOpen(false)}
          title={`Respond to Ticket: ${selectedTicket.subject}`}
        >
          <form onSubmit={handleSendReply} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <span className="text-slate-400 block font-medium">User Message:</span>
              <p className="text-slate-800 font-medium italic">&quot;{selectedTicket.message}&quot;</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Official Administrative Reply <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                placeholder="Type your official administrative explanation or resolution notes..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C62828]"
              />
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <Button
                variant="ghost"
                size="md"
                type="button"
                onClick={() => setReplyModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                isLoading={isSubmittingReply}
                leftIcon={<Send className="w-4 h-4" />}
              >
                Transmit Reply
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Assign Modal */}
      {assignModalOpen && selectedTicket && (
        <Modal
          isOpen={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          title="Assign Ticket to Administrator"
        >
          <form onSubmit={handleConfirmAssign} className="space-y-4">
            <Select
              label="Select Case Officer"
              options={[
                { value: 'Administrator Chief', label: 'Administrator Chief (Medical Compliance)' },
                { value: 'Dr. Suresh Varma', label: 'Dr. Suresh Varma (Hospital Quality Lead)' },
                { value: 'Compliance Desk Agent #3', label: 'Compliance Desk Agent #3' },
              ]}
              value={selectedAdminName}
              onChange={(e) => setSelectedAdminName(e.target.value)}
            />

            <div className="pt-2 flex justify-end gap-3">
              <Button
                variant="ghost"
                size="md"
                type="button"
                onClick={() => setAssignModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                leftIcon={<UserCheck className="w-4 h-4" />}
              >
                Assign Case
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminComplaintsPage;
